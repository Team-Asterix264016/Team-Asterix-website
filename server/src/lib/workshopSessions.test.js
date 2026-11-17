import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAttendance, sessionWeight, weightedCount } from './workshopSessions.js';

const session = (track, n, date) => ({
    sessionKey: `${track}|s${n}`,
    track,
    date,
    countsForAttendance: true,
    status: 'conducted'
});

test('sessions on 14 and 15 Nov count as half a session', () => {
    assert.equal(sessionWeight({ date: '2026-11-14' }), 0.5);
    assert.equal(sessionWeight({ date: '2026-11-15' }), 0.5);
    assert.equal(sessionWeight({ date: '2026-11-13' }), 1);
    assert.equal(sessionWeight({ date: null }), 1);
});

test('weighted totals: 11 full + 2 half sessions make 12', () => {
    const sessions = [
        ...Array.from({ length: 11 }, (_, i) => session('software', i, `2026-10-${String(i + 10).padStart(2, '0')}`)),
        session('software', 11, '2026-11-14'),
        session('software', 12, '2026-11-15')
    ];
    assert.equal(weightedCount(sessions), 12);

    // Present at 6 full sessions and one half session: 6.5 / 12 = 54%.
    const attendanceRecords = ['s0', 's1', 's2', 's3', 's4', 's5', 's11'].map((id) => ({ sessionKey: `software|${id}` }));
    const { perTrack } = summarizeAttendance({ sessions, attendanceRecords, tracksEnrolled: ['software'] });
    assert.equal(perTrack.software.totalConducted, 12);
    assert.equal(perTrack.software.totalPresent, 6.5);
    assert.equal(perTrack.software.attendancePercentage, 54);
    assert.equal(perTrack.software.isEligibleForCertificate, false);
});
