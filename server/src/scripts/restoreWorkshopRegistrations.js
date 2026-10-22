/*
 * Puts registrations from a backup file back into the database.
 *
 * Insert-only: a document whose _id is already present is left untouched, so
 * running this cannot overwrite newer data. The receipt counter is only ever
 * moved forward, never back, so restored receipt numbers can never be handed
 * out a second time.
 *
 * Usage:  node server/src/scripts/restoreWorkshopRegistrations.js <backup.json> [--apply]
 *         Without --apply it only reports what it would insert.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import Counter from '../models/Counter.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const backupArg = process.argv[2];
const apply = process.argv.includes('--apply');

if (!backupArg) {
    console.error('Usage: node server/src/scripts/restoreWorkshopRegistrations.js <backup.json> [--apply]');
    process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(path.resolve(backupArg), 'utf8'));
const registrations = Array.isArray(backup) ? backup : backup.registrations || [];
const backupCounterSeq = Array.isArray(backup) ? 0 : backup.counter?.seq || 0;
const dbName = resolveMongoDbName(uri);

async function restore() {
    try {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });
    } catch {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });
    }
    console.log(`Connected to "${mongoose.connection.name}". Backup holds ${registrations.length} registration(s).`);

    const existingIds = new Set(
        (await WorkshopRegistration.find({ _id: { $in: registrations.map(r => r._id).filter(Boolean) } })
            .select('_id').lean()).map(r => String(r._id))
    );
    const toInsert = registrations.filter(r => !r._id || !existingIds.has(String(r._id)));

    console.log(`${existingIds.size} already present, ${toInsert.length} to insert.`);

    if (!apply) {
        console.table(toInsert.slice(0, 25).map(r => ({ receiptNo: r.receiptNo, rollNo: r.rollNo, name: r.name, status: r.status })));
        console.log(`\nDry run. Re-run with --apply to insert these ${toInsert.length} record(s).`);
        await mongoose.disconnect();
        return;
    }

    if (toInsert.length > 0) {
        const result = await WorkshopRegistration.collection.insertMany(toInsert, { ordered: false });
        console.log(`✓ Inserted ${result.insertedCount} registration(s).`);
    }

    // Only ever raise the counter: lowering it would re-issue live receipt numbers.
    const current = await Counter.findOne({ _id: 'workshopReceipt' }).lean();
    const target = Math.max(backupCounterSeq, current?.seq || 0);
    if (target > (current?.seq || 0)) {
        await Counter.updateOne({ _id: 'workshopReceipt' }, { $set: { seq: target } }, { upsert: true });
        console.log(`✓ Receipt counter moved up to ${target}.`);
    } else {
        console.log(`Receipt counter left at ${current?.seq || 0}.`);
    }

    await mongoose.disconnect();
    console.log('\nVerify with: node server/src/scripts/verifyRegistrations.js');
}

restore().catch(err => {
    console.error('Restore failed:', err);
    process.exit(1);
});
