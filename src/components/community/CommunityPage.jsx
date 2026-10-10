import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { safeHref } from '../../lib/safeHref';
import { resourceBadge } from '../../lib/resourceTypes';
import { formatPostDate } from '../../lib/postDate';
import BlogArticle from './BlogArticle';
import NewsletterSignup from './NewsletterSignup';

/* Read-only community hub. Routes live in the hash so links and the back
   button work: #community (blog), #community/resources, #community/blog/<slug>. */
function parseRoute(hash) {
    const parts = hash.replace(/^#community\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'blog' && parts[1]) return { view: 'article', slug: decodeURIComponent(parts[1]) };
    if (parts[0] === 'resources') return { view: 'resources' };
    return { view: 'blog' };
}

// Fetches on mount; the returned reload resets to 'loading' and fetches again.
function useFetchJson(path) {
    const [state, setState] = useState({ status: 'loading', data: null, error: '' });

    const load = useCallback(async () => {
        try {
            const res = await fetch(apiUrl(path));
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
    }, [path]);

    useEffect(() => {
        load();
    }, [load]);

    const reload = () => {
        setState({ status: 'loading', data: null, error: '' });
        load();
    };

    return [state, reload];
}

function ErrorBlock({ message, onRetry }) {
    return (
        <div className="border-2 border-rose-600 bg-rose-50 p-5 text-center">
            <p className="font-bold text-rose-900">{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className="press shadow-brutal-2 mt-3 cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase"
            >
                Try again
            </button>
        </div>
    );
}

function PostCover({ post, className }) {
    const src = safeHref(post.coverImage);
    if (src) {
        return (
            <img
                src={src}
                alt={post.coverAlt || ''}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: post.coverPosition || '50% 50%' }}
                className={className}
            />
        );
    }
    return (
        <div aria-hidden="true" className={`${className} flex items-center justify-center bg-slate-900`}>
            <span className="font-display text-4xl font-bold text-sky-400">✱</span>
        </div>
    );
}

function PostMeta({ post }) {
    return (
        <p className="font-mono text-[11px] font-bold text-slate-500">
            <time dateTime={post.publishedAt || undefined}>{formatPostDate(post.publishedAt)}</time>
            <span aria-hidden="true"> · </span>
            {post.readMinutes} min read
        </p>
    );
}

function BlogList() {
    const [state, reload] = useFetchJson('/api/blog');
    const posts = state.data?.posts || [];

    if (state.status === 'loading') {
        return (
            <div className="grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2" aria-busy="true">
                {[0, 1, 2, 3].map((n) => (
                    <div key={n} className="h-72 border-4 border-slate-200 bg-slate-100" />
                ))}
            </div>
        );
    }

    if (state.status === 'error') {
        return <ErrorBlock message={`Could not load posts. ${state.error}`} onRetry={reload} />;
    }

    if (posts.length === 0) {
        return (
            <div className="border-4 border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-display text-2xl font-bold text-slate-900">First posts are on the way</p>
                <p className="mx-auto mt-2 max-w-md text-slate-600">
                    Subscribe below and we will send you the first Horizon write-up when it goes live.
                </p>
            </div>
        );
    }

    const [featured, ...rest] = posts;

    return (
        <div className="space-y-8">
            <a
                href={`#community/blog/${featured.slug}`}
                className="group shadow-brutal-8 grid grid-cols-1 overflow-hidden border-4 border-slate-900 bg-white no-underline md:grid-cols-2"
            >
                <PostCover post={featured} className="aspect-[16/10] h-full w-full object-cover md:aspect-auto" />
                <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                    <div className="flex flex-wrap gap-2">
                        <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950 uppercase">
                            {featured.featured ? '★ Featured' : 'Latest'}
                        </span>
                        {featured.category && (
                            <span className="border-2 border-slate-900 bg-rose-300 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950 uppercase">
                                {featured.category}
                            </span>
                        )}
                    </div>
                    <h2 className="font-display text-2xl leading-tight font-bold text-slate-900 group-hover:underline sm:text-3xl">
                        {featured.title}
                    </h2>
                    {featured.excerpt && <p className="leading-relaxed text-slate-600">{featured.excerpt}</p>}
                    <PostMeta post={featured} />
                    <span className="font-mono text-xs font-black text-sky-800 uppercase">Read the post →</span>
                </div>
            </a>

            {rest.length > 0 && (
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((post) => (
                        <li key={post.slug}>
                            <a
                                href={`#community/blog/${post.slug}`}
                                className="group shadow-brutal-4 flex h-full flex-col overflow-hidden border-4 border-slate-900 bg-white no-underline"
                            >
                                <PostCover
                                    post={post}
                                    className="aspect-[16/9] w-full border-b-4 border-slate-900 object-cover"
                                />
                                <div className="flex flex-1 flex-col gap-2 p-5">
                                    {post.category && (
                                        <span className="font-mono text-[10px] font-black tracking-wider text-sky-800 uppercase">
                                            {post.category}
                                        </span>
                                    )}
                                    <h3 className="font-display text-lg leading-snug font-bold text-slate-900 group-hover:underline">
                                        {post.title}
                                    </h3>
                                    {post.excerpt && (
                                        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                                            {post.excerpt}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-2">
                                        <PostMeta post={post} />
                                    </div>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ResourceList() {
    const [state, reload] = useFetchJson('/api/workshop/attendance/resources?track=common');
    const items = state.data?.resources || [];

    if (state.status === 'loading') {
        return (
            <div className="grid animate-pulse grid-cols-1 gap-6 md:grid-cols-2" aria-busy="true">
                {[0, 1].map((n) => (
                    <div key={n} className="h-48 border-4 border-slate-200 bg-slate-100" />
                ))}
            </div>
        );
    }

    if (state.status === 'error') {
        return <ErrorBlock message={`Could not load resources. ${state.error}`} onRetry={reload} />;
    }

    if (items.length === 0) {
        return (
            <div className="border-4 border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                No shared resources yet. The team will publish slides, notebooks and links here.
            </div>
        );
    }

    return (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {items.map((item) => (
                <li
                    key={item._id || item.title}
                    className="shadow-brutal-4 flex flex-col justify-between border-4 border-slate-900 bg-white p-5"
                >
                    <div>
                        {item.module && (
                            <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                {item.module}
                            </span>
                        )}
                        <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{item.title}</h3>
                        {item.description && (
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                        )}
                        {item.takeaways?.length > 0 && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {item.takeaways.map((point, n) => (
                                    <li key={n}>{point}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {item.resources?.length > 0 && (
                        <div className="mt-4 space-y-2 border-t-2 border-slate-200 pt-3">
                            {item.resources.map((link, n) => {
                                const href = safeHref(link.url);
                                if (!href) return null;
                                return (
                                    <a
                                        key={n}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 flex items-center justify-between gap-3 border-2 border-slate-900 bg-white px-3.5 py-2 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300"
                                    >
                                        <span className="min-w-0 truncate">{link.label}</span>
                                        <span className="shrink-0">{resourceBadge(link.type)}</span>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

const TABS = [
    { view: 'blog', label: 'Horizon Blog', href: '#community' },
    { view: 'resources', label: 'Resources', href: '#community/resources' }
];

export default function CommunityPage({ onBack }) {
    const [route, setRoute] = useState(() => parseRoute(window.location.hash));

    useEffect(() => {
        const onHash = () => setRoute(parseRoute(window.location.hash));
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    return (
        <div className="flex min-h-[100svh] flex-col bg-slate-50 font-sans text-slate-900 selection:bg-amber-300 selection:text-slate-950">
            <header className="border-b-4 border-slate-900 bg-white px-4 py-3 sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                    <a href="#community" className="flex min-w-0 items-center gap-2 no-underline">
                        <span className="shrink-0 border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-black text-slate-950 uppercase">
                            AST-Community
                        </span>
                        <strong className="truncate text-xs font-black text-slate-900 uppercase sm:text-sm">
                            Team Asterix Community
                        </strong>
                    </a>
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-2 shrink-0 cursor-pointer border-2 border-slate-900 bg-amber-300 px-3 py-1.5 font-mono text-[11px] font-black text-slate-950 uppercase hover:bg-amber-400 sm:px-4 sm:py-2 sm:text-xs"
                    >
                        ← Home
                    </button>
                </div>
            </header>

            <main className="flex-1">
                {route.view === 'article' ? (
                    <BlogArticle key={route.slug} slug={route.slug} />
                ) : (
                    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
                        <div className="max-w-2xl">
                            <h1 className="font-display text-4xl leading-none font-bold text-slate-900 sm:text-6xl">
                                Horizon
                            </h1>
                            <p className="mt-3 text-lg leading-relaxed text-slate-600">
                                Build notes, race reports and engineering deep-dives from Team Asterix, plus the
                                resources we share with our community.
                            </p>
                        </div>

                        <nav aria-label="Community sections" className="mt-8 flex gap-2 border-b-4 border-slate-900">
                            {TABS.map((tab) => {
                                const active = route.view === tab.view;
                                return (
                                    <a
                                        key={tab.view}
                                        href={tab.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={`-mb-1 border-4 border-b-0 px-4 py-2 font-mono text-xs font-black uppercase no-underline ${
                                            active
                                                ? 'border-slate-900 bg-white text-slate-900'
                                                : 'border-transparent text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </a>
                                );
                            })}
                        </nav>

                        <div className="mt-8">{route.view === 'resources' ? <ResourceList /> : <BlogList />}</div>

                        <div className="mt-14 max-w-2xl">
                            <NewsletterSignup source="community" />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
