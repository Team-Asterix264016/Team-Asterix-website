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

// Links and images end up in public pages, so only http(s) and same-site paths pass.
export function isSafeUrl(url) {
    if (url.startsWith('/')) return !url.startsWith('//');
    try {
        const { protocol } = new URL(url);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}

const LIMITS = { title: 200, excerpt: 600, body: 50000, coverAlt: 300, author: 120, authorRole: 120, category: 60 };
const POSITION_RE = /^\d{1,3}% \d{1,3}%$/;

/**
 * Validates an admin create/update request into a BlogPost document.
 * Returns { doc } or { error, field }. Status and publishedAt are the route's job.
 */
export function parseBlogBody(body = {}) {
    const text = (key) => String(body[key] ?? '').trim();
    const doc = {
        title: text('title'),
        excerpt: text('excerpt'),
        body: String(body.body ?? '').replace(/\r\n/g, '\n').trim(),
        coverImage: text('coverImage'),
        coverAlt: text('coverAlt'),
        author: text('author') || 'Team Asterix',
        authorRole: text('authorRole'),
        category: text('category'),
        featured: body.featured === true
    };

    if (!doc.title) return { error: 'Give the post a title.', field: 'title' };
    for (const [key, max] of Object.entries(LIMITS)) {
        if (doc[key].length > max) return { error: `${key} is too long (max ${max} characters).`, field: key };
    }

    doc.slug = slugify(text('slug') || doc.title);
    if (!doc.slug) return { error: 'The URL slug needs at least one letter or digit.', field: 'slug' };

    if (doc.coverImage && !isSafeUrl(doc.coverImage)) {
        return { error: 'Cover image must be an http(s) URL or a site path starting with /.', field: 'coverImage' };
    }

    const rawTags = Array.isArray(body.tags) ? body.tags : String(body.tags ?? '').split(',');
    const seen = new Set();
    doc.tags = rawTags
        .map((t) => String(t).trim().replace(/^#/, ''))
        .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
    if (doc.tags.length > 10 || doc.tags.some((t) => t.length > 40)) {
        return { error: 'Use at most 10 tags of up to 40 characters each.', field: 'tags' };
    }

    doc.coverPosition = POSITION_RE.test(text('coverPosition')) ? text('coverPosition') : '50% 50%';

    // One takeaway per line (or an array), up to eight short points.
    const rawTakeaways = Array.isArray(body.takeaways) ? body.takeaways : String(body.takeaways ?? '').split('\n');
    doc.takeaways = rawTakeaways.map((t) => String(t).replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
    if (doc.takeaways.length > 8 || doc.takeaways.some((t) => t.length > 200)) {
        return { error: 'Use at most 8 takeaways of up to 200 characters each.', field: 'takeaways' };
    }

    doc.commentsMode = COMMENT_MODES.includes(body.commentsMode) ? body.commentsMode : 'open';
    return { doc };
}

const COMMENT_MODES = ['open', 'approval', 'closed'];

const sum = (counts) => Object.values(counts || {}).reduce((total, n) => total + (Number(n) || 0), 0);

// Public numbers shown on cards and in the article header.
export function publicStats(post) {
    return {
        views: post.viewCount || 0,
        reactions: sum(post.reactionCounts),
        comments: post.commentCount || 0
    };
}

// The shape the public list and the admin table both use: everything but the body.
export function toListItem(post) {
    return {
        id: String(post._id ?? ''),
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        coverAlt: post.coverAlt,
        coverPosition: post.coverPosition || '50% 50%',
        featured: Boolean(post.featured),
        author: post.author,
        authorRole: post.authorRole,
        category: post.category,
        tags: post.tags || [],
        status: post.status,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        readMinutes: readMinutes(post.body),
        commentsMode: post.commentsMode || 'open',
        stats: publicStats(post)
    };
}
