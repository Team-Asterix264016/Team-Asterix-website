import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAttendance, sessionWeight, weightedCount, buildSessionIndex, resolveSessionKey } from './workshopSessions.js';

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

test('resolveSessionKey maps custom Nov 14/15 session keys to canonical keys without loss', () => {
    const sessions = [
        { sessionKey: 'software|sch-sw-ind5a', scheduleId: 'sch-sw-ind5a', legacySessionIds: ['sch-sw-xmwg3ckit'] },
        { sessionKey: 'software|sch-sw-ind5b', scheduleId: 'sch-sw-ind5b', legacySessionIds: ['sch-sw-xmwg8kfmr'] },
        { sessionKey: 'software|sch-sw-ind6a', scheduleId: 'sch-sw-ind6a', legacySessionIds: ['sch-sw-xmwhf0ba1'] },
        { sessionKey: 'software|sch-sw-ind6b', scheduleId: 'sch-sw-ind6b', legacySessionIds: ['sch-sw-xmwhobsmk'] },
        { sessionKey: 'powertrain|sch-pt-ind5a', scheduleId: 'sch-pt-ind5a', legacySessionIds: ['sch-pt-xmwg3ckit'] }
    ];
    const index = buildSessionIndex(sessions);

    // Direct key alias
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwg3ckit' }, index), 'software|sch-sw-ind5a');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwg8kfmr' }, index), 'software|sch-sw-ind5b');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwhf0ba1' }, index), 'software|sch-sw-ind6a');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwhobsmk' }, index), 'software|sch-sw-ind6b');

    // Powertrain combo key alias
    assert.equal(resolveSessionKey({ sessionKey: 'powertrain|sch-pt-xmwg3ckit' }, index), 'powertrain|sch-pt-ind5a');

    // Legacy sessionId substring
    assert.equal(resolveSessionKey({ sessionId: 'software-sch-sw-xmwg3ckit-2026-11-14' }, index), 'software|sch-sw-ind5a');
});

test('powertrain weighted totals: 16 full + 4 half sessions on 14/15 Nov make 18 credits', () => {
    const sessions = [
        ...Array.from({ length: 16 }, (_, i) => session('powertrain', i, `2026-10-${String(i + 10).padStart(2, '0')}`)),
        session('powertrain', 16, '2026-11-14'),
        session('powertrain', 17, '2026-11-14'),
        session('powertrain', 18, '2026-11-15'),
        session('powertrain', 19, '2026-11-15')
    ];
    assert.equal(weightedCount(sessions), 18);

    // Present at 10 full sessions + 1 half session: 10.5 / 18 = 58% (not eligible)
    const records = [
        ...Array.from({ length: 10 }, (_, i) => ({ sessionKey: `powertrain|s${i}` })),
        { sessionKey: 'powertrain|s16' }
    ];
    const { perTrack } = summarizeAttendance({ sessions, attendanceRecords: records, tracksEnrolled: ['powertrain'] });
    assert.equal(perTrack.powertrain.totalConducted, 18);
    assert.equal(perTrack.powertrain.totalPresent, 10.5);
    assert.equal(perTrack.powertrain.attendancePercentage, 58);
    assert.equal(perTrack.powertrain.isEligibleForCertificate, false);

    // With 1 more half session: 11.0 / 18 = 61% -> passes 60% threshold
    const passingRecords = [...records, { sessionKey: 'powertrain|s17' }];
    const { perTrack: passTrack } = summarizeAttendance({ sessions, attendanceRecords: passingRecords, tracksEnrolled: ['powertrain'] });
    assert.equal(passTrack.powertrain.totalPresent, 11);
    assert.equal(passTrack.powertrain.attendancePercentage, 61);
    assert.equal(passTrack.powertrain.isEligibleForCertificate, true);
});
