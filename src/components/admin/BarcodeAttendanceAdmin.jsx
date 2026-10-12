import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import { useAttendanceSession } from '../../hooks/useAttendanceSession';

/**
 * Web Audio API Sound Synthesizer, Mobile Haptic Engine & Speech Synthesis
 * Zero external audio files required — generates immediate, reliable audio cues & haptics.
 */
function playAudioTone(type = 'success', isMuted = false, candidateName = '') {
    // 1. Mobile Haptic Vibration Feedback
    try {
        if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
            if (type === 'success') {
                navigator.vibrate([60, 40, 60]); // Double pulse tick
            } else if (type === 'warning') {
                navigator.vibrate([120]);
            } else {
                navigator.vibrate([180, 80, 180]); // Error double buzz
            }
        }
    } catch {
        // Ignore vibration errors on unsupported devices
    }

    if (isMuted) return;

    // 2. Web Audio API Chime Synth
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();

            if (type === 'success') {
                // High double-tone chime (880Hz -> 1760Hz)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(880, ctx.currentTime);
                osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
                gain1.gain.setValueAtTime(0.25, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start();
                osc1.stop(ctx.currentTime + 0.25);
            } else if (type === 'warning') {
                // Dual warm pulse tone (587Hz)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else {
                // Error low buzz tone (220Hz)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            }
        }
    } catch {
        // Ignore audio playback blocks if user hasn't interacted yet
    }
}

export default function BarcodeAttendanceAdmin({ showStatus }) {
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
    } = useAttendanceSession('software');

    // Scanner state
    const [scannedInput, setScannedInput] = useState('');
    const [scanMode, setScanMode] = useState('hardware'); // 'hardware' | 'camera'
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
    const [isProcessingScan, setIsProcessingScan] = useState(false);

    // Live session stats & scan results
    const [lastResult, setLastResult] = useState(null); // { type: 'success'|'warning'|'error', message, candidate, time }
    const [recentScans, setRecentScans] = useState([]);
    const [stats, setStats] = useState({ totalEligible: 0, totalPresent: 0, percentage: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Camera scanner state
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const html5QrCodeRef = useRef(null);
    const lastCameraScanTimeRef = useRef(0);
    const lastCameraBarcodeRef = useRef('');

    const inputRef = useRef(null);

    // Auto-focus input for hands-free hardware scanner operation
    useEffect(() => {
        if (scanMode === 'hardware' && autoFocusEnabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [scanMode, autoFocusEnabled, lastResult, isProcessingScan]);

    // Fetch live session stats from server
    const fetchLiveStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(
                apiUrl(`/api/workshop/attendance/live-status?sessionId=${encodeURIComponent(sessionId)}`),
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setStats({
                    totalEligible: data.totalEligible || 0,
                    totalPresent: data.totalPresent || 0,
                    percentage: data.percentage || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch live attendance stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchLiveStats();
    }, [fetchLiveStats]);

    // Core barcode processing function
    const processBarcodeScan = useCallback(
        async (rawBarcode) => {
            const barcode = String(rawBarcode || '').trim();
            if (!barcode || isProcessingScan) return;

            setIsProcessingScan(true);
            setScannedInput('');

            try {
                const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
                const res = await fetch(apiUrl('/api/workshop/attendance/barcode-scan'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        barcode,
                        track,
                        sessionId,
                        sessionTopic,
                        sessionNumber,
                        sessionDate
                    })
                });

                const data = await res.json();
                const nowTime = new Date().toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });

                if (!res.ok) {
                    playAudioTone('error', isAudioMuted);
                    const resultObj = {
                        type: 'error',
                        message: data.error || 'Barcode scan failed.',
                        barcode,
                        candidate: data.candidate || null,
                        time: nowTime
                    };
                    setLastResult(resultObj);
                    setRecentScans((prev) => [resultObj, ...prev.slice(0, 49)]);
                    if (showStatus) showStatus(`❌ ${data.error || 'Scan error'}`);
                    return;
                }

                if (data.alreadyRecorded) {
                    playAudioTone('warning', isAudioMuted, data.candidate?.name);
                    const resultObj = {
                        type: 'warning',
                        message: data.message || `Already Marked: ${data.candidate?.name || barcode}`,
                        barcode,
                        candidate: data.candidate,
                        time: nowTime
                    };
                    setLastResult(resultObj);
                    setRecentScans((prev) => [resultObj, ...prev.slice(0, 49)]);
                    if (showStatus) showStatus(`⚠️ ${data.message}`);
                } else {
                    playAudioTone('success', isAudioMuted, data.candidate?.name);
                    const resultObj = {
                        type: 'success',
                        message: data.message || `✓ Attendance Marked: ${data.candidate?.name}`,
                        barcode,
                        candidate: data.candidate,
                        time: nowTime
                    };
                    setLastResult(resultObj);
                    setRecentScans((prev) => [resultObj, ...prev.slice(0, 49)]);
                    if (showStatus) showStatus(data.message);
                }

                fetchLiveStats();
            } catch (err) {
                console.error('Barcode scan submission error:', err);
                playAudioTone('error', isAudioMuted);
                const resultObj = {
                    type: 'error',
                    message: 'Network or server error while scanning barcode.',
                    barcode,
                    candidate: null,
                    time: new Date().toLocaleTimeString()
                };
                setLastResult(resultObj);
                setRecentScans((prev) => [resultObj, ...prev.slice(0, 49)]);
            } finally {
                setIsProcessingScan(false);
                // Re-focus input field immediately for next scan
                if (autoFocusEnabled && inputRef.current) {
                    setTimeout(() => inputRef.current?.focus(), 50);
                }
            }
        },
        [isProcessingScan, track, sessionId, sessionTopic, sessionNumber, sessionDate, isAudioMuted, showStatus, fetchLiveStats, autoFocusEnabled]
    );

    // Form submit handler for text input
    const handleFormSubmit = (e) => {
        e.preventDefault();
        processBarcodeScan(scannedInput);
    };

    // Global Keydown Listener Buffer for Hardware Scanners
    useEffect(() => {
        if (scanMode !== 'hardware') return;

        let keyBuffer = '';
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = (e) => {
            const now = Date.now();

            const activeElem = document.activeElement;
            if (activeElem && activeElem.tagName === 'INPUT' && activeElem !== inputRef.current && activeElem.type === 'text') {
                return;
            }

            if (now - lastKeyTime > 250) {
                keyBuffer = '';
            }
            lastKeyTime = now;

            if (e.key === 'Enter') {
                if (keyBuffer.length >= 3) {
                    e.preventDefault();
                    processBarcodeScan(keyBuffer);
                    keyBuffer = '';
                }
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                keyBuffer += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [scanMode, processBarcodeScan]);

    // Universal Camera Scanner logic using Html5Qrcode engine
    const stopCamera = useCallback(async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error('Error stopping camera:', err);
            }
            html5QrCodeRef.current = null;
        }
        setIsCameraActive(false);
    }, []);

    const startCamera = useCallback(async () => {
        setCameraError('');
        await stopCamera();

        const elem = document.getElementById('barcode-camera-container');
        if (!elem) return;

        try {
            const scanner = new Html5Qrcode('barcode-camera-container', { verbose: false });
            html5QrCodeRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 15,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        return {
                            width: Math.min(320, Math.floor(viewfinderWidth * 0.85)),
                            height: Math.min(180, Math.floor(viewfinderHeight * 0.55))
                        };
                    }
                },
                (decodedText) => {
                    const now = Date.now();
                    if (
                        decodedText &&
                        (decodedText !== lastCameraBarcodeRef.current || now - lastCameraScanTimeRef.current > 3000)
                    ) {
                        lastCameraBarcodeRef.current = decodedText;
                        lastCameraScanTimeRef.current = now;
                        processBarcodeScan(decodedText);
                    }
                },
                () => {
                    // Frame scan tick
                }
            );

            setIsCameraActive(true);
        } catch (err) {
            console.error('Camera initialization error:', err);
            setCameraError(err.message || 'Could not access device camera. Please check camera permissions.');
            setIsCameraActive(false);
        }
    }, [processBarcodeScan, stopCamera]);

    useEffect(() => {
        if (scanMode === 'camera') {
            // Small timeout to ensure DOM container is rendered
            const timer = setTimeout(() => {
                startCamera();
            }, 100);
            return () => {
                clearTimeout(timer);
                stopCamera();
            };
        } else {
            stopCamera();
        }
    }, [scanMode, startCamera, stopCamera]);

    // CSV Export Handler
    const handleExportCSV = async () => {
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(
                apiUrl(`/api/workshop/attendance/export?sessionId=${encodeURIComponent(sessionId)}`),
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Failed to generate attendance CSV');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-${sessionId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            if (showStatus) showStatus('Attendance CSV downloaded successfully! 📥');
        } catch (err) {
            alert('Export failed: ' + err.message);
        }
    };

    return (
        <div className="space-y-6 font-mono text-slate-900">
            {/* Header Banner */}
            <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-5 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-sky-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-600 border border-sky-400/30">
                            Super Admin Tool
                        </span>
                        <span className="rounded bg-emerald-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 border border-emerald-400/30">
                            Universal Scanner Engine
                        </span>
                    </div>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                        <span>Barcode Attendance Scanner</span>
                        <span className="text-xl">⚡</span>
                    </h2>
                    <p className="text-sm font-semibold text-slate-600">
                        Scan student ID card barcodes / register numbers to instantly record workshop attendance.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={fetchLiveStats}
                        disabled={isLoadingStats}
                        className="press flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-3.5 py-2 text-xs font-bold uppercase text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-50"
                        title="Refresh session attendance stats"
                    >
                        <span>🔄</span>
                        <span>{isLoadingStats ? 'Syncing...' : 'Sync Stats'}</span>
                    </button>

                    <button
                        onClick={handleExportCSV}
                        className="press flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-emerald-600 px-3.5 py-2 text-xs font-bold uppercase text-white shadow-sm hover:bg-emerald-700"
                    >
                        <span>📥</span>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Session Configuration Card */}
            <div className="rounded-xl border-2 border-slate-900 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col justify-between gap-2 border-b-2 border-slate-100 pb-3 sm:flex-row sm:items-center">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                        <span>🎯 Active Session Settings</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {scheduleList && scheduleList.length > 0 && (
                            <select
                                value={currentScheduleMatch?.id || ''}
                                onChange={(e) => {
                                    const s = scheduleList.find((item) => item.id === e.target.value);
                                    if (s) selectScheduleSession(s);
                                }}
                                className="min-w-0 max-w-full rounded border-2 border-slate-900 bg-amber-100 px-2 py-1 text-xs font-bold text-slate-950 focus:outline-none"
                            >
                                <option value="">-- Choose from {track.toUpperCase()} Schedule --</option>
                                {scheduleList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.label} ({s.dateStr}) — {s.title}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="rounded border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold">
                            Session ID: <span className="text-sky-600">{sessionId}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Track */}
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Workshop Track</label>
                        <select
                            value={track}
                            onChange={(e) => setTrack(e.target.value)}
                            className="w-full rounded-lg border-2 border-slate-900 bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="software">Software & Autonomous Systems</option>
                            <option value="powertrain">Electronics & Powertrain</option>
                        </select>
                    </div>

                    {/* Session Number */}
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Session Number</label>
                        <select
                            value={sessionNumber}
                            onChange={(e) => setSessionNumber(e.target.value)}
                            className="w-full rounded-lg border-2 border-slate-900 bg-slate-50 px-3 py-2 text-xs font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
                                <option key={num} value={num}>
                                    Session {num}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Session Date */}
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Session Date</label>
                        <input
                            type="date"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            className="w-full rounded-lg border-2 border-slate-900 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>

                    {/* Topic */}
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Session Topic (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. ROS2 Architecture & LiDAR"
                            value={sessionTopic}
                            onChange={(e) => setSessionTopic(e.target.value)}
                            className="w-full rounded-lg border-2 border-slate-900 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                </div>
            </div>

            {/* Live Stats Overview Card */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border-2 border-slate-900 bg-sky-50 p-4">
                    <div className="text-xs font-bold uppercase text-sky-800">Total Enrolled Eligible</div>
                    <div className="mt-1 text-3xl font-black text-slate-900">{stats.totalEligible}</div>
                    <div className="text-[11px] font-semibold text-sky-700">Paid candidates in this track</div>
                </div>

                <div className="rounded-xl border-2 border-slate-900 bg-emerald-50 p-4">
                    <div className="text-xs font-bold uppercase text-emerald-800">Scanned & Marked Present</div>
                    <div className="mt-1 text-3xl font-black text-emerald-700">{stats.totalPresent}</div>
                    <div className="text-[11px] font-semibold text-emerald-800">Recorded for session {sessionId}</div>
                </div>

                <div className="rounded-xl border-2 border-slate-900 bg-amber-50 p-4">
                    <div className="text-xs font-bold uppercase text-amber-800">Live Attendance Rate</div>
                    <div className="mt-1 text-3xl font-black text-amber-700">{stats.percentage}%</div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Scanner Workspace Card */}
            <div className="rounded-xl border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-xl">
                {/* Scanner Mode Controls Bar */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setScanMode('hardware')}
                            className={`press flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all ${
                                scanMode === 'hardware'
                                    ? 'bg-sky-500 text-white shadow'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            <span>⌨️</span>
                            <span>Hardware Barcode Scanner</span>
                        </button>

                        <button
                            onClick={() => setScanMode('camera')}
                            className={`press flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase transition-all ${
                                scanMode === 'camera'
                                    ? 'bg-sky-500 text-white shadow'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            <span>📷</span>
                            <span>Built-in Camera Scanner</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold">
                        {/* Audio Toggle */}
                        <button
                            onClick={() => setIsAudioMuted(!isAudioMuted)}
                            className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                            <span>{isAudioMuted ? '🔇' : '🔊'}</span>
                            <span>{isAudioMuted ? 'Sound Muted' : 'Sound ON'}</span>
                        </button>

                        {/* Auto-focus Toggle */}
                        {scanMode === 'hardware' && (
                            <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={autoFocusEnabled}
                                    onChange={(e) => setAutoFocusEnabled(e.target.checked)}
                                    className="h-4 w-4 rounded accent-sky-500"
                                />
                                <span>Auto-Focus Lock</span>
                            </label>
                        )}
                    </div>
                </div>

                {/* MODE 1: Hardware Barcode Scanner Input Form */}
                {scanMode === 'hardware' && (
                    <div className="space-y-4">
                        <form onSubmit={handleFormSubmit} className="space-y-3">
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-xl text-sky-400">
                                    <span>║▌║█║▌</span>
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Scan register number barcode here (e.g. 21EC001)..."
                                    value={scannedInput}
                                    onChange={(e) => setScannedInput(e.target.value)}
                                    disabled={isProcessingScan}
                                    className="w-full rounded-xl border-2 border-sky-500/60 bg-slate-950 py-4 pl-24 pr-32 font-mono text-lg font-black tracking-wider text-sky-400 placeholder-slate-600 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/30"
                                />
                                <button
                                    type="submit"
                                    disabled={isProcessingScan || !scannedInput.trim()}
                                    className="press absolute right-2.5 top-2.5 rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-black uppercase text-slate-950 shadow hover:bg-sky-400 disabled:opacity-50"
                                >
                                    {isProcessingScan ? 'Processing...' : 'Mark Present ↵'}
                                </button>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                                <span>⚡ Point physical USB/Bluetooth scanner at barcode and press trigger.</span>
                                <span className="text-emerald-400">● Scanner Ready & Active</span>
                            </div>
                        </form>
                    </div>
                )}

                {/* MODE 2: Built-in Camera Barcode Scanner Container */}
                {scanMode === 'camera' && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-4 border-sky-500 bg-black shadow-2xl p-1">
                            <div id="barcode-camera-container" className="w-full h-64 overflow-hidden rounded-xl bg-slate-950" />
                        </div>

                        {cameraError && (
                            <div className="w-full max-w-md rounded-lg border-2 border-red-500/50 bg-red-950/60 p-3 text-xs font-bold text-red-300 text-center">
                                ⚠️ {cameraError}
                            </div>
                        )}
                    </div>
                )}

                {/* LIVE SCAN RESULT CARD */}
                {lastResult && (
                    <div
                        className={`mt-6 rounded-2xl border-4 p-6 transition-all duration-300 ${
                            lastResult.type === 'success'
                                ? 'border-emerald-500 bg-emerald-950/80 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                                : lastResult.type === 'warning'
                                ? 'border-amber-500 bg-amber-950/80 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                                : 'border-rose-500 bg-rose-950/80 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                        }`}
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-lg ${
                                        lastResult.type === 'success'
                                            ? 'bg-emerald-500 text-slate-950'
                                            : lastResult.type === 'warning'
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-rose-500 text-white'
                                    }`}
                                >
                                    {lastResult.type === 'success' ? '✓' : lastResult.type === 'warning' ? '⚠️' : '✕'}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                                lastResult.type === 'success'
                                                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                                    : lastResult.type === 'warning'
                                                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                                    : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                            }`}
                                        >
                                            {lastResult.type === 'success'
                                                ? 'ATTENDANCE CONFIRMED'
                                                : lastResult.type === 'warning'
                                                ? 'ALREADY RECORDED'
                                                : 'STUDENT NOT FOUND / UNPAID'}
                                        </span>
                                        <span className="text-xs font-mono opacity-75">{lastResult.time}</span>
                                    </div>

                                    <h3 className="mt-1 text-2xl font-black tracking-tight">
                                        {lastResult.candidate?.name || 'Unknown Candidate'}
                                    </h3>

                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-mono font-bold">
                                        <span className="rounded bg-black/40 px-2.5 py-1 text-sky-300 border border-sky-500/30">
                                            Roll: {lastResult.candidate?.rollNo || lastResult.barcode}
                                        </span>
                                        {lastResult.candidate?.department && (
                                            <span className="opacity-90">
                                                Dept: {lastResult.candidate.department} (Yr {lastResult.candidate.year})
                                            </span>
                                        )}
                                        {lastResult.candidate?.receiptNo && (
                                            <span className="opacity-75">
                                                Receipt: #{lastResult.candidate.receiptNo}
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-2 text-xs font-semibold opacity-90">{lastResult.message}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RECENT SCANS LOG & ROSTER */}
            <div className="rounded-xl border-2 border-slate-900 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b-2 border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span>📋 Live Scan Activity Log ({recentScans.length})</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-500">Session: {sessionId}</span>
                </div>

                {recentScans.length === 0 ? (
                    <div className="py-12 text-center text-xs font-bold text-slate-400">
                        No barcodes scanned yet in this session. Point scanner to register number to begin.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="border-b-2 border-slate-900 bg-slate-100 uppercase text-slate-700">
                                <tr>
                                    <th className="px-3 py-2">Time</th>
                                    <th className="px-3 py-2">Register No</th>
                                    <th className="px-3 py-2">Student Name</th>
                                    <th className="px-3 py-2">Dept / Year</th>
                                    <th className="px-3 py-2">Package</th>
                                    <th className="px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {recentScans.map((scan, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-slate-500">{scan.time}</td>
                                        <td className="px-3 py-2 font-bold text-sky-600">{scan.candidate?.rollNo || scan.barcode}</td>
                                        <td className="px-3 py-2 font-bold text-slate-900">{scan.candidate?.name || '—'}</td>
                                        <td className="px-3 py-2 text-slate-600">
                                            {scan.candidate?.department ? `${scan.candidate.department} (Yr ${scan.candidate.year})` : '—'}
                                        </td>
                                        <td className="px-3 py-2 uppercase text-slate-600">{scan.candidate?.package || '—'}</td>
                                        <td className="px-3 py-2">
                                            {scan.type === 'success' ? (
                                                <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                                                    ✓ PRESENT
                                                </span>
                                            ) : scan.type === 'warning' ? (
                                                <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                                                    ⚠️ ALREADY PRESENT
                                                </span>
                                            ) : (
                                                <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-300">
                                                    ✕ FAILED
                                                </span>
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
    );
}
