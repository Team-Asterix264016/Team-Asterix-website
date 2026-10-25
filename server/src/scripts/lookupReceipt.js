import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import DeletedRecord from '../models/DeletedRecord.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Read-only lookup for one receipt across live and recycle-bin data.
const RECEIPT = 'AST-WS-0030';
const ROLL = '715526105071';
const EMAIL = '26e174@psgitech.ac.in';
const REF = '6abf32bf32d12f7846af38d5';

async function main() {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri, { dbName: resolveMongoDbName(uri), serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });

    const or = [
        { receiptNo: RECEIPT },
        { rollNo: new RegExp(`^${ROLL}$`, 'i') },
        { email: EMAIL.toLowerCase() },
        { razorpayPaymentId: REF },
        { razorpayOrderId: REF }
    ];
    const regs = await WorkshopRegistration.find({ $or: or }).lean();
    console.log(`=== WorkshopRegistration matches: ${regs.length} ===`);
    for (const r of regs) {
        console.log(`receiptNo=${r.receiptNo}  rollNo=${r.rollNo}  name=${r.name}`);
        console.log(`  email=${r.email}  phone=${r.phone}  package=${r.package}  status=${r.status}`);
        console.log(`  amount=${r.amount}  paymentId=${r.razorpayPaymentId}  orderId=${r.razorpayOrderId}`);
        console.log(`  paidAt=${r.paidAt}  _id=${r._id}`);
    }

    const att = await WorkshopAttendance.find({ rollNo: new RegExp(`^${ROLL}$`, 'i') }).sort({ sessionNumber: 1 }).lean();
    console.log(`\n=== WorkshopAttendance rows for ${ROLL}: ${att.length} ===`);
    for (const a of att) console.log(`  session ${a.sessionNumber} (${a.track}) ${a.sessionDate}  ${a.verifiedBy}`);

    const binOr = or.map(cond => {
        const k = Object.keys(cond)[0];
        return { [`document.${k}`]: cond[k] };
    });
    const bin = await DeletedRecord.find({ $or: binOr }).lean();
    console.log(`\n=== Recycle bin matches: ${bin.length} ===`);
    for (const b of bin) console.log(`  ${b.collectionName}  deletedBy=${b.deletedBy}  at=${b.createdAt}  restoredAt=${b.restoredAt}`);

    await mongoose.disconnect();
}
main().catch(async e => { console.error('FAIL:', e.message); await mongoose.disconnect().catch(()=>{}); process.exit(1); });
