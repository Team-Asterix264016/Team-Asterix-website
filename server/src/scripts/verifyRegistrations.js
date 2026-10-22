/*
 * Read-only audit that answers one question: is every participant who ever
 * paid still in the database?
 *
 * Receipt numbers come from the atomic 'workshopReceipt' counter and are never
 * reused, so receipts 1..seq is the complete list of paid participants that
 * have ever existed. Any number in that range with no registration document
 * behind it is a lost record. The script also counts registrations in every
 * other database on the cluster, because "the app is reading the wrong
 * database" looks exactly like data loss from the admin dashboard.
 *
 * Usage:  node server/src/scripts/verifyRegistrations.js
 * Writes nothing. Exits 1 if anything is missing.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import { resolveMongoDbName } from '../db/mongodb.js';
import { formatReceiptNo } from '../lib/participantIdentity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set. Run `vercel env pull server/.env` or export it first.');
    process.exit(1);
}

const dbName = resolveMongoDbName(uri);

async function connect() {
    try {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });
    } catch {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });
    }
}

async function surveyCluster() {
    const client = mongoose.connection.getClient();
    try {
        const { databases } = await client.db().admin().listDatabases();
        const rows = [];
        for (const { name } of databases) {
            if (['admin', 'local', 'config'].includes(name)) continue;
            const db = client.db(name);
            const regs = await db.collection('workshopregistrations').estimatedDocumentCount();
            const att = await db.collection('workshopattendances').estimatedDocumentCount();
            const counter = await db.collection('counters').findOne({ _id: 'workshopReceipt' });
            if (regs > 0 || att > 0 || counter) {
                rows.push({ database: name, registrations: regs, attendance: att, receiptsIssued: counter?.seq || 0 });
            }
        }
        return rows;
    } catch (err) {
        console.warn(`! Could not list databases (${err.message}). Checking only "${dbName}".`);
        return null;
    }
}

async function audit() {
    await connect();
    console.log(`Connected. Active database: "${mongoose.connection.name}"\n`);

    console.log('=== Registrations per database on this cluster ===');
    const cluster = await surveyCluster();
    if (cluster) {
        console.table(cluster);
        const elsewhere = cluster.filter(r => r.database !== mongoose.connection.name && r.registrations > 0);
        if (elsewhere.length > 0) {
            console.log(`! Other database(s) also hold registrations: ${elsewhere.map(r => `${r.database} (${r.registrations})`).join(', ')}`);
            console.log('! If the active database looks empty, the data is probably there. Fix MONGODB_DB_NAME / the URI path instead of restoring.\n');
        }
    }

    const counter = await mongoose.connection.collection('counters').findOne({ _id: 'workshopReceipt' });
    const receiptsIssued = counter?.seq || 0;

    const total = await WorkshopRegistration.countDocuments();
    const paid = await WorkshopRegistration.countDocuments({ status: 'paid' });
    const pending = await WorkshopRegistration.countDocuments({ status: 'pending' });
    const failed = await WorkshopRegistration.countDocuments({ status: 'failed' });
    const withReceipt = await WorkshopRegistration.countDocuments({ receiptNo: { $exists: true, $ne: null } });

    console.log('=== Active database totals ===');
    console.table([{ total, paid, pending, failed, withReceipt, receiptsIssued }]);

    // Every issued receipt must still have a document behind it.
    const present = new Set(
        (await WorkshopRegistration.find({ receiptNo: { $exists: true, $ne: null } }).select('receiptNo').lean())
            .map(r => String(r.receiptNo).trim().toUpperCase())
    );
    const missing = [];
    for (let seq = 1; seq <= receiptsIssued; seq++) {
        const receiptNo = formatReceiptNo(seq);
        if (!present.has(receiptNo)) missing.push(receiptNo);
    }

    console.log('\n=== Missing paid participants ===');
    if (receiptsIssued === 0) {
        console.log('No receipts have ever been issued in this database, so there is nothing to compare against.');
    } else if (missing.length === 0) {
        console.log(`OK: all ${receiptsIssued} issued receipt(s) have a registration document. No paid participant is missing.`);
    } else {
        console.log(`LOST: ${missing.length} of ${receiptsIssued} issued receipt(s) have no registration document:`);
        console.log(missing.join(', '));
    }

    // Paid rows that never got a receipt are a separate, recoverable problem.
    const paidNoReceipt = await WorkshopRegistration.find({
        status: 'paid',
        $or: [{ receiptNo: { $exists: false } }, { receiptNo: null }, { receiptNo: '' }]
    }).select('name rollNo email razorpayPaymentId paidAt').lean();
    if (paidNoReceipt.length > 0) {
        console.log(`\n! ${paidNoReceipt.length} paid registration(s) carry no receipt number:`);
        console.table(paidNoReceipt.map(r => ({ name: r.name, rollNo: r.rollNo, email: r.email, paidAt: r.paidAt })));
    }

    // Duplicates make a participant look missing to a lookup that finds the
    // other copy first.
    const dupes = await WorkshopRegistration.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: { $toUpper: { $trim: { input: '$rollNo' } } }, n: { $sum: 1 }, ids: { $push: '$receiptNo' } } },
        { $match: { n: { $gt: 1 } } },
        { $sort: { n: -1 } }
    ]);
    if (dupes.length > 0) {
        console.log(`\n! ${dupes.length} roll number(s) have more than one paid registration:`);
        console.table(dupes.map(d => ({ rollNo: d._id, copies: d.n, receipts: d.ids.filter(Boolean).join(' ') })));
    }

    // Attendance rows whose participant is gone are a second witness to loss.
    const attTotal = await WorkshopAttendance.countDocuments();
    const attRegIds = await WorkshopAttendance.distinct('registrationId');
    const liveRegIds = new Set(
        (await WorkshopRegistration.find({ _id: { $in: attRegIds.filter(Boolean) } }).select('_id').lean())
            .map(r => String(r._id))
    );
    const orphanIds = attRegIds.filter(id => id && !liveRegIds.has(String(id)));
    console.log(`\n=== Attendance ===\n${attTotal} record(s); ${orphanIds.length} point at a registration that no longer exists.`);
    if (orphanIds.length > 0) {
        const orphanRows = await WorkshopAttendance.find({ registrationId: { $in: orphanIds } })
            .select('rollNo name email sessionId').lean();
        console.table(orphanRows.map(r => ({ rollNo: r.rollNo, name: r.name, email: r.email, sessionId: r.sessionId })));
        console.log('These participants attended, so their registration existed and has since been deleted.');
    }

    await mongoose.disconnect();

    const lost = missing.length + orphanIds.length;
    console.log(`\n=== Verdict ===\n${lost === 0
        ? 'Every participant on record is present.'
        : `${lost} record(s) unaccounted for. Restore from an Atlas snapshot taken before the loss; do not re-run any clear script.`}`);
    process.exit(lost === 0 ? 0 : 1);
}

audit().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
