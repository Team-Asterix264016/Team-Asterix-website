import crypto from 'node:crypto';
import { JWT_SECRET } from '../middleware/auth.js';

/* Unsubscribe links are signed so nobody can opt someone else out by guessing a
   URL. Set UNSUBSCRIBE_SECRET to keep links stable even if JWT_SECRET rotates;
   if neither is set in production the key changes on every restart and old
   links stop working. */
const secret = () => process.env.UNSUBSCRIBE_SECRET?.trim() || JWT_SECRET;

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export function unsubscribeToken(email) {
    return crypto
        .createHmac('sha256', secret())
        .update(`unsubscribe:${normalizeEmail(email)}`)
        .digest('base64url')
        .slice(0, 32);
}

export function verifyUnsubscribeToken(email, token) {
    const expected = Buffer.from(unsubscribeToken(email));
    const given = Buffer.from(String(token || ''));
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function unsubscribeUrl(baseUrl, email) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    const e = normalizeEmail(email);
    return `${base}/#community/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubscribeToken(e)}`;
}
