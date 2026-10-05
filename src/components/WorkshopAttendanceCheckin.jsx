import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '../lib/api';

// Persistent client-side device identifier for anti-proxy enforcement
function getOrCreateDeviceId() {
    try {
        const key = 'asterix_workshop_device_fingerprint';
        let id = localStorage.getItem(key);
        if (!id) {
            // Generate high entropy identifier
            const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
            const screenSignature = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
            id = `dev_${btoa(randomPart + screenSignature).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}`;
            localStorage.setItem(key, id);
        }
        return id;
    } catch {
        return `dev_fallback_${Date.now()}`;
    }
}

export default function WorkshopAttendanceCheckin({ onGoHome }) {
    const [token, setToken] = useState('');
    const [rollNo, setRollNo] = useState('715526');
    const [email, setEmail] = useState('@psgitech.ac.in');
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

            setSuccessData(data.attendance || {
                name: 'Student Candidate',
                rollNo: cleanRoll,
                track: tokenInfo?.track || 'workshop',
                checkedInAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Checkin failed:', err);
            setError(err.message || 'Could not record attendance. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSoftware = tokenInfo?.track === 'software';

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-mono flex flex-col justify-center items-center p-4 sm:p-6 select-none">
            <div className="max-w-md w-full bg-white border-4 border-slate-900 shadow-brutal-8-brand text-slate-900 p-6 sm:p-8 relative">
                
                {/* Header Track Tag */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-5">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 border border-slate-900 ${isSoftware ? 'bg-sky-500' : 'bg-amber-500'}`}></span>
                        <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                            Team Asterix Workshop
                        </span>
                    </div>
                    {tokenInfo?.track && (
                        <span className={`px-2 py-0.5 border border-slate-900 text-[10px] font-black uppercase ${
                            isSoftware ? 'bg-sky-100 text-sky-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                            {isSoftware ? 'Software Track' : 'Powertrain Track'}
                        </span>
                    )}
                </div>

                {/* SUCCESS CONFIRMATION PASS */}
                {successData ? (
                    <div className="space-y-5 text-center py-2">
                        <div className="w-16 h-16 bg-emerald-100 border-4 border-slate-900 rounded-full flex items-center justify-center mx-auto shadow-brutal-3">
                            <span className="text-3xl font-black text-emerald-600">✓</span>
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-1 border border-emerald-500">
                                Attendance Confirmed
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase mt-2">
                                {successData.name}
                            </h2>
                            <p className="text-xs font-bold text-slate-600 font-mono">
                                Roll No: <strong className="text-slate-900">{successData.rollNo}</strong>
                            </p>
                        </div>

                        {/* Candidate Details Card */}
                        <div className="p-3.5 bg-slate-50 border-2 border-slate-900 text-left text-xs font-mono space-y-1.5 shadow-brutal-2">
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                                <span className="text-slate-500 text-[11px]">Track:</span>
                                <span className="font-black text-slate-900 uppercase">{successData.track}</span>
                            </div>
                            {successData.department && (
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-slate-500 text-[11px]">Department:</span>
                                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{successData.department}</span>
                                </div>
                            )}
                            {successData.year && (
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-slate-500 text-[11px]">Academic Year:</span>
                                    <span className="font-bold text-slate-900">Year {successData.year}</span>
                                </div>
                            )}
                            {successData.receiptNo && (
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="text-slate-500 text-[11px]">Receipt No:</span>
                                    <span className="font-mono font-bold text-sky-700">{successData.receiptNo}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-0.5">
                                <span className="text-slate-500 text-[11px]">Recorded At:</span>
                                <span className="font-bold text-slate-700 text-[11px]">
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
                                className="press w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase border-2 border-slate-900 shadow-brutal-3-brand cursor-pointer"
                            >
                                Back to Asterix Homepage ↗
                            </button>
                        )}
                    </div>
                ) : (
                    /* ATTENDANCE CHECK-IN FORM */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-black uppercase text-slate-900 leading-tight">
                                Session Attendance Check-in
                            </h2>
                            <p className="text-[11px] font-bold text-slate-500 mt-1">
                                Enter your registered details to verify your in-person presence.
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="p-3 bg-rose-50 border-2 border-rose-600 text-rose-800 font-mono text-xs font-bold space-y-1">
                                <div>⚠️ {error}</div>
                                {error.includes('expired') && (
                                    <div className="text-[11px] text-rose-600 font-normal">
                                        Look at the classroom screen and scan the updated QR code.
                                    </div>
                                )}
                            </div>
                        )}

                        {!token && (
                            <div className="p-3 bg-amber-50 border-2 border-amber-600 text-amber-800 font-mono text-xs font-bold">
                                ⚠️ No QR token detected. Please scan the QR code projected in class with your camera.
                            </div>
                        )}

                        {/* Roll Number Input */}
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                                Roll Number / Register No
                            </label>
                            <input
                                type="text"
                                required
                                value={rollNo}
                                onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                                placeholder="715526..."
                                className="w-full px-3 py-2 border-2 border-slate-900 font-mono text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none"
                            />
                        </div>

                        {/* Email Input */}
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                                College Email ID
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="rollno@psgitech.ac.in"
                                className="w-full px-3 py-2 border-2 border-slate-900 font-mono text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-medium block mt-1">
                                Must match the email used during workshop payment.
                            </span>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !token}
                            className={`press w-full py-3 border-2 border-slate-900 font-black text-xs uppercase shadow-brutal-3 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ${
                                isSoftware
                                    ? 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                                    <span>Verifying Check-In...</span>
                                </>
                            ) : (
                                <span>Record My Attendance ✓</span>
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <span className="text-[10px] text-slate-500 font-bold">
                                Single device check-in active · Session verified
                            </span>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
