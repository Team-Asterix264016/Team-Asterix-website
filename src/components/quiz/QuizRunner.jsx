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
            return JSON.parse(sessionStorage.getItem('asterix_quiz_attendee')) || {
                name: '',
                email: '',
                rollNo: ''
            };
        } catch {
            return { name: '', email: '', rollNo: '' };
        }
    });
    const [gatekeeperError, setGatekeeperError] = useState('');
    const [isStarting, setIsStarting] = useState(false);

    // Lookup / Return flow state
    const [lookupEmail, setLookupEmail] = useState('');
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState('');

    // Active Exam state
    const [submissionId, setSubmissionId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { [questionId]: selectedOptionIndex }
    const [remainingSeconds, setRemainingSeconds] = useState(0);
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
    const performLookup = useCallback(async (emailToSearch) => {
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
    }, [lookupEmail, quizIdOrSlug]);

    // -------------------------------------------------------------
    // 2. Exam Timer Countdown & Auto-Submit
    // -------------------------------------------------------------
    const answersRef = useRef(answers);
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const submitExamAction = useCallback(async (forcedAnswers = null) => {
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
    }, [submissionId, quizIdOrSlug, participant.email, quizData, performLookup]);

    // -------------------------------------------------------------
    // 5. Option Selection & Local Draft Save
    // -------------------------------------------------------------
    const handleSelectOption = (questionId, optionIndex) => {
        setAnswers(prev => {
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
        setAnswers(prev => {
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
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-900 font-mono">
                <div className="p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-slate-900 border-t-sky-500 rounded-full animate-spin mx-auto"></div>
                    <h2 className="text-xl font-black uppercase">Loading Quiz System...</h2>
                    <p className="text-xs text-slate-600">Connecting to Asterix Secure Assessment Engine</p>
                </div>
            </div>
        );
    }

    if (fetchError || !quizData) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-900 font-mono">
                <div className="p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] max-w-lg w-full space-y-4">
                    <div className="flex items-center gap-3 text-rose-600">
                        <span className="text-2xl">⚠️</span>
                        <h2 className="text-xl font-black uppercase">Quiz Unavailable</h2>
                    </div>
                    <p className="text-sm font-bold text-slate-700 bg-rose-50 p-4 border-2 border-rose-300">
                        {fetchError || 'Quiz could not be found or has been removed.'}
                    </p>
                    <div className="pt-2 flex gap-3">
                        <button
                            onClick={onBack || (() => { window.location.hash = ''; })}
                            className="press flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase shadow-[3px_3px_0px_#0f172a] cursor-pointer"
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
            <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
                {/* Header bar */}
                <header className="sticky top-0 z-40 bg-white border-b-4 border-slate-900 px-4 sm:px-8 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-black text-xs tracking-wider uppercase">
                            ASTERIX MCQ ENGINE
                        </span>
                        <span className="hidden sm:inline text-xs font-mono font-bold text-slate-500">
                            Assessment Portal
                        </span>
                    </div>

                    <button
                        onClick={onBack || (() => { window.location.hash = ''; })}
                        className="press px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                    >
                        ← Exit
                    </button>
                </header>

                <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
                    {/* Top Quiz Banner */}
                    <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="font-mono text-xs font-black uppercase text-slate-600">
                                    Track Assessment
                                </span>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs">
                                {isUpcoming && (
                                    <span className="px-3 py-1 bg-amber-100 border border-amber-500 text-amber-800 font-black uppercase">
                                        ⏱ Starts In {timeUntilStart || 'Shortly'}
                                    </span>
                                )}
                                {isActive && (
                                    <span className="px-3 py-1 bg-emerald-100 border border-emerald-500 text-emerald-800 font-black uppercase animate-pulse">
                                        ● Live Exam Active
                                    </span>
                                )}
                                {isEnded && (
                                    <span className="px-3 py-1 bg-slate-200 border border-slate-500 text-slate-700 font-black uppercase">
                                        Exam Concluded
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <h1 className="text-2xl sm:text-4xl font-black uppercase text-slate-900 leading-tight">
                                {quizData.title}
                            </h1>
                            {quizData.description && (
                                <p className="text-sm sm:text-base font-medium text-slate-600">
                                    {quizData.description}
                                </p>
                            )}
                        </div>

                        {/* Quiz Quick Specs */}
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                            <div className="p-3 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Duration</span>
                                <span className="text-base font-black text-slate-900">{quizData.durationMinutes} Mins</span>
                            </div>
                            <div className="p-3 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Questions</span>
                                <span className="text-base font-black text-slate-900">{quizData.questionCount} MCQs</span>
                            </div>
                            <div className="p-3 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Points</span>
                                <span className="text-base font-black text-slate-900">{quizData.totalPoints} Pts</span>
                            </div>
                            <div className="p-3 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                                <span className="text-[10px] text-slate-500 uppercase block font-bold">Pass Requirement</span>
                                <span className="text-base font-black text-slate-900">{quizData.passingPercentage}%</span>
                            </div>
                        </div>

                        {/* Schedule & Results Timings info */}
                        <div className="mt-4 p-4 bg-sky-50 border-2 border-slate-900 font-mono text-xs space-y-1.5">
                            <div className="flex flex-wrap justify-between gap-1">
                                <span className="font-bold text-slate-600">Exam Window:</span>
                                <span className="font-black text-slate-900">
                                    {new Date(quizData.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    {' '}—{' '}
                                    {new Date(quizData.endTime).toLocaleString('en-IN', { timeStyle: 'short' })}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-1 border-t border-sky-200 pt-1.5">
                                <span className="font-bold text-sky-800">Results Publishing Date & Time:</span>
                                <span className="font-black text-sky-900">
                                    {new Date(quizData.resultsPublishTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dual-Tab Action Area: Attend Exam OR Check Results */}
                    <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-6 sm:p-8">
                        <div className="flex border-b-2 border-slate-900 mb-6">
                            <button
                                type="button"
                                onClick={() => setGatekeeperTab('enter')}
                                className={`flex-1 py-3 font-mono font-black text-xs uppercase cursor-pointer border-r-2 border-slate-900 transition-colors ${gatekeeperTab === 'enter'
                                    ? 'bg-sky-400 text-slate-900'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                            >
                                ✍ Attend Quiz (Live)
                            </button>
                            <button
                                type="button"
                                onClick={() => setGatekeeperTab('lookup')}
                                className={`flex-1 py-3 font-mono font-black text-xs uppercase cursor-pointer transition-colors ${gatekeeperTab === 'lookup'
                                    ? 'bg-emerald-400 text-slate-900'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                            >
                                🔍 Check Results / Return Later
                            </button>
                        </div>

                        {/* TAB 1: ATTEND EXAM */}
                        {gatekeeperTab === 'enter' && (
                            <div>
                                {isUpcoming ? (
                                    <div className="p-6 bg-amber-50 border-2 border-amber-400 text-center space-y-3 font-mono">
                                        <div className="text-3xl">⏱</div>
                                        <h3 className="text-lg font-black uppercase text-amber-900">Quiz Has Not Started Yet</h3>
                                        <p className="text-xs font-bold text-amber-800">
                                            The exam will open at {new Date(quizData.startTime).toLocaleString('en-IN')}.
                                        </p>
                                        <div className="p-4 bg-white border-2 border-slate-900 inline-block">
                                            <span className="text-xs text-slate-500 font-bold uppercase block">Opens in:</span>
                                            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wider">
                                                {timeUntilStart || 'Shortly...'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 pt-2">
                                            This page will automatically allow entry once the timer expires. You may enter your details below in advance.
                                        </p>
                                    </div>
                                ) : isEnded ? (
                                    <div className="p-6 bg-slate-100 border-2 border-slate-400 text-center space-y-3 font-mono">
                                        <div className="text-3xl">🏁</div>
                                        <h3 className="text-lg font-black uppercase text-slate-800">Exam Window Concluded</h3>
                                        <p className="text-xs font-bold text-slate-600">
                                            The scheduled examination window for this quiz has ended.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setGatekeeperTab('lookup')}
                                            className="press px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 text-slate-900 font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#0f172a] cursor-pointer"
                                        >
                                            Check Your Evaluation Scorecard →
                                        </button>
                                    </div>
                                ) : null}

                                <form onSubmit={handleStartQuiz} className="space-y-4 mt-6">
                                    <div className="border-b-2 border-slate-100 pb-2">
                                        <h3 className="font-mono text-sm font-black uppercase text-slate-900">
                                            Participant Verification
                                        </h3>
                                        <p className="font-mono text-xs text-slate-500">
                                            Enter your details to track your attendance and calculate your score.
                                        </p>
                                    </div>

                                    {gatekeeperError && (
                                        <div className="p-3 bg-rose-50 border-2 border-rose-500 text-rose-700 font-mono font-bold text-xs">
                                            ⚠️ {gatekeeperError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-mono text-xs font-bold uppercase text-slate-700 mb-1">
                                                Email Address <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={participant.email}
                                                onChange={e => setParticipant(p => ({ ...p, email: e.target.value }))}
                                                placeholder="e.g. yourname@gmail.com"
                                                className="w-full px-3 py-2.5 border-2 border-slate-900 bg-white font-mono text-xs focus:outline-none focus:border-sky-500"
                                            />
                                            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                                                Used to link your answers and access your score card later.
                                            </span>
                                        </div>

                                        <div>
                                            <label className="block font-mono text-xs font-bold uppercase text-slate-700 mb-1">
                                                Full Name <span className="text-rose-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={participant.name}
                                                onChange={e => setParticipant(p => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g. Ratheeswar S"
                                                className="w-full px-3 py-2.5 border-2 border-slate-900 bg-white font-mono text-xs focus:outline-none focus:border-sky-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-mono text-xs font-bold uppercase text-slate-700 mb-1">
                                            College Roll No / Register No <span className="text-slate-400">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={participant.rollNo}
                                            onChange={e => setParticipant(p => ({ ...p, rollNo: e.target.value }))}
                                            placeholder="e.g. 715526104001"
                                            className="w-full sm:w-1/2 px-3 py-2.5 border-2 border-slate-900 bg-white font-mono text-xs focus:outline-none focus:border-sky-500"
                                        />
                                    </div>

                                    {/* Rules notice */}
                                    <div className="p-4 bg-slate-50 border-2 border-slate-900 font-mono text-[11px] text-slate-700 space-y-1">
                                        <span className="font-black text-slate-900 uppercase block">Assessment Rules:</span>
                                        <div>• Once started, a live timer of {quizData.durationMinutes} minutes will begin.</div>
                                        <div>• The quiz will auto-submit when the countdown expires.</div>
                                        <div>• Your answers are autosaved as you make your selections.</div>
                                        <div>• You can check your evaluated score and class ranking once results are published.</div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isStarting || isUpcoming || isEnded}
                                        className="press w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-slate-900 text-slate-900 font-mono font-black text-sm uppercase shadow-[4px_4px_0px_#0f172a] cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {isStarting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
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
                                    <h3 className="font-mono text-sm font-black uppercase text-slate-900">
                                        Check Your Evaluation Results
                                    </h3>
                                    <p className="font-mono text-xs text-slate-500">
                                        Returning to view your score? Enter the email address you used when taking this quiz.
                                    </p>
                                </div>

                                {lookupError && (
                                    <div className="p-3 bg-rose-50 border-2 border-rose-500 text-rose-700 font-mono font-bold text-xs">
                                        ⚠️ {lookupError}
                                    </div>
                                )}

                                <div>
                                    <label className="block font-mono text-xs font-bold uppercase text-slate-700 mb-1">
                                        Registered Email Address
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="email"
                                            value={lookupEmail}
                                            onChange={e => setLookupEmail(e.target.value)}
                                            placeholder="Enter your registered email"
                                            className="flex-1 px-3 py-2.5 border-2 border-slate-900 bg-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => performLookup(lookupEmail)}
                                            disabled={isLookingUp}
                                            className="press px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 border-2 border-slate-900 text-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer shrink-0 flex items-center justify-center gap-2"
                                        >
                                            {isLookingUp ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                                                    <span>Checking...</span>
                                                </>
                                            ) : (
                                                <span>Check Result →</span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-sky-50 border-2 border-slate-900 font-mono text-xs space-y-1.5">
                                    <span className="font-bold text-sky-900 uppercase block">💡 How Evaluation Publishing Works:</span>
                                    <p className="text-slate-700">
                                        All participant submissions are automatically evaluated on the server. If the admin has scheduled results for a future date, this page will show confirmation of your submission along with a live countdown clock to the reveal time!
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
            <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none">
                {/* Floating Top HUD */}
                <header className="sticky top-0 z-40 bg-white border-b-4 border-slate-900 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-black text-xs uppercase">
                            Q {currentQIndex + 1} / {totalQuestionsCount}
                        </span>
                        <div className="hidden md:block">
                            <h2 className="font-black text-xs uppercase text-slate-900 truncate max-w-xs">
                                {quizData.title}
                            </h2>
                            <span className="text-[10px] font-mono text-slate-500">
                                Candidate: {participant.name} ({participant.email})
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Timer */}
                        <div className={`px-4 py-1.5 border-2 border-slate-900 font-mono font-black text-sm sm:text-base flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${isTimerUrgent
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-amber-300 text-slate-900'
                            }`}>
                            <span>⏱</span>
                            <span>{formatTime(remainingSeconds)}</span>
                        </div>

                        {/* Question Palette Drawer toggle */}
                        <button
                            type="button"
                            onClick={() => setShowPaletteDrawer(!showPaletteDrawer)}
                            className="press px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                            title="View all questions palette"
                        >
                            📋 {answeredCount}/{totalQuestionsCount}
                        </button>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(true)}
                            className="press px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        >
                            Finish Exam ✓
                        </button>
                    </div>
                </header>

                <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col md:flex-row gap-6">
                    {/* Collapsible / Desktop Question Navigator Palette */}
                    <div className={`${showPaletteDrawer ? 'block' : 'hidden md:block'} w-full md:w-64 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-4 flex-shrink-0 h-fit space-y-4`}>
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                            <span className="font-mono text-xs font-black uppercase text-slate-900">
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
                                        className={`press py-2 font-black border-2 border-slate-900 text-center cursor-pointer transition-all ${isCurrent
                                            ? 'ring-2 ring-sky-500 ring-offset-1 bg-sky-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                            : isAnswered
                                                ? 'bg-emerald-300 text-slate-900'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-2 border-t border-slate-200 font-mono text-[10px] space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-emerald-300 border border-slate-900 inline-block"></span>
                                <span>Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-slate-50 border border-slate-900 inline-block"></span>
                                <span>Unanswered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-sky-400 border border-slate-900 inline-block"></span>
                                <span>Current</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Question Workspace */}
                    <div className="flex-1 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-6 sm:p-8 flex flex-col justify-between">
                        {currentQ ? (
                            <div className="space-y-6">
                                {/* Question Title Bar */}
                                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                                    <span className="font-mono text-xs font-black uppercase text-slate-500">
                                        Question {currentQIndex + 1} of {totalQuestionsCount}
                                    </span>
                                    <span className="font-mono text-xs font-black px-2.5 py-1 bg-sky-100 border border-sky-400 text-sky-800">
                                        +{currentQ.points || 1} {currentQ.points === 1 ? 'Point' : 'Points'}
                                    </span>
                                </div>

                                {/* Question Text */}
                                <div className="text-base sm:text-lg font-bold text-slate-900 whitespace-pre-wrap leading-relaxed">
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
                                                className={`press w-full p-4 border-2 border-slate-900 text-left font-mono text-xs sm:text-sm flex items-start gap-3.5 cursor-pointer transition-all ${isSelected
                                                    ? 'bg-emerald-300 text-slate-900 font-black shadow-[3px_3px_0px_#0f172a] translate-x-1'
                                                    : 'bg-slate-50 hover:bg-sky-50 text-slate-800 font-bold'
                                                    }`}
                                            >
                                                <span className={`w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                                                    }`}>
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
                        <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                disabled={currentQIndex === 0}
                                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                                className="press px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                            >
                                ← Previous
                            </button>

                            {answers[currentQ?.id] !== undefined && (
                                <button
                                    type="button"
                                    onClick={() => handleClearOption(currentQ?.id)}
                                    className="press press-flat font-mono text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                                >
                                    Clear Selection ✕
                                </button>
                            )}

                            {currentQIndex < totalQuestionsCount - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentQIndex(prev => Math.min(totalQuestionsCount - 1, prev + 1))}
                                    className="press px-5 py-2 bg-sky-400 hover:bg-sky-300 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                                >
                                    Next Question →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(true)}
                                    className="press px-5 py-2 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                                >
                                    Submit Exam ✓
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] max-w-md w-full p-6 space-y-4 font-mono">
                            <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                                <span className="text-xl">🏁</span>
                                <h3 className="text-base font-black uppercase text-slate-900">
                                    Ready to Finish Quiz?
                                </h3>
                            </div>

                            <div className="space-y-2 text-xs font-bold text-slate-700">
                                <div className="p-3 bg-slate-50 border-2 border-slate-900 space-y-1">
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
                                        <span className="font-black">{totalQuestionsCount - answeredCount}</span>
                                    </div>
                                </div>

                                {totalQuestionsCount - answeredCount > 0 && (
                                    <p className="text-amber-800 bg-amber-50 p-2.5 border border-amber-300">
                                        ⚠️ You have {totalQuestionsCount - answeredCount} unanswered question(s). You can still review them before final submission.
                                    </p>
                                )}

                                <p className="text-slate-500 text-[11px]">
                                    Once submitted, your answers will be securely sealed on the server and evaluated.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="press flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                                >
                                    Review Questions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submitExamAction()}
                                    disabled={isSubmittingExam}
                                    className="press flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    {isSubmittingExam ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
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
            <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-white border-b-4 border-slate-900 px-4 sm:px-8 py-3.5 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-black text-xs uppercase">
                        ASTERIX ASSESSMENT SYSTEM
                    </span>
                    <button
                        onClick={onBack || (() => { window.location.hash = ''; })}
                        className="press px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                    >
                        Homepage →
                    </button>
                </header>

                <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 flex items-center justify-center">
                    <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 sm:p-10 w-full space-y-6 text-center font-mono">
                        <div className="w-16 h-16 bg-emerald-100 border-4 border-slate-900 rounded-full flex items-center justify-center text-3xl mx-auto shadow-[3px_3px_0px_#0f172a]">
                            🎉
                        </div>

                        <div className="space-y-2">
                            <span className="px-3 py-1 bg-emerald-200 border border-slate-900 text-slate-900 font-black text-xs uppercase tracking-wider">
                                Responses Recorded Successfully
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 pt-1">
                                Assessment Submitted!
                            </h2>
                            <p className="text-xs font-bold text-slate-600 max-w-lg mx-auto">
                                Thank you, <strong className="text-slate-900">{resultData?.userName || participant.name}</strong>. Your answers have been safely received and stored on the server.
                            </p>
                        </div>

                        {/* Scheduled Results Reveal Card */}
                        <div className="p-6 bg-amber-50 border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-4">
                            <div className="text-xs font-black uppercase text-amber-900 tracking-wider">
                                🔒 Evaluation Results Under Lock
                            </div>
                            <p className="text-xs text-slate-700">
                                As specified by the instructor, scores, ranks, and full answer sheets are scheduled to unlock on:
                            </p>
                            <div className="p-3 bg-white border-2 border-slate-900 inline-block">
                                <span className="text-sm sm:text-base font-black text-slate-900">
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
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Results Unlock in:</span>
                                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wider">
                                        {timeUntilPublish}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Instructions to Return Later */}
                        <div className="p-5 bg-sky-50 border-2 border-slate-900 text-left space-y-3 text-xs">
                            <div className="flex items-center gap-2 font-black uppercase text-sky-900">
                                <span>📌</span>
                                <span>How to Check Back for Your Score:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 font-bold">
                                <li>Bookmark this exact URL link in your browser.</li>
                                <li>Revisit this link after the scheduled reveal time above.</li>
                                <li>Click <strong>&quot;Check Results&quot;</strong> and enter your email (<strong className="text-slate-900">{resultData?.userEmail || participant.email}</strong>).</li>
                                <li>Your evaluated scorecard, class rank, and answer key breakdown will automatically be revealed!</li>
                            </ol>
                        </div>

                        {/* Link Copy Box */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button
                                type="button"
                                onClick={copyJoinLink}
                                className="press flex-1 py-3 bg-sky-400 hover:bg-sky-300 border-2 border-slate-900 font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                            >
                                {copySuccess ? '✓ Link Copied to Clipboard!' : '📋 Copy This Quiz Link to Bookmark'}
                            </button>
                            <button
                                type="button"
                                onClick={onBack || (() => { window.location.hash = ''; })}
                                className="press px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
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
            <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
                {/* Top header */}
                <header className="sticky top-0 z-40 bg-white border-b-4 border-slate-900 px-4 sm:px-8 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-black text-xs uppercase">
                            ASTERIX SCORECARD
                        </span>
                        <span className="hidden sm:inline font-mono text-xs font-bold text-slate-500">
                            Verified Candidate Evaluation
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="press hidden sm:inline-block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        >
                            🖨 Print / PDF
                        </button>
                        <button
                            type="button"
                            onClick={onBack || (() => { window.location.hash = ''; })}
                            className="press px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        >
                            ← Home
                        </button>
                    </div>
                </header>

                <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
                    {/* Grand Score Hero Card */}
                    <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                            <div>
                                <span className="font-mono text-xs font-black uppercase text-slate-500">
                                    Official Evaluation Certificate
                                </span>
                                <h1 className="text-xl sm:text-3xl font-black uppercase text-slate-900">
                                    {quizData.title}
                                </h1>
                            </div>

                            <span className={`px-4 py-1.5 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] ${isPassed ? 'bg-emerald-300 text-slate-900' : 'bg-rose-200 text-rose-900'
                                }`}>
                                {isPassed ? '✓ PASSED' : 'COMPLETED'}
                            </span>
                        </div>

                        {/* Candidate Identity Block */}
                        <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-900 font-mono text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                                <span className="text-slate-500 uppercase block font-bold text-[10px]">Participant</span>
                                <span className="font-black text-slate-900 text-sm">{resultData.userName}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 uppercase block font-bold text-[10px]">Registered Email</span>
                                <span className="font-bold text-slate-900">{resultData.userEmail}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 uppercase block font-bold text-[10px]">Roll Number</span>
                                <span className="font-bold text-slate-900">{resultData.rollNo || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                            <div className="p-4 bg-emerald-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                <span className="text-[10px] font-black uppercase text-emerald-700 block">Score Earned</span>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                                    {resultData.score}
                                    <span className="text-xs text-slate-500"> / {resultData.maxScore}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-sky-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                <span className="text-[10px] font-black uppercase text-sky-700 block">Percentage</span>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                                    {resultData.percentage}%
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                <span className="text-[10px] font-black uppercase text-amber-700 block">Class Rank</span>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                                    #{resultData.rank || 1}
                                    <span className="text-xs text-slate-500 font-bold"> of {resultData.totalParticipants || 1}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                <span className="text-[10px] font-black uppercase text-indigo-700 block">Time Taken</span>
                                <div className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                                    {Math.round((resultData.timeSpentSeconds || 0) / 60 * 10) / 10} <span className="text-xs">mins</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question-by-Question Review Breakdown */}
                    <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 sm:p-8 space-y-6">
                        <div className="border-b-2 border-slate-200 pb-3">
                            <h2 className="text-lg font-black uppercase text-slate-900">
                                Answer Sheet & Solutions Review
                            </h2>
                            <p className="font-mono text-xs text-slate-500">
                                Review your answers, correct solutions, and instructor explanations below.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {(resultData.answers || []).map((ans, idx) => {
                                const isCorrect = ans.isCorrect;
                                const isSkipped = ans.selectedOptionIndex === -1 || ans.selectedOptionIndex === undefined;

                                return (
                                    <div
                                        key={ans.questionId || idx}
                                        className={`p-5 border-2 border-slate-900 space-y-4 ${isCorrect ? 'bg-emerald-50/40' : isSkipped ? 'bg-slate-50' : 'bg-rose-50/40'
                                            }`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                            <span className="font-mono text-xs font-black uppercase text-slate-900">
                                                Question {idx + 1}
                                            </span>
                                            <div className="flex items-center gap-2 font-mono text-xs">
                                                {isCorrect ? (
                                                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-black border border-emerald-500">
                                                        ✓ Correct (+{ans.pointsEarned} pts)
                                                    </span>
                                                ) : isSkipped ? (
                                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-black border border-slate-400">
                                                        ○ Skipped (0 pts)
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-black border border-rose-500">
                                                        ✕ Incorrect (0 pts)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="font-bold text-slate-900 text-sm whitespace-pre-wrap">
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
                                                    cardStyle = 'bg-emerald-200 border-slate-900 text-slate-900 font-black shadow-[2px_2px_0px_#0f172a]';
                                                } else if (isCandidateChoice && !isActuallyCorrect) {
                                                    cardStyle = 'bg-rose-200 border-slate-900 text-rose-900 font-bold';
                                                }

                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`p-3 border-2 flex items-start justify-between gap-2 ${cardStyle}`}
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center font-bold text-[10px] shrink-0 bg-white text-slate-900">
                                                                {optionLetter}
                                                            </span>
                                                            <span className="pt-0.5">{opt}</span>
                                                        </div>

                                                        <div className="shrink-0 text-[10px] font-black uppercase">
                                                            {isCandidateChoice && isActuallyCorrect && (
                                                                <span className="text-emerald-900">Your Answer (✓ Correct)</span>
                                                            )}
                                                            {isCandidateChoice && !isActuallyCorrect && (
                                                                <span className="text-rose-900">Your Answer (✕ Wrong)</span>
                                                            )}
                                                            {!isCandidateChoice && isActuallyCorrect && (
                                                                <span className="text-emerald-900">✓ Correct Answer</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Instructor Explanation */}
                                        {ans.explanation && (
                                            <div className="p-3.5 bg-amber-50 border-2 border-slate-900 font-mono text-xs space-y-1">
                                                <span className="font-black text-amber-900 uppercase block">
                                                    💡 Instructor Explanation:
                                                </span>
                                                <p className="text-slate-800 leading-relaxed">
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
