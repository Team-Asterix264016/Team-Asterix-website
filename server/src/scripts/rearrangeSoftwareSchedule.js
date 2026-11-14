import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, BSON } from 'mongodb';
import { resolveMongoDbName } from '../db/mongodb.js';

const { EJSON } = BSON;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/*
 * Rearranges the software track to the schedule as it was actually held
 * (Nov 2026 correction), moving each session's attendance with it.
 *
 *   node src/scripts/rearrangeSoftwareSchedule.js                  dry run, writes nothing
 *   node src/scripts/rearrangeSoftwareSchedule.js --apply          backs up, then writes
 *   node src/scripts/rearrangeSoftwareSchedule.js --revert <file>  restores from that backup
 *
 * --apply first writes a full copy of the SiteConfig workshop block, every
 * software session and every software attendance row to server/data/backups/
 * (gitignored: it holds participant data). --revert puts back exactly the
 * fields this script changes, so edits made elsewhere since are left alone.
 *
 * Attendance is matched by sessionKey, plus keyless rows on the session's old
 * date (how older rows resolve). Session ids and keys never change, so make-up
 * tasks and resources stay linked.
 */

const TRACK = 'software';
const VENUE = 'E6 – Mechanical Seminar Hall';

/* The schedule, top to bottom. `date` is the IST day the session was held,
   which is also the day its attendance was taken. Entries after the held and
   upcoming sessions are kept on the timeline but do not count. */
const SCHEDULE = [
    { id: 'sch-sw-0', label: 'Pre-Workshop', date: '6 Oct', days: 'Tuesday', title: 'Pre-Workshop Session: Set Up Once, Build All Month', instructor: 'All Team Members', project: 'Prerequisites & setup checklist', venue: VENUE },
    { id: 'sch-sw-1', label: 'Session 1', date: '8 Oct', days: 'Thursday', title: 'System Design I: Subsystem Thinking', instructor: 'Rithvin, Preethika', project: 'Mini Project 1 – System Design', venue: VENUE },
    { id: 'sch-sw-2', label: 'Session 2', date: '13 Oct', days: 'Tuesday', title: 'System Design II: Block Diagramming', instructor: 'Rithvin, Preethika', project: 'Mini Project 2 – System Design', venue: VENUE },
    { id: 'sch-sw-3', label: 'Session 3', date: '15 Oct', days: 'Thursday', title: 'Computer Vision: Teaching the Car to See', instructor: 'Mr. Mahavishnu V C', project: 'Mini Project 3 – CV; Project 1 assigned', venue: VENUE },
    { id: 'sch-sw-4', label: 'Session 4', date: '22 Oct', days: 'Thursday', title: 'Introduction to ML and Unsupervised Training', instructor: 'Ms. Bavana, Ms. Swethaswini, Ms. Lakshana', project: 'Mini Project 4 – ML', venue: VENUE },
    { id: 'sch-sw-ind2', label: 'Industry Session', date: '24 Oct', days: 'Saturday', title: 'Automotive Functional Safety', instructor: 'Mrs. Sasikala, Robert Bosch', project: 'Automotive Functional Safety', venue: VENUE },
    { id: 'sch-sw-5', label: 'Session 5', date: '27 Oct', days: 'Tuesday', title: 'Agentic AI I: Generative AI and Agents-I', instructor: 'Rithvin, Arya', project: 'Mini Project 5 – Agentic AI', venue: VENUE },
    { id: 'sch-sw-7', label: 'Session 6', number: 6, date: '3 Nov', days: 'Tuesday', title: 'Agentic AI II: Generative AI and Agents-II', instructor: 'Josna', project: 'Mini Project 6 – Agentic AI', venue: VENUE },
    { id: 'sch-sw-8', label: 'Session 7', number: 7, date: '10 Nov', days: 'Tuesday', title: 'Machine Learning: Supervised Learning – From the Basics', instructor: 'Ratheeswar', project: 'Machine Learning', venue: VENUE },
    { id: 'sch-sw-6', label: 'Session 8', number: 8, date: '13 Nov', days: 'Friday', title: 'Basic Dev Tools', instructor: 'Tanishka, Kanishka', project: '', venue: VENUE },
    { id: 'sch-sw-ind5', label: 'Industry Session', date: '14 Nov', days: 'Saturday', title: 'Fundamentals of Automobiles and EVs', instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar', project: 'Automobiles and EVs', venue: VENUE, type: 'expert', isNew: true },
    { id: 'sch-sw-ind6', label: 'Industry Session', date: '15 Nov', days: 'Sunday', title: 'Fundamentals of Autonomous Vehicles', instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar', project: 'Autonomous Vehicles', venue: VENUE, type: 'expert', isNew: true },
    // Kept on the timeline, out of the percentage. 10 Oct may be counted again later.
    { id: 'sch-sw-ind1', exclude: true },
    { id: 'sch-sw-cu1' },
    { id: 'sch-sw-h1' },
    { id: 'sch-sw-cu2' },
    { id: 'sch-sw-h2' },
    { id: 'sch-sw-cu3' },
    { id: 'sch-sw-ind3', exclude: true },
    { id: 'sch-sw-cu4' },
    { id: 'sch-sw-ind4', exclude: true },
    { id: 'sch-sw-cu5' }
];

const MONTHS = { Oct: '10', Nov: '11' };
const isoOf = (date) => {
    const [day, mon] = date.split(' ');
    return `2026-${MONTHS[mon]}-${day.padStart(2, '0')}`;
};
const keyOf = (id) => `${TRACK}|${id}`;
// Schedule-only fields: these live in SiteConfig, not on the session row.
const scheduleFields = ({ number: _n, exclude: _e, isNew: _i, ...item }) => item;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const revertIdx = args.indexOf('--revert');
const revertFile = revertIdx >= 0 ? args[revertIdx + 1] : null;

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set. Add it to server/.env and run again.');
    process.exit(1);
}
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });
await client.connect();
const db = client.db(resolveMongoDbName(uri));
const siteconfigs = db.collection('siteconfigs');
const sessionsCol = db.collection('workshopsessions');
const attendanceCol = db.collection('workshopattendances');
console.log(`Database: ${db.databaseName}`);

try {
    if (revertFile) await revert(revertFile);
    else await rearrange();
} finally {
    await client.close();
}

async function rearrange() {
    const config = await siteconfigs.findOne({ key: 'main' });
    const current = config?.workshop?.tracks?.[TRACK]?.schedule;
    if (!Array.isArray(current)) throw new Error('No saved software schedule in SiteConfig; nothing to rearrange.');
    const currentById = new Map(current.map((item) => [item.id, item]));

    // Every current entry must be placed exactly once, so nothing silently drops off.
    const plannedIds = SCHEDULE.map((s) => s.id);
    const dropped = current.filter((item) => !plannedIds.includes(item.id)).map((item) => item.id);
    const unknown = SCHEDULE.filter((s) => !s.isNew && !currentById.has(s.id)).map((s) => s.id);
    if (dropped.length || unknown.length) {
        throw new Error(`Schedule mismatch. Not placed: ${dropped.join(', ') || '-'}; not found: ${unknown.join(', ') || '-'}`);
    }

    const newSchedule = SCHEDULE.map((plan) => ({ ...currentById.get(plan.id), ...scheduleFields(plan) }));

    const sessions = await sessionsCol.find({ track: TRACK }).toArray();
    const sessionByKey = new Map(sessions.map((s) => [s.sessionKey, s]));

    // Session row changes, and the attendance each one carries.
    const sessionOps = [];
    const attendanceOps = [];
    for (const plan of SCHEDULE) {
        const key = keyOf(plan.id);
        const row = sessionByKey.get(key);
        if (plan.isNew) {
            if (row) throw new Error(`${key} already exists; refusing to create it twice.`);
            sessionOps.push({
                kind: 'create',
                key,
                doc: {
                    sessionKey: key, track: TRACK, scheduleId: plan.id, sessionNumber: null,
                    label: plan.label, title: plan.title, date: isoOf(plan.date), type: plan.type,
                    countsForAttendance: true, status: 'scheduled', openedAt: null, closedAt: null,
                    openedBy: '', closedBy: '', legacySessionIds: [], notes: '',
                    createdAt: new Date(), updatedAt: new Date(), __v: 0
                }
            });
            continue;
        }
        if (!row) throw new Error(`No session row for ${key}.`);

        const set = {};
        if (plan.exclude) {
            if (row.countsForAttendance) set.countsForAttendance = false;
        } else if (plan.title) {
            const newDate = isoOf(plan.date);
            if (row.title !== plan.title) set.title = plan.title;
            if (row.label !== plan.label) set.label = plan.label;
            if (plan.number !== undefined && row.sessionNumber !== plan.number) set.sessionNumber = plan.number;
            if (row.date !== newDate) set.date = newDate;
        }
        if (Object.keys(set).length === 0) continue;
        sessionOps.push({ kind: 'update', key, before: row, set });

        if (set.title || set.date || set.sessionNumber !== undefined) {
            const match = {
                track: TRACK,
                $or: [{ sessionKey: key }, { sessionKey: { $in: ['', null] }, sessionDate: row.date }]
            };
            const rows = await attendanceCol.find(match, { projection: { sessionTopic: 1, sessionKey: 1 } }).toArray();
            if (set.date && rows.some((r) => !r.sessionKey)) {
                throw new Error(`${key} has keyless rows on ${row.date}; moving its date would orphan them.`);
            }
            const attSet = {};
            if (set.date) attSet.sessionDate = set.date;
            if (set.sessionNumber !== undefined) attSet.sessionNumber = set.sessionNumber;
            const withTopic = set.title ? rows.filter((r) => r.sessionTopic).length : 0;
            if (rows.length && (Object.keys(attSet).length || withTopic)) {
                attendanceOps.push({ key, match, set: attSet, title: set.title, rows: rows.length, withTopic });
            }
        }
    }

    // Nothing may already sit on a date a session is moving to.
    for (const op of sessionOps.filter((o) => o.kind === 'update' && o.set.date)) {
        const clash = sessions.find((s) => s.date === op.set.date && s.sessionKey !== op.key);
        const rowsThere = await attendanceCol.countDocuments({ track: TRACK, sessionDate: op.set.date });
        if (clash || rowsThere) throw new Error(`${op.set.date} is already taken (${clash?.sessionKey || `${rowsThere} rows`}).`);
    }
    for (const op of sessionOps.filter((o) => o.kind === 'create')) {
        const rowsThere = await attendanceCol.countDocuments({ track: TRACK, sessionDate: op.doc.date });
        if (rowsThere) console.log(`  note: ${rowsThere} existing rows on ${op.doc.date} will resolve to ${op.key}.`);
    }

    console.log('\n=== New software schedule (top to bottom) ===');
    newSchedule.forEach((item, i) => {
        const plan = SCHEDULE[i];
        const tag = plan.isNew ? 'NEW ' : plan.exclude ? 'OUT ' : '    ';
        console.log(`  ${tag}${String(i + 1).padStart(2)}. ${item.date.padEnd(7)} ${String(item.label).padEnd(17)} ${item.title}  [${item.instructor}]`);
    });

    console.log('\n=== Session rows ===');
    sessionOps.forEach((op) => {
        if (op.kind === 'create') {
            console.log(`  CREATE ${op.key}  ${op.doc.date}  "${op.doc.title}"  scheduled, counts`);
            return;
        }
        const diff = Object.entries(op.set).map(([f, v]) => `${f}: ${JSON.stringify(op.before[f])} -> ${JSON.stringify(v)}`);
        console.log(`  UPDATE ${op.key}\n      ${diff.join('\n      ')}`);
    });

    console.log('\n=== Attendance rows ===');
    attendanceOps.forEach((op) => {
        const parts = Object.entries(op.set).map(([f, v]) => `${f} -> ${v}`);
        if (op.withTopic) parts.push(`sessionTopic -> "${op.title}" (${op.withTopic} rows that carry a topic)`);
        console.log(`  ${op.key}: ${op.rows} rows  ${parts.join(', ')}`);
    });

    if (!apply) {
        console.log('\nDRY RUN. Nothing was written. Re-run with --apply to back up and write.');
        return;
    }

    // Backup first. Nothing is written unless this succeeds.
    const backupDir = path.resolve(__dirname, '../../data/backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `software-schedule-${stamp}.json`);
    const backup = {
        createdAt: new Date(),
        database: db.databaseName,
        siteConfigId: config._id,
        workshop: config.workshop,
        sessions,
        attendance: await attendanceCol.find({ track: TRACK }).toArray(),
        createdSessionKeys: sessionOps.filter((o) => o.kind === 'create').map((o) => o.key)
    };
    fs.writeFileSync(backupPath, EJSON.stringify(backup, null, 1, { relaxed: false }));
    const check = EJSON.parse(fs.readFileSync(backupPath, 'utf8'), { relaxed: false });
    if (check.sessions.length !== sessions.length || check.attendance.length !== backup.attendance.length) {
        throw new Error('Backup did not read back intact; nothing was written.');
    }
    console.log(`\nBackup: ${backupPath}`);
    console.log(`  ${check.sessions.length} sessions, ${check.attendance.length} attendance rows, SiteConfig workshop block`);

    for (const op of attendanceOps) {
        if (Object.keys(op.set).length) {
            const r = await attendanceCol.updateMany(op.match, { $set: { ...op.set, updatedAt: new Date() } });
            console.log(`  attendance ${op.key}: ${r.modifiedCount} rows updated`);
        }
        if (op.withTopic) {
            const r = await attendanceCol.updateMany(
                { ...op.match, sessionTopic: { $nin: ['', null] } },
                { $set: { sessionTopic: op.title } }
            );
            console.log(`  attendance ${op.key}: ${r.modifiedCount} topics updated`);
        }
    }
    for (const op of sessionOps) {
        if (op.kind === 'create') {
            await sessionsCol.insertOne(op.doc);
            console.log(`  session ${op.key}: created`);
        } else {
            await sessionsCol.updateOne({ sessionKey: op.key }, { $set: { ...op.set, updatedAt: new Date() } });
            console.log(`  session ${op.key}: updated`);
        }
    }
    await siteconfigs.updateOne(
        { _id: config._id },
        { $set: { [`workshop.tracks.${TRACK}.schedule`]: newSchedule, lastModified: new Date().toISOString() } }
    );
    console.log('  SiteConfig software schedule: replaced');
    console.log(`\nDone. To undo: node src/scripts/rearrangeSoftwareSchedule.js --revert "${backupPath}"`);
}

async function revert(file) {
    const backup = EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false });
    if (backup.database !== db.databaseName) {
        throw new Error(`Backup is from "${backup.database}", connected to "${db.databaseName}".`);
    }

    // New sessions go only if nobody has been marked into them since.
    const removable = [];
    for (const key of backup.createdSessionKeys) {
        const rows = await attendanceCol.countDocuments({ sessionKey: key });
        if (rows) console.log(`  KEEP ${key}: ${rows} attendance rows now point at it`);
        else removable.push(key);
    }

    // Only the fields --apply changes are put back.
    const sessionFields = ['label', 'title', 'date', 'sessionNumber', 'countsForAttendance'];
    const attFields = ['sessionDate', 'sessionNumber', 'sessionTopic'];
    const liveSessions = new Map((await sessionsCol.find({ track: TRACK }).toArray()).map((s) => [String(s._id), s]));
    const liveAtt = new Map((await attendanceCol.find({ track: TRACK }).toArray()).map((a) => [String(a._id), a]));
    const differs = (a, b, fields) => fields.some((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
    const sessionFixes = backup.sessions.filter((s) => liveSessions.has(String(s._id)) && differs(s, liveSessions.get(String(s._id)), sessionFields));
    const attFixes = backup.attendance.filter((a) => liveAtt.has(String(a._id)) && differs(a, liveAtt.get(String(a._id)), attFields));

    console.log(`Restore: software schedule in SiteConfig, ${sessionFixes.length} sessions, ${attFixes.length} attendance rows; remove ${removable.join(', ') || 'nothing'}`);
    if (!args.includes('--apply')) {
        console.log('DRY RUN. Add --apply to restore.');
        return;
    }

    await siteconfigs.updateOne(
        { _id: backup.siteConfigId },
        { $set: { [`workshop.tracks.${TRACK}.schedule`]: backup.workshop.tracks[TRACK].schedule } }
    );
    for (const s of sessionFixes) {
        await sessionsCol.updateOne({ _id: s._id }, { $set: Object.fromEntries(sessionFields.map((f) => [f, s[f]])) });
    }
    for (const a of attFixes) {
        await attendanceCol.updateOne({ _id: a._id }, { $set: Object.fromEntries(attFields.map((f) => [f, a[f]])) });
    }
    if (removable.length) await sessionsCol.deleteMany({ sessionKey: { $in: removable } });
    console.log('Restored.');
}
