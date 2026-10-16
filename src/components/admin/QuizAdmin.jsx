import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { QUIZ_PRESETS } from '../../data/quizPresets';

function formatDateTimeInput(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QuizAdmin({ showStatus }) {
    const [quizzes, setQuizzes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [creatingPresetId, setCreatingPresetId] = useState('');

    // Modal states
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [selectedQuizForSubmissions, setSelectedQuizForSubmissions] = useState(null);

    // Submissions drawer state
    const [submissionsData, setSubmissionsData] = useState([]);
    const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(false);
    const [submissionFilter, setSubmissionFilter] = useState('all');
    const [submissionSearch, setSubmissionSearch] = useState('');
    const [resettingEmail, setResettingEmail] = useState(null);
    const [userToReset, setUserToReset] = useState(null);

    const submissionsModalRef = useModalBehavior(Boolean(selectedQuizForSubmissions), () =>
        setSelectedQuizForSubmissions(null)
    );

    // Fetch all quizzes
    const fetchQuizzes = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl('/api/quiz/admin/list'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load quizzes');
            setQuizzes(data.quizzes || []);
        } catch (err) {
            console.error('Quiz fetch error:', err);
            setError(err.message || 'Could not connect to quiz service.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    // Copy link helper
    const handleCopyLink = (quiz) => {
        const identifier = quiz.slug || quiz._id;
        const origin = window.location.origin;
        const link = `${origin}/#quiz/${identifier}`;
        navigator.clipboard
            .writeText(link)
            .then(() => {
                setCopiedId(quiz._id);
                if (showStatus) showStatus(`✓ Quiz link copied: ${link}`);
                setTimeout(() => setCopiedId(null), 2500);
            })
            .catch(() => {
                prompt('Copy quiz link:', link);
            });
    };

    // Toggle manual results release
    const handleToggleRelease = async (quiz) => {
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/quiz/admin/${quiz._id}/release-results`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update results release');
            if (showStatus) showStatus(data.message);
            fetchQuizzes();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // Delete quiz
    const handleDeleteQuiz = async (quiz) => {
        if (
            !window.confirm(
                `Are you sure you want to delete "${quiz.title}" and all its participant submissions? This cannot be undone.`
            )
        ) {
            return;
        }
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/quiz/admin/${quiz._id}`), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete quiz');
            if (showStatus) showStatus(`✓ ${quiz.title} deleted successfully.`);
            fetchQuizzes();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    // Open submissions view
    const handleOpenSubmissions = async (quiz) => {
        setSelectedQuizForSubmissions(quiz);
        setIsSubmissionsLoading(true);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/quiz/admin/${quiz._id}/submissions`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch submissions');
            setSubmissionsData(data.submissions || []);
        } catch (err) {
            alert('Failed to load submissions: ' + err.message);
        } finally {
            setIsSubmissionsLoading(false);
        }
    };

    // Re-enable / Reset participant quiz attempts without deleting past DB records
    const handleConfirmResetUser = async () => {
        if (!userToReset || !selectedQuizForSubmissions) return;
        setResettingEmail(userToReset.userEmail);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/quiz/admin/${selectedQuizForSubmissions._id}/reset-user`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email: userToReset.userEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to re-enable quiz for user');

            if (showStatus)
                showStatus(`✓ Quiz re-enabled for ${userToReset.userEmail}! Past DB records preserved.`);
            setUserToReset(null);
            handleOpenSubmissions(selectedQuizForSubmissions);
        } catch (err) {
            alert('Re-enable failed: ' + err.message);
        } finally {
            setResettingEmail(null);
        }
    };

    // One-click build of a ready paper: no form, no typing. The quiz lands as a
    // DRAFT with a placeholder schedule, so it cannot be taken by anyone until
    // the organiser sets the real times and publishes it.
    const handleCreateFromPreset = async (preset) => {
        // Two copies of the same paper would split the leaderboard, so say so
        // before building a second one.
        const existing = quizzes.find(
            (q) => q.title === preset.title || (preset.slug && q.slug === preset.slug)
        );
        if (
            existing &&
            !window.confirm(
                `"${preset.title}" already exists in the list (${existing.submissionCount} participants so far).\n\nBuilding it again creates a SECOND, separate quiz with its own link and its own leaderboard. Continue anyway?`
            )
        ) {
            return;
        }

        if (
            !window.confirm(
                `Create "${preset.title}" with all ${preset.questions.length} questions?\n\nIt is saved as a DRAFT with placeholder times — nobody can open it until you set your own exam times and switch it to Published.`
            )
        ) {
            return;
        }

        setCreatingPresetId(preset.presetId);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');

            // Placeholder window: tomorrow morning. Deliberately a placeholder —
            // the draft status is what keeps it shut until the times are set.
            const start = new Date();
            start.setDate(start.getDate() + 1);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start);
            end.setHours(10, 0, 0, 0);

            const res = await fetch(apiUrl('/api/quiz/admin/create'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: preset.title,
                    description: preset.description,
                    slug: preset.slug,
                    durationMinutes: preset.durationMinutes,
                    passingPercentage: preset.passingPercentage,
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    resultsPublishTime: end.toISOString(),
                    showExplanations: preset.showExplanations !== false,
                    shuffleQuestions: Boolean(preset.shuffleQuestions),
                    instantFeedback: Boolean(preset.instantFeedback),
                    questions: preset.questions,
                    status: 'draft'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create the quiz');

            await fetchQuizzes();
            if (showStatus) {
                showStatus(
                    `✓ "${preset.title}" created as a draft. Hit Edit to set your exam times, then switch it to Published.`
                );
            }
        } catch (err) {
            alert('Could not create the quiz: ' + err.message);
        } finally {
            setCreatingPresetId('');
        }
    };

    // Open the big-screen live leaderboard in its own tab, so the admin panel
    // stays usable on the operator's laptop while the projector shows the board.
    const handleOpenProjector = (quiz) => {
        const url = `${window.location.origin}${window.location.pathname}#quiz-projector/${quiz._id}`;
        const opened = window.open(url, '_blank', 'noopener');
        if (!opened) {
            // Popup blocked — fall back to this tab.
            window.location.hash = `#quiz-projector/${quiz._id}`;
        }
    };

    // Export CSV
    const handleExportCsv = (quizId) => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
        const url = apiUrl(`/api/quiz/admin/${quizId}/export`);

        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                if (!res.ok) throw new Error('Export request rejected');
                return res.blob();
            })
            .then((blob) => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch((err) => alert('CSV Export failed: ' + err.message));
    };

    // Filtered submissions
    const filteredSubmissions = useMemo(() => {
        return submissionsData.filter((s) => {
            if (submissionFilter === 'active' && s.isArchived) return false;
            if (submissionFilter === 'archived' && !s.isArchived) return false;
            if (submissionFilter === 'passed' && (!s.passed || s.isArchived)) return false;
            if (submissionFilter === 'failed' && (s.passed || s.isArchived)) return false;
            if (submissionSearch.trim()) {
                const q = submissionSearch.toLowerCase().trim();
                const match =
                    (s.userName || '').toLowerCase().includes(q) ||
                    (s.userEmail || '').toLowerCase().includes(q) ||
                    (s.rollNo || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [submissionsData, submissionFilter, submissionSearch]);

    return (
        <div className="space-y-6">
            {/* Header & Quick Stats */}
            <div className="shadow-brutal-6 flex flex-wrap items-center justify-between gap-4 border-4 border-slate-900 bg-white p-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl sm:text-3xl">📝</span>
                        <h2 className="text-xl leading-tight font-black text-slate-900 uppercase sm:text-2xl">
                            MCQ Quiz Engine
                        </h2>
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                        Create timed MCQ examinations, distribute join links, schedule result publication, and
                        track evaluations.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={fetchQuizzes}
                        disabled={isLoading}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3.5 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-50"
                        title="Reload quiz list"
                    >
                        {isLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingQuiz(null);
                            setIsEditorOpen(true);
                        }}
                        className="press shadow-brutal-3 flex cursor-pointer items-center gap-1.5 border-2 border-slate-900 bg-amber-400 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-300"
                    >
                        <span>+</span>
                        <span>Create New Quiz</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="border-2 border-red-600 bg-red-100 p-3.5 font-mono text-xs font-bold text-red-800">
                    ⚠️ {error}
                </div>
            )}

            {/* Ready-made papers: build one with a single click, no form filling */}
            {QUIZ_PRESETS.length > 0 && (
                <div className="shadow-brutal-6 space-y-3 border-4 border-slate-900 bg-violet-50 p-5">
                    <div>
                        <h3 className="flex items-center gap-1.5 font-mono text-sm font-black text-slate-900 uppercase">
                            <span>⚡</span>
                            <span>Ready-Made Papers</span>
                        </h3>
                        <p className="mt-0.5 font-mono text-[11px] font-bold text-slate-600">
                            Prepared question sets with their answer keys. One click builds the whole quiz —
                            it is saved as a draft, so nobody can open it until you set your exam times and
                            publish it.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {QUIZ_PRESETS.map((preset) => {
                            const isBuilding = creatingPresetId === preset.presetId;
                            return (
                                <div
                                    key={preset.presetId}
                                    className="flex flex-wrap items-center justify-between gap-3 border-2 border-slate-900 bg-white p-3.5"
                                >
                                    <div className="min-w-[14rem] flex-1">
                                        <strong className="block text-sm font-black text-slate-900 uppercase">
                                            {preset.title}
                                        </strong>
                                        <span className="mt-0.5 block font-mono text-[11px] font-bold text-slate-600">
                                            {preset.summary}
                                        </span>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold text-slate-500">
                                            <span>{preset.questions.length} MCQs</span>
                                            <span>•</span>
                                            <span>{preset.durationMinutes} mins</span>
                                            {preset.instantFeedback && (
                                                <>
                                                    <span>•</span>
                                                    <span className="border border-amber-600 bg-amber-200 px-1.5 py-0.5 text-amber-950 uppercase">
                                                        ⚡ Answers on the spot
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleCreateFromPreset(preset)}
                                        disabled={Boolean(creatingPresetId)}
                                        className="press shadow-brutal-3 flex cursor-pointer items-center gap-1.5 border-2 border-slate-900 bg-violet-300 px-4 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isBuilding ? (
                                            <>
                                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></span>
                                                <span>Building...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>⚡</span>
                                                <span>Create This Quiz</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quiz List */}
            {isLoading && quizzes.length === 0 ? (
                <div className="shadow-brutal-6 border-4 border-slate-900 bg-white p-12 text-center font-mono font-black text-slate-500 uppercase">
                    Loading quizzes...
                </div>
            ) : quizzes.length === 0 ? (
                <div className="shadow-brutal-6 border-4 border-slate-900 bg-white p-12 text-center">
                    <span className="text-4xl">📋</span>
                    <h3 className="mt-3 text-lg font-black text-slate-900 uppercase">
                        No Quizzes Created Yet
                    </h3>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        Click "Create New Quiz" to add your first timed MCQ evaluation test.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5">
                    {quizzes.map((quiz) => {
                        const isLive = quiz.liveState === 'active';
                        const isUpcoming = quiz.liveState === 'upcoming';

                        return (
                            <div
                                key={quiz._id}
                                className="shadow-brutal-6 flex flex-col gap-4 border-4 border-slate-900 bg-white p-5 sm:p-6"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-900/15 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-black text-slate-900 uppercase sm:text-xl">
                                                {quiz.title}
                                            </h3>
                                            {/* Live Status Badge */}
                                            <span
                                                className={`flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                                                    isLive
                                                        ? 'animate-pulse border-emerald-600 bg-emerald-300 text-slate-950'
                                                        : isUpcoming
                                                          ? 'border-amber-600 bg-amber-300 text-slate-950'
                                                          : 'border-slate-400 bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-800' : isUpcoming ? 'bg-amber-800' : 'bg-slate-500'}`}
                                                />
                                                <span>
                                                    {isLive
                                                        ? 'Live Examination'
                                                        : isUpcoming
                                                          ? 'Upcoming'
                                                          : 'Exam Ended'}
                                                </span>
                                            </span>

                                            {/* Results Status Badge */}
                                            <span
                                                className={`border px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                                                    quiz.resultsPublished
                                                        ? 'border-green-500 bg-green-100 text-green-900'
                                                        : 'border-sky-400 bg-sky-100 text-sky-900'
                                                }`}
                                            >
                                                {quiz.resultsPublished
                                                    ? '✓ Results Published'
                                                    : '⏳ Results Scheduled'}
                                            </span>

                                            {quiz.instantFeedback && (
                                                <span className="border border-amber-600 bg-amber-200 px-2 py-0.5 font-mono text-[10px] font-black text-amber-950 uppercase">
                                                    ⚡ Answers On The Spot
                                                </span>
                                            )}

                                            {quiz.status !== 'published' && (
                                                <span className="border border-slate-900 bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase">
                                                    {quiz.status === 'draft'
                                                        ? '✎ Draft — not open yet'
                                                        : '🗄 Archived'}
                                                </span>
                                            )}
                                        </div>

                                        {quiz.description && (
                                            <p className="max-w-3xl text-xs font-bold text-slate-600">
                                                {quiz.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] font-bold text-slate-500">
                                            <span>
                                                Link slug:{' '}
                                                <code className="border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-bold text-slate-800">
                                                    {quiz.slug || quiz._id}
                                                </code>
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Duration: <strong>{quiz.durationMinutes} mins</strong>
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Questions: <strong>{quiz.totalQuestions} MCQs</strong> (
                                                {quiz.totalPoints} pts)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyLink(quiz)}
                                            className={`press shadow-brutal-2 flex cursor-pointer items-center gap-1 border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase ${
                                                copiedId === quiz._id
                                                    ? 'bg-emerald-300 text-slate-900'
                                                    : 'bg-sky-100 text-sky-950 hover:bg-sky-200'
                                            }`}
                                            title="Copy participant test join link"
                                        >
                                            <span>{copiedId === quiz._id ? '✓' : '🔗'}</span>
                                            <span>
                                                {copiedId === quiz._id ? 'Copied Link!' : 'Copy Link'}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenSubmissions(quiz)}
                                            className="press shadow-brutal-2 flex cursor-pointer items-center gap-1 border-2 border-slate-900 bg-amber-300 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-200"
                                            title="View student results and leaderboard"
                                        >
                                            <span>📊</span>
                                            <span>Results ({quiz.submissionCount})</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenProjector(quiz)}
                                            className="press shadow-brutal-2 flex cursor-pointer items-center gap-1 border-2 border-slate-900 bg-violet-300 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-200"
                                            title="Open projector mode with live QR code & student entry portal"
                                        >
                                            <span>📺</span>
                                            <span>Projector</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingQuiz(quiz);
                                                setIsEditorOpen(true);
                                            }}
                                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                                            title="Edit quiz questions or timing"
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteQuiz(quiz)}
                                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-rose-100 px-3 py-1.5 font-mono text-xs font-black text-rose-900 uppercase hover:bg-rose-200"
                                            title="Delete quiz"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Schedule & Results Details Grid */}
                                <div className="grid grid-cols-1 gap-3 border-2 border-slate-900/20 bg-slate-50 p-3 font-mono text-xs sm:grid-cols-2 md:grid-cols-4">
                                    <div>
                                        <span className="block text-[10px] font-black text-slate-500 uppercase">
                                            Exam Start Time
                                        </span>
                                        <strong className="text-[11px] text-slate-900">
                                            {new Date(quiz.startTime).toLocaleString('en-IN', {
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            })}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black text-slate-500 uppercase">
                                            Exam End Time
                                        </span>
                                        <strong className="text-[11px] text-slate-900">
                                            {new Date(quiz.endTime).toLocaleString('en-IN', {
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            })}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black text-slate-500 uppercase">
                                            Results Release Time
                                        </span>
                                        <strong className="text-[11px] text-slate-900">
                                            {quiz.resultsPublishTime
                                                ? new Date(quiz.resultsPublishTime).toLocaleString('en-IN', {
                                                      dateStyle: 'short',
                                                      timeStyle: 'short'
                                                  })
                                                : 'Immediate'}
                                        </strong>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="block text-[10px] font-black text-slate-500 uppercase">
                                                Participants
                                            </span>
                                            <strong className="text-[11px] text-slate-900">
                                                {quiz.submissionCount} attended
                                            </strong>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleRelease(quiz)}
                                            className={`press cursor-pointer border px-2 py-1 text-[10px] font-black uppercase ${
                                                quiz.resultsPublished
                                                    ? 'border-slate-600 bg-slate-200 text-slate-800 hover:bg-slate-300'
                                                    : 'border-emerald-700 bg-emerald-300 text-slate-950 hover:bg-emerald-400'
                                            }`}
                                            title={
                                                quiz.resultsPublished
                                                    ? 'Lock results back to scheduled time'
                                                    : 'Force release results immediately'
                                            }
                                        >
                                            {quiz.resultsPublished ? 'Lock Results' : 'Release Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submissions & Leaderboard Drawer Modal */}
            {selectedQuizForSubmissions && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-xs sm:p-6"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedQuizForSubmissions(null);
                    }}
                >
                    <div
                        ref={submissionsModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="quiz-submissions-modal-title"
                        tabIndex={-1}
                        className="shadow-brutal-8 anim-pop flex max-h-[90dvh] w-full max-w-5xl flex-col border-4 border-slate-900 bg-white"
                    >
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-slate-900 bg-amber-300 p-4 sm:p-5">
                            <div>
                                <span className="border border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-slate-900 uppercase">
                                    QUIZ RESULTS & LEADERBOARD
                                </span>
                                <h3
                                    id="quiz-submissions-modal-title"
                                    className="mt-1 text-lg font-black text-slate-950 uppercase sm:text-xl"
                                >
                                    {selectedQuizForSubmissions.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleExportCsv(selectedQuizForSubmissions._id)}
                                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-3 py-1.5 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                                >
                                    📥 Export CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedQuizForSubmissions(null)}
                                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-900/15 bg-slate-50 p-4">
                            <input
                                type="text"
                                value={submissionSearch}
                                onChange={(e) => setSubmissionSearch(e.target.value)}
                                placeholder="Search by name, email, roll no..."
                                className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs focus:bg-amber-50 focus:outline-none sm:w-72"
                            />
                            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                                <span className="font-bold text-slate-500">Filter:</span>
                                {['all', 'active', 'passed', 'failed', 'archived'].map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setSubmissionFilter(f)}
                                        className={`cursor-pointer border-2 border-slate-900 px-2.5 py-1 text-[11px] font-black uppercase ${
                                            submissionFilter === f
                                                ? 'bg-sky-400 text-slate-950'
                                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submissions Table */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            {isSubmissionsLoading ? (
                                <div className="p-8 text-center font-mono font-black text-slate-500 uppercase">
                                    Loading participants...
                                </div>
                            ) : filteredSubmissions.length === 0 ? (
                                <div className="p-8 text-center font-mono font-bold text-slate-500">
                                    No submissions found matching criteria.
                                </div>
                            ) : (
                                <div className="overflow-x-auto border-2 border-slate-900">
                                    <table className="w-full border-collapse text-left font-mono text-xs">
                                        <thead>
                                            <tr className="bg-slate-900 text-[11px] text-white uppercase">
                                                <th className="w-12 border-r border-slate-700 p-2.5 text-center">
                                                    Rank
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5">
                                                    Participant
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5">Roll No</th>
                                                <th className="border-r border-slate-700 p-2.5 text-center">
                                                    Attempt
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5 text-center">
                                                    Score
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5 text-center">
                                                    %
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5 text-center">
                                                    Result
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5 text-center">
                                                    Time
                                                </th>
                                                <th className="border-r border-slate-700 p-2.5 text-right">
                                                    Submitted At
                                                </th>
                                                <th className="p-2.5 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-900/10">
                                            {filteredSubmissions.map((s) => (
                                                <tr
                                                    key={s._id}
                                                    className={
                                                        s.isArchived
                                                            ? 'bg-slate-100/70 opacity-75'
                                                            : 'hover:bg-amber-50'
                                                    }
                                                >
                                                    <td className="border-r border-slate-900/10 p-2.5 text-center font-black">
                                                        {s.isArchived ? (
                                                            <span className="font-normal text-slate-400">
                                                                —
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`inline-block h-6 w-6 rounded-full text-center leading-6 ${
                                                                    s.rank === 1
                                                                        ? 'border border-slate-900 bg-amber-300 font-black'
                                                                        : s.rank === 2
                                                                          ? 'border border-slate-900 bg-slate-300 font-black'
                                                                          : s.rank === 3
                                                                            ? 'border border-slate-900 bg-amber-100 font-black'
                                                                            : 'text-slate-600'
                                                                }`}
                                                            >
                                                                {s.rank}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5">
                                                        <div className="flex items-center gap-1.5 font-black text-slate-900">
                                                            <span>{s.userName}</span>
                                                            {s.isArchived && (
                                                                <span className="rounded-xs bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
                                                                    Archived
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] font-bold text-slate-500">
                                                            {s.userEmail}
                                                        </div>
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 font-bold">
                                                        {s.rollNo || 'N/A'}
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 text-center">
                                                        {s.isArchived ? (
                                                            <span className="inline-block border border-slate-400 bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600 uppercase">
                                                                Attempt {s.attemptNumber || 1} (Archived)
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                                                                    s.attemptNumber === 2
                                                                        ? 'border-purple-400 bg-purple-100 text-purple-900'
                                                                        : 'border-sky-400 bg-sky-100 text-sky-900'
                                                                }`}
                                                            >
                                                                Attempt {s.attemptNumber || 1} of 2
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 text-center font-black text-slate-900">
                                                        {s.score} / {s.maxScore}
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 text-center font-black">
                                                        {s.percentage}%
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 text-center">
                                                        <span
                                                            className={`border px-2 py-0.5 text-[10px] font-black uppercase ${
                                                                s.passed
                                                                    ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                                                                    : 'border-rose-400 bg-rose-100 text-rose-800'
                                                            }`}
                                                        >
                                                            {s.passed ? 'Passed' : 'Failed'}
                                                        </span>
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 text-center font-bold">
                                                        {Math.round(((s.timeSpentSeconds || 0) / 60) * 10) /
                                                            10}
                                                        m
                                                    </td>
                                                    <td className="border-r border-slate-900/10 p-2.5 text-right font-bold text-slate-600">
                                                        {s.submittedAt
                                                            ? new Date(s.submittedAt).toLocaleTimeString(
                                                                  'en-IN',
                                                                  { hour: '2-digit', minute: '2-digit' }
                                                              )
                                                            : 'N/A'}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        {s.isArchived ? (
                                                            <span className="text-[10px] font-bold text-slate-400 italic">
                                                                Reset by {s.resetBy || 'Admin'}
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setUserToReset(s)}
                                                                disabled={resettingEmail === s.userEmail}
                                                                className="press mx-auto flex cursor-pointer items-center gap-1 border-2 border-slate-900 bg-amber-300 px-2.5 py-1 font-mono text-[10px] font-black text-slate-950 uppercase shadow-[2px_2px_0px_#0f172a] hover:bg-amber-200"
                                                                title="Clear user entry to re-enable quiz (preserves past records in DB)"
                                                            >
                                                                <span>🔄</span>
                                                                <span>Re-enable</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Re-enable Participant Confirmation Modal */}
            {userToReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 font-mono backdrop-blur-xs">
                    <div className="animate-in fade-in w-full max-w-lg space-y-4 border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_#0f172a]">
                        <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-3">
                            <span className="text-2xl">🔄</span>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase">
                                    Re-enable Quiz for Participant
                                </h3>
                                <p className="text-[11px] font-bold text-slate-500">
                                    Grant fresh attempts for this particular user alone
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5 border-2 border-slate-900 bg-slate-50 p-4 text-xs">
                            <div>
                                <span className="font-bold text-slate-500">Participant: </span>
                                <strong className="text-slate-900">{userToReset.userName}</strong>
                            </div>
                            <div>
                                <span className="font-bold text-slate-500">Email Address: </span>
                                <strong className="text-slate-900">{userToReset.userEmail}</strong>
                            </div>
                            {userToReset.rollNo && (
                                <div>
                                    <span className="font-bold text-slate-500">Roll Number: </span>
                                    <strong className="text-slate-900">{userToReset.rollNo}</strong>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 border-2 border-emerald-500 bg-emerald-50 p-4 text-xs text-emerald-950">
                            <div className="flex items-center gap-1.5 font-black text-emerald-900 uppercase">
                                <span>🛡️</span>
                                <span>Database Protection Guarantee:</span>
                            </div>
                            <p className="text-[11px] leading-relaxed font-bold text-emerald-900">
                                Past submissions are <strong>NOT deleted</strong> from the database. They will
                                be archived and safely kept for official records and history.
                            </p>
                            <p className="text-[11px] text-emerald-800">
                                This user alone will be granted 2 fresh attempts to take this quiz.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setUserToReset(null)}
                                disabled={Boolean(resettingEmail)}
                                className="press flex-1 cursor-pointer border-2 border-slate-900 bg-slate-100 py-2.5 text-xs font-black text-slate-800 uppercase hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmResetUser}
                                disabled={Boolean(resettingEmail)}
                                className="press flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-amber-400 py-2.5 text-xs font-black text-slate-950 uppercase shadow-[2px_2px_0px_#0f172a] hover:bg-amber-300"
                            >
                                {resettingEmail ? (
                                    <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></span>
                                        <span>Re-enabling...</span>
                                    </>
                                ) : (
                                    <span>Confirm & Re-enable ✓</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Editor Modal */}
            {isEditorOpen && (
                <QuizEditorModal
                    initialData={editingQuiz}
                    onClose={() => setIsEditorOpen(false)}
                    onSaved={() => {
                        setIsEditorOpen(false);
                        fetchQuizzes();
                        if (showStatus) showStatus('✓ Quiz saved successfully!');
                    }}
                />
            )}
        </div>
    );
}

// -------------------------------------------------------------------
// QUIZ CREATOR & MCQ BUILDER MODAL COMPONENT
// -------------------------------------------------------------------
function QuizEditorModal({ initialData, onClose, onSaved }) {
    const isEdit = Boolean(initialData?._id);

    const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'questions'
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Quiz form state
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 20);
    const [passingPercentage] = useState(initialData?.passingPercentage || 50);

    // Timing
    const [startTime, setStartTime] = useState(() => {
        if (initialData?.startTime) return formatDateTimeInput(initialData.startTime);
        const now = new Date();
        now.setMinutes(0, 0, 0);
        return formatDateTimeInput(now);
    });

    const [endTime, setEndTime] = useState(() => {
        if (initialData?.endTime) return formatDateTimeInput(initialData.endTime);
        const d = new Date();
        d.setHours(d.getHours() + 2);
        d.setMinutes(0, 0, 0);
        return formatDateTimeInput(d);
    });

    const [resultsPublishTime, setResultsPublishTime] = useState(() => {
        if (initialData?.resultsPublishTime) return formatDateTimeInput(initialData.resultsPublishTime);
        const d = new Date();
        d.setHours(d.getHours() + 4);
        d.setMinutes(0, 0, 0);
        return formatDateTimeInput(d);
    });

    const [showExplanations, setShowExplanations] = useState(initialData?.showExplanations !== false);
    const [shuffleQuestions, setShuffleQuestions] = useState(Boolean(initialData?.shuffleQuestions));
    const [instantFeedback, setInstantFeedback] = useState(Boolean(initialData?.instantFeedback));
    const [status, setStatus] = useState(initialData?.status || 'published');

    // Ready-made papers from src/data/quizPresets.js
    const [selectedPresetId, setSelectedPresetId] = useState('');

    // Questions state
    const [questions, setQuestions] = useState(() => {
        if (Array.isArray(initialData?.questions) && initialData.questions.length > 0) {
            return initialData.questions.map((q) => ({
                questionText: q.questionText || '',
                options:
                    Array.isArray(q.options) && q.options.length >= 2
                        ? [...q.options]
                        : ['Option A', 'Option B', 'Option C', 'Option D'],
                correctOptionIndex: Number(q.correctOptionIndex) || 0,
                points: Number(q.points) || 1,
                explanation: q.explanation || ''
            }));
        }
        return [
            {
                questionText: '',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctOptionIndex: 0,
                points: 1,
                explanation: ''
            }
        ];
    });

    const editorModalRef = useModalBehavior(true, onClose);

    // Preset helper for results publish time
    const handleSetPublishPreset = (type) => {
        if (!endTime) return;
        const end = new Date(endTime);
        if (type === 'end') {
            setResultsPublishTime(formatDateTimeInput(end));
        } else if (type === '1hr') {
            end.setHours(end.getHours() + 1);
            setResultsPublishTime(formatDateTimeInput(end));
        } else if (type === '24hr') {
            end.setDate(end.getDate() + 1);
            setResultsPublishTime(formatDateTimeInput(end));
        }
    };

    // Load a ready-made paper from src/data/quizPresets.js. Fills in everything
    // except the schedule — exam start, exam end and results release stay
    // exactly as the organiser set them.
    const handleLoadPreset = () => {
        const preset = QUIZ_PRESETS.find((p) => p.presetId === selectedPresetId);
        if (!preset) {
            setFormError('Pick a ready paper to load first.');
            return;
        }

        const hasTypedQuestions = questions.some((q) => q.questionText.trim() || q.explanation.trim());
        if (
            (hasTypedQuestions || title.trim()) &&
            !window.confirm(
                `Load "${preset.label}"? This replaces the title, description, duration and all ${preset.questions.length} questions currently in this form. Your exam and results times are left untouched.`
            )
        ) {
            return;
        }

        setTitle(preset.title);
        setSlug(preset.slug || '');
        setDescription(preset.description || '');
        setDurationMinutes(preset.durationMinutes || 20);
        setShowExplanations(preset.showExplanations !== false);
        setShuffleQuestions(Boolean(preset.shuffleQuestions));
        setInstantFeedback(Boolean(preset.instantFeedback));
        setQuestions(
            preset.questions.map((q) => ({
                questionText: q.questionText,
                options: [...q.options],
                correctOptionIndex: Number(q.correctOptionIndex) || 0,
                points: Number(q.points) || 1,
                explanation: q.explanation || ''
            }))
        );
        setFormError('');
        setActiveTab('questions');
    };

    // Question operations
    const handleAddQuestion = () => {
        setQuestions((prev) => [
            ...prev,
            {
                questionText: '',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctOptionIndex: 0,
                points: 1,
                explanation: ''
            }
        ]);
    };

    const handleRemoveQuestion = (idx) => {
        if (questions.length <= 1) {
            alert('A quiz must have at least one question.');
            return;
        }
        setQuestions((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleUpdateQuestion = (idx, field, val) => {
        setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: val } : q)));
    };

    const handleOptionChange = (qIdx, optIdx, val) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx) return q;
                const updatedOpts = [...q.options];
                updatedOpts[optIdx] = val;
                return { ...q, options: updatedOpts };
            })
        );
    };

    const handleAddOption = (qIdx) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx) return q;
                return {
                    ...q,
                    options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`]
                };
            })
        );
    };

    const handleRemoveOption = (qIdx, optIdx) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx) return q;
                if (q.options.length <= 2) {
                    alert('At least 2 options are required for an MCQ question.');
                    return q;
                }
                const updatedOpts = q.options.filter((_, oi) => oi !== optIdx);
                let correct = q.correctOptionIndex;
                if (correct === optIdx) correct = 0;
                else if (correct > optIdx) correct -= 1;
                return { ...q, options: updatedOpts, correctOptionIndex: correct };
            })
        );
    };

    // Submit save
    const handleSave = async () => {
        setFormError('');

        if (!title.trim()) {
            setFormError('Quiz title is required.');
            setActiveTab('settings');
            return;
        }
        if (!startTime || !endTime) {
            setFormError('Exam start and end times are required.');
            setActiveTab('settings');
            return;
        }
        if (new Date(endTime) <= new Date(startTime)) {
            setFormError('End time must be later than start time.');
            setActiveTab('settings');
            return;
        }
        if (!resultsPublishTime) {
            setFormError('Results publish time is required.');
            setActiveTab('settings');
            return;
        }

        // Validate questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText.trim()) {
                setFormError(`Question #${i + 1} has empty question text.`);
                setActiveTab('questions');
                return;
            }
            if (q.options.some((opt) => !String(opt).trim())) {
                setFormError(`Question #${i + 1} has one or more empty options.`);
                setActiveTab('questions');
                return;
            }
        }

        setIsSaving(true);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const payload = {
                title: title.trim(),
                description: description.trim(),
                slug: slug.trim() || undefined,
                durationMinutes: Number(durationMinutes) || 20,
                passingPercentage: Number(passingPercentage) || 50,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                resultsPublishTime: new Date(resultsPublishTime).toISOString(),
                showExplanations,
                shuffleQuestions,
                instantFeedback,
                status,
                questions
            };

            const url = isEdit
                ? apiUrl(`/api/quiz/admin/${initialData._id}`)
                : apiUrl('/api/quiz/admin/create');
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save quiz');

            onSaved();
        } catch (err) {
            console.error('Error saving quiz:', err);
            setFormError(err.message || 'Error occurred while saving quiz');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-xs sm:p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={editorModalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quiz-editor-modal-title"
                tabIndex={-1}
                className="shadow-brutal-8 anim-pop flex max-h-[92dvh] w-full max-w-4xl flex-col border-4 border-slate-900 bg-white"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between gap-3 border-b-4 border-slate-900 bg-sky-300 p-4 sm:p-5">
                    <div>
                        <span className="border border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-slate-900 uppercase">
                            {isEdit ? 'EDIT QUIZ' : 'CREATE NEW QUIZ'}
                        </span>
                        <h3
                            id="quiz-editor-modal-title"
                            className="mt-1 text-xl font-black text-slate-950 uppercase"
                        >
                            {title.trim() || 'Untitled Quiz'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                    >
                        ✕ Close
                    </button>
                </div>

                {/* Tab switcher */}
                <div className="flex border-b-4 border-slate-900 bg-slate-100">
                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-r-2 border-slate-900 px-4 py-3 font-mono text-xs font-black uppercase ${
                            activeTab === 'settings'
                                ? 'bg-white text-slate-900 shadow-inner'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span>⚙</span>
                        <span>1. Quiz Timing & Settings</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('questions')}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-4 py-3 font-mono text-xs font-black uppercase ${
                            activeTab === 'questions'
                                ? 'bg-white text-slate-900 shadow-inner'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span>📝</span>
                        <span>2. Questions & Answer Keys ({questions.length})</span>
                    </button>
                </div>

                {/* Form Error Message */}
                {formError && (
                    <div className="m-4 border-2 border-red-600 bg-red-100 p-3 font-mono text-xs font-bold text-red-800">
                        ⚠️ {formError}
                    </div>
                )}

                {/* Tab Content */}
                <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                    {activeTab === 'settings' ? (
                        <div className="space-y-5">
                            {/* Ready-made papers kept in code (src/data/quizPresets.js) */}
                            {QUIZ_PRESETS.length > 0 && (
                                <div className="shadow-brutal-4 space-y-2.5 border-3 border-slate-900 bg-violet-50 p-4">
                                    <h4 className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 uppercase">
                                        <span>⚡</span>
                                        <span>Load a Ready Paper (no retyping)</span>
                                    </h4>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <select
                                            value={selectedPresetId}
                                            onChange={(e) => setSelectedPresetId(e.target.value)}
                                            className="flex-1 cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-bold"
                                        >
                                            <option value="">— Select a prepared question paper —</option>
                                            {QUIZ_PRESETS.map((preset) => (
                                                <option key={preset.presetId} value={preset.presetId}>
                                                    {preset.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleLoadPreset}
                                            disabled={!selectedPresetId}
                                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-violet-300 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Load Paper →
                                        </button>
                                    </div>
                                    {selectedPresetId && (
                                        <p className="font-mono text-[11px] font-bold text-slate-600">
                                            {
                                                QUIZ_PRESETS.find((p) => p.presetId === selectedPresetId)
                                                    ?.summary
                                            }
                                        </p>
                                    )}
                                    <p className="font-mono text-[10px] font-bold text-violet-900">
                                        Fills in the title, description, duration, answer-on-the-spot setting
                                        and every question with its answer key. Your exam start, exam end and
                                        results release times are never changed — set those yourself below.
                                    </p>
                                </div>
                            )}

                            {/* Title & Slug */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Quiz Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Software Track Week 1: ROS & System Design Quiz"
                                        className="w-full border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs focus:bg-amber-50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        URL Code / Slug (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="e.g. sw-week-1"
                                        className="w-full border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs focus:bg-amber-50 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                    Brief Description / Instructions for Participants
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Enter topics covered, instructions on calculator / notes, passing marks, etc."
                                    className="w-full border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs focus:bg-amber-50 focus:outline-none"
                                />
                            </div>

                            {/* Exam Schedule Window */}
                            <div className="shadow-brutal-4 space-y-3 border-3 border-slate-900 bg-amber-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 uppercase">
                                        <span>⏳</span>
                                        <span>Exam Examination Window (When students can join)</span>
                                    </h4>
                                    <label className="flex items-center gap-2 font-mono text-[11px] font-black text-slate-700 uppercase">
                                        <span>Status</span>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className={`cursor-pointer border-2 border-slate-900 px-2 py-1 font-mono text-[11px] font-black uppercase ${
                                                status === 'published'
                                                    ? 'bg-emerald-300 text-slate-950'
                                                    : 'bg-slate-800 text-white'
                                            }`}
                                        >
                                            <option value="draft">Draft — nobody can open it</option>
                                            <option value="published">
                                                Published — open to participants
                                            </option>
                                            <option value="archived">Archived — retired</option>
                                        </select>
                                    </label>
                                </div>
                                {status === 'draft' && (
                                    <p className="border-2 border-slate-900 bg-slate-100 p-2.5 font-mono text-[11px] font-bold text-slate-700">
                                        This quiz is a draft: its link will not open for anyone. Set your exam
                                        times below, then switch Status to <strong>Published</strong> to let
                                        participants in.
                                    </p>
                                )}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block font-mono text-[11px] font-bold text-slate-700">
                                            Exam Start Date & Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 font-mono text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-mono text-[11px] font-bold text-slate-700">
                                            Exam End Date & Time *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 font-mono text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-mono text-[11px] font-bold text-slate-700">
                                            Duration per Participant (Mins) *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="300"
                                            value={durationMinutes}
                                            onChange={(e) => setDurationMinutes(e.target.value)}
                                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Results Publishing Time */}
                            <div className="shadow-brutal-4 space-y-3 border-3 border-slate-900 bg-sky-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 uppercase">
                                        <span>📢</span>
                                        <span>
                                            Results Release Date & Time (When students can check back)
                                        </span>
                                    </h4>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                            Presets:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleSetPublishPreset('end')}
                                            className="cursor-pointer border border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100"
                                        >
                                            At Exam End
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetPublishPreset('1hr')}
                                            className="cursor-pointer border border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100"
                                        >
                                            +1 Hour
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetPublishPreset('24hr')}
                                            className="cursor-pointer border border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100"
                                        >
                                            +24 Hours
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block font-mono text-[11px] font-bold text-slate-700">
                                            Exact Release Timestamp *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={resultsPublishTime}
                                            onChange={(e) => setResultsPublishTime(e.target.value)}
                                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 font-mono text-xs"
                                        />
                                        <span className="mt-1 block font-mono text-[10px] text-slate-500">
                                            Prior to this time, participants will see an acknowledgment
                                            informing them to return at this exact moment.
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold text-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={showExplanations}
                                                onChange={(e) => setShowExplanations(e.target.checked)}
                                                className="h-4 w-4 accent-slate-900"
                                            />
                                            <span>
                                                Show correct answers & explanations on results release
                                            </span>
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold text-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={shuffleQuestions}
                                                onChange={(e) => setShuffleQuestions(e.target.checked)}
                                                className="h-4 w-4 accent-slate-900"
                                            />
                                            <span>Shuffle question order for each participant</span>
                                        </label>
                                        <label className="flex cursor-pointer items-start gap-2 border-2 border-slate-900 bg-amber-100 p-2.5 font-mono text-xs font-bold text-slate-800">
                                            <input
                                                type="checkbox"
                                                checked={instantFeedback}
                                                onChange={(e) => setInstantFeedback(e.target.checked)}
                                                className="mt-0.5 h-4 w-4 accent-slate-900"
                                            />
                                            <span>
                                                <strong className="block uppercase">
                                                    Answer on the spot
                                                </strong>
                                                <span className="font-normal text-slate-600">
                                                    Mark each answer the instant it is picked and show the
                                                    participant whether they got it right. Choices become
                                                    final once answered, and the projector leaderboard scores
                                                    people live as they play.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* MCQ Questions Tab */
                        <div className="space-y-6">
                            <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900/10 pb-3">
                                <div>
                                    <h4 className="font-mono text-xs font-black text-slate-900 uppercase">
                                        Quiz Questions List ({questions.length} MCQs)
                                    </h4>
                                    <span className="font-mono text-[11px] font-bold text-slate-500">
                                        Total Marks:{' '}
                                        {questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0)} pts
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddQuestion}
                                    className="press shadow-brutal-2 flex cursor-pointer items-center gap-1 border-2 border-slate-900 bg-emerald-400 px-3.5 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-emerald-300"
                                >
                                    <span>+</span>
                                    <span>Add Question</span>
                                </button>
                            </div>

                            <div className="space-y-5">
                                {questions.map((q, qIdx) => (
                                    <div
                                        key={qIdx}
                                        className="shadow-brutal-4 space-y-3 border-3 border-slate-900 bg-white p-4 sm:p-5"
                                    >
                                        <div className="flex items-center justify-between gap-3 border-b-2 border-slate-900/10 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-xs font-black text-amber-300">
                                                    Q{qIdx + 1}
                                                </span>
                                                <span className="font-mono text-xs font-bold text-slate-600">
                                                    Points:
                                                </span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    value={q.points}
                                                    onChange={(e) =>
                                                        handleUpdateQuestion(
                                                            qIdx,
                                                            'points',
                                                            Number(e.target.value) || 1
                                                        )
                                                    }
                                                    className="w-16 border-2 border-slate-900 px-1.5 py-0.5 text-center font-mono text-xs"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQuestion(qIdx)}
                                                className="press cursor-pointer border border-slate-900 bg-rose-100 px-2 py-0.5 font-mono text-[10px] font-black text-rose-800 uppercase hover:bg-rose-200"
                                                title="Delete this question"
                                            >
                                                Delete Q{qIdx + 1}
                                            </button>
                                        </div>

                                        {/* Question Text */}
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-black text-slate-700 uppercase">
                                                Question Text *
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={q.questionText}
                                                onChange={(e) =>
                                                    handleUpdateQuestion(qIdx, 'questionText', e.target.value)
                                                }
                                                placeholder="Enter question statement here..."
                                                className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs focus:bg-amber-50 focus:outline-none"
                                            />
                                        </div>

                                        {/* Options */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-[11px] font-black text-slate-700 uppercase">
                                                    Answer Choices (Select radio button for correct answer) *
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddOption(qIdx)}
                                                    className="cursor-pointer font-mono text-[10px] font-black text-sky-700 uppercase hover:underline"
                                                >
                                                    + Add Option
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                                {q.options.map((opt, optIdx) => {
                                                    const isCorrect = q.correctOptionIndex === optIdx;
                                                    const labelLetter = String.fromCharCode(65 + optIdx);

                                                    return (
                                                        <div
                                                            key={optIdx}
                                                            className={`flex items-center gap-2 border-2 p-2 ${
                                                                isCorrect
                                                                    ? 'border-emerald-600 bg-emerald-50'
                                                                    : 'border-slate-900 bg-slate-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`correct-key-${qIdx}`}
                                                                checked={isCorrect}
                                                                onChange={() =>
                                                                    handleUpdateQuestion(
                                                                        qIdx,
                                                                        'correctOptionIndex',
                                                                        optIdx
                                                                    )
                                                                }
                                                                className="h-4 w-4 cursor-pointer accent-emerald-600"
                                                                title="Mark as correct answer"
                                                            />
                                                            <span className="w-4 font-mono text-xs font-black text-slate-700">
                                                                {labelLetter}.
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) =>
                                                                    handleOptionChange(
                                                                        qIdx,
                                                                        optIdx,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder={`Choice ${labelLetter}`}
                                                                className="flex-1 border border-slate-900/30 bg-white px-2 py-1 font-mono text-xs focus:outline-none"
                                                            />
                                                            {q.options.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleRemoveOption(qIdx, optIdx)
                                                                    }
                                                                    className="px-1 font-bold text-slate-500 hover:text-rose-600"
                                                                    title="Remove choice"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Explanation */}
                                        <div>
                                            <label className="mb-0.5 block font-mono text-[10px] font-bold text-slate-500">
                                                Explanation (Shown to students only after results are
                                                published)
                                            </label>
                                            <input
                                                type="text"
                                                value={q.explanation}
                                                onChange={(e) =>
                                                    handleUpdateQuestion(qIdx, 'explanation', e.target.value)
                                                }
                                                placeholder="Explain why this choice is correct..."
                                                className="w-full border border-slate-900/30 bg-slate-50 px-2.5 py-1 font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between gap-3 border-t-4 border-slate-900 bg-slate-100 p-4">
                    <div className="font-mono text-xs font-bold text-slate-600">
                        {questions.length} Question(s) • Total{' '}
                        {questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0)} pts
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="press cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="press shadow-brutal-3 cursor-pointer border-2 border-slate-900 bg-emerald-400 px-5 py-2 font-mono text-xs font-black uppercase hover:bg-emerald-300"
                        >
                            {isSaving ? 'Saving Quiz...' : isEdit ? 'Update Quiz' : 'Save & Publish Quiz'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
