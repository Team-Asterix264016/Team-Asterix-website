import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import { useAttendanceSession } from '../../hooks/useAttendanceSession';

export default function WorkshopAttendanceProjector({ onExit, initialTrack = 'software' }) {
    const startTrack = (() => {
        if (typeof window !== 'undefined' && window.location.hash) {
            if (window.location.hash.includes('track=powertrain')) return 'powertrain';
            if (window.location.hash.includes('track=software')) return 'software';
        }
        return initialTrack;
    })();

    const {
        track,
        setTrack,
        sessionNumber,
        setSessionNumber,
        sessionDate,
        setSessionDate,
        sessionTopic,
        setSessionTopic,
        sessionId,
        scheduleList,
        currentScheduleMatch,
        selectScheduleSession
    } = useAttendanceSession(startTrack);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Dynamic QR state
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [, setScanUrl] = useState('');
    const [error, setError] = useState('');

    // Live Attendance stream
    const [liveStats, setLiveStats] = useState({
        totalEligible: 0,
        totalPresent: 0,
        percentage: 0,
        recentCheckins: []
    });

    const projectorRef = useRef(null);

    // Fetch session token & generate permanent static QR
    const fetchSessionToken = useCallback(async () => {
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) {
                setError('Admin session expired. Please sign in again.');
                return;
            }

            const query = new URLSearchParams({
                track,
                sessionNumber: String(sessionNumber),
                sessionDate,
                sessionTopic
            });

            const res = await fetch(apiUrl(`/api/workshop/attendance/session-token?${query.toString()}`), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server HTTP ${res.status}`);
            }

            const data = await res.json();
            setScanUrl(data.scanUrl);

            // Generate crisp high-resolution permanent QR Code
            const url = await QRCode.toDataURL(data.scanUrl, {
                width: 1000,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'M'
            });
            setQrDataUrl(url);
            setError('');
        } catch (err) {
            console.error('Error fetching attendance session token:', err);
            setError(err.message);
        }
    }, [track, sessionNumber, sessionDate, sessionTopic]);

    // Poll live attendance numbers every 3 seconds
    const fetchLiveStatus = useCallback(async () => {
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) return;

            const res = await fetch(
                apiUrl(`/api/workshop/attendance/live-status?sessionId=${encodeURIComponent(sessionId)}`),
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (res.ok) {
                const data = await res.json();
                setLiveStats({
                    totalEligible: data.totalEligible || 0,
                    totalPresent: data.totalPresent || 0,
                    percentage: data.percentage || 0,
                    recentCheckins: data.recentCheckins || []
                });
            }
        } catch {
            // silent poll error
        }
    }, [sessionId]);

    // Fetch permanent session QR token on mount or parameter changes
    useEffect(() => {
        fetchSessionToken();
    }, [fetchSessionToken]);

    // 3-second live status polling
    useEffect(() => {
        fetchLiveStatus();
        const pollTimer = setInterval(fetchLiveStatus, 3000);
        return () => clearInterval(pollTimer);
    }, [fetchLiveStatus]);

    // Fullscreen toggle handler
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            projectorRef.current?.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    };

    return (
        <div
            ref={projectorRef}
            className="flex min-h-[100dvh] w-full flex-col justify-center bg-slate-950 p-3 font-mono text-white select-none sm:p-5 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:p-6"
        >
            <div className="mx-auto grid w-full max-w-[1700px] grid-cols-1 items-center gap-4 lg:h-full lg:max-h-full lg:grid-cols-12 lg:gap-8 lg:overflow-hidden">
                {/* LEFT: ONLY THE QR CODE (Fitted to screen height) */}
                <div className="flex flex-col items-center justify-center py-1 lg:col-span-7 lg:h-full lg:overflow-hidden xl:col-span-8">
                    {/* Dynamic QR Container */}
                    <div className="shadow-brutal-10-light flex max-h-[calc(100vh-80px)] max-w-full shrink-0 flex-col items-center justify-center border-4 border-slate-900 bg-white p-3 sm:p-5 lg:p-6">
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="Live Attendance QR Code"
                                className="aspect-square max-h-[65vh] w-auto object-contain transition-opacity duration-200 sm:max-h-[72vh] lg:max-h-[78vh] xl:max-h-[82vh]"
                            />
                        ) : (
                            <div className="flex h-[260px] w-[260px] items-center justify-center text-sm font-bold text-slate-400 sm:h-[380px] sm:w-[380px]">
                                Generating QR Code...
                            </div>
                        )}
                        {/* Permanent Session Badge */}
                        <div className="mt-3 flex shrink-0 items-center gap-2 border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 font-mono text-xs font-black text-emerald-950 sm:text-sm">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600"></span>
                            <span>Permanent Session QR</span>
                        </div>
                    </div>

                    <div className="mt-2 shrink-0 space-y-0.5 text-center text-xs text-slate-400">
                        <p className="text-xs font-bold text-slate-200 sm:text-sm">
                            Scan with your mobile camera to check in
                        </p>
                    </div>

                    {error && (
                        <div className="mt-2 shrink-0 border border-rose-600 bg-rose-950 px-3 py-1 text-xs font-bold text-rose-300">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* RIGHT: ALL HEADERS, CONTROLS, AND STATS (Strictly within height) */}
                <div className="flex flex-col justify-between gap-2.5 py-1 lg:col-span-5 lg:h-full lg:overflow-hidden xl:col-span-4">
                    {/* Header Block (All headers moved here) */}
                    <div className="shadow-brutal-4 shrink-0 space-y-2 border-2 border-slate-800 bg-slate-900/80 p-3">
                        {/* Top Title & Controls */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400"></span>
                                <div>
                                    <h1 className="text-sm leading-tight font-black tracking-wider text-white uppercase sm:text-base">
                                        Team Asterix
                                    </h1>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Workshop Attendance Projector
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="press cursor-pointer border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] font-black text-white uppercase hover:bg-slate-700"
                                    title="Toggle Fullscreen"
                                >
                                    {isFullscreen ? 'Exit ↙' : 'Full ↗'}
                                </button>
                                {onExit && (
                                    <button
                                        type="button"
                                        onClick={onExit}
                                        className="press cursor-pointer border border-slate-600 bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white uppercase hover:bg-rose-500"
                                        title="Close Projector"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Controls: Track Toggle & Session Selectors */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {/* Track Toggle */}
                            <div className="inline-flex border-2 border-slate-700 bg-slate-900 p-0.5 text-[11px] font-black uppercase">
                                <button
                                    type="button"
                                    onClick={() => setTrack('software')}
                                    className={`cursor-pointer px-2.5 py-1 transition-colors ${
                                        track === 'software'
                                            ? 'shadow-brutal-1-white bg-sky-400 text-slate-950'
                                            : 'text-slate-400 hover:text-slate-950'
                                    }`}
                                >
                                    Software
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTrack('powertrain')}
                                    className={`cursor-pointer px-2.5 py-1 transition-colors ${
                                        track === 'powertrain'
                                            ? 'shadow-brutal-1-white bg-amber-400 text-slate-950'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Powertrain
                                </button>
                            </div>

                            {/* Schedule Selector */}
                            {scheduleList && scheduleList.length > 0 && (
                                <select
                                    value={currentScheduleMatch?.id || ''}
                                    onChange={(e) => {
                                        const s = scheduleList.find((item) => item.id === e.target.value);
                                        if (s) selectScheduleSession(s);
                                    }}
                                    className="min-w-0 max-w-full border-2 border-slate-700 bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-950 focus:outline-none"
                                >
                                    <option value="">-- {track.toUpperCase()} Schedule --</option>
                                    {scheduleList.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.label} ({s.dateStr}) — {s.title}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Session Number */}
                            <div className="flex items-center gap-1 border-2 border-slate-700 bg-slate-900 px-2 py-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Session:
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={sessionNumber}
                                    onChange={(e) => setSessionNumber(e.target.value)}
                                    className="w-8 bg-transparent text-center text-xs font-black text-white focus:outline-none"
                                />
                            </div>

                            {/* Session Date */}
                            <div className="flex items-center gap-1 border-2 border-slate-700 bg-slate-900 px-2 py-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Date:</span>
                                <input
                                    type="date"
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="cursor-pointer bg-transparent font-mono text-[11px] text-white focus:outline-none"
                                />
                            </div>

                            {/* Session Topic */}
                            <div className="flex min-w-[100px] flex-1 items-center gap-1 border-2 border-slate-700 bg-slate-900 px-2 py-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Topic:</span>
                                <input
                                    type="text"
                                    value={sessionTopic}
                                    placeholder="Optional topic..."
                                    onChange={(e) => setSessionTopic(e.target.value)}
                                    className="w-full bg-transparent font-mono text-[11px] text-white focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Track & Session Header Banner */}
                        <div
                            className={`border-2 border-slate-900 px-2.5 py-1 text-center text-xs font-black tracking-wider uppercase ${
                                track === 'software'
                                    ? 'bg-sky-400 text-slate-950'
                                    : 'bg-amber-400 text-slate-950'
                            }`}
                        >
                            {track === 'software'
                                ? 'Software & Perception Workshop'
                                : 'Electronics & Powertrain Workshop'}{' '}
                            · Session {String(sessionNumber).padStart(2, '0')}
                        </div>
                    </div>

                    {/* Live Metric Cards */}
                    <div className="grid shrink-0 grid-cols-2 gap-2.5">
                        <div className="shadow-brutal-3-brand border-2 border-slate-800 bg-slate-900 p-3">
                            <span className="block text-[10px] font-black tracking-wider text-sky-400 uppercase">
                                Present In Class
                            </span>
                            <span className="text-2xl font-black text-white sm:text-3xl">
                                {liveStats.totalPresent}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">
                                of {liveStats.totalEligible} enrolled
                            </span>
                        </div>

                        <div className="shadow-brutal-3-go-bright border-2 border-slate-800 bg-slate-900 p-3">
                            <span className="block text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                                Attendance Rate
                            </span>
                            <span className="text-2xl font-black text-emerald-400 sm:text-3xl">
                                {liveStats.percentage}%
                            </span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">quorum progress</span>
                        </div>
                    </div>

                    {/* Live Attendance Stream / Ticker - Flex-1 with internal scroll */}
                    <div className="shadow-brutal-4 flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden border-2 border-slate-800 bg-slate-900 p-3">
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="flex items-center gap-1.5 text-xs font-black text-slate-300 uppercase">
                                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400"></span>
                                Live Check-In Ticker
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                                {liveStats.recentCheckins.length} recent
                            </span>
                        </div>

                        {liveStats.recentCheckins.length === 0 ? (
                            <div className="my-auto py-4 text-center text-xs text-slate-500">
                                Awaiting student scans...
                            </div>
                        ) : (
                            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                                {liveStats.recentCheckins.map((item, idx) => (
                                    <div
                                        key={item.rollNo || idx}
                                        className="flex items-center justify-between border border-slate-800 bg-slate-950 p-1.5 text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <span className="border border-emerald-700 bg-emerald-950 px-1.5 py-0.5 text-[10px] font-black text-emerald-400">
                                                ✓
                                            </span>
                                            <div className="truncate">
                                                <div className="truncate text-[11px] font-black text-white">
                                                    {item.name}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                    {item.rollNo} · {item.department}
                                                </div>
                                            </div>
                                        </div>

                                        <span className="shrink-0 font-mono text-[9px] text-slate-500">
                                            {item.checkedInAt
                                                ? new Date(item.checkedInAt).toLocaleTimeString('en-IN', {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                      second: '2-digit',
                                                      hour12: false
                                                  })
                                                : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Status within right panel */}
                    <div className="flex shrink-0 items-center justify-between border-t border-slate-800 pt-1 text-[10px] font-bold text-slate-500">
                        <div>
                            Session: <strong className="font-mono text-slate-300">{sessionId}</strong>
                        </div>
                        <div>Indian Standard Time (IST)</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
