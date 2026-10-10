import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * Resolves the token signing key.
 *
 * There is deliberately no hardcoded production key. A committed default is
 * worse than no key at all: it is public, so anyone reading the repository can
 * mint an administrator token and rewrite deadlines, briefs and results.
 *
 * If `JWT_SECRET` is missing in production the server still starts -- taking the
 * site down would be a worse outcome -- but it signs with a random key generated
 * at boot. Existing sessions stop validating and admins have to sign in again
 * after each restart, which is annoying enough to get noticed and fixed, while
 * leaving nothing forgeable in the meantime.
 */
function resolveSecret() {
    const configured = process.env.JWT_SECRET?.trim();
    if (configured) return configured;

    if (process.env.NODE_ENV === 'production') {
        console.error(
            '\n!!  JWT_SECRET is not set in this production environment.\n' +
            '!!  Signing with a random key generated at boot, so every admin session\n' +
            '!!  ends when this process restarts. Set JWT_SECRET in the host environment.\n'
        );
        return crypto.randomBytes(48).toString('hex');
    }

    console.warn('JWT_SECRET is not set. Using a development-only key; never run this in production.');
    return 'asterix-development-only-insecure-key';
}

export const JWT_SECRET = resolveSecret();

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No authorization token provided.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.', details: err.message });
    }

    /* Workshop participants get a token signed with the same key from
       /api/workshop/login, and every participant starts on the published
       default password. Only admin-account tokens (which always carry a
       username) may pass this gate. */
    if (decoded.type === 'workshop_student' || !decoded.username) {
        return res.status(403).json({ error: 'Forbidden: admin account required.' });
    }

    req.user = decoded;
    next();
}

export function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.accessLevel !== 'SuperAdmin') {
        return res.status(403).json({ error: 'Forbidden: SuperAdmin privileges required.' });
    }
    next();
}

export function requireLeadOrAdmin(req, res, next) {
    const level = req.user?.accessLevel || req.user?.role;
    if (!req.user || !['SuperAdmin', 'Lead', 'Member', 'Admin'].includes(level)) {
        return res.status(403).json({ error: 'Forbidden: Admin privileges required.' });
    }
    next();
}
