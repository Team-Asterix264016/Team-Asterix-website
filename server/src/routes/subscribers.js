import { Router } from 'express';
import Subscriber from '../models/Subscriber.js';
import EmailOptOut from '../models/EmailOptOut.js';
import { authenticateToken } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { normalizeEmail, verifyUnsubscribeToken } from '../lib/unsubscribe.js';

const router = Router();

const SOURCES = ['home', 'community', 'blog'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const THANKS = { success: true, message: 'Thank you for joining the Asterix Racing Alliance!' };
const TEN_MINUTES = 10 * 60 * 1000;

const subscribeLimit = createRateLimiter({
    windowMs: TEN_MINUTES,
    max: 8,
    message: 'Too many signups from this network. Please try again in a few minutes.'
});
const unsubscribeLimit = createRateLimiter({
    windowMs: TEN_MINUTES,
    max: 20,
    message: 'Too many requests. Please try again in a few minutes.'
});

// POST /api/subscribers (Public - Join the Alliance, community page, blog posts)
router.post('/', subscribeLimit, async (req, res) => {
    try {
        const { email, phone, source, website } = req.body || {};

        // `website` is a field people never see; bots fill it. Answer as if it worked.
        if (website) return res.status(201).json(THANKS);

        const cleanEmail = normalizeEmail(email);
        if (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }
        const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 20) : '';

        // An email-only signup (community, blog) must not wipe a phone given earlier,
        // and the first place someone subscribed from is the one kept.
        const existing = await Subscriber.findOne({ email: cleanEmail });
        if (existing) {
            if (cleanPhone) existing.phone = cleanPhone;
            existing.unsubscribedAt = null;
            await existing.save();
        } else {
            await Subscriber.create({
                email: cleanEmail,
                phone: cleanPhone || null,
                source: SOURCES.includes(source) ? source : 'home'
            });
        }

        // Subscribing is a fresh opt-in, so it lifts an earlier unsubscribe.
        await EmailOptOut.deleteOne({ email: cleanEmail });

        return res.status(201).json(THANKS);
    } catch (err) {
        if (err?.code === 11000) return res.status(201).json(THANKS);
        console.error('Error adding subscriber:', err);
        return res.status(500).json({ error: 'Failed to record subscription' });
    }
});

// POST /api/subscribers/unsubscribe (Public - signed link from an email)
router.post('/unsubscribe', unsubscribeLimit, async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        if (!email || !verifyUnsubscribeToken(email, req.body?.token)) {
            return res.status(400).json({
                error: 'This unsubscribe link is not valid. Use the full link from the email, or reply to the email and we will remove you.'
            });
        }

        await EmailOptOut.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
        await Subscriber.updateOne({ email, unsubscribedAt: null }, { $set: { unsubscribedAt: new Date() } });

        return res.json({ success: true });
    } catch (err) {
        console.error('Error unsubscribing:', err);
        return res.status(500).json({ error: 'Could not unsubscribe right now. Please try again.' });
    }
});

// GET /api/subscribers (Protected - Admin)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const subscribers = await Subscriber.find().sort({ createdAt: -1 });
        const list = subscribers.map(s => ({
            id: s._id.toString(),
            email: s.email,
            phone: s.phone,
            source: s.source || 'home',
            created_at: s.createdAt,
            unsubscribed_at: s.unsubscribedAt || null
        }));
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve subscribers', details: err.message });
    }
});

// DELETE /api/subscribers/:id (Protected - Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const targetId = req.params.id;
        const filter = Subscriber.base.isValidObjectId(targetId) ? { _id: targetId } : { email: targetId.toLowerCase() };
        await Subscriber.findOneAndDelete(filter);
        res.json({ success: true, message: 'Subscriber removed.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete subscriber', details: err.message });
    }
});

export default router;
