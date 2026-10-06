import { Router } from 'express';
import crypto from 'crypto';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopResource from '../models/WorkshopResource.js';
import { WORKSHOP_TRACKS } from '../config/workshopPackages.js';
import { authenticateToken } from '../middleware/auth.js';

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
 * Validates a rotating attendance token
 * Allows up to 25 seconds from generation/scan time
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 4) return null;

    const [track, sessionId, timeValStr, signature] = parts;
    const timeVal = parseInt(timeValStr, 10);
    if (isNaN(timeVal)) return null;

    const now = Date.now();
    let isValidTime = false;

    if (timeVal > 1000000000000) {
        // Full millisecond timestamp: valid for 25 seconds
        const ageMs = now - timeVal;
        isValidTime = (ageMs >= -5000 && ageMs <= TOKEN_EXPIRY_MS);
    } else {
        // Bucket format: allows current + previous 2 buckets (~25s)
        const currentBucket = Math.floor(now / ROTATION_INTERVAL_MS);
        isValidTime = (timeVal === currentBucket || timeVal === currentBucket - 1 || timeVal === currentBucket - 2);
    }

    if (!isValidTime) {
        return null;
    }

    const expectedSig = signToken(track, sessionId, timeVal);
    if (signature !== expectedSig) {
        return null;
    }

    return { track, sessionId, timeVal };
}

/**
 * GET /api/workshop/attendance/session-token
 * Admin only: Generates current rotating token for projector display
 */
router.get('/session-token', authenticateToken, async (req, res) => {
    try {
        const track = String(req.query.track || 'software').toLowerCase().trim();
        const sessionNumber = parseInt(req.query.sessionNumber || '1', 10);
        const sessionDate = String(req.query.sessionDate || new Date().toISOString().slice(0, 10)).trim();
        const sessionTopic = String(req.query.sessionTopic || '').trim();

        if (!['software', 'powertrain'].includes(track)) {
            return res.status(400).json({ error: "Invalid track. Must be 'software' or 'powertrain'." });
        }

        const sessionId = `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;
        const now = Date.now();
        const signature = signToken(track, sessionId, now);
        const token = `${track}.${sessionId}.${now}.${signature}`;

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
 * Public endpoint: Student submits roll number, email, and device ID
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
        const cleanRoll = String(rollNo).trim().toUpperCase();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanDeviceId = String(deviceId).trim();

        // 2. Query student registration in MongoDB
        const registration = await WorkshopRegistration.findOne({
            rollNo: cleanRoll,
            email: cleanEmail
        });

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
            rollNo: cleanRoll,
            sessionId
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
            rollNo: { $ne: cleanRoll }
        });

        if (proxyCheck) {
            return res.status(403).json({
                error: 'Proxy attendance blocked. This device has already recorded attendance for another candidate for this session.',
                isProxy: true
            });
        }

        // Parse session metadata
        // sessionId format: "software-s01-2026-10-06"
        const sessionParts = sessionId.split('-');
        const sessionNumStr = sessionParts[1] ? sessionParts[1].replace('s', '') : '1';
        const sessionNumber = parseInt(sessionNumStr, 10) || 1;
        const sessionDate = sessionParts.slice(2).join('-') || new Date().toISOString().slice(0, 10);

        // 7. Record Attendance
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const newAttendance = await WorkshopAttendance.create({
            registrationId: registration._id,
            rollNo: cleanRoll,
            email: cleanEmail,
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

        const cleanRoll = String(rollNo).trim().toUpperCase();
        const registration = await WorkshopRegistration.findOne({
            rollNo: cleanRoll,
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

        const existing = await WorkshopAttendance.findOne({ rollNo: cleanRoll, sessionId });
        if (existing) {
            return res.json({ success: true, message: 'Candidate is already marked present.' });
        }

        const manualRecord = await WorkshopAttendance.create({
            registrationId: registration._id,
            rollNo: cleanRoll,
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

/**
 * POST /api/workshop/attendance/profile
 * Public endpoint: Candidate inputs email ID, phone, or roll number to view individual profile,
 * complete session attendance history, and workshop notes/slides/resources.
 */
router.post('/profile', async (req, res) => {
    try {
        const queryRaw = String(req.body.identifier || req.body.email || req.body.phone || req.body.rollNo || '').trim();
        if (!queryRaw) {
            return res.status(400).json({ error: 'Please enter your Email ID, Phone Number, or Roll Number.' });
        }

        const queryLower = queryRaw.toLowerCase();
        const digits = queryRaw.replace(/\D/g, '');
        const phoneDigits = digits.length >= 10 ? digits.slice(-10) : digits;

        const searchConditions = [{ email: queryLower }, { rollNo: queryRaw.toUpperCase() }];
        if (phoneDigits.length >= 7) {
            searchConditions.push({ phone: new RegExp(`${phoneDigits}$`) });
        }

        const candidate = await WorkshopRegistration.findOne({
            $or: searchConditions
        }).lean();

        if (!candidate) {
            return res.status(404).json({
                error: `No candidate registration found matching "${queryRaw}". Please verify your email ID or phone number.`
            });
        }

        const tracksEnrolled = Array.isArray(candidate.tracksEnrolled) && candidate.tracksEnrolled.length > 0
            ? candidate.tracksEnrolled
            : (candidate.package === 'combo' ? ['software', 'powertrain'] : [candidate.package || 'software']);

        // Fetch attendance records
        const attendanceRecords = await WorkshopAttendance.find({
            rollNo: candidate.rollNo
        }).lean();

        const attendanceMap = new Map();
        attendanceRecords.forEach((att) => {
            if (att.sessionId) attendanceMap.set(att.sessionId, att);
        });

        // Date helper (IST reference)
        const todayStr = '2026-10-06';

        // Build session timeline for enrolled track(s)
        const sessionTimeline = [];
        let totalConducted = 0;
        let totalPresent = 0;

        tracksEnrolled.forEach((trackId) => {
            const trackConfig = WORKSHOP_TRACKS[trackId];
            if (!trackConfig || !Array.isArray(trackConfig.schedule)) return;

            trackConfig.schedule.forEach((sessionItem) => {
                const att = attendanceMap.get(sessionItem.id);
                const isHoliday = sessionItem.type === 'holiday';

                let status = 'UPCOMING';
                let checkedInAt = null;

                if (att) {
                    status = 'PRESENT';
                    checkedInAt = att.checkedInAt;
                    if (!isHoliday) {
                        totalPresent += 1;
                        totalConducted += 1;
                    }
                } else if (!isHoliday) {
                    status = 'UPCOMING';
                }

                sessionTimeline.push({
                    id: sessionItem.id,
                    track: trackId,
                    trackName: trackConfig.name,
                    label: sessionItem.label,
                    days: sessionItem.days,
                    date: sessionItem.date,
                    title: sessionItem.title,
                    instructor: sessionItem.instructor || '-',
                    venue: sessionItem.venue || trackConfig.venue,
                    type: sessionItem.type || 'lecture',
                    project: sessionItem.project || null,
                    subject: sessionItem.subject || null,
                    status,
                    checkedInAt
                });
            });
        });

        const attendancePercentage = totalConducted > 0 ? Math.round((totalPresent / totalConducted) * 100) : 100;
        const isEligibleForCertificate = attendancePercentage >= 75;

        // Fetch dynamic resources
        const dynamicResources = await WorkshopResource.find({
            track: { $in: [...tracksEnrolled, 'common'] }
        }).sort({ sessionNumber: 1 }).lean();

        // Built-in resources per track
        const defaultResources = [];
        tracksEnrolled.forEach((tId) => {
            const trk = WORKSHOP_TRACKS[tId];
            if (trk) {
                defaultResources.push({
                    id: `default-${tId}-syllabus`,
                    track: tId,
                    title: `${trk.name} Official Syllabus & Lab Guide`,
                    description: trk.overview,
                    resources: [
                        { label: 'Download PDF Syllabus', url: trk.syllabus, type: 'pdf' }
                    ]
                });
            }
        });

        return res.json({
            ok: true,
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
                totalConducted,
                totalPresent,
                attendancePercentage,
                isEligibleForCertificate,
                certificateMessage: isEligibleForCertificate
                    ? '✓ Certificate Eligible (≥ 75% attendance maintained)'
                    : `⚠️ ${75 - attendancePercentage}% away from 75% certificate threshold`
            },
            sessionTimeline,
            resources: [...defaultResources, ...dynamicResources]
        });
    } catch (err) {
        console.error('Error fetching participant profile:', err);
        return res.status(500).json({ error: 'Failed to load participant profile. Please try again.' });
    }
});

/**
 * GET & POST /api/workshop/attendance/resources
 * Manage dynamic notes, slides, and links for workshop sessions
 */
router.get('/resources', async (req, res) => {
    try {
        const track = req.query.track ? String(req.query.track).toLowerCase() : null;
        const query = track ? { track: { $in: [track, 'common'] } } : {};
        const resources = await WorkshopResource.find(query).sort({ sessionNumber: 1 }).lean();
        return res.json({ resources });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch workshop resources' });
    }
});

router.post('/resources', authenticateToken, async (req, res) => {
    try {
        const { track, sessionId, sessionNumber, title, description, resources } = req.body;
        if (!track || !sessionId || !title) {
            return res.status(400).json({ error: 'track, sessionId, and title are required' });
        }

        const newResource = await WorkshopResource.create({
            track,
            sessionId,
            sessionNumber: sessionNumber || 1,
            title,
            description: description || '',
            resources: Array.isArray(resources) ? resources : []
        });

        return res.status(201).json({ success: true, resource: newResource });
    } catch (err) {
        console.error('Error creating resource:', err);
        return res.status(500).json({ error: 'Failed to create workshop resource' });
    }
});

/**
 * POST /api/workshop/attendance/clear-all
 * Endpoint to clear all present/absent activity from database
 */
router.post('/clear-all', async (req, res) => {
    try {
        const { isMongoConnected } = await import('../db/mongodb.js');
        if (!isMongoConnected()) {
            return res.json({ success: true, message: 'Database offline or disconnected. No records stored.' });
        }
        const result = await WorkshopAttendance.deleteMany({});
        console.log(`[ATTENDANCE CLEARED] Deleted ${result.deletedCount} attendance record(s).`);
        return res.json({
            success: true,
            message: `Cleared all ${result.deletedCount} attendance activity records from database.`
        });
    } catch (err) {
        console.error('Error clearing attendance activity:', err);
        return res.status(500).json({ error: 'Failed to clear attendance activity' });
    }
});

export default router;

