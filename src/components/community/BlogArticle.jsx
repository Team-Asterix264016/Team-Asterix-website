import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { safeHref } from '../../lib/safeHref';
import { parseBlocks, outline, spokenText } from '../../lib/markdownBlocks';
import { useReadingTracker } from '../../hooks/useReadingTracker';
import ArticleBody from './ArticleBody';
import { formatPostDate } from '../../lib/postDate';
import NewsletterSignup from './NewsletterSignup';
import { useEngagement } from './useEngagement';
import PostPoll from './PostPoll';
import CommentsSection from './CommentsSection';
import { Takeaways, TableOfContents, RelatedPosts } from './ArticleExtras';
import { ReactionButtons, ShareButtons, ListenButton, FloatingActions } from './ReaderActions';
import { shareNatively, scrollToElement } from '../../lib/readerShare';
import { renderInline } from '../../lib/renderMarkdown';
import { PiThumbsUp, PiThumbsUpFill, PiChatCircle, PiShareNetwork } from 'react-icons/pi';

/* Thin bar across the top of the viewport showing how far through the post
   body the reader is. Lenis scrolls the window, so the native scroll event fires. */
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

const headerButton =
    'press cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-[11px] font-black text-slate-900 uppercase hover:bg-slate-100';

/* Desktop sidebar companion: sticky table of contents with scroll spy,
   author card, key takeaways, and quick interaction buttons. */
function DesktopSidebar({
    post,
    headings,
    activeHeadingId,
    spoken,
    engagement,
    commentCount,
    commentsRef,
    endRef,
    share
}) {
    const liked = engagement.mine.includes('like');

    return (
        <aside
            data-lenis-prevent
            className="hidden lg:block w-80 shrink-0 sticky top-6 self-start space-y-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1"
        >
            {/* Author & Audio Card */}
            <div className="border-4 border-slate-900 bg-white p-5 shadow-brutal-4">
                <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                    AUTHOR & DISPATCH
                </span>
                <div className="mt-3.5 flex items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-amber-300 font-mono text-base font-black text-slate-900 shadow-brutal-2"
                    >
                        {(post.author || 'T').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-slate-900">{post.author}</p>
                        {post.authorRole && (
                            <p className="truncate font-mono text-xs text-slate-500">{post.authorRole}</p>
                        )}
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t-2 border-slate-100 pt-3 font-mono text-xs text-slate-500">
                    <span>{formatPostDate(post.publishedAt)}</span>
                    <span>{post.readMinutes} min read</span>
                </div>
                <div className="mt-3 pt-1">
                    <ListenButton paragraphs={spoken} className="w-full justify-center" />
                </div>
            </div>

            {/* Sticky Table of Contents */}
            {headings.length > 1 && (
                <div className="border-4 border-slate-900 bg-white p-5 shadow-brutal-4">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black uppercase text-slate-900">
                            Table of Contents
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                            {headings.length} sections
                        </span>
                    </div>
                    <ol className="mt-3 space-y-1.5 border-l-2 border-slate-200 pl-3 font-mono text-xs">
                        {headings.map((h, n) => {
                            const isActive = activeHeadingId === h.id;
                            return (
                                <li key={h.id}>
                                    <button
                                        type="button"
                                        onClick={() => scrollToElement(document.getElementById(h.id))}
                                        className={`cursor-pointer text-left transition-colors duration-150 block w-full py-1 pr-2 ${
                                            isActive
                                                ? 'font-black text-slate-950 bg-amber-200 -ml-3 pl-2.5 border-l-2 border-slate-900'
                                                : 'text-slate-600 hover:text-slate-900 hover:underline'
                                        }`}
                                    >
                                        <span className="mr-1.5 font-bold text-slate-400">
                                            {String(n + 1).padStart(2, '0')}.
                                        </span>
                                        <span>{renderInline(h.text)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {/* Key Takeaways in Sidebar */}
            {post.takeaways?.length > 0 && (
                <div className="border-4 border-slate-900 bg-amber-50 p-5 shadow-brutal-4">
                    <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                        KEY TAKEAWAYS
                    </span>
                    <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-800">
                        {post.takeaways.map((item, n) => (
                            <li key={n} className="flex gap-2">
                                <span className="font-bold text-emerald-700">✓</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Quick Actions Dock */}
            <div className="border-4 border-slate-900 bg-white p-4 shadow-brutal-4">
                <span className="font-mono text-[10px] font-black uppercase text-slate-500">QUICK ACTIONS</span>
                <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-xs font-black">
                    <button
                        type="button"
                        onClick={() => engagement.toggleReaction('like')}
                        className={`press shadow-brutal-2 flex flex-col items-center justify-center border-2 border-slate-900 py-2 ${
                            liked ? 'bg-amber-300' : 'bg-white hover:bg-slate-100'
                        }`}
                        title="Like this post"
                    >
                        {liked ? (
                            <PiThumbsUpFill aria-hidden="true" className="h-5 w-5" />
                        ) : (
                            <PiThumbsUp aria-hidden="true" className="h-5 w-5" />
                        )}
                        <span className="mt-1 text-[11px]">{engagement.reactions.like || 0}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollToElement(commentsRef.current)}
                        className="press shadow-brutal-2 flex flex-col items-center justify-center border-2 border-slate-900 bg-white py-2 hover:bg-slate-100"
                        title="View comments"
                    >
                        <PiChatCircle aria-hidden="true" className="h-5 w-5" />
                        <span className="mt-1 text-[11px]">{commentCount}</span>
                    </button>
                    <button
                        type="button"
                        onClick={share}
                        className="press shadow-brutal-2 flex flex-col items-center justify-center border-2 border-slate-900 bg-white py-2 hover:bg-slate-100"
                        title="Share post"
                    >
                        <PiShareNetwork aria-hidden="true" className="h-5 w-5" />
                        <span className="mt-1 text-[11px]">Share</span>
                    </button>
                </div>
            </div>

            {/* Topics & Tags */}
            {post.tags?.length > 0 && (
                <div className="border-2 border-slate-900 bg-slate-50 p-4">
                    <span className="font-mono text-[10px] font-black uppercase text-slate-500">TOPICS</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}

function ArticleView({ post, previous, next, related }) {
    const headerRef = useRef(null);
    const bodyRef = useRef(null);
    const endRef = useRef(null);
    const commentsRef = useRef(null);
    const [commentCount, setCommentCount] = useState(post.stats?.comments || 0);
    const [activeHeadingId, setActiveHeadingId] = useState('');

    const blocks = useMemo(() => parseBlocks(post.body), [post.body]);
    const headings = useMemo(() => outline(blocks), [blocks]);
    const spoken = useMemo(() => [post.title, ...spokenText(blocks)], [post.title, blocks]);
    const engagement = useEngagement(post.slug, post.reactionCounts);

    useReadingTracker({ slug: post.slug, readMinutes: post.readMinutes, bodyRef, enabled: true });

    useEffect(() => {
        const previousTitle = document.title;
        document.title = `${post.title} · Horizon · Team Asterix`;
        return () => {
            document.title = previousTitle;
        };
    }, [post.title]);

    // Active heading scroll spy for sticky table of contents
    useEffect(() => {
        if (!headings.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveHeadingId(entry.target.id);
                    }
                }
            },
            { rootMargin: '-70px 0px -60% 0px' }
        );
        headings.forEach((h) => {
            const el = document.getElementById(h.id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [headings]);

    const renderPoll = (poll) => <PostPoll poll={poll} engagement={engagement} />;

    const share = async () => {
        if (!(await shareNatively(post, engagement.share))) scrollToElement(endRef.current);
    };

    const cover = safeHref(post.coverImage);

    return (
        <>
            <ReadingProgress targetRef={bodyRef} />
            <article className="mx-auto max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12">
                <a
                    href="#community"
                    className="font-mono text-xs font-black tracking-wider text-sky-800 uppercase no-underline hover:text-slate-900"
                >
                    ← All posts
                </a>

                {/* Article Header */}
                <header ref={headerRef} className="mt-6 max-w-4xl">
                    {post.category && (
                        <span className="inline-block border-2 border-slate-900 bg-sky-300 px-2 py-0.5 font-mono text-[11px] font-black uppercase text-slate-950">
                            {post.category}
                        </span>
                    )}
                    <h1 className="mt-4 font-display text-3xl font-bold leading-[1.15] text-balance text-slate-900 sm:text-5xl lg:text-6xl">
                        {post.title}
                    </h1>
                    {post.excerpt && (
                        <p className="mt-4 text-lg leading-relaxed text-pretty text-slate-600 sm:text-xl max-w-3xl">
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
                        <p className="text-sm text-slate-500 font-mono">
                            <time dateTime={post.publishedAt || undefined}>{formatPostDate(post.publishedAt)}</time>
                            <span aria-hidden="true"> · </span>
                            {post.readMinutes} min read
                        </p>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            <ListenButton paragraphs={spoken} />
                            <button
                                type="button"
                                onClick={() => scrollToElement(commentsRef.current)}
                                aria-label={`Comments: ${commentCount}`}
                                className={headerButton}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <PiChatCircle aria-hidden="true" className="h-4 w-4" />
                                    {commentCount}
                                </span>
                            </button>
                            <button type="button" onClick={share} className={headerButton}>
                                <span className="inline-flex items-center gap-1.5">
                                    <PiShareNetwork aria-hidden="true" className="h-4 w-4" />
                                    Share
                                </span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Article Cover Image */}
                {cover && (
                    <img
                        src={cover}
                        alt={post.coverAlt || ''}
                        style={{ objectPosition: post.coverPosition || '50% 50%' }}
                        className="mt-8 aspect-[16/9] w-full max-w-5xl border-4 border-slate-900 object-cover shadow-brutal-4"
                    />
                )}

                {/* 2-Column Desktop Layout: Main Content + Sticky Companion Sidebar */}
                <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                    {/* Main Reading & Interaction Column */}
                    <div className="min-w-0 flex-1 max-w-3xl lg:max-w-[48rem] xl:max-w-[54rem]">
                        {/* Mobile-only inline takeaways & TOC */}
                        <div className="lg:hidden">
                            <Takeaways items={post.takeaways} />
                            <TableOfContents headings={headings} />
                        </div>

                        {/* Article Markdown Body */}
                        <div ref={bodyRef}>
                            <ArticleBody
                                blocks={blocks}
                                renderPoll={renderPoll}
                                className="mt-6 lg:mt-0 lg:max-w-none lg:mx-0"
                            />
                        </div>

                        {/* Tags on Mobile */}
                        {post.tags?.length > 0 && (
                            <ul className="mt-10 flex flex-wrap gap-2 lg:hidden" aria-label="Tags">
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

                        {/* Reaction & Share Section */}
                        <section
                            ref={endRef}
                            aria-labelledby="react-heading"
                            className="mt-12 scroll-mt-24 border border-slate-200 bg-white p-5 sm:p-6"
                        >
                            <h2 id="react-heading" className="font-display text-lg font-semibold text-slate-900">
                                Was this useful?
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Reactions are anonymous. No sign-in needed.</p>
                            <div className="mt-4">
                                <ReactionButtons engagement={engagement} />
                            </div>
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                                <h3 className="text-sm font-semibold text-slate-900">Share this post</h3>
                                <ShareButtons post={post} onShare={engagement.share} />
                            </div>
                        </section>

                        {/* Newer / Older Navigation */}
                        {(previous || next) && (
                            <nav
                                aria-label="More posts"
                                className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2"
                            >
                                {next ? (
                                    <a
                                        href={`#community/blog/${next.slug}`}
                                        className="press shadow-brutal-2 block border-2 border-slate-900 bg-white p-4 no-underline hover:bg-sky-50"
                                    >
                                        <span className="font-mono text-[10px] font-black uppercase text-slate-500">
                                            ← Newer
                                        </span>
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
                                        <span className="font-mono text-[10px] font-black uppercase text-slate-500">
                                            Older →
                                        </span>
                                        <span className="mt-1 block font-bold text-slate-900">{previous.title}</span>
                                    </a>
                                )}
                            </nav>
                        )}

                        {/* Comments Section */}
                        <CommentsSection
                            ref={commentsRef}
                            slug={post.slug}
                            initialMode={post.commentsMode}
                            onCountChange={setCommentCount}
                        />

                        {/* Related Posts */}
                        <RelatedPosts posts={related} />

                        {/* Newsletter Signup at Bottom of Article */}
                        <div className="mt-12">
                            <NewsletterSignup source="blog" />
                        </div>
                    </div>

                    {/* Right-Hand Sticky Sidebar for PC / Desktop Screens */}
                    <DesktopSidebar
                        post={post}
                        headings={headings}
                        activeHeadingId={activeHeadingId}
                        spoken={spoken}
                        engagement={engagement}
                        commentCount={commentCount}
                        commentsRef={commentsRef}
                        endRef={endRef}
                        share={share}
                    />
                </div>
            </article>

            {/* Floating Quick Action Bar (for mobile & small viewports) */}
            <FloatingActions
                post={post}
                engagement={engagement}
                commentCount={commentCount}
                headerRef={headerRef}
                endRef={endRef}
                commentsRef={commentsRef}
            />
        </>
    );
}

export default function BlogArticle({ slug }) {
    const [state, setState] = useState({ status: 'loading', data: null, error: '' });

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

    if (state.status === 'loading') {
        return (
            <div className="mx-auto max-w-4xl animate-pulse space-y-4 px-4 py-12" aria-busy="true">
                <div className="h-4 w-32 bg-slate-200" />
                <div className="h-10 w-full bg-slate-200" />
                <div className="h-10 w-3/4 bg-slate-200" />
                <div className="h-64 w-full bg-slate-200" />
            </div>
        );
    }

    if (state.status === 'missing' || state.status === 'error') {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                <h1 className="font-display text-3xl font-bold text-slate-900">
                    {state.status === 'missing' ? 'Post not found' : 'Could not load this post'}
                </h1>
                <p className="mt-3 text-slate-600">
                    {state.status === 'missing' ? 'It may have been moved or unpublished.' : state.error}
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
                        className="press shadow-brutal-2 border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase text-slate-900 no-underline"
                    >
                        ← All posts
                    </a>
                </div>
            </div>
        );
    }

    const { post, previous, next, related } = state.data;
    return <ArticleView post={post} previous={previous} next={next} related={related} />;
}
