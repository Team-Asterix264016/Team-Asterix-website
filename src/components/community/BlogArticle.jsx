import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { safeHref } from '../../lib/safeHref';
import ArticleBody from './ArticleBody';
import { formatPostDate } from '../../lib/postDate';
import NewsletterSignup from './NewsletterSignup';

/* Thin bar across the top of the viewport showing how far through the article
   the reader is. Lenis scrolls the window, so the native scroll event fires. */
function ReadingProgress({ targetRef }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const el = targetRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight;
            const ratio = scrollable > 0 ? -rect.top / scrollable : rect.top <= 0 ? 1 : 0;
            setProgress(Math.min(1, Math.max(0, ratio)));
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [targetRef]);

    return (
        <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
            <div className="h-full origin-left bg-sky-500" style={{ transform: `scaleX(${progress})` }} />
        </div>
    );
}

export default function BlogArticle({ slug }) {
    const [state, setState] = useState({ status: 'loading', data: null, error: '' });
    const [copied, setCopied] = useState(false);
    const articleRef = useRef(null);

    // The component is keyed by slug, so it starts in 'loading'; retry resets it.
    const load = useCallback(async () => {
        try {
            const res = await fetch(apiUrl(`/api/blog/${encodeURIComponent(slug)}`));
            if (res.status === 404) {
                setState({ status: 'missing', data: null, error: '' });
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'The server did not respond. Try again in a moment.');
            setState({ status: 'ready', data, error: '' });
        } catch (err) {
            setState({
                status: 'error',
                data: null,
                error: err instanceof TypeError ? 'Network error. Check your connection.' : err.message
            });
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    const retry = () => {
        setState({ status: 'loading', data: null, error: '' });
        load();
    };

    const post = state.data?.post;

    useEffect(() => {
        if (!post) return undefined;
        const previousTitle = document.title;
        document.title = `${post.title} · Horizon · Team Asterix`;
        return () => {
            document.title = previousTitle;
        };
    }, [post]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied('done');
        } catch {
            setCopied('failed');
        }
        setTimeout(() => setCopied(false), 2500);
    };

    if (state.status === 'loading') {
        return (
            <div className="mx-auto max-w-[38rem] animate-pulse space-y-4 px-4 py-12" aria-busy="true">
                <div className="h-4 w-32 bg-slate-200" />
                <div className="h-10 w-full bg-slate-200" />
                <div className="h-10 w-3/4 bg-slate-200" />
                <div className="h-64 w-full bg-slate-200" />
            </div>
        );
    }

    if (state.status === 'missing' || state.status === 'error') {
        return (
            <div className="mx-auto max-w-[38rem] px-4 py-16 text-center">
                <h1 className="font-display text-3xl font-bold text-slate-900">
                    {state.status === 'missing' ? 'Post not found' : 'Could not load this post'}
                </h1>
                <p className="mt-3 text-slate-600">
                    {state.status === 'missing'
                        ? 'It may have been moved or unpublished.'
                        : state.error}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {state.status === 'error' && (
                        <button
                            type="button"
                            onClick={retry}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase"
                        >
                            Try again
                        </button>
                    )}
                    <a
                        href="#community"
                        className="press shadow-brutal-2 border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black text-slate-900 uppercase no-underline"
                    >
                        ← All posts
                    </a>
                </div>
            </div>
        );
    }

    const { previous, next } = state.data;
    const cover = safeHref(post.coverImage);

    return (
        <>
            <ReadingProgress targetRef={articleRef} />
            <article ref={articleRef} className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:pt-12">
                <a
                    href="#community"
                    className="font-mono text-xs font-black tracking-wider text-sky-800 uppercase no-underline hover:text-slate-900"
                >
                    ← All posts
                </a>

                <header className="mx-auto mt-6 max-w-[38rem]">
                    {post.category && (
                        <span className="inline-block border-2 border-slate-900 bg-sky-300 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950 uppercase">
                            {post.category}
                        </span>
                    )}
                    <h1 className="mt-4 font-display text-3xl leading-[1.15] font-bold text-balance text-slate-900 sm:text-[2.75rem]">
                        {post.title}
                    </h1>
                    {post.excerpt && (
                        <p className="mt-4 text-lg leading-relaxed text-pretty text-slate-600 sm:text-xl">
                            {post.excerpt}
                        </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y-2 border-slate-200 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-amber-300 font-black text-slate-900"
                            >
                                {(post.author || 'T').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">{post.author}</p>
                                {post.authorRole && (
                                    <p className="truncate text-xs text-slate-500">{post.authorRole}</p>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">
                            <time dateTime={post.publishedAt || undefined}>{formatPostDate(post.publishedAt)}</time>
                            <span aria-hidden="true"> · </span>
                            {post.readMinutes} min read
                        </p>
                        <button
                            type="button"
                            onClick={copyLink}
                            className="press ml-auto cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-[11px] font-black text-slate-900 uppercase hover:bg-slate-100"
                        >
                            {copied === 'done'
                                ? '✓ Link copied'
                                : copied === 'failed'
                                  ? 'Copy from address bar'
                                  : 'Copy link'}
                        </button>
                    </div>
                </header>

                {cover && (
                    <img
                        src={cover}
                        alt={post.coverAlt || ''}
                        style={{ objectPosition: post.coverPosition || '50% 50%' }}
                        className="mt-8 aspect-[16/9] w-full border-4 border-slate-900 object-cover"
                    />
                )}

                <ArticleBody markdown={post.body} className="mt-8" />

                {post.tags?.length > 0 && (
                    <ul className="mx-auto mt-10 flex max-w-[38rem] flex-wrap gap-2" aria-label="Tags">
                        {post.tags.map((tag) => (
                            <li
                                key={tag}
                                className="border border-slate-400 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600"
                            >
                                #{tag}
                            </li>
                        ))}
                    </ul>
                )}

                {(previous || next) && (
                    <nav
                        aria-label="More posts"
                        className="mx-auto mt-12 grid max-w-[38rem] grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                        {next ? (
                            <a
                                href={`#community/blog/${next.slug}`}
                                className="press shadow-brutal-2 block border-2 border-slate-900 bg-white p-4 no-underline hover:bg-sky-50"
                            >
                                <span className="font-mono text-[10px] font-black text-slate-500 uppercase">← Newer</span>
                                <span className="mt-1 block font-bold text-slate-900">{next.title}</span>
                            </a>
                        ) : (
                            <span className="hidden sm:block" />
                        )}
                        {previous && (
                            <a
                                href={`#community/blog/${previous.slug}`}
                                className="press shadow-brutal-2 block border-2 border-slate-900 bg-white p-4 text-right no-underline hover:bg-sky-50"
                            >
                                <span className="font-mono text-[10px] font-black text-slate-500 uppercase">Older →</span>
                                <span className="mt-1 block font-bold text-slate-900">{previous.title}</span>
                            </a>
                        )}
                    </nav>
                )}

                <div className="mx-auto mt-12 max-w-[38rem]">
                    <NewsletterSignup source="blog" />
                </div>
            </article>
        </>
    );
}
