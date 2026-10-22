/*
 * Deletes every workshop attendance record.
 *
 * Attendance is the only record of who physically turned up, so this refuses
 * to run without the confirmation flag and copies every record into the
 * recycle bin (models/DeletedRecord.js) before deleting.
 *
 * Usage:  node server/src/scripts/clearAttendance.js --yes-delete-all-attendance
 */
import '../loadEnv.js';
import { connectMongoDB } from '../db/mongodb.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import { archiveDocuments } from '../lib/recycleBin.js';

const CONFIRM_FLAG = '--yes-delete-all-attendance';

async function clearAttendance() {
    try {
        await connectMongoDB();

        const total = await WorkshopAttendance.countDocuments();
        if (total === 0) {
            console.log('No attendance records to delete. Nothing done.');
            process.exit(0);
        }

        if (!process.argv.includes(CONFIRM_FLAG)) {
            console.error(`Refusing to run. This deletes all ${total} attendance record(s).`);
            console.error(`Re-run with ${CONFIRM_FLAG} if that is genuinely what you want.`);
            process.exit(1);
        }

        const doomed = await WorkshopAttendance.find({}).lean();
        await archiveDocuments('WorkshopAttendance', doomed, {
            deletedBy: 'clearAttendance.js',
            reason: 'manual script run'
        });

        const result = await WorkshopAttendance.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} attendance activity record(s) from DB.`);
        console.log('Recover them with: node server/src/scripts/restoreDeleted.js WorkshopAttendance --apply');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing attendance:', err);
        process.exit(1);
    }
}

clearAttendance();
