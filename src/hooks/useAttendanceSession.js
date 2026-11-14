import { useState, useCallback, useMemo } from 'react';
import { useWebsiteData } from '../context/WebsiteDataContext';
import {
    getTrackSchedule,
    findSessionByNumber,
    findSessionByDate,
    getDefaultSessionForTrack
} from '../utils/attendanceSessionUtils';

export function useAttendanceSession(initialTrack = 'software') {
    const { siteData } = useWebsiteData();

    // Initial session lookup
    const defaultSession = useMemo(() => {
        return getDefaultSessionForTrack(initialTrack, siteData);
    }, [initialTrack, siteData]);

    const [track, setTrackState] = useState(initialTrack);
    const [sessionNumber, setSessionNumberState] = useState(defaultSession.sessionNumber);
    const [sessionDate, setSessionDateState] = useState(defaultSession.isoDate);
    const [sessionTopic, setSessionTopicState] = useState(defaultSession.title);
    /* The schedule entry picked from the dropdown. Two sessions can share a
       date (and new ones share number 0), so the number and date alone cannot
       say which one is meant; the entry's id can. */
    const [selectedId, setSelectedId] = useState(defaultSession.id || '');

    // Combo keeps the software schedule on screen purely to pick the date.
    const scheduleTrack = track === 'combo' ? 'software' : track;
    const scheduleList = useMemo(() => {
        return getTrackSchedule(scheduleTrack, siteData);
    }, [scheduleTrack, siteData]);

    /* A combo session is one room holding both tracks, so it has no per-track
       session number: the server resolves it by date instead. */
    const sessionId =
        track === 'combo'
            ? `combo-joint-${sessionDate}`
            : `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;

    /* Selected session object from the schedule. The picked entry wins while
       the number and date still match it; otherwise a match is accepted only
       when exactly one entry fits, so an ambiguous one is never guessed at. */
    const currentScheduleMatch = useMemo(() => {
        const picked = scheduleList.find((s) => s.id === selectedId);
        if (picked && picked.sessionNumber === sessionNumber && picked.isoDate === sessionDate) return picked;
        const only = (list) => (list.length === 1 ? list[0] : null);
        return (
            only(
                scheduleList.filter((s) => s.sessionNumber === sessionNumber && s.isoDate === sessionDate)
            ) ||
            only(scheduleList.filter((s) => s.sessionNumber === sessionNumber)) ||
            only(scheduleList.filter((s) => s.isoDate === sessionDate)) ||
            null
        );
    }, [scheduleList, selectedId, sessionNumber, sessionDate]);

    /* The picked session's key. Every screen sends it with its requests so the
       server lists, marks and issues QR codes for that one session. Combo sends
       the software half; the server finds its powertrain partner. */
    const sessionKey = currentScheduleMatch ? `${scheduleTrack}|${currentScheduleMatch.id}` : '';

    // Track change handler -> auto-pick matching or default session for new track
    const changeTrack = useCallback(
        (newTrack) => {
            setTrackState(newTrack);
            const def = getDefaultSessionForTrack(newTrack === 'combo' ? 'software' : newTrack, siteData);
            setSessionNumberState(def.sessionNumber);
            setSessionDateState(def.isoDate);
            setSessionTopicState(def.title);
            setSelectedId(def.id || '');
        },
        [siteData]
    );

    // Session number change handler -> auto-link date and topic
    const changeSessionNumber = useCallback(
        (newNum) => {
            const num = Math.max(1, parseInt(newNum, 10) || 1);
            setSessionNumberState(num);
            const match = findSessionByNumber(track, num, siteData);
            setSelectedId(match ? match.id : '');
            if (match) {
                if (match.isoDate) setSessionDateState(match.isoDate);
                if (match.title) setSessionTopicState(match.title);
            }
        },
        [track, siteData]
    );

    // Session date change handler -> auto-link session number and topic
    const changeSessionDate = useCallback(
        (newDate) => {
            setSessionDateState(newDate);
            // Two sessions on that date: leave the choice to the dropdown.
            const onDate = getTrackSchedule(track, siteData).filter((s) => s.isoDate === newDate);
            const match = onDate.length > 1 ? null : findSessionByDate(track, newDate, siteData);
            setSelectedId(match ? match.id : '');
            if (match) {
                setSessionNumberState(match.sessionNumber);
                if (match.title) setSessionTopicState(match.title);
            }
        },
        [track, siteData]
    );

    // Select explicit session item handler
    const selectScheduleSession = useCallback((sessionItem) => {
        if (!sessionItem) return;
        setSelectedId(sessionItem.id);
        setSessionNumberState(sessionItem.sessionNumber);
        if (sessionItem.isoDate) setSessionDateState(sessionItem.isoDate);
        if (sessionItem.title) setSessionTopicState(sessionItem.title);
    }, []);

    return {
        track,
        setTrack: changeTrack,
        sessionNumber,
        setSessionNumber: changeSessionNumber,
        sessionDate,
        setSessionDate: changeSessionDate,
        sessionTopic,
        setSessionTopic: setSessionTopicState,
        sessionId,
        sessionKey,
        scheduleList,
        currentScheduleMatch,
        selectScheduleSession
    };
}
