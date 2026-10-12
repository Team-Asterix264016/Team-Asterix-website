import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken, requireSuperAdmin, JWT_SECRET } from '../middleware/auth.js';
import { isMongoConnected } from '../db/mongodb.js';

const router = Router();

/**
 * One-time bootstrap for the first administrator.
 *
 * This replaces the hardcoded credentials that used to live in this file. They
 * were accepted even when the password hash did not match, which meant anyone
 * who read the repository -- or the production JavaScript bundle, where the same
 * pair was shipped -- could obtain a SuperAdmin token.
 *
 * Set `ADMIN_BOOTSTRAP_PASSWORD` in the host environment to let the named
 * account be created on its first successful login, then unset it. There is no
 * other fallback: with the variable unset, only accounts that already exist with
 * a matching bcrypt hash can sign in. `src/scripts/setAdminPassword.js` is the
 * other way in.
 */
const BOOTSTRAP_USERNAME = (process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin').trim().toLowerCase();

async function tryBootstrap(username, password) {
    const configured = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!configured || username !== BOOTSTRAP_USERNAME) return null;
    if (password !== configured) return null;

    const existing = await User.findOne({ username });
    if (existing) return null;

    console.warn(
        `Bootstrapped administrator "${username}" from ADMIN_BOOTSTRAP_PASSWORD. ` +
        'Unset that variable now that the account exists.'
    );
    return User.create({
        username,
        passwordHash: bcrypt.hashSync(password, 10),
        name: 'Team Asterix Administrator',
        role: 'System Administrator',
        accessLevel: 'SuperAdmin'
    });
}

// A constant-cost comparison target, so an unknown username and a wrong password
// cost the same and the timing cannot be used to enumerate accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const cleanUsername = String(username).trim().toLowerCase();
        const trimmedPass = String(password).trim();

        if (!isMongoConnected()) {
            return res.status(503).json({ error: 'Database unavailable. MONGODB_URI is not connected.' });
        }

        let user = await User.findOne({ username: cleanUsername });
        if (!user) {
            user = await tryBootstrap(cleanUsername, trimmedPass);
        }

        const matched = bcrypt.compareSync(trimmedPass, user?.passwordHash || DUMMY_HASH);
        if (!user || !matched) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const tokenPayload = {
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            phone: user.phone || '',
            role: user.role,
            accessLevel: user.accessLevel
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        res.locals.whatsappActivity = { name: user.name || user.username };
        res.json({
            success: true,
            token,
            user: tokenPayload
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error during login', details: err.message });
    }
});

// GET /api/auth/me (Protected)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        if (!isMongoConnected()) {
            return res.status(503).json({ error: 'Database unavailable.' });
        }
        let user = null;
        if (User.base.isValidObjectId(req.user.id)) {
            user = await User.findById(req.user.id).select('-passwordHash');
        }
        if (!user && req.user.username) {
            user = await User.findOne({ username: req.user.username.toLowerCase() }).select('-passwordHash');
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({
            id: user._id.toString(),
            username: user.username,
            name: user.name,
            phone: user.phone || '',
            role: user.role,
            accessLevel: user.accessLevel
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify session', details: err.message });
    }
});

// GET /api/auth/accounts (Protected - Admin)
router.get('/accounts', authenticateToken, async (req, res) => {
    try {
        if (!isMongoConnected()) {
            return res.json([]);
        }
        const users = await User.find().sort({ createdAt: 1 }).select('-passwordHash');
        const accounts = users.map(u => ({
            id: u._id.toString(),
            username: u.username,
            name: u.name,
            phone: u.phone || '',
            role: u.role,
            accessLevel: u.accessLevel,
            createdAt: u.createdAt
        }));
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve accounts', details: err.message });
    }
});

const ACCESS_RANK = { Member: 1, Lead: 2, SuperAdmin: 3 };

// POST /api/auth/accounts (Protected - Admin/Lead)
// Anyone signed in may add teammates, but never above their own access level, and only a
// SuperAdmin can hand out admin roles; otherwise any account could mint a SuperAdmin.
router.post('/accounts', authenticateToken, async (req, res) => {
    try {
        const { username, password, name, phone, role, accessLevel } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Username, password, and name are required.' });
        }
        if (!password || String(password).trim().length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters.' });
        }

        const requestedLevel = accessLevel || 'Lead';
        const requestedRole = String(role || 'Team Member').trim();
        if (!ACCESS_RANK[requestedLevel]) {
            return res.status(400).json({ error: `accessLevel must be one of: ${Object.keys(ACCESS_RANK).join(', ')}.` });
        }
        const isSuperAdmin = req.user.accessLevel === 'SuperAdmin';
        if (ACCESS_RANK[requestedLevel] > (ACCESS_RANK[req.user.accessLevel] || 0)) {
            return res.status(403).json({ error: 'You can only create accounts at or below your own access level.' });
        }
        if (!isSuperAdmin && /^(super\s*admin|admin)$/i.test(requestedRole)) {
            return res.status(403).json({ error: 'Only a SuperAdmin can create admin accounts.' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
            return res.status(409).json({ error: 'A user with that username already exists.' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const user = await User.create({
            username: cleanUsername,
            passwordHash,
            name: name.trim(),
            phone: (phone || '').trim(),
            role: requestedRole,
            accessLevel: requestedLevel
        });

        res.status(201).json({
            success: true,
            account: {
                id: user._id.toString(),
                username: user.username,
                name: user.name,
                phone: user.phone || '',
                role: user.role,
                accessLevel: user.accessLevel
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create account', details: err.message });
    }
});

// PUT /api/auth/accounts/:id (Protected - SuperAdmin or self)
router.put('/accounts/:id', authenticateToken, async (req, res) => {
    try {
        const targetId = req.params.id;
        const { name, phone, role, accessLevel, password } = req.body;

        const isSelf = req.user.id === targetId || req.user.username === targetId;
        const isSuperAdmin = req.user.accessLevel === 'SuperAdmin';

        if (!isSelf && !isSuperAdmin) {
            return res.status(403).json({ error: 'Permission denied.' });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (phone !== undefined) updateData.phone = String(phone).trim();
        if (isSuperAdmin && role) updateData.role = role;
        if (isSuperAdmin && accessLevel) updateData.accessLevel = accessLevel;
        if (password) {
            if (String(password).length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters.' });
            }
            updateData.passwordHash = bcrypt.hashSync(password, 10);
        }

        const filter = User.base.isValidObjectId(targetId) ? { _id: targetId } : { username: targetId.toLowerCase() };
        const user = await User.findOneAndUpdate(filter, { $set: updateData }, { returnDocument: 'after' });
        if (!user) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        res.json({ success: true, message: 'Account updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update account', details: err.message });
    }
});

// DELETE /api/auth/accounts/:id (Protected - SuperAdmin)
router.delete('/accounts/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const targetId = req.params.id;
        const filter = User.base.isValidObjectId(targetId) ? { _id: targetId } : { username: targetId.toLowerCase() };
        const targetUser = await User.findOne(filter);

        if (!targetUser) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        if (targetUser.accessLevel === 'SuperAdmin' || targetUser.username === 'admin1') {
            return res.status(403).json({ error: 'SuperAdmin accounts cannot be deleted.' });
        }

        await User.deleteOne({ _id: targetUser._id });
        res.json({ success: true, message: 'Account removed successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete account', details: err.message });
    }
});

export default router;
