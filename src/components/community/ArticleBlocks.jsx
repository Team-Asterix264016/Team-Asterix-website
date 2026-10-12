import { useEffect, useState } from 'react';

// Interactive pieces of an article body, drawn by src/lib/renderMarkdown.jsx.

export function CodeBlock({ text }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* Clipboard blocked; the code can still be selected by hand. */
        }
    };

    return (
        <div className="group relative my-6">
            <pre className="overflow-x-auto border-2 border-slate-900 bg-slate-900 p-4 pr-16 font-mono text-[13px] leading-relaxed text-slate-100">
                <code>{text}</code>
            </pre>
            <button
                type="button"
                onClick={copy}
                className="absolute top-2 right-2 cursor-pointer border border-slate-500 bg-slate-800 px-2 py-1 font-mono text-[10px] font-bold text-slate-200 uppercase hover:border-white hover:text-white"
            >
                {copied ? '✓ Copied' : 'Copy'}
            </button>
        </div>
    );
}

// An article image that opens full size, so diagrams and photos can be read on a phone.
export function ZoomFigure({ alt, src }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <figure className="my-8">
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={alt ? `Enlarge image: ${alt}` : 'Enlarge image'}
                className="block w-full cursor-zoom-in"
            >
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    className="w-full border-2 border-slate-900"
                />
            </button>
            {alt && <figcaption className="mt-2 text-center text-sm text-slate-500">{alt}</figcaption>}
            {open && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={alt || 'Image'}
                    onClick={() => setOpen(false)}
                    data-lenis-prevent
                    className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-slate-950/90 p-4"
                >
                    <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        autoFocus
                        className="absolute top-4 right-4 cursor-pointer border-2 border-white bg-slate-900 px-3 py-1.5 font-mono text-xs font-black text-white uppercase"
                    >
                        Close ✕
                    </button>
                </div>
            )}
        </figure>
    );
}

// Shown where no live poll is wired in, such as the editor preview.
export function StaticPoll({ poll }) {
    return (
        <div className="my-8 border-2 border-slate-900 bg-white p-5">
            <p className="font-mono text-[10px] font-black text-violet-700 uppercase">📊 Poll</p>
            <p className="font-display mt-1 text-lg font-bold text-slate-900">{poll.question}</p>
            <ul className="mt-3 space-y-2">
                {poll.options.map((option, n) => (
                    <li key={n} className="border-2 border-slate-300 px-3 py-2 text-base text-slate-700">
                        {option}
                    </li>
                ))}
            </ul>
            <p className="mt-3 font-mono text-[10px] text-slate-500">
                Readers vote here once the post is live.
            </p>
        </div>
    );
}
