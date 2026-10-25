import mongoose from 'mongoose';

/* One row per session on a track's schedule. This is the authority on what was
   actually held: the attendance percentage divides by sessions marked
   "conducted" here, never by whatever happens to exist in WorkshopAttendance.
   Without it a session nobody scanned into silently vanishes from the
   denominator and everyone who skipped it gets the session for free. */
const WorkshopSessionSchema = new mongoose.Schema({
    // `${track}|${scheduleId}`, e.g. "software|sch-sw-3". Stable across date edits.
    sessionKey: { type: String, required: true, unique: true, trim: true },
    track: {
        type: String,
        required: true,
        enum: ['software', 'powertrain'],
        lowercase: true,
        trim: true
    },
    // The id of the matching entry in the track's schedule (config or SiteConfig override).
    scheduleId: { type: String, required: true, trim: true },
    // Only set for plainly numbered sessions; expert and catch-up entries have none.
    sessionNumber: { type: Number, default: null },
    label: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    // YYYY-MM-DD in IST, resolved from the schedule's "13 Oct" via sessionIsoDate().
    date: { type: String, default: null, trim: true },
    type: { type: String, default: 'lecture', trim: true },
    // Catch-ups and holidays are shown on the timeline but never counted either way.
    countsForAttendance: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['scheduled', 'conducted', 'cancelled'],
        default: 'scheduled'
    },
    // Attendance is accepted only between these two, so a leaked QR link cannot
    // write a record days before or after the session actually ran.
    openedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    openedBy: { type: String, default: '', trim: true },
    closedBy: { type: String, default: '', trim: true },
    // sessionId strings written by the old check-in routes, e.g.
    // "software-s03-2026-10-15". Kept so existing attendance still resolves here.
    legacySessionIds: { type: [String], default: [] },
    notes: { type: String, default: '', trim: true }
}, {
    timestamps: true
});

WorkshopSessionSchema.index({ track: 1, date: 1 });
WorkshopSessionSchema.index({ status: 1, countsForAttendance: 1 });
WorkshopSessionSchema.index({ legacySessionIds: 1 });

export default mongoose.models.WorkshopSession
    || mongoose.model('WorkshopSession', WorkshopSessionSchema);
