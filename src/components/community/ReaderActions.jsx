import { useEffect, useRef, useState } from 'react';
import {
    PiThumbsUp,
    PiThumbsUpFill,
    PiLightbulb,
    PiLightbulbFill,
    PiFire,
    PiFireFill,
    PiHandsClapping,
    PiHandsClappingFill,
    PiWhatsappLogo,
    PiLinkedinLogo,
    PiXLogo,
    PiLink,
    PiCheck,
    PiShareNetwork,
    PiChatCircle,
    PiSpeakerHigh,
    PiPause,
    PiPlay,
    PiStop
} from 'react-icons/pi';
import { REACTIONS } from '../../lib/blogEngagement';
import {
    SHARE_TARGETS,
    postUrl,
    canShareNatively,
    shareNatively,
    scrollToElement
} from '../../lib/readerShare';

// Outline icon at rest, filled once this reader has reacted.
const REACTION_ICONS = {
    like: [PiThumbsUp, PiThumbsUpFill],
    insightful: [PiLightbulb, PiLightbulbFill],
    fire: [PiFire, PiFireFill],
    clap: [PiHandsClapping, PiHandsClappingFill]
};

const SHARE_ICONS = { whatsapp: PiWhatsappLogo, linkedin: PiLinkedinLogo, x: PiXLogo };

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const iconButton = `inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 ${focusRing}`;

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

    return (
        <div className="flex flex-wrap items-center gap-2">
            {SHARE_TARGETS.map((target) => {
                const Icon = SHARE_ICONS[target.channel];
                return (
                    <a
                        key={target.channel}
                        href={target.href(post.slug, post.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onShare(target.channel)}
                        aria-label={`Share on ${target.label}`}
                        title={`Share on ${target.label}`}
                        className={iconButton}
                    >
                        <Icon aria-hidden="true" className="h-5 w-5" />
                    </a>
                );
            })}
            <button
                type="button"
                onClick={copy}
                className={`inline-flex h-10 cursor-pointer items-center gap-2 border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 ${focusRing}`}
            >
                {copied === 'done' ? (
                    <PiCheck aria-hidden="true" className="h-[18px] w-[18px] text-emerald-700" />
                ) : (
                    <PiLink aria-hidden="true" className="h-[18px] w-[18px]" />
                )}
                <span aria-live="polite">
                    {copied === 'done'
                        ? 'Link copied'
                        : copied === 'failed'
                          ? 'Copy from the address bar'
                          : 'Copy link'}
                </span>
            </button>
            {canShareNatively() && (
                <button
                    type="button"
                    onClick={() => shareNatively(post, onShare)}
                    aria-label="More ways to share"
                    title="More ways to share"
                    className={iconButton}
                >
                    <PiShareNetwork aria-hidden="true" className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}

export function ReactionButtons({ engagement }) {
    return (
        <div className="flex flex-wrap gap-2">
            {REACTIONS.map((r) => {
                const on = engagement.mine.includes(r.type);
                const count = engagement.reactions[r.type] || 0;
                const [Outline, Filled] = REACTION_ICONS[r.type];
                const Icon = on ? Filled : Outline;
                return (
                    <button
                        key={r.type}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${r.label}${count ? `, ${count}` : ''}`}
                        onClick={() => engagement.toggleReaction(r.type)}
                        className={`inline-flex h-10 cursor-pointer items-center gap-2 border px-3.5 text-sm font-medium transition-colors ${focusRing} ${
                            on
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900'
                        }`}
                    >
                        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                        <span>{r.label}</span>
                        {count > 0 && (
                            <span className={`tabular-nums ${on ? 'text-slate-300' : 'text-slate-400'}`}>
                                {count}
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
                <span className="inline-flex items-center gap-1.5">
                    {mode === 'idle' ? (
                        <PiSpeakerHigh aria-hidden="true" className="h-4 w-4" />
                    ) : mode === 'playing' ? (
                        <PiPause aria-hidden="true" className="h-4 w-4" />
                    ) : (
                        <PiPlay aria-hidden="true" className="h-4 w-4" />
                    )}
                    {mode === 'idle' ? 'Listen' : mode === 'playing' ? 'Pause' : 'Resume'}
                </span>
            </button>
            {mode !== 'idle' && (
                <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop reading aloud"
                    className={`${base} bg-white`}
                >
                    <PiStop aria-hidden="true" className="h-4 w-4" />
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
    const LikeIcon = liked ? PiThumbsUpFill : PiThumbsUp;
    const item = `flex cursor-pointer items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 ${focusRing}`;

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
            <div className="flex divide-x divide-slate-200 border border-slate-300 bg-white shadow-lg">
                <button
                    type="button"
                    tabIndex={visible ? 0 : -1}
                    aria-pressed={liked}
                    aria-label={`Like: ${engagement.reactions.like || 0}`}
                    onClick={() => engagement.toggleReaction('like')}
                    className={`${item} ${liked ? 'text-slate-900' : ''}`}
                >
                    <LikeIcon aria-hidden="true" className="h-[18px] w-[18px]" />
                    <span className="tabular-nums">{engagement.reactions.like || 0}</span>
                </button>
                <button
                    type="button"
                    tabIndex={visible ? 0 : -1}
                    aria-label={`Comments: ${commentCount}`}
                    onClick={() => scrollToElement(commentsRef.current)}
                    className={item}
                >
                    <PiChatCircle aria-hidden="true" className="h-[18px] w-[18px]" />
                    <span className="tabular-nums">{commentCount}</span>
                </button>
                <button type="button" tabIndex={visible ? 0 : -1} onClick={share} className={item}>
                    <PiShareNetwork aria-hidden="true" className="h-[18px] w-[18px]" /> Share
                </button>
            </div>
        </div>
    );
}
