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
            { $match: { quizId: { $in: quizIds }, status: { $in: ['completed', 'timed-out'] } } },
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
            .sort({ score: -1, timeSpentSeconds: 1, submittedAt: 1 })
            .lean();

        const ranked = submissions.map((s, idx) => ({
            rank: idx + 1,
            ...s
        }));

        res.json({ success: true, quiz, submissions: ranked });
    } catch (err) {
        console.error('Error fetching submissions:', err);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
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
            .sort({ score: -1, timeSpentSeconds: 1 })
            .lean();

        const headers = [
            'Rank',
            'Full Name',
            'Email Address',
            'Roll Number',
            'Score',
            'Max Score',
            'Percentage (%)',
            'Status',
            'Result',
            'Time Spent (mins)',
            'Submitted At'
        ];

        const rows = submissions.map((s, idx) => [
            csvCell(idx + 1),
            csvCell(s.userName),
            csvCell(s.userEmail),
            csvCell(s.rollNo || 'N/A'),
            csvCell(s.score),
            csvCell(s.maxScore),
            csvCell(s.percentage + '%'),
            csvCell(s.status),
            csvCell(s.passed ? 'PASSED' : 'FAILED'),
            csvCell(Math.round((s.timeSpentSeconds || 0) / 60 * 10) / 10),
            csvCell(s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-IN') : 'N/A')
        ]);

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
 * POST /api/quiz/:idOrSlug/start
 * Gatekeeper: Verifies user details and timing window.
 * Returns sanitized questions (without answer keys) and a session deadline.
 */
router.post('/:idOrSlug/start', requireDb, async (req, res) => {
    try {
        const quiz = await findQuizByIdOrSlug(req.params.idOrSlug);
        if (!quiz || quiz.status !== 'published') {
            return res.status(404).json({ error: 'This quiz is currently unavailable.' });
        }

        const { email, name, rollNo } = req.body || {};
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

        // Check if user has already submitted
        const existing = await QuizSubmission.findOne({ quizId: quiz._id, userEmail: cleanEmail });
        if (existing) {
            if (existing.status === 'completed' || existing.status === 'timed-out') {
                return res.status(409).json({
                    error: 'You have already completed this quiz.',
                    alreadySubmitted: true,
                    submissionId: existing._id,
                    resultsPublished: quiz.areResultsPublished(),
                    resultsPublishTime: quiz.resultsPublishTime
                });
            }
        }

        // Calculate session deadline = min(quiz.endTime, startedAt + durationMinutes)
        let submission = existing;
        let startedAt = now;

        if (!submission) {
            submission = new QuizSubmission({
                quizId: quiz._id,
                userEmail: cleanEmail,
                userName: cleanName,
                rollNo: cleanRoll,
                startedAt: now,
                maxScore: quiz.totalPoints,
                status: 'in-progress'
            });
            await submission.save();
        } else {
            startedAt = new Date(submission.startedAt);
        }

        const maxDurationMs = quiz.durationMinutes * 60 * 1000;
        const examEndMs = end.getTime();
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
                resultsPublishTime: quiz.resultsPublishTime
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
                message: 'Quiz submitted and evaluated successfully!'
            });
        }

        // Scheduled release: Don't give answers or score yet
        res.json({
            success: true,
            resultsPublished: false,
            resultsPublishTime: quiz.resultsPublishTime,
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
 * If results are NOT yet published, returns confirmation + countdown date.
 * If results ARE published, returns full evaluation, rank, and reviewed answers.
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
        const submission = await QuizSubmission.findOne({
            quizId: quiz._id,
            userEmail: cleanEmail
        }).lean();

        if (!submission) {
            return res.status(404).json({
                error: 'No submission record found for this email address in this quiz.'
            });
        }

        const areResultsPublished = quiz.areResultsPublished();

        if (!areResultsPublished) {
            return res.json({
                success: true,
                resultsPublished: false,
                userName: submission.userName,
                submittedAt: submission.submittedAt,
                resultsPublishTime: quiz.resultsPublishTime,
                message: `Your test was submitted successfully. Evaluation results will be published on ${new Date(quiz.resultsPublishTime).toLocaleString('en-IN')}. Please check back here then!`
            });
        }

        // Results are released! Calculate rank among participants
        const higherCount = await QuizSubmission.countDocuments({
            quizId: quiz._id,
            status: { $in: ['completed', 'timed-out'] },
            $or: [
                { score: { $gt: submission.score } },
                { score: submission.score, timeSpentSeconds: { $lt: submission.timeSpentSeconds } }
            ]
        });

        const totalParticipants = await QuizSubmission.countDocuments({
            quizId: quiz._id,
            status: { $in: ['completed', 'timed-out'] }
        });

        const rank = higherCount + 1;

        // Build question review if explanations/answers are enabled
        const questionMap = new Map(quiz.questions.map(q => [q._id.toString(), q]));
        const reviewedAnswers = (submission.answers || []).map(ans => {
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
            userName: submission.userName,
            userEmail: submission.userEmail,
            rollNo: submission.rollNo,
            score: submission.score,
            maxScore: submission.maxScore,
            percentage: submission.percentage,
            passed: submission.passed,
            rank,
            totalParticipants,
            timeSpentSeconds: submission.timeSpentSeconds,
            submittedAt: submission.submittedAt,
            answers: reviewedAnswers
        });
    } catch (err) {
        console.error('Error looking up quiz results:', err);
        res.status(500).json({ error: 'Failed to retrieve quiz results: ' + err.message });
    }
});

export default router;
