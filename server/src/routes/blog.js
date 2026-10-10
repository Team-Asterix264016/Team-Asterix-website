import { Router } from 'express';
import BlogPost from '../models/BlogPost.js';
import { isMongoConnected } from '../db/mongodb.js';
import { authenticateToken, requireLeadOrAdmin } from '../middleware/auth.js';
import { toListItem } from '../lib/blog.js';

const router = Router();

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    next();
}

const PUBLISHED = { status: 'published' };

/**
 * GET /api/blog
 * Public: published posts, newest first, without bodies.
 */
router.get('/', requireDb, async (_req, res) => {
    try {
        const posts = await BlogPost.find(PUBLISHED).sort({ publishedAt: -1 }).lean();
        return res.json({ posts: posts.map(toListItem) });
    } catch (err) {
        console.error('Error listing blog posts:', err);
        return res.status(500).json({ error: 'Failed to load blog posts' });
    }
});

/**
 * GET /api/blog/admin/all
 * Admin: every post including drafts, for the read-only Community tab.
 * Declared before /:slug so "admin" is never read as a slug.
 */
router.get('/admin/all', authenticateToken, requireLeadOrAdmin, requireDb, async (_req, res) => {
    try {
        const posts = await BlogPost.find().sort({ publishedAt: -1, updatedAt: -1 }).lean();
        return res.json({ posts: posts.map(toListItem) });
    } catch (err) {
        console.error('Error listing blog posts for admin:', err);
        return res.status(500).json({ error: 'Failed to load blog posts' });
    }
});

/**
 * GET /api/blog/:slug
 * Public: one published post with its body, plus the neighbouring posts.
 */
router.get('/:slug', requireDb, async (req, res) => {
    try {
        const slug = String(req.params.slug || '').toLowerCase();
        const post = await BlogPost.findOne({ ...PUBLISHED, slug }).lean();
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const [older, newer] = await Promise.all([
            BlogPost.findOne({ ...PUBLISHED, publishedAt: { $lt: post.publishedAt } })
                .sort({ publishedAt: -1 })
                .select('slug title')
                .lean(),
            BlogPost.findOne({ ...PUBLISHED, publishedAt: { $gt: post.publishedAt } })
                .sort({ publishedAt: 1 })
                .select('slug title')
                .lean()
        ]);

        return res.json({
            post: { ...toListItem(post), body: post.body },
            previous: older ? { slug: older.slug, title: older.title } : null,
            next: newer ? { slug: newer.slug, title: newer.title } : null
        });
    } catch (err) {
        console.error('Error loading blog post:', err);
        return res.status(500).json({ error: 'Failed to load blog post' });
    }
});

export default router;
