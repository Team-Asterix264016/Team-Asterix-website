import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import DeletedRecord from '../models/DeletedRecord.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/*
 * Read-only audit. Lists everyone who checked in to the early workshop
 * sessions but no longer has a WorkshopRegistration document, and says whether
 * the recycle bin still holds a copy that restoreDeleted.js could bring back.
 *
 * Usage: node src/scripts/findMissingAttendees.js [maxSession]   (default 5)
 *
 * Roll numbers are the join key, matched case-insensitively: WorkshopAttendance
 * stores them uppercased while WorkshopRegistration only trims them.
 */

const maxSession = parseInt(process.argv[2], 10) || 5;

const key = (value) => String(value || '').trim().toUpperCase();

async function main() {
    const uri = process.env.MONGODB_URI;
    const dbName = resolveMongoDbName(uri);
    if (!uri) {
        console.error('MONGODB_URI is not set. Add it to server/.env and run again.');
        process.exit(1);
    }

    await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 10000,
        tlsAllowInvalidCertificates: true
    });
    console.log(`Connected to database "${dbName}" (read-only audit)\n`);

    const attendance = await WorkshopAttendance.find({ sessionNumber: { $lte: maxSession } })
        .sort({ sessionNumber: 1, checkedInAt: 1 })
        .lean();

    const registrations = await WorkshopRegistration.find({}, 'name email rollNo package status').lean();
    const byRollNo = new Map(registrations.map(r => [key(r.rollNo), r]));
    const byId = new Set(registrations.map(r => String(r._id)));

    // One entry per attendee, carrying every session they were seen in.
    const attendees = new Map();
    for (const row of attendance) {
        const id = key(row.rollNo);
        if (!attendees.has(id)) {
            attendees.set(id, {
                rollNo: row.rollNo,
                name: row.name,
                email: row.email,
                department: row.department,
                year: row.year,
                package: row.package,
                track: row.track,
                registrationId: String(row.registrationId || ''),
                sessions: new Set()
            });
        }
        attendees.get(id).sessions.add(row.sessionNumber);
    }

    const missing = [];
    for (const [id, person] of attendees) {
        const matchedByRollNo = byRollNo.has(id);
        const matchedById = person.registrationId && byId.has(person.registrationId);
        if (!matchedByRollNo && !matchedById) missing.push(person);
    }

    console.log(`Sessions audited:       1 to ${maxSession}`);
    console.log(`Attendance check-ins:   ${attendance.length}`);
    console.log(`Distinct attendees:     ${attendees.size}`);
    console.log(`Registrations on file:  ${registrations.length}`);
    console.log(`Attendees with no registration: ${missing.length}\n`);

    if (missing.length === 0) {
        console.log('Every attendee of these sessions still has a registration document.');
    }

    // The recycle bin keeps the whole original document, so a deleted
    // registration can be identified by roll number or email.
    const archived = await DeletedRecord.find({ collectionName: 'WorkshopRegistration' }).lean();

    // Recycle-bin summary across all collections: anything deleted but not yet
    // restored is data that is "lost" from the live collections.
    const allArchived = await DeletedRecord.find({}).lean();
    const binByCollection = new Map();
    for (const rec of allArchived) {
        const bucket = binByCollection.get(rec.collectionName) || { total: 0, pending: 0 };
        bucket.total += 1;
        if (!rec.restoredAt) bucket.pending += 1;
        binByCollection.set(rec.collectionName, bucket);
    }
    console.log('\n=== RECYCLE BIN (DeletedRecord) ===');
    if (binByCollection.size === 0) {
        console.log('Empty. Nothing has been archived for deletion.');
    } else {
        for (const [name, b] of binByCollection) {
            console.log(`${name}: ${b.total} archived, ${b.pending} still deleted (not restored)`);
        }
    }
    console.log('');

    for (const person of missing) {
        const sessions = [...person.sessions].sort((a, b) => a - b).join(', ');
        console.log('----------------------------------------');
        console.log(`Roll No:     ${person.rollNo}`);
        console.log(`Name:        ${person.name}`);
        console.log(`Email:       ${person.email}`);
        console.log(`Dept / Year: ${person.department} (Year ${person.year})`);
        console.log(`Package:     ${person.package}   Track: ${person.track}`);
        console.log(`Sessions:    ${sessions}`);
        console.log(`Attendance points to registrationId ${person.registrationId || '(none)'}`);

        const hit = archived.find(record => {
            const doc = record.document || {};
            return key(doc.rollNo) === key(person.rollNo)
                || String(doc.email || '').toLowerCase() === String(person.email || '').toLowerCase()
                || String(record.documentId) === person.registrationId;
        });

        if (hit) {
            console.log(`RECOVERABLE: in recycle bin, deleted by ${hit.deletedBy} on ${new Date(hit.createdAt).toISOString()}`);
            if (hit.reason) console.log(`             reason: ${hit.reason}`);
            if (hit.restoredAt) console.log(`             already marked restored at ${new Date(hit.restoredAt).toISOString()}`);
            console.log(`             DeletedRecord _id: ${hit._id}`);
        } else {
            console.log('NOT IN RECYCLE BIN: no archived copy found.');
        }
    }

    console.log('\nNothing was written. Use src/scripts/restoreDeleted.js to restore.');
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error('Audit failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
