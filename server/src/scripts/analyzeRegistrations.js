import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import Counter from '../models/Counter.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function analyze() {
    const uri = process.env.MONGODB_URI;
    const dbName = resolveMongoDbName(uri);

    await mongoose.connect(uri, { 
        dbName, 
        serverSelectionTimeoutMS: 10000,
        tlsAllowInvalidCertificates: true 
    });

    const all = await WorkshopRegistration.find({}).sort({ createdAt: 1 }).lean();
    console.log(`Total registrations in DB: ${all.length}`);

    const counter = await Counter.findOne({ _id: 'workshopReceipt' });
    console.log(`Workshop Receipt Counter current seq: ${counter ? counter.seq : 'None'}`);

    const paidList = all.filter(r => r.status === 'paid');
    const pendingList = all.filter(r => r.status === 'pending');
    const failedList = all.filter(r => r.status === 'failed');

    console.log(`\nBreakdown by Status:`);
    console.log(`- Paid: ${paidList.length}`);
    console.log(`- Pending: ${pendingList.length}`);
    console.log(`- Failed: ${failedList.length}`);

    // Check receipt numbers
    console.log(`\n=== CHECKING RECEIPT NUMBERS FOR PAID ENTRIES ===`);
    const receiptMap = new Map();
    const paidWithoutReceipt = [];
    for (const r of paidList) {
        if (!r.receiptNo) {
            paidWithoutReceipt.push(r);
        } else {
            if (receiptMap.has(r.receiptNo)) {
                receiptMap.get(r.receiptNo).push(r);
            } else {
                receiptMap.set(r.receiptNo, [r]);
            }
        }
    }

    if (paidWithoutReceipt.length > 0) {
        console.log(`🚨 FOUND ${paidWithoutReceipt.length} PAID REGISTRATIONS WITHOUT RECEIPT NO!`);
        paidWithoutReceipt.forEach(r => console.log(`   - ${r.name} (${r.email}, Roll: ${r.rollNo}, ID: ${r._id})`));
    } else {
        console.log(`✅ All ${paidList.length} paid registrations have a receiptNo.`);
    }

    let duplicateReceipts = 0;
    for (const [receiptNo, list] of receiptMap.entries()) {
        if (list.length > 1) {
            duplicateReceipts++;
            console.log(`🚨 DUPLICATE RECEIPT NO ${receiptNo}: ${list.length} registrations share it!`);
            list.forEach(r => console.log(`   - ${r.name} (${r.email}, ${r.rollNo}, status: ${r.status})`));
        }
    }
    if (duplicateReceipts === 0) {
        console.log(`✅ No duplicate receipt numbers found.`);
    }

    // List all receipts in order to check for gaps
    const receiptNums = paidList
        .map(r => r.receiptNo)
        .filter(Boolean)
        .map(r => parseInt(r.replace(/\D/g, ''), 10))
        .sort((a, b) => a - b);
    
    console.log(`Receipt numbers range: min=${receiptNums[0]}, max=${receiptNums[receiptNums.length - 1]}, count=${receiptNums.length}`);
    const missingReceipts = [];
    if (receiptNums.length > 0) {
        const min = receiptNums[0];
        const max = receiptNums[receiptNums.length - 1];
        const set = new Set(receiptNums);
        for (let i = min; i <= max; i++) {
            if (!set.has(i)) missingReceipts.push(i);
        }
    }
    if (missingReceipts.length > 0) {
        console.log(`⚠️ GAPS in receipt numbers: ${missingReceipts.map(n => `AST-WS-${String(n).padStart(4, '0')}`).join(', ')}`);
    } else {
        console.log(`✅ No gaps in receipt numbers between min and max.`);
    }

    // Check grouping by Student (rollNo or email)
    console.log(`\n=== CHECKING MULTIPLE ENTRIES PER STUDENT ===`);
    const studentMap = new Map();
    for (const r of all) {
        const key = (r.rollNo?.toLowerCase().trim()) || (r.email?.toLowerCase().trim());
        if (!studentMap.has(key)) {
            studentMap.set(key, []);
        }
        studentMap.get(key).push(r);
    }

    const multiEntries = [];
    for (const [key, list] of studentMap.entries()) {
        if (list.length > 1) {
            multiEntries.push({ key, list });
        }
    }

    console.log(`Found ${multiEntries.length} students with multiple entries:`);
    for (const { key, list } of multiEntries) {
        console.log(`\nStudent Key: ${key} (${list[0].name}) - ${list.length} entries:`);
        list.forEach((r, idx) => {
            console.log(`  [${idx + 1}] ID: ${r._id} | Created: ${new Date(r.createdAt).toLocaleString()} | Status: ${r.status} | Package: ${r.package} | Amount: ${r.amount} | Receipt: ${r.receiptNo || 'none'} | Order: ${r.razorpayOrderId} | Payment: ${r.razorpayPaymentId || 'none'}`);
        });
    }

    // Check Pending entries where student NEVER had a paid entry
    console.log(`\n=== CHECKING PENDING ENTRIES WITHOUT ANY PAID ENTRY ===`);
    const pendingOnlyStudents = [];
    for (const [key, list] of studentMap.entries()) {
        const hasPaid = list.some(r => r.status === 'paid');
        if (!hasPaid) {
            pendingOnlyStudents.push({ key, list });
        }
    }

    console.log(`Found ${pendingOnlyStudents.length} students who have ONLY PENDING entries (may have attempted payment):`);
    for (const { key, list } of pendingOnlyStudents) {
        console.log(`\n- ${list[0].name} (Roll: ${list[0].rollNo}, Email: ${list[0].email}, Phone: ${list[0].phone}) - ${list.length} attempt(s):`);
        list.forEach((r, idx) => {
            console.log(`    Attempt #${idx+1}: Created ${new Date(r.createdAt).toLocaleString()} | Pkg: ${r.package} (₹${r.amount}) | Order: ${r.razorpayOrderId}`);
        });
    }

    process.exit(0);
}

analyze().catch(console.error);
