import { useState, useEffect, useRef, useCallback } from 'react';
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
 * Big-screen leaderboard for a running quiz. Polls the admin leaderboard feed
 * every few seconds, so the room watches the ranks move while people answer.
 * Opened from Admin → Quiz Engine → Projector, at #quiz-projector/<quizId>.
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

            const res = await fetch(apiUrl(`/api/quiz/admin/${quizId}/leaderboard?limit=10`), {
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

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            projectorRef.current?.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    };

    const quiz = data?.quiz;
    const stats = data?.stats;
    const board = data?.leaderboard || [];
    const questionStats = data?.questionStats || [];
    const hardest = [...questionStats]
        .filter((q) => q.attempts > 0)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 6);

    return (
        <div
            ref={projectorRef}
            className="flex min-h-[100dvh] w-full flex-col bg-slate-950 p-3 font-mono text-white select-none sm:p-5 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:p-6"
        >
            {/* Header */}
            <div className="shadow-brutal-4 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-slate-800 bg-slate-900/80 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-emerald-400"></span>
                    <div>
                        <h1 className="text-base leading-tight font-black tracking-wider text-white uppercase sm:text-xl lg:text-2xl">
                            {quiz?.title || 'Quiz Leaderboard'}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 sm:text-xs">
                            Team Asterix · Live Quiz Leaderboard
                            {quiz?.instantFeedback ? ' · answers marked on the spot' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
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
                    <button
                        type="button"
                        onClick={() => setShowQuestions((prev) => !prev)}
                        className="press cursor-pointer border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-slate-700"
                        title="Show or hide the per-question breakdown"
                    >
                        {showQuestions ? 'Ranks only' : 'Show questions'}
                    </button>
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="press cursor-pointer border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-slate-700"
                        title="Toggle Fullscreen"
                    >
                        {isFullscreen ? 'Exit ↙' : 'Full ↗'}
                    </button>
                    {onExit && (
                        <button
                            type="button"
                            onClick={onExit}
                            className="press cursor-pointer border border-slate-600 bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white uppercase hover:bg-rose-500"
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

            <div
                className={`grid min-h-0 flex-1 grid-cols-1 gap-4 lg:overflow-hidden ${
                    showQuestions ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
                }`}
            >
                {/* Leaderboard */}
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
                            <div className="flex h-full min-h-[180px] items-center justify-center text-center text-sm font-bold text-slate-500">
                                Nobody has answered yet — the board fills up as people play.
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

                {/* Per-question breakdown */}
                {showQuestions && (
                    <div className="shadow-brutal-4 flex min-h-0 flex-col border-2 border-slate-800 bg-slate-900/60 p-3 sm:p-4 lg:col-span-5">
                        <div className="mb-2.5 flex shrink-0 items-center justify-between border-b border-slate-800 pb-2">
                            <h2 className="text-sm font-black tracking-wider text-white uppercase sm:text-lg">
                                📉 Hardest questions
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

            <p className="mt-3 shrink-0 text-center text-[10px] font-bold text-slate-600">
                Refreshes every 4 seconds
                {data?.updatedAt
                    ? ` · last update ${new Date(data.updatedAt).toLocaleTimeString('en-IN')}`
                    : ''}
            </p>
        </div>
    );
}
