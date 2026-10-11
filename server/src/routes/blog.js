import { Router } from 'express';
import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost.js';
import BlogView from '../models/BlogView.js';
import BlogInteraction from '../models/BlogInteraction.js';
import BlogComment from '../models/BlogComment.js';
import { isMongoConnected } from '../db/mongodb.js';
import { authenticateToken, requireLeadOrAdmin } from '../middleware/auth.js';
import { toListItem, parseBlogBody } from '../lib/blog.js';

const router = Router();

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    next();
}

const PUBLISHED = { status: 'published' };
const adminOnly = [authenticateToken, requireLeadOrAdmin, requireDb];

// The featured post takes the large card first; everything else is newest first.
const PUBLIC_ORDER = { featured: -1, publishedAt: -1 };

function withBody(post) {
    return {
        ...toListItem(post),
        body: post.body,
        takeaways: post.takeaways || [],
        reactionCounts: post.reactionCounts || {}
    };
}

// "Keep reading": posts sharing the category or a tag first, topped up with the newest.
async function relatedPosts(post, limit = 3) {
    const others = { ...PUBLISHED, _id: { $ne: post._id } };
    const topical = [];
    if (post.category || post.tags?.length) {
        const or = [];
        if (post.category) or.push({ category: post.category });
        if (post.tags?.length) or.push({ tags: { $in: post.tags } });
        topical.push(...(await BlogPost.find({ ...others, $or: or }).sort(PUBLIC_ORDER).limit(limit).lean()));
    }
    if (topical.length < limit) {
        const seen = topical.map((p) => p._id);
        const fill = await BlogPost.find({ ...others, _id: { $nin: [post._id, ...seen] } })
            .sort({ publishedAt: -1 })
            .limit(limit - topical.length)
            .lean();
        topical.push(...fill);
    }
    return topical.map(toListItem);
}

// A post gets its publish date the first time it goes live and keeps it after that,
// so unpublishing to fix a typo does not move it to the top of the list.
function applyStatus(post, status) {
    if (status !== 'published' && status !== 'draft') return;
    post.status = status;
    if (status === 'published' && !post.publishedAt) post.publishedAt = new Date();
}

async function keepSingleFeatured(post) {
    if (post.featured) {
        await BlogPost.updateMany({ _id: { $ne: post._id }, featured: true }, { $set: { featured: false } });
    }
}

function sendSaveError(res, err) {
    if (err?.code === 11000) {
        return res.status(409).json({
            error: 'Another post already uses this URL slug. Change the slug and save again.',
            field: 'slug'
        });
    }
    if (err?.name === 'ValidationError') {
        return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Invalid post.' });
    }
    console.error('Error saving blog post:', err);
    return res.status(500).json({ error: 'Failed to save the post' });
}

async function findForAdmin(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404).json({ error: 'Post not found' });
        return null;
    }
    const post = await BlogPost.findById(req.params.id);
    if (!post) res.status(404).json({ error: 'Post not found' });
    return post;
}

/**
 * GET /api/blog
 * Public: published posts without bodies, the featured one first, then newest first.
 */
router.get('/', requireDb, async (_req, res) => {
    try {
        const posts = await BlogPost.find(PUBLISHED).sort(PUBLIC_ORDER).lean();
        return res.json({ posts: posts.map(toListItem) });
    } catch (err) {
        console.error('Error listing blog posts:', err);
        return res.status(500).json({ error: 'Failed to load blog posts' });
    }
});

/**
 * GET /api/blog/admin/all
 * Admin: every post including drafts, for the Community tab.
 * The admin routes are declared before /:slug so "admin" is never read as a slug.
 */
router.get('/admin/all', ...adminOnly, async (_req, res) => {
    try {
        const posts = await BlogPost.find().sort({ publishedAt: -1, updatedAt: -1 }).lean();
        return res.json({ posts: posts.map(toListItem) });
    } catch (err) {
        console.error('Error listing blog posts for admin:', err);
        return res.status(500).json({ error: 'Failed to load blog posts' });
    }
});

// GET /api/blog/admin/:id — one post with its body, for the editor.
router.get('/admin/:id', ...adminOnly, async (req, res) => {
    try {
        const post = await findForAdmin(req, res);
        if (post) return res.json({ post: withBody(post) });
    } catch (err) {
        console.error('Error loading blog post for admin:', err);
        return res.status(500).json({ error: 'Failed to load the post' });
    }
});

// POST /api/blog/admin — create a post (draft unless status is 'published').
router.post('/admin', ...adminOnly, async (req, res) => {
    const { doc, error, field } = parseBlogBody(req.body);
    if (error) return res.status(400).json({ error, field });
    try {
        const post = new BlogPost(doc);
        applyStatus(post, req.body.status);
        await post.save();
        await keepSingleFeatured(post);
        return res.status(201).json({ post: withBody(post) });
    } catch (err) {
        return sendSaveError(res, err);
    }
});

// PUT /api/blog/admin/:id — replace a post's content from the editor.
router.put('/admin/:id', ...adminOnly, async (req, res) => {
    const { doc, error, field } = parseBlogBody(req.body);
    if (error) return res.status(400).json({ error, field });
    try {
        const post = await findForAdmin(req, res);
        if (!post) return undefined;
        post.set(doc);
        applyStatus(post, req.body.status);
        await post.save();
        await keepSingleFeatured(post);
        return res.json({ post: withBody(post) });
    } catch (err) {
        return sendSaveError(res, err);
    }
});

// PATCH /api/blog/admin/:id — quick publish/unpublish and feature toggles from the list.
router.patch('/admin/:id', ...adminOnly, async (req, res) => {
    try {
        const post = await findForAdmin(req, res);
        if (!post) return undefined;
        applyStatus(post, req.body.status);
        if (typeof req.body.featured === 'boolean') post.featured = req.body.featured;
        await post.save();
        await keepSingleFeatured(post);
        return res.json({ post: toListItem(post) });
    } catch (err) {
        return sendSaveError(res, err);
    }
});

// DELETE /api/blog/admin/:id
router.delete('/admin/:id', ...adminOnly, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Post not found' });
        const deleted = await BlogPost.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Post not found' });
        // Its views, reactions, votes and comments mean nothing without it.
        await Promise.all([
            BlogView.deleteMany({ post: deleted._id }),
            BlogInteraction.deleteMany({ post: deleted._id }),
            BlogComment.deleteMany({ post: deleted._id })
        ]);
        return res.json({ success: true });
    } catch (err) {
        console.error('Error deleting blog post:', err);
        return res.status(500).json({ error: 'Failed to delete the post' });
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

        const [older, newer, related] = await Promise.all([
            BlogPost.findOne({ ...PUBLISHED, publishedAt: { $lt: post.publishedAt } })
                .sort({ publishedAt: -1 })
                .select('slug title')
                .lean(),
            BlogPost.findOne({ ...PUBLISHED, publishedAt: { $gt: post.publishedAt } })
                .sort({ publishedAt: 1 })
                .select('slug title')
                .lean(),
            relatedPosts(post)
        ]);

        return res.json({
            post: withBody(post),
            previous: older ? { slug: older.slug, title: older.title } : null,
            next: newer ? { slug: newer.slug, title: newer.title } : null,
            related
        });
    } catch (err) {
        console.error('Error loading blog post:', err);
        return res.status(500).json({ error: 'Failed to load blog post' });
    }
});

export default router;
