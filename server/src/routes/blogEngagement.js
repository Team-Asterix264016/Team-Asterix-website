import express, { Router } from 'express';
import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost.js';
import BlogView from '../models/BlogView.js';
import BlogInteraction from '../models/BlogInteraction.js';
import BlogComment from '../models/BlogComment.js';
import { isMongoConnected } from '../db/mongodb.js';
import { authenticateToken, requireLeadOrAdmin } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import {
    REACTIONS,
    SHARE_CHANNELS,
    COMMENT_EDIT_WINDOW_MS,
    REPORTS_TO_HOLD,
    MAX_ENGAGED_SECONDS,
    isVisitorId,
    validateComment,
    newEditToken,
    hashToken,
    tokenMatches,
    parsePolls,
    summarizeViews
} from '../lib/engagement.js';

/* Reader engagement on Horizon posts (views, reactions, shares, polls,
   comments) and the admin analytics and moderation built on it. Mounted at
   /api/blog ahead of the post routes; the admin routes come first so
   "/admin/comments" is never read as a post slug. */
const router = Router();

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    next();
}

const adminOnly = [authenticateToken, requireLeadOrAdmin, requireDb];
const TEN_MINUTES = 10 * 60 * 1000;
const viewLimit = createRateLimiter({ windowMs: TEN_MINUTES, max: 120, message: 'Too many requests.' });
const interactLimit = createRateLimiter({
    windowMs: TEN_MINUTES,
    max: 120,
    message: 'Too many requests. Please slow down.'
});
const commentLimit = createRateLimiter({
    windowMs: TEN_MINUTES,
    max: 6,
    message: 'You are commenting quickly. Please wait a few minutes and try again.'
});

const isId = (id) => mongoose.isValidObjectId(id);
const clampNumber = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);
const reactionKind = (type) => `react:${type}`;

async function publishedPost(slug) {
    return BlogPost.findOne({ slug: String(slug || '').toLowerCase(), status: 'published' });
}

async function recountReactions(postId) {
    const rows = await BlogInteraction.aggregate([
        { $match: { target: postId, kind: { $in: REACTIONS.map(reactionKind) } } },
        { $group: { _id: '$kind', n: { $sum: 1 } } }
    ]);
    const counts = Object.fromEntries(REACTIONS.map((r) => [r, 0]));
    for (const row of rows) counts[row._id.slice('react:'.length)] = row.n;
    await BlogPost.updateOne({ _id: postId }, { $set: { reactionCounts: counts } });
    return counts;
}

async function refreshCommentCount(postId) {
    const count = await BlogComment.countDocuments({ post: postId, status: 'visible' });
    await BlogPost.updateOne({ _id: postId }, { $set: { commentCount: count } });
    return count;
}

async function pollResults(postId, polls) {
    if (!polls.length) return {};
    const rows = await BlogInteraction.aggregate([
        { $match: { target: postId, kind: { $in: polls.map((p) => `poll:${p.key}`) } } },
        { $group: { _id: { kind: '$kind', value: '$value' }, n: { $sum: 1 } } }
    ]);
    const results = {};
    for (const poll of polls) {
        const counts = poll.options.map(() => 0);
        for (const row of rows) {
            if (row._id.kind === `poll:${poll.key}` && row._id.value < counts.length) counts[row._id.value] = row.n;
        }
        results[poll.key] = { counts, total: counts.reduce((a, b) => a + b, 0) };
    }
    return results;
}

// Upsert that tolerates the unique-index race when two requests land together.
async function addInteraction(filter, extra = {}) {
    try {
        await BlogInteraction.updateOne(filter, { $setOnInsert: { ...filter, ...extra } }, { upsert: true });
    } catch (err) {
        if (err?.code !== 11000) throw err;
    }
}

function commentView(c, visitorId, likedIds) {
    const removed = c.status === 'deleted';
    const mine = Boolean(visitorId && c.visitorId === visitorId);
    return {
        id: String(c._id),
        parentId: c.parent ? String(c.parent) : null,
        name: removed ? '' : c.name,
        body: removed ? '' : c.body,
        status: c.status,
        isTeam: Boolean(c.isTeam),
        likes: c.likes || 0,
        liked: likedIds.has(String(c._id)),
        mine,
        editableUntil: mine ? new Date(new Date(c.createdAt).getTime() + COMMENT_EDIT_WINDOW_MS) : null,
        createdAt: c.createdAt,
        editedAt: c.editedAt
    };
}

/* -------------------------------------------------------------------------- */
/* Admin: analytics                                                           */
/* -------------------------------------------------------------------------- */

const windowDays = (req) => clampNumber(req.query.days || 30, 1, 365);
const sinceDays = (days) => new Date(Date.now() - days * 86400000);

// GET /api/blog/admin/analytics/overview?days=30 — every post's reach side by side.
router.get('/admin/analytics/overview', ...adminOnly, async (req, res) => {
    try {
        const days = windowDays(req);
        const [posts, rows] = await Promise.all([
            BlogPost.find().select('title slug status publishedAt viewCount commentCount reactionCounts shareCounts').lean(),
            BlogView.aggregate([
                { $match: { createdAt: { $gte: sinceDays(days) } } },
                {
                    $group: {
                        _id: '$post',
                        views: { $sum: 1 },
                        reads: { $sum: { $cond: ['$read', 1, 0] } },
                        visitors: { $addToSet: '$visitorId' },
                        engaged: { $avg: { $cond: [{ $gt: ['$engagedSeconds', 0] }, '$engagedSeconds', null] } }
                    }
                }
            ])
        ]);
        const byPost = new Map(rows.map((r) => [String(r._id), r]));
        const sum = (counts) => Object.values(counts || {}).reduce((a, b) => a + (Number(b) || 0), 0);
        const list = posts.map((p) => {
            const r = byPost.get(String(p._id)) || {};
            return {
                id: String(p._id),
                title: p.title,
                slug: p.slug,
                status: p.status,
                publishedAt: p.publishedAt,
                views: r.views || 0,
                uniqueVisitors: (r.visitors || []).filter(Boolean).length,
                reads: r.reads || 0,
                avgEngagedSeconds: Math.round(r.engaged || 0),
                reactions: sum(p.reactionCounts),
                comments: p.commentCount || 0,
                shares: sum(p.shareCounts),
                allTimeViews: p.viewCount || 0
            };
        });
        const totals = list.reduce(
            (t, p) => ({
                views: t.views + p.views,
                reads: t.reads + p.reads,
                reactions: t.reactions + p.reactions,
                comments: t.comments + p.comments,
                shares: t.shares + p.shares
            }),
            { views: 0, reads: 0, reactions: 0, comments: 0, shares: 0 }
        );
        return res.json({ days, totals, posts: list.sort((a, b) => b.views - a.views) });
    } catch (err) {
        console.error('Error building blog analytics overview:', err);
        return res.status(500).json({ error: 'Failed to load analytics' });
    }
});

// GET /api/blog/admin/:id/analytics?days=30 — one post's full reach report.
router.get('/admin/:id/analytics', ...adminOnly, async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ error: 'Post not found' });
        const post = await BlogPost.findById(req.params.id).lean();
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const days = windowDays(req);
        const polls = parsePolls(post.body);
        const [views, pending, results] = await Promise.all([
            BlogView.find({ post: post._id, createdAt: { $gte: sinceDays(days) } })
                .select('visitorId referrer source device maxScroll engagedSeconds read createdAt')
                .lean(),
            BlogComment.countDocuments({ post: post._id, status: 'pending' }),
            pollResults(post._id, polls)
        ]);

        return res.json({
            days,
            post: { id: String(post._id), title: post.title, slug: post.slug, status: post.status },
            summary: summarizeViews(views, { days }),
            allTime: { views: post.viewCount || 0 },
            reactions: post.reactionCounts || {},
            shares: post.shareCounts || {},
            comments: { visible: post.commentCount || 0, pending },
            polls: polls.map((p) => ({ ...p, ...results[p.key] }))
        });
    } catch (err) {
        console.error('Error building post analytics:', err);
        return res.status(500).json({ error: 'Failed to load analytics' });
    }
});

/* -------------------------------------------------------------------------- */
/* Admin: comment moderation                                                  */
/* -------------------------------------------------------------------------- */

// GET /api/blog/admin/comments?filter=review|visible|hidden|all
router.get('/admin/comments', ...adminOnly, async (req, res) => {
    try {
        const filter = String(req.query.filter || 'review');
        const query =
            filter === 'visible'
                ? { status: 'visible' }
                : filter === 'hidden'
                  ? { status: 'hidden' }
                  : filter === 'all'
                    ? { status: { $ne: 'deleted' } }
                    : { $or: [{ status: 'pending' }, { status: 'visible', reports: { $gt: 0 } }] };

        const [comments, pending, reported] = await Promise.all([
            BlogComment.find(query).sort({ createdAt: -1 }).limit(300).populate('post', 'title slug').lean(),
            BlogComment.countDocuments({ status: 'pending' }),
            BlogComment.countDocuments({ status: 'visible', reports: { $gt: 0 } })
        ]);

        return res.json({
            counts: { pending, reported, review: pending + reported },
            comments: comments.map((c) => ({
                id: String(c._id),
                parentId: c.parent ? String(c.parent) : null,
                post: c.post ? { id: String(c.post._id), title: c.post.title, slug: c.post.slug } : null,
                name: c.name,
                body: c.body,
                status: c.status,
                isTeam: Boolean(c.isTeam),
                likes: c.likes || 0,
                reports: c.reports || 0,
                createdAt: c.createdAt,
                editedAt: c.editedAt
            }))
        });
    } catch (err) {
        console.error('Error listing comments for moderation:', err);
        return res.status(500).json({ error: 'Failed to load comments' });
    }
});

// POST /api/blog/admin/comments — reply as the team ({ postId, parentId?, body }).
router.post('/admin/comments', ...adminOnly, async (req, res) => {
    try {
        const { postId, parentId } = req.body || {};
        if (!isId(postId)) return res.status(400).json({ error: 'Choose a post.' });
        const post = await BlogPost.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const checked = validateComment({ name: req.user?.name || 'Team Asterix', body: req.body?.body });
        if (checked.error) return res.status(400).json({ error: checked.error, field: checked.field });

        let parent = null;
        if (parentId) {
            if (!isId(parentId)) return res.status(400).json({ error: 'Invalid comment to reply to.' });
            const target = await BlogComment.findOne({ _id: parentId, post: post._id });
            if (!target) return res.status(404).json({ error: 'That comment no longer exists.' });
            parent = target.parent || target._id;
        }

        const comment = await BlogComment.create({
            post: post._id,
            parent,
            name: checked.name,
            body: checked.body,
            status: 'visible',
            isTeam: true
        });
        await refreshCommentCount(post._id);
        return res.status(201).json({ comment: commentView(comment, null, new Set()) });
    } catch (err) {
        console.error('Error posting team reply:', err);
        return res.status(500).json({ error: 'Failed to post the reply' });
    }
});

// PATCH /api/blog/admin/comments/:id — { status: 'visible' | 'hidden' }. Approving clears reports.
router.patch('/admin/comments/:id', ...adminOnly, async (req, res) => {
    try {
        const status = req.body?.status;
        if (!['visible', 'hidden'].includes(status)) return res.status(400).json({ error: 'Unknown status.' });
        if (!isId(req.params.id)) return res.status(404).json({ error: 'Comment not found' });
        const comment = await BlogComment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        comment.status = status;
        if (status === 'visible') {
            comment.reports = 0;
            await BlogInteraction.deleteMany({ target: comment._id, kind: 'comment-report' });
        }
        await comment.save();
        await refreshCommentCount(comment.post);
        return res.json({ success: true, status: comment.status });
    } catch (err) {
        console.error('Error moderating comment:', err);
        return res.status(500).json({ error: 'Failed to update the comment' });
    }
});

// DELETE /api/blog/admin/comments/:id — removes the comment, its replies and their likes/reports.
router.delete('/admin/comments/:id', ...adminOnly, async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ error: 'Comment not found' });
        const comment = await BlogComment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        const replies = await BlogComment.find({ parent: comment._id }).select('_id').lean();
        const ids = [comment._id, ...replies.map((r) => r._id)];
        await Promise.all([
            BlogComment.deleteMany({ _id: { $in: ids } }),
            BlogInteraction.deleteMany({ target: { $in: ids } })
        ]);
        await refreshCommentCount(comment.post);
        return res.json({ success: true, removed: ids.length });
    } catch (err) {
        console.error('Error deleting comment:', err);
        return res.status(500).json({ error: 'Failed to delete the comment' });
    }
});

/* -------------------------------------------------------------------------- */
/* Public: reading analytics                                                  */
/* -------------------------------------------------------------------------- */

// POST /api/blog/:slug/view — { visitorId, referrer, source, device } -> { viewId }
router.post('/:slug/view', viewLimit, requireDb, async (req, res) => {
    try {
        const post = await publishedPost(req.params.slug);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const { visitorId, referrer, source, device } = req.body || {};
        const view = await BlogView.create({
            post: post._id,
            visitorId: isVisitorId(visitorId) ? visitorId : '',
            referrer: String(referrer || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 120),
            source: String(source || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40),
            device: device === 'mobile' ? 'mobile' : 'desktop'
        });
        await BlogPost.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } });
        return res.status(201).json({ viewId: String(view._id) });
    } catch (err) {
        console.error('Error recording blog view:', err);
        return res.status(500).json({ error: 'Failed to record the view' });
    }
});

/* POST /api/blog/views/:id/progress — { maxScroll, engagedSeconds, read }.
   Sent with navigator.sendBeacon as text/plain (a CORS-simple type, so it works
   cross-origin while the page unloads). Values only ever grow. */
router.post('/views/:id/progress', express.text({ type: '*/*', limit: '2kb' }), viewLimit, requireDb, async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).end();
        let data = req.body;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                return res.status(400).end();
            }
        }
        const update = {
            $max: {
                maxScroll: clampNumber(data?.maxScroll, 0, 100),
                engagedSeconds: clampNumber(data?.engagedSeconds, 0, MAX_ENGAGED_SECONDS)
            }
        };
        if (data?.read === true) update.$set = { read: true };
        await BlogView.updateOne({ _id: req.params.id }, update);
        return res.status(204).end();
    } catch (err) {
        console.error('Error recording reading progress:', err);
        return res.status(500).end();
    }
});

/* -------------------------------------------------------------------------- */
/* Public: reactions, shares, polls                                           */
/* -------------------------------------------------------------------------- */

// GET /api/blog/:slug/engagement?v=<visitorId> — counters plus what this browser already did.
router.get('/:slug/engagement', requireDb, async (req, res) => {
    try {
        const post = await publishedPost(req.params.slug);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const visitorId = isVisitorId(req.query.v) ? req.query.v : null;
        const polls = parsePolls(post.body);
        const [mine, results] = await Promise.all([
            visitorId ? BlogInteraction.find({ target: post._id, visitorId }).select('kind value').lean() : [],
            pollResults(post._id, polls)
        ]);
        const myPolls = {};
        for (const m of mine) if (m.kind.startsWith('poll:')) myPolls[m.kind.slice(5)] = m.value;
        return res.json({
            reactions: post.reactionCounts || {},
            myReactions: mine.filter((m) => m.kind.startsWith('react:')).map((m) => m.kind.slice(6)),
            polls: results,
            myPolls,
            views: post.viewCount || 0,
            comments: post.commentCount || 0
        });
    } catch (err) {
        console.error('Error loading engagement:', err);
        return res.status(500).json({ error: 'Failed to load engagement' });
    }
});

// POST /api/blog/:slug/react — { visitorId, type, on } toggles one reaction.
router.post('/:slug/react', interactLimit, requireDb, async (req, res) => {
    try {
        const { visitorId, type, on } = req.body || {};
        if (!isVisitorId(visitorId) || !REACTIONS.includes(type)) {
            return res.status(400).json({ error: 'Invalid reaction.' });
        }
        const post = await publishedPost(req.params.slug);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const filter = { target: post._id, visitorId, kind: reactionKind(type) };
        if (on === false) await BlogInteraction.deleteOne(filter);
        else await addInteraction(filter, { post: post._id });

        return res.json({ reactions: await recountReactions(post._id), type, on: on !== false });
    } catch (err) {
        console.error('Error saving reaction:', err);
        return res.status(500).json({ error: 'Failed to save the reaction' });
    }
});

// POST /api/blog/:slug/share — { channel } counts a share by where it went.
router.post('/:slug/share', interactLimit, requireDb, async (req, res) => {
    try {
        const channel = req.body?.channel;
        if (!SHARE_CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown share channel.' });
        await BlogPost.updateOne(
            { slug: String(req.params.slug).toLowerCase(), status: 'published' },
            { $inc: { [`shareCounts.${channel}`]: 1 } }
        );
        return res.status(204).end();
    } catch (err) {
        console.error('Error counting share:', err);
        return res.status(500).end();
    }
});

// POST /api/blog/:slug/poll — { visitorId, key, option }; voting again changes the vote.
router.post('/:slug/poll', interactLimit, requireDb, async (req, res) => {
    try {
        const { visitorId, key, option } = req.body || {};
        const post = await publishedPost(req.params.slug);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const poll = parsePolls(post.body).find((p) => p.key === key);
        if (!poll || !isVisitorId(visitorId) || !Number.isInteger(option) || option < 0 || option >= poll.options.length) {
            return res.status(400).json({ error: 'Invalid vote.' });
        }
        await BlogInteraction.updateOne(
            { target: post._id, visitorId, kind: `poll:${key}` },
            { $set: { value: option }, $setOnInsert: { post: post._id } },
            { upsert: true }
        );
        const results = await pollResults(post._id, [poll]);
        return res.json({ ...results[key], mine: option });
    } catch (err) {
        console.error('Error saving poll vote:', err);
        return res.status(500).json({ error: 'Failed to save the vote' });
    }
});

/* -------------------------------------------------------------------------- */
/* Public: comments                                                           */
/* -------------------------------------------------------------------------- */

// GET /api/blog/:slug/comments?v=<visitorId>&sort=oldest|newest|top
router.get('/:slug/comments', requireDb, async (req, res) => {
    try {
        const post = await publishedPost(req.params.slug);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const visitorId = isVisitorId(req.query.v) ? req.query.v : null;

        const all = await BlogComment.find({ post: post._id, status: { $in: ['visible', 'pending', 'deleted'] } })
            .sort({ createdAt: 1 })
            .lean();
        // Held comments are only shown to the person who wrote them.
        const shown = all.filter((c) => c.status !== 'pending' || (visitorId && c.visitorId === visitorId));

        const likedIds = new Set();
        if (visitorId && shown.length) {
            const likes = await BlogInteraction.find({
                visitorId,
                kind: 'comment-like',
                target: { $in: shown.map((c) => c._id) }
            })
                .select('target')
                .lean();
            for (const like of likes) likedIds.add(String(like.target));
        }

        const replies = new Map();
        for (const c of shown) {
            if (!c.parent || c.status === 'deleted') continue;
            const key = String(c.parent);
            if (!replies.has(key)) replies.set(key, []);
            replies.get(key).push(commentView(c, visitorId, likedIds));
        }

        let threads = shown
            .filter((c) => !c.parent)
            .map((c) => ({ ...commentView(c, visitorId, likedIds), replies: replies.get(String(c._id)) || [] }))
            // An author-deleted comment stays only as a placeholder for its replies.
            .filter((t) => t.status !== 'deleted' || t.replies.length > 0);

        const sort = String(req.query.sort || 'oldest');
        if (sort === 'newest') threads = threads.reverse();
        else if (sort === 'top') threads = threads.sort((a, b) => b.likes - a.likes || new Date(a.createdAt) - new Date(b.createdAt));

        return res.json({ comments: threads, count: post.commentCount || 0, mode: post.commentsMode || 'open' });
    } catch (err) {
        console.error('Error listing comments:', err);
        return res.status(500).json({ error: 'Failed to load comments' });
    }
});

// POST /api/blog/:slug/comments — { visitorId, name, body, parentId?, website (decoy) }
router.post('/:slug/comments', commentLimit, requireDb, async (req, res) => {
    try {
        const { visitorId, parentId, website } = req.body || {};
        // Bots fill the hidden decoy field; answer as if the comment was held.
        if (website) return res.status(201).json({ comment: null, held: true });

        const post = await publishedPost(req.params.slug);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.commentsMode === 'closed') return res.status(403).json({ error: 'Comments are closed on this post.' });
        if (!isVisitorId(visitorId)) return res.status(400).json({ error: 'Reload the page and try again.' });

        const checked = validateComment(req.body || {});
        if (checked.error) return res.status(400).json({ error: checked.error, field: checked.field });

        let parent = null;
        if (parentId) {
            if (!isId(parentId)) return res.status(400).json({ error: 'Invalid comment to reply to.' });
            const target = await BlogComment.findOne({ _id: parentId, post: post._id, status: 'visible' });
            if (!target) return res.status(404).json({ error: 'That comment is no longer available.' });
            // Replies stay one level deep: answering a reply joins its thread.
            parent = target.parent || target._id;
        }

        const duplicate = await BlogComment.exists({
            post: post._id,
            visitorId,
            body: checked.body,
            createdAt: { $gte: new Date(Date.now() - TEN_MINUTES) }
        });
        if (duplicate) return res.status(409).json({ error: 'You already posted this comment.' });

        const editToken = newEditToken();
        const comment = await BlogComment.create({
            post: post._id,
            parent,
            name: checked.name,
            body: checked.body,
            status: post.commentsMode === 'approval' ? 'pending' : 'visible',
            visitorId,
            editTokenHash: hashToken(editToken)
        });
        if (comment.status === 'visible') await refreshCommentCount(post._id);

        res.locals.whatsappActivity = {
            type: 'blog-comment',
            name: checked.name,
            post: post.title,
            pending: comment.status === 'pending'
        };
        return res.status(201).json({
            comment: { ...commentView(comment, visitorId, new Set()), replies: [] },
            editToken
        });
    } catch (err) {
        console.error('Error posting comment:', err);
        return res.status(500).json({ error: 'Failed to post the comment' });
    }
});

async function ownComment(req, res) {
    if (!isId(req.params.id)) {
        res.status(404).json({ error: 'Comment not found' });
        return null;
    }
    const comment = await BlogComment.findById(req.params.id);
    if (!comment || comment.status === 'deleted' || comment.isTeam) {
        res.status(404).json({ error: 'Comment not found' });
        return null;
    }
    if (!tokenMatches(req.body?.editToken, comment.editTokenHash)) {
        res.status(403).json({ error: 'You can only change your own comments, from the browser you wrote them in.' });
        return null;
    }
    return comment;
}

// PATCH /api/blog/comments/:id — { editToken, body }, within 15 minutes of posting.
router.patch('/comments/:id', interactLimit, requireDb, async (req, res) => {
    try {
        const comment = await ownComment(req, res);
        if (!comment) return undefined;
        if (Date.now() - comment.createdAt.getTime() > COMMENT_EDIT_WINDOW_MS) {
            return res.status(403).json({ error: 'Comments can be edited for 15 minutes after posting.' });
        }
        const checked = validateComment({ name: comment.name, body: req.body?.body });
        if (checked.error) return res.status(400).json({ error: checked.error, field: checked.field });
        comment.body = checked.body;
        comment.editedAt = new Date();
        await comment.save();
        return res.json({ comment: commentView(comment, comment.visitorId, new Set()) });
    } catch (err) {
        console.error('Error editing comment:', err);
        return res.status(500).json({ error: 'Failed to edit the comment' });
    }
});

// DELETE /api/blog/comments/:id — { editToken }; the author removes their own comment.
router.delete('/comments/:id', interactLimit, requireDb, async (req, res) => {
    try {
        const comment = await ownComment(req, res);
        if (!comment) return undefined;
        comment.status = 'deleted';
        comment.body = '';
        await comment.save();
        await refreshCommentCount(comment.post);
        return res.json({ success: true });
    } catch (err) {
        console.error('Error deleting own comment:', err);
        return res.status(500).json({ error: 'Failed to delete the comment' });
    }
});

async function visibleComment(req, res) {
    if (!isId(req.params.id) || !isVisitorId(req.body?.visitorId)) {
        res.status(400).json({ error: 'Invalid request.' });
        return null;
    }
    const comment = await BlogComment.findOne({ _id: req.params.id, status: 'visible' });
    if (!comment) res.status(404).json({ error: 'Comment not found' });
    return comment;
}

// POST /api/blog/comments/:id/like — { visitorId, on }
router.post('/comments/:id/like', interactLimit, requireDb, async (req, res) => {
    try {
        const comment = await visibleComment(req, res);
        if (!comment) return undefined;
        const filter = { target: comment._id, visitorId: req.body.visitorId, kind: 'comment-like' };
        if (req.body.on === false) await BlogInteraction.deleteOne(filter);
        else await addInteraction(filter, { post: comment.post });
        comment.likes = await BlogInteraction.countDocuments({ target: comment._id, kind: 'comment-like' });
        await comment.save();
        return res.json({ likes: comment.likes, liked: req.body.on !== false });
    } catch (err) {
        console.error('Error liking comment:', err);
        return res.status(500).json({ error: 'Failed to save the like' });
    }
});

// POST /api/blog/comments/:id/report — { visitorId }; enough reports hold it for review.
router.post('/comments/:id/report', interactLimit, requireDb, async (req, res) => {
    try {
        const comment = await visibleComment(req, res);
        if (!comment) return undefined;
        await addInteraction(
            { target: comment._id, visitorId: req.body.visitorId, kind: 'comment-report' },
            { post: comment.post }
        );
        comment.reports = await BlogInteraction.countDocuments({ target: comment._id, kind: 'comment-report' });
        if (comment.reports >= REPORTS_TO_HOLD) comment.status = 'pending';
        await comment.save();
        if (comment.status === 'pending') await refreshCommentCount(comment.post);
        return res.json({ success: true });
    } catch (err) {
        console.error('Error reporting comment:', err);
        return res.status(500).json({ error: 'Failed to report the comment' });
    }
});

export default router;
