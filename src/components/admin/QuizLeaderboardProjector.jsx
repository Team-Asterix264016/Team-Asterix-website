import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

const MEDALS = ['🥇', '🥈', '🥉'];

function formatClock(totalSeconds) {
    const secs = Math.max(0, Math.floor(totalSeconds || 0));
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
}

/**
 * Big-screen Projector for a running quiz.
 * Displays:
 * 1. Prominent Scannable QR Code for students in the room to sign in with their
 *    registered profiles and enter the live quiz answering page.
 * 2. Live updating leaderboard with podium ranks and question analytics.
 * Supports Split View (QR + Board), Big QR focus, and Leaderboard-only view.
 */
export default function QuizLeaderboardProjector({ onExit }) {
    const quizId = (() => {
        if (typeof window === 'undefined') return '';
        const match = window.location.hash.match(/#quiz-projector\/([^/?]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    })();

    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showQuestions, setShowQuestions] = useState(true);
    const [viewMode, setViewMode] = useState('split'); // 'split' | 'qr' | 'leaderboard'
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);
    const projectorRef = useRef(null);

    const fetchLeaderboard = useCallback(async () => {
        if (!quizId) {
            setError('No quiz selected. Open the projector from the Quiz Engine admin panel.');
            return;
        }
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) {
                setError('Admin session expired. Please sign in again.');
                return;
            }

            const res = await fetch(apiUrl(`/api/quiz/admin/${quizId}/leaderboard?limit=20`), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `Server HTTP ${res.status}`);
            }

            setData(await res.json());
            setError('');
        } catch (err) {
            console.error('Error loading quiz leaderboard:', err);
            setError(err.message);
        }
    }, [quizId]);

    // Live poll every 4 seconds
    useEffect(() => {
        fetchLeaderboard();
        const timer = setInterval(fetchLeaderboard, 4000);
        return () => clearInterval(timer);
    }, [fetchLeaderboard]);

    const quiz = data?.quiz;
    const stats = data?.stats;
    const board = data?.leaderboard || [];
    const questionStats = data?.questionStats || [];
    const hardest = [...questionStats]
        .filter((q) => q.attempts > 0)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 6);

    // Compute the student quiz entry URL
    const quizUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}#quiz/${quiz?.slug || quiz?._id || quizId}`
        : '';

    // Generate crisp QR code
    useEffect(() => {
        if (!quizUrl) return;
        QRCode.toDataURL(quizUrl, {
            width: 1000,
            margin: 2,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        })
            .then(setQrDataUrl)
            .catch((err) => console.error('Error generating QR:', err));
    }, [quizUrl]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            projectorRef.current?.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(quizUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            // fallback
        }
    };

    // Hotkey listener for AV operators
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'q' || e.key === 'Q') setViewMode('qr');
            if (e.key === 's' || e.key === 'S') setViewMode('split');
            if (e.key === 'l' || e.key === 'L') setViewMode('leaderboard');
            if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div
            ref={projectorRef}
            className="flex min-h-[100dvh] w-full flex-col bg-slate-950 p-3 font-mono text-white select-none sm:p-5 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:p-6"
        >
            {/* Header */}
            <div className="shadow-brutal-4 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-slate-800 bg-slate-900/90 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-emerald-400"></span>
                    <div>
                        <h1 className="text-base leading-tight font-black tracking-wider text-white uppercase sm:text-xl lg:text-2xl">
                            {quiz?.title || 'Quiz Arena Projector'}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                            Team Asterix · Live Projector & Student Portal
                            {quiz?.instantFeedback ? ' · Instant Marking' : ''}
                        </p>
                    </div>
                </div>

                {/* View Mode Controls & Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {quiz && (
                        <span
                            className={`border px-2.5 py-1 text-[10px] font-black uppercase sm:text-xs ${
                                quiz.liveState === 'active'
                                    ? 'animate-pulse border-emerald-500 bg-emerald-500/20 text-emerald-300'
                                    : quiz.liveState === 'upcoming'
                                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                                      : 'border-slate-600 bg-slate-800 text-slate-300'
                            }`}
                        >
                            {quiz.liveState === 'active'
                                ? '● Live now'
                                : quiz.liveState === 'upcoming'
                                  ? 'Not started'
                                  : 'Ended'}
                        </span>
                    )}

                    {/* View Switcher: Split / Big QR / Leaderboard */}
                    <div className="inline-flex border border-slate-700 bg-slate-900 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('split')}
                            className={`cursor-pointer px-2.5 py-1 text-[10px] font-black uppercase transition-colors sm:text-xs ${
                                viewMode === 'split'
                                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Split View: QR Code + Leaderboard (Hotkey: S)"
                        >
                            ⚡ Split (QR + Board)
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('qr')}
                            className={`cursor-pointer px-2.5 py-1 text-[10px] font-black uppercase transition-colors sm:text-xs ${
                                viewMode === 'qr'
                                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Focus Big QR Code (Hotkey: Q)"
                        >
                            📱 Big QR
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('leaderboard')}
                            className={`cursor-pointer px-2.5 py-1 text-[10px] font-black uppercase transition-colors sm:text-xs ${
                                viewMode === 'leaderboard'
                                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Leaderboard Only (Hotkey: L)"
                        >
                            🏆 Ranks Only
                        </button>
                    </div>

                    {viewMode !== 'qr' && (
                        <button
                            type="button"
                            onClick={() => setShowQuestions((prev) => !prev)}
                            className="press cursor-pointer border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-slate-700 sm:text-xs"
                            title="Show or hide the per-question breakdown"
                        >
                            {showQuestions ? 'Hide Questions' : 'Show Questions'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="press cursor-pointer border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-slate-700 sm:text-xs"
                        title="Copy direct student link"
                    >
                        {copiedLink ? '✓ Copied' : '📋 Copy Link'}
                    </button>

                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="press cursor-pointer border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-slate-700 sm:text-xs"
                        title="Toggle Fullscreen (Hotkey: F)"
                    >
                        {isFullscreen ? 'Exit ↙' : 'Full ↗'}
                    </button>

                    {onExit && (
                        <button
                            type="button"
                            onClick={onExit}
                            className="press cursor-pointer border border-slate-600 bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-rose-500 sm:text-xs"
                            title="Close Projector"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-3 shrink-0 border border-rose-600 bg-rose-950 px-3 py-2 text-xs font-bold text-rose-300 sm:text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Headline counters */}
            <div className="mb-4 grid shrink-0 grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
                {[
                    { label: 'Writing now', value: stats?.inProgress ?? 0, tone: 'text-amber-300' },
                    { label: 'Submitted', value: stats?.completed ?? 0, tone: 'text-emerald-300' },
                    { label: 'Total joined', value: stats?.started ?? 0, tone: 'text-sky-300' },
                    {
                        label: 'Average score',
                        value: `${stats?.avgPercentage ?? 0}%`,
                        tone: 'text-fuchsia-300'
                    }
                ].map((card) => (
                    <div
                        key={card.label}
                        className="shadow-brutal-4 border-2 border-slate-800 bg-slate-900/80 px-3 py-2.5 sm:px-4 sm:py-3"
                    >
                        <span className="block text-[10px] font-black tracking-wider text-slate-400 uppercase sm:text-xs">
                            {card.label}
                        </span>
                        <strong
                            className={`block text-2xl leading-tight font-black sm:text-4xl ${card.tone}`}
                        >
                            {card.value}
                        </strong>
                    </div>
                ))}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* VIEW MODE 1: FULLSCREEN BIG QR FOCUS                          */}
            {/* ------------------------------------------------------------- */}
            {viewMode === 'qr' && (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-2">
                    <div className="shadow-brutal-8 flex w-full max-w-2xl flex-col items-center border-4 border-slate-800 bg-white p-6 text-slate-900 sm:p-8">
                        <div className="mb-3 text-center">
                            <span className="inline-block border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-wider text-slate-900 uppercase">
                                📱 SCAN TO ANSWER QUIZ
                            </span>
                            <h2 className="mt-2 text-xl font-black uppercase sm:text-3xl">
                                {quiz?.title || 'Workshop Assessment'}
                            </h2>
                            <p className="mt-1 font-sans text-xs font-bold text-slate-600 sm:text-sm">
                                Scan with phone camera → Log in with registered student credentials → Begin answering
                            </p>
                        </div>

                        {/* Huge QR Code Image */}
                        <div className="my-3 flex items-center justify-center border-4 border-slate-900 bg-white p-3 sm:p-4">
                            {qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt="Quiz Entry QR Code"
                                    className="aspect-square max-h-[50vh] w-auto max-w-full object-contain sm:max-h-[55vh]"
                                />
                            ) : (
                                <div className="flex h-64 w-64 items-center justify-center font-mono text-sm font-bold text-slate-500">
                                    Generating QR Code...
                                </div>
                            )}
                        </div>

                        {/* Quiz Quick Specs */}
                        <div className="mt-2 grid w-full grid-cols-3 gap-2 border-2 border-slate-900 bg-slate-50 p-3 text-center font-mono text-xs">
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase">Duration</span>
                                <strong className="text-sm font-black text-slate-900">
                                    {quiz?.durationMinutes || 15} Mins
                                </strong>
                            </div>
                            <div className="border-x-2 border-slate-200">
                                <span className="block text-[10px] text-slate-500 uppercase">Questions</span>
                                <strong className="text-sm font-black text-slate-900">
                                    {quiz?.totalQuestions || 0} MCQs
                                </strong>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase">Total Points</span>
                                <strong className="text-sm font-black text-slate-900">
                                    {quiz?.totalPoints || 0} Pts
                                </strong>
                            </div>
                        </div>

                        {/* Direct Link Badge */}
                        <div className="mt-4 flex w-full items-center justify-between gap-2 border-2 border-slate-900 bg-sky-100 p-2.5 font-mono text-xs">
                            <span className="truncate font-bold text-slate-800">
                                {quizUrl}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="press shrink-0 border border-slate-900 bg-sky-400 px-3 py-1 font-black text-slate-900 uppercase hover:bg-sky-300"
                            >
                                {copiedLink ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* VIEW MODE 2 & 3: SPLIT VIEW OR LEADERBOARD ONLY               */}
            {/* ------------------------------------------------------------- */}
            {viewMode !== 'qr' && (
                <div
                    className={`grid min-h-0 flex-1 gap-4 lg:overflow-hidden ${
                        viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
                    }`}
                >
                    {/* LEFT COLUMN: SCANNABLE QR CODE CARD (In Split View) */}
                    {viewMode === 'split' && (
                        <div className="shadow-brutal-4 flex min-h-0 flex-col border-2 border-slate-800 bg-slate-900/90 p-3.5 sm:p-4 lg:col-span-5 xl:col-span-4">
                            <div className="mb-2.5 flex shrink-0 items-center justify-between border-b border-slate-800 pb-2">
                                <span className="flex items-center gap-1.5 text-xs font-black tracking-wider text-amber-300 uppercase sm:text-sm">
                                    <span className="h-2 w-2 animate-ping rounded-full bg-amber-400"></span>
                                    Scan to Join Quiz
                                </span>
                                <span className="border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[9px] font-black text-sky-300 uppercase">
                                    Live Portal
                                </span>
                            </div>

                            {/* Crisp White QR Container */}
                            <div className="flex flex-1 flex-col items-center justify-center p-2 text-center">
                                <div className="border-4 border-slate-900 bg-white p-3 shadow-md">
                                    {qrDataUrl ? (
                                        <img
                                            src={qrDataUrl}
                                            alt="Quiz Access QR Code"
                                            className="aspect-square max-h-[30vh] w-auto object-contain sm:max-h-[34vh] lg:max-h-[38vh]"
                                        />
                                    ) : (
                                        <div className="flex h-44 w-44 items-center justify-center text-xs text-slate-500">
                                            Generating QR...
                                        </div>
                                    )}
                                </div>

                                {/* Step Instructions */}
                                <div className="mt-3 w-full space-y-1.5 text-left font-sans text-xs">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 font-mono text-[10px] font-black text-slate-950">
                                            1
                                        </span>
                                        <span className="text-[11px] font-bold">Scan QR on your phone camera</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-400 font-mono text-[10px] font-black text-slate-950">
                                            2
                                        </span>
                                        <span className="text-[11px] font-bold">Log in with your registered student profile</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-mono text-[10px] font-black text-slate-950">
                                            3
                                        </span>
                                        <span className="text-[11px] font-bold">Quiz answering page starts automatically</span>
                                    </div>
                                </div>

                                {/* Specs Pill */}
                                <div className="mt-3 flex w-full shrink-0 items-center justify-between border border-slate-800 bg-slate-950/60 p-2 font-mono text-[10px]">
                                    <span className="text-slate-400">
                                        ⏱ {quiz?.durationMinutes || 15}m · {quiz?.totalQuestions || 0} Qs · {quiz?.totalPoints || 0} pts
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="text-sky-400 underline hover:text-sky-300"
                                    >
                                        {copiedLink ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RIGHT COLUMN: LEADERBOARD & QUESTION ACCURACY */}
                    <div
                        className={`flex min-h-0 flex-1 flex-col gap-4 lg:overflow-hidden ${
                            viewMode === 'split' ? 'lg:col-span-7 xl:col-span-8' : 'w-full'
                        }`}
                    >
                        <div
                            className={`grid min-h-0 flex-1 grid-cols-1 gap-4 lg:overflow-hidden ${
                                showQuestions ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
                            }`}
                        >
                            {/* Leaderboard Table */}
                            <div
                                className={`shadow-brutal-4 flex min-h-0 flex-col border-2 border-slate-800 bg-slate-900/60 p-3 sm:p-4 ${
                                    showQuestions ? 'lg:col-span-7' : ''
                                }`}
                            >
                                <div className="mb-2.5 flex shrink-0 items-center justify-between border-b border-slate-800 pb-2">
                                    <h2 className="text-sm font-black tracking-wider text-white uppercase sm:text-lg">
                                        🏆 Leaderboard
                                    </h2>
                                    <span className="text-[10px] font-bold text-slate-400 sm:text-xs">
                                        Top {board.length} · out of {quiz?.totalPoints ?? 0} pts
                                    </span>
                                </div>

                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                    {board.length === 0 ? (
                                        <div className="flex h-full min-h-[180px] flex-col items-center justify-center p-4 text-center">
                                            <span className="text-3xl">🎯</span>
                                            <p className="mt-2 text-xs font-bold text-slate-400 sm:text-sm">
                                                Awaiting student answers...
                                            </p>
                                            <span className="mt-1 text-[11px] text-slate-500">
                                                The board populates live as participants submit answers.
                                            </span>
                                        </div>
                                    ) : (
                                        board.map((row) => {
                                            const isPodium = row.rank <= 3;
                                            return (
                                                <div
                                                    key={`${row.rank}-${row.name}`}
                                                    className={`flex items-center gap-3 border-2 px-3 py-2 transition-all sm:gap-4 sm:px-4 sm:py-3 ${
                                                        isPodium
                                                            ? 'border-amber-400 bg-amber-400/15'
                                                            : 'border-slate-700 bg-slate-800/50'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-9 shrink-0 text-center text-xl font-black sm:w-12 sm:text-3xl ${
                                                            isPodium ? 'text-amber-300' : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {MEDALS[row.rank - 1] || row.rank}
                                                    </span>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate text-sm font-black text-white uppercase sm:text-xl">
                                                                {row.name}
                                                            </span>
                                                            {row.live && (
                                                                <span className="shrink-0 animate-pulse border border-amber-500 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 uppercase">
                                                                    Writing
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="block truncate text-[10px] font-bold text-slate-400 sm:text-xs">
                                                            {row.rollNo ? `${row.rollNo} · ` : ''}
                                                            {row.answered}/{quiz?.totalQuestions ?? 0} answered
                                                            {row.timeSpentSeconds
                                                                ? ` · ${formatClock(row.timeSpentSeconds)}`
                                                                : ''}
                                                        </span>
                                                    </div>

                                                    <div className="shrink-0 text-right">
                                                        <strong className="block text-xl leading-tight font-black text-emerald-300 sm:text-3xl">
                                                            {row.score}
                                                        </strong>
                                                        <span className="text-[10px] font-bold text-slate-400 sm:text-xs">
                                                            / {row.maxScore || quiz?.totalPoints || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Per-Question Breakdown */}
                            {showQuestions && (
                                <div className="shadow-brutal-4 flex min-h-0 flex-col border-2 border-slate-800 bg-slate-900/60 p-3 sm:p-4 lg:col-span-5">
                                    <div className="mb-2.5 flex shrink-0 items-center justify-between border-b border-slate-800 pb-2">
                                        <h2 className="text-sm font-black tracking-wider text-white uppercase sm:text-lg">
                                            📉 Hardest Questions
                                        </h2>
                                        <span className="text-[10px] font-bold text-slate-400 sm:text-xs">
                                            % who got it right
                                        </span>
                                    </div>

                                    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                                        {hardest.length === 0 ? (
                                            <div className="flex h-full min-h-[180px] items-center justify-center text-center text-sm font-bold text-slate-500">
                                                No answers in yet.
                                            </div>
                                        ) : (
                                            hardest.map((q) => (
                                                <div key={q.number} className="space-y-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="line-clamp-2 flex-1 text-[11px] leading-snug font-bold text-slate-300 sm:text-sm">
                                                            <span className="mr-1.5 border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] font-black text-white">
                                                                Q{q.number}
                                                            </span>
                                                            {q.questionText}
                                                        </span>
                                                        <strong
                                                            className={`shrink-0 text-base font-black sm:text-xl ${
                                                                q.accuracy >= 70
                                                                    ? 'text-emerald-300'
                                                                    : q.accuracy >= 40
                                                                      ? 'text-amber-300'
                                                                      : 'text-rose-300'
                                                            }`}
                                                        >
                                                            {q.accuracy}%
                                                        </strong>
                                                    </div>
                                                    <div className="h-2.5 w-full border border-slate-700 bg-slate-800">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${
                                                                q.accuracy >= 70
                                                                    ? 'bg-emerald-400'
                                                                    : q.accuracy >= 40
                                                                      ? 'bg-amber-400'
                                                                      : 'bg-rose-400'
                                                            }`}
                                                            style={{ width: `${q.accuracy}%` }}
                                                        />
                                                    </div>
                                                    <span className="block text-[10px] font-bold text-slate-500">
                                                        {q.correct} of {q.attempts} correct · answer{' '}
                                                        {String.fromCharCode(65 + q.correctOptionIndex)}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <p className="mt-3 shrink-0 text-center text-[10px] font-bold text-slate-600">
                Live refreshed every 4s · Hotkeys: [Q] Big QR, [S] Split View, [L] Leaderboard, [F] Fullscreen
                {data?.updatedAt
                    ? ` · last update ${new Date(data.updatedAt).toLocaleTimeString('en-IN')}`
                    : ''}
            </p>
        </div>
    );
}
