import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import { resolveMongoDbName } from '../db/mongodb.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// MONGODB_URI comes from server/.env (cluster0 asterix); Razorpay keys come from
// the operator-supplied env file given as argv[2]. dotenv does not override an
// already-set key, so the first load wins per variable.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (process.argv[2]) dotenv.config({ path: process.argv[2] });

// READ-ONLY. Lists captured Razorpay payments with no matching live registration.
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
const mode = keyId?.startsWith('rzp_live_') ? 'LIVE' : 'TEST';

async function listAllPayments() {
    const all = [];
    let skip = 0;
    for (;;) {
        const res = await fetch(`https://api.razorpay.com/v1/payments?count=100&skip=${skip}`, {
            headers: { Authorization: `Basic ${auth}` },
            signal: AbortSignal.timeout(20000)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`Razorpay ${res.status}: ${JSON.stringify(data).slice(0,200)}`);
        const items = data.items || [];
        all.push(...items);
        if (items.length < 100) break;
        skip += 100;
        if (skip > 5000) break;
    }
    return all;
}

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: resolveMongoDbName(uri), serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });

const regs = await WorkshopRegistration.find({}, 'razorpayPaymentId razorpayOrderId receiptNo email status').lean();
const knownPayId = new Set(regs.map(r => r.razorpayPaymentId).filter(Boolean));
const knownOrderId = new Set(regs.map(r => r.razorpayOrderId).filter(Boolean));

console.log(`Razorpay mode: ${mode}`);
const payments = await listAllPayments();
const captured = payments.filter(p => p.status === 'captured' || p.captured === true);
console.log(`Razorpay payments total=${payments.length}  captured=${captured.length}`);
console.log(`Live regs=${regs.length}  known paymentIds=${knownPayId.size}\n`);

const orphans = captured.filter(p => !knownPayId.has(p.id) && !knownOrderId.has(p.order_id));
console.log(`=== Captured payments with NO matching registration: ${orphans.length} ===`);
for (const p of orphans) {
    console.log('----');
    console.log(`paymentId=${p.id}  orderId=${p.order_id}  amount=${p.amount/100} ${p.currency}`);
    console.log(`  email=${p.email}  contact=${p.contact}  created=${new Date(p.created_at*1000).toISOString()}`);
    console.log(`  notes=${JSON.stringify(p.notes||{})}`);
}
await mongoose.disconnect();
