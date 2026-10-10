import { Router } from 'express';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import Subscriber from '../models/Subscriber.js';
import EmailOptOut from '../models/EmailOptOut.js';
import { isMongoConnected } from '../db/mongodb.js';
import { authenticateToken, requireLeadOrAdmin } from '../middleware/auth.js';
import { buildMailCluster } from '../lib/mailCluster.js';
import { unsubscribeUrl } from '../lib/unsubscribe.js';

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
 * newsletter subscriber, merged by email, minus anyone who opted out. Each
 * contact carries their signed unsubscribe link for mail-merge sends.
 */
router.get('/admin/mail-cluster', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const [participants, subscribers, optOuts] = await Promise.all([
            WorkshopRegistration.find({
                status: 'paid',
                $or: [{ lastLoginAt: { $ne: null } }, { loginCount: { $gt: 0 } }]
            })
                .select('name email department year lastLoginAt loginCount')
                .lean(),
            Subscriber.find().select('email source createdAt unsubscribedAt').lean(),
            EmailOptOut.find().select('email').lean()
        ]);

        const { contacts, counts } = buildMailCluster(
            participants,
            subscribers,
            optOuts.map((o) => o.email)
        );
        const siteUrl = process.env.PUBLIC_APP_URL || req.headers.origin || `https://${req.headers.host}`;
        return res.json({
            counts,
            contacts: contacts.map((c) => ({ ...c, unsubscribeUrl: unsubscribeUrl(siteUrl, c.email) }))
        });
    } catch (err) {
        console.error('Error building mail cluster:', err);
        return res.status(500).json({ error: 'Failed to build the mail cluster' });
    }
});

export default router;
