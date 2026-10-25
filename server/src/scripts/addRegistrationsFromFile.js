import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/*
 * Inserts registrations that the live site issued a receipt for but never wrote
 * to the database.
 *
 * Usage: node src/scripts/addRegistrationsFromFile.js <file.json> [--apply]
 *
 * The candidates' details live in JSON under src/scripts/data/, which is
 * ignored by git: this repository is public, and these files carry students'
 * names, college emails and phone numbers. Keep it that way.
 *
 * Each entry is a WorkshopRegistration document. `_id` should be the REFERENCE
 * printed on the receipt where there is one, so the row and the receipt agree;
 * leave it out for a fresh id. `paidAt` is any string Date accepts, and is also
 * used as createdAt so the row sorts into the sequence where it belongs.
 *
 * Nothing is written without --apply. The run aborts as a whole if any entry
 * clashes with a different existing registration or fails schema validation,
 * and entries already inserted by an earlier run are skipped, so re-running
 * after a partial run is safe.
 */

const apply = process.argv.includes('--apply');
const fileArg = process.argv.slice(2).find((arg) => arg !== '--apply');

if (!fileArg) {
    console.error('Usage: node src/scripts/addRegistrationsFromFile.js <file.json> [--apply]');
    process.exit(1);
}

const filePath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
    console.error(`No such file: ${filePath}`);
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
if (!Array.isArray(raw) || raw.length === 0) {
    console.error('The file must hold a non-empty array of registration documents.');
    process.exit(1);
}

const docs = raw.map((entry) => ({
    college: '',
    currency: 'INR',
    razorpayOrderId: '',
    razorpayPaymentId: '',
    passwordHash: '',
    loginCount: 0,
    rollNoHistory: [],
    ...entry,
    _id: entry._id ? new mongoose.Types.ObjectId(entry._id) : new mongoose.Types.ObjectId(),
    paidAt: entry.paidAt ? new Date(entry.paidAt) : null
}));

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set. Add it to server/.env and run again.');
    process.exit(1);
}
await mongoose.connect(uri, {
    dbName: resolveMongoDbName(uri),
    serverSelectionTimeoutMS: 15000,
    tlsAllowInvalidCertificates: true
});

const pending = [];
for (const doc of docs) {
    const clash = await WorkshopRegistration.findOne({
        $or: [{ _id: doc._id }, { receiptNo: doc.receiptNo }, { rollNo: doc.rollNo }, { email: doc.email }]
    }).lean();

    if (clash) {
        if (String(clash._id) === String(doc._id) && clash.receiptNo === doc.receiptNo) {
            console.log(`SKIP ${doc.receiptNo}: already inserted (_id=${clash._id})`);
            continue;
        }
        console.log(`ABORT: ${doc.receiptNo} clashes with existing ${clash.receiptNo} (_id=${clash._id})`);
        process.exit(1);
    }

    const errs = new WorkshopRegistration({ ...doc, createdAt: doc.paidAt, updatedAt: new Date() }).validateSync();
    if (errs) {
        console.log(`ABORT validation ${doc.receiptNo}:`, errs.message);
        process.exit(1);
    }
    pending.push(doc);
}

console.log(`\n${pending.length} registration(s) to insert from ${path.basename(filePath)}:`);
pending.forEach((doc) => {
    console.log(`  ${doc.receiptNo} | ${doc.name} | roll ${doc.rollNo} | ${doc.package} | amt ${doc.amount}`);
});

if (!apply) {
    console.log('\nDRY RUN. Nothing was written. Re-run with --apply.');
    await mongoose.disconnect();
    process.exit(0);
}

for (const doc of pending) {
    await WorkshopRegistration.collection.insertOne({ ...doc, createdAt: doc.paidAt, updatedAt: new Date() });
    const saved = await WorkshopRegistration.findById(doc._id).lean();
    console.log(`INSERTED ${saved.receiptNo} | ${saved.name} | roll ${saved.rollNo} | ${saved.package} | ${saved.status} | amt ${saved.amount}`);
    console.log(`  _id=${saved._id}  paidAt=${saved.paidAt ? saved.paidAt.toISOString() : 'null'}`);
}

console.log(`Total regs now: ${await WorkshopRegistration.countDocuments()}`);
await mongoose.disconnect();
