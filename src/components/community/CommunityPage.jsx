import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { PostCover, PostMeta } from './PostParts';
import BlogArticle from './BlogArticle';
import NewsletterSignup from './NewsletterSignup';
import UnsubscribePanel from './UnsubscribePanel';

/* Read-only community hub. Routes live in the hash so links and the back
   button work: #community (blog), #community/blog/<slug>, and
   #community/unsubscribe?e=<email>&t=<token>. */
function parseRoute(hash) {
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
        <div className="border-4 border-slate-900 bg-rose-50 p-6 shadow-brutal-4">
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
                        className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none sm:w-64 focus-visible:ring-2 focus-visible:ring-sky-500"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="border-4 border-slate-900 bg-white p-8 text-center shadow-brutal-4">
                    <p className="font-display text-xl font-bold text-slate-900">No write-ups found</p>
                    <p className="mt-2 text-sm text-slate-600">Try adjusting your category filter or search keywords.</p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearch('');
                            setSelectedCategory('All');
                        }}
                        className="press shadow-brutal-2 mt-4 cursor-pointer border-2 border-slate-900 bg-amber-300 px-4 py-1.5 font-mono text-xs font-black uppercase text-slate-950"
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
                            <PostCover post={featured} className="aspect-[16/10] h-full w-full object-cover md:aspect-auto" />
                            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                                <div className="flex flex-wrap gap-2">
                                    <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-black uppercase text-slate-950">
                                        {featured.featured ? '★ Featured' : 'Latest'}
                                    </span>
                                    {featured.category && (
                                        <span className="border-2 border-slate-900 bg-rose-300 px-2 py-0.5 font-mono text-[11px] font-black uppercase text-slate-950">
                                            {featured.category}
                                        </span>
                                    )}
                                </div>
                                <h2 className="font-display text-2xl font-bold leading-tight text-slate-900 group-hover:underline sm:text-3xl">
                                    {featured.title}
                                </h2>
                                {featured.excerpt && <p className="leading-relaxed text-slate-600">{featured.excerpt}</p>}
                                <PostMeta post={featured} />
                                <span className="font-mono text-xs font-black uppercase text-sky-800">Read the post →</span>
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
                                                <span className="font-mono text-[10px] font-black tracking-wider uppercase text-sky-800">
                                                    {post.category}
                                                </span>
                                            )}
                                            <h3 className="font-display text-lg font-bold leading-snug text-slate-900 group-hover:underline">
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
    const [route, setRoute] = useState(() => parseRoute(window.location.hash));

    useEffect(() => {
        const onHash = () => setRoute(parseRoute(window.location.hash));
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    return (
        <div className="flex min-h-[100svh] flex-col bg-slate-50 font-sans text-slate-900 selection:bg-amber-300 selection:text-slate-950">
            {/* Top Bar Header */}
            <header className="border-b-4 border-slate-900 bg-white px-4 py-3 sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                    <a href="#community" className="flex min-w-0 items-center gap-2.5 no-underline">
                        <span className="shrink-0 border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-black uppercase text-slate-950">
                            AST-HORIZON
                        </span>
                        <strong className="truncate text-xs font-black uppercase text-slate-900 sm:text-sm">
                            Team Asterix Community Hub
                        </strong>
                    </a>
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-2 shrink-0 cursor-pointer border-2 border-slate-900 bg-amber-300 px-3 py-1.5 font-mono text-[11px] font-black uppercase text-slate-950 hover:bg-amber-400 sm:px-4 sm:py-2 sm:text-xs"
                    >
                        ← Return Home
                    </button>
                </div>
            </header>

            <main className="flex-1">
                {route.view === 'article' ? (
                    <BlogArticle key={route.slug} slug={route.slug} />
                ) : route.view === 'unsubscribe' ? (
                    <UnsubscribePanel key={`${route.email}|${route.token}`} email={route.email} token={route.token} />
                ) : (
                    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
                        {/* Hero Section */}
                        <div className="relative border-4 border-slate-900 bg-white p-6 shadow-brutal-8 sm:p-10">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="border-2 border-slate-900 bg-amber-300 px-2.5 py-1 font-mono text-[11px] font-black uppercase text-slate-950">
                                    // OPEN MOTORSPORT ARCHIVE //
                                </span>
                                <span className="border-2 border-slate-900 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-black uppercase text-white">
                                    SEASON 2026
                                </span>
                            </div>

                            <h1 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                                Horizon
                            </h1>
                            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-xl">
                                Build logs, race debriefs, telemetry deep-dives, and open engineering toolkits directly
                                from the Team Asterix garage. Written by student engineers for the next generation of racers.
                            </p>


                        </div>

                        <div className="mt-10">
                            <BlogList />
                        </div>



                        {/* Community Discussion Channels Strip */}
                        <section className="mt-14 shadow-brutal-4 border-4 border-slate-900 bg-slate-900 p-6 text-white sm:p-8">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-300">
                                        // PADDOCK NETWORK //
                                    </span>
                                    <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                                        Join The Team Asterix Paddock
                                    </h3>
                                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-300">
                                        Connect directly with our suspension, powertrain, and DAQ engineers. Share your
                                        build progress, get feedback on CAD designs, and discuss competition rules.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    <a
                                        href="https://github.com/Team-Asterix264016"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-white bg-slate-800 px-4 py-2 font-mono text-xs font-black uppercase text-white no-underline hover:bg-slate-700"
                                    >
                                        🐙 GitHub Vault
                                    </a>
                                    <a
                                        href="https://www.instagram.com/team.asterix"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-white bg-rose-500 px-4 py-2 font-mono text-xs font-black uppercase text-white no-underline hover:bg-rose-600"
                                    >
                                        📸 Instagram
                                    </a>
                                    <a
                                        href="https://www.linkedin.com/company/teamasterix/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-white bg-sky-600 px-4 py-2 font-mono text-xs font-black uppercase text-white no-underline hover:bg-sky-500"
                                    >
                                        💼 LinkedIn
                                    </a>
                                </div>
                            </div>
                        </section>

                        {/* Newsletter Signup Container */}
                        <div id="newsletter-section" className="mt-14 w-full">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                                    DIRECT DISPATCH
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-600">
                                    Join 1,000+ student engineers & racing enthusiasts
                                </span>
                            </div>
                            <NewsletterSignup
                                source="community"
                                title="Get Horizon dispatches by email"
                                blurb="Technical breakdowns, telemetry schematics, and race debriefs directly from the garage. Zero fluff, zero spam."
                            />
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t-4 border-slate-900 bg-white px-4 py-8 sm:px-8">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="font-mono text-xs font-bold text-slate-600">
                        © 2026 Team Asterix Motorsport · Built with pride in the garage.
                    </p>
                    <div className="flex items-center gap-4">
                        <a
                            href="#community"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="font-mono text-xs font-black uppercase text-slate-900 hover:underline"
                        >
                            ↑ Back to top
                        </a>
                        <button
                            type="button"
                            onClick={onBack}
                            className="font-mono text-xs font-black uppercase text-sky-800 hover:underline"
                        >
                            ← Home
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
