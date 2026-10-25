import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopSession from '../models/WorkshopSession.js';
import { resolveMongoDbName } from '../db/mongodb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/*
 * Marks every paid candidate on a track present for the given sessions, and
 * sets those sessions to "conducted".
 *
 * Usage: node src/scripts/markSessionAllPresent.js <sessionKey> [...] [--apply]
 *
 * For sessions that were held but whose check-in never worked, so nobody could
 * have been recorded. Crediting everyone is deliberately more generous than
 * cancelling the session: cancelling leaves each candidate's ratio untouched,
 * while a credited session raises it for everyone below 100%.
 *
 * Without --apply nothing is written. Re-running is safe; candidates who
 * already hold a record for a session are skipped.
 */

const apply = process.argv.includes('--apply');
const sessionKeys = process.argv.slice(2).filter((arg) => arg !== '--apply');

if (sessionKeys.length === 0) {
    console.error('Give at least one sessionKey, e.g. "software|sch-sw-0".');
    process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set. Add it to server/.env and run again.');
    process.exit(1);
}
await mongoose.connect(uri, {
    dbName: resolveMongoDbName(uri),
    serverSelectionTimeoutMS: 15000,
    tlsAllowInvalidCertificates: true
});

const REASON = 'Session held but check-in unavailable; credited to all enrolled candidates.';

const sessions = await WorkshopSession.find({ sessionKey: { $in: sessionKeys } }).lean();
const missing = sessionKeys.filter((key) => !sessions.some((s) => s.sessionKey === key));
if (missing.length > 0) {
    console.error(`No WorkshopSession for: ${missing.join(', ')}`);
    console.error('Run seedWorkshopSessions.js --apply first.');
    process.exit(1);
}

let totalPlanned = 0;
const plans = [];

for (const session of sessions) {
    // Combo candidates are enrolled in both tracks, so they are credited too.
    const enrolled = await WorkshopRegistration.find({
        status: 'paid',
        $or: [{ tracksEnrolled: session.track }, { package: 'combo' }]
    }).lean();

    const existing = await WorkshopAttendance.find({
        $or: [{ sessionKey: session.sessionKey }, { sessionId: { $in: session.legacySessionIds || [] } }]
    }, 'rollNo registrationId').lean();
    const alreadyPresent = new Set(existing.map((a) => String(a.registrationId)));

    const toCredit = enrolled.filter((reg) => !alreadyPresent.has(String(reg._id)));
    totalPlanned += toCredit.length;
    plans.push({ session, toCredit });

    console.log(`${session.sessionKey}  ${session.date}  ${session.type}  status=${session.status} counts=${session.countsForAttendance}`);
    console.log(`   enrolled=${enrolled.length}  already present=${enrolled.length - toCredit.length}  to credit=${toCredit.length}`);
}

console.log(`\nTotal attendance records to create: ${totalPlanned}`);
console.log(`Sessions to set status="conducted": ${sessions.length}`);

if (!apply) {
    console.log('\nDRY RUN. Nothing was written. Re-run with --apply.');
    await mongoose.disconnect();
    process.exit(0);
}

let created = 0;
for (const { session, toCredit } of plans) {
    // sessionId keeps the shape the older routes wrote, and stays unique per
    // session so the {rollNo, sessionId} index still guards against doubles.
    const sessionId = `${session.track}-${session.scheduleId}-${session.date}`;
    const docs = toCredit.map((reg) => ({
        registrationId: reg._id,
        rollNo: String(reg.rollNo || '').toUpperCase(),
        email: String(reg.email || '').toLowerCase(),
        name: reg.name,
        department: reg.department,
        year: reg.year,
        package: reg.package,
        track: session.track,
        sessionId,
        sessionKey: session.sessionKey,
        sessionNumber: session.sessionNumber || 0,
        sessionDate: session.date,
        sessionTopic: session.title,
        // The {deviceId, sessionId} index is unique, so each credited row needs
        // its own synthetic device id.
        deviceId: `bulk_${session.scheduleId}_${reg.rollNo}`,
        ipAddress: '',
        userAgent: 'Admin Bulk Credit',
        verifiedBy: 'manual-admin',
        markedBy: 'script:markSessionAllPresent',
        markedReason: REASON,
        checkedInAt: new Date()
    }));

    if (docs.length > 0) {
        const res = await WorkshopAttendance.insertMany(docs, { ordered: false });
        created += res.length;
    }
    await WorkshopSession.updateOne({ sessionKey: session.sessionKey }, {
        $set: { status: 'conducted', notes: REASON }
    });
    console.log(`${session.sessionKey}: credited ${docs.length}, status=conducted`);
}

console.log(`\nCreated ${created} attendance records. Total check-ins now: ${await WorkshopAttendance.countDocuments()}`);
await mongoose.disconnect();
