import mongoose from 'mongoose';

/* A make-up task for one session a candidate missed. Approving it credits that
   exact session in WorkshopAttendance, so the attendance percentage recovers
   through the existing denominator instead of a second, parallel score.

   Two limits keep attendance meaningful: a candidate may recover at most
   TASK_CREDIT_CAP sessions per track, and a credit is only granted while they
   are still below the certificate threshold, so the task route leads to a
   certificate and never past it. */
const WorkshopTaskSchema = new mongoose.Schema({
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopRegistration',
        required: true,
        index: true
    },
    rollNo: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },

    track: {
        type: String,
        required: true,
        enum: ['software', 'powertrain'],
        lowercase: true,
        trim: true
    },
    // `${track}|${scheduleId}` of the missed session this task makes up.
    sessionKey: { type: String, required: true, trim: true },
    sessionTitle: { type: String, default: '', trim: true },
    sessionDate: { type: String, default: '', trim: true },

    title: { type: String, required: true, trim: true },
    brief: { type: String, default: '', trim: true, maxlength: 4000 },
    /* Derived from the roll number so two candidates making up the same session
       get different numbers to work with. A forwarded Drive link is then the
       wrong answer rather than a free pass. */
    individualSeed: { type: String, default: '', trim: true },
    dueAt: { type: Date, default: null },

    status: {
        type: String,
        enum: ['assigned', 'submitted', 'approved', 'rejected'],
        default: 'assigned'
    },
    driveLink: { type: String, default: '', trim: true },
    submissionNote: { type: String, default: '', trim: true, maxlength: 3000 },
    submittedAt: { type: Date, default: null },

    reviewedBy: { type: String, default: '', trim: true },
    reviewNote: { type: String, default: '', trim: true, maxlength: 2000 },
    reviewedAt: { type: Date, default: null },
    // The WorkshopAttendance row this task created when it was approved.
    creditedAttendanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopAttendance',
        default: null
    },

    assignedBy: { type: String, default: '', trim: true }
}, {
    timestamps: true
});

// One task per candidate per missed session.
WorkshopTaskSchema.index({ registrationId: 1, sessionKey: 1 }, { unique: true });
WorkshopTaskSchema.index({ status: 1, track: 1 });

export default mongoose.models.WorkshopTask
    || mongoose.model('WorkshopTask', WorkshopTaskSchema);
