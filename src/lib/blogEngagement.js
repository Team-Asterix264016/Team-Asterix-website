import { apiUrl } from './api';

/* The browser's side of Horizon engagement: the anonymous reader id, and every
   call to the /api/blog engagement routes. Rules the server enforces live in
   server/src/lib/engagement.js. */

export const REACTIONS = [
    { type: 'like', emoji: '❤️', label: 'Like' },
    { type: 'insightful', emoji: '💡', label: 'Insightful' },
    { type: 'fire', emoji: '🔥', label: 'Fire' },
    { type: 'clap', emoji: '👏', label: 'Applause' }
];

export const COMMENT_MAX = 2000;

const VISITOR_KEY = 'horizon_visitor';
const NAME_KEY = 'horizon_comment_name';
const TOKENS_KEY = 'horizon_comment_tokens';

function readStore(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStore(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* Storage blocked (private mode); the value lasts for this page only. */
    }
}

function randomId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

let visitor = null;

// A random id this browser keeps for itself, so reactions and votes count once. It names no one.
export function visitorId() {
    if (visitor) return visitor;
    const stored = readStore(VISITOR_KEY);
    visitor = stored && /^[A-Za-z0-9_-]{8,64}$/.test(stored) ? stored : randomId();
    if (visitor !== stored) writeStore(VISITOR_KEY, visitor);
    return visitor;
}

export const rememberedName = () => readStore(NAME_KEY) || '';
export const rememberName = (name) => writeStore(NAME_KEY, name);

/* Editing or deleting a comment needs the secret the server returned when it
   was posted. Only this browser has it. */
function tokens() {
    try {
        return JSON.parse(readStore(TOKENS_KEY) || '{}') || {};
    } catch {
        return {};
    }
}
export const editTokenFor = (commentId) => tokens()[commentId] || '';
function saveEditToken(commentId, token) {
    writeStore(TOKENS_KEY, JSON.stringify({ ...tokens(), [commentId]: token }));
}
function forgetEditToken(commentId) {
    const all = tokens();
    delete all[commentId];
    writeStore(TOKENS_KEY, JSON.stringify(all));
}

async function call(path, { method = 'GET', body } = {}) {
    let res;
    try {
        res = await fetch(
            apiUrl(path),
            body
                ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
                : { method }
        );
    } catch {
        throw new Error('Network error. Check your connection.');
    }
    if (res.status === 204) return {};
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(data.error || 'Something went wrong. Try again in a moment.');
        error.field = data.field;
        throw error;
    }
    return data;
}

const postPath = (slug, rest) => `/api/blog/${encodeURIComponent(slug)}/${rest}`;

export const fetchEngagement = (slug) => call(postPath(slug, `engagement?v=${visitorId()}`));

export const sendReaction = (slug, type, on) =>
    call(postPath(slug, 'react'), { method: 'POST', body: { visitorId: visitorId(), type, on } });

export const sendVote = (slug, key, option) =>
    call(postPath(slug, 'poll'), { method: 'POST', body: { visitorId: visitorId(), key, option } });

// Counting a share must never get in the way of the share itself.
export function countShare(slug, channel) {
    call(postPath(slug, 'share'), { method: 'POST', body: { channel } }).catch(() => {});
}

export const fetchComments = (slug, sort) => call(postPath(slug, `comments?v=${visitorId()}&sort=${sort}`));

export async function postComment(slug, { name, body, parentId, website }) {
    const data = await call(postPath(slug, 'comments'), {
        method: 'POST',
        body: { visitorId: visitorId(), name, body, parentId, website }
    });
    if (data.comment && data.editToken) saveEditToken(data.comment.id, data.editToken);
    rememberName(name.trim());
    return data;
}

export const editComment = (id, body) =>
    call(`/api/blog/comments/${id}`, { method: 'PATCH', body: { editToken: editTokenFor(id), body } });

export async function deleteComment(id) {
    await call(`/api/blog/comments/${id}`, { method: 'DELETE', body: { editToken: editTokenFor(id) } });
    forgetEditToken(id);
}

export const likeComment = (id, on) =>
    call(`/api/blog/comments/${id}/like`, { method: 'POST', body: { visitorId: visitorId(), on } });

export const reportComment = (id) =>
    call(`/api/blog/comments/${id}/report`, { method: 'POST', body: { visitorId: visitorId() } });

export const startView = (slug, entry) =>
    call(postPath(slug, 'view'), { method: 'POST', body: { visitorId: visitorId(), ...entry } });

/* Progress goes out as text/plain through sendBeacon, which survives the tab
   closing and needs no CORS preflight. The server keeps only the highest values. */
export function sendProgress(viewId, progress) {
    const url = apiUrl(`/api/blog/views/${viewId}/progress`);
    const payload = JSON.stringify(progress);
    if (navigator.sendBeacon?.(url, new Blob([payload], { type: 'text/plain' }))) return;
    fetch(url, {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' }
    }).catch(() => {});
}
