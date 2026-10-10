import crypto from 'node:crypto';

// Reader-facing engagement rules for Horizon posts, kept free of Express and
// Mongoose so they can be tested directly.

export const REACTIONS = ['like', 'insightful', 'fire', 'clap'];
export const SHARE_CHANNELS = ['whatsapp', 'linkedin', 'x', 'copy', 'native'];
export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;
// Reports from this many different readers hold a comment for review.
export const REPORTS_TO_HOLD = 3;
export const MAX_ENGAGED_SECONDS = 4 * 60 * 60;

// The anonymous id a browser keeps in localStorage; it identifies a browser, not a person.
const VISITOR_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const isVisitorId = (value) => typeof value === 'string' && VISITOR_RE.test(value);

export function validateComment({ name, body }) {
    const cleanName = String(name ?? '').replace(/\s+/g, ' ').trim();
    const cleanBody = String(body ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    if (cleanName.length < 2) return { error: 'Add your name (at least 2 characters).', field: 'name' };
    if (cleanName.length > 60) return { error: 'Names can be up to 60 characters.', field: 'name' };
    if (cleanBody.length < 2) return { error: 'Write something first.', field: 'body' };
    if (cleanBody.length > 2000) return { error: 'Comments can be up to 2000 characters.', field: 'body' };
    if ((cleanBody.match(/https?:\/\/|www\./gi) || []).length > 2) {
        return { error: 'Comments can include at most 2 links.', field: 'body' };
    }
    return { name: cleanName, body: cleanBody };
}

// A comment's author gets this secret once; only its hash is stored.
export const newEditToken = () => crypto.randomBytes(24).toString('hex');
export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
export function tokenMatches(token, hash) {
    if (!token || !hash) return false;
    const given = Buffer.from(hashToken(token));
    const stored = Buffer.from(String(hash));
    return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}

export function pollKey(question) {
    return String(question || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/**
 * Polls are written in a post body as
 *
 *   :::poll Which sensor should we add next?
 *   - LiDAR
 *   - Radar
 *   :::
 *
 * src/lib/renderMarkdown.jsx reads the same syntax; votes are keyed by the question.
 */
export function parsePolls(body) {
    const polls = [];
    const lines = String(body || '').replace(/\r\n/g, '\n').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
        const open = lines[i].match(/^:::poll\s+(.+?)\s*$/);
        if (!open) continue;
        const options = [];
        let j = i + 1;
        for (; j < lines.length && lines[j].trim() !== ':::'; j += 1) {
            const opt = lines[j].match(/^\s*[-*]\s+(.+?)\s*$/);
            if (opt) options.push(opt[1].slice(0, 120));
        }
        const key = pollKey(open[1]);
        if (key && options.length >= 2 && !polls.some((p) => p.key === key)) {
            polls.push({ key, question: open[1], options: options.slice(0, 8) });
        }
        i = j;
    }
    return polls;
}

const UTM_LABELS = {
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
    x: 'X / Twitter',
    twitter: 'X / Twitter',
    instagram: 'Instagram',
    facebook: 'Facebook',
    newsletter: 'Newsletter',
    email: 'Email'
};

const REFERRER_LABELS = [
    [/(^|\.)(wa\.me|whatsapp\.com)$/, 'WhatsApp'],
    [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
    [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X / Twitter'],
    [/(^|\.)instagram\.com$/, 'Instagram'],
    [/(^|\.)(facebook\.com|fb\.me)$/, 'Facebook'],
    [/(^|\.)google\.[a-z.]+$/, 'Google'],
    [/(^|\.)bing\.com$/, 'Bing'],
    [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube']
];

// Where a view came from: a share link's utm_source wins, then the referring site, else "Direct".
export function sourceLabel({ source, referrer } = {}) {
    const utm = String(source || '').trim().toLowerCase();
    if (utm) return UTM_LABELS[utm] || utm;
    const host = String(referrer || '').trim().toLowerCase();
    if (!host) return 'Direct';
    for (const [pattern, label] of REFERRER_LABELS) if (pattern.test(host)) return label;
    return host;
}

const dayKey = (date, timeZone) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

/**
 * Turns a post's view records into the numbers the admin analytics panel shows.
 * A "read" is a view that reached the end of the article with real reading time
 * behind it (the browser decides and flags it); engaged time only counts seconds
 * the tab was visible and the reader active.
 */
export function summarizeViews(views, { days = 30, now = new Date(), timeZone = 'Asia/Kolkata' } = {}) {
    const daily = new Map();
    for (let i = days - 1; i >= 0; i -= 1) {
        const key = dayKey(new Date(now.getTime() - i * 86400000), timeZone);
        daily.set(key, { day: key, views: 0, reads: 0 });
    }

    const visitors = new Set();
    const sources = new Map();
    const devices = { mobile: 0, desktop: 0 };
    const scrollFunnel = { 25: 0, 50: 0, 75: 0, 100: 0 };
    let reads = 0;
    let engagedTotal = 0;
    let engagedViews = 0;

    for (const view of views) {
        const bucket = daily.get(dayKey(new Date(view.createdAt), timeZone));
        if (bucket) {
            bucket.views += 1;
            if (view.read) bucket.reads += 1;
        }
        if (view.visitorId) visitors.add(view.visitorId);
        if (view.read) reads += 1;

        const seconds = Math.min(Math.max(Number(view.engagedSeconds) || 0, 0), MAX_ENGAGED_SECONDS);
        if (seconds > 0) {
            engagedTotal += seconds;
            engagedViews += 1;
        }

        const depth = Number(view.maxScroll) || 0;
        for (const mark of [25, 50, 75, 100]) if (depth >= mark) scrollFunnel[mark] += 1;

        const label = sourceLabel(view);
        sources.set(label, (sources.get(label) || 0) + 1);
        devices[view.device === 'mobile' ? 'mobile' : 'desktop'] += 1;
    }

    return {
        views: views.length,
        uniqueVisitors: visitors.size,
        reads,
        readRate: views.length ? Math.round((reads / views.length) * 100) : 0,
        avgEngagedSeconds: engagedViews ? Math.round(engagedTotal / engagedViews) : 0,
        scrollFunnel,
        daily: [...daily.values()],
        sources: [...sources]
            .map(([source, count]) => ({ source, views: count }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 8),
        devices
    };
}
