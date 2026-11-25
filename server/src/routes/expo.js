import { Router } from 'express';
import ExpoRegistration from '../models/ExpoRegistration.js';
import { authenticateToken } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import {
    EXPO_TEAMS,
    EXPO_TEAM_COUNT,
    EXPO_PROBLEM_STATEMENTS,
    EXPO_PS_CAP,
    EXPO_MAX_SUBMISSIONS,
    findTeamMember
} from '../config/expoTeams.js';

const router = Router();

/* Generous: a whole college network can sit behind one address. */
const registerLimit = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 40,
    message: 'Too many submissions from this network. Please try again in a few minutes.'
});

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/** { psId: number of teams on it } for every problem statement. */
async function problemStatementCounts() {
    const counts = Object.fromEntries(Object.keys(EXPO_PROBLEM_STATEMENTS).map((id) => [id, 0]));
    const grouped = await ExpoRegistration.aggregate([{ $group: { _id: '$problemStatement', n: { $sum: 1 } } }]);
    for (const g of grouped) if (g._id in counts) counts[g._id] = g.n;
    return counts;
}

// GET /api/expo/availability (public): how full each problem statement is. Counts only.
router.get('/availability', async (_req, res) => {
    try {
        return res.json({ cap: EXPO_PS_CAP, counts: await problemStatementCounts() });
    } catch (err) {
        console.error('Error reading expo availability:', err);
        return res.status(500).json({ error: 'Could not load problem statement availability.' });
    }
});

// POST /api/expo/registrations (public): register, or update, a team.
router.post('/registrations', registerLimit, async (req, res) => {
    try {
        const teamNo = Number(req.body?.teamNo);
        const teamName = clean(req.body?.teamName).slice(0, 80);
        const problemStatement = clean(req.body?.problemStatement);
        const captainName = clean(req.body?.captainName).slice(0, 100);
        const captainRollNo = clean(req.body?.captainRollNo).replace(/\s+/g, '');
        const captainPhone = clean(req.body?.captainPhone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
        const captainEmail = clean(req.body?.captainEmail).toLowerCase();

        if (!Number.isInteger(teamNo) || !EXPO_TEAMS.has(teamNo)) {
            return res.status(400).json({ error: `Pick your team number (1 to ${EXPO_TEAM_COUNT}).` });
        }
        if (!teamName) return res.status(400).json({ error: 'Enter your team name.' });
        if (!EXPO_PROBLEM_STATEMENTS[problemStatement]) {
            return res.status(400).json({ error: 'Pick a problem statement.' });
        }
        if (!captainName) return res.status(400).json({ error: "Enter the captain's name." });
        if (!/^\d{12}$/.test(captainRollNo)) {
            return res.status(400).json({ error: "Enter the captain's 12-digit register number." });
        }
        if (!/^[6-9]\d{9}$/.test(captainPhone)) {
            return res.status(400).json({ error: "Enter the captain's 10-digit mobile number." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(captainEmail)) {
            return res.status(400).json({ error: "Enter the captain's email address." });
        }
        if (!findTeamMember(teamNo, captainRollNo)) {
            return res.status(400).json({
                error: `Register number ${captainRollNo} is not on Team ${teamNo}'s list. Check the team number, or contact Team Asterix if your team has changed.`
            });
        }

        const existing = await ExpoRegistration.findOne({ teamNo }).lean();
        const lockedError = {
            error: `Team ${teamNo}'s registration can no longer be changed. If something needs correcting, please contact Team Asterix.`,
            locked: true
        };
        if (existing && (existing.submissions || 1) >= EXPO_MAX_SUBMISSIONS) {
            return res.status(403).json(lockedError);
        }

        // A team resubmitting with the problem statement it already holds keeps its slot.
        const keepsSlot = Boolean(existing && existing.problemStatement === problemStatement);
        const psTitle = EXPO_PROBLEM_STATEMENTS[problemStatement];
        const fullError = {
            error: `${psTitle} is full: ${EXPO_PS_CAP} teams have already taken it. Please pick another problem statement.`,
            full: true
        };

        if (!keepsSlot) {
            const taken = await ExpoRegistration.countDocuments({ problemStatement, teamNo: { $ne: teamNo } });
            if (taken >= EXPO_PS_CAP) return res.status(409).json(fullError);
        }

        const fields = { teamName, problemStatement, captainName, captainRollNo, captainPhone, captainEmail };
        if (!keepsSlot) fields.problemStatementAt = new Date();
        if (existing) {
            /* Only counts while the team is under the limit, so two changes sent
               at the same moment cannot both slip past the check above. */
            const saved = await ExpoRegistration.updateOne(
                { teamNo, submissions: { $lt: EXPO_MAX_SUBMISSIONS } },
                { $set: fields, $inc: { submissions: 1 } }
            );
            if (saved.matchedCount === 0) return res.status(403).json(lockedError);
        } else {
            await ExpoRegistration.updateOne(
                { teamNo },
                { $set: fields, $inc: { submissions: 1 }, $setOnInsert: { teamNo } },
                { upsert: true }
            );
        }

        /* Two teams can pass the count above at the same moment for the last
           slot. Slots go by who took the problem statement first, so if this
           team is not among the first EXPO_PS_CAP, it lost the race: put its
           row back exactly as it was and report the statement as full. */
        if (!keepsSlot) {
            const holders = await ExpoRegistration.find({ problemStatement })
                .sort({ problemStatementAt: 1, _id: 1 })
                .limit(EXPO_PS_CAP)
                .select('teamNo')
                .lean();
            if (!holders.some((h) => h.teamNo === teamNo)) {
                if (existing) await ExpoRegistration.replaceOne({ _id: existing._id }, existing);
                else await ExpoRegistration.deleteOne({ teamNo });
                return res.status(409).json(fullError);
            }
        }

        return res.status(existing ? 200 : 201).json({
            success: true,
            updated: Boolean(existing),
            message: existing
                ? `Team ${teamNo}'s registration has been updated.`
                : `Team ${teamNo} is registered for the Expo.`
        });
    } catch (err) {
        console.error('Error saving expo registration:', err);
        return res.status(500).json({ error: 'Could not save the registration. Please try again.' });
    }
});

// GET /api/expo/registrations (admin): every registration plus teams still missing.
router.get('/registrations', authenticateToken, async (_req, res) => {
    try {
        const rows = await ExpoRegistration.find().sort({ teamNo: 1 }).lean();
        const registered = new Set(rows.map((r) => r.teamNo));
        const missingTeams = [...EXPO_TEAMS.keys()].filter((t) => !registered.has(t)).sort((a, b) => a - b);
        return res.json({
            totalTeams: EXPO_TEAM_COUNT,
            cap: EXPO_PS_CAP,
            maxSubmissions: EXPO_MAX_SUBMISSIONS,
            counts: await problemStatementCounts(),
            missingTeams,
            registrations: rows.map((r) => ({
                id: r._id.toString(),
                teamNo: r.teamNo,
                teamName: r.teamName,
                problemStatement: r.problemStatement,
                problemStatementTitle: EXPO_PROBLEM_STATEMENTS[r.problemStatement] || r.problemStatement,
                captainName: r.captainName,
                captainRollNo: r.captainRollNo,
                captainPhone: r.captainPhone,
                captainEmail: r.captainEmail,
                members: (EXPO_TEAMS.get(r.teamNo) || []).map((m) => m.name),
                submissions: r.submissions,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }))
        });
    } catch (err) {
        console.error('Error listing expo registrations:', err);
        return res.status(500).json({ error: 'Could not load expo registrations.' });
    }
});

export default router;
