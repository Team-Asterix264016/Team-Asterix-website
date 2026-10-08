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

    // Dynamic QR state
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [, setScanUrl] = useState('');
    const [error, setError] = useState('');

    // Admin GPS state
    const [adminCoords, setAdminCoords] = useState(null); // { latitude, longitude, accuracy }
    const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'acquiring' | 'saved' | 'error'
    const [locationError, setLocationError] = useState('');

    // Live Attendance stream
    const [liveStats, setLiveStats] = useState({
        totalEligible: 0,
        totalPresent: 0,
        percentage: 0,
        hasAdminLocation: false,
        recentCheckins: []
    });

    const projectorRef = useRef(null);
    const sessionId = `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;

<<<<<<< HEAD
    // Fetch static token & generate static QR Code
    const fetchSessionToken = useCallback(async () => {
=======
    // Acquire admin's current GPS location via Geolocation API
    const requestAdminLocation = useCallback((targetTrack = track, targetNum = sessionNumber, targetDate = sessionDate, targetTopic = sessionTopic) => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }

        setLocationStatus('acquiring');
        setLocationError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const acc = position.coords.accuracy;

                setAdminCoords({ latitude: lat, longitude: lng, accuracy: acc });

                // Post admin location to server to associate with session
                try {
                    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
                    if (token) {
                        await fetch(apiUrl('/api/workshop/attendance/session-location'), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                track: targetTrack,
                                sessionNumber: targetNum,
                                sessionDate: targetDate,
                                sessionTopic: targetTopic,
                                latitude: lat,
                                longitude: lng,
                                accuracy: acc
                            })
                        });
                    }
                    setLocationStatus('saved');
                } catch (err) {
                    console.error('Failed to post session location to server:', err);
                    setLocationStatus('saved'); // locally stored coords will be passed with token refresh
                }
            },
            (err) => {
                console.error('Admin geolocation error:', err);
                setLocationStatus('error');
                let msg = 'Failed to get admin location.';
                if (err.code === 1) msg = 'Location permission denied. Please allow GPS access.';
                else if (err.code === 2) msg = 'Location unavailable. Turn on device GPS.';
                else if (err.code === 3) msg = 'GPS request timed out.';
                setLocationError(msg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [track, sessionNumber, sessionDate, sessionTopic]);

    // Fetch token & generate QR
    const fetchRotatingToken = useCallback(async () => {
>>>>>>> de36529 (feat: add GPS location distance verification (50m radius) for attendance checkins)
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

            if (adminCoords?.latitude != null && adminCoords?.longitude != null) {
                query.append('latitude', String(adminCoords.latitude));
                query.append('longitude', String(adminCoords.longitude));
                if (adminCoords.accuracy != null) {
                    query.append('accuracy', String(adminCoords.accuracy));
                }
            }

            const res = await fetch(apiUrl(`/api/workshop/attendance/session-token?${query.toString()}`), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server HTTP ${res.status}`);
            }

            const data = await res.json();
            setScanUrl(data.scanUrl);
            setCountdownSeconds(12);

            if (data.hasAdminLocation && locationStatus !== 'saved') {
                setLocationStatus('saved');
            }

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
            console.error('Error fetching attendance session token:', err);
            setError(err.message);
        }
    }, [track, sessionNumber, sessionDate, sessionTopic, adminCoords, locationStatus]);

    // Poll live attendance numbers every 3 seconds & rotate token every 12s
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
                    hasAdminLocation: data.hasAdminLocation || false,
                    recentCheckins: data.recentCheckins || []
                });
            }
        } catch {
            // silent poll error
        }
    }, [sessionId]);

<<<<<<< HEAD
=======
    // Acquire GPS location on mount / session change
    useEffect(() => {
        requestAdminLocation();
    }, [requestAdminLocation]);

    // 12-second countdown and rotation timer
>>>>>>> de36529 (feat: add GPS location distance verification (50m radius) for attendance checkins)
    useEffect(() => {
        fetchSessionToken();
        fetchLiveStatus();

        // 3-second live status refresh for check-in counter & ticker
        const pollTimer = setInterval(fetchLiveStatus, 3000);

        return () => {
            clearInterval(pollTimer);
        };
    }, [fetchSessionToken, fetchLiveStatus]);

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
            className="flex h-screen max-h-screen w-screen flex-col justify-center overflow-hidden bg-slate-950 p-3 font-mono text-white select-none sm:p-5 lg:p-6"
        >
            <div className="mx-auto grid h-full max-h-full w-full max-w-[1700px] grid-cols-1 items-center gap-4 overflow-hidden lg:grid-cols-12 lg:gap-8">
                {/* LEFT: ONLY THE QR CODE (Fitted to screen height) */}
                <div className="flex h-full flex-col items-center justify-center overflow-hidden py-1 lg:col-span-7 xl:col-span-8">
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
<<<<<<< HEAD
=======

                        {/* Clean 12-Second Countdown Timer */}
                        <div className="mt-3 flex shrink-0 items-center gap-2 border border-slate-400 bg-slate-100 px-3.5 py-1 font-mono text-xs font-black text-slate-800 sm:text-sm">
                            <span>⏱ Code refreshes in:</span>
                            <span className="w-8 text-center text-base font-black text-rose-600 sm:text-lg">
                                {countdownSeconds}s
                            </span>
                        </div>

                        {/* Admin GPS Location Status Badge */}
                        <div className="mt-2.5 flex w-full shrink-0 items-center justify-between gap-2 border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                                {locationStatus === 'acquiring' ? (
                                    <>
                                        <span className="h-2 w-2 animate-ping rounded-full bg-amber-500"></span>
                                        <span className="font-bold text-amber-800">Acquiring GPS location...</span>
                                    </>
                                ) : locationStatus === 'saved' || liveStats.hasAdminLocation ? (
                                    <>
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        <span className="font-bold text-emerald-800">
                                            📍 Admin GPS Active {adminCoords?.accuracy ? `(±${Math.round(adminCoords.accuracy)}m)` : ''}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                        <span className="truncate font-bold text-rose-800">
                                            {locationError || 'GPS Location Required'}
                                        </span>
                                    </>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => requestAdminLocation()}
                                className="press cursor-pointer border border-slate-400 bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-900 uppercase hover:bg-slate-300"
                                title="Update instructor GPS coordinates for 50m distance validation"
                            >
                                {locationStatus === 'acquiring' ? 'Locating...' : 'Update GPS 📍'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 shrink-0 space-y-0.5 text-center text-xs text-slate-400">
                        <p className="text-xs font-bold text-slate-200 sm:text-sm">
                            Scan with your mobile camera to check in
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Location enabled · 50m radius distance check active
                        </p>
>>>>>>> de36529 (feat: add GPS location distance verification (50m radius) for attendance checkins)
                    </div>

                    {error && (
                        <div className="mt-2 shrink-0 border border-rose-600 bg-rose-950 px-3 py-1 text-xs font-bold text-rose-300">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* RIGHT: ALL HEADERS, CONTROLS, AND STATS (Strictly within height) */}
                <div className="flex h-full flex-col justify-between gap-2.5 overflow-hidden py-1 lg:col-span-5 xl:col-span-4">
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
                                    onChange={(e) =>
                                        setSessionNumber(Math.max(1, parseInt(e.target.value, 10) || 1))
                                    }
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
