import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopSession from '../models/WorkshopSession.js';
import WorkshopTask from '../models/WorkshopTask.js';
import WorkshopResource from '../models/WorkshopResource.js';
import SiteConfig from '../models/SiteConfig.js';
import { WORKSHOP_TRACKS, WORKSHOP_DEPARTMENTS } from '../config/workshopPackages.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import {
    syncParticipantIdentity,
    normalizeRollNo,
    ROLL_NO_RE,
    escapeRegex,
    buildCandidateSearchConditions
} from '../lib/participantIdentity.js';
import { archiveDocuments, actorOf } from '../lib/recycleBin.js';
import {
    summarizeAttendance,
    buildSessionIndex,
    resolveSessionKey,
    CERTIFICATE_THRESHOLD,
    TASK_CREDIT_CAP
} from '../lib/workshopSessions.js';

const router = Router();

const ROTATION_INTERVAL_MS = 12000; // 12 seconds projector rotation
const TOKEN_EXPIRY_MS = 25000; // 25 seconds validity for scanned token
const ATTENDANCE_SECRET = process.env.ATTENDANCE_SECRET
    || process.env.JWT_SECRET
    || 'asterix-attendance-dynamic-secret-key-2026';

/**
 * Computes an HMAC signature for a track + sessionId + timeVal
 */
function signToken(track, sessionId, timeVal) {
    return crypto
        .createHmac('sha256', ATTENDANCE_SECRET)
        .update(`${track}|${sessionId}|${timeVal}`)
        .digest('hex')
        .slice(0, 24);
}

/**
 * Validates an attendance token (supports static non-expiring tokens as well as timestamped tokens)
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 4) return null;

    const [track, sessionId, timeValStr, signature] = parts;

    // Support static token format
    if (timeValStr === 'static' || timeValStr === '0') {
        const expectedSig = signToken(track, sessionId, 'static');
        if (signature === expectedSig) {
            return { track, sessionId, timeVal: 0 };
        }
    }

    const timeVal = parseInt(timeValStr, 10);
    if (!isNaN(timeVal)) {
        const expectedSig = signToken(track, sessionId, timeVal);
        if (signature === expectedSig) {
            return { track, sessionId, timeVal };
        }
    }

    return null;
}

/**
 * GET /api/workshop/attendance/session-token
 * Admin only: Generates current static token for projector display
 */
router.get('/session-token', authenticateToken, async (req, res) => {
    try {
        const track = String(req.query.track || 'software').toLowerCase().trim();
        const sessionNumber = parseInt(req.query.sessionNumber || '1', 10);
        const sessionDate = String(req.query.sessionDate || new Date().toISOString().slice(0, 10)).trim();
        const sessionTopic = String(req.query.sessionTopic || '').trim();

        if (!['software', 'powertrain', 'combo'].includes(track)) {
            return res.status(400).json({ error: "Invalid track. Must be 'software', 'powertrain' or 'combo'." });
        }

        /* Industry expert sessions are one room holding both tracks, but the
           schedule lists them once per track. A combo QR covers that day's
           session on every track the scanner is enrolled in, so a combo
           candidate scans once instead of hunting down a second code. */
        const sessionId = track === 'combo'
            ? `combo-joint-${sessionDate}`
            : `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;

        const tokenTimeVal = 'static';
        const signature = signToken(track, sessionId, tokenTimeVal);
        const token = `${track}.${sessionId}.${tokenTimeVal}.${signature}`;

        // Construct scan URL for the student
        const hostUrl = process.env.PUBLIC_APP_URL || req.headers.origin || `http://${req.headers.host}`;
        const scanUrl = `${hostUrl}/#attendance?tok=${token}`;

        return res.json({
            token,
            track,
            sessionId,
            sessionNumber,
            sessionDate,
            sessionTopic,
            expiresInMs: ROTATION_INTERVAL_MS,
            tokenExpiryMs: TOKEN_EXPIRY_MS,
            rotationIntervalMs: ROTATION_INTERVAL_MS,
            scanUrl
        });
    } catch (err) {
        console.error('Error generating session token:', err);
        return res.status(500).json({ error: 'Failed to generate session token' });
    }
});

/**
 * POST /api/workshop/attendance/checkin
 * Public endpoint: Student submits roll number, email and device ID
 */
router.post('/checkin', async (req, res) => {
    try {
        const { token, rollNo, email, deviceId } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Attendance token is required. Please scan the QR code again.' });
        }
        if (!rollNo || !email) {
            return res.status(400).json({ error: 'Both Roll Number and Email are required.' });
        }
        if (!deviceId) {
            return res.status(400).json({ error: 'Device verification token is missing. Please reload the page.' });
        }

        // 1. Verify dynamic rotating token
        const tokenData = verifyToken(token);
        if (!tokenData) {
            return res.status(401).json({
                error: 'QR code expired. Please scan the current QR code on the screen.',
                expired: true
            });
        }

        const { track, sessionId } = tokenData;
        const cleanRoll = String(rollNo).trim();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanDeviceId = String(deviceId).trim();

        // 2. Query student registration in MongoDB (case-insensitive roll number & flexible email/prefix)
        const rollConditions = [
            { rollNo: cleanRoll.toUpperCase() },
            { rollNo: new RegExp(`^\\s*${escapeRegex(cleanRoll)}\\s*$`, 'i') },
            { rollNo: new RegExp(`^\\s*${escapeRegex(normalizeRollNo(cleanRoll))}\\s*$`, 'i') }
        ];
        const emailConditions = [
            { email: cleanEmail },
            { email: new RegExp(`^\\s*${escapeRegex(cleanEmail)}\\s*$`, 'i') },
            { email: new RegExp(`^${escapeRegex(cleanRoll)}@`, 'i') }
        ];

        let registration = await WorkshopRegistration.findOne({
            $and: [{ $or: rollConditions }, { $or: emailConditions }]
        });

        // Fallback to roll number alone if email differs (e.g. personal vs college email)
        if (!registration) {
            registration = await WorkshopRegistration.findOne({ $or: rollConditions });
        }

        if (!registration) {
            return res.status(404).json({
                error: `No registration found for Roll Number "${cleanRoll}" and Email "${cleanEmail}". Please check your details.`
            });
        }

        // 3. Verify payment status
        if (registration.status !== 'paid') {
            return res.status(403).json({
                error: `Your registration is currently marked as "${registration.status}". Attendance can only be recorded for confirmed paid candidates.`,
                status: registration.status
            });
        }

        /* 3b. Joint session: credit that date's session on every track this
           candidate is enrolled in. Each row keeps its own track-specific
           sessionId so the {rollNo, sessionId} and {deviceId, sessionId}
           indexes still guard one row per person per session. */
        if (track === 'combo') {
            const jointDate = sessionId.replace('combo-joint-', '');
            const enrolled = Array.isArray(registration.tracksEnrolled) && registration.tracksEnrolled.length > 0
                ? registration.tracksEnrolled
                : (registration.package === 'combo'
                    ? ['software', 'powertrain']
                    : [registration.package].filter(Boolean));

            const jointSessions = await WorkshopSession.find({
                track: { $in: enrolled },
                date: jointDate,
                countsForAttendance: true
            }).lean();

            if (jointSessions.length === 0) {
                return res.status(404).json({
                    error: `No session on ${jointDate} for your track. Check with the workshop team.`
                });
            }

            const credited = [];
            const already = [];
            for (const jointSession of jointSessions) {
                const rowSessionId = `${jointSession.track}-${jointSession.scheduleId}-${jointSession.date}`;
                const existing = await WorkshopAttendance.findOne({
                    $or: [
                        { sessionKey: jointSession.sessionKey, registrationId: registration._id },
                        { sessionId: rowSessionId, rollNo: registration.rollNo }
                    ]
                });
                if (existing) {
                    already.push(jointSession.title || jointSession.sessionKey);
                    continue;
                }

                // Same anti-proxy rule as a single-track scan, applied per session.
                const proxy = await WorkshopAttendance.findOne({
                    sessionId: rowSessionId,
                    deviceId: cleanDeviceId,
                    registrationId: { $ne: registration._id }
                });
                if (proxy) {
                    return res.status(403).json({
                        error: 'Proxy attendance blocked. This device has already recorded attendance for another candidate for this session.',
                        isProxy: true
                    });
                }

                try {
                    await WorkshopAttendance.create({
                        registrationId: registration._id,
                        rollNo: registration.rollNo || cleanRoll.toUpperCase(),
                        email: registration.email || cleanEmail,
                        name: registration.name,
                        department: registration.department,
                        year: registration.year,
                        package: registration.package,
                        track: jointSession.track,
                        sessionId: rowSessionId,
                        sessionKey: jointSession.sessionKey,
                        sessionNumber: jointSession.sessionNumber || 0,
                        sessionDate: jointSession.date,
                        sessionTopic: jointSession.title,
                        deviceId: cleanDeviceId,
                        ipAddress: Array.isArray(req.headers['x-forwarded-for'])
                            ? req.headers['x-forwarded-for'][0]
                            : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
                        userAgent: req.headers['user-agent'] || '',
                        verifiedBy: 'qr-scan',
                        checkedInAt: new Date()
                    });
                    credited.push(jointSession.title || jointSession.sessionKey);
                } catch (createErr) {
                    if (createErr.code === 11000) already.push(jointSession.title || jointSession.sessionKey);
                    else throw createErr;
                }
            }

            if (credited.length === 0) {
                return res.json({
                    success: true,
                    alreadyRecorded: true,
                    message: 'Attendance was already recorded for this session.',
                    tracksCredited: [],
                    tracksAlreadyRecorded: already
                });
            }

            res.locals.whatsappActivity = { type: 'attendance', name: registration.name };
            return res.status(201).json({
                success: true,
                message: credited.length > 1
                    ? `Attendance confirmed for both your tracks. One scan was enough.`
                    : 'Attendance confirmed successfully!',
                tracksCredited: credited,
                tracksAlreadyRecorded: already,
                attendance: {
                    name: registration.name,
                    rollNo: registration.rollNo,
                    track: 'combo',
                    department: registration.department,
                    year: registration.year,
                    package: registration.package,
                    receiptNo: registration.receiptNo,
                    checkedInAt: new Date()
                }
            });
        }

        // 4. Verify track eligibility
        const isTrackEnrolled = (registration.tracksEnrolled || []).includes(track) || registration.package === 'combo';
        if (!isTrackEnrolled) {
            const registeredTracks = (registration.tracksEnrolled || []).join(' & ') || registration.package;
            return res.status(403).json({
                error: `You are registered for [${registeredTracks.toUpperCase()}], but this session is for [${track.toUpperCase()}]. Please attend your registered workshop.`
            });
        }

        // 5. Check if candidate already checked in for this session
        const existingAttendance = await WorkshopAttendance.findOne({
            sessionId,
            $or: [
                { registrationId: registration._id },
                { rollNo: registration.rollNo },
                { rollNo: cleanRoll.toUpperCase() }
            ]
        });

        if (existingAttendance) {
            return res.json({
                success: true,
                alreadyRecorded: true,
                message: 'Attendance was already recorded for this session.',
                attendance: {
                    name: existingAttendance.name,
                    rollNo: existingAttendance.rollNo,
                    track: existingAttendance.track,
                    department: existingAttendance.department,
                    year: existingAttendance.year,
                    checkedInAt: existingAttendance.checkedInAt
                }
            });
        }

        // 6. Anti-proxy: Check if this device was already used by a DIFFERENT candidate in this session
        const proxyCheck = await WorkshopAttendance.findOne({
            sessionId,
            deviceId: cleanDeviceId,
            registrationId: { $ne: registration._id },
            rollNo: { $nin: [registration.rollNo, cleanRoll.toUpperCase(), cleanRoll] }
        });

        if (proxyCheck) {
            return res.status(403).json({
                error: 'Proxy attendance blocked. This device has already recorded attendance for another candidate for this session.',
                isProxy: true
            });
        }

        // Parse session metadata
        const sessionParts = sessionId.split('-');
        const sessionNumStr = sessionParts[1] ? sessionParts[1].replace('s', '') : '1';
        const sessionNumber = parseInt(sessionNumStr, 10) || 1;
        const sessionDate = sessionParts.slice(2).join('-') || new Date().toISOString().slice(0, 10);

        // 7. Record attendance
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const newAttendance = await WorkshopAttendance.create({
            registrationId: registration._id,
            rollNo: registration.rollNo || cleanRoll.toUpperCase(),
            email: registration.email || cleanEmail,
            name: registration.name,
            department: registration.department,
            year: registration.year,
            package: registration.package,
            track,
            sessionId,
            sessionNumber,
            sessionDate,
            sessionTopic: req.body.sessionTopic || '',
            deviceId: cleanDeviceId,
            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
            userAgent,
            verifiedBy: 'qr-scan',
            checkedInAt: new Date()
        });

        res.locals.whatsappActivity = { type: 'attendance', name: registration.name };
        return res.status(201).json({
            success: true,
            message: 'Attendance confirmed successfully!',
            attendance: {
                name: newAttendance.name,
                rollNo: newAttendance.rollNo,
                track: newAttendance.track,
                department: newAttendance.department,
                year: newAttendance.year,
                package: newAttendance.package,
                receiptNo: registration.receiptNo,
                checkedInAt: newAttendance.checkedInAt
            }
        });
    } catch (err) {
        // Handle MongoDB duplicate key error (race condition)
        if (err.code === 11000) {
            if (err.keyPattern && err.keyPattern.deviceId) {
                return res.status(403).json({
                    error: 'Proxy attendance blocked. This device has already submitted attendance for another candidate.'
                });
            }
            return res.json({
                success: true,
                alreadyRecorded: true,
                message: 'Attendance already recorded for this session.'
            });
        }
        console.error('Error recording attendance:', err);
        return res.status(500).json({ error: 'Server error while recording attendance. Please try again.' });
    }
});

/**
 * GET /api/workshop/attendance/live-status
 * Admin only: Real-time present count, total eligible, and live checkin stream
 */
router.get('/live-status', authenticateToken, async (req, res) => {
    try {
        const sessionId = String(req.query.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId query parameter is required' });
        }

        const track = sessionId.startsWith('powertrain') ? 'powertrain' : 'software';

        // Count total eligible candidates enrolled in this track with paid status
        const totalEligible = await WorkshopRegistration.countDocuments({
            status: 'paid',
            $or: [
                { tracksEnrolled: track },
                { package: 'combo' }
            ]
        });

        const totalPresent = await WorkshopAttendance.countDocuments({ sessionId });
        const percentage = totalEligible > 0 ? ((totalPresent / totalEligible) * 100).toFixed(1) : 0;

        // Last 10 checkins for live ticker
        const recentCheckins = await WorkshopAttendance.find({ sessionId })
            .sort({ checkedInAt: -1 })
            .limit(10)
            .select('name rollNo department checkedInAt verifiedBy')
            .lean();

        return res.json({
            sessionId,
            track,
            totalEligible,
            totalPresent,
            percentage,
            recentCheckins
        });
    } catch (err) {
        console.error('Error fetching live attendance status:', err);
        return res.status(500).json({ error: 'Failed to fetch live attendance status' });
    }
});

/**
 * GET /api/workshop/attendance/records
 * Admin only: Full list of present and absent candidates for a session
 */
router.get('/records', authenticateToken, async (req, res) => {
    try {
        const sessionId = String(req.query.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId query parameter is required' });
        }

        const track = sessionId.startsWith('powertrain') ? 'powertrain' : 'software';

        // All eligible paid candidates
        const eligibleCandidates = await WorkshopRegistration.find({
            status: 'paid',
            $or: [
                { tracksEnrolled: track },
                { package: 'combo' }
            ]
        }).sort({ rollNo: 1 }).lean();

        // All attendance records for this session
        const attendanceRecords = await WorkshopAttendance.find({ sessionId }).lean();
        const attendanceMap = new Map();
        attendanceRecords.forEach(att => attendanceMap.set(att.rollNo, att));

        // Combined roster
        const roster = eligibleCandidates.map(cand => {
            const att = attendanceMap.get(cand.rollNo);
            return {
                registrationId: cand._id,
                rollNo: cand.rollNo,
                name: cand.name,
                email: cand.email,
                phone: cand.phone,
                department: cand.department,
                year: cand.year,
                package: cand.package,
                receiptNo: cand.receiptNo,
                isPresent: Boolean(att),
                checkedInAt: att ? att.checkedInAt : null,
                verifiedBy: att ? att.verifiedBy : null
            };
        });

        return res.json({
            sessionId,
            track,
            totalEligible: eligibleCandidates.length,
            totalPresent: attendanceRecords.length,
            roster
        });
    } catch (err) {
        console.error('Error fetching attendance records:', err);
        return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

/**
 * POST /api/workshop/attendance/manual-mark
 * Admin only: Instructor manually marks a candidate present (e.g. phone died)
 */
router.post('/manual-mark', authenticateToken, async (req, res) => {
    try {
        const { rollNo, sessionId, sessionTopic } = req.body;
        if (!rollNo || !sessionId) {
            return res.status(400).json({ error: 'rollNo and sessionId are required' });
        }

        const cleanRoll = String(rollNo).trim();
        const registration = await WorkshopRegistration.findOne({
            $or: [
                { rollNo: cleanRoll.toUpperCase() },
                { rollNo: new RegExp(`^\\s*${escapeRegex(cleanRoll)}\\s*$`, 'i') },
                { rollNo: new RegExp(`^\\s*${escapeRegex(normalizeRollNo(cleanRoll))}\\s*$`, 'i') }
            ],
            status: 'paid'
        });

        if (!registration) {
            return res.status(404).json({ error: `No paid registration found for Roll Number "${cleanRoll}".` });
        }

        const track = sessionId.startsWith('powertrain') ? 'powertrain' : 'software';
        const sessionParts = sessionId.split('-');
        const sessionNumStr = sessionParts[1] ? sessionParts[1].replace('s', '') : '1';
        const sessionNumber = parseInt(sessionNumStr, 10) || 1;
        const sessionDate = sessionParts.slice(2).join('-') || new Date().toISOString().slice(0, 10);

        const existing = await WorkshopAttendance.findOne({
            sessionId,
            $or: [
                { registrationId: registration._id },
                { rollNo: registration.rollNo },
                { rollNo: cleanRoll.toUpperCase() }
            ]
        });
        if (existing) {
            return res.json({ success: true, message: 'Candidate is already marked present.' });
        }

        const manualRecord = await WorkshopAttendance.create({
            registrationId: registration._id,
            rollNo: registration.rollNo || cleanRoll.toUpperCase(),
            email: registration.email,
            name: registration.name,
            department: registration.department,
            year: registration.year,
            package: registration.package,
            track,
            sessionId,
            sessionNumber,
            sessionDate,
            sessionTopic: sessionTopic || '',
            deviceId: `admin_override_${Date.now()}`,
            ipAddress: req.ip || '',
            userAgent: 'Admin Manual Override',
            verifiedBy: 'manual-admin',
            checkedInAt: new Date()
        });

        res.locals.whatsappActivity = { type: 'attendance', name: registration.name };
        return res.json({
            success: true,
            message: `✓ Manually marked ${registration.name} (${cleanRoll}) as present.`,
            attendance: manualRecord
        });
    } catch (err) {
        console.error('Error manually marking attendance:', err);
        return res.status(500).json({ error: 'Failed to manually mark attendance' });
    }
});

/**
 * POST /api/workshop/attendance/barcode-scan
 * Admin only: Process barcode scan input (Register Number / Roll Number) to mark student attendance
 */
router.post('/barcode-scan', authenticateToken, async (req, res) => {
    try {
        const { barcode, track: inputTrack, sessionId: inputSessionId, sessionTopic, sessionNumber, sessionDate } = req.body || {};

        if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
            return res.status(400).json({ error: 'Barcode or register number is required.' });
        }

        // Clean raw barcode input (handles scanner carriage returns, spaces, or prefixed URLs)
        let cleanInput = barcode.trim();
        // Parse URL parameter if full link was scanned
        if (cleanInput.includes('rollNo=')) {
            const match = cleanInput.match(/rollNo=([^&#\s]+)/i);
            if (match) cleanInput = match[1];
        } else if (cleanInput.includes('roll=')) {
            const match = cleanInput.match(/roll=([^&#\s]+)/i);
            if (match) cleanInput = match[1];
        } else if (!cleanInput.startsWith('http') && cleanInput.includes(':')) {
            // Only split prefix like "ROLL:23CB12" when NOT a URL
            const parts = cleanInput.split(':');
            cleanInput = parts[parts.length - 1];
        }

        const cleanBarcode = cleanInput.trim();

        // Target track & session ID resolution
        const track = (inputTrack || 'software').toLowerCase().trim();
        const targetSessionId = inputSessionId
            ? String(inputSessionId).trim()
            : `${track}-s${String(sessionNumber || 1).padStart(2, '0')}-${sessionDate || new Date().toISOString().slice(0, 10)}`;

        // 1. Search candidate by register number (rollNo), email, phone, or receipt number
        const registration = await WorkshopRegistration.findOne({
            $or: buildCandidateSearchConditions(cleanBarcode)
        });

        if (!registration) {
            return res.status(404).json({
                error: `No candidate registration found matching register number / barcode "${cleanBarcode}".`,
                scannedBarcode: cleanBarcode
            });
        }

        // 2. Check payment status
        if (registration.status !== 'paid') {
            return res.status(403).json({
                error: `Candidate "${registration.name}" (${registration.rollNo}) registration status is "${registration.status}". Attendance can only be recorded for confirmed paid candidates.`,
                candidate: {
                    name: registration.name,
                    rollNo: registration.rollNo,
                    status: registration.status,
                    department: registration.department,
                    year: registration.year
                }
            });
        }

        // 3. Verify track eligibility
        const isTrackEnrolled = (registration.tracksEnrolled || []).includes(track) || registration.package === 'combo';
        if (!isTrackEnrolled) {
            const registeredTracks = (registration.tracksEnrolled || []).join(' & ') || registration.package;
            return res.status(403).json({
                error: `Candidate "${registration.name}" is enrolled in [${registeredTracks.toUpperCase()}], but current session is for [${track.toUpperCase()}].`,
                candidate: {
                    name: registration.name,
                    rollNo: registration.rollNo,
                    tracksEnrolled: registration.tracksEnrolled,
                    package: registration.package
                }
            });
        }

        // 4. Check if already marked present
        const existing = await WorkshopAttendance.findOne({
            sessionId: targetSessionId,
            $or: [
                { registrationId: registration._id },
                { rollNo: registration.rollNo }
            ]
        });

        if (existing) {
            const checkinTimeFormatted = new Date(existing.checkedInAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            return res.json({
                success: true,
                alreadyRecorded: true,
                message: `Already Checked-In: ${registration.name} (${registration.rollNo}) was marked present at ${checkinTimeFormatted}.`,
                candidate: {
                    name: registration.name,
                    rollNo: registration.rollNo,
                    email: registration.email,
                    department: registration.department,
                    year: registration.year,
                    package: registration.package,
                    receiptNo: registration.receiptNo,
                    checkedInAt: existing.checkedInAt,
                    verifiedBy: existing.verifiedBy
                }
            });
        }

        // 5. Create new attendance record
        const sessionParts = targetSessionId.split('-');
        const sessionNumVal = parseInt(sessionParts[1] ? sessionParts[1].replace('s', '') : '1', 10) || 1;
        const sessionDateVal = sessionParts.slice(2).join('-') || new Date().toISOString().slice(0, 10);

        const newAttendance = await WorkshopAttendance.create({
            registrationId: registration._id,
            rollNo: registration.rollNo,
            email: registration.email,
            name: registration.name,
            department: registration.department,
            year: registration.year,
            package: registration.package,
            track,
            sessionId: targetSessionId,
            sessionNumber: sessionNumVal,
            sessionDate: sessionDateVal,
            sessionTopic: sessionTopic || '',
            deviceId: `barcode_scanner_admin_${req.user?.id || 'superadmin'}_${Date.now()}`,
            ipAddress: req.ip || '',
            userAgent: 'Barcode Scanner (Admin Portal)',
            verifiedBy: 'barcode-scanner',
            checkedInAt: new Date()
        });

        res.locals.whatsappActivity = { type: 'attendance', name: registration.name };
        return res.status(201).json({
            success: true,
            alreadyRecorded: false,
            message: `✓ Attendance MARKED: ${registration.name} (${registration.rollNo})`,
            candidate: {
                name: registration.name,
                rollNo: registration.rollNo,
                email: registration.email,
                department: registration.department,
                year: registration.year,
                package: registration.package,
                receiptNo: registration.receiptNo,
                checkedInAt: newAttendance.checkedInAt,
                verifiedBy: 'barcode-scanner'
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.json({
                success: true,
                alreadyRecorded: true,
                message: 'Attendance was already recorded for this student for this session.'
            });
        }
        console.error('Error scanning barcode for attendance:', err);
        return res.status(500).json({ error: 'Server error while processing barcode scan.' });
    }
});

/**
 * GET /api/workshop/attendance/export
 * Admin only: Export formatted CSV for session attendance
 */
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const sessionId = String(req.query.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId query parameter is required' });
        }

        const track = sessionId.startsWith('powertrain') ? 'powertrain' : 'software';
        const eligibleCandidates = await WorkshopRegistration.find({
            status: 'paid',
            $or: [{ tracksEnrolled: track }, { package: 'combo' }]
        }).sort({ rollNo: 1 }).lean();

        const attendanceRecords = await WorkshopAttendance.find({ sessionId }).lean();
        const attendanceMap = new Map();
        attendanceRecords.forEach(att => attendanceMap.set(att.rollNo, att));

        const csvHeaders = ['S.No', 'Roll Number', 'Name', 'Department', 'Year', 'Package', 'Receipt No', 'Attendance Status', 'Check-in Time (IST)', 'Verified By'];
        const csvRows = eligibleCandidates.map((cand, idx) => {
            const att = attendanceMap.get(cand.rollNo);
            const isPresent = Boolean(att);
            const checkinTime = att
                ? new Date(att.checkedInAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                : '—';
            const verified = att ? att.verifiedBy : '—';

            return [
                idx + 1,
                `"${cand.rollNo}"`,
                `"${(cand.name || '').replace(/"/g, '""')}"`,
                `"${cand.department || ''}"`,
                `"Year ${cand.year || ''}"`,
                `"${cand.package || ''}"`,
                `"${cand.receiptNo || ''}"`,
                isPresent ? 'PRESENT' : 'ABSENT',
                `"${checkinTime}"`,
                `"${verified}"`
            ].join(',');
        });

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
        const filename = `attendance-${sessionId}-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csvContent);
    } catch (err) {
        console.error('Error exporting attendance CSV:', err);
        return res.status(500).json({ error: 'Failed to export attendance CSV' });
    }
});

const DEFAULT_WORKSHOP_PASSWORD = 'asterix';

function verifyCandidatePassword(candidate, inputPassword) {
    const pwd = String(inputPassword || '').trim();
    if (!pwd) return { isCorrect: false, isDefault: false, empty: true };
    if (!candidate.passwordHash) {
        const isCorrect = pwd.toLowerCase() === DEFAULT_WORKSHOP_PASSWORD.toLowerCase();
        return { isCorrect, isDefault: true };
    }
    const isCorrect = bcrypt.compareSync(pwd, candidate.passwordHash);
    return { isCorrect, isDefault: false };
}

/**
 * POST /api/workshop/attendance/profile
 * Public endpoint: Candidate inputs email ID, phone, or roll number + password to view individual profile.
 */
router.post('/profile', async (req, res) => {
    try {
        const queryRaw = String(req.body.identifier || req.body.email || req.body.phone || req.body.rollNo || '').trim();
        const inputPassword = String(req.body.password || '').trim();

        if (!queryRaw) {
            return res.status(400).json({ error: 'Please enter your Email ID, Phone Number, or Roll Number.' });
        }

        if (!inputPassword) {
            return res.status(400).json({ error: 'Please enter your profile password. Initial default password is "asterix".' });
        }

        const searchConditions = buildCandidateSearchConditions(queryRaw);

        // Only paid registrations get a profile. One person can have several attempts (a failed
        // payment, then a paid one), so take the most recently paid.
        const candidate = await WorkshopRegistration.findOne({ $or: searchConditions, status: 'paid' })
            .sort({ paidAt: -1, createdAt: -1 })
            .lean();

        if (!candidate) {
            const unpaid = await WorkshopRegistration.exists({ $or: searchConditions });
            if (unpaid) {
                return res.status(403).json({
                    error: "We found your registration but payment isn't complete yet. Finish the payment or contact the workshop team."
                });
            }
            return res.status(404).json({
                error: `No candidate registration found matching "${queryRaw}". Please verify your email ID or phone number.`
            });
        }

        const pwdCheck = verifyCandidatePassword(candidate, inputPassword);
        if (!pwdCheck.isCorrect) {
            return res.status(401).json({
                error: candidate.passwordHash
                    ? 'Incorrect password. Please enter the custom password you created for your profile.'
                    : 'Incorrect password. The initial default password for all participants is "asterix".'
            });
        }

        // Record participant login activity permanently in database
        await WorkshopRegistration.updateOne(
            { _id: candidate._id },
            { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } }
        ).catch((e) => console.error('Failed to update candidate lastLoginAt:', e));

        const tracksEnrolled = Array.isArray(candidate.tracksEnrolled) && candidate.tracksEnrolled.length > 0
            ? candidate.tracksEnrolled
            : (candidate.package === 'combo' ? ['software', 'powertrain'] : [candidate.package || 'software']);

        // The schedule admins edit in Workshop Schedule lives in SiteConfig; the config file is the fallback.
        const siteConfig = await SiteConfig.findOne({ key: 'main' }, { workshop: 1 }).lean();
        const editedTracks = siteConfig?.workshop?.tracks || {};
        const tracks = {};
        tracksEnrolled.forEach((trackId) => {
            if (WORKSHOP_TRACKS[trackId]) tracks[trackId] = { ...WORKSHOP_TRACKS[trackId], ...editedTracks[trackId] };
        });

        // Search attendance records for candidate across all identifying fields
        const candidateOrConditions = [
            { registrationId: candidate._id }
        ];
        if (candidate.rollNo) {
            candidateOrConditions.push({ rollNo: candidate.rollNo.toUpperCase() });
            candidateOrConditions.push({ rollNo: candidate.rollNo });
        }
        if (candidate.email) {
            candidateOrConditions.push({ email: candidate.email.toLowerCase() });
        }

        const [attendanceRecords, sessions, tasks] = await Promise.all([
            WorkshopAttendance.find({ $or: candidateOrConditions }).lean(),
            WorkshopSession.find({ track: { $in: tracksEnrolled } }).lean(),
            WorkshopTask.find({ registrationId: candidate._id }).sort({ createdAt: 1 }).lean()
        ]);

        // The denominator comes from WorkshopSession, never from the attendance
        // collection: a session nobody scanned into still has to count against
        // the people who skipped it.
        const { perTrack } = summarizeAttendance({ sessions, attendanceRecords, tracksEnrolled });

        const sessionIndex = buildSessionIndex(sessions);
        const attendanceByKey = new Map();
        attendanceRecords.forEach((att) => {
            const key = resolveSessionKey(att, sessionIndex);
            if (key && !attendanceByKey.has(key)) attendanceByKey.set(key, att);
        });

        // One date-ordered timetable across tracks (combo students otherwise saw every
        // software session before any powertrain one). Undated sessions sink to the end.
        const sessionTimeline = sessions
            .slice()
            .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
            .map((session) => {
                const trackConfig = tracks[session.track] || WORKSHOP_TRACKS[session.track] || {};
                const scheduleItem = (trackConfig.schedule || [])
                    .find((item) => item.id === session.scheduleId) || {};
                const att = attendanceByKey.get(session.sessionKey);

                let status;
                if (!session.countsForAttendance) status = 'OPTIONAL';
                else if (att) status = 'PRESENT';
                else if (session.status === 'conducted') status = 'ABSENT';
                else if (session.status === 'cancelled') status = 'CANCELLED';
                else status = 'UPCOMING';

                return {
                    id: session.scheduleId,
                    sessionKey: session.sessionKey,
                    track: session.track,
                    trackName: trackConfig.name || String(session.track).toUpperCase(),
                    label: session.label,
                    days: scheduleItem.days || '',
                    date: scheduleItem.date || session.date,
                    title: session.title,
                    instructor: scheduleItem.instructor || '-',
                    venue: scheduleItem.venue || trackConfig.venue || 'Workshop Lab',
                    type: session.type,
                    project: scheduleItem.project || null,
                    subject: scheduleItem.subject || null,
                    countsForAttendance: session.countsForAttendance,
                    status,
                    checkedInAt: att ? att.checkedInAt : null,
                    isoDate: session.date
                };
            });

        // Sessions still to come, so the profile can show a route to the threshold
        // instead of a verdict the candidate cannot act on mid-workshop. A session
        // still marked "scheduled" whose date has passed is awaiting an admin
        // ruling, not attendable, so it must not inflate what is still reachable.
        const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const trackSummaries = tracksEnrolled.map((trackId) => {
            const summary = perTrack[trackId];
            const remaining = sessions.filter((session) => session.track === trackId
                && session.countsForAttendance
                && session.status === 'scheduled'
                && (!session.date || session.date >= todayIso)).length;
            const finalTotal = summary.totalConducted + remaining;
            const needed = finalTotal > 0
                ? Math.ceil((CERTIFICATE_THRESHOLD * finalTotal) / 100) - summary.totalPresent
                : 0;
            const stillNeeded = Math.min(Math.max(needed, 0), remaining + 1);
            const canStillQualify = stillNeeded <= remaining;

            /* secured   - the threshold holds even if every remaining session is missed
               on-track  - at or above the threshold today
               at-risk   - below it, but still reachable by attending
               alternate - attendance alone can no longer reach it, so the
                           certificate has to be earned through workshop tasks */
            let outlook;
            if (finalTotal > 0 && summary.totalPresent >= Math.ceil((CERTIFICATE_THRESHOLD * finalTotal) / 100)) {
                outlook = 'secured';
            } else if (!canStillQualify) {
                outlook = 'alternate';
            } else if (summary.isEligibleForCertificate) {
                outlook = 'on-track';
            } else {
                outlook = 'at-risk';
            }

            return {
                ...summary,
                trackName: tracks[trackId]?.name || String(trackId).toUpperCase(),
                remaining,
                maxPossiblePercentage: finalTotal > 0
                    ? Math.round(((summary.totalPresent + remaining) / finalTotal) * 100)
                    : 0,
                // stillNeeded stays server-side: telling a candidate below the
                // threshold that N of the remaining sessions would be "enough"
                // invites them to skip the rest.
                canStillQualify,
                outlook
            };
        });

        const totalConducted = trackSummaries.reduce((sum, t) => sum + t.totalConducted, 0);
        const totalPresent = trackSummaries.reduce((sum, t) => sum + t.totalPresent, 0);
        const attendancePercentage = totalConducted > 0
            ? Math.round((totalPresent / totalConducted) * 100)
            : 0;
        // Combo candidates earn a certificate per track, so each track is judged alone.
        const isEligibleForCertificate = trackSummaries.length > 0
            && trackSummaries.every((t) => t.isEligibleForCertificate);

        // Notes are whatever the workshop team has published from the admin portal; nothing is built in.
        const resources = await WorkshopResource.find({
            track: { $in: [...tracksEnrolled, 'common'] }
        }).sort({ sessionNumber: 1, createdAt: 1 }).lean();

        return res.json({
            ok: true,
            isDefaultPassword: pwdCheck.isDefault,
            candidate: {
                registrationId: candidate.registrationId || candidate._id,
                name: candidate.name,
                rollNo: candidate.rollNo,
                email: candidate.email,
                phone: candidate.phone,
                department: candidate.department,
                year: candidate.year,
                package: candidate.package,
                packageName: candidate.packageName || candidate.package,
                tracksEnrolled,
                receiptNo: candidate.receiptNo,
                status: candidate.status,
                amount: candidate.amount,
                paidAt: candidate.paidAt
            },
            attendanceSummary: {
                threshold: CERTIFICATE_THRESHOLD,
                totalConducted,
                totalPresent,
                attendancePercentage,
                isEligibleForCertificate,
                perTrack: trackSummaries,
                // True when attendance alone can no longer reach the threshold on
                // some track. Those candidates keep a route to the certificate
                // through tasks and activities, so the profile says so plainly
                // rather than reading as a dismissal.
                needsAlternatePath: trackSummaries.some((t) => t.outlook === 'alternate'),
                certificateMessage: isEligibleForCertificate
                    ? `On track for your certificate — ${CERTIFICATE_THRESHOLD}% attendance maintained.`
                    : `Below the ${CERTIFICATE_THRESHOLD}% attendance mark. Your track breakdown below shows exactly what is left.`
            },
            sessionTimeline,
            // Make-up tasks the team has assigned, with the review outcome so the
            // candidate sees exactly where each one stands.
            makeupTasks: tasks.map((task) => ({
                id: String(task._id),
                track: task.track,
                sessionKey: task.sessionKey,
                sessionTitle: task.sessionTitle,
                sessionDate: task.sessionDate,
                title: task.title,
                brief: task.brief,
                individualSeed: task.individualSeed,
                dueAt: task.dueAt,
                status: task.status,
                driveLink: task.driveLink,
                submittedAt: task.submittedAt,
                reviewNote: task.reviewNote,
                reviewedAt: task.reviewedAt
            })),
            taskCreditCap: TASK_CREDIT_CAP,
            trackInfo: tracks,
            resources
        });
    } catch (err) {
        console.error('Error fetching participant profile:', err);
        return res.status(500).json({ error: 'Failed to load participant profile. Please try again.' });
    }
});

/**
 * POST /api/workshop/attendance/profile/change-password
 * Public endpoint: Candidate updates their password using their current password or initial default "asterix".
 */
router.post('/profile/change-password', async (req, res) => {
    try {
        const { identifier, currentPassword, newPassword } = req.body || {};
        const queryRaw = String(identifier || '').trim();
        const curPwd = String(currentPassword || '').trim();
        const newPwd = String(newPassword || '').trim();

        if (!queryRaw) {
            return res.status(400).json({ ok: false, error: 'Candidate identifier is required.' });
        }
        if (!curPwd) {
            return res.status(400).json({ ok: false, error: 'Current password is required.' });
        }
        if (!newPwd) {
            return res.status(400).json({ ok: false, error: 'Please enter a new password.' });
        }
        if (newPwd.length < 4) {
            return res.status(400).json({ ok: false, error: 'New password must be at least 4 characters long.' });
        }

        const searchConditions = buildCandidateSearchConditions(queryRaw);

        const candidate = await WorkshopRegistration.findOne({ $or: searchConditions, status: 'paid' })
            .sort({ paidAt: -1, createdAt: -1 });

        if (!candidate) {
            return res.status(404).json({ ok: false, error: 'Candidate registration profile not found.' });
        }

        const pwdCheck = verifyCandidatePassword(candidate, curPwd);
        if (!pwdCheck.isCorrect) {
            return res.status(401).json({
                ok: false,
                error: candidate.passwordHash
                    ? 'Current password is incorrect.'
                    : 'Current password is incorrect. Initial default password is "asterix".'
            });
        }

        const salt = bcrypt.genSaltSync(10);
        candidate.passwordHash = bcrypt.hashSync(newPwd, salt);
        candidate.passwordUpdatedAt = new Date();
        await candidate.save();

        return res.json({ ok: true, message: 'Password updated successfully! You can now log in using your new password.' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error while updating password.' });
    }
});

const PROFILE_EDIT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PROFILE_EDIT_YEARS = ['1', '2'];
// Roll numbers are the attendance key, so self-service corrections are capped;
// beyond this the workshop team has to make the change.
const MAX_SELF_ROLL_NO_CHANGES = 3;

/**
 * POST /api/workshop/attendance/profile/update-details
 * Public endpoint: Candidate corrects their own credentials after re-entering their password.
 * The roll number is editable because plenty of registrations were typed wrong, and a wrong
 * roll number is what breaks attendance matching. A correction therefore also rewrites the
 * roll number stored on that participant's attendance, project and quiz records, which are
 * matched on registrationId so the history follows the person rather than the old roll number.
 * Track, amount and receipt number stay locked.
 */
router.post('/profile/update-details', async (req, res) => {
    try {
        const { identifier, password } = req.body || {};
        const queryRaw = String(identifier || '').trim();
        const pwd = String(password || '').trim();

        if (!queryRaw) {
            return res.status(400).json({ ok: false, error: 'Candidate identifier is required.' });
        }
        if (!pwd) {
            return res.status(400).json({ ok: false, error: 'Please confirm your profile password to save changes.' });
        }

        const trim = (value, max) => String(value ?? '').trim().slice(0, max);
        const updates = {
            name: trim(req.body.name, 100),
            email: trim(req.body.email, 254).toLowerCase(),
            phone: trim(req.body.phone, 20).replace(/\D/g, '').slice(-10),
            department: trim(req.body.department, 100),
            year: trim(req.body.year, 2),
            rollNo: normalizeRollNo(trim(req.body.rollNo, 40))
        };

        const fieldErrors = {};
        if (updates.name.length < 2) fieldErrors.name = 'Enter your full name.';
        if (!PROFILE_EDIT_EMAIL_RE.test(updates.email)) {
            fieldErrors.email = 'Enter a valid email address.';
        } else if (!updates.email.endsWith('@psgitech.ac.in')) {
            fieldErrors.email = 'Please use your college email address (@psgitech.ac.in).';
        }
        if (updates.phone.length !== 10) fieldErrors.phone = 'Enter a valid 10-digit phone number.';
        if (!WORKSHOP_DEPARTMENTS.includes(updates.department)) fieldErrors.department = 'Select your department.';
        if (!PROFILE_EDIT_YEARS.includes(updates.year)) fieldErrors.year = 'Select 1st or 2nd year.';
        if (!ROLL_NO_RE.test(updates.rollNo)) {
            fieldErrors.rollNo = 'Enter your registered number as printed on your ID (letters and digits, e.g. 26M125).';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json({
                ok: false,
                error: Object.values(fieldErrors)[0],
                fieldErrors
            });
        }

        const candidate = await WorkshopRegistration.findOne({
            $or: buildCandidateSearchConditions(queryRaw),
            status: 'paid'
        }).sort({ paidAt: -1, createdAt: -1 });

        if (!candidate) {
            return res.status(404).json({ ok: false, error: 'Candidate registration profile not found.' });
        }

        const pwdCheck = verifyCandidatePassword(candidate, pwd);
        if (!pwdCheck.isCorrect) {
            return res.status(401).json({
                ok: false,
                error: candidate.passwordHash
                    ? 'Password is incorrect. Re-enter your profile password to save these changes.'
                    : 'Password is incorrect. The initial default password for all participants is "asterix".'
            });
        }

        const previousRollNo = candidate.rollNo || '';
        const previousEmail = candidate.email || '';
        const rollNoChanged = normalizeRollNo(previousRollNo) !== updates.rollNo;

        // The email and phone both unlock a profile, so they can't be pointed at someone else's.
        if (updates.email !== previousEmail || updates.phone !== candidate.phone) {
            const clash = await WorkshopRegistration.findOne({
                _id: { $ne: candidate._id },
                status: 'paid',
                $or: [{ email: updates.email }, { phone: updates.phone }]
            }).lean();

            if (clash) {
                return res.status(409).json({
                    ok: false,
                    error: clash.email === updates.email
                        ? 'That email address is already used by another registered participant.'
                        : 'That phone number is already used by another registered participant.',
                    fieldErrors: clash.email === updates.email
                        ? { email: 'Already in use by another participant.' }
                        : { phone: 'Already in use by another participant.' }
                });
            }
        }

        if (rollNoChanged) {
            const changeCount = Array.isArray(candidate.rollNoHistory) ? candidate.rollNoHistory.length : 0;
            if (changeCount >= MAX_SELF_ROLL_NO_CHANGES) {
                return res.status(429).json({
                    ok: false,
                    error: `Your registered number has already been corrected ${changeCount} times. Please contact the workshop team on +91 86089 44644 for any further change.`,
                    fieldErrors: { rollNo: 'Change limit reached — contact the workshop team.' }
                });
            }

            const rollClash = await WorkshopRegistration.findOne({
                _id: { $ne: candidate._id },
                rollNo: new RegExp(`^${updates.rollNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
            }).lean();

            if (rollClash) {
                return res.status(409).json({
                    ok: false,
                    error: 'That registered number belongs to another registration. Please check it against your ID card, or contact the workshop team if it is really yours.',
                    fieldErrors: { rollNo: 'Already used by another registration.' }
                });
            }

            // Attendance enforces one check-in per roll number per session, so attendance rows
            // already sitting under the new roll number (a manual admin entry, say) would make
            // the migration collide.
            const strayAttendance = await WorkshopAttendance.exists({
                rollNo: updates.rollNo,
                registrationId: { $ne: candidate._id }
            });

            if (strayAttendance) {
                return res.status(409).json({
                    ok: false,
                    error: 'Attendance has already been recorded under that registered number for another participant. Please contact the workshop team on +91 86089 44644 so they can merge the records.',
                    fieldErrors: { rollNo: 'Attendance already recorded under this number.' }
                });
            }
        }

        candidate.name = updates.name;
        candidate.email = updates.email;
        candidate.phone = updates.phone;
        candidate.department = updates.department;
        candidate.year = updates.year;
        candidate.rollNo = updates.rollNo;
        candidate.detailsUpdatedAt = new Date();
        if (rollNoChanged) {
            candidate.rollNoHistory = [
                ...(candidate.rollNoHistory || []),
                { from: previousRollNo, to: updates.rollNo, changedAt: new Date(), changedBy: 'participant' }
            ];
        }
        await candidate.save();

        // Keep the denormalized copies in step, or the corrected roll number would read as a
        // mismatch everywhere the old one was stored.
        let synced = null;
        try {
            synced = await syncParticipantIdentity(candidate, { previousEmail });
        } catch (syncErr) {
            console.error('Participant identity sync failed after self-edit:', syncErr);
        }

        return res.json({
            ok: true,
            message: rollNoChanged
                ? `Details updated. Your registered number is now ${updates.rollNo} and your attendance records have been moved across.`
                : 'Profile details updated successfully!',
            rollNoChanged,
            syncedRecords: synced,
            candidate: {
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                department: candidate.department,
                year: candidate.year,
                rollNo: candidate.rollNo
            }
        });
    } catch (err) {
        console.error('Update profile details error:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error while updating profile details.' });
    }
});

const RESOURCE_TRACKS = ['software', 'powertrain', 'common'];

// Links end up in participants' hrefs, so only http(s) and same-site paths are accepted;
// anything else (javascript:, data:, protocol-relative //host) is rejected.
function isSafeResourceUrl(url) {
    if (url.startsWith('/')) return !url.startsWith('//');
    try {
        const { protocol } = new URL(url);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}

function parseResourceBody(body) {
    const track = String(body.track || '').trim().toLowerCase();
    const title = String(body.title || '').trim();
    if (!RESOURCE_TRACKS.includes(track)) return { error: `track must be one of: ${RESOURCE_TRACKS.join(', ')}` };
    if (!title) return { error: 'title is required' };

    const links = [];
    for (const link of Array.isArray(body.resources) ? body.resources : []) {
        const label = String(link?.label || '').trim();
        const url = String(link?.url || '').trim();
        if (!label && !url) continue;
        if (!label || !url) return { error: 'Every link needs both a label and a URL' };
        if (!isSafeResourceUrl(url)) return { error: `Link "${label}" must be an http(s) URL or a site path starting with /` };
        links.push({ label, url, type: String(link?.type || 'link').trim().toLowerCase() || 'link' });
    }

    // Accepts an array or one-per-line text, so the admin form can send a plain textarea.
    const rawTakeaways = Array.isArray(body.takeaways) ? body.takeaways : String(body.takeaways || '').split('\n');
    const takeaways = rawTakeaways.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);

    const sessionNumber = Number(body.sessionNumber);
    return {
        doc: {
            track,
            module: String(body.module || '').trim(),
            sessionId: String(body.sessionId || '').trim(),
            sessionNumber: Number.isFinite(sessionNumber) ? sessionNumber : 1,
            title,
            description: String(body.description || '').trim(),
            takeaways,
            resources: links
        }
    };
}

/**
 * Shared cap check for crediting a make-up task.
 * A credit is refused once the candidate holds TASK_CREDIT_CAP approved tasks on
 * that track, or once attendance has already reached the threshold.
 */
async function taskCreditBlocker(task) {
    const approved = await WorkshopTask.countDocuments({
        registrationId: task.registrationId,
        track: task.track,
        status: 'approved'
    });
    if (approved >= TASK_CREDIT_CAP) {
        return `Cap reached: ${TASK_CREDIT_CAP} sessions already recovered by task on ${task.track}.`;
    }

    const [sessions, attendanceRecords] = await Promise.all([
        WorkshopSession.find({ track: task.track }).lean(),
        WorkshopAttendance.find({ registrationId: task.registrationId }).lean()
    ]);
    const { perTrack } = summarizeAttendance({
        sessions,
        attendanceRecords,
        tracksEnrolled: [task.track]
    });
    const summary = perTrack[task.track];
    if (summary && summary.totalConducted > 0 && summary.attendancePercentage >= CERTIFICATE_THRESHOLD) {
        return `Already at ${summary.attendancePercentage}% on ${task.track}; the task route stops at ${CERTIFICATE_THRESHOLD}%.`;
    }
    return null;
}

/**
 * POST /api/workshop/attendance/tasks/submit
 * Public endpoint: candidate submits proof of work for an assigned task.
 */
router.post('/tasks/submit', async (req, res) => {
    try {
        const { identifier, password, taskId, driveLink, submissionNote } = req.body || {};
        if (!taskId || !driveLink) {
            return res.status(400).json({ error: 'Task and a proof-of-work link are required.' });
        }
        if (!/^https?:\/\//i.test(String(driveLink).trim())) {
            return res.status(400).json({ error: 'The proof-of-work link must start with http:// or https://' });
        }

        const candidate = await WorkshopRegistration.findOne({
            $or: buildCandidateSearchConditions(String(identifier || '').trim()),
            status: 'paid'
        }).sort({ paidAt: -1, createdAt: -1 }).lean();
        if (!candidate || !verifyCandidatePassword(candidate, String(password || '').trim()).isCorrect) {
            return res.status(401).json({ error: 'Sign in again to submit this task.' });
        }

        const task = await WorkshopTask.findOne({ _id: taskId, registrationId: candidate._id });
        if (!task) return res.status(404).json({ error: 'Task not found for this candidate.' });
        if (task.status === 'approved') {
            return res.status(409).json({ error: 'This task is already approved.' });
        }

        task.driveLink = String(driveLink).trim();
        task.submissionNote = String(submissionNote || '').trim();
        task.submittedAt = new Date();
        task.status = 'submitted';
        // A resubmission clears the previous rejection so review starts clean.
        task.reviewNote = '';
        task.reviewedBy = '';
        task.reviewedAt = null;
        await task.save();

        return res.json({ success: true, message: 'Submitted. The workshop team will review it.', task });
    } catch (err) {
        console.error('Error submitting workshop task:', err);
        return res.status(500).json({ error: 'Failed to submit this task. Please try again.' });
    }
});

/**
 * GET /api/workshop/attendance/tasks
 * Admin only: lists tasks, newest first, optionally filtered by status or track.
 */
router.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status).trim();
        if (req.query.track) filter.track = String(req.query.track).toLowerCase().trim();
        const tasks = await WorkshopTask.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean();
        return res.json({ ok: true, total: tasks.length, tasks });
    } catch (err) {
        console.error('Error listing workshop tasks:', err);
        return res.status(500).json({ error: 'Failed to list tasks' });
    }
});

/**
 * POST /api/workshop/attendance/tasks/:id/review
 * Admin only: approve or reject a submission. Approving writes the attendance
 * row that credits the missed session.
 */
router.post('/tasks/:id/review', authenticateToken, async (req, res) => {
    try {
        const { decision, reviewNote } = req.body || {};
        if (!['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ error: "decision must be 'approve' or 'reject'." });
        }

        const task = await WorkshopTask.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found.' });
        if (task.status === 'approved') {
            return res.status(409).json({ error: 'This task is already approved.' });
        }

        const reviewer = actorOf(req);

        if (decision === 'reject') {
            task.status = 'rejected';
            task.reviewedBy = reviewer;
            task.reviewNote = String(reviewNote || '').trim();
            task.reviewedAt = new Date();
            await task.save();
            return res.json({ success: true, message: 'Task rejected. The candidate can resubmit.', task });
        }

        const blocker = await taskCreditBlocker(task);
        if (blocker) return res.status(403).json({ error: blocker });

        const session = await WorkshopSession.findOne({ sessionKey: task.sessionKey }).lean();
        if (!session) return res.status(404).json({ error: `No session ${task.sessionKey}.` });

        const registration = await WorkshopRegistration.findById(task.registrationId).lean();
        if (!registration) return res.status(404).json({ error: 'Registration not found.' });

        const existing = await WorkshopAttendance.findOne({
            sessionKey: task.sessionKey,
            registrationId: task.registrationId
        }).lean();

        let credited = existing;
        if (!existing) {
            credited = await WorkshopAttendance.create({
                registrationId: registration._id,
                rollNo: String(registration.rollNo || '').toUpperCase(),
                email: String(registration.email || '').toLowerCase(),
                name: registration.name,
                department: registration.department,
                year: registration.year,
                package: registration.package,
                track: task.track,
                sessionId: `${session.track}-${session.scheduleId}-${session.date}`,
                sessionKey: session.sessionKey,
                sessionNumber: session.sessionNumber || 0,
                sessionDate: session.date,
                sessionTopic: session.title,
                deviceId: `task_${task._id}`,
                ipAddress: '',
                userAgent: 'Make-up Task Credit',
                verifiedBy: 'task-credit',
                markedBy: reviewer,
                markedReason: `Make-up task approved: ${task.title}`,
                checkedInAt: new Date()
            });
        }

        task.status = 'approved';
        task.reviewedBy = reviewer;
        task.reviewNote = String(reviewNote || '').trim();
        task.reviewedAt = new Date();
        task.creditedAttendanceId = credited._id;
        await task.save();

        return res.json({
            success: true,
            message: `Approved. ${registration.name} is credited for ${session.title || task.sessionKey}.`,
            task
        });
    } catch (err) {
        console.error('Error reviewing workshop task:', err);
        return res.status(500).json({ error: 'Failed to review this task.' });
    }
});

/**
 * /api/workshop/attendance/resources
 * Workshop notes, slides and links. Reads are public; writes need an admin token.
 */
router.get('/resources', async (req, res) => {
    try {
        const track = req.query.track ? String(req.query.track).toLowerCase() : null;
        const query = track ? { track: { $in: [track, 'common'] } } : {};
        const resources = await WorkshopResource.find(query).sort({ sessionNumber: 1, createdAt: 1 }).lean();
        return res.json({ resources });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch workshop resources' });
    }
});

router.post('/resources', authenticateToken, async (req, res) => {
    try {
        const { doc, error } = parseResourceBody(req.body || {});
        if (error) return res.status(400).json({ error });

        const newResource = await WorkshopResource.create(doc);
        return res.status(201).json({ success: true, resource: newResource });
    } catch (err) {
        console.error('Error creating resource:', err);
        return res.status(500).json({ error: 'Failed to create workshop resource' });
    }
});

router.put('/resources/:id', authenticateToken, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Note not found' });
        const { doc, error } = parseResourceBody(req.body || {});
        if (error) return res.status(400).json({ error });

        const updated = await WorkshopResource.findByIdAndUpdate(req.params.id, doc, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Note not found' });
        return res.json({ success: true, resource: updated });
    } catch (err) {
        console.error('Error updating resource:', err);
        return res.status(500).json({ error: 'Failed to update workshop resource' });
    }
});

router.delete('/resources/:id', authenticateToken, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Note not found' });
        const deleted = await WorkshopResource.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Note not found' });
        return res.json({ success: true });
    } catch (err) {
        console.error('Error deleting resource:', err);
        return res.status(500).json({ error: 'Failed to delete workshop resource' });
    }
});

/**
 * POST /api/workshop/attendance/clear-all
 * Endpoint to clear all present/absent activity from database
 */
router.post('/clear-all', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { isMongoConnected } = await import('../db/mongodb.js');
        if (!isMongoConnected()) {
            return res.json({ success: true, message: 'Database offline or disconnected. No records stored.' });
        }

        /* Wiping attendance destroys who actually turned up, which nothing else
           records. The caller has to name the number of records it means to
           delete, so a replayed or mistakenly fired request cannot clear a
           session that has since been marked. Everything goes to the recycle
           bin first. */
        const total = await WorkshopAttendance.countDocuments();
        const confirmCount = Number(req.body?.confirmCount);
        if (!Number.isInteger(confirmCount) || confirmCount !== total) {
            return res.status(400).json({
                error: `There are ${total} attendance record(s). Send confirmCount: ${total} to clear them.`,
                total
            });
        }

        const doomed = await WorkshopAttendance.find({}).lean();
        await archiveDocuments('WorkshopAttendance', doomed, {
            deletedBy: actorOf(req),
            reason: 'clear-all from the admin dashboard'
        });

        const result = await WorkshopAttendance.deleteMany({});
        console.log(`[ATTENDANCE CLEARED] ${actorOf(req)} deleted ${result.deletedCount} attendance record(s). Recoverable from the recycle bin.`);
        return res.json({
            success: true,
            message: `Cleared all ${result.deletedCount} attendance activity records from database. They are recoverable from the recycle bin.`
        });
    } catch (err) {
        console.error('Error clearing attendance activity:', err);
        return res.status(500).json({ error: 'Failed to clear attendance activity' });
    }
});

/**
 * GET /api/workshop/attendance/export-csv
 * Download session attendance log as a CSV file.
 */
router.get('/export-csv', authenticateToken, async (req, res) => {
    try {
        const { track = 'software', sessionNumber } = req.query;
        const filter = { track: String(track).toLowerCase() };
        if (sessionNumber) {
            filter.sessionNumber = Number(sessionNumber);
        }

        const records = await WorkshopAttendance.find(filter).sort({ sessionNumber: 1, checkedInAt: -1 }).lean();
        const registrationIds = Array.from(new Set(records.map(r => r.registrationId).filter(Boolean)));
        const rollNumbers = Array.from(new Set(records.map(r => r.rollNo).filter(Boolean)));

        const orConditions = [];
        if (registrationIds.length > 0) {
            orConditions.push({ _id: { $in: registrationIds } });
        }
        if (rollNumbers.length > 0) {
            orConditions.push({ rollNo: { $in: rollNumbers } });
            orConditions.push({ rollNo: { $in: rollNumbers.map(r => new RegExp(`^${escapeRegex(r.trim())}$`, 'i')) } });
        }

        const registrations = orConditions.length > 0
            ? await WorkshopRegistration.find({ $or: orConditions }).lean()
            : [];

        const regMap = new Map();
        registrations.forEach(r => {
            if (r._id) regMap.set(r._id.toString(), r);
            if (r.rollNo) {
                regMap.set(r.rollNo.toLowerCase().trim(), r);
                regMap.set(normalizeRollNo(r.rollNo), r);
            }
        });

        const csvHeaders = ['Roll No', 'Name', 'Department', 'Year', 'Track', 'Session Number', 'Session Topic', 'Status', 'Check-in Method', 'Check-in Time'];
        const csvRows = [csvHeaders.join(',')];

        records.forEach(r => {
            const reg = (r.registrationId && regMap.get(r.registrationId.toString()))
                || (r.rollNo && regMap.get(r.rollNo?.toLowerCase()?.trim()))
                || (r.rollNo && regMap.get(normalizeRollNo(r.rollNo)))
                || {};
            const row = [
                `"${r.rollNo || ''}"`,
                `"${(reg.name || r.name || '').replace(/"/g, '""')}"`,
                `"${(reg.department || r.department || '').replace(/"/g, '""')}"`,
                `"${reg.year || r.year || ''}"`,
                `"${r.track || ''}"`,
                `"${r.sessionNumber || 1}"`,
                `"${(r.sessionTopic || '').replace(/"/g, '""')}"`,
                `"${r.status || 'present'}"`,
                `"${r.scanMethod || 'barcode'}"`,
                `"${r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('en-IN') : ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const filename = `attendance_${track}_session_${sessionNumber || 'all'}_${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (err) {
        console.error('Error exporting attendance CSV:', err);
        return res.status(500).json({ error: 'Failed to export attendance CSV' });
    }
});

/**
 * POST /api/workshop/attendance/bulk-reconcile
 * Bulk import offline scanned roll numbers from CSV / text list.
 */
router.post('/bulk-reconcile', authenticateToken, async (req, res) => {
    try {
        const { track = 'software', sessionNumber = 1, sessionDate, sessionTopic, rollNumbers = [] } = req.body;
        if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
            return res.status(400).json({ error: 'No roll numbers provided for bulk reconcile' });
        }

        const normalizedRolls = rollNumbers.map(r => normalizeRollNo(r)).filter(Boolean);
        const uniqueRolls = Array.from(new Set(normalizedRolls));

        const matchedRegs = await WorkshopRegistration.find({
            rollNo: { $in: uniqueRolls.map(r => new RegExp(`^${r}$`, 'i')) },
            status: 'paid'
        }).lean();

        const regMap = new Map();
        matchedRegs.forEach(reg => regMap.set(normalizeRollNo(reg.rollNo), reg));

        let createdCount = 0;
        let skippedCount = 0;
        const details = [];

        for (const roll of uniqueRolls) {
            const reg = regMap.get(roll);
            if (!reg) {
                skippedCount++;
                details.push({ rollNo: roll, status: 'SKIPPED_UNREGISTERED' });
                continue;
            }

            const existing = await WorkshopAttendance.findOne({
                rollNo: reg.rollNo,
                track: String(track).toLowerCase(),
                sessionNumber: Number(sessionNumber)
            });

            if (existing) {
                skippedCount++;
                details.push({ rollNo: reg.rollNo, status: 'SKIPPED_ALREADY_PRESENT' });
            } else {
                await WorkshopAttendance.create({
                    registrationId: reg.registrationId,
                    rollNo: reg.rollNo,
                    name: reg.name,
                    email: reg.email,
                    phone: reg.phone,
                    track: String(track).toLowerCase(),
                    sessionNumber: Number(sessionNumber),
                    sessionDate: sessionDate || new Date().toISOString().split('T')[0],
                    sessionTopic: sessionTopic || `Session ${sessionNumber}`,
                    status: 'present',
                    scanMethod: 'offline_csv_reconcile',
                    checkedInAt: new Date()
                });
                createdCount++;
                details.push({ rollNo: reg.rollNo, name: reg.name, status: 'CHECKED_IN' });
            }
        }

        return res.json({
            success: true,
            createdCount,
            skippedCount,
            totalProcessed: uniqueRolls.length,
            details
        });
    } catch (err) {
        console.error('Error performing bulk attendance reconcile:', err);
        return res.status(500).json({ error: 'Failed to bulk reconcile attendance' });
    }
});

export default router;


