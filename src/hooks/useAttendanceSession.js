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

    // Combo keeps the software schedule on screen purely to pick the date.
    const scheduleList = useMemo(() => {
        return getTrackSchedule(track === 'combo' ? 'software' : track, siteData);
    }, [track, siteData]);

    /* A combo session is one room holding both tracks, so it has no per-track
       session number: the server resolves it by date instead. */
    const sessionId = track === 'combo'
        ? `combo-joint-${sessionDate}`
        : `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;

    // Selected session object from schedule if current number/date matches
    const currentScheduleMatch = useMemo(() => {
        return (
            scheduleList.find((s) => s.sessionNumber === sessionNumber && s.isoDate === sessionDate) ||
            scheduleList.find((s) => s.sessionNumber === sessionNumber) ||
            scheduleList.find((s) => s.isoDate === sessionDate) ||
            null
        );
    }, [scheduleList, sessionNumber, sessionDate]);

    // Track change handler -> auto-pick matching or default session for new track
    const changeTrack = useCallback(
        (newTrack) => {
            setTrackState(newTrack);
            const def = getDefaultSessionForTrack(newTrack === 'combo' ? 'software' : newTrack, siteData);
            setSessionNumberState(def.sessionNumber);
            setSessionDateState(def.isoDate);
            setSessionTopicState(def.title);
        },
        [siteData]
    );

    // Session number change handler -> auto-link date and topic
    const changeSessionNumber = useCallback(
        (newNum) => {
            const num = Math.max(1, parseInt(newNum, 10) || 1);
            setSessionNumberState(num);
            const match = findSessionByNumber(track, num, siteData);
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
            const match = findSessionByDate(track, newDate, siteData);
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
        scheduleList,
        currentScheduleMatch,
        selectScheduleSession
    };
}
