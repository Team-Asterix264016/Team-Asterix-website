import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import { resolveMongoDbName } from '../db/mongodb.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: resolveMongoDbName(uri), serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });

const regs = await WorkshopRegistration.find({}).sort({ createdAt: 1 }).lean();
const norm = s => String(s||'').trim().toLowerCase();

function groupBy(keyFn) {
  const m = new Map();
  for (const r of regs) {
    const k = keyFn(r);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return [...m.entries()].filter(([,v]) => v.length > 1);
}

for (const [label, keyFn] of [['ROLL NO', r=>norm(r.rollNo)], ['EMAIL', r=>norm(r.email)], ['PHONE', r=>String(r.phone||'').replace(/\D/g,'')]]) {
  const dups = groupBy(keyFn);
  console.log(`\n===== DUPLICATE BY ${label}: ${dups.length} group(s) =====`);
  for (const [k, rows] of dups) {
    console.log(`\n  "${k}"  (${rows.length} docs)`);
    for (const r of rows) {
      console.log(`    ${r.receiptNo||'(no receipt)'} | ${r.status.padEnd(7)} | ${r.package.padEnd(9)} | ${r.name} | roll=${r.rollNo} | amt=${r.amount} | _id=${r._id} | created=${new Date(r.createdAt).toISOString().slice(0,10)}`);
    }
  }
}
console.log(`\nTotal regs: ${regs.length}`);
await mongoose.disconnect();
