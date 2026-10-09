import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopProjectSubmission from '../models/WorkshopProjectSubmission.js';
import QuizSubmission from '../models/QuizSubmission.js';

// Registered numbers look like 26M125, but older/other formats carry separators too.
export const ROLL_NO_RE = /^[A-Z0-9][A-Z0-9._/-]{1,39}$/;

export function normalizeRollNo(value) {
    return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Pushes a registration's corrected identity into every collection that keeps a
 * denormalized copy of it. Attendance and project submissions are matched on
 * registrationId — the only link that survives a roll number correction — so a
 * participant keeps their attendance history when their roll number is fixed.
 *
 * Quiz submissions are keyed on email, and {quizId, userEmail} is unique, so an
 * email change is applied per submission and skipped where it would collide with
 * a submission already stored under the new email.
 */
export async function syncParticipantIdentity(registration, { previousEmail } = {}) {
    const identity = {
        rollNo: registration.rollNo,
        name: registration.name,
        email: registration.email,
        department: registration.department,
        year: registration.year
    };

    const result = { attendance: 0, projectSubmissions: 0, quizSubmissions: 0, quizSkipped: 0 };

    const attendance = await WorkshopAttendance.updateMany(
        { registrationId: registration._id },
        { $set: identity }
    );
    result.attendance = attendance.modifiedCount || 0;

    const submissions = await WorkshopProjectSubmission.updateMany(
        { registrationId: registration._id },
        { $set: { ...identity, phone: registration.phone } }
    );
    result.projectSubmissions = submissions.modifiedCount || 0;

    const oldEmail = String(previousEmail || '').trim().toLowerCase();
    const quizEmails = [registration.email];
    if (oldEmail && oldEmail !== registration.email) quizEmails.push(oldEmail);

    const quizRows = await QuizSubmission.find({ userEmail: { $in: quizEmails } }, { quizId: 1, userEmail: 1 }).lean();
    for (const row of quizRows) {
        const update = { rollNo: registration.rollNo, userName: registration.name };
        if (row.userEmail !== registration.email) {
            const taken = await QuizSubmission.exists({
                _id: { $ne: row._id },
                quizId: row.quizId,
                userEmail: registration.email
            });
            if (taken) {
                // A submission for this quiz already exists under the new email; leave the
                // older one addressed to the old email rather than breaking the unique index.
                result.quizSkipped += 1;
                await QuizSubmission.updateOne({ _id: row._id }, { $set: update });
                continue;
            }
            update.userEmail = registration.email;
        }
        await QuizSubmission.updateOne({ _id: row._id }, { $set: update });
        result.quizSubmissions += 1;
    }

    return result;
}
