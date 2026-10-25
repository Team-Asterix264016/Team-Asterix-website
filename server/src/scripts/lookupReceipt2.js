import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import DeletedRecord from '../models/DeletedRecord.js';
import { resolveMongoDbName } from '../db/mongodb.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: resolveMongoDbName(uri), serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });

const byName = await WorkshopRegistration.find({ name: /priyatharsan/i }).lean();
console.log(`name ~priyatharsan: ${byName.length}`);
byName.forEach(r => console.log(`  ${r.receiptNo} | ${r.rollNo} | ${r.email} | ${r.status}`));

const byPhone = await WorkshopRegistration.find({ phone: /9360591330/ }).lean();
console.log(`phone 9360591330: ${byPhone.length}`);
byPhone.forEach(r => console.log(`  ${r.receiptNo} | ${r.rollNo} | ${r.name}`));

// sample receiptNo formats + range around 0030
const paid = await WorkshopRegistration.find({ receiptNo: { $ne: null } }, 'receiptNo').sort({ receiptNo: 1 }).lean();
console.log(`\nreceiptNo count=${paid.length}, first=${paid[0]?.receiptNo}, last=${paid[paid.length-1]?.receiptNo}`);
console.log('has AST-WS-0030? ' + paid.some(r => r.receiptNo === 'AST-WS-0030'));
const around = paid.filter(r => /002[89]|003[01]/.test(r.receiptNo || ''));
console.log('around 0030: ' + around.map(r=>r.receiptNo).join(', '));

// bin: name search in archived docs
const binName = await DeletedRecord.find({ 'document.name': /priyatharsan/i }).lean();
console.log(`\nbin name ~priyatharsan: ${binName.length}`);
binName.forEach(b => console.log(`  ${b.collectionName} ${b.document?.receiptNo} ${b.document?.rollNo}`));
await mongoose.disconnect();
