/**
 * Merges logged-in workshop participants and newsletter subscribers into one
 * contact list keyed by lowercase email. A person who is both appears once with
 * both segments. Someone with several paid registrations keeps their latest
 * login and their summed login count.
 */
export function buildMailCluster(participants = [], subscribers = []) {
    const byEmail = new Map();

    const contactFor = (email) => {
        const key = String(email || '').trim().toLowerCase();
        if (!key.includes('@')) return null;
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
            both: contacts.filter((c) => has(c, 'participant') && has(c, 'subscriber')).length
        }
    };
}
