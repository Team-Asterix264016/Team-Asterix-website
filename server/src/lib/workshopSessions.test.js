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

test('resolveSessionKey maps custom Nov 14/15 and Oct 24 session keys to canonical keys without loss', () => {
    const sessions = [
        { sessionKey: 'software|sch-sw-ind2', scheduleId: 'sch-sw-ind2', legacySessionIds: ['sch-sw-ind2'] },
        { sessionKey: 'powertrain|sch-pt-ind2', scheduleId: 'sch-pt-ind2', legacySessionIds: ['sch-pt-e2'] },
        { sessionKey: 'software|sch-sw-ind5a', scheduleId: 'sch-sw-ind5a', legacySessionIds: ['sch-sw-xmwg3ckit'] },
        { sessionKey: 'software|sch-sw-ind5b', scheduleId: 'sch-sw-ind5b', legacySessionIds: ['sch-sw-xmwg8kfmr'] },
        { sessionKey: 'software|sch-sw-ind6a', scheduleId: 'sch-sw-ind6a', legacySessionIds: ['sch-sw-xmwhf0ba1'] },
        { sessionKey: 'software|sch-sw-ind6b', scheduleId: 'sch-sw-ind6b', legacySessionIds: ['sch-sw-xmwhobsmk'] },
        { sessionKey: 'powertrain|sch-pt-ind5a', scheduleId: 'sch-pt-ind5a', legacySessionIds: ['sch-pt-xmwg3ckit'] }
    ];
    const index = buildSessionIndex(sessions);

    // Direct key alias
    assert.equal(resolveSessionKey({ sessionKey: 'powertrain|sch-pt-e2' }, index), 'powertrain|sch-pt-ind2');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwg3ckit' }, index), 'software|sch-sw-ind5a');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwg8kfmr' }, index), 'software|sch-sw-ind5b');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwhf0ba1' }, index), 'software|sch-sw-ind6a');
    assert.equal(resolveSessionKey({ sessionKey: 'software|sch-sw-xmwhobsmk' }, index), 'software|sch-sw-ind6b');

    // Powertrain combo key alias
    assert.equal(resolveSessionKey({ sessionKey: 'powertrain|sch-pt-xmwg3ckit' }, index), 'powertrain|sch-pt-ind5a');

    // Legacy sessionId substring
    assert.equal(resolveSessionKey({ sessionId: 'powertrain-sch-pt-e2-2026-10-24' }, index), 'powertrain|sch-pt-ind2');
    assert.equal(resolveSessionKey({ sessionId: 'software-sch-sw-xmwg3ckit-2026-11-14' }, index), 'software|sch-sw-ind5a');
});

test('powertrain weighted totals: 13 full + 4 half sessions on 14/15 Nov make 15 credits', () => {
    const sessions = [
        ...Array.from({ length: 13 }, (_, i) => session('powertrain', i, `2026-10-${String(i + 10).padStart(2, '0')}`)),
        session('powertrain', 13, '2026-11-14'),
        session('powertrain', 14, '2026-11-14'),
        session('powertrain', 15, '2026-11-15'),
        session('powertrain', 16, '2026-11-15')
    ];
    assert.equal(weightedCount(sessions), 15);

    // Present at 8 full sessions + 1 half session: 8.5 / 15 = 56.7% -> 57% (not eligible)
    const records = [
        ...Array.from({ length: 8 }, (_, i) => ({ sessionKey: `powertrain|s${i}` })),
        { sessionKey: 'powertrain|s13' }
    ];
    const { perTrack } = summarizeAttendance({ sessions, attendanceRecords: records, tracksEnrolled: ['powertrain'] });
    assert.equal(perTrack.powertrain.totalConducted, 15);
    assert.equal(perTrack.powertrain.totalPresent, 8.5);
    assert.equal(perTrack.powertrain.attendancePercentage, 57);
    assert.equal(perTrack.powertrain.isEligibleForCertificate, false);

    // With 1 more half session: 9.0 / 15 = 60% -> passes 60% threshold
    const passingRecords = [...records, { sessionKey: 'powertrain|s14' }];
    const { perTrack: passTrack } = summarizeAttendance({ sessions, attendanceRecords: passingRecords, tracksEnrolled: ['powertrain'] });
    assert.equal(passTrack.powertrain.totalPresent, 9);
    assert.equal(passTrack.powertrain.attendancePercentage, 60);
    assert.equal(passTrack.powertrain.isEligibleForCertificate, true);
});

test('jointKey links attendance between software and powertrain for common industry sessions', () => {
    const sessions = [
        // 24 Oct Bosch session
        { sessionKey: 'software|sch-sw-ind2', track: 'software', date: '2026-10-24', jointKey: 'jt-ind2', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'powertrain|sch-pt-ind2', track: 'powertrain', date: '2026-10-24', jointKey: 'jt-ind2', countsForAttendance: true, status: 'conducted' },
        // 14 Nov Dr. Senthilvel sessions
        { sessionKey: 'software|sch-sw-ind5a', track: 'software', date: '2026-11-14', jointKey: 'jt-ind5a', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'powertrain|sch-pt-ind5a', track: 'powertrain', date: '2026-11-14', jointKey: 'jt-ind5a', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'software|sch-sw-ind5b', track: 'software', date: '2026-11-14', jointKey: 'jt-ind5b', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'powertrain|sch-pt-ind5b', track: 'powertrain', date: '2026-11-14', jointKey: 'jt-ind5b', countsForAttendance: true, status: 'conducted' },
        // 15 Nov Dr. Senthilvel sessions
        { sessionKey: 'software|sch-sw-ind6a', track: 'software', date: '2026-11-15', jointKey: 'jt-ind6a', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'powertrain|sch-pt-ind6a', track: 'powertrain', date: '2026-11-15', jointKey: 'jt-ind6a', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'software|sch-sw-ind6b', track: 'software', date: '2026-11-15', jointKey: 'jt-ind6b', countsForAttendance: true, status: 'conducted' },
        { sessionKey: 'powertrain|sch-pt-ind6b', track: 'powertrain', date: '2026-11-15', jointKey: 'jt-ind6b', countsForAttendance: true, status: 'conducted' }
    ];

    // Candidate has only software attendance scans for the 3 joint sessions
    const softwareOnlyScans = [
        { sessionKey: 'software|sch-sw-ind2' },
        { sessionKey: 'software|sch-sw-ind5a' },
        { sessionKey: 'software|sch-sw-ind5b' },
        { sessionKey: 'software|sch-sw-ind6a' },
        { sessionKey: 'software|sch-sw-ind6b' }
    ];

    // In a combo or powertrain summary, powertrain must receive all these joint credits via jointKey
    const { perTrack } = summarizeAttendance({
        sessions,
        attendanceRecords: softwareOnlyScans,
        tracksEnrolled: ['software', 'powertrain']
    });

    // 1 full + 4 half sessions = 3.0 credits each
    assert.equal(perTrack.software.totalPresent, 3.0);
    assert.equal(perTrack.powertrain.totalPresent, 3.0);
    assert.equal(perTrack.software.attendancePercentage, 100);
    assert.equal(perTrack.powertrain.attendancePercentage, 100);
});
