import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import DeletedRecord from '../models/DeletedRecord.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Read-only check for three receipts before any insert.
const TARGETS = [
    { receiptNo: 'AST-WS-0248', roll: '715526106145', email: '26l244@psgitech.ac.in', ref: '6ac3370e2de17ad1442a57b9' },
    { receiptNo: 'AST-WS-0256', roll: '715526112025', email: '26u123@psgitech.ac.in', ref: '' },
    { receiptNo: 'AST-WS-0184', roll: '715526177044', email: '', ref: '6ac0ba82f338639230bf817b' }
];

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: resolveMongoDbName(uri), serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });

for (const t of TARGETS) {
    const or = [{ receiptNo: t.receiptNo }, { rollNo: t.roll }];
    if (t.email) or.push({ email: t.email });
    if (t.ref) or.push({ _id: new mongoose.Types.ObjectId(t.ref) }, { razorpayPaymentId: t.ref });
    const regs = await WorkshopRegistration.find({ $or: or }).lean();
    console.log(`\n=== ${t.receiptNo} / roll ${t.roll} : ${regs.length} live match(es) ===`);
    for (const r of regs) {
        console.log(`  receiptNo=${r.receiptNo} name=${r.name} roll=${r.rollNo} email=${r.email} phone=${r.phone}`);
        console.log(`  pkg=${r.package} tracks=${JSON.stringify(r.tracksEnrolled)} amt=${r.amount} status=${r.status} paidAt=${r.paidAt} _id=${r._id}`);
    }
    const binOr = [{ 'document.receiptNo': t.receiptNo }, { 'document.rollNo': t.roll }];
    if (t.ref) binOr.push({ 'document._id': new mongoose.Types.ObjectId(t.ref) });
    const bin = await DeletedRecord.find({ $or: binOr }).lean();
    console.log(`  recycle bin: ${bin.length}`);
    for (const b of bin) console.log(`    ${b.collectionName} deletedBy=${b.deletedBy} at=${b.createdAt} restoredAt=${b.restoredAt} name=${b.document?.name} email=${b.document?.email} phone=${b.document?.phone}`);
}

console.log(`\nTotal regs now: ${await WorkshopRegistration.countDocuments()}`);
await mongoose.disconnect();
