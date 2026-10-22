/*
 * Deletes every workshop registration and resets the receipt counter.
 *
 * This script wipes paid participant records that cannot be reconstructed from
 * anywhere else, so it refuses to run unless it is given the exact
 * confirmation flag, and it always writes a JSON backup of every document to
 * server/data/backups/ first. Restore with restoreWorkshopRegistrations.js.
 *
 * Usage:  node server/src/scripts/clearWorkshopRegistrations.js --yes-delete-all-registrations
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import Counter from '../models/Counter.js';
import { resolveMongoDbName } from '../db/mongodb.js';
import { archiveDocuments } from '../lib/recycleBin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CONFIRM_FLAG = '--yes-delete-all-registrations';

async function clearWorkshopRegistrations() {
    const uri = process.env.MONGODB_URI;
    const dbName = resolveMongoDbName(uri);

    if (!uri) {
        console.error('MONGODB_URI is not set in .env');
        process.exit(1);
    }

    if (!process.argv.includes(CONFIRM_FLAG)) {
        console.error(`Refusing to run. This permanently deletes every workshop registration in database "${dbName}".`);
        console.error(`Re-run with ${CONFIRM_FLAG} if that is genuinely what you want.`);
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, {
            dbName,
            serverSelectionTimeoutMS: 10000,
            tlsAllowInvalidCertificates: true
        });
        console.log(`Connected to database "${dbName}".`);

        const docs = await WorkshopRegistration.find({}).lean();
        const counter = await Counter.findOne({ _id: 'workshopReceipt' }).lean();
        const paid = docs.filter(d => d.status === 'paid').length;

        if (docs.length === 0) {
            console.log('No registrations to delete. Nothing done.');
            process.exit(0);
        }

        const backupDir = path.resolve(__dirname, '../../data/backups');
        fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `workshop-registrations-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(backupPath, JSON.stringify({ dbName, counter, registrations: docs }, null, 2));
        console.log(`✓ Backed up ${docs.length} registration(s) (${paid} paid) to ${backupPath}`);

        // Second copy, inside the database, in case the JSON file is lost.
        await archiveDocuments('WorkshopRegistration', docs, {
            deletedBy: 'clearWorkshopRegistrations.js',
            reason: 'manual script run'
        });

        const deleteResult = await WorkshopRegistration.deleteMany({});
        console.log(`✓ Deleted ${deleteResult.deletedCount} workshop registrations.`);

        const counterResult = await Counter.deleteOne({ _id: 'workshopReceipt' });
        console.log(`✓ Reset workshopReceipt counter (next receipt will start at AST-WS-0001). Removed: ${counterResult.deletedCount}`);

        console.log(`\nWorkshop registrations cleared. Restore with:\n  node server/src/scripts/restoreWorkshopRegistrations.js ${backupPath}`);
        process.exit(0);
    } catch (err) {
        console.error('Error clearing workshop registrations:', err);
        process.exit(1);
    }
}

clearWorkshopRegistrations();
