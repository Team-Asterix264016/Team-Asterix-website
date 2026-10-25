import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopSession from '../models/WorkshopSession.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import { resolveMongoDbName } from '../db/mongodb.js';
import { loadMergedTracks, buildSessionSeeds } from '../lib/workshopSessions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/*
 * Creates the WorkshopSession rows that the attendance percentage divides by.
 *
 * Usage: node src/scripts/seedWorkshopSessions.js [--apply]
 *
 * Without --apply nothing is written; the script prints the mapping it would
 * make so the session list can be checked first. Re-running is safe: schedule
 * details are refreshed, but status, open/close times and notes an admin has
 * already set are never overwritten.
 *
 * A session is proposed as "conducted" only when attendance rows exist for it.
 * Sessions whose date has passed with no rows are listed separately — those are
 * the ones a human has to rule on, because the old system could not tell a
 * cancelled session apart from one where the scanner simply never worked.
 */

const apply = process.argv.includes('--apply');

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

const tracks = await loadMergedTracks();
const seeds = buildSessionSeeds(tracks);
const today = new Date().toISOString().slice(0, 10);

// What the old check-in routes actually wrote, grouped the way the profile used
// to match it: one bucket per track and calendar date.
const recorded = await WorkshopAttendance.aggregate([
    {
        $group: {
            _id: { track: '$track', date: '$sessionDate' },
            rows: { $sum: 1 },
            sessionIds: { $addToSet: '$sessionId' }
        }
    }
]);

const seedByTrackDate = new Map();
seeds.forEach((seed) => {
    if (!seed.date) return;
    const dateKey = `${seed.track}|${seed.date}`;
    seedByTrackDate.set(dateKey, [...(seedByTrackDate.get(dateKey) || []), seed]);
});

const legacyBySessionKey = new Map();
const rowsBySessionKey = new Map();
const orphanBuckets = [];
const ambiguousBuckets = [];

recorded.forEach((bucket) => {
    const dateKey = `${bucket._id.track}|${bucket._id.date}`;
    const matches = seedByTrackDate.get(dateKey) || [];
    if (matches.length === 0) {
        orphanBuckets.push(bucket);
        return;
    }
    if (matches.length > 1) {
        ambiguousBuckets.push({ bucket, matches });
        return;
    }
    const key = matches[0].sessionKey;
    legacyBySessionKey.set(key, [...(legacyBySessionKey.get(key) || []), ...bucket.sessionIds]);
    rowsBySessionKey.set(key, (rowsBySessionKey.get(key) || 0) + bucket.rows);
});

const existing = await WorkshopSession.find({}).lean();
const existingByKey = new Map(existing.map((session) => [session.sessionKey, session]));

console.log(`Tracks loaded:      ${Object.keys(tracks).join(', ')}`);
console.log(`Schedule entries:   ${seeds.length}`);
console.log(`Counted for %:      ${seeds.filter((s) => s.countsForAttendance).length}`);
console.log(`Already in DB:      ${existing.length}`);
console.log(`Attendance buckets: ${recorded.length}\n`);

console.log('=== PROPOSED SESSIONS ===');
const withRows = [];
const pastWithoutRows = [];
const future = [];

for (const seed of seeds) {
    const rows = rowsBySessionKey.get(seed.sessionKey) || 0;
    const prior = existingByKey.get(seed.sessionKey);
    const status = prior?.status || (rows > 0 ? 'conducted' : 'scheduled');
    const entry = { seed, rows, status, prior };
    if (rows > 0) withRows.push(entry);
    else if (seed.date && seed.date < today) pastWithoutRows.push(entry);
    else future.push(entry);
}

const show = (entry) => {
    const { seed, rows, status } = entry;
    const counted = seed.countsForAttendance ? 'counted' : 'NOT counted';
    console.log(`  ${seed.sessionKey.padEnd(26)} ${String(seed.date).padEnd(11)} ${seed.type.padEnd(14)} rows=${String(rows).padStart(4)}  ${status.padEnd(9)} ${counted}`);
    const legacy = legacyBySessionKey.get(seed.sessionKey) || [];
    if (legacy.length > 0) console.log(`      legacy sessionIds: ${legacy.join(', ')}`);
};

console.log(`\n-- Has attendance rows (${withRows.length}) --`);
withRows.forEach(show);
console.log(`\n-- Past date, NO attendance rows (${pastWithoutRows.length}) -- decide: conducted with a broken scanner, or cancelled?`);
pastWithoutRows.forEach(show);
console.log(`\n-- Not yet held (${future.length}) --`);
future.forEach(show);

if (ambiguousBuckets.length > 0) {
    console.log(`\n!! AMBIGUOUS: attendance dates matching more than one schedule entry (${ambiguousBuckets.length}) --`);
    ambiguousBuckets.forEach(({ bucket, matches }) => {
        console.log(`  ${bucket._id.track} ${bucket._id.date} rows=${bucket.rows} -> ${matches.map((m) => m.sessionKey).join(' | ')}`);
    });
}

if (orphanBuckets.length > 0) {
    console.log(`\n!! ORPHANS: attendance on dates with no schedule entry (${orphanBuckets.length}) --`);
    orphanBuckets.forEach((bucket) => {
        console.log(`  ${bucket._id.track} ${bucket._id.date} rows=${bucket.rows} ids=${bucket.sessionIds.join(', ')}`);
    });
    console.log('  These rows will NOT count for or against anyone until mapped to a session.');
}

if (!apply) {
    console.log('\nDRY RUN. Nothing was written. Re-run with --apply to create these sessions.');
    await mongoose.disconnect();
    process.exit(0);
}

let created = 0;
let updated = 0;
for (const { seed, rows, prior } of [...withRows, ...pastWithoutRows, ...future]) {
    const legacySessionIds = legacyBySessionKey.get(seed.sessionKey) || [];
    if (!prior) {
        await WorkshopSession.create({
            ...seed,
            status: rows > 0 ? 'conducted' : 'scheduled',
            legacySessionIds
        });
        created += 1;
        continue;
    }
    // Refresh what the schedule owns; leave the admin's ruling on this session alone.
    await WorkshopSession.updateOne({ sessionKey: seed.sessionKey }, {
        $set: {
            track: seed.track,
            scheduleId: seed.scheduleId,
            sessionNumber: seed.sessionNumber,
            label: seed.label,
            title: seed.title,
            date: seed.date,
            type: seed.type
        },
        $addToSet: { legacySessionIds: { $each: legacySessionIds } }
    });
    updated += 1;
}

console.log(`\nCreated ${created}, refreshed ${updated}. Sessions now: ${await WorkshopSession.countDocuments()}`);
await mongoose.disconnect();
