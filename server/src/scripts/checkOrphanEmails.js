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

const orphans = [
  ['24z121@psgitech.ac.in','6abc81ee1054b7fe7a49836a'],
  ['aryaanand053@gmail.com','6abb688ffc1c09e11c2f8109'],
  ['24z234@psgitech.ac.in','6abb54ff8bf2d4d3b505012c'],
  ['shriniyathi.saravanakumar@gmail.com','6ababe13f57a3c4cc16f5ff9'],
  ['sratheeswar@gmail.com','6abab00ba71dd8e4445fae27'],
  ['24z121@psgitech.ac.in','6abaabe2a71dd8e4445fae25'],
];
for (const [email, regId] of orphans) {
  const liveByEmail = await WorkshopRegistration.find({ email }).lean();
  const byId = await WorkshopRegistration.findById(regId).lean().catch(()=>null);
  console.log(`\n${email}  (orphan regId ${regId})`);
  console.log(`  regId still in DB? ${byId ? 'YES '+byId.receiptNo : 'NO (deleted)'}`);
  console.log(`  live regs for this email: ${liveByEmail.length}`);
  liveByEmail.forEach(r => console.log(`    -> ${r.receiptNo||'(no receipt)'} | ${r.rollNo} | ${r.name} | ${r.package} | ${r.status} | _id=${r._id}`));
}
await mongoose.disconnect();
