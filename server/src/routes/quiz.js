import { Router } from 'express';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizSubmission from '../models/QuizSubmission.js';
import { authenticateToken } from '../middleware/auth.js';
import { isMongoConnected } from '../db/mongodb.js';

const router = Router();

function requireDb(req, res, next) {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database service is unavailable. Please try again shortly.' });
    }
    next();
}

function csvCell(value) {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
}

function findQuizByIdOrSlug(idOrSlug) {
    if (mongoose.isValidObjectId(idOrSlug)) {
        return Quiz.findById(idOrSlug);
    }
    return Quiz.findOne({ slug: String(idOrSlug).toLowerCase().trim() });
}

// -------------------------------------------------------------
// ADMIN ROUTES (Protected)
// -------------------------------------------------------------

/**
 * GET /api/quiz/admin/list
 * Returns all quizzes with submission statistics for the admin dashboard.
 */
router.get('/admin/list', authenticateToken, requireDb, async (req, res) => {
    try {
        const quizzes = await Quiz.find({}).sort({ createdAt: -1 }).lean();
        
        // Fetch submission counts and average scores in bulk
        const quizIds = quizzes.map(q => q._id);
        const stats = await QuizSubmission.aggregate([
            { $match: { quizId: { $in: quizIds }, status: { $in: ['completed', 'timed-out'] }, isArchived: { $ne: true } } },
            {
                $group: {
                    _id: '$quizId',
                    count: { $sum: 1 },
                    avgScore: { $avg: '$score' },
                    avgPercentage: { $avg: '$percentage' },
                    passedCount: { $sum: { $cond: ['$passed', 1, 0] } }
                }
            }
        ]);

        const statsMap = new Map(stats.map(s => [s._id.toString(), s]));

        const enriched = quizzes.map(q => {
            const st = statsMap.get(q._id.toString()) || { count: 0, avgScore: 0, avgPercentage: 0, passedCount: 0 };
            const now = new Date();
            const start = new Date(q.startTime);
            const end = new Date(q.endTime);
            const pub = new Date(q.resultsPublishTime);

            let liveState = 'upcoming';
            if (now >= start && now <= end) liveState = 'active';
            else if (now > end) liveState = 'ended';

            const resultsPublished = q.manualResultsRelease || (q.resultsPublishTime && now >= pub);

            return {
                ...q,
                liveState,
                resultsPublished,
                totalQuestions: q.questions?.length || 0,
                submissionCount: st.count,
                avgScore: Math.round(st.avgScore * 10) / 10,
                avgPercentage: Math.round(st.avgPercentage * 10) / 10,
                passedCount: st.passedCount
            };
        });

        res.json({ success: true, quizzes: enriched });
    } catch (err) {
        console.error('Error fetching admin quizzes:', err);
        res.status(500).json({ error: 'Failed to load quizzes.' });
    }
});

/**
 * GET /api/quiz/admin/:id
 * Returns single quiz with full question details and answer keys.
 */
router.get('/admin/:id', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid quiz ID.' });
        }
        const quiz = await Quiz.findById(id).lean();
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        res.json({ success: true, quiz });
    } catch (err) {
        console.error('Error fetching quiz details:', err);
        res.status(500).json({ error: 'Failed to fetch quiz details.' });
    }
});

/**
 * POST /api/quiz/admin/create
 * Creates a new quiz with questions, schedule, and result publishing time.
 */
router.post('/admin/create', authenticateToken, requireDb, async (req, res) => {
    try {
        const {
            title,
            description,
            slug,
            startTime,
            endTime,
            durationMinutes,
            resultsPublishTime,
            manualResultsRelease,
            showExplanations,
            questions,
            passingPercentage,
            shuffleQuestions,
            shuffleOptions
        } = req.body || {};

        if (!title?.trim()) {
            return res.status(400).json({ error: 'Quiz title is required.' });
        }
        if (!startTime || !endTime || !durationMinutes) {
            return res.status(400).json({ error: 'Start time, end time, and duration are required.' });
        }
        if (new Date(endTime) <= new Date(startTime)) {
            return res.status(400).json({ error: 'End time must be after start time.' });
        }
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'At least one MCQ question is required.' });
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText?.trim()) {
                return res.status(400).json({ error: `Question #${i + 1} text is required.` });
            }
            if (!Array.isArray(q.options) || q.options.length < 2) {
                return res.status(400).json({ error: `Question #${i + 1} must have at least 2 options.` });
            }
            if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
                return res.status(400).json({ error: `Question #${i + 1} has an invalid correct answer choice.` });
            }
        }

        const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

        let cleanSlug = (slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (cleanSlug) {
            const existingSlug = await Quiz.findOne({ slug: cleanSlug });
            if (existingSlug) {
                cleanSlug = `${cleanSlug}-${Date.now().toString(36)}`;
            }
        }

        const quiz = new Quiz({
            title: title.trim(),
            description: (description || '').trim(),
            slug: cleanSlug || undefined,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            durationMinutes: Number(durationMinutes) || 20,
            resultsPublishTime: resultsPublishTime ? new Date(resultsPublishTime) : new Date(endTime),
            manualResultsRelease: Boolean(manualResultsRelease),
            showExplanations: showExplanations !== false,
            questions: questions.map(q => ({
                questionText: q.questionText.trim(),
                options: q.options.map(opt => String(opt).trim()),
                correctOptionIndex: Number(q.correctOptionIndex),
                points: Number(q.points) || 1,
                explanation: (q.explanation || '').trim()
            })),
            totalPoints,
            passingPercentage: Number(passingPercentage) || 50,
            shuffleQuestions: Boolean(shuffleQuestions),
            shuffleOptions: Boolean(shuffleOptions),
            createdBy: req.user?.username || 'admin'
        });

        await quiz.save();
        res.json({ success: true, message: 'Quiz created successfully!', quiz });
    } catch (err) {
        console.error('Error creating quiz:', err);
        res.status(500).json({ error: 'Failed to create quiz: ' + err.message });
    }
});

/**
 * PUT /api/quiz/admin/:id
 * Updates an existing quiz.
 */
router.put('/admin/:id', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid quiz ID.' });
        }

        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        const {
            title,
            description,
            slug,
            startTime,
            endTime,
            durationMinutes,
            resultsPublishTime,
            manualResultsRelease,
            showExplanations,
            questions,
            passingPercentage,
            shuffleQuestions,
            shuffleOptions,
            status
        } = req.body || {};

        if (title !== undefined) quiz.title = title.trim();
        if (description !== undefined) quiz.description = description.trim();
        if (startTime) quiz.startTime = new Date(startTime);
        if (endTime) quiz.endTime = new Date(endTime);
        if (durationMinutes) quiz.durationMinutes = Number(durationMinutes);
        if (resultsPublishTime) quiz.resultsPublishTime = new Date(resultsPublishTime);
        if (manualResultsRelease !== undefined) quiz.manualResultsRelease = Boolean(manualResultsRelease);
        if (showExplanations !== undefined) quiz.showExplanations = Boolean(showExplanations);
        if (passingPercentage !== undefined) quiz.passingPercentage = Number(passingPercentage);
        if (shuffleQuestions !== undefined) quiz.shuffleQuestions = Boolean(shuffleQuestions);
        if (shuffleOptions !== undefined) quiz.shuffleOptions = Boolean(shuffleOptions);
        if (status) quiz.status = status;

        if (Array.isArray(questions)) {
            quiz.questions = questions.map(q => ({
                questionText: q.questionText.trim(),
                options: q.options.map(opt => String(opt).trim()),
                correctOptionIndex: Number(q.correctOptionIndex),
                points: Number(q.points) || 1,
                explanation: (q.explanation || '').trim()
            }));
            quiz.totalPoints = quiz.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
        }

        if (slug) {
            const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const existing = await Quiz.findOne({ slug: cleanSlug, _id: { $ne: quiz._id } });
            if (!existing) quiz.slug = cleanSlug;
        }

        await quiz.save();
        res.json({ success: true, message: 'Quiz updated successfully!', quiz });
    } catch (err) {
        console.error('Error updating quiz:', err);
        res.status(500).json({ error: 'Failed to update quiz: ' + err.message });
    }
});

/**
 * POST /api/quiz/admin/:id/release-results
 * Toggles manual immediate publishing of results for this quiz.
 */
router.post('/admin/:id/release-results', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        quiz.manualResultsRelease = !quiz.manualResultsRelease;
        await quiz.save();

        res.json({
            success: true,
            manualResultsRelease: quiz.manualResultsRelease,
            message: quiz.manualResultsRelease
                ? 'Results have been released publicly! Participants can now view their scores.'
                : 'Results are now restricted to the scheduled publish time.'
        });
    } catch (err) {
        console.error('Error toggling results release:', err);
        res.status(500).json({ error: 'Failed to update results release status.' });
    }
});

/**
 * DELETE /api/quiz/admin/:id
 * Deletes a quiz and its submissions.
 */
router.delete('/admin/:id', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid quiz ID.' });
        }

        await Quiz.findByIdAndDelete(id);
        const subResult = await QuizSubmission.deleteMany({ quizId: id });

        res.json({
            success: true,
            message: `Quiz and ${subResult.deletedCount} associated submissions removed.`
        });
    } catch (err) {
        console.error('Error deleting quiz:', err);
        res.status(500).json({ error: 'Failed to delete quiz.' });
    }
});

/**
 * GET /api/quiz/admin/:id/submissions
 * Returns ranked submissions list for admin dashboard leaderboard.
 */
router.get('/admin/:id/submissions', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id).lean();
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        const submissions = await QuizSubmission.find({ quizId: id })
            .sort({ isArchived: 1, score: -1, timeSpentSeconds: 1, submittedAt: 1 })
            .lean();

        let activeRank = 1;
        const formatted = submissions.map((s) => {
            const isArchived = Boolean(s.isArchived);
            return {
                ...s,
                rank: isArchived ? null : activeRank++,
                attemptNumber: s.attemptNumber || 1,
                isArchived,
                resetByAdmin: Boolean(s.resetByAdmin),
                archivedAt: s.archivedAt || null,
                resetBy: s.resetBy || ''
            };
        });

        res.json({ success: true, quiz, submissions: formatted });
    } catch (err) {
        console.error('Error fetching submissions:', err);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

/**
 * POST /api/quiz/admin/:id/reset-user
 * Soft-resets (archives) active submissions for a specific user to re-enable them to take the quiz again.
 * CRITICAL: Does NOT delete past DB records! Marks them as isArchived: true, resetByAdmin: true.
 */
router.post('/admin/:id/reset-user', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body || {};
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid quiz ID.' });
        }
        if (!email?.trim()) {
            return res.status(400).json({ error: 'User email is required to re-enable quiz.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const quiz = await Quiz.findById(id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        const now = new Date();
        const adminUsername = req.user?.username || 'admin';

        // Archive all active submissions for this user & quiz
        const updateResult = await QuizSubmission.updateMany(
            {
                quizId: id,
                userEmail: cleanEmail,
                isArchived: { $ne: true }
            },
            {
                $set: {
                    isArchived: true,
                    resetByAdmin: true,
                    archivedAt: now,
                    resetBy: adminUsername
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({
                error: `No active submissions found for ${cleanEmail} to re-enable.`
            });
        }

        res.json({
            success: true,
            message: `Quiz re-enabled for ${cleanEmail}! ${updateResult.modifiedCount} previous attempt(s) archived safely. Historical records preserved in DB.`,
            modifiedCount: updateResult.modifiedCount
        });
    } catch (err) {
        console.error('Error re-enabling user quiz:', err);
        res.status(500).json({ error: 'Failed to re-enable user: ' + err.message });
    }
});

/**
 * GET /api/quiz/admin/:id/export
 * Downloads CSV of all submissions for spreadsheets.
 */
router.get('/admin/:id/export', authenticateToken, requireDb, async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id).lean();
        if (!quiz) return res.status(404).send('Quiz not found.');

        const submissions = await QuizSubmission.find({ quizId: id })
            .sort({ isArchived: 1, score: -1, timeSpentSeconds: 1 })
            .lean();

        const headers = [
            'Rank',
            'Full Name',
            'Email Address',
            'Roll Number',
            'Attempt',
            'Score',
            'Max Score',
            'Percentage (%)',
            'Status',
            'Result',
            'Time Spent (mins)',
            'Submitted At',
            'Database Record Status'
        ];

        let activeRank = 1;
        const rows = submissions.map((s) => {
            const isArchived = Boolean(s.isArchived);
            const rank = isArchived ? 'ARCHIVED' : activeRank++;
            return [
                csvCell(rank),
                csvCell(s.userName),
                csvCell(s.userEmail),
                csvCell(s.rollNo || 'N/A'),
                csvCell(`Attempt ${s.attemptNumber || 1}`),
                csvCell(s.score),
                csvCell(s.maxScore),
                csvCell(s.percentage + '%'),
                csvCell(s.status),
                csvCell(s.passed ? 'PASSED' : 'FAILED'),
                csvCell(Math.round((s.timeSpentSeconds || 0) / 60 * 10) / 10),
                csvCell(s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-IN') : 'N/A'),
                csvCell(isArchived ? `Archived/Reset by ${s.resetBy || 'Admin'}` : 'Active')
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const filename = `quiz-${(quiz.slug || quiz._id).toString().slice(0, 16)}-results.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // BOM for proper UTF-8 Excel support
        res.send('﻿' + csvContent);
    } catch (err) {
        console.error('Error exporting quiz CSV:', err);
        res.status(500).send('Failed to export CSV.');
    }
});

// -------------------------------------------------------------
// PUBLIC PARTICIPANT ROUTES
// -------------------------------------------------------------

/**
 * GET /api/quiz/:idOrSlug/info
 * Public metadata for the quiz landing page (no questions or answer keys).
 */
router.get('/:idOrSlug/info', requireDb, async (req, res) => {
    try {
        const quiz = await findQuizByIdOrSlug(req.params.idOrSlug);
        if (!quiz || quiz.status === 'archived') {
            return res.status(404).json({ error: 'Quiz not found or no longer available.' });
        }

        const now = new Date();
        const start = new Date(quiz.startTime);
        const end = new Date(quiz.endTime);
        const pub = new Date(quiz.resultsPublishTime);

        let stage = 'upcoming';
        if (now >= start && now <= end) stage = 'active';
        else if (now > end) stage = 'ended';

        const resultsPublished = quiz.areResultsPublished();

        res.json({
            success: true,
            quiz: {
                id: quiz._id.toString(),
                title: quiz.title,
                description: quiz.description,
                slug: quiz.slug,
                startTime: quiz.startTime,
                endTime: quiz.endTime,
                durationMinutes: quiz.durationMinutes,
                resultsPublishTime: quiz.resultsPublishTime,
                resultsPublished,
                stage,
                questionCount: quiz.questions?.length || 0,
                totalPoints: quiz.totalPoints,
                passingPercentage: quiz.passingPercentage
            }
        });
    } catch (err) {
        console.error('Error fetching public quiz info:', err);
        res.status(500).json({ error: 'Failed to load quiz information.' });
    }
});

/**
 * POST /api/quiz/:idOrSlug/check-status
 * Checks participant attempt status (0, 1, or 2 active attempts) and whether they can take a quiz or retake.
 */
router.post('/:idOrSlug/check-status', requireDb, async (req, res) => {
    try {
        const quiz = await findQuizByIdOrSlug(req.params.idOrSlug);
        if (!quiz || quiz.status !== 'published') {
            return res.status(404).json({ error: 'Quiz unavailable.' });
        }

        const { email } = req.body || {};
        if (!email?.trim()) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const activeSubmissions = await QuizSubmission.find({
            quizId: quiz._id,
            userEmail: cleanEmail,
            isArchived: { $ne: true }
        }).sort({ attemptNumber: 1 }).lean();

        const inProgressSub = activeSubmissions.find(s => s.status === 'in-progress');
        const completedSubs = activeSubmissions.filter(s => s.status !== 'in-progress');

        const now = new Date();
        const isLive = now >= new Date(quiz.startTime) && now <= new Date(quiz.endTime);

        res.json({
            success: true,
            attemptCount: completedSubs.length + (inProgressSub ? 1 : 0),
            completedCount: completedSubs.length,
            totalAttemptsAllowed: 2,
            hasInProgress: Boolean(inProgressSub),
            canTakeSecondAttempt: completedSubs.length === 1 && !inProgressSub && isLive,
            canStart: (completedSubs.length < 2 || inProgressSub) && isLive,
            resultsPublished: quiz.areResultsPublished(),
            attempts: activeSubmissions.map(s => ({
                attemptNumber: s.attemptNumber || 1,
                status: s.status,
                score: s.score,
                maxScore: s.maxScore,
                percentage: s.percentage,
                passed: s.passed,
                submittedAt: s.submittedAt
            }))
        });
    } catch (err) {
        console.error('Error checking quiz status:', err);
        res.status(500).json({ error: 'Failed to check status.' });
    }
});

/**
 * POST /api/quiz/:idOrSlug/start
 * Gatekeeper: Verifies user details and timing window.
 * Every person is granted 2 attempts to take the quiz.
 * Returns sanitized questions and session deadline.
 */
router.post('/:idOrSlug/start', requireDb, async (req, res) => {
    try {
        const quiz = await findQuizByIdOrSlug(req.params.idOrSlug);
        if (!quiz || quiz.status !== 'published') {
            return res.status(404).json({ error: 'This quiz is currently unavailable.' });
        }

        const { email, name, rollNo, startAttempt2 } = req.body || {};
        if (!email?.trim()) {
            return res.status(400).json({ error: 'Email address is required to attend the quiz.' });
        }
        if (!name?.trim()) {
            return res.status(400).json({ error: 'Full name is required.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanName = name.trim();
        const cleanRoll = (rollNo || '').trim();

        const now = new Date();
        const start = new Date(quiz.startTime);
        const end = new Date(quiz.endTime);

        if (now < start) {
            return res.status(403).json({
                error: 'Quiz has not started yet.',
                early: true,
                startTime: quiz.startTime
            });
        }

        if (now > end) {
            return res.status(403).json({
                error: 'Quiz examination window has closed.',
                ended: true,
                endTime: quiz.endTime,
                resultsPublished: quiz.areResultsPublished(),
                resultsPublishTime: quiz.resultsPublishTime
            });
        }

        const maxDurationMs = quiz.durationMinutes * 60 * 1000;
        const examEndMs = end.getTime();

        // Find active (non-archived) submissions for this user & quiz
        const activeSubmissions = await QuizSubmission.find({
            quizId: quiz._id,
            userEmail: cleanEmail,
            isArchived: { $ne: true }
        }).sort({ attemptNumber: 1 });

        // Check if there is an existing in-progress session
        let inProgressSub = activeSubmissions.find(s => s.status === 'in-progress');

        if (inProgressSub) {
            const subStartedAt = new Date(inProgressSub.startedAt);
            const candidateEndMs = subStartedAt.getTime() + maxDurationMs;
            const deadlineMs = Math.min(examEndMs, candidateEndMs);

            if (now.getTime() >= deadlineMs) {
                // In-progress session expired, mark timed-out
                inProgressSub.status = 'timed-out';
                inProgressSub.submittedAt = new Date(deadlineMs);
                inProgressSub.timeSpentSeconds = Math.round((deadlineMs - subStartedAt.getTime()) / 1000);
                await inProgressSub.save();
                inProgressSub = null;
            }
        }

        let submission = null;
        let startedAt = now;
        let attemptNumber = 1;

        if (inProgressSub) {
            // Resume currently in-progress attempt
            submission = inProgressSub;
            startedAt = new Date(submission.startedAt);
            attemptNumber = submission.attemptNumber || 1;
        } else {
            const completedSubs = activeSubmissions.filter(s => s.status !== 'in-progress');

            if (completedSubs.length === 0) {
                // Fresh Attempt 1
                submission = new QuizSubmission({
                    quizId: quiz._id,
                    userEmail: cleanEmail,
                    userName: cleanName,
                    rollNo: cleanRoll,
                    attemptNumber: 1,
                    startedAt: now,
                    maxScore: quiz.totalPoints,
                    status: 'in-progress'
                });
                await submission.save();
                startedAt = now;
                attemptNumber = 1;
            } else if (completedSubs.length === 1) {
                // Attempt 1 finished. Did participant explicitly request Attempt 2?
                if (startAttempt2) {
                    submission = new QuizSubmission({
                        quizId: quiz._id,
                        userEmail: cleanEmail,
                        userName: cleanName,
                        rollNo: cleanRoll,
                        attemptNumber: 2,
                        startedAt: now,
                        maxScore: quiz.totalPoints,
                        status: 'in-progress'
                    });
                    await submission.save();
                    startedAt = now;
                    attemptNumber = 2;
                } else {
                    // Prompt user before starting Attempt 2
                    return res.status(200).json({
                        success: true,
                        promptAttempt2: true,
                        attemptCount: 1,
                        totalAttemptsAllowed: 2,
                        canRetake: true,
                        firstAttempt: {
                            submissionId: completedSubs[0]._id.toString(),
                            score: completedSubs[0].score,
                            maxScore: completedSubs[0].maxScore,
                            percentage: completedSubs[0].percentage,
                            passed: completedSubs[0].passed,
                            submittedAt: completedSubs[0].submittedAt
                        },
                        resultsPublished: quiz.areResultsPublished(),
                        resultsPublishTime: quiz.resultsPublishTime,
                        message: 'You have completed Attempt 1. Every participant is granted 2 attempts. If you faced issues, you can start your second attempt.'
                    });
                }
            } else {
                // Both 2 attempts are completed
                return res.status(409).json({
                    error: 'You have completed both attempts (2 of 2) for this quiz. If you need this reset, please contact the quiz administrator.',
                    alreadySubmitted: true,
                    attemptCount: completedSubs.length,
                    totalAttemptsAllowed: 2,
                    canRetake: false,
                    resultsPublished: quiz.areResultsPublished(),
                    resultsPublishTime: quiz.resultsPublishTime
                });
            }
        }

        const candidateEndMs = startedAt.getTime() + maxDurationMs;
        const deadlineMs = Math.min(examEndMs, candidateEndMs);
        const remainingSeconds = Math.max(0, Math.floor((deadlineMs - now.getTime()) / 1000));

        // Prepare questions: Strip correctOptionIndex and explanation!
        let questionsToSend = quiz.questions.map(q => ({
            id: q._id.toString(),
            questionText: q.questionText,
            options: q.options,
            points: q.points
        }));

        if (quiz.shuffleQuestions) {
            questionsToSend.sort(() => Math.random() - 0.5);
        }

        res.json({
            success: true,
            submissionId: submission._id.toString(),
            attemptNumber,
            totalAttemptsAllowed: 2,
            startedAt,
            deadline: new Date(deadlineMs).toISOString(),
            remainingSeconds,
            questions: questionsToSend,
            totalPoints: quiz.totalPoints,
            passingPercentage: quiz.passingPercentage
        });
    } catch (err) {
        console.error('Error starting quiz:', err);
        res.status(500).json({ error: 'Failed to start quiz: ' + err.message });
    }
});

/**
 * POST /api/quiz/:idOrSlug/submit
 * Submits participant answers, calculates score on server side.
 */
router.post('/:idOrSlug/submit', requireDb, async (req, res) => {
    try {
        const quiz = await findQuizByIdOrSlug(req.params.idOrSlug);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        const { submissionId, email, answers = [] } = req.body || {};
        if (!submissionId || !mongoose.isValidObjectId(submissionId)) {
            return res.status(400).json({ error: 'Valid submission ID is required.' });
        }

        const submission = await QuizSubmission.findById(submissionId);
        if (!submission) return res.status(404).json({ error: 'Submission session not found.' });

        if (submission.status === 'completed') {
            return res.json({
                success: true,
                message: 'Quiz was already submitted.',
                resultsPublished: quiz.areResultsPublished(),
                resultsPublishTime: quiz.resultsPublishTime,
                attemptNumber: submission.attemptNumber || 1,
                totalAttemptsAllowed: 2
            });
        }

        const now = new Date();
        const timeSpentSeconds = Math.max(0, Math.floor((now.getTime() - new Date(submission.startedAt).getTime()) / 1000));

        // Create answer map for fast lookup
        const userAnswersMap = new Map();
        if (Array.isArray(answers)) {
            answers.forEach(a => {
                if (a.questionId) {
                    userAnswersMap.set(String(a.questionId), Number(a.selectedOptionIndex));
                }
            });
        }

        // Evaluate server side
        let totalEarnedScore = 0;
        const evaluatedAnswers = quiz.questions.map(q => {
            const qIdStr = q._id.toString();
            const selected = userAnswersMap.has(qIdStr) ? userAnswersMap.get(qIdStr) : -1;
            const isCorrect = selected === q.correctOptionIndex;
            const pointsEarned = isCorrect ? (q.points || 1) : 0;
            totalEarnedScore += pointsEarned;

            return {
                questionId: q._id,
                selectedOptionIndex: selected,
                isCorrect,
                pointsEarned
            };
        });

        const maxScore = quiz.totalPoints || 1;
        const percentage = Math.round((totalEarnedScore / maxScore) * 1000) / 10;
        const passed = percentage >= (quiz.passingPercentage || 50);

        submission.answers = evaluatedAnswers;
        submission.score = totalEarnedScore;
        submission.maxScore = maxScore;
        submission.percentage = percentage;
        submission.passed = passed;
        submission.submittedAt = now;
        submission.timeSpentSeconds = timeSpentSeconds;
        submission.status = 'completed';

        await submission.save();

        const completedAttemptsCount = await QuizSubmission.countDocuments({
            quizId: quiz._id,
            userEmail: submission.userEmail,
            isArchived: { $ne: true },
            status: { $in: ['completed', 'timed-out'] }
        });
        const remainingAttempts = Math.max(0, 2 - completedAttemptsCount);
        const canTakeSecondAttempt = remainingAttempts > 0 && (now <= new Date(quiz.endTime));

        const areResultsPublished = quiz.areResultsPublished();

        if (areResultsPublished) {
            // Immediate results allowed
            return res.json({
                success: true,
                resultsPublished: true,
                score: totalEarnedScore,
                maxScore,
                percentage,
                passed,
                timeSpentSeconds,
                attemptNumber: submission.attemptNumber || 1,
                totalAttemptsAllowed: 2,
                remainingAttempts,
                canTakeSecondAttempt,
                message: 'Quiz submitted and evaluated successfully!'
            });
        }

        // Scheduled release: Don't give answers or score yet
        res.json({
            success: true,
            resultsPublished: false,
            resultsPublishTime: quiz.resultsPublishTime,
            attemptNumber: submission.attemptNumber || 1,
            totalAttemptsAllowed: 2,
            remainingAttempts,
            canTakeSecondAttempt,
            message: `Your responses have been securely recorded! Evaluation results will be published on ${new Date(quiz.resultsPublishTime).toLocaleString('en-IN')}. Check back on this same link then!`
        });
    } catch (err) {
        console.error('Error submitting quiz:', err);
        res.status(500).json({ error: 'Failed to submit quiz: ' + err.message });
    }
});

/**
 * POST /api/quiz/:idOrSlug/lookup-result
 * "Check Back Later" Portal:
 * Participant enters their email to check their result status.
 * Evaluates best score among attempts, returns rank and attempt breakdown.
 */
router.post('/:idOrSlug/lookup-result', requireDb, async (req, res) => {
    try {
        const quiz = await findQuizByIdOrSlug(req.params.idOrSlug);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

        const { email } = req.body || {};
        if (!email?.trim()) {
            return res.status(400).json({ error: 'Please enter your registered email address.' });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Find active submissions first
        let submissions = await QuizSubmission.find({
            quizId: quiz._id,
            userEmail: cleanEmail,
            isArchived: { $ne: true }
        }).sort({ attemptNumber: 1 }).lean();

        let isArchivedOnly = false;
        if (submissions.length === 0) {
            submissions = await QuizSubmission.find({
                quizId: quiz._id,
                userEmail: cleanEmail
            }).sort({ createdAt: -1 }).lean();
            if (submissions.length > 0) {
                isArchivedOnly = true;
            }
        }

        if (submissions.length === 0) {
            return res.status(404).json({
                error: 'No submission record found for this email address in this quiz.'
            });
        }

        // Determine best submission (highest score, tie-break on lower timeSpentSeconds)
        let bestSubmission = submissions[0];
        for (const s of submissions) {
            if (s.score > bestSubmission.score || (s.score === bestSubmission.score && s.timeSpentSeconds < bestSubmission.timeSpentSeconds)) {
                bestSubmission = s;
            }
        }

        const now = new Date();
        const areResultsPublished = quiz.areResultsPublished();
        const canTakeSecondAttempt = !isArchivedOnly && submissions.length < 2 && (now <= new Date(quiz.endTime));

        if (!areResultsPublished) {
            return res.json({
                success: true,
                resultsPublished: false,
                userName: bestSubmission.userName,
                userEmail: bestSubmission.userEmail,
                submittedAt: bestSubmission.submittedAt,
                resultsPublishTime: quiz.resultsPublishTime,
                attemptCount: isArchivedOnly ? 0 : submissions.length,
                totalAttemptsAllowed: 2,
                canTakeSecondAttempt,
                isArchivedOnly,
                message: `Your test was submitted successfully. Evaluation results will be published on ${new Date(quiz.resultsPublishTime).toLocaleString('en-IN')}. Please check back here then!`
            });
        }

        // Results are released! Calculate rank among distinct participants based on their best score
        const allActive = await QuizSubmission.find({
            quizId: quiz._id,
            status: { $in: ['completed', 'timed-out'] },
            isArchived: { $ne: true }
        }).lean();

        const userBestScores = new Map();
        for (const sub of allActive) {
            const existing = userBestScores.get(sub.userEmail);
            if (!existing || sub.score > existing.score || (sub.score === existing.score && sub.timeSpentSeconds < existing.timeSpentSeconds)) {
                userBestScores.set(sub.userEmail, sub);
            }
        }

        let higherCount = 0;
        for (const [uEmail, bSub] of userBestScores.entries()) {
            if (uEmail !== cleanEmail) {
                if (bSub.score > bestSubmission.score || (bSub.score === bestSubmission.score && bSub.timeSpentSeconds < bestSubmission.timeSpentSeconds)) {
                    higherCount++;
                }
            }
        }
        const rank = higherCount + 1;
        const totalParticipants = userBestScores.size || 1;

        // Build question review for bestSubmission
        const questionMap = new Map(quiz.questions.map(q => [q._id.toString(), q]));
        const reviewedAnswers = (bestSubmission.answers || []).map(ans => {
            const q = questionMap.get(ans.questionId?.toString());
            return {
                questionId: ans.questionId,
                questionText: q?.questionText || '',
                options: q?.options || [],
                selectedOptionIndex: ans.selectedOptionIndex,
                correctOptionIndex: q?.correctOptionIndex,
                isCorrect: ans.isCorrect,
                pointsEarned: ans.pointsEarned,
                maxPoints: q?.points || 1,
                explanation: quiz.showExplanations ? (q?.explanation || '') : ''
            };
        });

        res.json({
            success: true,
            resultsPublished: true,
            userName: bestSubmission.userName,
            userEmail: bestSubmission.userEmail,
            rollNo: bestSubmission.rollNo,
            score: bestSubmission.score,
            maxScore: bestSubmission.maxScore,
            percentage: bestSubmission.percentage,
            passed: bestSubmission.passed,
            rank,
            totalParticipants,
            timeSpentSeconds: bestSubmission.timeSpentSeconds,
            submittedAt: bestSubmission.submittedAt,
            bestAttemptNumber: bestSubmission.attemptNumber || 1,
            attemptCount: isArchivedOnly ? 0 : submissions.length,
            totalAttemptsAllowed: 2,
            canTakeSecondAttempt,
            isArchivedOnly,
            attempts: submissions.map(s => ({
                attemptNumber: s.attemptNumber || 1,
                score: s.score,
                maxScore: s.maxScore,
                percentage: s.percentage,
                passed: s.passed,
                timeSpentSeconds: s.timeSpentSeconds,
                submittedAt: s.submittedAt,
                isBest: s._id.toString() === bestSubmission._id.toString(),
                isArchived: Boolean(s.isArchived)
            })),
            answers: reviewedAnswers
        });
    } catch (err) {
        console.error('Error looking up quiz results:', err);
        res.status(500).json({ error: 'Failed to retrieve quiz results: ' + err.message });
    }
});

export default router;
