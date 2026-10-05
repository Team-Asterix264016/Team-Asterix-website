import { useState } from 'react';
import {
    COMMUNITY_CATEGORIES,
    INITIAL_DISCUSSIONS,
    INITIAL_PROJECTS,
    INITIAL_RESOURCES,
    HORIZON_BLOGS
} from '../data/communityData';
import { useModalBehavior } from '../hooks/useModalBehavior';

export default function CommunityPage({ onBack }) {
    const [activeTab, setActiveTab] = useState('discussions'); // 'discussions' | 'projects' | 'resources' | 'horizon'
    const [discussions, setDiscussions] = useState(INITIAL_DISCUSSIONS);
    const [projects, setProjects] = useState(INITIAL_PROJECTS);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [activeBlog, setActiveBlog] = useState(null);
    const [activeThread, setActiveThread] = useState(null);
    const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

    // Form States
    const [newThreadForm, setNewThreadForm] = useState({
        title: '',
        author: '',
        category: 'ros',
        content: ''
    });
    const [newProjectForm, setNewProjectForm] = useState({
        title: '',
        author: '',
        category: 'Autonomous Systems',
        description: '',
        tags: '',
        githubUrl: '',
        image: ''
    });
    const [replyText, setReplyText] = useState('');

    // Newsletter State
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterStatus, setNewsletterStatus] = useState('');

    const threadModalRef = useModalBehavior(Boolean(activeThread), () => setActiveThread(null));
    const blogModalRef = useModalBehavior(Boolean(activeBlog), () => setActiveBlog(null));
    const newDiscussionModalRef = useModalBehavior(isNewDiscussionOpen, () => setIsNewDiscussionOpen(false));
    const newProjectModalRef = useModalBehavior(isNewProjectOpen, () => setIsNewProjectOpen(false));

    // Handlers
    const handleUpvoteDiscussion = (id, e) => {
        e.stopPropagation();
        setDiscussions((prev) => prev.map((d) => (d.id === id ? { ...d, upvotes: d.upvotes + 1 } : d)));
    };

    const handleStarProject = (id, e) => {
        e.stopPropagation();
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, stars: p.stars + 1 } : p)));
    };

    const handleAddReply = (threadId) => {
        if (!replyText.trim()) return;
        const newReply = {
            id: `rep-${Date.now()}`,
            author: 'You (Community Member)',
            authorRole: 'Community Member',
            timestamp: 'Just now',
            upvotes: 0,
            content: replyText
        };

        setDiscussions((prev) =>
            prev.map((d) => {
                if (d.id === threadId) {
                    const updated = {
                        ...d,
                        repliesCount: d.repliesCount + 1,
                        replies: [...(d.replies || []), newReply]
                    };
                    if (activeThread && activeThread.id === threadId) {
                        setActiveThread(updated);
                    }
                    return updated;
                }
                return d;
            })
        );

        setReplyText('');
    };

    const handleCreateThread = (e) => {
        e.preventDefault();
        if (!newThreadForm.title || !newThreadForm.content) return;
        const catObj =
            COMMUNITY_CATEGORIES.find((c) => c.id === newThreadForm.category) || COMMUNITY_CATEGORIES[1];
        const newThread = {
            id: `disc-${Date.now()}`,
            title: newThreadForm.title,
            author: newThreadForm.author || 'Community Member',
            authorRole: 'Community Member',
            avatar: (newThreadForm.author || 'C')[0].toUpperCase(),
            badge: 'MEMBER',
            category: newThreadForm.category,
            categoryLabel: catObj.label,
            timestamp: 'Just now',
            upvotes: 1,
            repliesCount: 0,
            isSolved: false,
            summary: newThreadForm.content.slice(0, 140) + '...',
            content: newThreadForm.content,
            replies: []
        };
        setDiscussions([newThread, ...discussions]);
        setNewThreadForm({ title: '', author: '', category: 'ros', content: '' });
        setIsNewDiscussionOpen(false);
    };

    const handleCreateProject = (e) => {
        e.preventDefault();
        if (!newProjectForm.title || !newProjectForm.description) return;
        const newProj = {
            id: `proj-${Date.now()}`,
            title: newProjectForm.title,
            author: newProjectForm.author || 'Community Contributor',
            authorBadge: 'COMMUNITY BUILD',
            category: newProjectForm.category,
            image:
                newProjectForm.image ||
                'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=800&q=80',
            description: newProjectForm.description,
            tags: newProjectForm.tags
                ? newProjectForm.tags.split(',').map((t) => t.trim())
                : ['Community', 'Hardware'],
            stars: 1,
            githubUrl: newProjectForm.githubUrl || '#',
            demoUrl: '#'
        };
        setProjects([newProj, ...projects]);
        setNewProjectForm({
            title: '',
            author: '',
            category: 'Autonomous Systems',
            description: '',
            tags: '',
            githubUrl: '',
            image: ''
        });
        setIsNewProjectOpen(false);
    };

    const handleSubscribeNewsletter = (e) => {
        e.preventDefault();
        if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) return;
        setNewsletterStatus('Subscribing...');
        setTimeout(() => {
            setNewsletterStatus('🎉 Subscribed successfully to Horizon Tech Digest!');
            setNewsletterEmail('');
        }, 800);
    };

    // Filtering discussions
    const filteredDiscussions = discussions.filter((d) => {
        const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
        const matchesSearch =
            !searchQuery ||
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-100 pb-20 font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b-4 border-slate-900 bg-white px-4 py-3.5 shadow-[0_4px_0_#0f172a] sm:px-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="press press-flat shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-amber-300 px-3.5 py-1.5 font-mono text-xs font-black uppercase hover:bg-amber-400"
                    >
                        ← Back to Live Site
                    </button>
                    <div>
                        <h1 className="text-lg leading-none font-black tracking-tight text-slate-900 uppercase sm:text-xl">
                            ASTERIX COMMUNITY & HORIZON HUB
                        </h1>
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                            Engineering Discussions • Student Showcase • Open Vault • Technical Horizon Blog
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="shadow-brutal-2 border-2 border-slate-900 bg-emerald-300 px-2.5 py-1 font-mono text-[10px] font-black uppercase">
                        ● OPEN COMMUNITY ACTIVE
                    </span>
                </div>
            </header>

            {/* Banner Header */}
            <section className="relative overflow-hidden border-b-4 border-slate-900 bg-slate-900 px-4 py-10 text-white sm:px-8">
                <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                    <div className="max-w-2xl space-y-2">
                        <div className="shadow-brutal-3-white inline-flex rotate-[-1deg] items-center gap-2 border-2 border-white bg-sky-400 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                            <span>✦ TEAM ASTERIX KNOWLEDGE ECOSYSTEM</span>
                        </div>
                        <h2 className="text-3xl leading-none font-black tracking-tight text-white uppercase sm:text-4xl lg:text-5xl">
                            LEARN, DISCUSS & BUILD <span className="text-sky-400">TOGETHER</span>
                        </h2>
                        <p className="font-mono text-sm font-bold text-slate-300">
                            Where autonomous vehicle developers, robotics engineers, and workshop alumni solve
                            hard engineering problems and share deep tech breakthroughs.
                        </p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 md:w-auto">
                        <div className="shadow-brutal-3-light border-2 border-slate-900 bg-white p-3 text-center text-slate-900">
                            <span className="block text-2xl font-black">{discussions.length}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-500 uppercase">
                                Discussions
                            </span>
                        </div>
                        <div className="shadow-brutal-3-white border-2 border-slate-900 bg-amber-300 p-3 text-center text-slate-900">
                            <span className="block text-2xl font-black">{projects.length}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-900 uppercase">
                                Projects
                            </span>
                        </div>
                        <div className="shadow-brutal-3-white border-2 border-slate-900 bg-emerald-300 p-3 text-center text-slate-900">
                            <span className="block text-2xl font-black">{INITIAL_RESOURCES.length}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-900 uppercase">
                                Resources
                            </span>
                        </div>
                        <div className="shadow-brutal-3-white border-2 border-slate-900 bg-rose-400 p-3 text-center text-slate-900">
                            <span className="block text-2xl font-black">{HORIZON_BLOGS.length}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-900 uppercase">
                                Blogs
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Navigation Tabs Bar */}
            <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
                <div className="flex flex-wrap items-center gap-2 border-b-4 border-slate-900 pb-3">
                    <button
                        onClick={() => setActiveTab('discussions')}
                        className={`press press-flat shadow-brutal-2 flex cursor-pointer items-center gap-2 border-2 px-4 py-2.5 font-mono text-xs font-black uppercase ${
                            activeTab === 'discussions'
                                ? 'translate-y-[-1px] border-slate-900 bg-sky-500 text-slate-950'
                                : 'border-slate-900 bg-white text-slate-800 hover:bg-sky-50'
                        }`}
                    >
                        <span>💬 Trending Discussions</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-white">
                            {discussions.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`press press-flat shadow-brutal-2 flex cursor-pointer items-center gap-2 border-2 px-4 py-2.5 font-mono text-xs font-black uppercase ${
                            activeTab === 'projects'
                                ? 'translate-y-[-1px] border-slate-900 bg-amber-300 text-slate-900'
                                : 'border-slate-900 bg-white text-slate-800 hover:bg-amber-50'
                        }`}
                    >
                        <span>🛠️ Project Showcase Wall</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-white">
                            {projects.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`press press-flat shadow-brutal-2 flex cursor-pointer items-center gap-2 border-2 px-4 py-2.5 font-mono text-xs font-black uppercase ${
                            activeTab === 'resources'
                                ? 'translate-y-[-1px] border-slate-900 bg-emerald-300 text-slate-900'
                                : 'border-slate-900 bg-white text-slate-800 hover:bg-emerald-50'
                        }`}
                    >
                        <span>📚 Resource Vault</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-white">
                            {INITIAL_RESOURCES.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('horizon')}
                        className={`press press-flat shadow-brutal-2 flex cursor-pointer items-center gap-2 border-2 px-4 py-2.5 font-mono text-xs font-black uppercase ${
                            activeTab === 'horizon'
                                ? 'translate-y-[-1px] border-slate-900 bg-rose-400 text-slate-900'
                                : 'border-slate-900 bg-white text-slate-800 hover:bg-rose-50'
                        }`}
                    >
                        <span>📰 "HORIZON" Tech Blog</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-white">
                            {HORIZON_BLOGS.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB 1: TRENDING DISCUSSIONS */}
            {activeTab === 'discussions' && (
                <main className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
                    {/* Filter & Action Header */}
                    <div className="shadow-brutal-6 mb-6 border-4 border-slate-900 bg-white p-4 sm:p-6">
                        <div className="mb-4 flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 md:flex-row md:items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">
                                    Community Q&A & Technical Discussions
                                </h3>
                                <p className="font-mono text-xs font-bold text-slate-500">
                                    Ask questions, share code snippets, and solve autonomous robotics
                                    challenges together.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsNewDiscussionOpen(true)}
                                className="press shadow-brutal-2 flex cursor-pointer items-center justify-center gap-2 self-start border-2 border-slate-900 bg-sky-500 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-400 md:self-auto"
                            >
                                <span>+ Start New Discussion</span>
                            </button>
                        </div>

                        {/* Search & Category Pills */}
                        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="flex flex-1 flex-wrap items-center gap-1.5">
                                {COMMUNITY_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`press cursor-pointer border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase transition-all ${
                                            selectedCategory === cat.id
                                                ? 'shadow-brutal-2-light border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span>
                                            {cat.icon} {cat.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <input
                                type="text"
                                placeholder="Search discussions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border-2 border-slate-900 bg-slate-50 px-3.5 py-1.5 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none sm:w-64"
                            />
                        </div>
                    </div>

                    {/* Discussions List */}
                    <div className="space-y-4">
                        {filteredDiscussions.map((disc) => (
                            <div
                                key={disc.id}
                                onClick={() => setActiveThread(disc)}
                                className="shadow-brutal-4 group cursor-pointer border-3 border-slate-900 bg-white p-4 transition-all hover:translate-x-1 sm:p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="border border-slate-900 bg-sky-100 px-2 py-0.5 font-mono text-[9px] font-black text-sky-800 uppercase">
                                                {disc.categoryLabel}
                                            </span>
                                            {disc.isSolved && (
                                                <span className="flex items-center gap-1 border border-emerald-600 bg-emerald-100 px-2 py-0.5 font-mono text-[9px] font-black text-emerald-800 uppercase">
                                                    ✓ SOLVED
                                                </span>
                                            )}
                                            <span className="font-mono text-[10px] text-slate-500">
                                                • Posted by <strong>{disc.author}</strong> ({disc.timestamp})
                                            </span>
                                        </div>

                                        <h4 className="text-lg font-black text-slate-900 uppercase transition-colors group-hover:text-sky-700">
                                            {disc.title}
                                        </h4>
                                        <p className="line-clamp-2 font-mono text-xs text-slate-600">
                                            {disc.summary}
                                        </p>
                                    </div>

                                    {/* Action Counters */}
                                    <div className="flex flex-shrink-0 flex-col items-center gap-2">
                                        <button
                                            onClick={(e) => handleUpvoteDiscussion(disc.id, e)}
                                            className="press shadow-brutal-2 flex cursor-pointer flex-col items-center border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-black text-slate-900 hover:bg-sky-100"
                                            title="Upvote discussion"
                                        >
                                            <span className="text-xs">▲</span>
                                            <span>{disc.upvotes}</span>
                                        </button>

                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                            💬 {disc.repliesCount} replies
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredDiscussions.length === 0 && (
                            <div className="border-4 border-slate-900 bg-white p-8 text-center font-mono">
                                <p className="text-sm font-bold text-slate-500">
                                    No discussions found matching your filter.
                                </p>
                                <button
                                    onClick={() => setIsNewDiscussionOpen(true)}
                                    className="press shadow-brutal-2 mt-3 border-2 border-slate-900 bg-sky-500 px-4 py-2 text-xs font-black text-slate-950 uppercase"
                                >
                                    + Start the first discussion
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* TAB 2: PROJECT SHOWCASE WALL */}
            {activeTab === 'projects' && (
                <main className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
                    <div className="shadow-brutal-6 mb-6 flex flex-col items-start justify-between gap-4 border-4 border-slate-900 bg-white p-4 sm:flex-row sm:items-center sm:p-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase">
                                Project Showcase Wall
                            </h3>
                            <p className="font-mono text-xs font-bold text-slate-500">
                                Explore autonomous systems, custom mechanical builds, and student open-source
                                hardware.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsNewProjectOpen(true)}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-amber-400"
                        >
                            + Submit Your Project
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {projects.map((proj) => (
                            <div
                                key={proj.id}
                                className="shadow-brutal-6 group flex flex-col justify-between overflow-hidden border-4 border-slate-900 bg-white transition-transform hover:translate-y-[-2px]"
                            >
                                <div className="relative h-48 overflow-hidden border-b-4 border-slate-900 bg-slate-900">
                                    <img
                                        src={proj.image}
                                        alt={proj.title}
                                        className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <span className="shadow-brutal-2 absolute top-3 left-3 border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[9px] font-black text-slate-900 uppercase">
                                        {proj.authorBadge}
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
                                    <div className="space-y-2">
                                        <h4 className="text-base leading-tight font-black text-slate-900 uppercase">
                                            {proj.title}
                                        </h4>
                                        <p className="line-clamp-3 font-mono text-xs text-slate-600">
                                            {proj.description}
                                        </p>
                                    </div>

                                    <div className="space-y-3 border-t-2 border-slate-200 pt-3">
                                        <div className="flex flex-wrap gap-1">
                                            {proj.tags.map((t) => (
                                                <span
                                                    key={t}
                                                    className="border border-slate-300 bg-sky-50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-700"
                                                >
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                onClick={(e) => handleStarProject(proj.id, e)}
                                                className="press shadow-brutal-2 flex cursor-pointer items-center gap-1 border border-slate-900 bg-amber-50 px-3 py-1 font-mono text-xs font-black text-slate-900 hover:bg-amber-300"
                                            >
                                                <span>⭐</span>
                                                <span>{proj.stars} Stars</span>
                                            </button>

                                            {proj.githubUrl && proj.githubUrl !== '#' && (
                                                <a
                                                    href={proj.githubUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 font-mono text-xs font-black text-sky-700 underline hover:text-slate-900"
                                                >
                                                    <span>GitHub Repo ↗</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            )}

            {/* TAB 3: RESOURCE VAULT */}
            {activeTab === 'resources' && (
                <main className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
                    <div className="shadow-brutal-6 mb-6 border-4 border-slate-900 bg-white p-4 sm:p-6">
                        <h3 className="text-xl font-black text-slate-900 uppercase">
                            Resource Vault & Technical Cheatsheets
                        </h3>
                        <p className="font-mono text-xs font-bold text-slate-500">
                            Download verified CAD models, ROS2 configuration templates, and FEA stress
                            calculation sheets.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {INITIAL_RESOURCES.map((res) => (
                            <div
                                key={res.id}
                                className="shadow-brutal-6 flex flex-col justify-between gap-4 border-4 border-slate-900 bg-white p-5"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="border border-emerald-600 bg-emerald-100 px-2.5 py-0.5 font-mono text-[9px] font-black text-emerald-900 uppercase">
                                            {res.category}
                                        </span>
                                        <span className="bg-slate-900 px-2 py-0.5 font-mono text-[9px] font-black text-white">
                                            {res.type} • {res.size}
                                        </span>
                                    </div>

                                    <h4 className="text-base font-black text-slate-900 uppercase">
                                        {res.title}
                                    </h4>
                                    <p className="font-mono text-xs text-slate-600">{res.description}</p>
                                </div>

                                <div className="flex items-center justify-between border-t-2 border-slate-200 pt-3">
                                    <span className="font-mono text-[10px] font-bold text-slate-500">
                                        📥 {res.downloads} Downloads
                                    </span>

                                    <a
                                        href={res.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press shadow-brutal-2 border-2 border-slate-900 bg-emerald-400 px-4 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300"
                                    >
                                        Download File ⤓
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            )}

            {/* TAB 4: HORIZON TECH BLOG */}
            {activeTab === 'horizon' && (
                <main className="mx-auto mt-6 max-w-6xl space-y-8 px-4 sm:px-8">
                    {/* Featured Article Spotlight Header */}
                    <div className="shadow-brutal-8-light grid grid-cols-1 overflow-hidden border-4 border-slate-900 bg-slate-900 text-white md:grid-cols-2">
                        <div className="relative h-64 overflow-hidden md:h-auto">
                            <img
                                src={HORIZON_BLOGS[0].image}
                                alt={HORIZON_BLOGS[0].title}
                                className="h-full w-full object-cover"
                            />
                            <span className="shadow-brutal-2-white absolute top-4 left-4 border-2 border-white bg-rose-400 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                                ★ HORIZON FEATURED STORY
                            </span>
                        </div>

                        <div className="flex flex-col justify-between space-y-4 p-6 sm:p-8">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 font-mono text-xs text-sky-400">
                                    <span>{HORIZON_BLOGS[0].date}</span>
                                    <span>•</span>
                                    <span>{HORIZON_BLOGS[0].readTime}</span>
                                </div>
                                <h3 className="text-xl leading-tight font-black text-white uppercase sm:text-2xl">
                                    {HORIZON_BLOGS[0].title}
                                </h3>
                                <p className="font-mono text-xs text-slate-300">{HORIZON_BLOGS[0].excerpt}</p>
                            </div>

                            <button
                                onClick={() => setActiveBlog(HORIZON_BLOGS[0])}
                                className="press shadow-brutal-3-white cursor-pointer self-start border-2 border-white bg-rose-400 px-5 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-rose-300"
                            >
                                Read Full Article →
                            </button>
                        </div>
                    </div>

                    {/* Blog Grid */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {HORIZON_BLOGS.slice(1).map((blog) => (
                            <div
                                key={blog.id}
                                className="shadow-brutal-6 flex flex-col justify-between overflow-hidden border-4 border-slate-900 bg-white"
                            >
                                <div className="relative h-48 overflow-hidden border-b-4 border-slate-900">
                                    <img
                                        src={blog.image}
                                        alt={blog.title}
                                        className="h-full w-full object-cover"
                                    />
                                    <span className="absolute top-3 left-3 border-2 border-slate-900 bg-sky-400 px-2 py-0.5 font-mono text-[9px] font-black text-slate-900 uppercase">
                                        {blog.category}
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-slate-500">
                                            <span>{blog.date}</span>
                                            <span>•</span>
                                            <span>{blog.readTime}</span>
                                        </div>
                                        <h4 className="text-lg leading-tight font-black text-slate-900 uppercase">
                                            {blog.title}
                                        </h4>
                                        <p className="line-clamp-3 font-mono text-xs text-slate-600">
                                            {blog.excerpt}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between border-t-2 border-slate-200 pt-3">
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                            By {blog.author}
                                        </span>
                                        <button
                                            onClick={() => setActiveBlog(blog)}
                                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-3.5 py-1.5 font-mono text-xs font-black text-white uppercase hover:bg-sky-600"
                                        >
                                            Read →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            )}

            {/* Newsletter CTA Section */}
            <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-8">
                <div className="shadow-brutal-8 flex flex-col items-center justify-between gap-6 border-4 border-slate-900 bg-amber-300 p-6 sm:p-8 md:flex-row">
                    <div className="max-w-xl space-y-2">
                        <span className="bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black text-white uppercase">
                            NEWSLETTER SUBSCRIPTION
                        </span>
                        <h3 className="text-2xl leading-none font-black text-slate-900 uppercase">
                            SUBSCRIBE TO "HORIZON" TECH DIGEST
                        </h3>
                        <p className="font-mono text-xs font-bold text-slate-800">
                            Get weekly autonomous vehicle tutorials, ROS2 perception deep dives, and workshop
                            project announcements directly to your inbox.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubscribeNewsletter}
                        className="flex w-full flex-col items-stretch gap-2 sm:flex-row md:w-auto"
                    >
                        <input
                            type="email"
                            required
                            placeholder="Enter your email address..."
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            className="shadow-brutal-2 w-full border-2 border-slate-900 bg-white px-4 py-2.5 font-mono text-xs text-slate-900 focus:outline-none sm:w-72"
                        />
                        <button
                            type="submit"
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-2.5 font-mono text-xs font-black whitespace-nowrap text-white uppercase hover:bg-sky-600"
                        >
                            Subscribe Now 📬
                        </button>
                    </form>
                </div>
                {newsletterStatus && (
                    <div className="mt-2 border-2 border-emerald-600 bg-emerald-100 p-2 text-center font-mono text-xs font-bold text-emerald-900">
                        {newsletterStatus}
                    </div>
                )}
            </section>

            {/* MODAL 1: Discussion Thread Viewer */}
            {activeThread && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/80 p-3 backdrop-blur-sm sm:p-6"
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveThread(null);
                    }}
                >
                    <div
                        ref={threadModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="community-thread-title"
                        tabIndex={-1}
                        className="shadow-brutal-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden border-4 border-slate-900 bg-white"
                    >
                        {/* Header */}
                        <div className="z-10 flex flex-shrink-0 items-center justify-between border-b-4 border-slate-900 bg-slate-900 p-4 text-white">
                            <span className="font-mono text-xs font-black text-sky-400 uppercase">
                                // DISCUSSION THREAD
                            </span>
                            <button
                                onClick={() => setActiveThread(null)}
                                className="press cursor-pointer text-base font-black text-white hover:text-amber-300"
                            >
                                ✕ CLOSE
                            </button>
                        </div>

                        {/* Thread Content */}
                        <div
                            className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6"
                            data-lenis-prevent="true"
                            data-lenis-prevent-wheel="true"
                        >
                            <div className="space-y-3 border-b-2 border-slate-200 pb-5">
                                <div className="flex items-center gap-2">
                                    <span className="border border-slate-900 bg-sky-100 px-2 py-0.5 font-mono text-[9px] font-black text-sky-900 uppercase">
                                        {activeThread.categoryLabel}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500">
                                        Posted by <strong>{activeThread.author}</strong> (
                                        {activeThread.timestamp})
                                    </span>
                                </div>
                                <h3
                                    id="community-thread-title"
                                    className="text-xl leading-snug font-black text-slate-900 uppercase sm:text-2xl"
                                >
                                    {activeThread.title}
                                </h3>
                                <div className="border-2 border-slate-900 bg-slate-50 p-4 font-mono text-xs leading-relaxed whitespace-pre-line text-slate-800">
                                    {activeThread.content}
                                </div>
                            </div>

                            {/* Replies List */}
                            <div className="space-y-4">
                                <h4 className="font-mono text-xs font-black text-slate-900 uppercase">
                                    Replies & Solutions ({activeThread.replies?.length || 0})
                                </h4>
                                {activeThread.replies?.map((rep) => (
                                    <div
                                        key={rep.id}
                                        className="space-y-1 border-2 border-slate-900 bg-slate-100 p-3.5 font-mono text-xs"
                                    >
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                            <span>
                                                {rep.author} ({rep.authorRole})
                                            </span>
                                            <span>{rep.timestamp}</span>
                                        </div>
                                        <p className="font-medium text-slate-900">{rep.content}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Add Reply Input */}
                            <div className="space-y-2 border-t-2 border-slate-200 pt-4">
                                <textarea
                                    rows="3"
                                    placeholder="Write your technical reply or solution..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full border-2 border-slate-900 bg-slate-50 p-3 font-mono text-xs focus:bg-white focus:outline-none"
                                />
                                <button
                                    onClick={() => handleAddReply(activeThread.id)}
                                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-500 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase"
                                >
                                    Post Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Full Horizon Blog Post Reader */}
            {activeBlog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/80 p-3 backdrop-blur-sm sm:p-6"
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveBlog(null);
                    }}
                >
                    <div
                        ref={blogModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="community-blog-title"
                        tabIndex={-1}
                        className="shadow-brutal-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border-4 border-slate-900 bg-white"
                    >
                        {/* Header */}
                        <div className="z-10 flex flex-shrink-0 items-center justify-between border-b-4 border-slate-900 bg-slate-900 p-4 text-white">
                            <span className="font-mono text-xs font-black text-rose-400 uppercase">
                                // "HORIZON" TECH ARTICLE
                            </span>
                            <button
                                onClick={() => setActiveBlog(null)}
                                className="press cursor-pointer text-base font-black text-white hover:text-rose-400"
                            >
                                ✕ CLOSE ARTICLE
                            </button>
                        </div>

                        {/* Article Scroll Body */}
                        <div
                            className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 sm:p-10"
                            data-lenis-prevent="true"
                            data-lenis-prevent-wheel="true"
                        >
                            <div className="space-y-3 border-b-4 border-slate-900 pb-6">
                                <span className="border-2 border-slate-900 bg-rose-400 px-2.5 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                                    {activeBlog.category}
                                </span>
                                <h2
                                    id="community-blog-title"
                                    className="text-2xl leading-tight font-black text-slate-900 uppercase sm:text-3xl"
                                >
                                    {activeBlog.title}
                                </h2>
                                <div className="flex items-center gap-3 font-mono text-xs font-bold text-slate-500">
                                    <span>By {activeBlog.author}</span>
                                    <span>•</span>
                                    <span>{activeBlog.date}</span>
                                    <span>•</span>
                                    <span>{activeBlog.readTime}</span>
                                </div>
                            </div>

                            <div className="h-64 overflow-hidden border-4 border-slate-900">
                                <img
                                    src={activeBlog.image}
                                    alt={activeBlog.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            <div className="space-y-4 font-mono text-sm leading-relaxed whitespace-pre-line text-slate-800">
                                {activeBlog.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: New Discussion Form */}
            {isNewDiscussionOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm"
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsNewDiscussionOpen(false);
                    }}
                >
                    <div
                        ref={newDiscussionModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="community-new-discussion-title"
                        tabIndex={-1}
                        className="shadow-brutal-10 custom-scrollbar max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto border-4 border-slate-900 bg-white p-6"
                    >
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                            <h3
                                id="community-new-discussion-title"
                                className="text-lg font-black text-slate-900 uppercase"
                            >
                                Start New Discussion
                            </h3>
                            <button
                                onClick={() => setIsNewDiscussionOpen(false)}
                                className="font-mono font-black text-slate-500 hover:text-slate-900"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateThread} className="space-y-3 font-mono text-xs">
                            <div>
                                <label className="mb-1 block font-bold">Your Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Alex Rivera"
                                    value={newThreadForm.author}
                                    onChange={(e) =>
                                        setNewThreadForm({ ...newThreadForm, author: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">Topic Category</label>
                                <select
                                    value={newThreadForm.category}
                                    onChange={(e) =>
                                        setNewThreadForm({ ...newThreadForm, category: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                >
                                    {COMMUNITY_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">Thread Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Describe your question or engineering topic..."
                                    value={newThreadForm.title}
                                    onChange={(e) =>
                                        setNewThreadForm({ ...newThreadForm, title: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">
                                    Detailed Explanation & Code/Logs
                                </label>
                                <textarea
                                    rows="5"
                                    required
                                    placeholder="Provide details..."
                                    value={newThreadForm.content}
                                    onChange={(e) =>
                                        setNewThreadForm({ ...newThreadForm, content: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <button
                                type="submit"
                                className="press shadow-brutal-2 w-full border-2 border-slate-900 bg-sky-500 py-2.5 text-xs font-black text-slate-950 uppercase"
                            >
                                Publish Thread
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: New Project Form */}
            {isNewProjectOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm"
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsNewProjectOpen(false);
                    }}
                >
                    <div
                        ref={newProjectModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="community-new-project-title"
                        tabIndex={-1}
                        className="shadow-brutal-10 custom-scrollbar max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto border-4 border-slate-900 bg-white p-6"
                    >
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                            <h3
                                id="community-new-project-title"
                                className="text-lg font-black text-slate-900 uppercase"
                            >
                                Submit Project Showcase
                            </h3>
                            <button
                                onClick={() => setIsNewProjectOpen(false)}
                                className="font-mono font-black text-slate-500 hover:text-slate-900"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-3 font-mono text-xs">
                            <div>
                                <label className="mb-1 block font-bold">Project Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Custom CAN Telemetry Logger"
                                    value={newProjectForm.title}
                                    onChange={(e) =>
                                        setNewProjectForm({ ...newProjectForm, title: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">Author / Team Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rahul & Perception Team"
                                    value={newProjectForm.author}
                                    onChange={(e) =>
                                        setNewProjectForm({ ...newProjectForm, author: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">Description</label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Brief project overview..."
                                    value={newProjectForm.description}
                                    onChange={(e) =>
                                        setNewProjectForm({ ...newProjectForm, description: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">
                                    Tech Stack Tags (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. ROS2, Python, SolidWorks"
                                    value={newProjectForm.tags}
                                    onChange={(e) =>
                                        setNewProjectForm({ ...newProjectForm, tags: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-bold">GitHub / Code URL</label>
                                <input
                                    type="url"
                                    placeholder="https://github.com/..."
                                    value={newProjectForm.githubUrl}
                                    onChange={(e) =>
                                        setNewProjectForm({ ...newProjectForm, githubUrl: e.target.value })
                                    }
                                    className="w-full border-2 border-slate-900 p-2"
                                />
                            </div>
                            <button
                                type="submit"
                                className="press shadow-brutal-2 w-full border-2 border-slate-900 bg-amber-300 py-2.5 text-xs font-black text-slate-900 uppercase"
                            >
                                Publish Project
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
