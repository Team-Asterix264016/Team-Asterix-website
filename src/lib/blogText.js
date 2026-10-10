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
