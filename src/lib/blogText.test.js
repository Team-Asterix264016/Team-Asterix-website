import test from 'node:test';
import assert from 'node:assert/strict';
import { isRead } from './blogText.js';
import { timeAgo } from './postDate.js';

test('a read needs the end of the post and time proportional to its length', () => {
    assert.equal(isRead({ maxScroll: 100, engagedSeconds: 14, readMinutes: 1 }), false);
    assert.equal(isRead({ maxScroll: 100, engagedSeconds: 18, readMinutes: 1 }), true);
    assert.equal(isRead({ maxScroll: 89, engagedSeconds: 600, readMinutes: 1 }), false);
    assert.equal(isRead({ maxScroll: 95, engagedSeconds: 89, readMinutes: 5 }), false);
    assert.equal(isRead({ maxScroll: 95, engagedSeconds: 90, readMinutes: 5 }), true);
    assert.equal(isRead({ maxScroll: 95, engagedSeconds: 120, readMinutes: 30 }), true);
});

test('timeAgo steps from minutes to hours to days to a date', () => {
    const now = Date.parse('2026-10-11T12:00:00Z');
    const ago = (s) => timeAgo(new Date(now - s * 1000).toISOString(), now);
    assert.equal(ago(30), 'just now');
    assert.equal(ago(5 * 60), '5 min ago');
    assert.equal(ago(3 * 3600), '3 h ago');
    assert.equal(ago(2 * 86400), '2 d ago');
    assert.match(ago(10 * 86400), /October 2026/);
    assert.equal(timeAgo('not a date', now), '');
});
