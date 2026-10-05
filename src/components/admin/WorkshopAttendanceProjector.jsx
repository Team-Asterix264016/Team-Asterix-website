import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

export default function WorkshopAttendanceProjector({ onExit, initialTrack = 'software' }) {
    const [track, setTrack] = useState(initialTrack);
    const [sessionNumber, setSessionNumber] = useState(1);
    const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [sessionTopic, setSessionTopic] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Dynamic QR & Timer state
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [countdownSeconds, setCountdownSeconds] = useState(12);
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
    const sessionId = `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;

    // Fetch token & generate QR
    const fetchRotatingToken = useCallback(async () => {
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
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server HTTP ${res.status}`);
            }

            const data = await res.json();
            setScanUrl(data.scanUrl);
            setCountdownSeconds(12);

            // Generate crisp high-resolution QR Code
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
            console.error('Error fetching rotating attendance token:', err);
            setError(err.message);
        }
    }, [track, sessionNumber, sessionDate, sessionTopic]);

    // Poll live attendance numbers every 3 seconds
    const fetchLiveStatus = useCallback(async () => {
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) return;

            const res = await fetch(apiUrl(`/api/workshop/attendance/live-status?sessionId=${encodeURIComponent(sessionId)}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

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

    // 12-second countdown and rotation timer
    useEffect(() => {
        fetchRotatingToken();
        fetchLiveStatus();

        // 1-second interval to update countdown number
        const countdownTimer = setInterval(() => {
            setCountdownSeconds((prev) => {
                if (prev <= 1) {
                    fetchRotatingToken();
                    return 12;
                }
                return prev - 1;
            });
        }, 1000);

        // 3-second live status refresh
        const pollTimer = setInterval(fetchLiveStatus, 3000);

        return () => {
            clearInterval(countdownTimer);
            clearInterval(pollTimer);
        };
    }, [fetchRotatingToken, fetchLiveStatus]);

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
            className="h-screen max-h-screen w-screen bg-slate-950 text-white font-mono p-3 sm:p-5 lg:p-6 select-none flex flex-col justify-center overflow-hidden"
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center max-w-[1700px] w-full mx-auto h-full max-h-full overflow-hidden">
                
                {/* LEFT: ONLY THE QR CODE (Fitted to 100% screen height) */}
                <div className="lg:col-span-7 xl:col-span-8 h-full flex flex-col items-center justify-center py-1 overflow-hidden">
                    {/* Dynamic QR Container */}
                    <div className="p-3 sm:p-5 lg:p-6 bg-white border-4 border-slate-900 shadow-brutal-10-light flex flex-col items-center justify-center max-w-full max-h-[calc(100vh-80px)] shrink-0">
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="Live Attendance QR Code"
                                className="max-h-[54vh] sm:max-h-[60vh] lg:max-h-[66vh] xl:max-h-[70vh] w-auto aspect-square object-contain transition-opacity duration-200"
                            />
                        ) : (
                            <div className="w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] flex items-center justify-center text-slate-400 font-bold text-sm">
                                Generating QR Code...
                            </div>
                        )}

                        {/* Clean 12-Second Countdown Timer */}
                        <div className="mt-3 flex items-center gap-2 font-mono text-xs sm:text-sm font-black text-slate-800 bg-slate-100 px-3.5 py-1 border border-slate-400 shrink-0">
                            <span>⏱ Code refreshes in:</span>
                            <span className="text-rose-600 text-base sm:text-lg font-black w-8 text-center">
                                {countdownSeconds}s
                            </span>
                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 mt-2 space-y-0.5 shrink-0">
                        <p className="font-bold text-slate-200 text-xs sm:text-sm">
                            Scan with your mobile camera to check in
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Enter your Roll Number and College Email to record attendance
                        </p>
                    </div>

                    {error && (
                        <div className="mt-2 px-3 py-1 bg-rose-950 border border-rose-600 text-rose-300 text-xs font-bold shrink-0">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* RIGHT: ALL HEADERS, CONTROLS, AND STATS (Strictly within height) */}
                <div className="lg:col-span-5 xl:col-span-4 h-full flex flex-col justify-between gap-2.5 overflow-hidden py-1">
                    
                    {/* Header Block (All headers moved here) */}
                    <div className="space-y-2 bg-slate-900/80 p-3 border-2 border-slate-800 shadow-brutal-4 shrink-0">
                        {/* Top Title & Controls */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                                <div>
                                    <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white leading-tight">
                                        Team Asterix
                                    </h1>
                                    <p className="text-[10px] text-slate-400 font-bold">
                                        Workshop Attendance Projector
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="press px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black uppercase text-[10px] cursor-pointer"
                                    title="Toggle Fullscreen"
                                >
                                    {isFullscreen ? 'Exit ↙' : 'Full ↗'}
                                </button>
                                {onExit && (
                                    <button
                                        type="button"
                                        onClick={onExit}
                                        className="press px-2 py-0.5 bg-rose-600 hover:bg-rose-500 border border-slate-600 text-white font-black uppercase text-[10px] cursor-pointer"
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
                            <div className="inline-flex border-2 border-slate-700 bg-slate-900 p-0.5 font-black uppercase text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setTrack('software')}
                                    className={`px-2.5 py-1 cursor-pointer transition-colors ${
                                        track === 'software' ? 'bg-sky-400 text-slate-950 shadow-brutal-1-white' : 'text-slate-400 hover:text-slate-950'
                                    }`}
                                >
                                    Software
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTrack('powertrain')}
                                    className={`px-2.5 py-1 cursor-pointer transition-colors ${
                                        track === 'powertrain' ? 'bg-amber-400 text-slate-950 shadow-brutal-1-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Powertrain
                                </button>
                            </div>

                            {/* Session Number */}
                            <div className="flex items-center gap-1 bg-slate-900 border-2 border-slate-700 px-2 py-0.5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Session:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={sessionNumber}
                                    onChange={(e) => setSessionNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-8 bg-transparent text-white font-black text-center focus:outline-none text-xs"
                                />
                            </div>

                            {/* Session Date */}
                            <div className="flex items-center gap-1 bg-slate-900 border-2 border-slate-700 px-2 py-0.5">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Date:</span>
                                <input
                                    type="date"
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="bg-transparent text-white font-mono text-[11px] focus:outline-none cursor-pointer"
                                />
                            </div>

                            {/* Session Topic */}
                            <div className="flex items-center gap-1 bg-slate-900 border-2 border-slate-700 px-2 py-0.5 flex-1 min-w-[100px]">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Topic:</span>
                                <input
                                    type="text"
                                    value={sessionTopic}
                                    placeholder="Optional topic..."
                                    onChange={(e) => setSessionTopic(e.target.value)}
                                    className="bg-transparent text-white font-mono text-[11px] focus:outline-none w-full"
                                />
                            </div>
                        </div>

                        {/* Track & Session Header Banner */}
                        <div className={`px-2.5 py-1 border-2 border-slate-900 font-black text-xs uppercase tracking-wider text-center ${
                            track === 'software' ? 'bg-sky-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                        }`}>
                            {track === 'software' ? 'Software & Perception Workshop' : 'Electronics & Powertrain Workshop'} · Session {String(sessionNumber).padStart(2, '0')}
                        </div>
                    </div>

                    {/* Live Metric Cards */}
                    <div className="grid grid-cols-2 gap-2.5 shrink-0">
                        <div className="p-3 bg-slate-900 border-2 border-slate-800 shadow-brutal-3-brand">
                            <span className="text-[10px] uppercase tracking-wider text-sky-400 font-black block">
                                Present In Class
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-white">
                                {liveStats.totalPresent}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                of {liveStats.totalEligible} enrolled
                            </span>
                        </div>

                        <div className="p-3 bg-slate-900 border-2 border-slate-800 shadow-brutal-3-go-bright">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-black block">
                                Attendance Rate
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                                {liveStats.percentage}%
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                quorum progress
                            </span>
                        </div>
                    </div>

                    {/* Live Attendance Stream / Ticker - Flex-1 with internal scroll */}
                    <div className="flex-1 min-h-0 bg-slate-900 border-2 border-slate-800 shadow-brutal-4 p-3 flex flex-col space-y-2 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
                            <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                Live Check-In Ticker
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                                {liveStats.recentCheckins.length} recent
                            </span>
                        </div>

                        {liveStats.recentCheckins.length === 0 ? (
                            <div className="my-auto py-4 text-center text-xs text-slate-500">
                                Awaiting student scans...
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
                                {liveStats.recentCheckins.map((item, idx) => (
                                    <div
                                        key={item.rollNo || idx}
                                        className="p-1.5 bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-black">
                                                ✓
                                            </span>
                                            <div className="truncate">
                                                <div className="font-black text-white truncate text-[11px]">
                                                    {item.name}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                    {item.rollNo} · {item.department}
                                                </div>
                                            </div>
                                        </div>

                                        <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                                            {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Status within right panel */}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-slate-800 shrink-0">
                        <div>
                            Session: <strong className="text-slate-300 font-mono">{sessionId}</strong>
                        </div>
                        <div>
                            Indian Standard Time (IST)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
