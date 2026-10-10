import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, createRateLimiter } from './rateLimit.js';

const fakeRes = () => {
    const res = { statusCode: 200, headers: {}, body: null };
    res.set = (k, v) => {
        res.headers[k] = v;
        return res;
    };
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body) => {
        res.body = body;
        return res;
    };
    return res;
};

test('clientIp takes the proxy-appended last X-Forwarded-For entry, ignoring client-written ones', () => {
    assert.equal(clientIp({ headers: { 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }, socket: {} }), '9.9.9.9');
    assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '10.0.0.5' } }), '10.0.0.5');
});

test('rate limiter blocks after max hits per IP and resets after the window', () => {
    let clock = 0;
    const limit = createRateLimiter({ windowMs: 1000, max: 2, message: 'slow down', now: () => clock });
    const req = (ip) => ({ headers: { 'x-forwarded-for': ip }, socket: {} });
    let passed = 0;
    const next = () => {
        passed += 1;
    };

    limit(req('a'), fakeRes(), next);
    limit(req('a'), fakeRes(), next);
    const blocked = fakeRes();
    limit(req('a'), blocked, next);
    assert.equal(passed, 2);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.body.error, 'slow down');
    assert.equal(blocked.headers['Retry-After'], '1');

    limit(req('b'), fakeRes(), next);
    assert.equal(passed, 3, 'other IPs have their own budget');

    clock = 1000;
    limit(req('a'), fakeRes(), next);
    assert.equal(passed, 4, 'window reset');
});
