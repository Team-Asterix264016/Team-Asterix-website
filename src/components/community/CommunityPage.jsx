import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { PostCover, PostMeta } from './PostParts';
import BlogArticle from './BlogArticle';
import NewsletterSignup from './NewsletterSignup';
import UnsubscribePanel from './UnsubscribePanel';

/* Read-only community hub. Routes live in the hash so links and the back
   button work: #community (blog), #community/pipeline,
   #community/faq, #community/blog/<slug>, and #community/unsubscribe?e=<email>&t=<token>. */
function parseRoute(hash) {
    const [path, query = ''] = hash.replace(/^#community\/?/, '').split('?');
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'blog' && parts[1]) return { view: 'article', slug: decodeURIComponent(parts[1]) };
    if (parts[0] === 'pipeline') return { view: 'pipeline' };
    if (parts[0] === 'faq') return { view: 'faq' };
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

// Upcoming editorial write-ups in development by the Asterix subsystems
const UPCOMING_PIPELINE = [
    {
        id: 'fea-4130',
        title: 'FEA of 4130 Spaceframe Under SAE Roll-Over & Dynamic Impact Load Cases',
        category: 'Chassis & FEA',
        badgeColor: 'bg-amber-300',
        author: 'Asterix Chassis Team',
        readTime: '9 min read',
        status: 'Final Proofing',
        statusColor: 'bg-emerald-300 text-emerald-950',
        summary:
            'A comprehensive breakdown of boundary constraints, weldment sizing, and how we minimized roll-cage mass by 8.4% while exceeding SAE India 2026 deformation margins.',
        tags: ['ANSYS Meshing', 'Torsional Rigidity', 'SAE Load Cases']
    },
    {
        id: 'telemetry-lora',
        title: 'Telemetry From The Dirt: Real-Time LoRa & CAN-Bus Sensor Logging on ESP32',
        category: 'Electronics & DAQ',
        badgeColor: 'bg-cyan-300',
        author: 'Electronics & Firmware Lead',
        readTime: '12 min read',
        status: 'Bench Testing',
        statusColor: 'bg-sky-300 text-sky-950',
        summary:
            'Dealing with alternator ripple noise, potting custom PCB housings against mud ingress, and streaming high-frequency suspension potentiometer data over 1.2km line-of-sight.',
        tags: ['CAN 2.0B', 'LoRa 433MHz', 'Noise Isolation', 'Pit Dashboard']
    },
    {
        id: 'cvt-tuning',
        title: 'CVT Tuning Dynamics: Primary Spring Rates, Flyweights & Thermal Belt Slip',
        category: 'Powertrain & CVT',
        badgeColor: 'bg-rose-300',
        author: 'Powertrain Division',
        readTime: '11 min read',
        status: 'Track Validated',
        statusColor: 'bg-emerald-300 text-emerald-950',
        summary:
            'How we tuned our engagement RPM for maximum initial acceleration out of muddy hairpins and mitigated secondary sheave thermal degradation during grueling 4-hour endurance heats.',
        tags: ['Flyweight Profiling', 'Secondary Preload', 'IR Belt Temp']
    },
    {
        id: 'suspension-geometry',
        title: 'Double Wishbone Kinematics: Anti-Dive, Camber Recovery & Steering Rack Optimization',
        category: 'Vehicle Dynamics',
        badgeColor: 'bg-violet-300',
        author: 'Vehicle Dynamics Team',
        readTime: '14 min read',
        status: 'CAD Validated',
        statusColor: 'bg-amber-300 text-amber-950',
        summary:
            'Kinematic modeling in Lotus Suspension, bump steer elimination, and custom CNC upright geometry designed for high-impact boulder strikes and rut tracks.',
        tags: ['Lotus Shark Modeling', 'Ackermann Geometry', '7075-T6 CNC']
    }
];

// Core pillars of open engineering
const COMMUNITY_PILLARS = [
    {
        icon: '📐',
        title: 'Transparent CAD & FEA',
        color: 'bg-amber-300',
        description:
            'No black boxes. We share real boundary conditions, ANSYS stress maps, weld setups, and SolidWorks CAD files so collegiate builders learn faster.'
    },
    {
        icon: '⚡',
        title: 'Mud-Tested Telemetry',
        color: 'bg-cyan-300',
        description:
            'Real-world sensor logs from dynamic trials. Learn how we log suspension displacement, brake rotor temperatures, and live LoRa streams.'
    },
    {
        icon: '🏁',
        title: 'Unfiltered Race Logs',
        color: 'bg-rose-300',
        description:
            'Honest post-race debriefs. We break down trackside failures, 4-hour endurance pit strategies, and fixes made with limited tools in the paddock.'
    },
    {
        icon: '🛠️',
        title: 'Open Engineering Vault',
        color: 'bg-emerald-300',
        description:
            'Direct access to suspension kinematics spreadsheets, scrutineering checklists, workshop slide decks, and rulebook study guides.'
    }
];

// FAQs for the community hub
const FAQS = [
    {
        q: 'What is Horizon?',
        a: 'Horizon is Team Asterix’s open engineering publication and technical vault. We write detailed technical debriefs, share simulation methodologies, and publish open tools for collegiate motorsport engineers across the globe.'
    },
    {
        q: 'Who writes these technical articles?',
        a: 'Every piece is authored directly by Team Asterix subsystem leads and race engineers—covering chassis design, powertrain tuning, suspension kinematics, electronics, and race operations.'
    },
    {
        q: 'Are the CAD models, spreadsheets, and firmware free to use?',
        a: 'Yes! All calculations, checklists, and code snippets published in Horizon are open for students, teams, and enthusiasts to study, replicate, and improve.'
    },
    {
        q: 'Can external student teams collaborate or pitch a guest write-up?',
        a: 'Absolutely. We welcome guest technical breakdowns, joint simulation studies, and peer discussions. Drop your topic idea in the Garage Q&A box below or connect with our leads on Discord.'
    },
    {
        q: 'How often are new articles published?',
        a: 'During build season and competition testing, we publish 2–3 deep-dives per month. Newsletter subscribers receive full technical write-ups straight to their inbox the day they go live.'
    }
];

function scrollToNewsletter() {
    const el = document.getElementById('newsletter-section');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        const input = el.querySelector('input[type="email"]');
        if (input) input.focus();
    }
}

/* ====================================================================
   PIPELINE / UPCOMING WRITE-UPS SHOWCASE
   Used both when blog has no published posts and in the dedicated tab
   ==================================================================== */
function PipelineShowcase({ isStandalone = false }) {
    return (
        <div className="space-y-6">
            {!isStandalone && (
                <div className="shadow-brutal-4 border-4 border-slate-900 bg-amber-300 p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="border-2 border-slate-900 bg-white px-2.5 py-1 font-mono text-[11px] font-black uppercase text-slate-950">
                            // 2026 EDITORIAL DISPATCH PREVIEW //
                        </span>
                        <span className="font-mono text-xs font-black uppercase text-slate-900">
                            4 Subsystem Reports In Final Polish
                        </span>
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                        First Horizon Deep-Dives Are Landing Soon
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-800 sm:text-base">
                        Our subsystem engineers are wrapping up initial write-ups from our 2026 build season.
                        Check out what is dropping into the archive below, and subscribe to receive the full write-ups
                        directly in your inbox.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {UPCOMING_PIPELINE.map((item) => (
                    <article
                        key={item.id}
                        className="shadow-brutal-4 flex flex-col justify-between border-4 border-slate-900 bg-white p-6"
                    >
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span
                                    className={`border-2 border-slate-900 ${item.badgeColor} px-2 py-0.5 font-mono text-[11px] font-black uppercase text-slate-950`}
                                >
                                    {item.category}
                                </span>
                                <span
                                    className={`border-2 border-slate-900 ${item.statusColor} px-2 py-0.5 font-mono text-[10px] font-black uppercase`}
                                >
                                    ● {item.status}
                                </span>
                            </div>

                            <h3 className="mt-3 font-display text-xl font-bold leading-snug text-slate-900">
                                {item.title}
                            </h3>

                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.summary}</p>

                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-200 pt-4">
                            <span className="font-mono text-xs font-bold text-slate-500">
                                {item.author} · {item.readTime}
                            </span>
                            <button
                                type="button"
                                onClick={scrollToNewsletter}
                                className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-amber-300 px-3 py-1.5 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-400"
                            >
                                Notify me on drop ↓
                            </button>
                        </div>
                    </article>
                ))}
            </div>
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

    // When there are no published posts in DB yet: render the rich upcoming pipeline showcase!
    if (posts.length === 0) {
        return <PipelineShowcase />;
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

/* ====================================================================
   INTERACTIVE "ASK THE GARAGE / TOPIC SUGGESTION" WIDGET
   ==================================================================== */
function TopicSuggestionWidget() {
    const [votes, setVotes] = useState({
        'Rollcage Triangulation in ANSYS': 42,
        'ESP32 LoRa Pit Telemetry Schematics': 56,
        'CVT Tuning & Flyweight Profiles': 35,
        'Brake Proportioning Valve Setup': 28
    });
    const [voted, setVoted] = useState({});
    const [topicInput, setTopicInput] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleVote = (topic) => {
        if (voted[topic]) return;
        setVotes((prev) => ({ ...prev, [topic]: (prev[topic] || 0) + 1 }));
        setVoted((prev) => ({ ...prev, [topic]: true }));
    };

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        const clean = topicInput.trim();
        if (!clean) return;
        setVotes((prev) => ({ ...prev, [clean]: 1 }));
        setVoted((prev) => ({ ...prev, [clean]: true }));
        setTopicInput('');
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
    };

    return (
        <section className="shadow-brutal-4 border-4 border-slate-900 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                    // GARAGE DISPATCH POLL //
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">Community Topic Voting</span>
            </div>

            <h3 className="mt-3 font-display text-2xl font-bold text-slate-900">
                What should Team Asterix break down next?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Our subsystem leads prioritize technical articles and workshop guides based on what students and builders
                want to learn most. Upvote an existing topic or pitch a challenge from your own garage.
            </p>

            {/* Voting chips */}
            <div className="mt-5 flex flex-wrap gap-2.5">
                {Object.entries(votes).map(([topic, count]) => (
                    <button
                        key={topic}
                        type="button"
                        onClick={() => handleVote(topic)}
                        className={`press shadow-brutal-2 cursor-pointer border-2 border-slate-900 px-3 py-2 font-mono text-xs font-black uppercase transition-colors ${
                            voted[topic]
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-50 text-slate-900 hover:bg-amber-200'
                        }`}
                    >
                        <span>{voted[topic] ? '✓ ' : '+1 '}</span>
                        <span>{topic}</span>
                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-800">
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Custom pitch input */}
            <form onSubmit={handleCustomSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Suggest a specific mechanism, formula, or subsystem topic…"
                    className="flex-1 border-2 border-slate-900 bg-white px-3 py-2.5 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                />
                <button
                    type="submit"
                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-2.5 font-mono text-xs font-black uppercase text-white hover:bg-slate-800"
                >
                    Pitch Topic
                </button>
            </form>

            {submitted && (
                <p className="mt-3 border-2 border-emerald-700 bg-emerald-50 p-2 font-mono text-xs font-bold text-emerald-950">
                    ✓ Topic added to the voting pool! Our team reviews requests every week.
                </p>
            )}
        </section>
    );
}

/* ====================================================================
   GARAGE FAQ VIEW
   ==================================================================== */
function GarageFaq() {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <div className="space-y-6">
            <div className="border-4 border-slate-900 bg-amber-300 p-6 shadow-brutal-4">
                <span className="border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                    // GARAGE KNOWLEDGE BASE //
                </span>
                <h2 className="mt-3 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                    Frequently Asked Questions
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-800 sm:text-base">
                    Everything you need to know about Horizon write-ups, open engineering resources, and collaborating
                    with Team Asterix.
                </p>
            </div>

            <div className="space-y-3">
                {FAQS.map((faq, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div
                            key={faq.q}
                            className="shadow-brutal-4 border-4 border-slate-900 bg-white"
                        >
                            <button
                                type="button"
                                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                                className="flex w-full cursor-pointer items-center justify-between p-5 text-left font-display text-lg font-bold text-slate-900 hover:bg-slate-50"
                            >
                                <span>{faq.q}</span>
                                <span className="ml-4 font-mono text-xl">{isOpen ? '−' : '+'}</span>
                            </button>
                            {isOpen && (
                                <div className="border-t-2 border-slate-200 p-5 pt-3">
                                    <p className="text-sm leading-relaxed text-slate-700">{faq.a}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <TopicSuggestionWidget />
        </div>
    );
}

const TABS = [
    { view: 'blog', label: 'Horizon Blog', href: '#community' },
    { view: 'pipeline', label: 'In The Paddock', href: '#community/pipeline' },
    { view: 'faq', label: 'Garage Q&A', href: '#community/faq' }
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

                            {/* Telemetry Stat Badges */}
                            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                                <div className="border-2 border-slate-900 bg-slate-50 p-3 shadow-brutal-2">
                                    <div className="font-mono text-2xl font-black text-slate-900">4,000+</div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        CAD & FEA Hours
                                    </div>
                                </div>
                                <div className="border-2 border-slate-900 bg-slate-50 p-3 shadow-brutal-2">
                                    <div className="font-mono text-2xl font-black text-slate-900">100%</div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Student Engineered
                                    </div>
                                </div>
                                <div className="border-2 border-slate-900 bg-slate-50 p-3 shadow-brutal-2">
                                    <div className="font-mono text-2xl font-black text-slate-900">Open</div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Tools & Schematics
                                    </div>
                                </div>
                                <div className="border-2 border-slate-900 bg-slate-50 p-3 shadow-brutal-2">
                                    <div className="font-mono text-2xl font-black text-slate-900">SAE Baja</div>
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Track Tested Data
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <nav aria-label="Community sections" className="mt-10 flex flex-wrap gap-2 border-b-4 border-slate-900">
                            {TABS.map((tab) => {
                                const active = route.view === tab.view;
                                return (
                                    <a
                                        key={tab.view}
                                        href={tab.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={`-mb-1 border-4 border-b-0 px-5 py-2.5 font-mono text-xs font-black uppercase no-underline transition-colors ${
                                            active
                                                ? 'border-slate-900 bg-white text-slate-900 shadow-brutal-2'
                                                : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                                        }`}
                                    >
                                        {tab.label}
                                    </a>
                                );
                            })}
                        </nav>

                        {/* Active Tab View */}
                        <div className="mt-8">
                            {route.view === 'pipeline' && <PipelineShowcase isStandalone={true} />}
                            {route.view === 'faq' && <GarageFaq />}
                            {route.view === 'blog' && <BlogList />}
                        </div>

                        {/* Core Engineering Pillars */}
                        <section className="mt-16">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-900 pb-3">
                                <h2 className="font-display text-2xl font-bold uppercase text-slate-900">
                                    What We Document On Horizon
                                </h2>
                                <span className="font-mono text-xs font-black uppercase text-sky-800">
                                    Open Engineering Philosophy
                                </span>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {COMMUNITY_PILLARS.map((pillar) => (
                                    <div
                                        key={pillar.title}
                                        className="shadow-brutal-4 flex flex-col justify-between border-4 border-slate-900 bg-white p-5"
                                    >
                                        <div>
                                            <div
                                                className={`flex h-12 w-12 items-center justify-center border-2 border-slate-900 ${pillar.color} text-2xl shadow-brutal-2`}
                                            >
                                                {pillar.icon}
                                            </div>
                                            <h3 className="mt-4 font-display text-lg font-bold text-slate-900">
                                                {pillar.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                                {pillar.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Interactive Topic Suggestion Section (shown on main blog/pipeline view) */}
                        {route.view !== 'faq' && (
                            <div className="mt-14">
                                <TopicSuggestionWidget />
                            </div>
                        )}

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
                                        href="https://github.com/Team-Asterix"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-white bg-slate-800 px-4 py-2 font-mono text-xs font-black uppercase text-white no-underline hover:bg-slate-700"
                                    >
                                        🐙 GitHub Vault
                                    </a>
                                    <a
                                        href="https://instagram.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-white bg-rose-500 px-4 py-2 font-mono text-xs font-black uppercase text-white no-underline hover:bg-rose-600"
                                    >
                                        📸 Instagram
                                    </a>
                                    <a
                                        href="https://youtube.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-white bg-amber-400 px-4 py-2 font-mono text-xs font-black uppercase text-slate-950 no-underline hover:bg-amber-300"
                                    >
                                        🎬 YouTube
                                    </a>
                                </div>
                            </div>
                        </section>

                        {/* Newsletter Signup Container */}
                        <div id="newsletter-section" className="mt-14 max-w-3xl">
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
