/* The client address as seen by the one proxy in front of the API (Render).
   The proxy appends the connecting IP to X-Forwarded-For, so the last entry is
   the real one; anything earlier in the header was written by the client and is
   ignored. Express's trust-proxy setting is left alone on purpose. */
export function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
        if (parts.length) return parts[parts.length - 1];
    }
    return req.socket?.remoteAddress || 'unknown';
}

/**
 * In-memory fixed-window limiter for public write endpoints. One instance per
 * route group; counts reset when the process restarts, which is fine for
 * keeping bots off a signup form.
 */
export function createRateLimiter({ windowMs, max, message, now = () => Date.now() }) {
    const hits = new Map();

    return function rateLimit(req, res, next) {
        const t = now();
        const key = clientIp(req);
        const entry = hits.get(key);

        if (!entry || t - entry.start >= windowMs) {
            hits.set(key, { start: t, count: 1 });
        } else if (entry.count >= max) {
            res.set('Retry-After', String(Math.ceil((entry.start + windowMs - t) / 1000)));
            return res.status(429).json({ error: message });
        } else {
            entry.count += 1;
        }

        // Keep the map from growing without bound on a long-running process.
        if (hits.size > 10000) {
            for (const [ip, e] of hits) if (t - e.start >= windowMs) hits.delete(ip);
        }
        return next();
    };
}
