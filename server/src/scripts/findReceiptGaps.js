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

const regs = await WorkshopRegistration.find({ receiptNo: { $ne: null } }, 'receiptNo').lean();
const nums = regs.map(r => parseInt(String(r.receiptNo).replace(/\D/g, ''), 10)).filter(Number.isFinite).sort((a,b)=>a-b);
const min = nums[0], max = nums[nums.length-1];
const present = new Set(nums);
const gaps = [];
for (let n = min; n <= max; n++) if (!present.has(n)) gaps.push(n);
const fmt = n => 'AST-WS-' + String(n).padStart(4, '0');
console.log(`present=${nums.length}  range=${fmt(min)}..${fmt(max)}  gaps=${gaps.length}`);
console.log('MISSING: ' + gaps.map(fmt).join(', '));

// which gaps sit in the recycle bin (restorable without Razorpay)
const bin = await DeletedRecord.find({ collectionName: 'WorkshopRegistration' }).lean();
const binNums = new Set(bin.map(b => parseInt(String(b.document?.receiptNo||'').replace(/\D/g,''),10)).filter(Number.isFinite));
const inBin = gaps.filter(n => binNums.has(n));
console.log('\nGaps recoverable from recycle bin: ' + (inBin.map(fmt).join(', ') || 'none'));
console.log('Gaps NOT in bin (need Razorpay): ' + gaps.filter(n=>!binNums.has(n)).map(fmt).join(', '));
await mongoose.disconnect();
