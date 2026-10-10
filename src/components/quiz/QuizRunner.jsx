import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiUrl } from '../../lib/api';

// Format seconds into MM:SS
function formatTime(totalSeconds) {
    if (totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Format duration until future date into DDd HHh MMm SSs
function formatTimeUntil(targetDate) {
    const diffMs = new Date(targetDate).getTime() - Date.now();
    if (diffMs <= 0) return '00:00:00';
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (days > 0) {
        return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export default function QuizRunner({ onBack }) {
    // -------------------------------------------------------------
    // Router / URL Parsing
    // -------------------------------------------------------------
    const [quizIdOrSlug, setQuizIdOrSlug] = useState(() => {
        const hash = window.location.hash || '';
        // match #quiz/some-slug or #quiz?id=some-slug
        if (hash.includes('?id=')) {
            return hash.split('?id=')[1].split('&')[0];
        }
        const cleaned = hash.replace(/^#quiz\/?/, '').split('?')[0];
        return cleaned || '';
    });

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash || '';
            let id = '';
            if (hash.includes('?id=')) {
                id = hash.split('?id=')[1].split('&')[0];
            } else {
                id = hash.replace(/^#quiz\/?/, '').split('?')[0];
            }
            if (id) setQuizIdOrSlug(id);
        };
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    // -------------------------------------------------------------
    // Main States
    // -------------------------------------------------------------
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
    const [quizData, setQuizData] = useState(null);
    const [fetchError, setFetchError] = useState('');

    // Flow view modes: 'gatekeeper' | 'exam' | 'submitted' | 'results'
    const [viewMode, setViewMode] = useState('gatekeeper');
    const [gatekeeperTab, setGatekeeperTab] = useState('enter'); // 'enter' | 'lookup'

    // Gatekeeper attendee form state
    const [participant, setParticipant] = useState(() => {
        try {
            return (
                JSON.parse(sessionStorage.getItem('asterix_quiz_attendee')) || {
                    name: '',
                    email: '',
                    rollNo: ''
                }
            );
        } catch {
            return { name: '', email: '', rollNo: '' };
        }
    });
    const [gatekeeperError] = useState('');
    const [isStarting] = useState(false);

    // Lookup / Return flow state
    const [lookupEmail, setLookupEmail] = useState('');
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState('');

    // Active Exam state
    const [submissionId] = useState('');
    const [questions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { [questionId]: selectedOptionIndex }
    const [remainingSeconds] = useState(0);
    const [isSubmittingExam, setIsSubmittingExam] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPaletteDrawer, setShowPaletteDrawer] = useState(false);

    // Results / Post-submit payload
    const [resultData, setResultData] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // Countdown tickers
    const [timeUntilStart, setTimeUntilStart] = useState('');
    const [timeUntilPublish, setTimeUntilPublish] = useState('');

    // -------------------------------------------------------------
    // 1. Fetch Public Quiz Metadata
    // -------------------------------------------------------------
    const fetchQuizInfo = useCallback(async () => {
        if (!quizIdOrSlug) {
            setFetchError('No quiz specified. Please verify the URL link.');
            setIsLoadingQuiz(false);
            return;
        }

        setIsLoadingQuiz(true);
        setFetchError('');

        try {
            const res = await fetch(apiUrl(`/api/quiz/${quizIdOrSlug}/info`));
            const data = await res.json();

            if (!res.ok || !data.success) {
                setFetchError(data.error || 'Failed to load quiz details.');
                return;
            }

            setQuizData(data.quiz);

            // Pre-fill lookup email from participant if available
            if (participant.email) {
                setLookupEmail(participant.email);
            }
        } catch (err) {
            console.error('Error fetching quiz info:', err);
            setFetchError('Could not connect to the quiz server. Please check your network.');
        } finally {
            setIsLoadingQuiz(false);
        }
    }, [quizIdOrSlug, participant.email]);

    useEffect(() => {
        fetchQuizInfo();
    }, [fetchQuizInfo]);

    // Live ticker for upcoming start & publish countdowns
    useEffect(() => {
        if (!quizData) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const startMs = new Date(quizData.startTime).getTime();
            const pubMs = new Date(quizData.resultsPublishTime).getTime();

            if (startMs > now) {
                setTimeUntilStart(formatTimeUntil(quizData.startTime));
            } else {
                setTimeUntilStart('');
            }

            if (pubMs > now) {
                setTimeUntilPublish(formatTimeUntil(quizData.resultsPublishTime));
            } else {
                setTimeUntilPublish('');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [quizData]);

    // -------------------------------------------------------------
    // 4. Return Flow: Lookup Results by Email
    // -------------------------------------------------------------
    const performLookup = useCallback(
        async (emailToSearch) => {
            const clean = (emailToSearch || lookupEmail || '').trim().toLowerCase();
            if (!clean || !clean.includes('@')) {
                setLookupError('Please enter a valid registered email address.');
                return;
            }

            setLookupError('');
            setIsLookingUp(true);

            try {
                const res = await fetch(apiUrl(`/api/quiz/${quizIdOrSlug}/lookup-result`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: clean })
                });

                const data = await res.json();

                if (!res.ok) {
                    setLookupError(data.error || 'No submission found for this email address.');
                    return;
                }

                if (!data.resultsPublished) {
                    // Submitted but waiting for scheduled publish time!
                    setResultData({
                        resultsPublished: false,
                        userName: data.userName,
                        submittedAt: data.submittedAt,
                        resultsPublishTime: data.resultsPublishTime,
                        message: data.message
                    });
                    setViewMode('submitted');
                } else {
                    // Results released! Show full scorecard and answer review
                    setResultData({
                        resultsPublished: true,
                        ...data
                    });
                    setViewMode('results');
                }
            } catch (err) {
                console.error('Error looking up result:', err);
                setLookupError('Network error while checking results.');
            } finally {
                setIsLookingUp(false);
            }
        },
        [lookupEmail, quizIdOrSlug]
    );

    // -------------------------------------------------------------
    // 2. Exam Timer Countdown & Auto-Submit
    // -------------------------------------------------------------
    const answersRef = useRef(answers);
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const submitExamAction = useCallback(
        async (forcedAnswers = null) => {
            if (!submissionId || !quizIdOrSlug) return;
            setIsSubmittingExam(true);

            const currentAnswers = forcedAnswers || answersRef.current;
            const formattedAnswers = Object.entries(currentAnswers).map(([qId, optIdx]) => ({
                questionId: qId,
                selectedOptionIndex: optIdx
            }));

            try {
                const res = await fetch(apiUrl(`/api/quiz/${quizIdOrSlug}/submit`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        submissionId,
                        email: participant.email,
                        answers: formattedAnswers
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    alert(data.error || 'Failed to submit exam.');
                    setIsSubmittingExam(false);
                    return;
                }

                // Clear local draft answers
                try {
                    localStorage.removeItem(`asterix_quiz_${quizIdOrSlug}_${participant.email}`);
                } catch {
                    // ignore
                }

                if (data.resultsPublished) {
                    // Directly fetch evaluated result details
                    await performLookup(participant.email);
                } else {
                    setResultData({
                        resultsPublished: false,
                        resultsPublishTime: data.resultsPublishTime || quizData?.resultsPublishTime,
                        message: data.message
                    });
                    setViewMode('submitted');
                }
            } catch (err) {
                console.error('Error submitting quiz:', err);
                alert('Network error while submitting. Please try again.');
            } finally {
                setIsSubmittingExam(false);
                setShowConfirmModal(false);
            }
        },
        [submissionId, quizIdOrSlug, participant.email, quizData, performLookup]
    );

    // -------------------------------------------------------------
    // 5. Option Selection & Local Draft Save
    // -------------------------------------------------------------
    const handleSelectOption = (questionId, optionIndex) => {
        setAnswers((prev) => {
            const updated = { ...prev };
            if (updated[questionId] === optionIndex) {
                delete updated[questionId]; // Toggle deselect
            } else {
                updated[questionId] = optionIndex;
            }

            try {
                localStorage.setItem(
                    `asterix_quiz_${quizIdOrSlug}_${participant.email}`,
                    JSON.stringify(updated)
                );
            } catch {
                // ignore
            }

            return updated;
        });
    };

    const handleClearOption = (questionId) => {
        setAnswers((prev) => {
            const updated = { ...prev };
            delete updated[questionId];
            try {
                localStorage.setItem(
                    `asterix_quiz_${quizIdOrSlug}_${participant.email}`,
                    JSON.stringify(updated)
                );
            } catch {
                // ignore
            }
            return updated;
        });
    };

    // Calculate answered status
    const answeredCount = useMemo(() => {
        return Object.keys(answers).length;
    }, [answers]);

    const totalQuestionsCount = questions.length;
    const currentQ = questions[currentQIndex];

    const copyJoinLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
    };

    // -------------------------------------------------------------
    // RENDER: Loading & Error States
    // -------------------------------------------------------------
    if (isLoadingQuiz) {
        return (
            <div className="flex min-h-[100svh] flex-col items-center justify-center bg-slate-100 p-6 font-mono text-slate-900">
                <div className="shadow-brutal-6 w-full max-w-md space-y-4 border-4 border-slate-900 bg-white p-8 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-900 border-t-sky-500"></div>
                    <h2 className="text-xl font-black uppercase">Loading Quiz System...</h2>
                    <p className="text-xs text-slate-600">Connecting to Asterix Secure Assessment Engine</p>
                </div>
            </div>
        );
    }

    if (fetchError || !quizData) {
        return (
            <div className="flex min-h-[100svh] flex-col items-center justify-center bg-slate-100 p-6 font-mono text-slate-900">
                <div className="shadow-brutal-6 w-full max-w-lg space-y-4 border-4 border-slate-900 bg-white p-8">
                    <div className="flex items-center gap-3 text-rose-600">
                        <span className="text-2xl">⚠️</span>
                        <h2 className="text-xl font-black uppercase">Quiz Unavailable</h2>
                    </div>
                    <p className="border-2 border-rose-300 bg-rose-50 p-4 text-sm font-bold text-slate-700">
                        {fetchError || 'Quiz could not be found or has been removed.'}
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={
                                onBack ||
                                (() => {
                                    window.location.hash = '';
                                })
                            }
                            className="tap press shadow-brutal-3 flex-1 cursor-pointer bg-slate-900 py-3 text-xs font-black text-white uppercase hover:bg-slate-800"
                        >
                            ← Back to Asterix Homepage
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: VIEW 1 - GATEKEEPER & ATTENDEE FORM
    // -------------------------------------------------------------
    if (viewMode === 'gatekeeper') {
        return (
            <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
                {/* Header bar */}
                <header className="sticky top-0 z-40 flex items-center justify-between border-b-4 border-slate-900 bg-white px-4 py-3.5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-white uppercase">
                            ASTERIX MCQ ENGINE
                        </span>
                        <span className="hidden font-mono text-xs font-bold text-slate-500 sm:inline">
                            Assessment Portal
                        </span>
                    </div>

                    <button
                        onClick={
                            onBack ||
                            (() => {
                                window.location.hash = '';
                            })
                        }
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-100 px-3.5 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-200"
                    >
                        ← Exit
                    </button>
                </header>

                <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 sm:p-8">
                    {/* Top Quiz Banner */}
                    <div className="shadow-brutal-6 border-4 border-slate-900 bg-white p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"></span>
                                <span className="font-mono text-xs font-black text-slate-600 uppercase">
                                    Track Assessment
                                </span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs">
                                {isUpcoming && (
                                    <span className="border border-amber-500 bg-amber-100 px-3 py-1 font-black text-amber-800 uppercase">
                                        ⏱ Starts In {timeUntilStart || 'Shortly'}
                                    </span>
                                )}
                                {isActive && (
                                    <span className="animate-pulse border border-emerald-500 bg-emerald-100 px-3 py-1 font-black text-emerald-800 uppercase">
                                        ● Live Exam Active
                                    </span>
                                )}
                                {isEnded && (
                                    <span className="border border-slate-500 bg-slate-200 px-3 py-1 font-black text-slate-700 uppercase">
                                        Exam Concluded
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <h1 className="text-2xl leading-tight font-black text-slate-900 uppercase sm:text-4xl">
                                {quizData.title}
                            </h1>
                            {quizData.description && (
                                <p className="text-sm font-medium text-slate-600 sm:text-base">
                                    {quizData.description}
                                </p>
                            )}
                        </div>

                        {/* Quiz Quick Specs */}
                        <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
                            <div className="shadow-brutal-2 border-2 border-slate-900 bg-slate-50 p-3">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Duration
                                </span>
                                <span className="text-base font-black text-slate-900">
                                    {quizData.durationMinutes} Mins
                                </span>
                            </div>
                            <div className="shadow-brutal-2 border-2 border-slate-900 bg-slate-50 p-3">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Questions
                                </span>
                                <span className="text-base font-black text-slate-900">
                                    {quizData.questionCount} MCQs
                                </span>
                            </div>
                            <div className="shadow-brutal-2 border-2 border-slate-900 bg-slate-50 p-3">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Total Points
                                </span>
                                <span className="text-base font-black text-slate-900">
                                    {quizData.totalPoints} Pts
                                </span>
                            </div>
                            <div className="shadow-brutal-2 border-2 border-slate-900 bg-slate-50 p-3">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Pass Requirement
                                </span>
                                <span className="text-base font-black text-slate-900">
                                    {quizData.passingPercentage}%
                                </span>
                            </div>
                        </div>

                        {/* Schedule & Results Timings info */}
                        <div className="mt-4 space-y-1.5 border-2 border-slate-900 bg-sky-50 p-4 font-mono text-xs">
                            <div className="flex flex-wrap justify-between gap-1">
                                <span className="font-bold text-slate-600">Exam Window:</span>
                                <span className="font-black text-slate-900">
                                    {new Date(quizData.startTime).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}{' '}
                                    —{' '}
                                    {new Date(quizData.endTime).toLocaleString('en-IN', {
                                        timeStyle: 'short'
                                    })}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-1 border-t border-sky-200 pt-1.5">
                                <span className="font-bold text-sky-800">
                                    Results Publishing Date & Time:
                                </span>
                                <span className="font-black text-sky-900">
                                    {new Date(quizData.resultsPublishTime).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dual-Tab Action Area: Attend Exam OR Check Results */}
                    <div className="shadow-brutal-6 border-4 border-slate-900 bg-white p-6 sm:p-8">
                        <div className="mb-6 flex border-b-2 border-slate-900">
                            <button
                                type="button"
                                onClick={() => setGatekeeperTab('enter')}
                                className={`flex-1 cursor-pointer border-r-2 border-slate-900 py-3 font-mono text-xs font-black uppercase transition-colors ${
                                    gatekeeperTab === 'enter'
                                        ? 'bg-sky-400 text-slate-900'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                ✍ Attend Quiz (Live)
                            </button>
                            <button
                                type="button"
                                onClick={() => setGatekeeperTab('lookup')}
                                className={`flex-1 cursor-pointer py-3 font-mono text-xs font-black uppercase transition-colors ${
                                    gatekeeperTab === 'lookup'
                                        ? 'bg-emerald-400 text-slate-900'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                🔍 Check Results / Return Later
                            </button>
                        </div>

                        {/* TAB 1: ATTEND EXAM */}
                        {gatekeeperTab === 'enter' && (
                            <div>
                                {isUpcoming ? (
                                    <div className="space-y-3 border-2 border-amber-400 bg-amber-50 p-6 text-center font-mono">
                                        <div className="text-3xl">⏱</div>
                                        <h3 className="text-lg font-black text-amber-900 uppercase">
                                            Quiz Has Not Started Yet
                                        </h3>
                                        <p className="text-xs font-bold text-amber-800">
                                            The exam will open at{' '}
                                            {new Date(quizData.startTime).toLocaleString('en-IN')}.
                                        </p>
                                        <div className="inline-block border-2 border-slate-900 bg-white p-4">
                                            <span className="block text-xs font-bold text-slate-500 uppercase">
                                                Opens in:
                                            </span>
                                            <span className="text-2xl font-black tracking-wider text-slate-900 sm:text-3xl">
                                                {timeUntilStart || 'Shortly...'}
                                            </span>
                                        </div>
                                        <p className="pt-2 text-[11px] text-slate-500">
                                            This page will automatically allow entry once the timer expires.
                                            You may enter your details below in advance.
                                        </p>
                                    </div>
                                ) : isEnded ? (
                                    <div className="space-y-3 border-2 border-slate-400 bg-slate-100 p-6 text-center font-mono">
                                        <div className="text-3xl">🏁</div>
                                        <h3 className="text-lg font-black text-slate-800 uppercase">
                                            Exam Window Concluded
                                        </h3>
                                        <p className="text-xs font-bold text-slate-600">
                                            The scheduled examination window for this quiz has ended.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setGatekeeperTab('lookup')}
                                            className="press shadow-brutal-3 cursor-pointer border-2 border-slate-900 bg-emerald-400 px-6 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300"
                                        >
                                            Check Your Evaluation Scorecard →
                                        </button>
                                    </div>
                                ) : null}

                                <form onSubmit={handleStartQuiz} className="mt-6 space-y-4">
                                    <div className="border-b-2 border-slate-100 pb-2">
                                        <h3 className="font-mono text-sm font-black text-slate-900 uppercase">
                                            Participant Verification
                                        </h3>
                                        <p className="font-mono text-xs text-slate-500">
                                            Enter your details to track your attendance and calculate your
                                            score.
                                        </p>
                                    </div>

                                    {gatekeeperError && (
                                        <div className="border-2 border-rose-500 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-700">
                                            ⚠️ {gatekeeperError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block font-mono text-xs font-bold text-slate-700 uppercase">
                                                Email Address <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={participant.email}
                                                onChange={(e) =>
                                                    setParticipant((p) => ({ ...p, email: e.target.value }))
                                                }
                                                placeholder="e.g. yourname@gmail.com"
                                                className="w-full border-2 border-slate-900 bg-white px-3 py-2.5 font-mono text-xs focus:border-sky-500 focus:outline-none"
                                            />
                                            <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                                                Used to link your answers and access your score card later.
                                            </span>
                                        </div>

                                        <div>
                                            <label className="mb-1 block font-mono text-xs font-bold text-slate-700 uppercase">
                                                Full Name <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={participant.name}
                                                onChange={(e) =>
                                                    setParticipant((p) => ({ ...p, name: e.target.value }))
                                                }
                                                placeholder="e.g. Ratheeswar S"
                                                className="w-full border-2 border-slate-900 bg-white px-3 py-2.5 font-mono text-xs focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-bold text-slate-700 uppercase">
                                            College Roll No / Register No{' '}
                                            <span className="text-slate-500">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={participant.rollNo}
                                            onChange={(e) =>
                                                setParticipant((p) => ({ ...p, rollNo: e.target.value }))
                                            }
                                            placeholder="e.g. 715526104001"
                                            className="w-full border-2 border-slate-900 bg-white px-3 py-2.5 font-mono text-xs focus:border-sky-500 focus:outline-none sm:w-1/2"
                                        />
                                    </div>

                                    {/* Rules notice */}
                                    <div className="space-y-1 border-2 border-slate-900 bg-slate-50 p-4 font-mono text-[11px] text-slate-700">
                                        <span className="block font-black text-slate-900 uppercase">
                                            Assessment Rules:
                                        </span>
                                        <div>
                                            • Once started, a live timer of {quizData.durationMinutes} minutes
                                            will begin.
                                        </div>
                                        <div>• The quiz will auto-submit when the countdown expires.</div>
                                        <div>• Your answers are autosaved as you make your selections.</div>
                                        <div>
                                            • You can check your evaluated score and class ranking once
                                            results are published.
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isStarting || isUpcoming || isEnded}
                                        className="press shadow-brutal-4 flex w-full cursor-pointer items-center justify-center gap-2 border-2 border-slate-900 bg-emerald-400 py-3.5 font-mono text-sm font-black text-slate-900 uppercase hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isStarting ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></span>
                                                <span>Initializing Exam Session...</span>
                                            </>
                                        ) : isUpcoming ? (
                                            <span>Waiting for Scheduled Start Time...</span>
                                        ) : isEnded ? (
                                            <span>Quiz Concluded</span>
                                        ) : (
                                            <span>Enter Quiz & Start Assessment →</span>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* TAB 2: LOOKUP / CHECK RESULTS RETURN FLOW */}
                        {gatekeeperTab === 'lookup' && (
                            <div className="space-y-4">
                                <div className="border-b-2 border-slate-100 pb-2">
                                    <h3 className="font-mono text-sm font-black text-slate-900 uppercase">
                                        Check Your Evaluation Results
                                    </h3>
                                    <p className="font-mono text-xs text-slate-500">
                                        Returning to view your score? Enter the email address you used when
                                        taking this quiz.
                                    </p>
                                </div>

                                {lookupError && (
                                    <div className="border-2 border-rose-500 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-700">
                                        ⚠️ {lookupError}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block font-mono text-xs font-bold text-slate-700 uppercase">
                                        Registered Email Address
                                    </label>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="email"
                                            value={lookupEmail}
                                            onChange={(e) => setLookupEmail(e.target.value)}
                                            placeholder="Enter your registered email"
                                            className="flex-1 border-2 border-slate-900 bg-white px-3 py-2.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => performLookup(lookupEmail)}
                                            disabled={isLookingUp}
                                            className="press shadow-brutal-2 flex shrink-0 cursor-pointer items-center justify-center gap-2 border-2 border-slate-900 bg-emerald-400 px-6 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300 disabled:opacity-50"
                                        >
                                            {isLookingUp ? (
                                                <>
                                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></span>
                                                    <span>Checking...</span>
                                                </>
                                            ) : (
                                                <span>Check Result →</span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 border-2 border-slate-900 bg-sky-50 p-4 font-mono text-xs">
                                    <span className="block font-bold text-sky-900 uppercase">
                                        💡 How Evaluation Publishing Works:
                                    </span>
                                    <p className="text-slate-700">
                                        All participant submissions are automatically evaluated on the server.
                                        If the admin has scheduled results for a future date, this page will
                                        show confirmation of your submission along with a live countdown clock
                                        to the reveal time!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: VIEW 2 - ACTIVE EXAM MODE
    // -------------------------------------------------------------
    if (viewMode === 'exam') {
        const isTimerUrgent = remainingSeconds <= 120; // under 2 mins

        return (
            <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 select-none">
                {/* Floating Top HUD */}
                <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b-4 border-slate-900 bg-white px-3 py-2.5 sm:flex-nowrap sm:gap-4 sm:px-8 sm:py-3">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 px-2 py-0.5 font-mono text-xs font-black text-white uppercase">
                            Q {currentQIndex + 1} / {totalQuestionsCount}
                        </span>
                        <div className="hidden md:block">
                            <h2 className="max-w-xs truncate text-xs font-black text-slate-900 uppercase">
                                {quizData.title}
                            </h2>
                            <span className="font-mono text-[10px] text-slate-500">
                                Candidate: {participant.name} ({participant.email})
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Live Timer */}
                        <div
                            className={`shadow-brutal-2 flex items-center gap-1.5 border-2 border-slate-900 px-2.5 py-1.5 font-mono text-sm font-black sm:gap-2 sm:px-4 sm:text-base ${
                                isTimerUrgent
                                    ? 'animate-pulse bg-rose-500 text-white'
                                    : 'bg-amber-300 text-slate-900'
                            }`}
                        >
                            <span>⏱</span>
                            <span>{formatTime(remainingSeconds)}</span>
                        </div>

                        {/* Question Palette Drawer toggle */}
                        <button
                            type="button"
                            onClick={() => setShowPaletteDrawer(!showPaletteDrawer)}
                            className="press shadow-brutal-2 tap-sq cursor-pointer border-2 border-slate-900 bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-200 sm:px-3"
                            title="View all questions palette"
                        >
                            📋 {answeredCount}/{totalQuestionsCount}
                        </button>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(true)}
                            className="press shadow-brutal-2 tap-sq cursor-pointer border-2 border-slate-900 bg-emerald-400 px-2.5 py-1.5 font-mono text-xs font-black uppercase hover:bg-emerald-300 sm:px-4"
                        >
                            <span className="hidden sm:inline">Finish Exam </span>✓
                        </button>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8 md:flex-row">
                    {/* Collapsible / Desktop Question Navigator Palette */}
                    <div
                        className={`${showPaletteDrawer ? 'block' : 'hidden md:block'} shadow-brutal-6 h-fit w-full flex-shrink-0 space-y-4 border-4 border-slate-900 bg-white p-4 md:w-64`}
                    >
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                            <span className="font-mono text-xs font-black text-slate-900 uppercase">
                                Question Palette
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                                {answeredCount} Answered
                            </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                            {questions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined;
                                const isCurrent = idx === currentQIndex;

                                return (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => {
                                            setCurrentQIndex(idx);
                                            setShowPaletteDrawer(false);
                                        }}
                                        className={`press cursor-pointer border-2 border-slate-900 py-2 text-center font-black transition-all ${
                                            isCurrent
                                                ? 'shadow-brutal-2 bg-sky-400 text-slate-900 ring-2 ring-sky-500 ring-offset-1'
                                                : isAnswered
                                                  ? 'bg-emerald-300 text-slate-900'
                                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-1 border-t border-slate-200 pt-2 font-mono text-[10px]">
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 border border-slate-900 bg-emerald-300"></span>
                                <span>Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 border border-slate-900 bg-slate-50"></span>
                                <span>Unanswered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block h-3 w-3 border border-slate-900 bg-sky-400"></span>
                                <span>Current</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Question Workspace */}
                    <div className="shadow-brutal-6 flex flex-1 flex-col justify-between border-4 border-slate-900 bg-white p-6 sm:p-8">
                        {currentQ ? (
                            <div className="space-y-6">
                                {/* Question Title Bar */}
                                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                                    <span className="font-mono text-xs font-black text-slate-500 uppercase">
                                        Question {currentQIndex + 1} of {totalQuestionsCount}
                                    </span>
                                    <span className="border border-sky-400 bg-sky-100 px-2.5 py-1 font-mono text-xs font-black text-sky-800">
                                        +{currentQ.points || 1} {currentQ.points === 1 ? 'Point' : 'Points'}
                                    </span>
                                </div>

                                {/* Question Text */}
                                <div className="text-base leading-relaxed font-bold whitespace-pre-wrap text-slate-900 sm:text-lg">
                                    {currentQ.questionText}
                                </div>

                                {/* MCQ Options */}
                                <div className="space-y-3 pt-2">
                                    {currentQ.options?.map((opt, optIdx) => {
                                        const isSelected = answers[currentQ.id] === optIdx;
                                        const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

                                        return (
                                            <button
                                                key={optIdx}
                                                type="button"
                                                onClick={() => handleSelectOption(currentQ.id, optIdx)}
                                                className={`press flex w-full cursor-pointer items-start gap-3.5 border-2 border-slate-900 p-4 text-left font-mono text-xs transition-all sm:text-sm ${
                                                    isSelected
                                                        ? 'shadow-brutal-3 translate-x-1 bg-emerald-300 font-black text-slate-900'
                                                        : 'bg-slate-50 font-bold text-slate-800 hover:bg-sky-50'
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-xs font-black ${
                                                        isSelected
                                                            ? 'bg-slate-900 text-white'
                                                            : 'bg-white text-slate-900'
                                                    }`}
                                                >
                                                    {optionLetter}
                                                </span>
                                                <span className="flex-1 pt-0.5 leading-normal">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center font-mono font-bold text-slate-500">
                                No questions available.
                            </div>
                        )}

                        {/* Navigation controls footer */}
                        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-200 pt-6">
                            <button
                                type="button"
                                disabled={currentQIndex === 0}
                                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                                className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-100 px-4 py-2 font-mono text-xs font-black uppercase hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                ← Previous
                            </button>

                            {answers[currentQ?.id] !== undefined && (
                                <button
                                    type="button"
                                    onClick={() => handleClearOption(currentQ?.id)}
                                    className="press press-flat cursor-pointer font-mono text-xs font-bold text-rose-600 hover:text-rose-800"
                                >
                                    Clear Selection ✕
                                </button>
                            )}

                            {currentQIndex < totalQuestionsCount - 1 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentQIndex((prev) =>
                                            Math.min(totalQuestionsCount - 1, prev + 1)
                                        )
                                    }
                                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-400 px-5 py-2 font-mono text-xs font-black uppercase hover:bg-sky-300"
                                >
                                    Next Question →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(true)}
                                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-emerald-400 px-5 py-2 font-mono text-xs font-black uppercase hover:bg-emerald-300"
                                >
                                    Submit Exam ✓
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Confirmation Modal */}
                {showConfirmModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm"
                        data-lenis-prevent
                    >
                        <div className="shadow-brutal-8 my-auto w-full max-w-md space-y-4 border-4 border-slate-900 bg-white p-6 font-mono">
                            <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                                <span className="text-xl">🏁</span>
                                <h3 className="text-base font-black text-slate-900 uppercase">
                                    Ready to Finish Quiz?
                                </h3>
                            </div>

                            <div className="space-y-2 text-xs font-bold text-slate-700">
                                <div className="space-y-1 border-2 border-slate-900 bg-slate-50 p-3">
                                    <div className="flex justify-between">
                                        <span>Total Questions:</span>
                                        <span className="font-black">{totalQuestionsCount}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-700">
                                        <span>Answered:</span>
                                        <span className="font-black">{answeredCount}</span>
                                    </div>
                                    <div className="flex justify-between text-rose-700">
                                        <span>Unanswered:</span>
                                        <span className="font-black">
                                            {totalQuestionsCount - answeredCount}
                                        </span>
                                    </div>
                                </div>

                                {totalQuestionsCount - answeredCount > 0 && (
                                    <p className="border border-amber-300 bg-amber-50 p-2.5 text-amber-800">
                                        ⚠️ You have {totalQuestionsCount - answeredCount} unanswered
                                        question(s). You can still review them before final submission.
                                    </p>
                                )}

                                <p className="text-[11px] text-slate-500">
                                    Once submitted, your answers will be securely sealed on the server and
                                    evaluated.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="press shadow-brutal-2 flex-1 cursor-pointer border-2 border-slate-900 bg-slate-100 py-2.5 font-mono text-xs font-black uppercase hover:bg-slate-200"
                                >
                                    Review Questions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submitExamAction()}
                                    disabled={isSubmittingExam}
                                    className="press shadow-brutal-2 flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-emerald-400 py-2.5 font-mono text-xs font-black uppercase hover:bg-emerald-300"
                                >
                                    {isSubmittingExam ? (
                                        <>
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent"></span>
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <span>Confirm Submit ✓</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: VIEW 3 - SUBMITTED & RESULTS SCHEDULED (RETURN LATER)
    // -------------------------------------------------------------
    if (viewMode === 'submitted') {
        return (
            <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
                {/* Header */}
                <header className="sticky top-0 z-40 flex items-center justify-between border-b-4 border-slate-900 bg-white px-4 py-3.5 sm:px-8">
                    <span className="bg-slate-900 px-2.5 py-1 font-mono text-xs font-black text-white uppercase">
                        ASTERIX ASSESSMENT SYSTEM
                    </span>
                    <button
                        onClick={
                            onBack ||
                            (() => {
                                window.location.hash = '';
                            })
                        }
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-100 px-3.5 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-200"
                    >
                        Homepage →
                    </button>
                </header>

                <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center p-4 sm:p-8">
                    <div className="shadow-brutal-8 w-full space-y-6 border-4 border-slate-900 bg-white p-6 text-center font-mono sm:p-10">
                        <div className="shadow-brutal-3 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-900 bg-emerald-100 text-3xl">
                            🎉
                        </div>

                        <div className="space-y-2">
                            <span className="border border-slate-900 bg-emerald-200 px-3 py-1 text-xs font-black tracking-wider text-slate-900 uppercase">
                                Responses Recorded Successfully
                            </span>
                            <h2 className="pt-1 text-2xl font-black text-slate-900 uppercase sm:text-3xl">
                                Assessment Submitted!
                            </h2>
                            <p className="mx-auto max-w-lg text-xs font-bold text-slate-600">
                                Thank you,{' '}
                                <strong className="text-slate-900">
                                    {resultData?.userName || participant.name}
                                </strong>
                                . Your answers have been safely received and stored on the server.
                            </p>
                        </div>

                        {/* Scheduled Results Reveal Card */}
                        <div className="shadow-brutal-4 space-y-4 border-3 border-slate-900 bg-amber-50 p-6">
                            <div className="text-xs font-black tracking-wider text-amber-900 uppercase">
                                🔒 Evaluation Results Under Lock
                            </div>
                            <p className="text-xs text-slate-700">
                                As specified by the instructor, scores, ranks, and full answer sheets are
                                scheduled to unlock on:
                            </p>
                            <div className="inline-block border-2 border-slate-900 bg-white p-3">
                                <span className="text-sm font-black text-slate-900 sm:text-base">
                                    {resultData?.resultsPublishTime
                                        ? new Date(resultData.resultsPublishTime).toLocaleString('en-IN', {
                                              dateStyle: 'full',
                                              timeStyle: 'short'
                                          })
                                        : 'Scheduled Date'}
                                </span>
                            </div>

                            {timeUntilPublish && (
                                <div className="pt-1">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                        Results Unlock in:
                                    </span>
                                    <span className="text-xl font-black tracking-wider text-slate-900 sm:text-2xl">
                                        {timeUntilPublish}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Instructions to Return Later */}
                        <div className="space-y-3 border-2 border-slate-900 bg-sky-50 p-5 text-left text-xs">
                            <div className="flex items-center gap-2 font-black text-sky-900 uppercase">
                                <span>📌</span>
                                <span>How to Check Back for Your Score:</span>
                            </div>
                            <ol className="list-inside list-decimal space-y-1.5 font-bold text-slate-700">
                                <li>Bookmark this exact URL link in your browser.</li>
                                <li>Revisit this link after the scheduled reveal time above.</li>
                                <li>
                                    Click <strong>&quot;Check Results&quot;</strong> and enter your email (
                                    <strong className="text-slate-900">
                                        {resultData?.userEmail || participant.email}
                                    </strong>
                                    ).
                                </li>
                                <li>
                                    Your evaluated scorecard, class rank, and answer key breakdown will
                                    automatically be revealed!
                                </li>
                            </ol>
                        </div>

                        {/* Link Copy Box */}
                        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={copyJoinLink}
                                className="press shadow-brutal-2 flex-1 cursor-pointer border-2 border-slate-900 bg-sky-400 py-3 text-xs font-black uppercase hover:bg-sky-300"
                            >
                                {copySuccess
                                    ? '✓ Link Copied to Clipboard!'
                                    : '📋 Copy This Quiz Link to Bookmark'}
                            </button>
                            <button
                                type="button"
                                onClick={
                                    onBack ||
                                    (() => {
                                        window.location.hash = '';
                                    })
                                }
                                className="press shadow-brutal-2 cursor-pointer bg-slate-900 px-6 py-3 text-xs font-black text-white uppercase hover:bg-slate-800"
                            >
                                Exit to Homepage →
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // -------------------------------------------------------------
    // RENDER: VIEW 4 - EVALUATION SCORECARD & DETAILED REVIEW
    // -------------------------------------------------------------
    if (viewMode === 'results') {
        const isPassed = resultData.passed;

        return (
            <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
                {/* Top header */}
                <header className="sticky top-0 z-40 flex items-center justify-between border-b-4 border-slate-900 bg-white px-4 py-3.5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 px-2.5 py-1 font-mono text-xs font-black text-white uppercase">
                            ASTERIX SCORECARD
                        </span>
                        <span className="hidden font-mono text-xs font-bold text-slate-500 sm:inline">
                            Verified Candidate Evaluation
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="press shadow-brutal-2 hidden cursor-pointer border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-200 sm:inline-block"
                        >
                            🖨 Print / PDF
                        </button>
                        <button
                            type="button"
                            onClick={
                                onBack ||
                                (() => {
                                    window.location.hash = '';
                                })
                            }
                            className="press shadow-brutal-2 cursor-pointer bg-slate-900 px-3.5 py-1.5 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                        >
                            ← Home
                        </button>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 sm:p-8">
                    {/* Grand Score Hero Card */}
                    <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                            <div>
                                <span className="font-mono text-xs font-black text-slate-500 uppercase">
                                    Official Evaluation Certificate
                                </span>
                                <h1 className="text-xl font-black text-slate-900 uppercase sm:text-3xl">
                                    {quizData.title}
                                </h1>
                            </div>

                            <span
                                className={`shadow-brutal-2 border-2 border-slate-900 px-4 py-1.5 font-mono text-xs font-black uppercase ${
                                    isPassed ? 'bg-emerald-300 text-slate-900' : 'bg-rose-200 text-rose-900'
                                }`}
                            >
                                {isPassed ? '✓ PASSED' : 'COMPLETED'}
                            </span>
                        </div>

                        {/* Candidate Identity Block */}
                        <div className="mt-4 grid grid-cols-1 gap-2 border-2 border-slate-900 bg-slate-50 p-4 font-mono text-xs sm:grid-cols-3">
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Participant
                                </span>
                                <span className="text-sm font-black text-slate-900">
                                    {resultData.userName}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Registered Email
                                </span>
                                <span className="font-bold text-slate-900">{resultData.userEmail}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Roll Number
                                </span>
                                <span className="font-bold text-slate-900">{resultData.rollNo || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="mt-6 grid grid-cols-2 gap-3 font-mono sm:grid-cols-4">
                            <div className="shadow-brutal-3 border-2 border-slate-900 bg-emerald-50 p-4">
                                <span className="block text-[10px] font-black text-emerald-700 uppercase">
                                    Score Earned
                                </span>
                                <div className="text-2xl font-black text-slate-900 sm:text-3xl">
                                    {resultData.score}
                                    <span className="text-xs text-slate-500"> / {resultData.maxScore}</span>
                                </div>
                            </div>

                            <div className="shadow-brutal-3 border-2 border-slate-900 bg-sky-50 p-4">
                                <span className="block text-[10px] font-black text-sky-700 uppercase">
                                    Percentage
                                </span>
                                <div className="text-2xl font-black text-slate-900 sm:text-3xl">
                                    {resultData.percentage}%
                                </div>
                            </div>

                            <div className="shadow-brutal-3 border-2 border-slate-900 bg-amber-50 p-4">
                                <span className="block text-[10px] font-black text-amber-700 uppercase">
                                    Class Rank
                                </span>
                                <div className="text-2xl font-black text-slate-900 sm:text-3xl">
                                    #{resultData.rank || 1}
                                    <span className="text-xs font-bold text-slate-500">
                                        {' '}
                                        of {resultData.totalParticipants || 1}
                                    </span>
                                </div>
                            </div>

                            <div className="shadow-brutal-3 border-2 border-slate-900 bg-indigo-50 p-4">
                                <span className="block text-[10px] font-black text-indigo-700 uppercase">
                                    Time Taken
                                </span>
                                <div className="pt-1 text-xl font-black text-slate-900 sm:text-2xl">
                                    {Math.round(((resultData.timeSpentSeconds || 0) / 60) * 10) / 10}{' '}
                                    <span className="text-xs">mins</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question-by-Question Review Breakdown */}
                    <div className="shadow-brutal-8 space-y-6 border-4 border-slate-900 bg-white p-6 sm:p-8">
                        <div className="border-b-2 border-slate-200 pb-3">
                            <h2 className="text-lg font-black text-slate-900 uppercase">
                                Answer Sheet & Solutions Review
                            </h2>
                            <p className="font-mono text-xs text-slate-500">
                                Review your answers, correct solutions, and instructor explanations below.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {(resultData.answers || []).map((ans, idx) => {
                                const isCorrect = ans.isCorrect;
                                const isSkipped =
                                    ans.selectedOptionIndex === -1 || ans.selectedOptionIndex === undefined;

                                return (
                                    <div
                                        key={ans.questionId || idx}
                                        className={`space-y-4 border-2 border-slate-900 p-5 ${
                                            isCorrect
                                                ? 'bg-emerald-50/40'
                                                : isSkipped
                                                  ? 'bg-slate-50'
                                                  : 'bg-rose-50/40'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                            <span className="font-mono text-xs font-black text-slate-900 uppercase">
                                                Question {idx + 1}
                                            </span>
                                            <div className="flex items-center gap-2 font-mono text-xs">
                                                {isCorrect ? (
                                                    <span className="border border-emerald-500 bg-emerald-200 px-2 py-0.5 font-black text-emerald-900">
                                                        ✓ Correct (+{ans.pointsEarned} pts)
                                                    </span>
                                                ) : isSkipped ? (
                                                    <span className="border border-slate-400 bg-slate-200 px-2 py-0.5 font-black text-slate-700">
                                                        ○ Skipped (0 pts)
                                                    </span>
                                                ) : (
                                                    <span className="border border-rose-500 bg-rose-200 px-2 py-0.5 font-black text-rose-900">
                                                        ✕ Incorrect (0 pts)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-sm font-bold whitespace-pre-wrap text-slate-900">
                                            {ans.questionText}
                                        </p>

                                        {/* Options breakdown */}
                                        <div className="space-y-2 font-mono text-xs">
                                            {ans.options?.map((opt, optIdx) => {
                                                const isCandidateChoice = ans.selectedOptionIndex === optIdx;
                                                const isActuallyCorrect = ans.correctOptionIndex === optIdx;
                                                const optionLetter = String.fromCharCode(65 + optIdx);

                                                let cardStyle = 'bg-white border-slate-300 text-slate-700';
                                                if (isActuallyCorrect) {
                                                    cardStyle =
                                                        'bg-emerald-200 border-slate-900 text-slate-900 font-black shadow-brutal-2';
                                                } else if (isCandidateChoice && !isActuallyCorrect) {
                                                    cardStyle =
                                                        'bg-rose-200 border-slate-900 text-rose-900 font-bold';
                                                }

                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`flex items-start justify-between gap-2 border-2 p-3 ${cardStyle}`}
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-900 bg-white text-[10px] font-bold text-slate-900">
                                                                {optionLetter}
                                                            </span>
                                                            <span className="pt-0.5">{opt}</span>
                                                        </div>

                                                        <div className="shrink-0 text-[10px] font-black uppercase">
                                                            {isCandidateChoice && isActuallyCorrect && (
                                                                <span className="text-emerald-900">
                                                                    Your Answer (✓ Correct)
                                                                </span>
                                                            )}
                                                            {isCandidateChoice && !isActuallyCorrect && (
                                                                <span className="text-rose-900">
                                                                    Your Answer (✕ Wrong)
                                                                </span>
                                                            )}
                                                            {!isCandidateChoice && isActuallyCorrect && (
                                                                <span className="text-emerald-900">
                                                                    ✓ Correct Answer
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Instructor Explanation */}
                                        {ans.explanation && (
                                            <div className="space-y-1 border-2 border-slate-900 bg-amber-50 p-3.5 font-mono text-xs">
                                                <span className="block font-black text-amber-900 uppercase">
                                                    💡 Instructor Explanation:
                                                </span>
                                                <p className="leading-relaxed text-slate-800">
                                                    {ans.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return null;
}
