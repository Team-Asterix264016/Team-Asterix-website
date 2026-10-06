import { useState } from 'react';
import { useCommunityAuth } from '../../context/CommunityAuthContext';

export default function CommunityLoginModal() {
    const { isLoginModalOpen, setIsLoginModalOpen, loginWithRollOrPhone } = useCommunityAuth();
    const [identifier, setIdentifier] = useState('');
    const [error, setError] = useState('');

    if (!isLoginModalOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const res = loginWithRollOrPhone(identifier);
        if (!res.success) {
            setError(res.message);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
        >
            <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] max-w-md w-full p-6 sm:p-8 space-y-5 animate-pop">
                <div className="flex items-center justify-between border-b-4 border-slate-900 pb-3">
                    <div>
                        <span className="px-2 py-0.5 bg-sky-400 text-slate-900 border border-slate-900 font-mono text-[9px] font-black uppercase">
                            COMMUNITY PROFILE LOGIN
                        </span>
                        <h3 className="text-xl font-black uppercase text-slate-900 mt-1 leading-tight">
                            Access Your Progressive Profile
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsLoginModalOpen(false)}
                        className="press text-slate-400 hover:text-slate-900 font-mono font-black text-lg cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <p className="text-xs font-mono font-bold text-slate-600">
                    Enter your <strong>College Roll Number</strong> (e.g. <code className="bg-slate-100 px-1 py-0.5 border border-slate-300 text-slate-900">24ME042</code>) or <strong>Mobile Phone Number</strong> to auto-sync your workshop registrations, attendance certificates, and project submissions!
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block font-mono text-xs font-black uppercase text-slate-900 mb-1">
                            Roll Number / Mobile Phone / Email
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 24ME042 or +91 98765 43210"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full p-3 bg-slate-50 border-2 border-slate-900 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_#0f172a]"
                        />
                    </div>

                    {error && (
                        <div className="p-2.5 bg-rose-100 border-2 border-rose-600 text-rose-900 font-mono text-xs font-bold">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                        <button
                            type="submit"
                            className="press w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] cursor-pointer"
                        >
                            Sync & Access Profile →
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLoginModalOpen(false)}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs uppercase border-2 border-slate-300 cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="pt-3 border-t-2 border-slate-200 flex items-center gap-2 text-[10px] font-mono text-slate-500 font-bold">
                    <span>✓ Auto-links SAE BAJA Workshop Registration data</span>
                </div>
            </div>
        </div>
    );
}
