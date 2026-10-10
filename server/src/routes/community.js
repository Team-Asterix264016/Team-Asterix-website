import { Router } from 'express';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import Subscriber from '../models/Subscriber.js';
import { isMongoConnected } from '../db/mongodb.js';
import { authenticateToken, requireLeadOrAdmin } from '../middleware/auth.js';
import { buildMailCluster } from '../lib/mailCluster.js';

const router = Router();

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    next();
}

/**
 * GET /api/community/admin/mail-cluster
 * Admin, read-only: every paid participant who has logged in plus every
 * newsletter subscriber, merged by email.
 */
router.get('/admin/mail-cluster', authenticateToken, requireLeadOrAdmin, requireDb, async (_req, res) => {
    try {
        const [participants, subscribers] = await Promise.all([
            WorkshopRegistration.find({
                status: 'paid',
                $or: [{ lastLoginAt: { $ne: null } }, { loginCount: { $gt: 0 } }]
            })
                .select('name email department year lastLoginAt loginCount')
                .lean(),
            Subscriber.find().select('email source createdAt').lean()
        ]);
        return res.json(buildMailCluster(participants, subscribers));
    } catch (err) {
        console.error('Error building mail cluster:', err);
        return res.status(500).json({ error: 'Failed to build the mail cluster' });
    }
});

export default router;
