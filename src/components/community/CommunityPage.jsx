import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { PostCover, PostMeta } from './PostParts';
import BlogArticle from './BlogArticle';
import NewsletterSignup from './NewsletterSignup';
import UnsubscribePanel from './UnsubscribePanel';

/* Read-only community hub. Routes live in the hash so links and the back
   button work: #community (blog), #community/blog/<slug>, and
   #community/unsubscribe?e=<email>&t=<token>. */
function parseRoute(
    hash = typeof window !== 'undefined' ? window.location.hash : '',
    pathname = typeof window !== 'undefined' ? window.location.pathname : ''
) {
    const blogMatch = pathname.match(/^\/(?:community\/)?blog\/([^/?#]+)/i);
    if (blogMatch && blogMatch[1]) {
        return { view: 'article', slug: decodeURIComponent(blogMatch[1]) };
    }
    const [path, query = ''] = hash.replace(/^#community\/?/, '').split('?');
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'blog' && parts[1]) return { view: 'article', slug: decodeURIComponent(parts[1]) };
    if (parts[0] === 'unsubscribe') {
        const params = new URLSearchParams(query);
        return { view: 'unsubscribe', email: params.get('e') || '', token: params.get('t') || '' };
    }
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
        <div className="shadow-brutal-4 border-4 border-slate-900 bg-rose-50 p-6">
            <p className="font-mono text-sm font-bold text-rose-950">{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className="press shadow-brutal-2 mt-4 cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase hover:bg-slate-100"
            >
                ↻ Try again
            </button>
        </div>
    );
}

/* ====================================================================
   BLOG LIST WITH FILTERING, SEARCH, AND RICH FALLBACK
   ==================================================================== */
function BlogList() {
    const [state, reload] = useFetchJson('/api/blog');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const posts = state.data?.posts || [];

    const categories = useMemo(() => {
        const set = new Set();
        posts.forEach((p) => {
            if (p.category) set.add(p.category);
        });
        return ['All', ...Array.from(set)];
    }, [posts]);

    const filtered = useMemo(() => {
        return posts.filter((p) => {
            const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
            const query = search.trim().toLowerCase();
            const matchesSearch =
                !query ||
                p.title?.toLowerCase().includes(query) ||
                p.excerpt?.toLowerCase().includes(query) ||
                p.category?.toLowerCase().includes(query);
            return matchesCat && matchesSearch;
        });
    }, [posts, selectedCategory, search]);

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
            <div className="border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-display text-2xl font-bold text-slate-900">First posts are on the way</p>
                <p className="mx-auto mt-2 max-w-md text-slate-600">
                    Subscribe below and we will email you when the first Horizon write-up goes live.
                </p>
            </div>
        );
    }

    const [featured, ...rest] = filtered;

    return (
        <div className="space-y-8">
            {/* Filter controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`press cursor-pointer border-2 border-slate-900 px-3 py-1 font-mono text-xs font-black uppercase ${
                                selectedCategory === cat
                                    ? 'shadow-brutal-2 bg-slate-900 text-white'
                                    : 'bg-white text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search write-ups…"
                        className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:w-64"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="shadow-brutal-4 border-4 border-slate-900 bg-white p-8 text-center">
                    <p className="font-display text-xl font-bold text-slate-900">No write-ups found</p>
                    <p className="mt-2 text-sm text-slate-600">
                        Try adjusting your category filter or search keywords.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearch('');
                            setSelectedCategory('All');
                        }}
                        className="press shadow-brutal-2 mt-4 cursor-pointer border-2 border-slate-900 bg-amber-300 px-4 py-1.5 font-mono text-xs font-black text-slate-950 uppercase"
                    >
                        Reset filters
                    </button>
                </div>
            ) : (
                <>
                    {featured && (
                        <a
                            href={`#community/blog/${featured.slug}`}
                            className="group shadow-brutal-8 grid grid-cols-1 overflow-hidden border-4 border-slate-900 bg-white no-underline md:grid-cols-2"
                        >
                            <PostCover
                                post={featured}
                                className="aspect-[16/10] h-full w-full object-cover md:aspect-auto"
                            />
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
                                {featured.excerpt && (
                                    <p className="leading-relaxed text-slate-600">{featured.excerpt}</p>
                                )}
                                <PostMeta post={featured} />
                                <span className="font-mono text-xs font-black text-sky-800 uppercase">
                                    Read the post →
                                </span>
                            </div>
                        </a>
                    )}

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
                </>
            )}
        </div>
    );
}

export default function CommunityPage({ onBack }) {
    const [route, setRoute] = useState(() => parseRoute(window.location.hash, window.location.pathname));

    useEffect(() => {
        const onRoute = () => setRoute(parseRoute(window.location.hash, window.location.pathname));
        window.addEventListener('hashchange', onRoute);
        window.addEventListener('popstate', onRoute);
        return () => {
            window.removeEventListener('hashchange', onRoute);
            window.removeEventListener('popstate', onRoute);
        };
    }, []);

    return (
        <div className="flex min-h-[100svh] flex-col bg-slate-50 font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
            <main className="flex-1">
                {route.view === 'article' ? (
                    <BlogArticle key={route.slug} slug={route.slug} />
                ) : route.view === 'unsubscribe' ? (
                    <UnsubscribePanel
                        key={`${route.email}|${route.token}`}
                        email={route.email}
                        token={route.token}
                    />
                ) : (
                    <div>
                        {/* Full Screen Cinematic Hero Section */}
                        <section className="relative flex min-h-[92vh] w-full items-center overflow-hidden border-b-4 border-slate-900 bg-slate-950 sm:min-h-screen">
                            {/* Full Screen Background Image */}
                            <img
                                src="/gallery/04_track_dirt_action.jpg"
                                alt="Team Asterix off-road Baja race vehicle in action"
                                className="absolute inset-0 h-full w-full scale-105 object-cover object-center"
                                loading="eager"
                            />

                            {/* Cinematic High-Contrast Scrim Overlay */}
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/30 sm:to-transparent"
                            />
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40"
                            />

                            {/* Text content strictly on the left side with a small description below */}
                            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 sm:px-8 lg:px-12">
                                <div className="max-w-2xl text-left">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="shadow-brutal-2 border-2 border-sky-400 bg-sky-400 px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-950 uppercase">
                                            ASTERIX JOURNAL
                                        </span>
                                        <span className="border-2 border-white/20 bg-slate-900/80 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-slate-200 uppercase backdrop-blur-xs">
                                            SEASON 2026
                                        </span>
                                    </div>

                                    <h1 className="font-display mt-5 text-5xl font-black tracking-tight text-white uppercase sm:text-7xl md:text-8xl">
                                        Horizon
                                    </h1>
                                    <p className="font-mono mt-1 text-xs font-black tracking-widest text-sky-400 uppercase sm:text-sm">
                                        // A view beyond
                                    </p>

                                    <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-slate-300 sm:text-lg">
                                        Latest technologies, automotive trends, electric vehicles, and much
                                        more directly from the Team Asterix community. Written by student
                                        engineers for the next generation of curious people.
                                    </p>

                                    <div className="mt-8 flex flex-wrap items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = document.getElementById('articles-feed');
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="press shadow-brutal-4 flex items-center gap-2 border-2 border-slate-900 bg-sky-400 px-5 py-3 font-mono text-xs font-black text-slate-950 uppercase transition-colors hover:bg-sky-300"
                                        >
                                            <span>Explore Write-ups</span>
                                            <span aria-hidden="true">↓</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Articles Feed */}
                        <div id="articles-feed" className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
                            <BlogList />

                            {/* Clean Newsletter Signup Section */}
                            <div id="newsletter-section" className="mt-16 w-full">
                                <NewsletterSignup
                                    source="community"
                                    title="Stay curious. Stay in the loop."
                                    blurb="Get the latest breakdowns on electric vehicles, track telemetry, and engineering write-ups delivered straight to your inbox."
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t-4 border-slate-900 bg-white px-4 py-10 sm:px-8">
                <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="font-display text-lg font-black tracking-tight text-slate-950 uppercase">
                                © Horizon
                            </span>
                            <span className="border border-slate-900 bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-black text-sky-900 uppercase">
                                Blogs and Newsletters
                            </span>
                        </div>
                        <p className="font-mono text-xs font-bold text-slate-700">
                            An initiative by the Asterix community
                        </p>
                        <p className="font-mono text-[11px] font-bold tracking-tight text-slate-500 uppercase">
                            PSG Institute of Technology and Applied Research
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2 sm:pt-0">
                        <a
                            href="#community"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="font-mono text-xs font-black text-slate-900 uppercase hover:underline"
                        >
                            ↑ Back to top
                        </a>
                        <button
                            type="button"
                            onClick={onBack}
                            className="font-mono text-xs font-black text-sky-800 uppercase hover:underline"
                        >
                            ← Home
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
