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
            className="relative w-full overflow-hidden border-3 border-black bg-white p-6 sm:p-8 md:p-10 text-slate-900 shadow-[6px_6px_0px_#000]"
        >
            {/* Background Parallax/Technical Watermark */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-6 -right-3 z-0 font-mono text-7xl font-black text-slate-100 sm:text-8xl md:text-9xl select-none"
            >
                // DISPATCH
            </div>

            {/* Subtle Motorsport Racing Stripe Detail */}
            <div className="relative z-10 mb-6 flex h-1 w-28 items-center gap-1.5" aria-hidden="true">
                <div className="h-full w-14 bg-[#ffe500]" />
                <div className="h-full w-3 bg-black" />
                <div className="h-full w-7 bg-sky-500" />
            </div>

            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2">
                        <span className="border-2 border-black bg-[#ffe500] px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-black uppercase shadow-[1.5px_1.5px_0px_#000]">
                            DIRECT DISPATCH
                        </span>
                        <span className="font-mono text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                            // HORIZON ARCHIVE
                        </span>
                    </div>
                    <h2
                        id={`${inputId}-heading`}
                        className="font-display mt-3 text-2xl font-black tracking-tight text-slate-950 uppercase sm:text-3xl"
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
                            className="border-2 border-black bg-[#ffe500] p-4 font-mono text-xs text-black shadow-[3px_3px_0px_#000]"
                        >
                            <p className="font-black text-black uppercase">// SUBSCRIBED SUCCESSFULLY //</p>
                            <p className="mt-1 text-slate-900">
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
                                    className="h-11 w-full border-2 border-black bg-slate-50 px-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-black focus:bg-white focus:outline-none transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="press h-11 shrink-0 cursor-pointer border-2 border-black bg-[#ffe500] px-6 font-mono text-xs font-black tracking-wider text-black uppercase transition-colors hover:bg-yellow-400 disabled:cursor-wait disabled:opacity-60 shadow-[2px_2px_0px_#000]"
                                >
                                    {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
                                </button>
                            </div>
                        </form>
                    )}

                    <p
                        aria-live="polite"
                        className="mt-2 min-h-[1.25rem] font-mono text-xs font-bold text-rose-600"
                    >
                        {status === 'error' ? message : ''}
                    </p>

                    <p className="font-mono text-[11px] font-bold text-slate-500">
                        // NO SPAM · 1–2 DISPATCHES PER MONTH · UNSUBSCRIBE ANYTIME
                    </p>
                </div>
            </div>
        </section>
    );
}
