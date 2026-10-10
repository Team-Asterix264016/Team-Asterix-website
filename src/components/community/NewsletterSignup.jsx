import { useId, useState } from 'react';
import { apiUrl } from '../../lib/api';

/* Email-only subscribe box for the community page and the end of each post.
   `source` tells the admin list where the subscriber came from. */
export default function NewsletterSignup({
    source,
    title = 'Get new posts by email',
    blurb = 'Engineering write-ups from the Team Asterix garage, straight to your inbox. No spam.'
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
            setMessage(`Subscribed. New posts will reach ${clean}.`);
        } catch (err) {
            setStatus('error');
            setMessage(
                err instanceof TypeError
                    ? 'Network error. Check your connection and try again.'
                    : err.message
            );
        }
    };

    return (
        <section className="shadow-brutal-4 border-4 border-slate-900 bg-amber-100 p-5 sm:p-6">
            <h2 className="text-lg leading-tight font-black text-slate-900 uppercase sm:text-xl">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{blurb}</p>

            {status === 'done' ? (
                <p
                    role="status"
                    className="mt-4 border-2 border-emerald-700 bg-emerald-50 px-3 py-2 font-mono text-xs font-bold text-emerald-900"
                >
                    ✓ {message}
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
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
                    <input
                        id={inputId}
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="min-w-0 flex-1 border-2 border-slate-900 bg-white px-3 py-2.5 font-mono text-base focus:outline-none sm:text-sm focus-visible:ring-2 focus-visible:ring-sky-500"
                    />
                    <button
                        type="submit"
                        disabled={status === 'sending'}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-2.5 font-mono text-xs font-black text-white uppercase hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                    >
                        {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
                    </button>
                </form>
            )}

            <p aria-live="polite" className="mt-2 min-h-[1rem] font-mono text-[11px] font-bold text-rose-700">
                {status === 'error' ? message : ''}
            </p>
        </section>
    );
}
