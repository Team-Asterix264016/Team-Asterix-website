import { Router } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopAttendanceSession from '../models/WorkshopAttendanceSession.js';
import WorkshopResource from '../models/WorkshopResource.js';
import SiteConfig from '../models/SiteConfig.js';
import { WORKSHOP_TRACKS } from '../config/workshopPackages.js';
import { sessionIsoDate } from '../config/sessionDates.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

const ROTATION_INTERVAL_MS = 12000; // 12 seconds projector rotation
const TOKEN_EXPIRY_MS = 25000; // 25 seconds validity for scanned token
const ATTENDANCE_SECRET = process.env.ATTENDANCE_SECRET
    || process.env.JWT_SECRET
    || 'asterix-attendance-dynamic-secret-key-2026';

const MAX_ALLOWED_DISTANCE_METERS = 50;
const MAX_ALLOWED_ACCURACY_METERS = 100;

/**
 * Calculates geographic distance in meters between two lat/lng coordinates using Haversine formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

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

        if (!['software', 'powertrain'].includes(track)) {
            return res.status(400).json({ error: "Invalid track. Must be 'software' or 'powertrain'." });
        }

        // If admin provided location when fetching token, store/update it
        let hasAdminLocation = false;
        let adminLocation = null;
        if (req.query.latitude != null && req.query.longitude != null) {
            const lat = parseFloat(req.query.latitude);
            const lng = parseFloat(req.query.longitude);
            const acc = parseFloat(req.query.accuracy);

            if (!isNaN(lat) && !isNaN(lng)) {
                const updatedSession = await WorkshopAttendanceSession.findOneAndUpdate(
                    { sessionId },
                    {
                        $set: {
                            track,
                            sessionNumber,
                            sessionDate,
                            sessionTopic,
                            'adminLocation.latitude': lat,
                            'adminLocation.longitude': lng,
                            'adminLocation.accuracy': isNaN(acc) ? null : acc,
                            'adminLocation.updatedAt': new Date(),
                            isActive: true
                        }
                    },
                    { upsert: true, new: true }
                );
                hasAdminLocation = true;
                adminLocation = updatedSession.adminLocation;
            }
        }

        if (!hasAdminLocation) {
            const existingSession = await WorkshopAttendanceSession.findOne({ sessionId }).lean();
            if (existingSession?.adminLocation?.latitude != null) {
                hasAdminLocation = true;
                adminLocation = existingSession.adminLocation;
            }
        }

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
            scanUrl,
            hasAdminLocation,
            adminLocation
        });
    } catch (err) {
        console.error('Error generating session token:', err);
        return res.status(500).json({ error: 'Failed to generate session token' });
    }
});

/**
 * POST /api/workshop/attendance/session-location
 * Admin only: Explicitly store/update the admin GPS location for an attendance session
 */
router.post('/session-location', authenticateToken, async (req, res) => {
    try {
        const { track, sessionNumber, sessionDate, sessionTopic, latitude, longitude, accuracy } = req.body;

        const cleanTrack = String(track || 'software').toLowerCase().trim();
        const num = parseInt(sessionNumber || '1', 10);
        const dateStr = String(sessionDate || new Date().toISOString().slice(0, 10)).trim();
        const sessionId = `${cleanTrack}-s${String(num).padStart(2, '0')}-${dateStr}`;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const acc = parseFloat(accuracy);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
        }

        const updatedSession = await WorkshopAttendanceSession.findOneAndUpdate(
            { sessionId },
            {
                $set: {
                    track: cleanTrack,
                    sessionNumber: num,
                    sessionDate: dateStr,
                    sessionTopic: sessionTopic || '',
                    'adminLocation.latitude': lat,
                    'adminLocation.longitude': lng,
                    'adminLocation.accuracy': isNaN(acc) ? null : acc,
                    'adminLocation.updatedAt': new Date(),
                    isActive: true
                }
            },
            { upsert: true, new: true }
        );

        return res.json({
            success: true,
            message: 'Session GPS location stored successfully!',
            sessionId,
            adminLocation: updatedSession.adminLocation
        });
    } catch (err) {
        console.error('Error storing session location:', err);
        return res.status(500).json({ error: 'Failed to save session GPS location' });
    }
});

/**
 * POST /api/workshop/attendance/checkin
 * Public endpoint: Student submits roll number, email, device ID, and GPS location
 */
router.post('/checkin', async (req, res) => {
    try {
        const { token, rollNo, email, deviceId, latitude, longitude, accuracy } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Attendance token is required. Please scan the QR code again.' });
        }
        if (!rollNo || !email) {
            return res.status(400).json({ error: 'Both Roll Number and Email are required.' });
        }
        if (!deviceId) {
            return res.status(400).json({ error: 'Device verification token is missing. Please reload the page.' });
        }

        // 1. Verify student GPS location
        const studentLat = parseFloat(latitude);
        const studentLng = parseFloat(longitude);
        const studentAcc = parseFloat(accuracy);

        if (isNaN(studentLat) || isNaN(studentLng)) {
            return res.status(400).json({
                error: 'GPS location access is required to verify in-person attendance. Please allow location access on your device.'
            });
        }

        // Check GPS accuracy: If accuracy > MAX_ALLOWED_ACCURACY_METERS (100m), ask for better accuracy
        if (!isNaN(studentAcc) && studentAcc > MAX_ALLOWED_ACCURACY_METERS) {
            return res.status(400).json({
                error: `GPS location accuracy is too poor (±${Math.round(studentAcc)}m). Please enable High Accuracy GPS / Location on your device and try again.`,
                accuracy: Math.round(studentAcc)
            });
        }

        // 2. Verify dynamic rotating token
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

        // 3. Verify distance against admin's session location
        const sessionDoc = await WorkshopAttendanceSession.findOne({ sessionId });
        if (!sessionDoc || !sessionDoc.adminLocation || sessionDoc.adminLocation.latitude == null) {
            return res.status(400).json({
                error: 'Attendance session location has not been initialized by the admin yet. Please ask the instructor to start the session with location enabled.'
            });
        }

        const adminLat = sessionDoc.adminLocation.latitude;
        const adminLng = sessionDoc.adminLocation.longitude;
        const distanceMeters = calculateHaversineDistance(adminLat, adminLng, studentLat, studentLng);

        if (distanceMeters > MAX_ALLOWED_DISTANCE_METERS) {
            return res.status(403).json({
                error: `Attendance rejected: You are ${Math.round(distanceMeters)} meters away from the session location. You must be within 50 meters to mark attendance.`,
                distance: Math.round(distanceMeters),
                maxAllowed: MAX_ALLOWED_DISTANCE_METERS
            });
        }

        // 4. Query student registration in MongoDB
        const registration = await WorkshopRegistration.findOne({
            rollNo: cleanRoll,
            email: cleanEmail
        });

        if (!registration) {
            return res.status(404).json({
                error: `No registration found for Roll Number "${cleanRoll}" and Email "${cleanEmail}". Please check your details.`
            });
        }

        // 5. Verify payment status
        if (registration.status !== 'paid') {
            return res.status(403).json({
                error: `Your registration is currently marked as "${registration.status}". Attendance can only be recorded for confirmed paid candidates.`,
                status: registration.status
            });
        }

        // 6. Verify track eligibility
        const isTrackEnrolled = (registration.tracksEnrolled || []).includes(track) || registration.package === 'combo';
        if (!isTrackEnrolled) {
            const registeredTracks = (registration.tracksEnrolled || []).join(' & ') || registration.package;
            return res.status(403).json({
                error: `You are registered for [${registeredTracks.toUpperCase()}], but this session is for [${track.toUpperCase()}]. Please attend your registered workshop.`
            });
        }

        // 7. Check if candidate already checked in for this session
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

        // 8. Anti-proxy: Check if this device was already used by a DIFFERENT candidate in this session
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
        const sessionParts = sessionId.split('-');
        const sessionNumStr = sessionParts[1] ? sessionParts[1].replace('s', '') : '1';
        const sessionNumber = parseInt(sessionNumStr, 10) || 1;
        const sessionDate = sessionParts.slice(2).join('-') || new Date().toISOString().slice(0, 10);

        // 9. Record Attendance with location details
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
            latitude: studentLat,
            longitude: studentLng,
            locationAccuracy: !isNaN(studentAcc) ? studentAcc : null,
            distanceFromAdmin: Math.round(distanceMeters * 10) / 10,
            verifiedBy: 'qr-scan',
            checkedInAt: new Date()
        });

        res.locals.whatsappActivity = { type: 'attendance', name: registration.name };
        return res.status(201).json({
            success: true,
            message: `Attendance confirmed successfully! (${Math.round(distanceMeters)}m from instructor)`,
            attendance: {
                name: newAttendance.name,
                rollNo: newAttendance.rollNo,
                track: newAttendance.track,
                department: newAttendance.department,
                year: newAttendance.year,
                package: newAttendance.package,
                receiptNo: registration.receiptNo,
                checkedInAt: newAttendance.checkedInAt,
                distanceFromAdmin: newAttendance.distanceFromAdmin
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

        // Check if admin location is set for this session
        const sessionDoc = await WorkshopAttendanceSession.findOne({ sessionId }).lean();
        const hasAdminLocation = Boolean(sessionDoc?.adminLocation?.latitude != null);

        return res.json({
            sessionId,
            track,
            totalEligible,
            totalPresent,
            percentage,
            hasAdminLocation,
            adminLocation: sessionDoc?.adminLocation || null,
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
        // If scanner reads a URL like http://...#rollNo=21EC001 or similar
        if (cleanInput.includes('rollNo=')) {
            const match = cleanInput.match(/rollNo=([^&]+)/i);
            if (match) cleanInput = match[1];
        } else if (cleanInput.includes(':')) {
            const parts = cleanInput.split(':');
            cleanInput = parts[parts.length - 1];
        }

        const cleanBarcode = cleanInput.trim();
        const upperBarcode = cleanBarcode.toUpperCase();

        // Target track & session ID resolution
        const track = (inputTrack || 'software').toLowerCase().trim();
        const targetSessionId = inputSessionId
            ? String(inputSessionId).trim()
            : `${track}-s${String(sessionNumber || 1).padStart(2, '0')}-${sessionDate || new Date().toISOString().slice(0, 10)}`;

        // 1. Search candidate by register number (rollNo), email, phone, or receipt number
        const searchConditions = [
            { rollNo: upperBarcode },
            { rollNo: new RegExp(`^${cleanBarcode}$`, 'i') },
            { email: cleanBarcode.toLowerCase() },
            { receiptNo: upperBarcode }
        ];

        const digits = cleanBarcode.replace(/\D/g, '');
        if (digits.length >= 7) {
            searchConditions.push({ phone: new RegExp(`${digits.slice(-10)}$`) });
        }

        const registration = await WorkshopRegistration.findOne({ $or: searchConditions });

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
            rollNo: registration.rollNo,
            sessionId: targetSessionId
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

        const queryLower = queryRaw.toLowerCase();
        const digits = queryRaw.replace(/\D/g, '');
        const phoneDigits = digits.length >= 10 ? digits.slice(-10) : digits;

        const searchConditions = [{ email: queryLower }, { rollNo: queryRaw.toUpperCase() }];
        if (phoneDigits.length >= 7) {
            searchConditions.push({ phone: new RegExp(`${phoneDigits}$`) });
        }

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

        // Check-ins are keyed by the date the admin opened the QR session for, not by schedule id,
        // so sessions are matched on track + date. A session counts as conducted once anyone has
        // checked in to it; only then can a participant be marked as having missed it.
        const [attendanceRecords, conductedSessions] = await Promise.all([
            WorkshopAttendance.find({ rollNo: candidate.rollNo }).lean(),
            WorkshopAttendance.aggregate([
                { $match: { track: { $in: tracksEnrolled } } },
                { $group: { _id: { track: '$track', date: '$sessionDate' } } }
            ])
        ]);
        const attendanceByDate = new Map(attendanceRecords.map((att) => [`${att.track}|${att.sessionDate}`, att]));
        const conductedDates = new Set(conductedSessions.map(({ _id }) => `${_id.track}|${_id.date}`));

        // Build session timeline for enrolled track(s)
        const sessionTimeline = [];
        let totalConducted = 0;
        let totalPresent = 0;

        Object.entries(tracks).forEach(([trackId, trackConfig]) => {
            if (!Array.isArray(trackConfig.schedule)) return;

            trackConfig.schedule.forEach((sessionItem) => {
                const dateKey = `${trackId}|${sessionIsoDate(sessionItem.date, trackConfig)}`;
                const att = attendanceByDate.get(dateKey);
                const isHoliday = sessionItem.type === 'holiday';
                // Catch-ups are optional knowledge-sharing sessions: shown, never counted or marked missed.
                const isOptional = sessionItem.type === 'catchup';

                let status = isOptional ? 'OPTIONAL' : 'UPCOMING';
                let checkedInAt = null;

                if (!isHoliday && att) {
                    status = 'PRESENT';
                    checkedInAt = att.checkedInAt;
                    if (!isOptional) {
                        totalPresent += 1;
                        totalConducted += 1;
                    }
                } else if (!isHoliday && !isOptional && conductedDates.has(dateKey)) {
                    status = 'ABSENT';
                    totalConducted += 1;
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
                    checkedInAt,
                    isoDate: sessionIsoDate(sessionItem.date, trackConfig)
                });
            });
        });

        // One date-ordered timetable across tracks (combo students otherwise saw every software
        // session before any powertrain one). Undated sessions sink to the end.
        sessionTimeline.sort((a, b) => (a.isoDate || '9999').localeCompare(b.isoDate || '9999'));

        const attendancePercentage = totalConducted > 0 ? Math.round((totalPresent / totalConducted) * 100) : 100;
        const isEligibleForCertificate = attendancePercentage >= 75;

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
                totalConducted,
                totalPresent,
                attendancePercentage,
                isEligibleForCertificate,
                certificateMessage: isEligibleForCertificate
                    ? '✓ Certificate Eligible (≥ 75% attendance maintained)'
                    : `⚠️ ${75 - attendancePercentage}% away from 75% certificate threshold`
            },
            sessionTimeline,
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

        const queryLower = queryRaw.toLowerCase();
        const digits = queryRaw.replace(/\D/g, '');
        const phoneDigits = digits.length >= 10 ? digits.slice(-10) : digits;

        const searchConditions = [{ email: queryLower }, { rollNo: queryRaw.toUpperCase() }];
        if (phoneDigits.length >= 7) {
            searchConditions.push({ phone: new RegExp(`${phoneDigits}$`) });
        }

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
        candidate.customPasswordText = newPwd;
        candidate.passwordUpdatedAt = new Date();
        await candidate.save();

        return res.json({ ok: true, message: 'Password updated successfully! You can now log in using your new password.' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error while updating password.' });
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

