import { useState } from 'react';
import { apiUrl } from '../../lib/api';

/* Landing page for the signed link in our emails. It asks for a click instead of
   unsubscribing on load, because mail scanners open links before people do. */
export default function UnsubscribePanel({ email, token }) {
    const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'done' | 'error'
    const [message, setMessage] = useState('');
    const hasLink = Boolean(email && token);

    const unsubscribe = async () => {
        setStatus('sending');
        setMessage('');
        try {
            const res = await fetch(apiUrl('/api/subscribers/unsubscribe'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not unsubscribe right now. Please try again.');
            setStatus('done');
        } catch (err) {
            setStatus('error');
            setMessage(
                err instanceof TypeError ? 'Network error. Check your connection and try again.' : err.message
            );
        }
    };

    return (
        <div className="mx-auto max-w-lg px-4 py-14">
            <div className="shadow-brutal-6 border-4 border-slate-900 bg-white p-6 sm:p-8">
                <h1 className="font-display text-3xl font-bold text-slate-900">Unsubscribe</h1>

                {!hasLink && (
                    <p className="mt-3 leading-relaxed text-slate-700">
                        To unsubscribe, open the link at the bottom of one of our emails, or reply to the email and
                        ask us to remove you.
                    </p>
                )}

                {hasLink && status === 'done' && (
                    <div role="status" className="mt-3 space-y-3 leading-relaxed text-slate-700">
                        <p>
                            You are unsubscribed. <strong className="break-all text-slate-900">{email}</strong> will
                            not get newsletters or announcements from Team Asterix any more.
                        </p>
                        <p className="text-sm">
                            Changed your mind?{' '}
                            <a href="#community" className="font-semibold text-sky-700 underline">
                                Subscribe again from the community page
                            </a>
                            .
                        </p>
                    </div>
                )}

                {hasLink && status !== 'done' && (
                    <>
                        <p className="mt-3 leading-relaxed text-slate-700">
                            Stop newsletters and announcements from Team Asterix to{' '}
                            <strong className="break-all text-slate-900">{email}</strong>?
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={unsubscribe}
                                disabled={status === 'sending'}
                                className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-2.5 font-mono text-xs font-black text-white uppercase hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                            >
                                {status === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}
                            </button>
                            <a
                                href="#community"
                                className="press press-flat border-2 border-slate-900 bg-white px-5 py-2.5 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-slate-100"
                            >
                                Keep me subscribed
                            </a>
                        </div>
                        {status === 'error' && (
                            <p role="alert" className="mt-3 font-mono text-xs font-bold text-rose-700">
                                {message}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
