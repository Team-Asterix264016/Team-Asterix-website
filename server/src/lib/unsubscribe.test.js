import test from 'node:test';
import assert from 'node:assert/strict';
import { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl } from './unsubscribe.js';

test('tokens are per-email, case-insensitive and verify only for their own email', () => {
    const t = unsubscribeToken('Asha@PSGItech.ac.in');
    assert.equal(t.length, 32);
    assert.equal(t, unsubscribeToken(' asha@psgitech.ac.in '));
    assert.ok(verifyUnsubscribeToken('asha@psgitech.ac.in', t));
    assert.ok(!verifyUnsubscribeToken('bala@psgitech.ac.in', t));
    assert.ok(!verifyUnsubscribeToken('asha@psgitech.ac.in', t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A')));
    assert.ok(!verifyUnsubscribeToken('asha@psgitech.ac.in', ''));
    assert.ok(!verifyUnsubscribeToken('asha@psgitech.ac.in', undefined));
});

test('unsubscribeUrl points at the community unsubscribe view with an encoded email', () => {
    const url = unsubscribeUrl('https://asterix.example/', 'A+B@x.in');
    assert.ok(url.startsWith('https://asterix.example/#community/unsubscribe?e=a%2Bb%40x.in&t='));
    const token = url.split('&t=')[1];
    assert.ok(verifyUnsubscribeToken('a+b@x.in', token));
});
