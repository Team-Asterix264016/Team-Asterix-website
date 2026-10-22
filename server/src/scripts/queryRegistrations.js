import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import User from '../models/User.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function queryAll() {
    const uri = process.env.MONGODB_URI;
    const dbName = resolveMongoDbName(uri);
    if (!uri) {
        console.error('MONGODB_URI is not set in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, { 
            dbName, 
            serverSelectionTimeoutMS: 10000,
            tlsAllowInvalidCertificates: true 
        });
        console.log(`Connected to database "${dbName}"\n`);

        const registrations = await WorkshopRegistration.find({}).sort({ createdAt: -1 }).lean();
        console.log(`=== WORKSHOP REGISTRATIONS (${registrations.length} Total) ===`);
        if (registrations.length === 0) {
            console.log('No workshop registrations found.');
        } else {
            registrations.forEach((r, i) => {
                console.log(`\n[#${i + 1}]`);
                console.log(`Name:        ${r.name}`);
                console.log(`Roll No:     ${r.rollNo}`);
                console.log(`Dept / Year: ${r.department} (Year ${r.year})`);
                console.log(`Email:       ${r.email}`);
                console.log(`Phone:       ${r.phone}`);
                console.log(`Package:     ${r.package} (${r.tracksEnrolled?.join(', ')})`);
                console.log(`Amount:      ${r.amount}`);
                console.log(`Status:      ${r.status.toUpperCase()}`);
                console.log(`Receipt No:  ${r.receiptNo || 'N/A'}`);
                console.log(`Order ID:    ${r.razorpayOrderId || 'N/A'}`);
                console.log(`Payment ID:  ${r.razorpayPaymentId || 'N/A'}`);
                console.log(`Registered:  ${r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}`);
            });
        }

        const users = await User.find({}, '-password').sort({ createdAt: -1 }).lean();
        console.log(`\n=== ADMIN/TEAM ACCOUNTS (${users.length} Total) ===`);
        users.forEach((u, i) => {
            console.log(`[#${i + 1}] ${u.name} (@${u.username}) | Role: ${u.role} | Access: ${u.accessLevel} | Phone: ${u.phone || 'N/A'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Database query error:', err);
        process.exit(1);
    }
}

queryAll();
