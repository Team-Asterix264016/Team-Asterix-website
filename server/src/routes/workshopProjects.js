import { Router } from 'express';
import WorkshopProjectConfig from '../models/WorkshopProjectConfig.js';
import WorkshopProjectSubmission from '../models/WorkshopProjectSubmission.js';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import { authenticateToken } from '../middleware/auth.js';
import { isMongoConnected } from '../db/mongodb.js';

const router = Router();

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    next();
}

function requireLeadOrAdmin(req, res, next) {
    const level = req.user?.accessLevel || req.user?.role;
    if (!req.user || !['SuperAdmin', 'Lead', 'Member', 'Admin'].includes(level)) {
        return res.status(403).json({ error: 'Forbidden: Admin privileges required.' });
    }
    next();
}

function normalizeRollNo(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '').slice(-10);
}

async function getConfig() {
    return WorkshopProjectConfig.findOneAndUpdate(
        { key: 'main' },
        { $setOnInsert: { key: 'main' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function findRegistration({ email, rollNo, phone }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRoll = normalizeRollNo(rollNo);
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedEmail || !normalizedRoll || normalizedPhone.length !== 10) return null;

    const matches = await WorkshopRegistration.find({ email: normalizedEmail, status: 'paid' })
        .sort({ paidAt: -1, createdAt: -1 })
        .lean();

    return matches.find(registration =>
        normalizeRollNo(registration.rollNo) === normalizedRoll
        && normalizePhone(registration.phone) === normalizedPhone
    ) || null;
}

function studentView(registration) {
    return {
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        college: registration.college || '',
        year: registration.year,
        department: registration.department,
        rollNo: registration.rollNo,
        package: registration.package,
        tracksEnrolled: registration.tracksEnrolled || []
    };
}

function publicSubmission(submission) {
    if (!submission) return null;
    return {
        driveLink: submission.driveLink,
        feedback: submission.feedback,
        answers: submission.answers
    };
}

function validDriveLink(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname.toLowerCase());
    } catch {
        return false;
    }
}

router.get('/form', requireDb, async (_req, res) => {
    try {
        const config = await getConfig();
        res.json({
            title: config.title,
            description: config.description,
            isOpen: config.isOpen,
            questions: config.questions
        });
    } catch (error) {
        console.error('Error loading workshop project form:', error);
        res.status(500).json({ error: 'Could not load the project submission form.' });
    }
});

router.post('/lookup', requireDb, async (req, res) => {
    try {
        const registration = await findRegistration(req.body || {});
        if (!registration) {
            return res.status(404).json({ error: 'No paid workshop registration matched those details. Check your email, registered number, and phone.' });
        }

        const submission = await WorkshopProjectSubmission.findOne({ registrationId: registration._id }).lean();
        res.json({ student: studentView(registration), submission: publicSubmission(submission) });
    } catch (error) {
        console.error('Error matching workshop registration:', error);
        res.status(500).json({ error: 'Could not verify the registration.' });
    }
});

router.post('/', requireDb, async (req, res) => {
    try {
        const body = req.body || {};
        const registration = await findRegistration(body);
        if (!registration) {
            return res.status(404).json({ error: 'No paid workshop registration matched those details. Check your email, registered number, and phone.' });
        }

        const config = await getConfig();
        if (!config.isOpen) return res.status(403).json({ error: 'Project submissions are currently closed.' });
        if (!validDriveLink(body.driveLink)) {
            return res.status(400).json({ error: 'Enter a valid HTTPS Google Drive or Google Docs sharing link.' });
        }

        const submittedAnswers = Array.isArray(body.answers) ? body.answers : [];
        const answers = [];
        for (const question of config.questions) {
            const supplied = submittedAnswers.find(answer => String(answer.questionId) === String(question._id));
            const answerText = String(supplied?.answer || '').trim();
            if (question.required && !answerText) {
                return res.status(400).json({ error: `Please answer: ${question.label}` });
            }
            if (question.type === 'select' && answerText && !question.options.includes(answerText)) {
                return res.status(400).json({ error: `Choose a valid option for: ${question.label}` });
            }
            answers.push({ questionId: String(question._id), label: question.label, answer: answerText });
        }

        const submission = await WorkshopProjectSubmission.findOneAndUpdate(
            { registrationId: registration._id },
            {
                $set: {
                    ...studentView(registration),
                    registrationId: registration._id,
                    driveLink: String(body.driveLink).trim(),
                    feedback: String(body.feedback || '').trim().slice(0, 3000),
                    answers,
                    submittedAt: new Date()
                }
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, message: 'Project submission saved.', submission: publicSubmission(submission) });
    } catch (error) {
        console.error('Error saving workshop project submission:', error);
        res.status(500).json({ error: 'Could not save the project submission.' });
    }
});

router.get('/admin/config', authenticateToken, requireLeadOrAdmin, requireDb, async (_req, res) => {
    try {
        const config = await getConfig();
        res.json({ config });
    } catch (error) {
        console.error('Error loading workshop project settings:', error);
        res.status(500).json({ error: 'Could not load project submission settings.' });
    }
});

router.put('/admin/config', authenticateToken, requireLeadOrAdmin, requireDb, async (req, res) => {
    try {
        const body = req.body || {};
        if (!String(body.title || '').trim()) return res.status(400).json({ error: 'Form title is required.' });
        if (!Array.isArray(body.questions) || body.questions.length > 20) {
            return res.status(400).json({ error: 'Provide up to 20 questions.' });
        }

        const questions = body.questions.map((question, index) => {
            const label = String(question.label || '').trim();
            const type = ['text', 'textarea', 'select'].includes(question.type) ? question.type : 'text';
            const options = type === 'select'
                ? [...new Set((Array.isArray(question.options) ? question.options : []).map(option => String(option).trim()).filter(Boolean))].slice(0, 20)
                : [];
            if (!label) throw new Error(`Question ${index + 1} needs a label.`);
            if (type === 'select' && options.length < 2) throw new Error(`Question ${index + 1} needs at least two options.`);
            return {
                ...(question._id ? { _id: question._id } : {}),
                label: label.slice(0, 160),
                type,
                required: question.required !== false,
                options
            };
        });

        const config = await WorkshopProjectConfig.findOneAndUpdate(
            { key: 'main' },
            { $set: {
                title: String(body.title).trim().slice(0, 120),
                description: String(body.description || '').trim().slice(0, 1000),
                isOpen: body.isOpen !== false,
                questions
            } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, config });
    } catch (error) {
        const status = error.message?.startsWith('Question ') ? 400 : 500;
        if (status === 500) console.error('Error saving workshop project settings:', error);
        res.status(status).json({ error: status === 400 ? error.message : 'Could not save project submission settings.' });
    }
});

router.get('/admin/submissions', authenticateToken, requireLeadOrAdmin, requireDb, async (_req, res) => {
    try {
        const submissions = await WorkshopProjectSubmission.find({}).sort({ updatedAt: -1 }).lean();
        res.json({ success: true, submissions });
    } catch (error) {
        console.error('Error loading workshop project submissions:', error);
        res.status(500).json({ error: 'Could not load project submissions.' });
    }
});

router.get('/admin/registrations', authenticateToken, requireLeadOrAdmin, requireDb, async (_req, res) => {
    try {
        const registrations = await WorkshopRegistration.find({})
            .sort({ paidAt: -1, createdAt: -1 })
            .lean();
        const registrationIds = registrations.map(registration => registration._id);
        const submissions = await WorkshopProjectSubmission.find({ registrationId: { $in: registrationIds } }).lean();
        const submissionByRegistration = new Map(submissions.map(submission => [String(submission.registrationId), submission]));

        res.json({
            success: true,
            registrations: registrations.map(registration => ({
                ...registration,
                projectSubmission: submissionByRegistration.get(String(registration._id)) || null
            }))
        });
    } catch (error) {
        console.error('Error loading workshop student roster:', error);
        res.status(500).json({ error: 'Could not load workshop student records.' });
    }
});

export default router;