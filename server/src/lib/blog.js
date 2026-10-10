const WORDS_PER_MINUTE = 200;

export function readMinutes(body) {
    const words = String(body || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*_`[\]()!-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

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

/**
 * Splits a post file into its front matter and Markdown body.
 *
 *   ---
 *   title: Building the drive-by-wire rig
 *   tags: autonomy, hardware
 *   ---
 *   Body text...
 *
 * Only flat `key: value` lines are understood; `tags` is comma-separated.
 */
export function parsePostFile(text) {
    const source = String(text || '').replace(/^﻿/, '').replace(/\r\n/g, '\n');
    const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) throw new Error('Post file must start with a --- front matter block.');

    const meta = {};
    for (const line of match[1].split('\n')) {
        if (!line.trim()) continue;
        const sep = line.indexOf(':');
        if (sep === -1) throw new Error(`Front matter line has no "key: value": ${line}`);
        meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }

    if (!meta.title) throw new Error('Front matter needs a title.');
    const slug = slugify(meta.slug || meta.title);
    if (!slug) throw new Error('Could not derive a slug; add one to the front matter.');

    return {
        slug,
        title: meta.title,
        excerpt: meta.excerpt || '',
        author: meta.author || 'Team Asterix',
        authorRole: meta.authorRole || '',
        category: meta.category || '',
        tags: (meta.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        coverImage: meta.cover || '',
        coverAlt: meta.coverAlt || '',
        body: match[2].trim()
    };
}

// The shape the public list and the admin table both use: everything but the body.
export function toListItem(post) {
    return {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        coverAlt: post.coverAlt,
        author: post.author,
        authorRole: post.authorRole,
        category: post.category,
        tags: post.tags || [],
        status: post.status,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        readMinutes: readMinutes(post.body)
    };
}
