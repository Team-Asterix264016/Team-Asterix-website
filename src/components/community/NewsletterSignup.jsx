import { useId, useState } from 'react';
import { apiUrl } from '../../lib/api';

/* Email-only subscribe box for the community page and the end of each post.
   `source` tells the admin list where the subscriber came from. */
export default function NewsletterSignup({
    source,
    title = 'Stay curious. Stay in the loop.',
    blurb = 'Latest technologies, automotive trends, and stories from the Asterix garage — delivered once or twice a month.'
}) {
    const inputId = useId();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'done' | 'error'
    const [message, setMessage] = useState('');
    // Decoy field: hidden from people, filled by bots, and the server drops those signups.
    const [trap, setTrap] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const clean = email.trim();
        if (!clean) return;

        setStatus('sending');
        setMessage('');
        try {
            const res = await fetch(apiUrl('/api/subscribers'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: clean, source, website: trap })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Could not subscribe right now. Please try again.');
            }
            setStatus('done');
            setMessage(clean);
        } catch (err) {
            setStatus('error');
            setMessage(
                err instanceof TypeError ? 'Network error. Check your connection and try again.' : err.message
            );
        }
    };

    return (
        <section
            aria-labelledby={`${inputId}-heading`}
            className="relative w-full overflow-hidden border-t-4 border-slate-900 bg-sky-50/60 p-6 sm:p-8 md:p-10 text-slate-900"
        >
            {/* Background Parallax/Technical Watermark in the Website Theme */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-6 -right-3 z-0 font-mono text-7xl font-black text-sky-900/[0.04] sm:text-8xl md:text-9xl select-none"
            >
                // DISPATCH
            </div>

            {/* Subtle Motorsport Racing Stripe Detail */}
            <div className="relative z-10 mb-6 flex h-1 w-28 items-center gap-1.5" aria-hidden="true">
                <div className="h-full w-14 bg-sky-500" />
                <div className="h-full w-3 bg-slate-900" />
                <div className="h-full w-7 bg-sky-300" />
            </div>

            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2">
                        <span className="border-2 border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-slate-950 uppercase">
                            DIRECT DISPATCH
                        </span>
                        <span className="font-mono text-[11px] font-bold tracking-wider text-sky-800 uppercase">
                            // HORIZON ARCHIVE
                        </span>
                    </div>
                    <h2
                        id={`${inputId}-heading`}
                        className="font-display mt-3 text-2xl font-black tracking-tight text-slate-900 uppercase sm:text-3xl"
                    >
                        {title}
                    </h2>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-slate-700 sm:text-base">
                        {blurb}
                    </p>
                </div>

                <div className="w-full md:w-auto md:max-w-md md:min-w-[340px]">
                    {status === 'done' ? (
                        <div
                            role="status"
                            className="border-2 border-slate-900 bg-sky-100 p-4 font-mono text-xs text-slate-950"
                        >
                            <p className="font-black text-sky-950 uppercase">// SUBSCRIBED SUCCESSFULLY //</p>
                            <p className="mt-1 text-slate-700">
                                Updates will be sent to {message}. You can unsubscribe anytime.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div
                                aria-hidden="true"
                                className="absolute -left-[9999px] h-px w-px overflow-hidden"
                            >
                                <label>
                                    Website
                                    <input
                                        type="text"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={trap}
                                        onChange={(e) => setTrap(e.target.value)}
                                    />
                                </label>
                            </div>

                            <label htmlFor={inputId} className="sr-only">
                                Email address
                            </label>

                            <div className="flex flex-col gap-2.5 sm:flex-row">
                                <input
                                    id={inputId}
                                    type="email"
                                    required
                                    autoComplete="email"
                                    inputMode="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    className="h-11 w-full border-2 border-slate-900 bg-white px-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="press h-11 shrink-0 cursor-pointer border-2 border-slate-900 bg-sky-400 px-6 font-mono text-xs font-black tracking-wider text-slate-950 uppercase transition-colors hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60"
                                >
                                    {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
                                </button>
                            </div>
                        </form>
                    )}

                    <p
                        aria-live="polite"
                        className="mt-2 min-h-[1.25rem] font-mono text-xs font-bold text-rose-700"
                    >
                        {status === 'error' ? message : ''}
                    </p>

                    <p className="font-mono text-[11px] font-bold text-slate-600">
                        // NO SPAM · 1–2 DISPATCHES PER MONTH · UNSUBSCRIBE ANYTIME
                    </p>
                </div>
            </div>
        </section>
    );
}
