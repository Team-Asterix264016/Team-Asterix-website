import { useState } from 'react';
import { apiUrl } from '../lib/api';
import { useCommunityAuth } from '../context/CommunityAuthContext';

export default function WorkshopLoginModal({ isOpen, onClose, onSuccess }) {
    const communityAuth = useCommunityAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = identifier.trim();
        const pwd = password.trim();
        if (!trimmed) {
            setError('Please enter your Mobile Number or Email ID.');
            return;
        }
        if (!pwd) {
            setError('Please enter your password. (Initial default password is "asterix")');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(apiUrl('/api/workshop/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: trimmed, password: pwd })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || 'Authentication failed. Please check your credentials.');
                setLoading(false);
                return;
            }

            // Save JWT token & student profile in localStorage
            localStorage.setItem('workshop_jwt', data.token);
            localStorage.setItem('workshop_student', JSON.stringify(data.student));

            // Sync with persistent Community Profile
            if (communityAuth?.loginWithRollOrPhone) {
                communityAuth.loginWithRollOrPhone(trimmed);
            }

            setLoading(false);
            if (onSuccess) onSuccess(data.student, data.token);
            if (onClose) onClose();
        } catch (err) {
            console.error('Login error:', err);
            setError('Server communication error. Please check your network and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="shadow-brutal-6 relative w-full max-w-md border-4 border-slate-900 bg-white p-6">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="press tap-sq absolute top-4 right-4 flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-amber-300 font-mono text-sm font-black text-slate-900 hover:bg-amber-400"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="space-y-1">
                    <span className="font-mono text-xs font-black tracking-widest text-sky-600 uppercase">
                        🔒 PAID ATTENDEE PORTAL ACCESS
                    </span>
                    <h3 className="text-xl font-black text-slate-900 uppercase sm:text-2xl">
                        Workshop Student Login
                    </h3>
                    <p className="text-xs font-bold text-slate-600">
                        Enter your Mobile Number or Email ID + Profile Password to generate your access token
                        (JWT).
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {error && (
                        <div className="border-2 border-red-600 bg-red-50 p-3 font-mono text-xs font-bold text-red-700">
                            ⚠️ {error}
                        </div>
                    )}

                    <div>
                        <label className="block font-mono text-xs font-black text-slate-900 uppercase">
                            Mobile Number / Email ID *
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="e.g. 9876543210 or rollno@psgitech.ac.in"
                            className="mt-1 w-full border-2 border-slate-900 bg-slate-50 p-3 font-mono text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-xs font-black text-slate-900 uppercase">
                            Password *
                        </label>
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password (Initial default: asterix)"
                                className="w-full border-2 border-slate-900 bg-slate-50 p-3 pr-16 font-mono text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="press press-y tap-sq absolute top-1/2 right-2 -translate-y-1/2 border border-slate-900 bg-white px-2 py-1 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-slate-100"
                            >
                                {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                            </button>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-slate-500">
                            💡 Initial default password is{' '}
                            <strong className="font-black text-slate-900">asterix</strong> unless you have
                            changed it.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`press shadow-brutal-4-brand flex w-full items-center justify-center gap-2 border-2 border-slate-900 py-3 font-mono text-sm font-black uppercase transition-all ${
                            loading
                                ? 'cursor-not-allowed bg-slate-300 text-slate-600'
                                : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
                        }`}
                    >
                        {loading ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-transparent"></span>
                                <span>Verifying Paid Access...</span>
                            </>
                        ) : (
                            <>
                                <span>🔑 Authenticate &amp; Access Workshop</span>
                                <span>→</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-4 border-t-2 border-slate-200 pt-3 text-center font-mono text-[11px] text-slate-500">
                    Need help? Contact Team Asterix at{' '}
                    <strong className="text-slate-800">software.asterix@psgitech.ac.in</strong>
                </div>
            </div>
        </div>
    );
}
