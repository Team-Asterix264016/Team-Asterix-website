/**
 * Merges logged-in workshop participants and newsletter subscribers into one
 * contact list keyed by lowercase email. A person who is both appears once with
 * both segments. Someone with several paid registrations keeps their latest
 * login and their summed login count. Anyone on the opt-out list, or a
 * subscriber who unsubscribed, is left out of every segment and only counted.
 */
export function buildMailCluster(participants = [], subscribers = [], optOutEmails = []) {
    const byEmail = new Map();
    const normalize = (email) => String(email || '').trim().toLowerCase();
    const optedOut = new Set(optOutEmails.map(normalize));
    for (const s of subscribers) if (s.unsubscribedAt) optedOut.add(normalize(s.email));
    const suppressed = new Set();

    const contactFor = (email) => {
        const key = normalize(email);
        if (!key.includes('@')) return null;
        if (optedOut.has(key)) {
            suppressed.add(key);
            return null;
        }
        if (!byEmail.has(key)) {
            byEmail.set(key, {
                email: key,
                name: '',
                department: '',
                year: '',
                segments: [],
                lastLoginAt: null,
                loginCount: 0,
                subscribedAt: null,
                source: null
            });
        }
        return byEmail.get(key);
    };

    const later = (a, b) => (!a ? b : !b ? a : new Date(a) >= new Date(b) ? a : b);
    const earlier = (a, b) => (!a ? b : !b ? a : new Date(a) <= new Date(b) ? a : b);

    for (const p of participants) {
        const c = contactFor(p.email);
        if (!c) continue;
        if (!c.segments.includes('participant')) c.segments.push('participant');
        c.name = c.name || p.name || '';
        c.department = c.department || p.department || '';
        c.year = c.year || p.year || '';
        c.lastLoginAt = later(c.lastLoginAt, p.lastLoginAt || null);
        c.loginCount += Number(p.loginCount) || 0;
    }

    for (const s of subscribers) {
        const c = contactFor(s.email);
        if (!c) continue;
        if (!c.segments.includes('subscriber')) c.segments.push('subscriber');
        c.subscribedAt = earlier(c.subscribedAt, s.createdAt || null);
        c.source = c.source || s.source || 'home';
    }

    const contacts = [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email));
    const has = (c, seg) => c.segments.includes(seg);

    return {
        contacts,
        counts: {
            total: contacts.length,
            participants: contacts.filter((c) => has(c, 'participant')).length,
            subscribers: contacts.filter((c) => has(c, 'subscriber')).length,
            both: contacts.filter((c) => has(c, 'participant') && has(c, 'subscriber')).length,
            optedOut: suppressed.size
        }
    };
}
