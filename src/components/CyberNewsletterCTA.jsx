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
        <section
            id="subscribe"
            className="relative z-10 overflow-hidden border-t-4 border-slate-900 bg-sky-500 px-4 py-14 text-slate-900 select-none sm:px-8 sm:py-24"
        >
            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="pointer-events-none absolute top-8 right-4 z-0 font-mono text-[6rem] leading-none font-black text-white/[0.12] will-change-transform select-none sm:right-10 sm:text-[10rem] md:text-[12rem]"
                aria-hidden="true"
            >
                // 06 ALLIANCE
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="7"
                className="shadow-brutal-5 pointer-events-none absolute top-10 left-6 z-20 hidden rounded-lg border-3 border-slate-900 bg-white px-3.5 py-1.5 font-mono text-[11px] font-black tracking-wider text-slate-950 uppercase will-change-transform sm:left-12 lg:flex"
            >
                <span>✦ PADDOCK ALLIANCE</span>
            </div>

            <div className="relative z-10 mx-auto max-w-5xl">
                <div
                    data-assemble="card"
                    data-parallax="fast"
                    data-parallax-speed="0.06"
                    className="shadow-brutal-10 relative border-4 border-slate-900 bg-white p-8 will-change-transform sm:p-14 md:p-16"
                >
                    <div data-assemble="header" className="mb-8 text-center sm:mb-10">
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            <h2 className="text-3xl leading-none font-black tracking-tight text-slate-900 uppercase sm:text-5xl md:text-6xl lg:text-7xl">
                                JOIN THE
                            </h2>
                            <h2
                                data-parallax="fast"
                                data-parallax-speed="0.18"
                                className="text-stroke-sky text-3xl leading-none font-black tracking-tight text-transparent uppercase will-change-transform sm:text-5xl md:text-6xl lg:text-7xl"
                            >
                                ALLIANCE
                            </h2>
                        </div>
                        <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-slate-600 sm:mt-4 sm:text-lg">
                            Support Team Asterix on the national stage. Partner with us or receive live
                            telemetry feeds, race logs, and paddock access.
                        </p>

                        {/* Dedicated Action Button to Open Full Sponsorship Portal */}
                        <div className="mt-5 sm:mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    if (onOpenSponsor) onOpenSponsor();
                                    else window.location.hash = '#sponsor';
                                }}
                                className="press cyber-button shadow-brutal-3 sm:shadow-brutal-4 inline-flex max-w-full cursor-pointer items-center justify-center gap-2 bg-amber-300 px-5 py-3 text-center text-xs font-black tracking-wider text-slate-900 uppercase hover:bg-amber-400 sm:px-8 sm:py-4 sm:text-sm"
                            >
                                <span>SPONSOR TEAM (VIEW FILES & DECK)</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative mt-8 border-t-2 border-slate-200 pt-8">
                        <span className="mb-4 block text-center font-mono text-[11px] font-black text-slate-500 uppercase">
                            -- OR SUBSCRIBE FOR PADDOCK RACE UPDATES & NEWSLETTER --
                        </span>

                        {statusNote && (
                            <div className="mb-4 border-2 border-rose-600 bg-rose-100 p-3 text-center text-xs font-bold text-rose-800">
                                {statusNote}
                            </div>
                        )}

                        {submitted ? (
                            <div className="shadow-brutal-4 border-3 border-slate-900 bg-sky-100 p-6 text-center text-base font-black text-slate-900">
                                ✓ THANK YOU FOR JOINING THE ASTERIX RACING ALLIANCE! WE WILL REACH OUT
                                SHORTLY.
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row"
                            >
                                <input
                                    data-assemble="left"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter Your Corporate / Student Email"
                                    className="focus:shadow-brutal-4-brand flex-1 border-3 border-slate-900 bg-sky-50 px-5 py-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-500 focus:bg-white focus:outline-none"
                                />
                                <input
                                    data-assemble="up"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Phone (Optional)"
                                    className="focus:shadow-brutal-4-brand border-3 border-slate-900 bg-sky-50 px-5 py-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-500 focus:bg-white focus:outline-none sm:w-48"
                                />
                                <button
                                    data-assemble="right"
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="press press-flat cyber-button cursor-pointer px-8 py-4 text-xs font-black tracking-wider whitespace-nowrap uppercase disabled:opacity-50"
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
