import { Router } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopProjectSubmission from '../models/WorkshopProjectSubmission.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import { nextSequence } from '../models/Counter.js';
import { authenticateToken, requireSuperAdmin, JWT_SECRET } from '../middleware/auth.js';
import { isMongoConnected } from '../db/mongodb.js';
import {
    WORKSHOP_PACKAGES,
    WORKSHOP_TRACKS,
    WORKSHOP_CURRENCY,
    WORKSHOP_DEPARTMENTS,
    POWERTRAIN_MAX_SEATS,
    SOFTWARE_MAX_SEATS,
    SOFTWARE_REOPEN_TIME,
    SOFTWARE_CLOSE_DEADLINE,
    getSoftwareRegistrationState,
    getWorkshopPackage,
    isPriced
} from '../config/workshopPackages.js';
import {
    isRazorpayConfigured,
    isWebhookConfigured,
    getRazorpayKeyId,
    createRazorpayOrder,
    fetchOrderPayments,
    verifyPaymentSignature,
    verifyWebhookSignature
} from '../lib/razorpay.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// The workshop is for first- and second-years.
const VALID_YEARS = ['1', '2'];
const STATUSES = ['pending', 'paid', 'failed'];

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '').slice(-10);
}

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    next();
}

// Registrations can be viewed by all authenticated admin team members (SuperAdmin, Lead, Member, Admin).
function requireLeadOrAdmin(req, res, next) {
    const level = req.user?.accessLevel || req.user?.role;
    if (!req.user || !['SuperAdmin', 'Lead', 'Member', 'Admin'].includes(level)) {
        return res.status(403).json({ error: 'Forbidden: Admin privileges required.' });
    }
    next();
}

function formatReceiptNo(seq) {
    return `AST-WS-${String(seq).padStart(4, '0')}`;
}

/**
 * Moves a registration to `paid` exactly once, whichever of the checkout
 * callback and the webhook gets there first, and then gives it a receipt
 * number. If isUpgrade is true, upgrades the package to combo and updates the total amount.
 */
async function markPaid(registrationId, paymentId, isUpgrade = false) {
    let reg = await WorkshopRegistration.findById(registrationId);
    if (!reg) return null;

    if (isUpgrade) {
        reg.package = 'combo';
        reg.tracksEnrolled = ['software', 'powertrain'];
        reg.amount = 1750;
        reg.razorpayPaymentId = paymentId;
        reg.status = 'paid';
        reg.paidAt = new Date();
        await reg.save();
        return ensureReceipt(reg);
    }

    if (reg.status === 'paid') {
        return ensureReceipt(reg);
    }

    const claimed = await WorkshopRegistration.findOneAndUpdate(
        { _id: registrationId, status: { $ne: 'paid' } },
        { $set: { status: 'paid', razorpayPaymentId: paymentId, paidAt: new Date() } },
        { returnDocument: 'after' }
    );
    const updated = claimed || await WorkshopRegistration.findById(registrationId);
    return ensureReceipt(updated);
}

async function ensureReceipt(reg) {
    if (!reg || reg.status !== 'paid' || reg.receiptNo) return reg;
    const receiptNo = formatReceiptNo(await nextSequence('workshopReceipt'));
    const updated = await WorkshopRegistration.findOneAndUpdate(
        { _id: reg._id, receiptNo: { $exists: false } },
        { $set: { receiptNo } },
        { returnDocument: 'after' }
    );
    return updated || WorkshopRegistration.findById(reg._id);
}

function publicView(reg) {
    return {
        registrationId: reg._id.toString(),
        name: reg.name,
        email: reg.email,
        package: reg.package,
        packageName: getWorkshopPackage(reg.package)?.name || reg.package,
        tracksEnrolled: reg.tracksEnrolled,
        amount: reg.amount,
        currency: reg.currency,
        status: reg.status,
        receiptNo: reg.receiptNo || null,
        paidAt: reg.paidAt,
        createdAt: reg.createdAt
    };
}

function validateRegistration(body) {
    const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);
    const data = {
        name: str(body.name, 100),
        email: str(body.email, 254).toLowerCase(),
        phone: normalizePhone(body.phone),
        college: str(body.college, 150),
        year: str(body.year, 2),
        department: str(body.department, 100),
        rollNo: str(body.rollNo, 40),
        package: str(body.package, 20).toLowerCase()
    };

    const errors = {};
    if (data.name.length < 2) errors.name = 'Enter your full name.';
    if (!EMAIL_RE.test(data.email)) {
        errors.email = 'Enter a valid email address.';
    } else if (!data.email.endsWith('@psgitech.ac.in')) {
        errors.email = 'Please use your college email address (@psgitech.ac.in).';
    }
    if (data.phone.length !== 10) errors.phone = 'Enter a valid 10-digit phone number.';
    if (!VALID_YEARS.includes(data.year)) errors.year = 'Select 1st or 2nd year.';
    if (!WORKSHOP_DEPARTMENTS.includes(data.department)) errors.department = 'Select your department.';
    if (!data.rollNo) errors.rollNo = 'Enter your roll number.';

    const pkg = getWorkshopPackage(data.package);
    if (!pkg) errors.package = 'Select a valid workshop package.';
    else if (!pkg.open) errors.package = 'Registrations for this package are closed.';
    else if (!isPriced(pkg)) errors.package = 'Pricing for this package has not been announced yet.';

    return { data, pkg, errors };
}

/**
 * Calculates current confirmed paid participants and remaining seats for Powertrain.
 */
export async function getPowertrainSeatStats() {
    try {
        if (!isMongoConnected()) {
            return { maxSeats: POWERTRAIN_MAX_SEATS, paidCount: 0, seatsLeft: POWERTRAIN_MAX_SEATS, soldOut: false };
        }
        const paidCount = await WorkshopRegistration.countDocuments({
            status: 'paid',
            package: { $in: ['powertrain', 'combo'] }
        });
        const seatsLeft = Math.max(0, POWERTRAIN_MAX_SEATS - paidCount);
        return {
            maxSeats: POWERTRAIN_MAX_SEATS,
            paidCount,
            seatsLeft,
            soldOut: seatsLeft <= 0
        };
    } catch (err) {
        console.error('Error calculating powertrain seat stats:', err);
        return { maxSeats: POWERTRAIN_MAX_SEATS, paidCount: 0, seatsLeft: POWERTRAIN_MAX_SEATS, soldOut: false };
    }
}

/**
 * Calculates current confirmed paid participants and remaining seats for Software,
 * enforcing bank maintenance pause, Monday 6 AM reopening, Tuesday 11:59 PM deadline,
 * and 160 max seats capacity limit.
 */
export async function getSoftwareSeatStats() {
    try {
        let paidCount = 0;
        if (isMongoConnected()) {
            paidCount = await WorkshopRegistration.countDocuments({
                status: 'paid',
                package: { $in: ['software', 'combo'] }
            });
        }
        const state = getSoftwareRegistrationState(Date.now(), paidCount);
        return {
            maxSeats: SOFTWARE_MAX_SEATS,
            paidCount,
            seatsLeft: state.seatsLeft,
            soldOut: state.isCapacityFull,
            isPaused: state.isPaused,
            isPastDeadline: state.isPastDeadline,
            isClosed: state.isClosed,
            open: state.isOpen,
            pauseMessage: state.pauseReason,
            scheduleSummary: state.scheduleSummary,
            reopenTime: state.reopenTime,
            deadline: state.deadline
        };
    } catch (err) {
        console.error('Error calculating software seat stats:', err);
        const state = getSoftwareRegistrationState(Date.now(), 0);
        return {
            maxSeats: SOFTWARE_MAX_SEATS,
            paidCount: 0,
            seatsLeft: SOFTWARE_MAX_SEATS,
            soldOut: false,
            isPaused: state.isPaused,
            isPastDeadline: state.isPastDeadline,
            isClosed: state.isClosed,
            open: state.isOpen,
            pauseMessage: state.pauseReason,
            scheduleSummary: state.scheduleSummary,
            reopenTime: state.reopenTime,
            deadline: state.deadline
        };
    }
}

/**
 * GET /api/workshop/packages
 * Public package catalogue with real-time seat status for front end.
 */
router.get('/packages', async (req, res) => {
    const [powertrainSeats, softwareSeats] = await Promise.all([
        getPowertrainSeatStats(),
        getSoftwareSeatStats()
    ]);
    const comboSoldOut = powertrainSeats.soldOut || softwareSeats.soldOut;
    const comboSeatsLeft = Math.min(powertrainSeats.seatsLeft, softwareSeats.seatsLeft);

    res.json({
        success: true,
        currency: WORKSHOP_CURRENCY,
        tracks: WORKSHOP_TRACKS,
        packages: WORKSHOP_PACKAGES.map(pkg => {
            if (pkg.id === 'powertrain') {
                return {
                    ...pkg,
                    seatsLeft: powertrainSeats.seatsLeft,
                    soldOut: powertrainSeats.soldOut,
                    open: powertrainSeats.soldOut ? false : pkg.open
                };
            }
            if (pkg.id === 'software') {
                return {
                    ...pkg,
                    seatsLeft: softwareSeats.seatsLeft,
                    soldOut: softwareSeats.soldOut,
                    open: softwareSeats.open,
                    isPaused: softwareSeats.isPaused,
                    pauseMessage: softwareSeats.pauseMessage,
                    isPastDeadline: softwareSeats.isPastDeadline,
                    scheduleSummary: softwareSeats.scheduleSummary
                };
            }
            if (pkg.id === 'combo') {
                return {
                    ...pkg,
                    seatsLeft: comboSeatsLeft,
                    soldOut: comboSoldOut,
                    open: false
                };
            }
            return pkg;
        }),
        powertrainSeats,
        softwareSeats,
        comboSeats: {
            seatsLeft: comboSeatsLeft,
            soldOut: comboSoldOut,
            isPaused: softwareSeats.isPaused
        }
    });
});

/**
 * GET /api/workshop/seats
 * Public. Returns real-time capacity and remaining seats for Powertrain (cap 160) and Software (cap 160).
 */
router.get('/seats', async (req, res) => {
    const [powertrainSeats, softwareSeats] = await Promise.all([
        getPowertrainSeatStats(),
        getSoftwareSeatStats()
    ]);
    res.json({
        success: true,
        powertrain: powertrainSeats,
        software: softwareSeats,
        combo: {
            seatsLeft: Math.min(powertrainSeats.seatsLeft, softwareSeats.seatsLeft),
            soldOut: powertrainSeats.soldOut || softwareSeats.soldOut
        }
    });
});

/**
 * POST /api/workshop/register
 * Public. Validates the form, records a pending registration and creates a
 * Razorpay order. The amount comes from the package config; any amount in
 * the request body is ignored.
 */
router.post('/register', requireDb, async (req, res) => {
    try {
        if (!isRazorpayConfigured()) {
            return res.status(503).json({ error: 'Online payments are not configured yet. Please try again later.' });
        }

        const { data, pkg, errors } = validateRegistration(req.body || {});
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: 'Please correct the highlighted fields.', fields: errors });
        }

        // Enforce 160 seats capacity limit for Powertrain
        if (pkg.id === 'powertrain') {
            const seatStats = await getPowertrainSeatStats();
            if (seatStats.soldOut) {
                return res.status(409).json({
                    error: 'Electronics & Powertrain workshop registrations are fully booked (160 seats filled).',
                    soldOut: true,
                    seatsLeft: 0
                });
            }
        }

        // Combo is unavailable as Powertrain is full
        if (pkg.id === 'combo') {
            return res.status(409).json({
                error: 'Combo package registrations are closed as Electronics & Powertrain seats are completely filled. Only the Software track is available.',
                soldOut: true,
                seatsLeft: 0
            });
        }

        // Enforce bank maintenance pause, capacity (200 seats) and deadline for Software
        if (pkg.id === 'software') {
            const seatStats = await getSoftwareSeatStats();
            if (seatStats.isPaused) {
                return res.status(503).json({
                    error: seatStats.pauseMessage || 'Registrations are temporarily paused while our team resolves a technical issue on the banking partner\'s side. Registrations will reopen tomorrow (Monday) morning at 6:00 AM.',
                    isPaused: true
                });
            }
            if (seatStats.isPastDeadline) {
                return res.status(409).json({
                    error: 'Software & Autonomous Systems workshop registrations closed on Tuesday, 6 October at 11:59 PM.',
                    closed: true
                });
            }
            if (seatStats.soldOut) {
                return res.status(409).json({
                    error: 'Software & Autonomous Systems workshop registrations are fully booked (no seats remaining).',
                    soldOut: true,
                    seatsLeft: 0
                });
            }
        }

        // Refuse a second payment for a track this person already holds, and offer upgrade if single-track.
        const alreadyPaid = await WorkshopRegistration.findOne({
            status: 'paid',
            tracksEnrolled: { $in: pkg.tracksIncluded },
            $or: [{ email: data.email }, { phone: data.phone }]
        });
        if (alreadyPaid) {
            const softwareSeatStats = await getSoftwareSeatStats();
            const canUpgrade = alreadyPaid.package === 'powertrain' && !softwareSeatStats.isPaused && !softwareSeatStats.isClosed;
            return res.status(409).json({
                error: `You are already registered for ${getWorkshopPackage(alreadyPaid.package)?.name || alreadyPaid.package} (receipt ${alreadyPaid.receiptNo || 'pending'}).`,
                alreadyPaid: true,
                canUpgrade,
                existingRegistrationId: alreadyPaid._id.toString(),
                existingPackage: alreadyPaid.package,
                existingName: alreadyPaid.name,
                upgradePrice: 750
            });
        }

        // Reuse or update any existing pending registration for this student to prevent duplicate rows
        let registration = await WorkshopRegistration.findOne({
            status: 'pending',
            $or: [{ email: data.email }, { phone: data.phone }, { rollNo: data.rollNo }]
        });

        if (registration) {
            Object.assign(registration, data, {
                package: pkg.id,
                tracksEnrolled: pkg.tracksIncluded,
                amount: pkg.price,
                currency: WORKSHOP_CURRENCY,
                status: 'pending'
            });
            await registration.save();
        } else {
            registration = await WorkshopRegistration.create({
                ...data,
                package: pkg.id,
                tracksEnrolled: pkg.tracksIncluded,
                amount: pkg.price,
                currency: WORKSHOP_CURRENCY,
                status: 'pending'
            });
        }

        let order;
        try {
            order = await createRazorpayOrder({
                amountPaise: Math.round(pkg.price * 100),
                currency: WORKSHOP_CURRENCY,
                receipt: registration._id.toString(),
                notes: { registrationId: registration._id.toString(), package: pkg.id }
            });
        } catch (orderErr) {
            console.error('Workshop order creation failed:', orderErr.message);
            registration.status = 'failed';
            await registration.save();
            return res.status(502).json({ error: 'Could not start the payment. Please try again.' });
        }

        registration.razorpayOrderId = order.id;
        await registration.save();

        res.locals.whatsappActivity = { type: 'registration', name: data.name };
        res.status(201).json({
            success: true,
            registrationId: registration._id.toString(),
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            },
            keyId: getRazorpayKeyId(),
            package: { id: pkg.id, name: pkg.name, price: pkg.price },
            prefill: { name: data.name, email: data.email, contact: data.phone }
        });
    } catch (err) {
        console.error('Workshop registration error:', err);
        res.status(500).json({ error: 'Failed to record registration.' });
    }
});

/**
 * POST /api/workshop/upgrade
 * Initiates Razorpay checkout to upgrade an existing single-track registration to Combo for 750.
 */
router.post('/upgrade', requireDb, async (req, res) => {
    try {
        if (!isRazorpayConfigured()) {
            return res.status(503).json({ error: 'Online payments are not configured yet. Please try again later.' });
        }

        const { registrationId, email, phone, rollNo } = req.body || {};
        let reg = null;

        if (registrationId) {
            reg = await WorkshopRegistration.findById(registrationId);
        } else if (rollNo || email || phone) {
            const query = { status: 'paid' };
            const orConditions = [];
            if (rollNo) orConditions.push({ rollNo: String(rollNo).trim() });
            if (email) orConditions.push({ email: String(email).toLowerCase().trim() });
            if (phone) orConditions.push({ phone: normalizePhone(phone) });
            if (orConditions.length > 0) query.$or = orConditions;
            reg = await WorkshopRegistration.findOne(query).sort({ createdAt: -1 });
        }

        if (!reg || reg.status !== 'paid') {
            return res.status(404).json({ error: 'No paid single-track registration found to upgrade.' });
        }

        if (reg.package === 'combo' || (Array.isArray(reg.tracksEnrolled) && reg.tracksEnrolled.length >= 2)) {
            return res.status(400).json({ error: 'This registration is already enrolled in the full Combo package.' });
        }

        // Upgrading from Software to Combo claims a seat in Powertrain
        if (reg.package === 'software') {
            return res.status(409).json({
                error: 'Electronics & Powertrain track has reached full capacity (160 seats filled). Upgrades from Software to Combo are not available.',
                soldOut: true,
                seatsLeft: 0
            });
        }

        // Upgrading from Powertrain to Combo claims a seat in Software
        if (reg.package === 'powertrain') {
            const seatStats = await getSoftwareSeatStats();
            if (seatStats.isPaused) {
                return res.status(409).json({
                    error: seatStats.pauseMessage || 'Combo upgrades are temporarily paused while banking partner maintenance is underway. Upgrades will reopen tomorrow (Monday) at 6:00 AM alongside Software track registrations.',
                    isPaused: true
                });
            }
            if (seatStats.isPastDeadline) {
                return res.status(409).json({
                    error: 'Software & Autonomous Systems track upgrades closed on Tuesday, 6 October at 11:59 PM.',
                    closed: true
                });
            }
            if (seatStats.soldOut || seatStats.seatsLeft <= 0) {
                return res.status(409).json({
                    error: 'Software & Autonomous Systems track has reached maximum capacity. Upgrades to Combo are currently closed.',
                    soldOut: true,
                    seatsLeft: 0
                });
            }
        }

        const upgradePrice = 750;
        const order = await createRazorpayOrder({
            amountPaise: Math.round(upgradePrice * 100),
            currency: WORKSHOP_CURRENCY,
            receipt: `upg_${reg._id.toString()}`,
            notes: {
                registrationId: reg._id.toString(),
                type: 'upgrade',
                targetPackage: 'combo'
            }
        });

        reg.razorpayOrderId = order.id;
        await reg.save();

        res.json({
            success: true,
            registrationId: reg._id.toString(),
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            },
            keyId: getRazorpayKeyId(),
            package: { id: 'combo', name: 'Dual-Track Combo (Upgrade)', price: upgradePrice },
            prefill: { name: reg.name, email: reg.email, contact: reg.phone }
        });
    } catch (err) {
        console.error('Workshop upgrade order creation failed:', err);
        res.status(500).json({ error: 'Failed to initiate workshop upgrade.' });
    }
});

/**
 * POST /api/workshop/verify
 * Called by the front end with the fields the Razorpay checkout returns.
 * Marks the registration paid only if the signature checks out.
 */
router.post('/verify', requireDb, async (req, res) => {
    try {
        const {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature
        } = req.body || {};

        if (!verifyPaymentSignature(orderId, paymentId, signature)) {
            return res.status(400).json({ error: 'Payment verification failed.' });
        }

        const reg = await WorkshopRegistration.findOne({ razorpayOrderId: String(orderId) });
        if (!reg) {
            return res.status(404).json({ error: 'Registration not found for this order.' });
        }

        // If this registration is already paid with this exact payment, duplicate verify call -> return idempotently
        if (reg.status === 'paid' && reg.razorpayPaymentId === String(paymentId)) {
            const withReceipt = await ensureReceipt(reg);
            return res.json({ success: true, registration: publicView(withReceipt), upgraded: false });
        }

        // An upgrade is ONLY valid if the user was already paid single-track and this checkout payment was captured for 750 (75000 paise)
        let isUpgrade = false;
        if (reg.status === 'paid' && reg.package !== 'combo') {
            try {
                const payments = await fetchOrderPayments(orderId);
                const captured = payments.find(p => p.id === String(paymentId) || p.status === 'captured');
                if (captured && captured.amount === 75000) {
                    isUpgrade = true;
                }
            } catch (err) {
                console.error('Error verifying upgrade payment amount:', err.message);
            }
        }

        const paid = await markPaid(reg._id, String(paymentId), isUpgrade);
        res.json({ success: true, registration: publicView(paid), upgraded: isUpgrade });
    } catch (err) {
        console.error('Workshop payment verification error:', err);
        res.status(500).json({ error: 'Failed to verify payment.' });
    }
});

/**
 * POST /api/workshop/webhook
 * Razorpay webhook, a backup for when the browser never reaches /verify
 * (closed tab, dropped connection). index.js mounts a raw body parser on this
 * path so the signature is checked against the exact bytes Razorpay sent.
 */
router.post('/webhook', async (req, res) => {
    try {
        if (!isWebhookConfigured()) {
            // Secret not added yet: say so plainly instead of "invalid signature".
            // Non-2xx also means Razorpay keeps the event and retries it later.
            console.warn('Workshop webhook received but RAZORPAY_WEBHOOK_SECRET is not set.');
            return res.status(503).json({ error: 'Webhook not configured.' });
        }
        const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
        if (!verifyWebhookSignature(rawBody, req.headers['x-razorpay-signature'])) {
            return res.status(400).json({ error: 'Invalid signature.' });
        }
        if (!isMongoConnected()) {
            // Non-2xx makes Razorpay retry later.
            return res.status(503).json({ error: 'Database unavailable.' });
        }

        const event = JSON.parse(rawBody.toString('utf8'));
        const payment = event?.payload?.payment?.entity;
        if (!payment?.order_id) return res.json({ received: true });

        const reg = await WorkshopRegistration.findOne({ razorpayOrderId: payment.order_id });
        if (!reg) return res.json({ received: true });

        if (event.event === 'payment.captured') {
            const isUpgrade = reg.status === 'paid' && reg.package !== 'combo' && payment.amount === 75000;
            const expectedPaise = isUpgrade ? 75000 : Math.round(reg.amount * 100);
            if (payment.amount !== expectedPaise || payment.currency !== reg.currency) {
                console.error(`Workshop webhook amount mismatch on ${payment.order_id}: got ${payment.amount} ${payment.currency}, expected ${expectedPaise} ${reg.currency}`);
                return res.json({ received: true });
            }
            await markPaid(reg._id, payment.id, isUpgrade);
        } else if (event.event === 'payment.failed') {
            await WorkshopRegistration.updateOne(
                { _id: reg._id, status: 'pending' },
                { $set: { status: 'failed', razorpayPaymentId: payment.id || '' } }
            );
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Workshop webhook error:', err);
        res.status(500).json({ error: 'Webhook processing failed.' });
    }
});

/**
 * GET /api/workshop/status/:id
 * Public, minimal view of one registration for the confirmation page.
 */
router.get('/status/:id', requireDb, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ error: 'Registration not found.' });
        }
        const reg = await ensureReceipt(await WorkshopRegistration.findById(req.params.id));
        if (!reg) return res.status(404).json({ error: 'Registration not found.' });
        res.json({ success: true, registration: publicView(reg) });
    } catch (err) {
        console.error('Workshop status error:', err);
        res.status(500).json({ error: 'Failed to fetch registration.' });
    }
});

/* Name + register number are known to classmates, so this lookup is throttled
   and returns the email and phone masked. Render's proxy appends the real
   client address as the last X-Forwarded-For entry; earlier entries can be
   set by the client, so only the last one is used. */
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;
const LOOKUP_MAX = 10;
const lookupHits = new Map();

function clientKey(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
    return forwarded[forwarded.length - 1] || req.socket.remoteAddress || 'unknown';
}

function lookupLimited(req) {
    const now = Date.now();
    const key = clientKey(req);
    const hits = (lookupHits.get(key) || []).filter(t => now - t < LOOKUP_WINDOW_MS);
    hits.push(now);
    lookupHits.set(key, hits);
    if (lookupHits.size > 5000) {
        for (const [k, times] of lookupHits) {
            if (times.every(t => now - t >= LOOKUP_WINDOW_MS)) lookupHits.delete(k);
        }
    }
    return hits.length > LOOKUP_MAX;
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskEmail(email) {
    const [user, domain] = String(email || '').split('@');
    if (!domain) return '';
    return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

function maskPhone(phone) {
    const digits = String(phone || '');
    return digits ? `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}` : '';
}

/**
 * POST /api/workshop/receipt-lookup
 * Body: { name, rollNo }. Paid registrations matching both (case and extra
 * spaces ignored), for students re-downloading a receipt they lost.
 */
router.post('/receipt-lookup', requireDb, async (req, res) => {
    try {
        if (lookupLimited(req)) {
            return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
        }
        const rollNo = String(req.body?.rollNo ?? '').trim().slice(0, 100);
        const phone = String(req.body?.phone ?? req.body?.mobile ?? '').trim();
        const email = String(req.body?.email ?? '').trim().toLowerCase();
        const query = String(req.body?.query ?? '').trim();

        const rawTerms = [rollNo, phone, email, query].filter(Boolean);
        if (rawTerms.length === 0) {
            return res.status(400).json({ error: 'Enter your College Registration Number, Roll Number, Email, or Phone Number.' });
        }

        const orConditions = [];
        for (const raw of rawTerms) {
            const term = raw.trim();
            if (!term) continue;

            // Direct rollNo match (case-insensitive)
            orConditions.push({ rollNo: new RegExp(`^\\s*${escapeRegex(term)}\\s*$`, 'i') });

            // Direct email match
            orConditions.push({ email: term.toLowerCase() });
            orConditions.push({ email: new RegExp(`^${escapeRegex(term.toLowerCase())}$`, 'i') });

            // If term looks like a college email prefix / roll no (e.g. "26m125" or "26z182"), match email starting with term + "@"
            if (/^[a-z0-9_-]+$/i.test(term)) {
                orConditions.push({ email: new RegExp(`^${escapeRegex(term.toLowerCase())}@`, 'i') });
            }

            // Receipt number match (e.g. "AST-WS-0028" or "0028" or "28")
            if (/^AST-WS-\d+$/i.test(term)) {
                orConditions.push({ receiptNo: term.toUpperCase() });
            } else if (/^\d{1,4}$/.test(term)) {
                orConditions.push({ receiptNo: formatReceiptNo(parseInt(term, 10)) });
            }

            // Phone match (clean 10 digits)
            const digits = normalizePhone(term);
            if (digits.length >= 10) {
                orConditions.push({ phone: digits.slice(-10) });
            }
            orConditions.push({ phone: term });

            // Order ID / Payment ID
            if (term.startsWith('order_')) {
                orConditions.push({ razorpayOrderId: term });
            }
            if (term.startsWith('pay_')) {
                orConditions.push({ razorpayPaymentId: term });
            }

            // Partial roll number or name if length >= 4 and not an email
            if (term.length >= 4 && !term.includes('@')) {
                orConditions.push({ rollNo: new RegExp(escapeRegex(term), 'i') });
                orConditions.push({ name: new RegExp(escapeRegex(term), 'i') });
            }
        }

        const regs = await WorkshopRegistration.find({
            status: 'paid',
            $or: orConditions
        }).sort({ paidAt: -1 }).limit(5);

        if (regs.length === 0) {
            // Check if there is a pending registration that was actually captured in Razorpay
            const pendingMatches = await WorkshopRegistration.find({
                status: 'pending',
                razorpayOrderId: { $exists: true, $ne: '' },
                $or: orConditions
            }).limit(3);

            for (const pending of pendingMatches) {
                try {
                    const payments = await fetchOrderPayments(pending.razorpayOrderId);
                    const captured = payments.find(p => p.status === 'captured');
                    if (captured) {
                        const isUpgrade = pending.package !== 'combo' && captured.amount === 75000;
                        const updated = await markPaid(pending._id, captured.id, isUpgrade);
                        if (updated && updated.status === 'paid') {
                            regs.push(updated);
                        }
                    }
                } catch (err) {
                    console.error('Error during auto-reconciliation on lookup:', err);
                }
            }
        }

        if (regs.length === 0) {
            return res.status(404).json({
                error: 'No paid registration found for that detail. Please verify your Registration Number, Roll Number, Email, or Phone Number.'
            });
        }

        const receipts = [];
        for (const reg of regs) {
            const withReceipt = await ensureReceipt(reg);
            receipts.push({
                ...publicView(withReceipt),
                rollNo: withReceipt.rollNo,
                department: withReceipt.department,
                year: withReceipt.year,
                email: maskEmail(withReceipt.email),
                phone: maskPhone(withReceipt.phone)
            });
        }
        res.json({ success: true, receipts });
    } catch (err) {
        console.error('Workshop receipt lookup error:', err);
        res.status(500).json({ error: 'Could not look up your receipt. Please try again.' });
    }
});

const CSV_COLUMNS = [
    ['receiptNo', 'Receipt No'],
    ['name', 'Name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['college', 'College'],
    ['year', 'Year'],
    ['department', 'Department'],
    ['rollNo', 'Roll No'],
    ['package', 'Package'],
    ['tracksEnrolled', 'Tracks'],
    ['amount', 'Amount (INR)'],
    ['status', 'Status'],
    ['razorpayOrderId', 'Razorpay Order ID'],
    ['razorpayPaymentId', 'Razorpay Payment ID'],
    ['paidAt', 'Paid At'],
    ['createdAt', 'Registered At']
];

function csvCell(value) {
    let text;
    if (value == null) text = '';
    else if (Array.isArray(value)) text = value.join('+');
    else if (value instanceof Date) text = value.toISOString();
    else text = String(value);
    // Spreadsheet formula injection guard: these fields are user-supplied.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

/**
 * GET /api/workshop/registrations/superadmin-security
 * Strictly Protected: SuperAdmin only.
 * Returns participant login history, timestamps, and custom passwords.
 */
router.get('/registrations/superadmin-security', authenticateToken, requireSuperAdmin, requireDb, async (req, res) => {
    try {
        const registrations = await WorkshopRegistration.find({ status: 'paid' })
            .sort({ lastLoginAt: -1, passwordUpdatedAt: -1, receiptNo: -1, createdAt: -1 })
            .lean();

        const auditList = registrations.map((r) => {
            const isCustomPassword = Boolean(r.passwordHash);
            const password = isCustomPassword
                ? (r.customPasswordText || '[Custom Password Set]')
                : 'asterix (Default)';

            return {
                id: r._id,
                name: r.name,
                email: r.email,
                phone: r.phone,
                rollNo: r.rollNo,
                department: r.department,
                year: r.year,
                package: r.package,
                packageName: r.packageName || r.package,
                receiptNo: r.receiptNo,
                status: r.status,
                lastLoginAt: r.lastLoginAt || null,
                loginCount: r.loginCount || 0,
                isCustomPassword,
                customPasswordText: password,
                passwordUpdatedAt: r.passwordUpdatedAt || null,
                paidAt: r.paidAt
            };
        });

        const summary = {
            totalPaid: registrations.length,
            hasLoggedIn: registrations.filter((r) => r.lastLoginAt || r.loginCount > 0).length,
            customPasswordSet: registrations.filter((r) => r.passwordHash).length,
            usingDefaultPassword: registrations.filter((r) => !r.passwordHash).length
        };

        return res.json({
            ok: true,
            auditList,
            summary
        });
    } catch (err) {
        console.error('Error fetching SuperAdmin security audit:', err);
        return res.status(500).json({ error: 'Failed to fetch SuperAdmin security audit' });
    }
});

/**
 * GET /api/workshop/registrations?package=&track=&status=&format=csv
 * Protected: SuperAdmins, Leads, and Members.
 */
router.get('/registrations', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const { package: pkgId, track, status, format } = req.query;
        const filter = {};

        if (pkgId && pkgId !== 'all') {
            if (!getWorkshopPackage(pkgId)) return res.status(400).json({ error: 'Unknown package.' });
            filter.package = String(pkgId).toLowerCase().trim();
        }
        if (track && track !== 'all') {
            if (!WORKSHOP_TRACKS[track]) return res.status(400).json({ error: 'Unknown track.' });
            filter.tracksEnrolled = track;
        }
        if (status && status !== 'all') {
            if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
            filter.status = status;
        }

        const allRegistrations = await WorkshopRegistration.find({}).sort({ createdAt: -1 }).lean();

        // Identify which candidate identifiers already have a confirmed paid registration
        const paidCandidateKeys = new Set();
        for (const r of allRegistrations) {
            if (r.status === 'paid') {
                if (r.rollNo) paidCandidateKeys.add(r.rollNo.toLowerCase().trim());
                if (r.email) paidCandidateKeys.add(r.email.toLowerCase().trim());
                const cleanPhone = normalizePhone(r.phone);
                if (cleanPhone) paidCandidateKeys.add(cleanPhone);
            }
        }

        const rawList = await WorkshopRegistration.find(filter).sort({ receiptNo: -1, paidAt: -1, createdAt: -1 }).lean();

        // Annotate each registration with supersession info
        const registrations = rawList.map(r => {
            const isPending = r.status === 'pending';
            const candidatePaid = isPending && (
                (r.rollNo && paidCandidateKeys.has(r.rollNo.toLowerCase().trim())) ||
                (r.email && paidCandidateKeys.has(r.email.toLowerCase().trim())) ||
                (r.phone && paidCandidateKeys.has(normalizePhone(r.phone)))
            );
            return {
                ...r,
                isSuperseded: Boolean(candidatePaid)
            };
        });

        if (format === 'csv') {
            const lines = [
                CSV_COLUMNS.map(([, label]) => csvCell(label)).join(','),
                ...registrations.map(r => CSV_COLUMNS.map(([key]) => csvCell(r[key])).join(','))
            ];
            const stamp = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="workshop-registrations-${stamp}.csv"`);
            // BOM so Excel reads UTF-8 names correctly.
            return res.send('﻿' + lines.join('\r\n'));
        }

        const summary = {
            total: allRegistrations.length,
            paid: 0,
            pending: 0,
            failed: 0,
            revenue: 0,
            supersededPending: 0,
            trulyPending: 0
        };

        for (const r of allRegistrations) {
            summary[r.status] = (summary[r.status] || 0) + 1;
            if (r.status === 'paid') {
                summary.revenue += r.amount;
            } else if (r.status === 'pending') {
                const candidatePaid = (
                    (r.rollNo && paidCandidateKeys.has(r.rollNo.toLowerCase().trim())) ||
                    (r.email && paidCandidateKeys.has(r.email.toLowerCase().trim())) ||
                    (r.phone && paidCandidateKeys.has(normalizePhone(r.phone)))
                );
                if (candidatePaid) {
                    summary.supersededPending += 1;
                } else {
                    summary.trulyPending += 1;
                }
            }
        }

        const powertrainAlonePaid = allRegistrations.filter(r => r.status === 'paid' && r.package === 'powertrain').length;
        const comboPaid = allRegistrations.filter(r => r.status === 'paid' && r.package === 'combo').length;
        const softwareAlonePaid = allRegistrations.filter(r => r.status === 'paid' && r.package === 'software').length;
        const totalPowertrainPaid = powertrainAlonePaid + comboPaid;
        const totalSoftwarePaid = softwareAlonePaid + comboPaid;

        summary.powertrainCapacity = {
            maxSeats: POWERTRAIN_MAX_SEATS,
            powertrainAlonePaid,
            comboPaid,
            softwareAlonePaid,
            totalPowertrainPaid,
            seatsLeft: Math.max(0, POWERTRAIN_MAX_SEATS - totalPowertrainPaid),
            soldOut: totalPowertrainPaid >= POWERTRAIN_MAX_SEATS
        };

        summary.softwareCapacity = {
            maxSeats: SOFTWARE_MAX_SEATS,
            softwareAlonePaid,
            comboPaid,
            totalSoftwarePaid,
            seatsLeft: Math.max(0, SOFTWARE_MAX_SEATS - totalSoftwarePaid),
            soldOut: totalSoftwarePaid >= SOFTWARE_MAX_SEATS
        };

        res.json({ success: true, summary, registrations });
    } catch (err) {
        console.error('Error fetching workshop registrations:', err);
        res.status(500).json({ error: 'Failed to fetch registrations.' });
    }
});

router.put('/registrations/:id', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid registration ID.' });
        }

        const body = req.body || {};
        const studentFields = {
            name: String(body.name || '').trim(),
            email: String(body.email || '').trim().toLowerCase(),
            phone: String(body.phone || '').trim(),
            college: String(body.college || '').trim(),
            year: String(body.year || '').trim(),
            department: String(body.department || '').trim(),
            rollNo: String(body.rollNo || '').trim()
        };
        if (Object.values(studentFields).some((value, index) => index !== 3 && !value)) {
            return res.status(400).json({ error: 'Name, email, phone, year, department, and registered number are required.' });
        }
        if (!EMAIL_RE.test(studentFields.email)) {
            return res.status(400).json({ error: 'Enter a valid email address.' });
        }
        if (normalizePhone(studentFields.phone).length !== 10) {
            return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
        }

        const registration = await WorkshopRegistration.findByIdAndUpdate(
            id,
            { $set: studentFields },
            { new: true, runValidators: true }
        );
        if (!registration) return res.status(404).json({ error: 'Workshop registration not found.' });

        await WorkshopProjectSubmission.updateOne(
            { registrationId: registration._id },
            { $set: studentFields }
        );

        res.json({ success: true, registration });
    } catch (err) {
        console.error('Error updating workshop student details:', err);
        res.status(500).json({ error: 'Could not update the student record.' });
    }
});

/**
 * POST /api/workshop/registrations/:id/verify-razorpay
 * Protected: SuperAdmins, Leads, and Members.
 * Strictly verifies payment with Razorpay API.
 * Refuses to mark paid unless Razorpay API explicitly confirms status === 'captured'.
 */
router.post('/registrations/:id/verify-razorpay', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid registration ID.' });
        }

        const reg = await WorkshopRegistration.findById(id);
        if (!reg) {
            return res.status(404).json({ error: 'Registration not found.' });
        }

        if (reg.status === 'paid') {
            const withReceipt = await ensureReceipt(reg);
            return res.json({ success: true, message: 'Registration is already confirmed as paid.', registration: publicView(withReceipt) });
        }

        if (!reg.razorpayOrderId) {
            return res.status(400).json({ error: 'No Razorpay order ID exists for this registration.' });
        }

        const payments = await fetchOrderPayments(reg.razorpayOrderId);
        const captured = payments.find(p => p.status === 'captured');

        if (!captured) {
            const lastStatus = payments[0]?.status || 'no payment recorded in Razorpay';
            return res.status(400).json({
                error: `Razorpay reports this order is NOT paid. Status in Razorpay: "${lastStatus}". Only payments confirmed captured by Razorpay can be marked as paid.`
            });
        }

        const isUpgrade = reg.package !== 'combo' && captured.amount === 75000;
        const updated = await markPaid(reg._id, captured.id, isUpgrade);

        console.log(`[RAZORPAY VERIFIED] Order ${reg.razorpayOrderId} confirmed captured by Razorpay. Marked PAID with payment ID ${captured.id}`);
        res.json({
            success: true,
            message: `Razorpay confirmed payment of ₹${(captured.amount / 100).toFixed(2)} (${captured.id}). Receipt ${updated.receiptNo} generated!`,
            registration: updated
        });
    } catch (err) {
        console.error('Error verifying registration with Razorpay:', err);
        res.status(500).json({ error: 'Failed to verify status with Razorpay API.' });
    }
});

/**
 * POST /api/workshop/registrations/sync-razorpay
 * Protected: SuperAdmins, Leads, and Members.
 * Checks all pending registrations against Razorpay API to see if any were actually captured,
 * and automatically marks them paid with receipts.
 */
router.post('/registrations/sync-razorpay', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const pendingRegs = await WorkshopRegistration.find({
            status: 'pending',
            razorpayOrderId: { $exists: true, $ne: '' }
        });

        let reconciledCount = 0;
        const reconciledList = [];

        for (const reg of pendingRegs) {
            try {
                const payments = await fetchOrderPayments(reg.razorpayOrderId);
                const captured = payments.find(p => p.status === 'captured');
                if (captured) {
                    const isUpgrade = reg.package !== 'combo' && captured.amount === 75000;
                    const updated = await markPaid(reg._id, captured.id, isUpgrade);
                    if (updated) {
                        reconciledCount++;
                        reconciledList.push({
                            id: updated._id,
                            name: updated.name,
                            rollNo: updated.rollNo,
                            receiptNo: updated.receiptNo,
                            paymentId: captured.id
                        });
                    }
                }
            } catch (err) {
                console.error(`Error checking Razorpay for reg ${reg._id}:`, err.message);
            }
        }

        res.json({
            success: true,
            checked: pendingRegs.length,
            reconciledCount,
            reconciledList,
            message: reconciledCount > 0
                ? `Reconciled ${reconciledCount} registration(s) from Razorpay!`
                : `Checked ${pendingRegs.length} pending registration(s). All are genuinely unpaid.`
        });
    } catch (err) {
        console.error('Error syncing registrations with Razorpay:', err);
        res.status(500).json({ error: 'Failed to sync with Razorpay.' });
    }
});

/**
 * DELETE /api/workshop/registrations/:id
 * Protected: SuperAdmins, Leads, and Members.
 * Deletes an abandoned or duplicate pending registration.
 */
router.delete('/registrations/:id', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid registration ID.' });
        }

        const reg = await WorkshopRegistration.findById(id);
        if (!reg) {
            return res.status(404).json({ error: 'Registration not found.' });
        }

        if (reg.status === 'paid') {
            return res.status(403).json({ error: 'Cannot delete a confirmed paid registration.' });
        }

        await WorkshopRegistration.findByIdAndDelete(id);
        console.log(`[ADMIN] Deleted duplicate pending registration ${id} (${reg.name})`);
        res.json({ success: true, message: 'Registration record removed successfully.' });
    } catch (err) {
        console.error('Error deleting registration:', err);
        res.status(500).json({ error: 'Failed to delete registration.' });
    }
});

/**
 * POST /api/workshop/login
 * Public endpoint: Paid student logins with Mobile Number or Email ID.
 * Issues a JWT token valid for 30 days if a paid registration exists.
 */
router.post('/login', async (req, res) => {
    try {
        const { identifier, phone, email } = req.body || {};
        const input = String(identifier || phone || email || '').trim();

        if (!input) {
            return res.status(400).json({ error: 'Mobile number or Email ID is required.' });
        }

        const isEmail = EMAIL_RE.test(input.toLowerCase());
        const cleanEmail = input.toLowerCase();
        const cleanPhone = normalizePhone(input);

        let query = {};
        if (isEmail) {
            query = { email: cleanEmail };
        } else if (cleanPhone.length >= 10) {
            query = { phone: cleanPhone };
        } else {
            query = {
                $or: [
                    { email: cleanEmail },
                    { phone: cleanPhone }
                ]
            };
        }

        if (!isMongoConnected()) {
            return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
        }

        // Search registration in database
        const registration = await WorkshopRegistration.findOne(query);

        if (!registration) {
            return res.status(404).json({
                error: `No workshop registration found for "${input}". Please enter the Mobile Number or Email ID used during registration.`
            });
        }

        if (registration.status !== 'paid') {
            return res.status(403).json({
                error: `Your registration status is "${registration.status}". Workshop access is restricted to confirmed paid candidates only.`,
                status: registration.status
            });
        }

        const inputPassword = String(req.body.password || '').trim();
        if (!inputPassword) {
            return res.status(400).json({ error: 'Password is required. (Initial default password is "asterix")' });
        }

        let isPwdCorrect = false;
        let isDefaultPwd = false;
        if (!registration.passwordHash) {
            isPwdCorrect = inputPassword.toLowerCase() === 'asterix';
            isDefaultPwd = true;
        } else {
            isPwdCorrect = bcrypt.compareSync(inputPassword, registration.passwordHash);
            isDefaultPwd = false;
        }

        if (!isPwdCorrect) {
            return res.status(401).json({
                error: registration.passwordHash
                    ? 'Incorrect password. Please enter your profile password.'
                    : 'Incorrect password. Initial default password for all participants is "asterix".'
            });
        }

        // Record participant login activity permanently in database
        registration.lastLoginAt = new Date();
        registration.loginCount = (registration.loginCount || 0) + 1;
        await registration.save().catch((err) => console.error('Failed to save candidate login timestamp:', err));

        // Create JWT token for paid student
        const tokenPayload = {
            registrationId: registration._id.toString(),
            name: registration.name,
            rollNo: registration.rollNo,
            email: registration.email,
            phone: registration.phone,
            package: registration.package,
            tracksEnrolled: registration.tracksEnrolled || (registration.package === 'combo' ? ['software', 'powertrain'] : [registration.package]),
            status: registration.status,
            receiptNo: registration.receiptNo,
            type: 'workshop_student'
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

        return res.json({
            success: true,
            token,
            student: tokenPayload
        });
    } catch (err) {
        console.error('Workshop student login error:', err);
        return res.status(500).json({ error: 'Failed to process workshop login', details: err.message });
    }
});

/**
 * GET /api/workshop/student-status
 * Authenticated / Public query: Retrieves student registration and attendance records.
 */
router.get('/student-status', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let decodedStudent = null;

        if (token) {
            try {
                decodedStudent = jwt.verify(token, JWT_SECRET);
            } catch (err) {
                // Invalid or expired token
            }
        }

        const rollNo = String(req.query.rollNo || decodedStudent?.rollNo || '').trim().toUpperCase();
        const email = String(req.query.email || decodedStudent?.email || '').trim().toLowerCase();

        if (!rollNo && !email && !decodedStudent) {
            return res.status(400).json({ error: 'Roll number, email, or token required.' });
        }

        let attendanceRecords = [];
        let registration = null;

        if (isMongoConnected()) {
            if (decodedStudent?.registrationId) {
                registration = await WorkshopRegistration.findById(decodedStudent.registrationId);
            }
            if (!registration && (rollNo || email)) {
                registration = await WorkshopRegistration.findOne({
                    $or: [
                        { rollNo: rollNo || '___none___' },
                        { email: email || '___none___' }
                    ]
                });
            }

            const searchRoll = registration?.rollNo || rollNo;
            const searchEmail = registration?.email || email;

            if (searchRoll || searchEmail) {
                attendanceRecords = await WorkshopAttendance.find({
                    $or: [
                        { rollNo: searchRoll || '___none___' },
                        { email: searchEmail || '___none___' }
                    ]
                }).select('sessionId sessionNumber sessionDate sessionTopic checkedInAt verifiedBy track');
            }
        }

        return res.json({
            success: true,
            student: decodedStudent || (registration ? publicView(registration) : null),
            attendance: attendanceRecords
        });
    } catch (err) {
        console.error('Error in student-status:', err);
        return res.status(500).json({ error: 'Failed to fetch student status', details: err.message });
    }
});

export default router;

