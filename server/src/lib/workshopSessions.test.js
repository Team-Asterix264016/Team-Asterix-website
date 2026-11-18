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

test('weighted totals: 10 full + 4 half sessions on 14/15 Nov make 12 credits', () => {
    const sessions = [
        ...Array.from({ length: 10 }, (_, i) => session('software', i, `2026-10-${String(i + 10).padStart(2, '0')}`)),
        session('software', 10, '2026-11-14'),
        session('software', 11, '2026-11-14'),
        session('software', 12, '2026-11-15'),
        session('software', 13, '2026-11-15')
    ];
    assert.equal(weightedCount(sessions), 12);

    // Present at pre-workshop + 5 full sessions + 2 half sessions (1.0 + 5.0 + 1.0 = 7.0 / 12 = 58%)
    const attendanceRecords = ['s0', 's1', 's2', 's3', 's4', 's5', 's10', 's12'].map((id) => ({ sessionKey: `software|${id}` }));
    const { perTrack } = summarizeAttendance({ sessions, attendanceRecords, tracksEnrolled: ['software'] });
    assert.equal(perTrack.software.totalConducted, 12);
    assert.equal(perTrack.software.totalPresent, 7);
    assert.equal(perTrack.software.attendancePercentage, 58);
    assert.equal(perTrack.software.isEligibleForCertificate, false);

    // With 1 more half session: 7.5 / 12 = 63% -> passes 60% threshold
    const passingRecords = [...attendanceRecords, { sessionKey: 'software|s11' }];
    const { perTrack: passTrack } = summarizeAttendance({ sessions, attendanceRecords: passingRecords, tracksEnrolled: ['software'] });
    assert.equal(passTrack.software.totalPresent, 7.5);
    assert.equal(passTrack.software.attendancePercentage, 63);
    assert.equal(passTrack.software.isEligibleForCertificate, true);
});
