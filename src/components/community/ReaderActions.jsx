import { useEffect, useRef, useState } from 'react';
import { REACTIONS } from '../../lib/blogEngagement';
import {
    SHARE_TARGETS,
    postUrl,
    canShareNatively,
    shareNatively,
    scrollToElement
} from '../../lib/readerShare';

export function ShareButtons({ post, onShare }) {
    const [copied, setCopied] = useState('');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(postUrl(post.slug));
            setCopied('done');
            onShare('copy');
        } catch {
            setCopied('failed');
        }
        setTimeout(() => setCopied(''), 2500);
    };

    const button =
        'press shadow-brutal-2 inline-flex cursor-pointer items-center gap-1.5 border-2 border-slate-900 px-3 py-2 font-mono text-[11px] font-black text-slate-950 uppercase no-underline';

    return (
        <div className="flex flex-wrap gap-2">
            {SHARE_TARGETS.map((target) => (
                <a
                    key={target.channel}
                    href={target.href(post.slug, post.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onShare(target.channel)}
                    className={`${button} ${target.className}`}
                >
                    {target.label}
                </a>
            ))}
            <button type="button" onClick={copy} className={`${button} bg-amber-300 hover:bg-amber-200`}>
                {copied === 'done'
                    ? '✓ Link copied'
                    : copied === 'failed'
                      ? 'Copy from address bar'
                      : 'Copy link'}
            </button>
            {canShareNatively() && (
                <button
                    type="button"
                    onClick={() => shareNatively(post, onShare)}
                    className={`${button} bg-white hover:bg-slate-100`}
                >
                    More…
                </button>
            )}
        </div>
    );
}

export function ReactionButtons({ engagement, size = 'large' }) {
    const large = size === 'large';
    return (
        <div className={large ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'flex gap-1'}>
            {REACTIONS.map((r) => {
                const on = engagement.mine.includes(r.type);
                const count = engagement.reactions[r.type] || 0;
                return (
                    <button
                        key={r.type}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${r.label}: ${count}`}
                        title={r.label}
                        onClick={() => engagement.toggleReaction(r.type)}
                        className={`press flex cursor-pointer items-center justify-center border-2 transition-transform active:scale-90 ${
                            large ? 'flex-col gap-0.5 px-2 py-3' : 'gap-1 px-2 py-1'
                        } ${
                            on
                                ? 'shadow-brutal-2 border-slate-900 bg-amber-300'
                                : 'border-slate-300 bg-white hover:border-slate-900'
                        }`}
                    >
                        <span
                            aria-hidden="true"
                            className={large ? 'text-2xl leading-none' : 'text-base leading-none'}
                        >
                            {r.emoji}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-900 tabular-nums">
                            {count}
                        </span>
                        {large && (
                            <span className="font-mono text-[10px] font-bold text-slate-600 uppercase">
                                {r.label}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// Breaks text into sentence groups short enough that no browser voice cuts off mid-way.
function speechChunks(paragraphs) {
    const chunks = [];
    for (const text of paragraphs) {
        let current = '';
        for (const sentence of text.split(/(?<=[.!?])\s+/)) {
            if (current && current.length + sentence.length > 220) {
                chunks.push(current);
                current = sentence;
            } else {
                current = current ? `${current} ${sentence}` : sentence;
            }
        }
        if (current) chunks.push(current);
    }
    return chunks;
}

const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Reads the post aloud with the device's own voice.
export function ListenButton({ paragraphs, className = '' }) {
    const [mode, setMode] = useState('idle'); // idle | playing | paused
    const run = useRef(0);

    useEffect(
        () => () => {
            run.current += 1;
            if (speechSupported()) window.speechSynthesis.cancel();
        },
        []
    );

    if (!speechSupported() || paragraphs.length === 0) return null;
    const synth = window.speechSynthesis;

    const play = () => {
        synth.cancel();
        const id = ++run.current;
        const chunks = speechChunks(paragraphs);
        chunks.forEach((text, n) => {
            const utterance = new SpeechSynthesisUtterance(text);
            if (n === chunks.length - 1) {
                utterance.onend = () => run.current === id && setMode('idle');
            }
            synth.speak(utterance);
        });
        setMode('playing');
    };

    const stop = () => {
        run.current += 1;
        synth.cancel();
        setMode('idle');
    };

    const toggle = () => {
        if (mode === 'idle') play();
        else if (mode === 'playing') {
            synth.pause();
            setMode('paused');
        } else {
            synth.resume();
            setMode('playing');
        }
    };

    const base =
        'press cursor-pointer border-2 border-slate-900 px-3 py-1.5 font-mono text-[11px] font-black text-slate-900 uppercase';

    return (
        <span className={`inline-flex gap-1 ${className}`}>
            <button
                type="button"
                onClick={toggle}
                aria-label={mode === 'playing' ? 'Pause reading aloud' : 'Listen to this post'}
                className={`${base} ${mode === 'idle' ? 'bg-white hover:bg-slate-100' : 'bg-sky-300'}`}
            >
                {mode === 'idle' ? '🔊 Listen' : mode === 'playing' ? '❚❚ Pause' : '▶ Resume'}
            </button>
            {mode !== 'idle' && (
                <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop reading aloud"
                    className={`${base} bg-white`}
                >
                    ■
                </button>
            )}
        </span>
    );
}

/* The bar that follows the reader through the body: like, jump to comments,
   share. It hides over the header and once the full reaction panel is in view. */
export function FloatingActions({ post, engagement, commentCount, headerRef, endRef, commentsRef }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const header = headerRef.current;
        const end = endRef.current;
        if (!header || !end) return undefined;
        let headerShown = true;
        let endReached = false;
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === header) headerShown = entry.isIntersecting;
                else endReached = entry.isIntersecting || entry.boundingClientRect.top < 0;
            }
            setVisible(!headerShown && !endReached);
        });
        observer.observe(header);
        observer.observe(end);
        return () => observer.disconnect();
    }, [headerRef, endRef]);

    const liked = engagement.mine.includes('like');
    const item =
        'flex cursor-pointer items-center gap-1.5 px-3 py-2 font-mono text-xs font-black text-slate-900 hover:bg-slate-100';

    const share = async () => {
        if (!(await shareNatively(post, engagement.share))) scrollToElement(endRef.current);
    };

    return (
        <div
            className={`fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-200 ${
                visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
            }`}
            aria-hidden={!visible}
        >
            <div className="shadow-brutal-4 flex divide-x-2 divide-slate-900 border-2 border-slate-900 bg-white">
                <button
                    type="button"
                    tabIndex={visible ? 0 : -1}
                    aria-pressed={liked}
                    aria-label={`Like: ${engagement.reactions.like || 0}`}
                    onClick={() => engagement.toggleReaction('like')}
                    className={`${item} ${liked ? 'bg-amber-300 hover:bg-amber-200' : ''}`}
                >
                    <span aria-hidden="true">❤️</span>
                    <span className="tabular-nums">{engagement.reactions.like || 0}</span>
                </button>
                <button
                    type="button"
                    tabIndex={visible ? 0 : -1}
                    aria-label={`Comments: ${commentCount}`}
                    onClick={() => scrollToElement(commentsRef.current)}
                    className={item}
                >
                    <span aria-hidden="true">💬</span>
                    <span className="tabular-nums">{commentCount}</span>
                </button>
                <button type="button" tabIndex={visible ? 0 : -1} onClick={share} className={item}>
                    <span aria-hidden="true">↗</span> Share
                </button>
            </div>
        </div>
    );
}
