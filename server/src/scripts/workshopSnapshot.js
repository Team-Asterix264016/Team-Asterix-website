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
 * Full copy of the workshop data, and a way back to it.
 *
 *   node src/scripts/workshopSnapshot.js --save
 *       Writes every document of the collections below to
 *       server/data/backups/workshop-snapshot-<time>.json (gitignored: PII).
 *
 *   node src/scripts/workshopSnapshot.js --restore <file>            dry run
 *   node src/scripts/workshopSnapshot.js --restore <file> --apply    restores
 *       Puts the SiteConfig workshop block and the session collection back as
 *       they were, removing sessions created since. Attendance rows created
 *       since are listed, and removed only with --drop-new-attendance, because
 *       those are real check-ins. Rows that existed are restored field for field.
 */

const COLLECTIONS = [
    'siteconfigs',
    'workshopsessions',
    'workshopattendances',
    'workshopregistrations',
    'workshoptasks',
    'workshopresources'
];

const args = process.argv.slice(2);
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set. Add it to server/.env and run again.');
    process.exit(1);
}
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });
await client.connect();
const db = client.db(resolveMongoDbName(uri));
console.log(`Database: ${db.databaseName}`);

try {
    if (args.includes('--save')) await save();
    else if (args.includes('--restore')) await restore(args[args.indexOf('--restore') + 1]);
    else console.log('Pass --save, or --restore <file> [--apply] [--drop-new-attendance].');
} finally {
    await client.close();
}

async function save() {
    const snapshot = { createdAt: new Date(), database: db.databaseName, collections: {} };
    for (const name of COLLECTIONS) {
        snapshot.collections[name] = await db.collection(name).find({}).toArray();
    }
    const dir = path.resolve(__dirname, '../../data/backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `workshop-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, EJSON.stringify(snapshot, null, 1, { relaxed: false }));

    // Read it back before calling it a backup.
    const check = EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false });
    for (const name of COLLECTIONS) {
        const live = snapshot.collections[name].length;
        const saved = check.collections[name].length;
        if (live !== saved) throw new Error(`${name}: ${live} live vs ${saved} saved`);
        console.log(`  ${name.padEnd(22)} ${saved}`);
    }
    console.log(`Saved: ${file}`);
}

async function restore(file) {
    const apply = args.includes('--apply');
    const dropNew = args.includes('--drop-new-attendance');
    const snap = EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false });
    if (snap.database !== db.databaseName) throw new Error(`Snapshot is from "${snap.database}".`);
    const same = (a, b) => EJSON.stringify(a, { relaxed: false }) === EJSON.stringify(b, { relaxed: false });

    // SiteConfig: only the workshop block, so unrelated site edits survive.
    const cfgThen = snap.collections.siteconfigs.find((c) => c.key === 'main');
    const cfgNow = await db.collection('siteconfigs').findOne({ _id: cfgThen._id });
    const cfgChanged = !same(cfgThen.workshop, cfgNow?.workshop);

    const plan = {};
    for (const name of ['workshopsessions', 'workshopattendances']) {
        const then = new Map(snap.collections[name].map((d) => [String(d._id), d]));
        const now = await db.collection(name).find({}).toArray();
        const nowIds = new Set(now.map((d) => String(d._id)));
        plan[name] = {
            changed: now.filter((d) => then.has(String(d._id)) && !same(d, then.get(String(d._id)))).map((d) => then.get(String(d._id))),
            added: now.filter((d) => !then.has(String(d._id))),
            missing: [...then.values()].filter((d) => !nowIds.has(String(d._id)))
        };
    }

    console.log(`SiteConfig workshop block: ${cfgChanged ? 'differs, will be restored' : 'unchanged'}`);
    for (const [name, p] of Object.entries(plan)) {
        console.log(`${name}: ${p.changed.length} changed (restore), ${p.missing.length} missing (re-insert), ${p.added.length} added since`);
    }
    plan.workshopsessions.added.forEach((s) => console.log(`  new session: ${s.sessionKey} ${s.date} "${s.title}"`));
    if (plan.workshopattendances.added.length) {
        const byKey = {};
        plan.workshopattendances.added.forEach((a) => { byKey[a.sessionKey || a.sessionId] = (byKey[a.sessionKey || a.sessionId] || 0) + 1; });
        console.log(`  new attendance rows: ${JSON.stringify(byKey)} -> ${dropNew ? 'will be removed' : 'kept (add --drop-new-attendance to remove)'}`);
    }

    if (!apply) {
        console.log('DRY RUN. Add --apply to restore.');
        return;
    }

    if (cfgChanged) await db.collection('siteconfigs').updateOne({ _id: cfgThen._id }, { $set: { workshop: cfgThen.workshop } });
    for (const name of ['workshopsessions', 'workshopattendances']) {
        const p = plan[name];
        const col = db.collection(name);
        if (name === 'workshopattendances' && p.changed.length) {
            // Through a placeholder first, so restored labels never collide on the unique indexes.
            await col.bulkWrite(p.changed.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { sessionId: `__restore__${d._id}` } } } })));
        }
        if (p.changed.length) await col.bulkWrite(p.changed.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d } })));
        if (p.missing.length) await col.insertMany(p.missing);
        const removeAdded = name === 'workshopsessions' || dropNew;
        if (removeAdded && p.added.length) await col.deleteMany({ _id: { $in: p.added.map((d) => d._id) } });
    }
    console.log('Restored.');
}
