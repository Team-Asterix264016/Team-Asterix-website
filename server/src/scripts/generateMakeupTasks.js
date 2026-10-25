import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopSession from '../models/WorkshopSession.js';
import WorkshopTask from '../models/WorkshopTask.js';
import { resolveMongoDbName } from '../db/mongodb.js';
import {
    summarizeAttendance,
    CERTIFICATE_THRESHOLD,
    TASK_CREDIT_CAP
} from '../lib/workshopSessions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/*
 * Assigns make-up tasks to candidates whose attendance can no longer reach the
 * certificate threshold on a track, even by attending every session that is left.
 *
 * Usage: node src/scripts/generateMakeupTasks.js [--apply]
 *
 * One task per missed session, newest misses first, at most TASK_CREDIT_CAP per
 * track. The brief is a draft built from the session title and a per-candidate
 * number derived from the roll number, so two candidates making up the same
 * session cannot hand in the same file. Whoever taught the session should edit
 * the brief afterwards; the generator cannot know what the exercise should be.
 *
 * Without --apply nothing is written.
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

const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Two digits from the roll number, so each candidate works with their own value.
function seedOf(rollNo) {
    const digits = String(rollNo || '').replace(/\D/g, '');
    return digits.slice(-2) || '00';
}

function draftBrief(session, seed) {
    return [
        `You missed "${session.title || session.label}" on ${session.date}.`,
        '',
        `Your working value for this task is ${seed}, taken from your roll number.`,
        'Use it wherever the exercise asks for a parameter, so your submission is your own.',
        '',
        'Submit a single Drive link, shared so anyone with the link can view, containing:',
        '  1. Your work for this session (code, simulation file, schematic or notes).',
        '  2. A screenshot showing it running or working.',
        '  3. A short write-up, about 300 words, explaining what you did and what you learned.',
        '',
        'The workshop team may ask you to walk through your submission in person.'
    ].join('\n');
}

const sessions = await WorkshopSession.find({}).lean();
const sessionByKey = new Map(sessions.map((session) => [session.sessionKey, session]));
const regs = await WorkshopRegistration.find({ status: 'paid' }).lean();
const existingTasks = await WorkshopTask.find({}, 'registrationId sessionKey').lean();
const taken = new Set(existingTasks.map((task) => `${task.registrationId}|${task.sessionKey}`));

let planned = 0;
const toCreate = [];

for (const reg of regs) {
    const tracksEnrolled = Array.isArray(reg.tracksEnrolled) && reg.tracksEnrolled.length > 0
        ? reg.tracksEnrolled
        : (reg.package === 'combo' ? ['software', 'powertrain'] : [reg.package || 'software']);

    const attendanceRecords = await WorkshopAttendance.find({
        $or: [
            { registrationId: reg._id },
            { rollNo: String(reg.rollNo || '').toUpperCase() },
            { email: String(reg.email || '').toLowerCase() }
        ]
    }).lean();

    const { perTrack, presentKeys } = summarizeAttendance({ sessions, attendanceRecords, tracksEnrolled });

    for (const trackId of tracksEnrolled) {
        const summary = perTrack[trackId];
        const remaining = sessions.filter((session) => session.track === trackId
            && session.countsForAttendance
            && session.status === 'scheduled'
            && (!session.date || session.date >= todayIso)).length;
        const finalTotal = summary.totalConducted + remaining;
        if (finalTotal === 0) continue;

        // Only candidates who cannot reach the threshold by attending everything.
        const bestPossible = Math.round(((summary.totalPresent + remaining) / finalTotal) * 100);
        if (bestPossible >= CERTIFICATE_THRESHOLD) continue;

        const alreadyAssigned = existingTasks.filter((task) => String(task.registrationId) === String(reg._id)
            && sessionByKey.get(task.sessionKey)?.track === trackId).length;
        const slots = TASK_CREDIT_CAP - alreadyAssigned;
        if (slots <= 0) continue;

        // Most recent misses first: that content is freshest and easiest to make up.
        const missed = sessions
            .filter((session) => session.track === trackId
                && session.countsForAttendance
                && session.status === 'conducted'
                && !presentKeys.has(session.sessionKey)
                && !taken.has(`${reg._id}|${session.sessionKey}`))
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
            .slice(0, slots);

        for (const session of missed) {
            const seed = seedOf(reg.rollNo);
            toCreate.push({
                registrationId: reg._id,
                rollNo: String(reg.rollNo || '').toUpperCase(),
                name: reg.name,
                email: String(reg.email || '').toLowerCase(),
                track: trackId,
                sessionKey: session.sessionKey,
                sessionTitle: session.title || session.label,
                sessionDate: session.date,
                title: `Make-up: ${session.title || session.label}`,
                brief: draftBrief(session, seed),
                individualSeed: seed,
                status: 'assigned',
                assignedBy: 'script:generateMakeupTasks'
            });
            taken.add(`${reg._id}|${session.sessionKey}`);
            planned += 1;
        }

        console.log(`${reg.rollNo} ${String(reg.name).slice(0, 22).padEnd(22)} ${trackId.padEnd(10)} ${summary.totalPresent}/${summary.totalConducted}=${summary.attendancePercentage}% best=${bestPossible}% -> ${missed.length} task(s)`);
    }
}

console.log(`\nCandidates needing the task route reviewed. Tasks to create: ${planned}`);

if (!apply) {
    console.log('DRY RUN. Nothing was written. Re-run with --apply.');
    await mongoose.disconnect();
    process.exit(0);
}

if (toCreate.length > 0) await WorkshopTask.insertMany(toCreate, { ordered: false });
console.log(`Created ${toCreate.length}. Tasks now: ${await WorkshopTask.countDocuments()}`);
console.log('Edit each brief with the real exercise before telling candidates to start.');
await mongoose.disconnect();
