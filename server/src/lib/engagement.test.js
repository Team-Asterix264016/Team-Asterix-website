import test from 'node:test';
import assert from 'node:assert/strict';
import {
    isVisitorId,
    validateComment,
    newEditToken,
    hashToken,
    tokenMatches,
    parsePolls,
    sourceLabel,
    summarizeViews
} from './engagement.js';

test('visitor ids must be 8-64 url-safe characters', () => {
    assert.ok(isVisitorId('a1b2c3d4-e5f6'));
    assert.ok(!isVisitorId('short'));
    assert.ok(!isVisitorId('has space in it'));
    assert.ok(!isVisitorId({ $ne: null }));
});

test('validateComment trims, collapses blank lines and enforces limits', () => {
    assert.deepEqual(validateComment({ name: '  Asha   K ', body: 'Great\r\n\r\n\r\n\r\npost!' }), {
        name: 'Asha K',
        body: 'Great\n\npost!'
    });
    assert.equal(validateComment({ name: 'A', body: 'hi there' }).field, 'name');
    assert.equal(validateComment({ name: 'Asha', body: ' ' }).field, 'body');
    assert.equal(validateComment({ name: 'Asha', body: 'x'.repeat(2001) }).field, 'body');
    assert.equal(
        validateComment({ name: 'Spam', body: 'https://a.test https://b.test www.c.test' }).field,
        'body'
    );
});

test('edit tokens verify only against their own hash', () => {
    const token = newEditToken();
    const hash = hashToken(token);
    assert.ok(tokenMatches(token, hash));
    assert.ok(!tokenMatches(newEditToken(), hash));
    assert.ok(!tokenMatches('', hash));
    assert.ok(!tokenMatches(token, ''));
});

test('parsePolls reads question and options, needs two options, ignores duplicates', () => {
    const body = [
        'Intro',
        ':::poll Which sensor should we add next?',
        '- LiDAR',
        '- Radar',
        '* Thermal camera',
        ':::',
        ':::poll One option only',
        '- Lonely',
        ':::',
        ':::poll Which sensor should we add next?',
        '- Duplicate',
        '- Question',
        ':::'
    ].join('\n');
    assert.deepEqual(parsePolls(body), [
        {
            key: 'which-sensor-should-we-add-next',
            question: 'Which sensor should we add next?',
            options: ['LiDAR', 'Radar', 'Thermal camera']
        }
    ]);
});

test('sourceLabel prefers utm_source, then known referrers, else Direct', () => {
    assert.equal(sourceLabel({ source: 'whatsapp', referrer: 'google.com' }), 'WhatsApp');
    assert.equal(sourceLabel({ referrer: 'lnkd.in' }), 'LinkedIn');
    assert.equal(sourceLabel({ referrer: 'www.google.co.in' }), 'Google');
    assert.equal(sourceLabel({ referrer: 'psgitech.ac.in' }), 'psgitech.ac.in');
    assert.equal(sourceLabel({}), 'Direct');
});

test('summarizeViews counts views, readers, reads, time, depth, sources and devices', () => {
    const now = new Date('2026-10-11T12:00:00+05:30');
    const views = [
        { visitorId: 'v1', read: true, engagedSeconds: 120, maxScroll: 100, device: 'mobile', source: 'whatsapp', createdAt: '2026-10-11T09:00:00+05:30' },
        { visitorId: 'v1', read: false, engagedSeconds: 20, maxScroll: 40, device: 'mobile', referrer: 'lnkd.in', createdAt: '2026-10-10T09:00:00+05:30' },
        { visitorId: 'v2', read: false, engagedSeconds: 0, maxScroll: 10, device: 'desktop', createdAt: '2026-10-10T23:30:00+05:30' },
        { visitorId: 'v3', read: true, engagedSeconds: 999999, maxScroll: 80, device: 'desktop', createdAt: '2026-09-01T09:00:00+05:30' }
    ];
    const s = summarizeViews(views, { days: 3, now });
    assert.equal(s.views, 4);
    assert.equal(s.uniqueVisitors, 3);
    assert.equal(s.reads, 2);
    assert.equal(s.readRate, 50);
    // (120 + 20 + 4h cap) / 3 views that had engaged time
    assert.equal(s.avgEngagedSeconds, Math.round((120 + 20 + 14400) / 3));
    assert.deepEqual(s.scrollFunnel, { 25: 3, 50: 2, 75: 2, 100: 1 });
    assert.deepEqual(s.daily.map((d) => [d.day, d.views, d.reads]), [
        ['2026-10-09', 0, 0],
        ['2026-10-10', 2, 0],
        ['2026-10-11', 1, 1]
    ]);
    assert.deepEqual(s.devices, { mobile: 2, desktop: 2 });
    assert.equal(s.sources[0].source, 'Direct');
    assert.equal(s.sources[0].views, 2);
});
