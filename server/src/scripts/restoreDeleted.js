/*
 * Puts documents back from the recycle bin (models/DeletedRecord.js).
 *
 * Insert-only: a document whose _id already exists again is skipped, so a
 * restore can never overwrite newer data. Restored entries are stamped with
 * restoredAt and kept, so the audit trail survives the recovery.
 *
 * Usage:
 *   node server/src/scripts/restoreDeleted.js                       # list what is in the bin
 *   node server/src/scripts/restoreDeleted.js WorkshopRegistration  # dry run for one collection
 *   node server/src/scripts/restoreDeleted.js WorkshopRegistration --apply
 *   ... --since=2026-10-01            # only entries deleted on or after this date
 *   ... --all                         # every collection in the bin
 */
import '../loadEnv.js';
import mongoose from 'mongoose';
import { connectMongoDB } from '../db/mongodb.js';
import DeletedRecord from '../models/DeletedRecord.js';

// Imported for their side effect: registering the models a restore can target.
import '../models/WorkshopRegistration.js';
import '../models/WorkshopAttendance.js';
import '../models/TeamMember.js';
import '../models/GalleryItem.js';
import '../models/TeamUpdate.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const all = args.includes('--all');
const sinceArg = args.find(a => a.startsWith('--since='))?.split('=')[1];
const target = args.find(a => !a.startsWith('--'));

async function run() {
    await connectMongoDB();

    const filter = { restoredAt: null };
    if (sinceArg) {
        const since = new Date(sinceArg);
        if (Number.isNaN(since.getTime())) {
            console.error(`--since is not a date I can read: "${sinceArg}"`);
            process.exit(1);
        }
        filter.createdAt = { $gte: since };
    }

    if (!target && !all) {
        const summary = await DeletedRecord.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$collectionName',
                    entries: { $sum: 1 },
                    oldest: { $min: '$createdAt' },
                    newest: { $max: '$createdAt' },
                    deletedBy: { $addToSet: '$deletedBy' }
                }
            },
            { $sort: { entries: -1 } }
        ]);

        if (summary.length === 0) {
            console.log('The recycle bin holds nothing that has not already been restored.');
        } else {
            console.log('Recoverable documents in the recycle bin:');
            console.table(summary.map(s => ({
                collection: s._id,
                entries: s.entries,
                oldest: s.oldest?.toISOString(),
                newest: s.newest?.toISOString(),
                deletedBy: s.deletedBy.join(', ')
            })));
            console.log('\nRestore one with: node server/src/scripts/restoreDeleted.js <collection> --apply');
        }
        await mongoose.disconnect();
        return;
    }

    if (target) filter.collectionName = target;

    const entries = await DeletedRecord.find(filter).sort({ createdAt: 1 }).lean();
    if (entries.length === 0) {
        console.log(`Nothing to restore for ${target || 'any collection'}.`);
        await mongoose.disconnect();
        return;
    }

    const byCollection = new Map();
    for (const entry of entries) {
        if (!byCollection.has(entry.collectionName)) byCollection.set(entry.collectionName, []);
        byCollection.get(entry.collectionName).push(entry);
    }

    for (const [collectionName, rows] of byCollection) {
        let Model;
        try {
            Model = mongoose.model(collectionName);
        } catch {
            console.warn(`! No model named "${collectionName}" is registered. Skipping its ${rows.length} entry/entries.`);
            continue;
        }

        const ids = rows.map(r => r.document?._id).filter(Boolean);
        const present = new Set(
            (await Model.find({ _id: { $in: ids } }).select('_id').lean()).map(d => String(d._id))
        );
        const toInsert = rows.filter(r => !present.has(String(r.document?._id)));

        console.log(`${collectionName}: ${rows.length} in the bin, ${rows.length - toInsert.length} already back, ${toInsert.length} to insert.`);

        if (!apply) continue;
        if (toInsert.length === 0) continue;

        const result = await Model.collection.insertMany(toInsert.map(r => r.document), { ordered: false });
        await DeletedRecord.updateMany(
            { _id: { $in: toInsert.map(r => r._id) } },
            { $set: { restoredAt: new Date() } }
        );
        console.log(`✓ Restored ${result.insertedCount} ${collectionName} document(s).`);
    }

    if (!apply) console.log('\nDry run. Re-run with --apply to insert.');
    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Restore failed:', err);
    process.exit(1);
});
