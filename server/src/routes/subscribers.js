import { Router } from 'express';
import Subscriber from '../models/Subscriber.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const SOURCES = ['home', 'community', 'blog'];

// POST /api/subscribers (Public - Join the Alliance, community page, blog posts)
router.post('/', async (req, res) => {
    try {
        const { email, phone, source } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

        // An email-only signup (community, blog) must not wipe a phone given earlier,
        // and the first place someone subscribed from is the one kept.
        await Subscriber.findOneAndUpdate(
            { email: cleanEmail },
            {
                ...(cleanPhone ? { $set: { phone: cleanPhone } } : {}),
                $setOnInsert: { source: SOURCES.includes(source) ? source : 'home' }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({
            success: true,
            message: 'Thank you for joining the Asterix Racing Alliance!'
        });
    } catch (err) {
        console.error('Error adding subscriber:', err);
        res.status(500).json({ error: 'Failed to record subscription', details: err.message });
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
            created_at: s.createdAt
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
