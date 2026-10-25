import SiteConfig from '../models/SiteConfig.js';
import WorkshopSession from '../models/WorkshopSession.js';
import { WORKSHOP_TRACKS } from '../config/workshopPackages.js';
import { sessionIsoDate } from '../config/sessionDates.js';

/* Certificate rule: a candidate must reach this share of the sessions actually
   conducted on a track. Combo candidates are judged per track and earn a
   certificate for each track they clear on its own. */
export const CERTIFICATE_THRESHOLD = 65;

/* The most sessions a candidate may recover per track by completing make-up
   tasks. Beyond this the gap is a conversation with the workshop team, not a
   form. Credits also stop at the threshold itself, so the task route earns a
   certificate and never carries anyone past one. */
export const TASK_CREDIT_CAP = 3;

/* Catch-ups are optional knowledge-sharing sessions and holidays are not
   sessions at all, so neither enters the denominator. Everything else does. */
const UNCOUNTED_TYPES = new Set(['catchup', 'holiday']);

export function isCountedType(type) {
    return !UNCOUNTED_TYPES.has(String(type || 'lecture').toLowerCase().trim());
}

export function sessionKeyOf(track, scheduleId) {
    return `${track}|${scheduleId}`;
}

/* The schedule admins edit in Workshop Schedule lives in SiteConfig; the config
   file is the fallback. Both the seeder and the participant profile read the
   merged result so they can never disagree about what is on the timetable. */
export async function loadMergedTracks(trackIds) {
    const wanted = Array.isArray(trackIds) && trackIds.length > 0
        ? trackIds
        : Object.keys(WORKSHOP_TRACKS);
    const siteConfig = await SiteConfig.findOne({ key: 'main' }, { workshop: 1 }).lean();
    const editedTracks = siteConfig?.workshop?.tracks || {};
    const tracks = {};
    wanted.forEach((trackId) => {
        if (WORKSHOP_TRACKS[trackId]) {
            tracks[trackId] = { ...WORKSHOP_TRACKS[trackId], ...editedTracks[trackId] };
        }
    });
    return tracks;
}

/* Flattens the merged schedules into the shape WorkshopSession stores. Dates
   that the schedule leaves unparseable come through as null rather than today,
   so a typo never silently lands a session on the wrong day. */
export function buildSessionSeeds(tracks) {
    const seeds = [];
    Object.entries(tracks).forEach(([trackId, trackConfig]) => {
        if (!Array.isArray(trackConfig.schedule)) return;
        trackConfig.schedule.forEach((item) => {
            const numeric = String(item.id || '').match(/-(\d+)$/);
            seeds.push({
                sessionKey: sessionKeyOf(trackId, item.id),
                track: trackId,
                scheduleId: item.id,
                sessionNumber: numeric ? parseInt(numeric[1], 10) : null,
                label: item.label || '',
                title: item.title || '',
                date: sessionIsoDate(item.date, trackConfig),
                type: item.type || 'lecture',
                countsForAttendance: isCountedType(item.type)
            });
        });
    });
    return seeds;
}

/* Resolves one attendance record to a session. New records carry sessionKey
   outright. Older ones predate the collection, so they fall back to the
   legacy sessionId string and finally to track + date, which is how the
   profile used to match before sessions existed. */
export function resolveSessionKey(att, index) {
    if (att.sessionKey && index.byKey.has(att.sessionKey)) return att.sessionKey;
    if (att.sessionId && index.byLegacyId.has(att.sessionId)) return index.byLegacyId.get(att.sessionId);
    const dateKey = `${att.track}|${att.sessionDate}`;
    if (index.byTrackDate.has(dateKey)) return index.byTrackDate.get(dateKey);
    return null;
}

/* Lookup tables for resolveSessionKey. A track+date pair shared by two sessions
   is dropped from byTrackDate rather than guessed at, so an ambiguous match
   surfaces as unresolved instead of being attributed to the wrong session. */
export function buildSessionIndex(sessions) {
    const byKey = new Map();
    const byLegacyId = new Map();
    const trackDateHits = new Map();

    sessions.forEach((session) => {
        byKey.set(session.sessionKey, session);
        (session.legacySessionIds || []).forEach((legacyId) => {
            byLegacyId.set(legacyId, session.sessionKey);
        });
        if (session.date) {
            const dateKey = `${session.track}|${session.date}`;
            trackDateHits.set(dateKey, [...(trackDateHits.get(dateKey) || []), session.sessionKey]);
        }
    });

    const byTrackDate = new Map();
    trackDateHits.forEach((keys, dateKey) => {
        if (keys.length === 1) byTrackDate.set(dateKey, keys[0]);
    });

    return { byKey, byLegacyId, byTrackDate };
}

/* Per-track attendance, counted against sessions that were actually conducted.
   A candidate with no conducted sessions yet has no percentage to speak of, so
   eligibility stays false until there is something to measure. */
export function summarizeAttendance({ sessions, attendanceRecords, tracksEnrolled }) {
    const index = buildSessionIndex(sessions);

    const presentKeys = new Set();
    const unresolved = [];
    attendanceRecords.forEach((att) => {
        const key = resolveSessionKey(att, index);
        if (key) presentKeys.add(key);
        else unresolved.push(att);
    });

    const perTrack = {};
    tracksEnrolled.forEach((trackId) => {
        const counted = sessions.filter((session) => session.track === trackId
            && session.countsForAttendance
            && session.status === 'conducted');
        const present = counted.filter((session) => presentKeys.has(session.sessionKey)).length;
        const totalConducted = counted.length;
        const percentage = totalConducted > 0 ? Math.round((present / totalConducted) * 100) : 0;
        perTrack[trackId] = {
            track: trackId,
            totalConducted,
            totalPresent: present,
            attendancePercentage: percentage,
            isEligibleForCertificate: totalConducted > 0 && percentage >= CERTIFICATE_THRESHOLD
        };
    });

    return { perTrack, presentKeys, unresolved };
}
