// Mirrors server/src/lib/blog.js so the editor shows the same slug and read time the server will store.

export function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120)
        .replace(/-+$/g, '');
}

export function countWords(body) {
    return String(body || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*_`[\]()!-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
}

export function readMinutes(body) {
    return Math.max(1, Math.ceil(countWords(body) / 200));
}

/* A view counts as a read once the reader reached the end of the post and spent
   real time on it: about a third of the estimated read time, 15 s to 2 min. */
export function isRead({ maxScroll, engagedSeconds, readMinutes: minutes }) {
    const needed = Math.min(120, Math.max(15, Math.round(minutes * 60 * 0.3)));
    return maxScroll >= 90 && engagedSeconds >= needed;
}
