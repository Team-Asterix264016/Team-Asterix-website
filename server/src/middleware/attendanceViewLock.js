import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.js';

/*
 * Temporary layer: hides attendance from participants while the records are
 * being corrected. It sits in front of the existing routes and rewrites their
 * responses, so none of the routes themselves change. Admin views are not
 * touched: the admin portal keeps seeing real figures.
 *
 * To lift the lock, set ATTENDANCE_VIEW_LOCKED=false in the server environment
 * and restart, or remove this middleware's mount line from src/index.js.
 */

export const ATTENDANCE_VIEW_LOCKED = process.env.ATTENDANCE_VIEW_LOCKED !== 'false';

export const ATTENDANCE_VIEW_LOCK = {
    title: 'Attendance viewing is temporarily blocked',
    message: "Attendance viewing is temporarily blocked. You'll be able to view your attendance within today.",
    note: 'Thank you for your patience. Please stay tuned!'
};

// Statuses that reveal whether the participant attended a session.
const ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT']);

function isAdminRequest(req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return false;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.type !== 'workshop_student' && Boolean(decoded.username);
    } catch {
        return false;
    }
}

/* Swaps res.json for one that passes the body through `scrub` first. */
function rewriteJson(res, scrub) {
    const send = res.json.bind(res);
    res.json = (body) => send(body && typeof body === 'object' ? scrub(body) : body);
}

function scrubProfile(body) {
    if (!body.ok) return body;
    return {
        ...body,
        attendanceSummary: null,
        makeupTasks: [],
        sessionTimeline: (body.sessionTimeline || []).map((session) => (
            ATTENDANCE_STATUSES.has(session.status)
                ? { ...session, status: 'LOCKED', checkedInAt: null }
                : session
        )),
        attendanceViewLock: ATTENDANCE_VIEW_LOCK
    };
}

function scrubStudentStatus(body) {
    if (!body.success) return body;
    const { attendance: _hidden, ...rest } = body;
    return { ...rest, attendanceViewLock: ATTENDANCE_VIEW_LOCK };
}

export function attendanceViewLock(req, res, next) {
    if (!ATTENDANCE_VIEW_LOCKED) return next();

    if (req.method === 'POST' && req.path === '/api/workshop/attendance/profile') {
        rewriteJson(res, scrubProfile);
    } else if (req.method === 'GET' && req.path === '/api/workshop/student-status' && !isAdminRequest(req)) {
        rewriteJson(res, scrubStudentStatus);
    }
    next();
}
