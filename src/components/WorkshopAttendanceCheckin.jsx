import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '../lib/api';

// Persistent client-side device identifier for anti-proxy enforcement
function getOrCreateDeviceId() {
    try {
        const key = 'asterix_workshop_device_fingerprint';
        let id = localStorage.getItem(key);
        if (!id) {
            // Generate high entropy identifier
            const randomPart =
                typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
            const screenSignature = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
            id = `dev_${btoa(randomPart + screenSignature)
                .replace(/[^a-zA-Z0-9]/g, '')
                .slice(0, 32)}`;
            localStorage.setItem(key, id);
        }
        return id;
    } catch {
        return `dev_fallback_${Date.now()}`;
    }
}

export default function WorkshopAttendanceCheckin({ onGoHome }) {
    const [token, setToken] = useState('');
    const [rollNo, setRollNo] = useState(() => {
        try {
            const saved = localStorage.getItem('workshop_student');
            if (saved) return JSON.parse(saved).rollNo || '';
        } catch {}
        return '';
    });
    const [email, setEmail] = useState(() => {
        try {
            const saved = localStorage.getItem('workshop_student');
            if (saved) return JSON.parse(saved).email || '';
        } catch {}
        return '';
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);

    // Extract token from URL hash or query params
    useEffect(() => {
        const parseToken = () => {
            const hash = window.location.hash;
            let foundToken = '';

            if (hash.includes('tok=')) {
                const parts = hash.split('tok=');
                foundToken = parts[1] ? decodeURIComponent(parts[1].split('&')[0]) : '';
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                foundToken = urlParams.get('tok') || '';
            }

            setToken(foundToken);
        };

        parseToken();
        window.addEventListener('hashchange', parseToken);
        return () => window.removeEventListener('hashchange', parseToken);
    }, []);

    // Parse track preview from token format: track.sessionId.bucket.sig
    const tokenInfo = useMemo(() => {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const track = parts[0];
        const sessionId = parts[1];
        return { track, sessionId };
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanRoll = rollNo.trim().toUpperCase();
        const cleanEmail = email.trim().toLowerCase();

        if (!token) {
            setError('Missing attendance token. Please re-scan the live QR code on the screen.');
            return;
        }
        if (!cleanRoll) {
            setError('Please enter your college Roll Number.');
            return;
        }
        if (!cleanEmail || !cleanEmail.includes('@')) {
            setError('Please enter a valid registered Email address.');
            return;
        }

        setIsSubmitting(true);

        try {
            const deviceId = getOrCreateDeviceId();
            const res = await fetch(apiUrl('/api/workshop/attendance/checkin'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    rollNo: cleanRoll,
                    email: cleanEmail,
                    deviceId
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to record attendance');
            }

            setSuccessData(
                data.attendance || {
                    name: 'Student Candidate',
                    rollNo: cleanRoll,
                    track: tokenInfo?.track || 'workshop',
                    checkedInAt: new Date().toISOString()
                }
            );
        } catch (err) {
            console.error('Checkin failed:', err);
            setError(err.message || 'Could not record attendance. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSoftware = tokenInfo?.track === 'software';

    return (
        <div className="flex min-h-[100svh] flex-col items-center justify-center bg-slate-900 p-4 font-mono text-slate-100 select-none sm:p-6">
            <div className="shadow-brutal-8-brand relative w-full max-w-md border-4 border-slate-900 bg-white p-6 text-slate-900 sm:p-8">
                {/* Header Track Tag */}
                <div className="mb-5 flex items-center justify-between border-b-2 border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                        <span
                            className={`h-3 w-3 border border-slate-900 ${isSoftware ? 'bg-sky-500' : 'bg-amber-500'}`}
                        ></span>
                        <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
                            Team Asterix Workshop
                        </span>
                    </div>
                    {tokenInfo?.track && (
                        <span
                            className={`border border-slate-900 px-2 py-0.5 text-[10px] font-black uppercase ${
                                isSoftware ? 'bg-sky-100 text-sky-900' : 'bg-amber-100 text-amber-900'
                            }`}
                        >
                            {isSoftware ? 'Software Track' : 'Powertrain Track'}
                        </span>
                    )}
                </div>

                {/* SUCCESS CONFIRMATION PASS */}
                {successData ? (
                    <div className="space-y-5 py-2 text-center">
                        <div className="shadow-brutal-3 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-slate-900 bg-emerald-100">
                            <span className="text-3xl font-black text-emerald-600">✓</span>
                        </div>

                        <div>
                            <span className="border border-emerald-500 bg-emerald-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-emerald-700 uppercase">
                                Attendance Confirmed
                            </span>
                            <h2 className="mt-2 text-xl font-black text-slate-900 uppercase sm:text-2xl">
                                {successData.name}
                            </h2>
                            <p className="font-mono text-xs font-bold text-slate-600">
                                Roll No: <strong className="text-slate-900">{successData.rollNo}</strong>
                            </p>
                        </div>

                        {/* Candidate Details Card */}
                        <div className="shadow-brutal-2 space-y-1.5 border-2 border-slate-900 bg-slate-50 p-3.5 text-left font-mono text-xs">
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span className="text-[11px] text-slate-500">Track:</span>
                                <span className="font-black text-slate-900 uppercase">
                                    {successData.track}
                                </span>
                            </div>
                            {successData.department && (
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-[11px] text-slate-500">Department:</span>
                                    <span className="max-w-[200px] truncate font-bold text-slate-900">
                                        {successData.department}
                                    </span>
                                </div>
                            )}
                            {successData.year && (
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-[11px] text-slate-500">Academic Year:</span>
                                    <span className="font-bold text-slate-900">Year {successData.year}</span>
                                </div>
                            )}
                            {successData.receiptNo && (
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-[11px] text-slate-500">Receipt No:</span>
                                    <span className="font-mono font-bold text-sky-700">
                                        {successData.receiptNo}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between pt-0.5">
                                <span className="text-[11px] text-slate-500">Recorded At:</span>
                                <span className="text-[11px] font-bold text-slate-700">
                                    {new Date(successData.checkedInAt).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true
                                    })}
                                </span>
                            </div>
                        </div>

                        {onGoHome && (
                            <button
                                type="button"
                                onClick={onGoHome}
                                className="press shadow-brutal-3-brand w-full cursor-pointer border-2 border-slate-900 bg-slate-900 py-2.5 text-xs font-black text-white uppercase hover:bg-slate-800"
                            >
                                Back to Asterix Homepage ↗
                            </button>
                        )}
                    </div>
                ) : (
                    /* ATTENDANCE CHECK-IN FORM */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <h2 className="text-lg leading-tight font-black text-slate-900 uppercase sm:text-xl">
                                Session Attendance Check-in
                            </h2>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                                Enter your registered details to verify your in-person presence.
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="space-y-1 border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-800">
                                <div>⚠️ {error}</div>
                                {error.includes('expired') && (
                                    <div className="text-[11px] font-normal text-rose-600">
                                        Look at the classroom screen and scan the updated QR code.
                                    </div>
                                )}
                            </div>
                        )}

                        {!token && (
                            <div className="border-2 border-amber-600 bg-amber-50 p-3 font-mono text-xs font-bold text-amber-800">
                                ⚠️ No QR token detected. Please scan the QR code projected in class with your
                                camera.
                            </div>
                        )}

                        {/* Roll Number Input */}
                        <div>
                            <label className="mb-1 block text-[11px] font-black text-slate-700 uppercase">
                                Roll Number / Register No
                            </label>
                            <input
                                type="text"
                                required
                                value={rollNo}
                                onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                                placeholder="715526..."
                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 font-mono text-sm font-bold focus:bg-white focus:outline-none"
                            />
                        </div>

                        {/* Email Input */}
                        <div>
                            <label className="mb-1 block text-[11px] font-black text-slate-700 uppercase">
                                College Email ID
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="rollno@psgitech.ac.in"
                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 font-mono text-sm font-medium focus:bg-white focus:outline-none"
                            />
                            <span className="mt-1 block text-[10px] font-medium text-slate-500">
                                Must match the email used during workshop payment.
                            </span>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !token}
                            className={`press shadow-brutal-3 flex w-full cursor-pointer items-center justify-center gap-2 border-2 border-slate-900 py-3 text-xs font-black uppercase disabled:opacity-50 ${
                                isSoftware
                                    ? 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></span>
                                    <span>Verifying Check-In...</span>
                                </>
                            ) : (
                                <span>Record My Attendance ✓</span>
                            )}
                        </button>

                        <div className="pt-2 text-center space-y-1.5 font-mono text-[10px]">
                            <a
                                href="tel:+918608944644"
                                className="press inline-flex items-center gap-1 border border-slate-900 bg-amber-200 px-2 py-1 font-bold text-slate-950 uppercase hover:bg-amber-300"
                            >
                                📞 Attendance issue? Contact +91 86089 44644
                            </a>
                            <div className="font-bold text-slate-500">
                                Single device check-in active · Session verified
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
