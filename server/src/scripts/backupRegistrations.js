/*
 * Reads every workshop registration, attendance record and the receipt counter
 * into one timestamped JSON file. Atlas free (M0) clusters have no snapshots,
 * so this file is the only thing standing between a bad delete and permanent
 * loss. Run it before any script that writes, and on a schedule.
 *
 * Usage:  node server/src/scripts/backupRegistrations.js [outputDir]
 *         Default output: server/data/backups/
 *
 * Restore with restoreWorkshopRegistrations.js. This script never writes to
 * the database.
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import Counter from '../models/Counter.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
}

const dbName = resolveMongoDbName(uri);
const outDir = path.resolve(process.argv[2] || path.resolve(__dirname, '../../data/backups'));

async function backup() {
    try {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });
    } catch {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });
    }

    const registrations = await WorkshopRegistration.find({}).lean();
    const attendance = await WorkshopAttendance.find({}).lean();
    const counter = await Counter.findOne({ _id: 'workshopReceipt' }).lean();

    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(outDir, `workshop-registrations-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify({
        takenAt: new Date().toISOString(),
        dbName: mongoose.connection.name,
        counter,
        registrations,
        attendance
    }, null, 2));

    const paid = registrations.filter(r => r.status === 'paid').length;
    console.log(`✓ ${registrations.length} registration(s) (${paid} paid), ${attendance.length} attendance record(s), receipts issued: ${counter?.seq || 0}`);
    console.log(`✓ Written to ${file}`);

    await mongoose.disconnect();
}

backup().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
});
