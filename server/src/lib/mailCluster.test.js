import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMailCluster } from './mailCluster.js';

test('merges a participant and a subscriber with the same email (case-insensitive)', () => {
    const { contacts, counts } = buildMailCluster(
        [{ email: 'Asha@PSGItech.ac.in', name: 'Asha', department: 'CSE', year: '2', lastLoginAt: '2026-10-01', loginCount: 3 }],
        [{ email: ' asha@psgitech.ac.in ', source: 'blog', createdAt: '2026-09-01' }]
    );
    assert.equal(contacts.length, 1);
    assert.deepEqual(contacts[0].segments, ['participant', 'subscriber']);
    assert.equal(contacts[0].email, 'asha@psgitech.ac.in');
    assert.equal(contacts[0].source, 'blog');
    assert.deepEqual(counts, { total: 1, participants: 1, subscribers: 1, both: 1, optedOut: 0 });
});

test('keeps the latest login and sums login counts across duplicate registrations', () => {
    const { contacts } = buildMailCluster([
        { email: 'a@x.in', name: 'A', lastLoginAt: '2026-10-01T00:00:00Z', loginCount: 2 },
        { email: 'A@x.in', name: '', lastLoginAt: '2026-10-05T00:00:00Z', loginCount: 1 }
    ]);
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].lastLoginAt, '2026-10-05T00:00:00Z');
    assert.equal(contacts[0].loginCount, 3);
    assert.equal(contacts[0].name, 'A');
});

test('keeps the earliest subscription date and defaults the source to home', () => {
    const { contacts } = buildMailCluster(
        [],
        [
            { email: 's@x.in', createdAt: '2026-09-10' },
            { email: 's@x.in', createdAt: '2026-08-01' }
        ]
    );
    assert.equal(contacts[0].subscribedAt, '2026-08-01');
    assert.equal(contacts[0].source, 'home');
});

test('drops entries without a usable email and sorts by email', () => {
    const { contacts, counts } = buildMailCluster(
        [{ email: '' }, { email: 'no-at-sign' }, { email: 'b@x.in' }],
        [{ email: null }, { email: 'a@x.in' }]
    );
    assert.deepEqual(contacts.map((c) => c.email), ['a@x.in', 'b@x.in']);
    assert.deepEqual(counts, { total: 2, participants: 1, subscribers: 1, both: 0, optedOut: 0 });
});

test('opted-out emails and unsubscribed subscribers are dropped from every segment and counted once', () => {
    const { contacts, counts } = buildMailCluster(
        [
            { email: 'Out@x.in', name: 'Opted Out Participant' },
            { email: 'keep@x.in', name: 'Keep' },
            { email: 'gone@x.in', name: 'Unsubscribed and participant' }
        ],
        [
            { email: 'gone@x.in', unsubscribedAt: '2026-10-01' },
            { email: 'sub@x.in', createdAt: '2026-09-01' }
        ],
        ['out@x.in']
    );
    assert.deepEqual(contacts.map((c) => c.email), ['keep@x.in', 'sub@x.in']);
    assert.equal(counts.optedOut, 2);
    assert.equal(counts.total, 2);
});
