/**
 * Normalizes author data from a blog post object or raw author fields.
 * Supports legacy post.author & post.authorRole as well as new post.authors array.
 * Always returns an array of { name: string, role: string }.
 */
export function normalizeAuthors(post) {
    if (!post) {
        return [{ name: 'Team Asterix', role: '' }];
    }

    if (Array.isArray(post.authors) && post.authors.length > 0) {
        const cleaned = post.authors
            .map((a) => {
                if (typeof a === 'string') {
                    return { name: a.trim(), role: '' };
                }
                return {
                    name: String(a?.name || '').trim(),
                    role: String(a?.role || '').trim()
                };
            })
            .filter((a) => a.name);

        if (cleaned.length > 0) return cleaned;
    }

    if (post.author && String(post.author).trim()) {
        const name = String(post.author).trim();
        const role = String(post.authorRole || '').trim();
        return [{ name, role }];
    }

    return [{ name: 'Team Asterix', role: '' }];
}

/**
 * Formats author names for display.
 * 1 author: "Ratheeswar S"
 * 2 authors: "Ratheeswar S & Arya A"
 * 3+ authors: "Ratheeswar S, Arya A & John Doe"
 */
export function formatAuthorNames(postOrAuthors) {
    const authors = Array.isArray(postOrAuthors)
        ? normalizeAuthors({ authors: postOrAuthors })
        : normalizeAuthors(postOrAuthors);

    const names = authors.map((a) => a.name).filter(Boolean);
    if (names.length === 0) return 'Team Asterix';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/**
 * Formats roles for display.
 * If 1 author: role or fallback.
 * If multiple: comma-joined roles or combined summary.
 */
export function formatAuthorRoles(postOrAuthors, defaultRole = 'PSG iTech Motorsport') {
    const authors = Array.isArray(postOrAuthors)
        ? normalizeAuthors({ authors: postOrAuthors })
        : normalizeAuthors(postOrAuthors);

    const roles = authors.map((a) => a.role).filter(Boolean);
    if (roles.length === 0) return defaultRole;
    return roles.join(' · ');
}
