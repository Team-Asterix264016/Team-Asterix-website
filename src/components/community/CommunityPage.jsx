import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { PostCover, PostMeta } from './PostParts';
import BlogArticle from './BlogArticle';
import NewsletterSignup from './NewsletterSignup';
import UnsubscribePanel from './UnsubscribePanel';
import { formatAuthorNames } from '../../lib/blogAuthors';
import teamLogo from '../../assets/Screenshot 2026-08-26 232320.png';

/* Route parser supporting both hash and path based deep links */
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

const SIDE_TAGS = [
    { label: 'BUILDS', value: 'Builds', match: /build|chassis|suspension|cad|hardware|fab/i },
    { label: 'TECHNOLOGY', value: 'Technology', match: /tech|autonom|telemetry|ai|sensor|software|elec/i },
    { label: 'RACING', value: 'Racing', match: /rac|track|baja|podium|pit|driver/i },
    { label: 'PEOPLE', value: 'People', match: /peop|team|crew|lead|interview/i },
    { label: 'AND BEYOND.', value: 'All', match: null }
];

export default function CommunityPage({ onBack }) {
    const [route, setRoute] = useState(() => parseRoute(window.location.hash, window.location.pathname));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [search, setSearch] = useState('');
    const searchInputRef = useRef(null);
    const heroTitleRef = useRef(null);
    const [scrolledPastTitle, setScrolledPastTitle] = useState(false);

    const [state, reload] = useFetchJson('/api/blog');
    const posts = state.data?.posts || [];

    useEffect(() => {
        const handleScroll = () => {
            if (!heroTitleRef.current) return;
            const rect = heroTitleRef.current.getBoundingClientRect();
            // When title bottom scrolls past header (height 64px)
            setScrolledPastTitle(rect.bottom <= 64);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const onRoute = () => setRoute(parseRoute(window.location.hash, window.location.pathname));
        window.addEventListener('hashchange', onRoute);
        window.addEventListener('popstate', onRoute);
        return () => {
            window.removeEventListener('hashchange', onRoute);
            window.removeEventListener('popstate', onRoute);
        };
    }, []);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const categories = useMemo(() => {
        const set = new Set();
        posts.forEach((p) => {
            if (p.category) set.add(p.category);
            if (Array.isArray(p.tags)) {
                p.tags.forEach((t) => {
                    if (t) set.add(t);
                });
            }
        });
        const base = ['All', 'Builds', 'Technology', 'Racing', 'People'];
        const extras = Array.from(set).filter(
            (c) => !base.some((b) => b.toLowerCase() === c.toLowerCase())
        );
        return [...base, ...extras];
    }, [posts]);

    const filtered = useMemo(() => {
        return posts.filter((p) => {
            const matchesCat =
                selectedCategory === 'All' ||
                (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()) ||
                (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase() === selectedCategory.toLowerCase())) ||
                (() => {
                    const sideItem = SIDE_TAGS.find(
                        (s) => s.value.toLowerCase() === selectedCategory.toLowerCase()
                    );
                    if (sideItem?.match) {
                        if (p.category && sideItem.match.test(p.category)) return true;
                        if (Array.isArray(p.tags) && p.tags.some((t) => sideItem.match.test(t))) return true;
                        if (p.title && sideItem.match.test(p.title)) return true;
                        if (p.excerpt && sideItem.match.test(p.excerpt)) return true;
                    }
                    return (
                        (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
                        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(selectedCategory.toLowerCase())))
                    );
                })();

            const query = search.trim().toLowerCase();
            const matchesSearch =
                !query ||
                p.title?.toLowerCase().includes(query) ||
                p.excerpt?.toLowerCase().includes(query) ||
                p.category?.toLowerCase().includes(query) ||
                (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(query)));

            return matchesCat && matchesSearch;
        });
    }, [posts, selectedCategory, search]);

    const scrollToArticles = (categoryOrTag = null) => {
        if (categoryOrTag) setSelectedCategory(categoryOrTag);
        const el = document.getElementById('articles-feed');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const handleFocusSearch = () => {
        scrollToArticles();
        setTimeout(() => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }, 300);
    };

    return (
        <div className="flex min-h-[100svh] flex-col bg-[#fafaf9] font-sans text-slate-900 selection:bg-[#ffe500] selection:text-black">
            {/* =========================================================
                TOP NAVIGATION BAR (LIGHT THEME)
            ========================================================= */}
            <header className="sticky top-0 z-40 w-full border-b-2 border-black bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Brand Logo & Home Link (Swaps to "Horizon" on mobile when scrolled past hero title) */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (scrolledPastTitle) {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                } else if (onBack) {
                                    onBack();
                                } else {
                                    window.location.hash = '';
                                }
                            }}
                            className="press flex items-center gap-2 cursor-pointer no-underline"
                            title={scrolledPastTitle ? 'Back to top' : 'Return to Asterix Home'}
                        >
                            {/* Mobile View: Asterix Logo -> Horizon Text */}
                            <div className="flex items-center md:hidden h-8">
                                {scrolledPastTitle ? (
                                    <span className="font-display text-xl font-black tracking-tighter text-black uppercase transition-all duration-200">
                                        Horizon
                                    </span>
                                ) : (
                                    <img
                                        src={teamLogo}
                                        alt="Team Asterix"
                                        className="h-6 w-auto object-contain transition-all duration-200"
                                    />
                                )}
                            </div>

                            {/* Desktop View: Always Asterix Logo */}
                            <div className="hidden md:flex items-center">
                                <img
                                    src={teamLogo}
                                    alt="Team Asterix"
                                    className="h-6 w-auto object-contain sm:h-7"
                                />
                            </div>
                        </button>
                    </div>

                    {/* Desktop Center Navigation Links (Inactive for now) */}
                    <nav className="hidden items-center gap-8 md:flex">
                        <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className="font-mono text-xs font-black tracking-wider text-black uppercase underline decoration-[#ffe500] decoration-4 underline-offset-6 cursor-default"
                        >
                            Journal
                        </button>
                        <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className="font-mono text-xs font-black tracking-wider text-slate-700 uppercase hover:text-black transition-colors cursor-default"
                        >
                            Categories
                        </button>
                        <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className="font-mono text-xs font-black tracking-wider text-slate-700 uppercase hover:text-black transition-colors cursor-default"
                        >
                            Race Archive
                        </button>
                        <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className="font-mono text-xs font-black tracking-wider text-slate-700 uppercase hover:text-black transition-colors cursor-default"
                        >
                            About
                        </button>
                        <button
                            type="button"
                            onClick={handleFocusSearch}
                            className="text-slate-600 hover:text-black transition-colors cursor-pointer"
                            title="Search articles"
                            aria-label="Search articles"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </nav>

                    {/* Desktop Right Action: Season 2026 Button */}
                    <div className="hidden items-center gap-4 md:flex">
                        <span className="h-4 w-px bg-slate-300" aria-hidden="true" />
                        <button
                            type="button"
                            onClick={() => scrollToArticles()}
                            className="press flex items-center gap-1.5 border-2 border-black bg-[#ffe500] px-3.5 py-1.5 font-mono text-xs font-black text-black uppercase transition-transform hover:bg-yellow-400 cursor-pointer shadow-[2px_2px_0px_#000]"
                        >
                            <span>Season 2026</span>
                            <span aria-hidden="true">→</span>
                        </button>
                    </div>

                    {/* Mobile Hamburger Menu Toggle */}
                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="press flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000]"
                            aria-label="Open navigation menu"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* =========================================================
                MOBILE NAVIGATION DRAWER OVERLAY (ANIMATED ENTRY)
            ========================================================= */}
            {mobileMenuOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 animate-mobile-drawer"
                >
                    {/* Mobile Drawer Header */}
                    <div className="flex h-16 items-center justify-between border-b-2 border-black px-6">
                        <img
                            src={teamLogo}
                            alt="Team Asterix"
                            className="h-6 w-auto object-contain"
                        />
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="press flex h-9 w-9 items-center justify-center border-2 border-black bg-slate-100 font-mono text-lg font-black text-black hover:bg-[#ffe500]"
                            aria-label="Close menu"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Mobile Links */}
                    <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
                        <div className="space-y-6">
                            <nav className="flex flex-col space-y-4 animate-mobile-item-1">
                                <button
                                    type="button"
                                    onClick={(e) => e.preventDefault()}
                                    className="text-left font-display text-2xl font-black uppercase text-black underline decoration-[#ffe500] decoration-4 underline-offset-6 cursor-default"
                                >
                                    Journal
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => e.preventDefault()}
                                    className="text-left font-display text-2xl font-black uppercase text-slate-800 cursor-default"
                                >
                                    Categories
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => e.preventDefault()}
                                    className="text-left font-display text-2xl font-black uppercase text-slate-800 cursor-default"
                                >
                                    Race Archive
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => e.preventDefault()}
                                    className="text-left font-display text-2xl font-black uppercase text-slate-800 cursor-default"
                                >
                                    About
                                </button>
                            </nav>

                            {/* Search Bar in Mobile Menu */}
                            <div className="relative pt-2 animate-mobile-item-2">
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search write-ups…"
                                    className="h-11 w-full border-2 border-black bg-slate-50 px-4 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-black focus:outline-none shadow-[2px_2px_0px_#000]"
                                />
                            </div>
                        </div>

                        {/* Mobile Drawer Bottom Tag Links */}
                        <div className="mt-8 border-3 border-black bg-[#ffe500] p-5 text-black shadow-[6px_6px_0px_#000] animate-mobile-item-3">
                            <p className="font-mono text-[11px] font-black tracking-wider text-black/70 uppercase">
                                // EXPLORE BY TOPIC
                            </p>
                            <div className="mt-3 flex flex-col space-y-2">
                                {SIDE_TAGS.map((tag) => (
                                    <button
                                        key={tag.label}
                                        type="button"
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            scrollToArticles(tag.value);
                                        }}
                                        className="press flex items-center justify-between border-b border-black/20 pb-1.5 text-left font-mono text-sm font-black uppercase hover:text-black hover:translate-x-1 transition-all cursor-pointer"
                                    >
                                        <span>{tag.label}</span>
                                        <span>→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Page Body */}
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
                        {/* =========================================================
                            HERO SECTION: "VARIATION A / BOLD SPLIT LAYOUT"
                        ========================================================= */}
                        <section className="relative w-full border-b-4 border-black bg-stone-100">
                            <div className="mx-auto max-w-[1440px]">
                                {/* Desktop 3-Way Split Layout Grid / Mobile Stacked */}
                                <div className="grid grid-cols-1 md:grid-cols-12">
                                    {/* 1. Left Editorial Panel: Grungy Off-White Texture */}
                                    <div className="relative z-10 flex flex-col justify-between border-b-4 border-black bg-[#f6f6f4] p-6 text-slate-950 sm:p-10 md:col-span-5 md:border-r-4 md:border-b-0 lg:col-span-5 lg:p-12 xl:col-span-5">
                                        {/* Subtle Grunge Dirt / Paper Grit Texture Overlay */}
                                        <div
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0 opacity-[0.06] select-none"
                                            style={{
                                                backgroundImage:
                                                    'radial-gradient(#000 1px, transparent 1px), radial-gradient(#000 1px, #f6f6f4 1px)',
                                                backgroundSize: '24px 24px',
                                                backgroundPosition: '0 0, 12px 12px'
                                            }}
                                        />

                                        <div ref={heroTitleRef} className="relative z-10">
                                            {/* Top Tag */}
                                            <p className="font-mono text-xs font-black tracking-[0.2em] text-slate-900 uppercase">
                                                ASTERIX JOURNAL
                                            </p>

                                            {/* Giant HORIZON with Paintbrush Splash Accent */}
                                            <div className="relative mt-4 inline-block">
                                                {/* Yellow paint brush splash SVG */}
                                                <svg
                                                    aria-hidden="true"
                                                    viewBox="0 0 420 120"
                                                    preserveAspectRatio="none"
                                                    className="pointer-events-none absolute -inset-x-4 -inset-y-2 h-[125%] w-[116%] -rotate-1 text-[#ffe500] fill-current select-none"
                                                >
                                                    <path d="M 12 45 Q 160 10 395 32 L 405 82 Q 240 115 15 88 Z" />
                                                    <path d="M 28 32 L 380 20 L 398 88 L 10 94 Z" opacity="0.85" />
                                                </svg>
                                                <h1 className="relative z-10 font-display text-6xl font-black tracking-tighter text-black uppercase sm:text-7xl lg:text-8xl xl:text-[6.5rem] leading-[0.88]">
                                                    Horizon
                                                </h1>
                                            </div>

                                            {/* Sub-tagline in High-Contrast Yellow Bar */}
                                            <div className="mt-3">
                                                <span className="inline-block bg-[#ffe500] px-3 py-1 font-mono text-xs font-black tracking-widest text-black uppercase border border-black shadow-[2px_2px_0px_#000] sm:text-sm">
                                                    A VIEW BEYOND
                                                </span>
                                            </div>

                                            {/* Body Copy */}
                                            <p className="mt-6 max-w-md font-sans text-sm font-medium leading-relaxed text-slate-800 sm:text-base">
                                                Stories, data and ideas from the Team Asterix community. Written
                                                by student engineers for the next generation of curious people.
                                            </p>

                                            {/* CTA Button */}
                                            <div className="mt-8">
                                                <button
                                                    type="button"
                                                    onClick={() => scrollToArticles()}
                                                    className="press shadow-[4px_4px_0px_#000] inline-flex items-center gap-2.5 border-2 border-black bg-[#ffe500] px-6 py-3 font-mono text-xs font-black text-black uppercase transition-colors hover:bg-yellow-400 cursor-pointer sm:text-sm"
                                                >
                                                    <span>EXPLORE WRITE-UPS</span>
                                                    <span aria-hidden="true">→</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Center/Right: Team Asterix Baja Race Action Photo */}
                                    <div className="relative min-h-[380px] overflow-hidden bg-black md:col-span-5 md:min-h-[520px] lg:col-span-5 xl:col-span-5">
                                        <img
                                            src="/gallery/04_track_dirt_action.jpg"
                                            alt="Team Asterix A16 Baja race buggy kicking up dirt on the track"
                                            className="h-full w-full object-cover object-center"
                                            loading="eager"
                                        />

                                        {/* Mobile-only yellow bottom-right corner badge */}
                                        <div className="absolute right-0 bottom-0 z-20 border-t-3 border-l-3 border-black bg-[#ffe500] p-4 text-black md:hidden">
                                            <p className="font-mono text-[10px] font-black tracking-wider uppercase">
                                                SEASON 2026
                                            </p>
                                            <p className="font-display text-4xl font-black leading-none tracking-tighter">
                                                026
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Right Pillar: Yellow Graphic Strip with Clickable Side Tag Links */}
                                    <div className="hidden flex-col justify-between border-l-4 border-black bg-[#ffe500] p-6 text-black md:col-span-2 md:flex lg:col-span-2 lg:p-7 xl:col-span-2">
                                        {/* Top Section */}
                                        <div>
                                            <div className="flex items-center font-mono text-[11px] font-black tracking-wider uppercase">
                                                <span>SEASON 2026</span>
                                            </div>

                                            {/* Giant 026 Numbers */}
                                            <div className="mt-4 font-display text-7xl font-black leading-none tracking-tighter lg:text-8xl xl:text-9xl">
                                                026
                                            </div>

                                            {/* Triple slashes */}
                                            <div className="mt-4 font-mono text-2xl font-black tracking-widest text-black">
                                                ///
                                            </div>
                                        </div>

                                        {/* Bottom Section: Clickable Links for Blog Tags */}
                                        <div className="space-y-3 pt-6">
                                            <nav aria-label="Blog tags" className="flex flex-col space-y-1.5">
                                                {SIDE_TAGS.map((item) => {
                                                    const isActive =
                                                        selectedCategory.toLowerCase() === item.value.toLowerCase();
                                                    return (
                                                        <button
                                                            key={item.label}
                                                            type="button"
                                                            onClick={() => scrollToArticles(item.value)}
                                                            className={`group flex items-center justify-between text-left font-mono text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
                                                                isActive
                                                                    ? 'bg-black text-[#ffe500] px-2 py-1 shadow-[2px_2px_0px_#000]'
                                                                    : 'text-black hover:bg-black/10 px-2 py-1 hover:translate-x-1'
                                                            }`}
                                                            title={`Filter posts by ${item.value}`}
                                                        >
                                                            <span className="truncate">{item.label}</span>
                                                            <span
                                                                aria-hidden="true"
                                                                className={`text-[10px] transition-transform ${
                                                                    isActive
                                                                        ? 'translate-x-0.5'
                                                                        : 'opacity-0 group-hover:opacity-100'
                                                                }`}
                                                            >
                                                                →
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </nav>

                                            {/* Technical wireframe triangle at bottom right */}
                                            <div className="flex justify-end pt-2">
                                                <svg className="h-6 w-6 stroke-black fill-none stroke-2" viewBox="0 0 24 24">
                                                    <polygon points="12 4 20 20 4 20" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* =========================================================
                            ARTICLE FEED SECTION (LIGHT THEME)
                        ========================================================= */}
                        <div id="articles-feed" className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
                            {/* Search & Category Filter Controls */}
                            <div className="mb-10 flex flex-col gap-4 border-b-2 border-black pb-6 sm:flex-row sm:items-center sm:justify-between">
                                {/* Categories Filter Pills */}
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`press cursor-pointer border-2 border-black px-3.5 py-1.5 font-mono text-xs font-black uppercase transition-colors ${
                                                selectedCategory.toLowerCase() === cat.toLowerCase()
                                                    ? 'bg-[#ffe500] text-black shadow-[2px_2px_0px_#000]'
                                                    : 'bg-white text-slate-800 hover:bg-slate-100 hover:text-black'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search write-ups…"
                                        className="h-10 w-full border-2 border-black bg-white px-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-black focus:outline-none shadow-[2px_2px_0px_#000] sm:w-72"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="absolute right-2.5 top-2.5 text-xs font-mono font-bold text-slate-500 hover:text-black cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Feed Content */}
                            {state.status === 'loading' && (
                                <div className="grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                                    {[0, 1, 2].map((n) => (
                                        <div key={n} className="h-80 border-3 border-black bg-slate-100 shadow-[6px_6px_0px_#000]" />
                                    ))}
                                </div>
                            )}

                            {state.status === 'error' && (
                                <div className="border-4 border-black bg-rose-50 p-6 text-rose-950 shadow-[6px_6px_0px_#000]">
                                    <p className="font-mono text-sm font-bold">{state.error}</p>
                                    <button
                                        type="button"
                                        onClick={reload}
                                        className="press mt-4 cursor-pointer border-2 border-black bg-white px-4 py-2 font-mono text-xs font-black text-black uppercase shadow-[2px_2px_0px_#000]"
                                    >
                                        ↻ Try again
                                    </button>
                                </div>
                            )}

                            {state.status === 'ready' && filtered.length === 0 && (
                                <div className="border-2 border-dashed border-slate-400 bg-white p-12 text-center shadow-[4px_4px_0px_#000]">
                                    <p className="font-display text-2xl font-bold text-slate-900">No write-ups found</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Try adjusting your search query or selecting a different category.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            setSelectedCategory('All');
                                        }}
                                        className="press mt-5 inline-block border-2 border-black bg-[#ffe500] px-4 py-2 font-mono text-xs font-black text-black uppercase shadow-[2px_2px_0px_#000]"
                                    >
                                        Reset filters
                                    </button>
                                </div>
                            )}

                            {state.status === 'ready' && filtered.length > 0 && (
                                <div className="space-y-12">
                                    {/* 1. FEATURED ARTICLE (If available and matching filter) */}
                                    {filtered[0] && (
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="border border-black bg-[#ffe500] px-2.5 py-0.5 font-mono text-xs font-black tracking-wider text-black uppercase shadow-[1.5px_1.5px_0px_#000]">
                                                    FEATURED STORY
                                                </span>
                                            </div>

                                            <a
                                                href={`#community/blog/${filtered[0].slug}`}
                                                className="group block border-3 border-black bg-white no-underline shadow-[8px_8px_0px_#000] transition-transform hover:-translate-y-1"
                                            >
                                                <div className="grid grid-cols-1 lg:grid-cols-12">
                                                    <div className="relative aspect-[16/9] lg:aspect-auto lg:col-span-7 overflow-hidden border-b-3 lg:border-b-0 lg:border-r-3 border-black bg-slate-100">
                                                        <PostCover
                                                            post={filtered[0]}
                                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="border border-black bg-[#ffe500] px-2.5 py-0.5 font-mono text-[10px] font-black text-black uppercase">
                                                                    {filtered[0].category || 'FEATURED'}
                                                                </span>
                                                                <span className="font-mono text-xs font-bold text-slate-500">
                                                                    {filtered[0].readMinutes} MIN READ
                                                                </span>
                                                            </div>

                                                            <h2 className="font-display mt-4 text-2xl font-black leading-tight text-slate-950 uppercase group-hover:underline sm:text-3xl">
                                                                {filtered[0].title}
                                                            </h2>

                                                            {filtered[0].excerpt && (
                                                                <p className="mt-3 font-sans text-sm leading-relaxed text-slate-700 line-clamp-3">
                                                                    {filtered[0].excerpt}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="mt-6 flex items-center justify-between border-t-2 border-slate-100 pt-4">
                                                            <span className="font-mono text-xs font-bold text-slate-600 truncate max-w-[70%]">
                                                                BY {formatAuthorNames(filtered[0]).toUpperCase()}
                                                            </span>
                                                            <span className="font-mono text-sm font-black text-black group-hover:translate-x-1 transition-transform">
                                                                READ STORY →
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        </div>
                                    )}

                                    {/* 2. LATEST STORIES GRID */}
                                    {filtered.length > 1 && (
                                        <div>
                                            <div className="mb-4 flex items-center justify-between border-b-2 border-black pb-2">
                                                <h3 className="font-mono text-xs font-black tracking-wider text-black uppercase">
                                                    LATEST STORIES
                                                </h3>
                                                <span className="font-mono text-xs font-bold text-slate-500">
                                                    {filtered.length - 1} MORE ARTICLES
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                                {filtered.slice(1).map((post) => (
                                                    <a
                                                        key={post.slug}
                                                        href={`#community/blog/${post.slug}`}
                                                        className="group flex flex-col justify-between border-3 border-black bg-white no-underline shadow-[6px_6px_0px_#000] transition-transform hover:-translate-y-1"
                                                    >
                                                        <div>
                                                            <div className="aspect-[16/9] w-full overflow-hidden border-b-3 border-black bg-slate-100">
                                                                <PostCover
                                                                    post={post}
                                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            </div>

                                                            <div className="p-5">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="border border-black bg-[#ffe500] px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-black uppercase">
                                                                        {post.category || 'ARTICLE'}
                                                                    </span>
                                                                    <span className="font-mono text-[10px] font-bold text-slate-500">
                                                                        {post.readMinutes} MIN READ
                                                                    </span>
                                                                </div>

                                                                <h4 className="font-display mt-2.5 text-lg font-black leading-snug text-slate-950 uppercase group-hover:underline">
                                                                    {post.title}
                                                                </h4>

                                                                {post.excerpt && (
                                                                    <p className="mt-2 font-sans text-xs leading-relaxed text-slate-600 line-clamp-2">
                                                                        {post.excerpt}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                                                            <span className="font-mono text-[11px] font-bold text-slate-600 truncate max-w-[80%]" title={formatAuthorNames(post)}>
                                                                {formatAuthorNames(post)}
                                                            </span>
                                                            <span className="font-mono text-xs font-black text-black group-hover:translate-x-1 transition-transform">
                                                                →
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Clean Newsletter Signup Section */}
                            <div id="newsletter-section" className="mt-20 w-full">
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

            {/* =========================================================
                FOOTER (LIGHT THEME)
            ========================================================= */}
            <footer className="border-t-4 border-black bg-white px-4 py-12 sm:px-6 lg:px-8 text-slate-900">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="font-display text-lg font-black tracking-tight text-slate-950 uppercase">
                                © Horizon
                            </span>
                            <span className="border border-black bg-[#ffe500] px-2 py-0.5 font-mono text-[10px] font-black text-black uppercase shadow-[1.5px_1.5px_0px_#000]">
                                Blogs and Newsletters
                            </span>
                        </div>
                        <p className="font-mono text-xs font-bold text-slate-600">
                            An initiative by the Asterix community
                        </p>
                        <p className="font-mono text-[11px] font-bold tracking-tight text-slate-500 uppercase">
                            PSG Institute of Technology and Applied Research
                        </p>
                    </div>

                    <div className="flex items-center gap-6 pt-2 sm:pt-0">
                        <a
                            href="#community"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="font-mono text-xs font-black text-slate-700 uppercase hover:text-black hover:underline"
                        >
                            ↑ Back to top
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                if (onBack) onBack();
                                else window.location.hash = '';
                            }}
                            className="press font-mono text-xs font-black text-black bg-[#ffe500] border-2 border-black px-3.5 py-1.5 uppercase hover:bg-yellow-400 cursor-pointer shadow-[2px_2px_0px_#000]"
                        >
                            ← Home
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
