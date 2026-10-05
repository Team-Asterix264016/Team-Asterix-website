import { useState } from 'react';
import { apiUrl } from '../lib/api';

export default function CyberNewsletterCTA({ onOpenSponsor }) {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusNote, setStatusNote] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        setStatusNote('');

        try {
            const res = await fetch(apiUrl('/api/subscribers'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone })
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                const errData = await res.json().catch(() => ({}));
                setStatusNote(errData.error || 'Failed to submit. Please try again.');
            }
        } catch {
            setSubmitted(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="subscribe" className="py-14 sm:py-24 px-4 sm:px-8 bg-sky-500 text-slate-900 border-t-4 border-slate-900 relative overflow-hidden z-10 select-none">

            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="absolute right-4 sm:right-10 top-8 text-[6rem] sm:text-[10rem] md:text-[12rem] font-black text-white/[0.12] select-none pointer-events-none font-mono leading-none z-0 will-change-transform"
                aria-hidden="true"
            >
                // 06 ALLIANCE
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="7"
                className="hidden lg:flex absolute left-6 sm:left-12 top-10 z-20 bg-white text-slate-950 border-3 border-slate-900 shadow-brutal-5 rounded-lg px-3.5 py-1.5 font-mono font-black text-[11px] uppercase tracking-wider pointer-events-none will-change-transform"
            >
                <span>✦ PADDOCK ALLIANCE</span>
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <div data-assemble="card" data-parallax="fast" data-parallax-speed="0.06" className="bg-white border-4 border-slate-900 shadow-brutal-10 p-8 sm:p-14 md:p-16 relative will-change-transform">

                    <div data-assemble="header" className="text-center mb-8 sm:mb-10">
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 uppercase leading-none tracking-tight">
                                JOIN THE
                            </h2>
                            <h2 
                                data-parallax="fast" 
                                data-parallax-speed="0.18"
                                className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-stroke-sky text-transparent uppercase leading-none tracking-tight will-change-transform"
                            >
                                ALLIANCE
                            </h2>
                        </div>
                        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-600 font-bold max-w-xl mx-auto">
                            Support Team Asterix on the national stage. Partner with us or receive live telemetry feeds, race logs, and paddock access.
                        </p>

                        {/* Dedicated Action Button to Open Full Sponsorship Portal */}
                        <div className="mt-5 sm:mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    if (onOpenSponsor) onOpenSponsor();
                                    else window.location.hash = '#sponsor';
                                }}
                                className="press cyber-button px-5 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-wider cursor-pointer shadow-brutal-3 sm:shadow-brutal-4 bg-amber-300 hover:bg-amber-400 text-slate-900 inline-flex items-center justify-center gap-2 max-w-full text-center"
                            >
                                <span>SPONSOR TEAM (VIEW FILES & DECK)</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative border-t-2 border-slate-200 pt-8 mt-8">
                        <span className="text-[11px] font-mono font-black uppercase text-slate-500 block text-center mb-4">
                            -- OR SUBSCRIBE FOR PADDOCK RACE UPDATES & NEWSLETTER --
                        </span>

                        {statusNote && (
                            <div className="mb-4 p-3 bg-rose-100 border-2 border-rose-600 text-rose-800 text-xs font-bold text-center">
                                {statusNote}
                            </div>
                        )}

                        {submitted ? (
                            <div className="p-6 bg-sky-100 border-3 border-slate-900 text-center font-black text-base text-slate-900 shadow-brutal-4">
                                ✓ THANK YOU FOR JOINING THE ASTERIX RACING ALLIANCE! WE WILL REACH OUT SHORTLY.
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
                                <input
                                    data-assemble="left"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter Your Corporate / Student Email"
                                    className="flex-1 px-5 py-4 bg-sky-50 border-3 border-slate-900 font-bold text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white focus:shadow-brutal-4-brand transition-all"
                                />
                                <input
                                    data-assemble="up"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Phone (Optional)"
                                    className="sm:w-48 px-5 py-4 bg-sky-50 border-3 border-slate-900 font-bold text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white focus:shadow-brutal-4-brand transition-all"
                                />
                                <button
                                    data-assemble="right"
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="press press-flat cyber-button px-8 py-4 text-xs font-black uppercase tracking-wider whitespace-nowrap cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmitting ? 'JOINING...' : 'SUBSCRIBE →'}
                                </button>
                            </form>
                        )}
                    </div>

                </div>
            </div>
        </section>
    );
}

