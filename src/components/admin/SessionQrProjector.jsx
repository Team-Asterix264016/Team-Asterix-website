import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

/* Projector for one session created or picked in Manage Sessions. The QR names
   the session itself (or both halves of a combo session), so each scan is
   credited on the tracks that student is enrolled in, whatever the date. */

function readRef() {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const query = new URLSearchParams(hash.split('?')[1] || '');
    const jointKey = query.get('joint');
    if (jointKey) return { param: `jointKey=${encodeURIComponent(jointKey)}`, isJoint: true };
    const sessionKey = query.get('session');
    if (sessionKey) return { param: `sessionKey=${encodeURIComponent(sessionKey)}`, isJoint: false };
    return null;
}

const authHeaders = () => ({
    Authorization: `Bearer ${sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token')}`
});

const TRACK_NAMES = { software: 'Software & Perception', powertrain: 'Electronics & Powertrain' };

export default function SessionQrProjector({ onExit }) {
    const ref = useMemo(() => readRef(), []);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [sessions, setSessions] = useState([]);
    const [live, setLive] = useState({
        perTrack: [],
        totalPresent: 0,
        totalEligible: 0,
        percentage: 0,
        recentCheckins: []
    });
    const [error, setError] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const rootRef = useRef(null);

    const loadQr = useCallback(async () => {
        if (!ref) {
            setError('No session selected. Open this screen from Manage Sessions.');
            return;
        }
        try {
            const res = await fetch(apiUrl(`/api/workshop/attendance/sessions/qr?${ref.param}`), {
                headers: authHeaders()
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Server HTTP ${res.status}`);
            setSessions(data.sessions || []);
            setQrDataUrl(
                await QRCode.toDataURL(data.scanUrl, {
                    width: 1000,
                    margin: 2,
                    color: { dark: '#0f172a', light: '#ffffff' },
                    errorCorrectionLevel: 'M'
                })
            );
            setError('');
        } catch (err) {
            setError(err.message || 'Could not generate the QR code.');
        }
    }, [ref]);

    const loadLive = useCallback(async () => {
        if (!ref) return;
        try {
            const res = await fetch(apiUrl(`/api/workshop/attendance/sessions/live?${ref.param}`), {
                headers: authHeaders()
            });
            if (res.ok) setLive(await res.json());
        } catch {
            // a missed poll is retried in 3 seconds
        }
    }, [ref]);

    useEffect(() => {
        loadQr();
    }, [loadQr]);

    useEffect(() => {
        loadLive();
        const timer = setInterval(loadLive, 3000);
        return () => clearInterval(timer);
    }, [loadLive]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            rootRef.current?.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    };

    const first = sessions[0];
    const banner = ref?.isJoint
        ? 'Joint Session · Both Tracks · Scan Once'
        : first
          ? TRACK_NAMES[first.track] || first.track
          : '';

    return (
        <div
            ref={rootRef}
            className="flex min-h-[100dvh] w-full flex-col justify-center bg-slate-950 p-3 font-mono text-white select-none sm:p-5 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:p-6"
        >
            <div className="mx-auto grid w-full max-w-[1700px] grid-cols-1 items-center gap-4 lg:h-full lg:max-h-full lg:grid-cols-12 lg:gap-8 lg:overflow-hidden">
                <div className="flex flex-col items-center justify-center py-1 lg:col-span-7 lg:h-full lg:overflow-hidden xl:col-span-8">
                    <div className="shadow-brutal-10-light flex max-h-[calc(100vh-80px)] max-w-full shrink-0 flex-col items-center justify-center border-4 border-slate-900 bg-white p-3 sm:p-5 lg:p-6">
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt="Session attendance QR code"
                                className="aspect-square max-h-[65vh] w-auto object-contain sm:max-h-[72vh] lg:max-h-[78vh] xl:max-h-[82vh]"
                            />
                        ) : (
                            <div className="flex h-[260px] w-[260px] items-center justify-center text-sm font-bold text-slate-400 sm:h-[380px] sm:w-[380px]">
                                {error ? 'No QR code' : 'Generating QR Code...'}
                            </div>
                        )}
                        <div className="mt-3 flex shrink-0 items-center gap-2 border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-950 sm:text-sm">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600"></span>
                            <span>Session QR</span>
                        </div>
                    </div>
                    <p className="mt-2 text-center text-xs font-bold text-slate-200 sm:text-sm">
                        Scan with your mobile camera to check in
                    </p>
                    {error && (
                        <div className="mt-2 border border-rose-600 bg-rose-950 px-3 py-1 text-xs font-bold text-rose-300">
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-between gap-2.5 py-1 lg:col-span-5 lg:h-full lg:overflow-hidden xl:col-span-4">
                    <div className="shadow-brutal-4 shrink-0 space-y-2 border-2 border-slate-800 bg-slate-900/80 p-3">
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
                        {first && (
                            <div className="space-y-1">
                                <div className="text-sm font-black text-white">{first.title}</div>
                                <div className="text-[11px] font-bold text-slate-400">
                                    {first.label} · {first.date}
                                </div>
                            </div>
                        )}
                        {banner && (
                            <div
                                className={`border-2 border-slate-900 px-2.5 py-1 text-center text-xs font-black tracking-wider uppercase ${
                                    ref?.isJoint
                                        ? 'bg-violet-400 text-slate-950'
                                        : first?.track === 'software'
                                          ? 'bg-sky-400 text-slate-950'
                                          : 'bg-amber-400 text-slate-950'
                                }`}
                            >
                                {banner}
                            </div>
                        )}
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-2.5">
                        <div className="shadow-brutal-3-brand border-2 border-slate-800 bg-slate-900 p-3">
                            <span className="block text-[10px] font-black tracking-wider text-sky-400 uppercase">
                                Present In Class
                            </span>
                            <span className="text-2xl font-black text-white sm:text-3xl">
                                {live.totalPresent}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">
                                of {live.totalEligible} enrolled
                            </span>
                        </div>
                        <div className="shadow-brutal-3-go-bright border-2 border-slate-800 bg-slate-900 p-3">
                            <span className="block text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                                Attendance Rate
                            </span>
                            <span className="text-2xl font-black text-emerald-400 sm:text-3xl">
                                {live.percentage}%
                            </span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">quorum progress</span>
                        </div>
                    </div>

                    {live.perTrack.length > 1 && (
                        <div className="grid shrink-0 grid-cols-2 gap-2.5">
                            {live.perTrack.map((t) => (
                                <div key={t.track} className="border-2 border-slate-800 bg-slate-900 p-2">
                                    <span className="block text-[10px] font-black text-slate-300 uppercase">
                                        {t.track}
                                    </span>
                                    <span className="text-lg font-black text-white">{t.totalPresent}</span>
                                    <span className="text-[10px] text-slate-400"> / {t.totalEligible}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="shadow-brutal-4 flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden border-2 border-slate-800 bg-slate-900 p-3">
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="flex items-center gap-1.5 text-xs font-black text-slate-300 uppercase">
                                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400"></span>
                                Live Check-In Ticker
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                                {live.recentCheckins.length} recent
                            </span>
                        </div>
                        {live.recentCheckins.length === 0 ? (
                            <div className="my-auto py-4 text-center text-xs text-slate-500">
                                Awaiting student scans...
                            </div>
                        ) : (
                            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                                {live.recentCheckins.map((item, idx) => (
                                    <div
                                        key={`${item.rollNo}-${item.track}-${idx}`}
                                        className="flex items-center justify-between border border-slate-800 bg-slate-950 p-1.5 text-xs"
                                    >
                                        <div className="truncate pr-2">
                                            <div className="truncate text-[11px] font-black text-white">
                                                {item.name}
                                            </div>
                                            <div className="text-[9px] text-slate-400">
                                                {item.rollNo} · {item.department} · {item.track}
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-[9px] text-slate-500">
                                            {item.checkedInAt
                                                ? new Date(item.checkedInAt).toLocaleTimeString('en-IN', {
                                                      hour12: false
                                                  })
                                                : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
