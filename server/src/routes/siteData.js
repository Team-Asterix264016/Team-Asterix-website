import { Router } from 'express';
import SiteConfig from '../models/SiteConfig.js';
import Subsystem from '../models/Subsystem.js';
import TeamMember from '../models/TeamMember.js';
import GalleryItem from '../models/GalleryItem.js';
import TeamUpdate from '../models/TeamUpdate.js';
import SiteData from '../models/SiteData.js';
import { authenticateToken } from '../middleware/auth.js';
import { isMongoConnected } from '../db/mongodb.js';
import { archiveDocuments, actorOf } from '../lib/recycleBin.js';

const router = Router();

/*
 * Removes the rows a save left out, but only when the save is credible.
 *
 * The admin dashboard sends its whole in-memory copy of the site on every
 * save, and the server used to delete everything missing from it. That made a
 * stale browser tab destructive: GET /api/site-data answers with empty arrays
 * while Mongo is disconnected (free-tier Render sleeps, Atlas drops the
 * connection), and a dashboard holding that empty copy — or an older
 * localStorage copy — would delete every member, gallery item and update in
 * the database the next time it autosaved. That is how live data disappeared
 * with nobody deleting anything on purpose.
 *
 * So a payload is now allowed to remove rows only if it still contains some,
 * and only up to PRUNE_MAX_SHARE of what is stored. Anything larger is logged
 * and skipped: an admin who genuinely wants to empty a section deletes the
 * items one at a time. Whatever is pruned is archived first.
 */
const PRUNE_MAX_SHARE = 0.34;

export async function pruneMissing(Model, collectionName, filter, keepIds, { actor, label }) {
    const stored = await Model.countDocuments(filter);
    if (stored === 0) return { pruned: 0 };

    if (keepIds.length === 0) {
        console.warn(`[SITE SYNC] Refused to delete all ${stored} ${label}: the save carried none. Nothing removed.`);
        return { pruned: 0, refused: true, stored };
    }

    const doomed = await Model.find({ ...filter, id: { $nin: keepIds } }).lean();
    if (doomed.length === 0) return { pruned: 0 };

    if (doomed.length / stored > PRUNE_MAX_SHARE) {
        console.warn(`[SITE SYNC] Refused to delete ${doomed.length} of ${stored} ${label} in one save (over ${Math.round(PRUNE_MAX_SHARE * 100)}%). Likely a stale dashboard copy. Nothing removed.`);
        return { pruned: 0, refused: true, stored, wouldDelete: doomed.length };
    }

    await archiveDocuments(collectionName, doomed, { deletedBy: actor, reason: 'omitted from a site-data save' });
    const { deletedCount } = await Model.deleteMany({ _id: { $in: doomed.map(d => d._id) } });
    return { pruned: deletedCount };
}

// Auto-migrate legacy SiteData single-document into the 5 collections if needed
async function autoMigrateLegacySiteData() {
    try {
        const legacy = await SiteData.findOne({ key: 'main' }).lean();
        if (!legacy) return;

        console.log('Migrating legacy SiteData into 5 separate MongoDB collections...');

        // 1. SiteConfig
        await SiteConfig.findOneAndUpdate(
            { key: 'main' },
            {
                $set: {
                    hero: legacy.hero || {},
                    story: legacy.story || '',
                    contact: legacy.contact || {},
                    sponsorship: legacy.sponsorship || {},
                    recruitment: legacy.recruitment || {},
                    workshop: legacy.workshop || {},
                    lastModified: legacy.lastModified || new Date().toISOString()
                }
            },
            { upsert: true }
        );

        // 2. Subsystems & TeamMembers
        if (Array.isArray(legacy.subsystems)) {
            for (let subIdx = 0; subIdx < legacy.subsystems.length; subIdx++) {
                const sub = legacy.subsystems[subIdx];
                if (!sub || !sub.id) continue;

                await Subsystem.findOneAndUpdate(
                    { id: sub.id },
                    {
                        $set: {
                            name: sub.name || '',
                            badge: sub.badge || '',
                            tagline: sub.tagline || '',
                            fullDesc: sub.fullDesc || '',
                            contactEmail: sub.contactEmail || '',
                            order: subIdx
                        }
                    },
                    { upsert: true }
                );

                if (Array.isArray(sub.teamMembers)) {
                    for (let memIdx = 0; memIdx < sub.teamMembers.length; memIdx++) {
                        const m = sub.teamMembers[memIdx];
                        if (!m) continue;
                        const memId = m.id || `mem-${sub.id}-${memIdx}-${Date.now()}`;
                        await TeamMember.findOneAndUpdate(
                            { id: memId },
                            {
                                $set: {
                                    subsystemId: sub.id,
                                    name: m.name || '',
                                    role: m.role || '',
                                    phone: m.phone || '',
                                    initials: m.initials || '',
                                    badge: m.badge || 'SPECIALIST',
                                    status: m.status || 'Active Member',
                                    bio: m.bio || '',
                                    photo: m.photo || '',
                                    photoFit: m.photoFit || 'cover',
                                    photoPosition: m.photoPosition || '50% 50%',
                                    order: memIdx
                                }
                            },
                            { upsert: true }
                        );
                    }
                }
            }
        }

        // 3. GalleryItems
        if (Array.isArray(legacy.gallery)) {
            for (let galIdx = 0; galIdx < legacy.gallery.length; galIdx++) {
                const item = legacy.gallery[galIdx];
                if (!item) continue;
                const galId = item.id || `gal-${galIdx}-${Date.now()}`;
                await GalleryItem.findOneAndUpdate(
                    { id: galId },
                    {
                        $set: {
                            title: item.title || '',
                            category: item.category || 'PIT LANE',
                            year: item.year || '2026',
                            src: item.src || '',
                            desc: item.desc || '',
                            fit: item.fit || 'cover',
                            position: item.position || '50% 50%',
                            order: galIdx
                        }
                    },
                    { upsert: true }
                );
            }
        }

        // 4. TeamUpdates
        if (Array.isArray(legacy.updates)) {
            for (let updIdx = 0; updIdx < legacy.updates.length; updIdx++) {
                const upd = legacy.updates[updIdx];
                if (!upd) continue;
                const updId = upd.id || `upd-${updIdx}-${Date.now()}`;
                await TeamUpdate.findOneAndUpdate(
                    { id: updId },
                    {
                        $set: {
                            label: upd.label || '',
                            tag: upd.tag || 'PROVING GROUNDS',
                            image: upd.image || '',
                            link: upd.link || '#',
                            fit: upd.fit || 'cover',
                            position: upd.position || '50% 50%',
                            order: updIdx
                        }
                    },
                    { upsert: true }
                );
            }
        }

        console.log('Legacy SiteData successfully migrated into 5 collections!');
    } catch (err) {
        console.warn('Auto-migration notice:', err.message);
    }
}

// GET /api/site-data (Public - Aggregates all 5 collections for fast front-page load)
router.get('/', async (req, res) => {
    try {
        if (!isMongoConnected()) {
            /* These empty arrays mean "not loaded", never "the site has no
               members or gallery". `offline` says so explicitly, and
               `lastModified` stays at the epoch so no client mistakes this
               answer for state newer than its own copy and saves it back. */
            return res.json({
                offline: true,
                hero: null,
                story: '',
                subsystems: [],
                gallery: [],
                updates: [],
                contact: null,
                sponsorship: null,
                recruitment: null,
                lastModified: '1970-01-01T00:00:00.000Z'
            });
        }

        // Check if legacy data needs migration
        const configCount = await SiteConfig.countDocuments({ key: 'main' });
        if (configCount === 0) {
            await autoMigrateLegacySiteData();
        }

        const [config, subsystems, allMembers, gallery, updates] = await Promise.all([
            SiteConfig.findOne({ key: 'main' }).lean(),
            Subsystem.find().sort({ order: 1 }).lean(),
            TeamMember.find().sort({ order: 1, createdAt: 1 }).lean(),
            GalleryItem.find().sort({ order: 1, createdAt: -1 }).lean(),
            TeamUpdate.find().sort({ order: 1, createdAt: -1 }).lean()
        ]);

        const aggregatedSubsystems = subsystems.map(sub => ({
            ...sub,
            specifications: sub.specifications || [],
            highlights: sub.highlights || [],
            teamMembers: allMembers.filter(m => m.subsystemId === sub.id)
        }));

        res.json({
            hero: config?.hero || null,
            story: config?.story || '',
            subsystems: aggregatedSubsystems,
            gallery: gallery || [],
            updates: updates || [],
            contact: config?.contact || null,
            sponsorship: config?.sponsorship || null,
            recruitment: config?.recruitment || null,
            workshop: config?.workshop || null,
            lastModified: config?.lastModified || config?.updatedAt?.toISOString() || new Date().toISOString()
        });
    } catch (err) {
        console.error('Error fetching site data:', err);
        res.status(500).json({ error: 'Failed to retrieve site data', details: err.message });
    }
});

// PUT /api/site-data (Protected - Bulk sync across the 5 MongoDB collections)
router.put('/', authenticateToken, async (req, res) => {
    try {
        /* A save that starts while the database is unreachable would apply
           half of itself and prune against a payload nobody can verify, so it
           is refused outright and the dashboard keeps its local copy. */
        if (!isMongoConnected()) {
            return res.status(503).json({ error: 'Database unavailable. Nothing was saved; your changes are still local.' });
        }

        const payload = req.body;
        const actor = actorOf(req);
        const now = new Date().toISOString();

        // 1. Update SiteConfig
        const configFields = { lastModified: now };
        for (const field of ['hero', 'story', 'contact', 'sponsorship', 'recruitment', 'workshop']) {
            if (payload[field] !== undefined) {
                configFields[field] = payload[field];
            }
        }
        const siteConfig = await SiteConfig.findOneAndUpdate(
            { key: 'main' },
            { $set: configFields },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // 2. Sync Subsystems & Members
        if (Array.isArray(payload.subsystems)) {
            for (let subIdx = 0; subIdx < payload.subsystems.length; subIdx++) {
                const sub = payload.subsystems[subIdx];
                if (!sub || !sub.id) continue;

                await Subsystem.findOneAndUpdate(
                    { id: sub.id },
                    {
                        $set: {
                            name: sub.name || '',
                            badge: sub.badge || '',
                            tagline: sub.tagline || '',
                            fullDesc: sub.fullDesc || '',
                            contactEmail: sub.contactEmail || '',
                            order: subIdx
                        }
                    },
                    { upsert: true }
                );

                if (Array.isArray(sub.teamMembers)) {
                    // Sync members in this subsystem
                    const currentMemIds = [];
                    for (let memIdx = 0; memIdx < sub.teamMembers.length; memIdx++) {
                        const m = sub.teamMembers[memIdx];
                        if (!m) continue;
                        const memId = m.id || `mem-${sub.id}-${memIdx}-${Date.now()}`;
                        currentMemIds.push(memId);

                        await TeamMember.findOneAndUpdate(
                            { id: memId },
                            {
                                $set: {
                                    id: memId,
                                    subsystemId: sub.id,
                                    name: m.name || '',
                                    role: m.role || '',
                                    phone: m.phone || '',
                                    initials: m.initials || '',
                                    badge: m.badge || 'SPECIALIST',
                                    status: m.status || 'Active Member',
                                    bio: m.bio || '',
                                    photo: m.photo || '',
                                    photoFit: m.photoFit || 'cover',
                                    photoPosition: m.photoPosition || '50% 50%',
                                    order: memIdx
                                }
                            },
                            { upsert: true }
                        );
                    }
                    // Clean up deleted members for this subsystem
                    await pruneMissing(TeamMember, 'TeamMember', { subsystemId: sub.id }, currentMemIds, {
                        actor, label: `members of subsystem "${sub.id}"`
                    });
                }
            }
        }

        // 3. Sync GalleryItems
        if (Array.isArray(payload.gallery)) {
            const currentGalIds = [];
            for (let galIdx = 0; galIdx < payload.gallery.length; galIdx++) {
                const item = payload.gallery[galIdx];
                if (!item) continue;
                const galId = item.id || `gal-${galIdx}-${Date.now()}`;
                currentGalIds.push(galId);

                await GalleryItem.findOneAndUpdate(
                    { id: galId },
                    {
                        $set: {
                            id: galId,
                            title: item.title || '',
                            category: item.category || 'PIT LANE',
                            year: item.year || '2026',
                            src: item.src || '',
                            desc: item.desc || '',
                            fit: item.fit || 'cover',
                            position: item.position || '50% 50%',
                            order: galIdx
                        }
                    },
                    { upsert: true }
                );
            }
            await pruneMissing(GalleryItem, 'GalleryItem', {}, currentGalIds, { actor, label: 'gallery items' });
        }

        // 4. Sync TeamUpdates
        if (Array.isArray(payload.updates)) {
            const currentUpdIds = [];
            for (let updIdx = 0; updIdx < payload.updates.length; updIdx++) {
                const upd = payload.updates[updIdx];
                if (!upd) continue;
                const updId = upd.id || `upd-${updIdx}-${Date.now()}`;
                currentUpdIds.push(updId);

                await TeamUpdate.findOneAndUpdate(
                    { id: updId },
                    {
                        $set: {
                            id: updId,
                            label: upd.label || '',
                            tag: upd.tag || 'PROVING GROUNDS',
                            image: upd.image || '',
                            link: upd.link || '#',
                            fit: upd.fit || 'cover',
                            position: upd.position || '50% 50%',
                            order: updIdx
                        }
                    },
                    { upsert: true }
                );
            }
            await pruneMissing(TeamUpdate, 'TeamUpdate', {}, currentUpdIds, { actor, label: 'team updates' });
        }

        res.json({
            success: true,
            message: 'Website data saved successfully across 5 MongoDB collections!',
            lastModified: siteConfig.lastModified
        });
    } catch (err) {
        console.error('Error updating site data:', err);
        res.status(500).json({ error: 'Failed to update site data', details: err.message });
    }
});

export default router;
