import { WORKSHOP_TRACKS } from '../../server/src/config/workshopPackages.js';
import { sessionIsoDate } from '../../server/src/config/sessionDates.js';

/**
 * Returns parsed schedule sessions for a given track, including numeric session numbers and ISO dates (YYYY-MM-DD).
 */
export function getTrackSchedule(trackId = 'software', siteData = null) {
    const trackObj = {
        ...WORKSHOP_TRACKS[trackId],
        ...siteData?.workshop?.tracks?.[trackId]
    };
    if (!trackObj || !Array.isArray(trackObj.schedule)) return [];

    let fallbackNum = 1;
    return trackObj.schedule
        .filter((item) => item.type !== 'holiday')
        .map((item) => {
            const numMatch = item.label?.match(/Session\s*(\d+)/i);
            const isPre = /pre-workshop/i.test(item.label || item.title || '');
            let sessionNumber;

            if (isPre) {
                sessionNumber = 0;
            } else if (numMatch) {
                sessionNumber = parseInt(numMatch[1], 10);
            } else {
                sessionNumber = fallbackNum++;
            }

            const isoDate = sessionIsoDate(item.date, trackObj) || '';

            return {
                id: item.id,
                label: item.label || `Session ${sessionNumber}`,
                dateStr: item.date,
                isoDate,
                title: item.title || '',
                type: item.type || 'lecture',
                sessionNumber,
                trackId
            };
        });
}

/**
 * Find a scheduled session by numeric session number for a track.
 */
export function findSessionByNumber(trackId, sessionNum, siteData = null) {
    const schedule = getTrackSchedule(trackId, siteData);
    const num = parseInt(sessionNum, 10);
    return schedule.find((s) => s.sessionNumber === num) || null;
}

/**
 * Find a scheduled session by ISO date (YYYY-MM-DD) for a track.
 */
export function findSessionByDate(trackId, isoDate, siteData = null) {
    const schedule = getTrackSchedule(trackId, siteData);
    if (!isoDate) return null;
    return schedule.find((s) => s.isoDate === isoDate) || null;
}

/**
 * Returns default initial session (today's session if scheduled today, otherwise Session 1).
 */
export function getDefaultSessionForTrack(trackId = 'software', siteData = null) {
    const schedule = getTrackSchedule(trackId, siteData);
    if (!schedule.length) {
        return {
            sessionNumber: 1,
            isoDate: new Date().toISOString().slice(0, 10),
            title: ''
        };
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayMatch = schedule.find((s) => s.isoDate === todayIso);
    if (todayMatch) return todayMatch;

    const session1 = schedule.find((s) => s.sessionNumber === 1);
    return session1 || schedule[0];
}
