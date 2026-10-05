import { useState } from 'react';
import {
    COMMUNITY_CATEGORIES,
    INITIAL_DISCUSSIONS,
    INITIAL_PROJECTS,
    INITIAL_RESOURCES,
    HORIZON_BLOGS
} from '../data/communityData';

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
    const [newThreadForm, setNewThreadForm] = useState({ title: '', author: '', category: 'ros', content: '' });
    const [newProjectForm, setNewProjectForm] = useState({ title: '', author: '', category: 'Autonomous Systems', description: '', tags: '', githubUrl: '', image: '' });
    const [replyText, setReplyText] = useState('');

    // Newsletter State
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterStatus, setNewsletterStatus] = useState('');

    // Handlers
    const handleUpvoteDiscussion = (id, e) => {
        e.stopPropagation();
        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, upvotes: d.upvotes + 1 } : d));
    };

    const handleStarProject = (id, e) => {
        e.stopPropagation();
        setProjects(prev => prev.map(p => p.id === id ? { ...p, stars: p.stars + 1 } : p));
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

        setDiscussions(prev => prev.map(d => {
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
        }));

        setReplyText('');
    };

    const handleCreateThread = (e) => {
        e.preventDefault();
        if (!newThreadForm.title || !newThreadForm.content) return;
        const catObj = COMMUNITY_CATEGORIES.find(c => c.id === newThreadForm.category) || COMMUNITY_CATEGORIES[1];
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
            image: newProjectForm.image || 'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=800&q=80',
            description: newProjectForm.description,
            tags: newProjectForm.tags ? newProjectForm.tags.split(',').map(t => t.trim()) : ['Community', 'Hardware'],
            stars: 1,
            githubUrl: newProjectForm.githubUrl || '#',
            demoUrl: '#'
        };
        setProjects([newProj, ...projects]);
        setNewProjectForm({ title: '', author: '', category: 'Autonomous Systems', description: '', tags: '', githubUrl: '', image: '' });
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
    const filteredDiscussions = discussions.filter(d => {
        const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
        const matchesSearch = !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-sky-500 selection:text-white pb-20">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white border-b-4 border-slate-900 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-[0_4px_0_#0f172a]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="press press-flat px-3.5 py-1.5 bg-amber-300 hover:bg-amber-400 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                    >
                        ← Back to Live Site
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-none">
                            ASTERIX COMMUNITY & HORIZON HUB
                        </h1>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                            Engineering Discussions • Student Showcase • Open Vault • Technical Horizon Blog
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-300 border-2 border-slate-900 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#0f172a]">
                        ● OPEN COMMUNITY ACTIVE
                    </span>
                </div>
            </header>

            {/* Banner Header */}
            <section className="bg-slate-900 text-white border-b-4 border-slate-900 px-4 sm:px-8 py-10 relative overflow-hidden">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-400 text-slate-900 border-2 border-white font-mono text-xs font-black uppercase rotate-[-1deg] shadow-[3px_3px_0px_#fff]">
                            <span>✦ TEAM ASTERIX KNOWLEDGE ECOSYSTEM</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none text-white">
                            LEARN, DISCUSS & BUILD <span className="text-sky-400">TOGETHER</span>
                        </h2>
                        <p className="text-sm font-mono text-slate-300 font-bold">
                            Where autonomous vehicle developers, robotics engineers, and workshop alumni solve hard engineering problems and share deep tech breakthroughs.
                        </p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                        <div className="p-3 bg-white text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#38bdf8] text-center">
                            <span className="block text-2xl font-black">{discussions.length}</span>
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-500">Discussions</span>
                        </div>
                        <div className="p-3 bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#fff] text-center">
                            <span className="block text-2xl font-black">{projects.length}</span>
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-900">Projects</span>
                        </div>
                        <div className="p-3 bg-emerald-300 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#fff] text-center">
                            <span className="block text-2xl font-black">{INITIAL_RESOURCES.length}</span>
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-900">Resources</span>
                        </div>
                        <div className="p-3 bg-rose-400 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#fff] text-center">
                            <span className="block text-2xl font-black">{HORIZON_BLOGS.length}</span>
                            <span className="text-[9px] font-mono font-bold uppercase text-slate-900">Blogs</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Navigation Tabs Bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
                <div className="flex flex-wrap items-center gap-2 border-b-4 border-slate-900 pb-3">
                    <button
                        onClick={() => setActiveTab('discussions')}
                        className={`press press-flat px-4 py-2.5 border-2 font-mono font-black text-xs uppercase cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                            activeTab === 'discussions'
                                ? 'bg-sky-500 text-white border-slate-900 translate-y-[-1px]'
                                : 'bg-white hover:bg-sky-50 text-slate-800 border-slate-900'
                        }`}
                    >
                        <span>💬 Trending Discussions</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-mono">{discussions.length}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`press press-flat px-4 py-2.5 border-2 font-mono font-black text-xs uppercase cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                            activeTab === 'projects'
                                ? 'bg-amber-300 text-slate-900 border-slate-900 translate-y-[-1px]'
                                : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-900'
                        }`}
                    >
                        <span>🛠️ Project Showcase Wall</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-mono">{projects.length}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`press press-flat px-4 py-2.5 border-2 font-mono font-black text-xs uppercase cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                            activeTab === 'resources'
                                ? 'bg-emerald-300 text-slate-900 border-slate-900 translate-y-[-1px]'
                                : 'bg-white hover:bg-emerald-50 text-slate-800 border-slate-900'
                        }`}
                    >
                        <span>📚 Resource Vault</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-mono">{INITIAL_RESOURCES.length}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('horizon')}
                        className={`press press-flat px-4 py-2.5 border-2 font-mono font-black text-xs uppercase cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] ${
                            activeTab === 'horizon'
                                ? 'bg-rose-400 text-slate-900 border-slate-900 translate-y-[-1px]'
                                : 'bg-white hover:bg-rose-50 text-slate-800 border-slate-900'
                        }`}
                    >
                        <span>📰 "HORIZON" Tech Blog</span>
                        <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-mono">{HORIZON_BLOGS.length}</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: TRENDING DISCUSSIONS */}
            {activeTab === 'discussions' && (
                <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
                    {/* Filter & Action Header */}
                    <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-4 sm:p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4 mb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase text-slate-900">Community Q&A & Technical Discussions</h3>
                                <p className="text-xs font-mono font-bold text-slate-500">Ask questions, share code snippets, and solve autonomous robotics challenges together.</p>
                            </div>
                            <button
                                onClick={() => setIsNewDiscussionOpen(true)}
                                className="press px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto"
                            >
                                <span>+ Start New Discussion</span>
                            </button>
                        </div>

                        {/* Search & Category Pills */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5 flex-1">
                                {COMMUNITY_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`press px-3 py-1 border-2 font-mono text-[11px] uppercase font-bold cursor-pointer transition-all ${
                                            selectedCategory === cat.id
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_#38bdf8]'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                        }`}
                                    >
                                        <span>{cat.icon} {cat.label}</span>
                                    </button>
                                ))}
                            </div>

                            <input
                                type="text"
                                placeholder="Search discussions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3.5 py-1.5 bg-slate-50 border-2 border-slate-900 font-mono text-xs text-slate-900 focus:bg-white focus:outline-none w-full sm:w-64"
                            />
                        </div>
                    </div>

                    {/* Discussions List */}
                    <div className="space-y-4">
                        {filteredDiscussions.map(disc => (
                            <div
                                key={disc.id}
                                onClick={() => setActiveThread(disc)}
                                className="bg-white border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4 sm:p-6 hover:translate-x-1 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2 py-0.5 bg-sky-100 border border-slate-900 text-sky-800 font-mono text-[9px] font-black uppercase">
                                                {disc.categoryLabel}
                                            </span>
                                            {disc.isSolved && (
                                                <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-600 text-emerald-800 font-mono text-[9px] font-black uppercase flex items-center gap-1">
                                                    ✓ SOLVED
                                                </span>
                                            )}
                                            <span className="text-[10px] font-mono text-slate-400">• Posted by <strong>{disc.author}</strong> ({disc.timestamp})</span>
                                        </div>

                                        <h4 className="text-lg font-black uppercase text-slate-900 group-hover:text-sky-600 transition-colors">
                                            {disc.title}
                                        </h4>
                                        <p className="text-xs font-mono text-slate-600 line-clamp-2">
                                            {disc.summary}
                                        </p>
                                    </div>

                                    {/* Action Counters */}
                                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={(e) => handleUpvoteDiscussion(disc.id, e)}
                                            className="press px-3 py-1.5 bg-slate-100 hover:bg-sky-100 border-2 border-slate-900 font-mono text-xs font-black text-slate-900 flex flex-col items-center shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                                            title="Upvote discussion"
                                        >
                                            <span className="text-xs">▲</span>
                                            <span>{disc.upvotes}</span>
                                        </button>

                                        <span className="text-[10px] font-mono font-bold text-slate-500">
                                            💬 {disc.repliesCount} replies
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredDiscussions.length === 0 && (
                            <div className="bg-white border-4 border-slate-900 p-8 text-center font-mono">
                                <p className="text-slate-500 text-sm font-bold">No discussions found matching your filter.</p>
                                <button
                                    onClick={() => setIsNewDiscussionOpen(true)}
                                    className="mt-3 press px-4 py-2 bg-sky-500 text-white font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]"
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
                <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
                    <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black uppercase text-slate-900">Project Showcase Wall</h3>
                            <p className="text-xs font-mono font-bold text-slate-500">Explore autonomous systems, custom mechanical builds, and student open-source hardware.</p>
                        </div>
                        <button
                            onClick={() => setIsNewProjectOpen(true)}
                            className="press px-4 py-2 bg-amber-300 hover:bg-amber-400 text-slate-900 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        >
                            + Submit Your Project
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {projects.map(proj => (
                            <div key={proj.id} className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between overflow-hidden group hover:translate-y-[-2px] transition-transform">
                                <div className="relative h-48 border-b-4 border-slate-900 overflow-hidden bg-slate-900">
                                    <img src={proj.image} alt={proj.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" />
                                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-amber-300 text-slate-900 border-2 border-slate-900 font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_#0f172a]">
                                        {proj.authorBadge}
                                    </span>
                                </div>

                                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <h4 className="text-base font-black uppercase text-slate-900 leading-tight">
                                            {proj.title}
                                        </h4>
                                        <p className="text-xs font-mono text-slate-600 line-clamp-3">
                                            {proj.description}
                                        </p>
                                    </div>

                                    <div className="space-y-3 pt-3 border-t-2 border-slate-200">
                                        <div className="flex flex-wrap gap-1">
                                            {proj.tags.map(t => (
                                                <span key={t} className="px-2 py-0.5 bg-sky-50 border border-slate-300 text-slate-700 font-mono text-[9px] font-bold">
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                onClick={(e) => handleStarProject(proj.id, e)}
                                                className="press px-3 py-1 bg-amber-50 hover:bg-amber-300 border border-slate-900 font-mono text-xs font-black text-slate-900 flex items-center gap-1 shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                                            >
                                                <span>⭐</span>
                                                <span>{proj.stars} Stars</span>
                                            </button>

                                            {proj.githubUrl && proj.githubUrl !== '#' && (
                                                <a
                                                    href={proj.githubUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-mono font-black text-sky-600 hover:text-slate-900 underline flex items-center gap-1"
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
                <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6">
                    <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-4 sm:p-6 mb-6">
                        <h3 className="text-xl font-black uppercase text-slate-900">Resource Vault & Technical Cheatsheets</h3>
                        <p className="text-xs font-mono font-bold text-slate-500">Download verified CAD models, ROS2 configuration templates, and FEA stress calculation sheets.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {INITIAL_RESOURCES.map(res => (
                            <div key={res.id} className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-5 flex flex-col justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-600 text-emerald-900 font-mono text-[9px] font-black uppercase">
                                            {res.category}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-black">
                                            {res.type} • {res.size}
                                        </span>
                                    </div>

                                    <h4 className="text-base font-black uppercase text-slate-900">{res.title}</h4>
                                    <p className="text-xs font-mono text-slate-600">{res.description}</p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200">
                                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                                        📥 {res.downloads} Downloads
                                    </span>

                                    <a
                                        href={res.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="press px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a]"
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
                <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6 space-y-8">
                    {/* Featured Article Spotlight Header */}
                    <div className="bg-slate-900 text-white border-4 border-slate-900 shadow-[8px_8px_0px_#38bdf8] grid grid-cols-1 md:grid-cols-2 overflow-hidden">
                        <div className="h-64 md:h-auto overflow-hidden relative">
                            <img src={HORIZON_BLOGS[0].image} alt={HORIZON_BLOGS[0].title} className="w-full h-full object-cover" />
                            <span className="absolute top-4 left-4 px-3 py-1 bg-rose-400 text-slate-900 border-2 border-white font-mono text-xs font-black uppercase shadow-[2px_2px_0px_#fff]">
                                ★ HORIZON FEATURED STORY
                            </span>
                        </div>

                        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-xs font-mono text-sky-400">
                                    <span>{HORIZON_BLOGS[0].date}</span>
                                    <span>•</span>
                                    <span>{HORIZON_BLOGS[0].readTime}</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black uppercase text-white leading-tight">
                                    {HORIZON_BLOGS[0].title}
                                </h3>
                                <p className="text-xs font-mono text-slate-300">
                                    {HORIZON_BLOGS[0].excerpt}
                                </p>
                            </div>

                            <button
                                onClick={() => setActiveBlog(HORIZON_BLOGS[0])}
                                className="press px-5 py-2.5 bg-rose-400 hover:bg-rose-300 text-slate-900 border-2 border-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#fff] cursor-pointer self-start"
                            >
                                Read Full Article →
                            </button>
                        </div>
                    </div>

                    {/* Blog Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {HORIZON_BLOGS.slice(1).map(blog => (
                            <div key={blog.id} className="bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between overflow-hidden">
                                <div className="h-48 overflow-hidden relative border-b-4 border-slate-900">
                                    <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
                                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-sky-400 text-slate-900 border-2 border-slate-900 font-mono text-[9px] font-black uppercase">
                                        {blog.category}
                                    </span>
                                </div>

                                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 font-bold">
                                            <span>{blog.date}</span>
                                            <span>•</span>
                                            <span>{blog.readTime}</span>
                                        </div>
                                        <h4 className="text-lg font-black uppercase text-slate-900 leading-tight">
                                            {blog.title}
                                        </h4>
                                        <p className="text-xs font-mono text-slate-600 line-clamp-3">
                                            {blog.excerpt}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t-2 border-slate-200 flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold text-slate-500">By {blog.author}</span>
                                        <button
                                            onClick={() => setActiveBlog(blog)}
                                            className="press px-3.5 py-1.5 bg-slate-900 hover:bg-sky-600 text-white font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer"
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
            <section className="max-w-6xl mx-auto px-4 sm:px-8 mt-12">
                <div className="bg-amber-300 border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                        <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-black uppercase">
                            NEWSLETTER SUBSCRIPTION
                        </span>
                        <h3 className="text-2xl font-black uppercase text-slate-900 leading-none">
                            SUBSCRIBE TO "HORIZON" TECH DIGEST
                        </h3>
                        <p className="text-xs font-mono font-bold text-slate-800">
                            Get weekly autonomous vehicle tutorials, ROS2 perception deep dives, and workshop project announcements directly to your inbox.
                        </p>
                    </div>

                    <form onSubmit={handleSubscribeNewsletter} className="w-full md:w-auto flex flex-col sm:flex-row items-stretch gap-2">
                        <input
                            type="email"
                            required
                            placeholder="Enter your email address..."
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            className="px-4 py-2.5 bg-white border-2 border-slate-900 font-mono text-xs text-slate-900 focus:outline-none w-full sm:w-72 shadow-[2px_2px_0px_#0f172a]"
                        />
                        <button
                            type="submit"
                            className="press px-5 py-2.5 bg-slate-900 hover:bg-sky-600 text-white border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer whitespace-nowrap"
                        >
                            Subscribe Now 📬
                        </button>
                    </form>
                </div>
                {newsletterStatus && (
                    <div className="mt-2 p-2 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 font-mono text-xs font-bold text-center">
                        {newsletterStatus}
                    </div>
                )}
            </section>

            {/* MODAL 1: Discussion Thread Viewer */}
            {activeThread && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 bg-slate-900 text-white border-b-4 border-slate-900 flex items-center justify-between">
                            <span className="font-mono text-xs font-black uppercase text-sky-400">// DISCUSSION THREAD</span>
                            <button onClick={() => setActiveThread(null)} className="press text-white hover:text-amber-300 font-black text-base cursor-pointer">✕ CLOSE</button>
                        </div>

                        {/* Thread Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="space-y-3 border-b-2 border-slate-200 pb-5">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-sky-100 text-sky-900 border border-slate-900 font-mono text-[9px] font-black uppercase">{activeThread.categoryLabel}</span>
                                    <span className="text-[10px] font-mono text-slate-500">Posted by <strong>{activeThread.author}</strong> ({activeThread.timestamp})</span>
                                </div>
                                <h3 className="text-xl font-black uppercase text-slate-900">{activeThread.title}</h3>
                                <div className="bg-slate-50 border-2 border-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                                    {activeThread.content}
                                </div>
                            </div>

                            {/* Replies List */}
                            <div className="space-y-4">
                                <h4 className="font-mono font-black text-xs uppercase text-slate-900">Replies & Solutions ({activeThread.replies?.length || 0})</h4>
                                {activeThread.replies?.map((rep) => (
                                    <div key={rep.id} className="p-3.5 bg-slate-100 border-2 border-slate-900 font-mono text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                                            <span>{rep.author} ({rep.authorRole})</span>
                                            <span>{rep.timestamp}</span>
                                        </div>
                                        <p className="text-slate-900 font-medium">{rep.content}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Add Reply Input */}
                            <div className="space-y-2 pt-4 border-t-2 border-slate-200">
                                <textarea
                                    rows="3"
                                    placeholder="Write your technical reply or solution..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-900 font-mono text-xs focus:bg-white focus:outline-none"
                                />
                                <button
                                    onClick={() => handleAddReply(activeThread.id)}
                                    className="press px-4 py-2 bg-sky-500 text-white font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer"
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
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 bg-slate-900 text-white border-b-4 border-slate-900 flex items-center justify-between">
                            <span className="font-mono text-xs font-black uppercase text-rose-400">// "HORIZON" TECH ARTICLE</span>
                            <button onClick={() => setActiveBlog(null)} className="press text-white hover:text-rose-400 font-black text-base cursor-pointer">✕ CLOSE ARTICLE</button>
                        </div>

                        {/* Article Scroll Body */}
                        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1">
                            <div className="space-y-3 border-b-4 border-slate-900 pb-6">
                                <span className="px-2.5 py-1 bg-rose-400 text-slate-900 border-2 border-slate-900 font-mono text-xs font-black uppercase">
                                    {activeBlog.category}
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 leading-tight">
                                    {activeBlog.title}
                                </h2>
                                <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-500">
                                    <span>By {activeBlog.author}</span>
                                    <span>•</span>
                                    <span>{activeBlog.date}</span>
                                    <span>•</span>
                                    <span>{activeBlog.readTime}</span>
                                </div>
                            </div>

                            <div className="h-64 overflow-hidden border-4 border-slate-900">
                                <img src={activeBlog.image} alt={activeBlog.title} className="w-full h-full object-cover" />
                            </div>

                            <div className="font-mono text-sm leading-relaxed text-slate-800 space-y-4 whitespace-pre-line">
                                {activeBlog.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: New Discussion Form */}
            {isNewDiscussionOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] max-w-xl w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                            <h3 className="font-black uppercase text-lg text-slate-900">Start New Discussion</h3>
                            <button onClick={() => setIsNewDiscussionOpen(false)} className="font-mono font-black text-slate-400 hover:text-slate-900">✕</button>
                        </div>
                        <form onSubmit={handleCreateThread} className="space-y-3 font-mono text-xs">
                            <div>
                                <label className="block font-bold mb-1">Your Name</label>
                                <input type="text" required placeholder="e.g. Alex Rivera" value={newThreadForm.author} onChange={e => setNewThreadForm({ ...newThreadForm, author: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Topic Category</label>
                                <select value={newThreadForm.category} onChange={e => setNewThreadForm({ ...newThreadForm, category: e.target.value })} className="w-full p-2 border-2 border-slate-900">
                                    {COMMUNITY_CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Thread Title</label>
                                <input type="text" required placeholder="Describe your question or engineering topic..." value={newThreadForm.title} onChange={e => setNewThreadForm({ ...newThreadForm, title: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Detailed Explanation & Code/Logs</label>
                                <textarea rows="5" required placeholder="Provide details..." value={newThreadForm.content} onChange={e => setNewThreadForm({ ...newThreadForm, content: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <button type="submit" className="press w-full py-2.5 bg-sky-500 text-white font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">Publish Thread</button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: New Project Form */}
            {isNewProjectOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] max-w-xl w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                            <h3 className="font-black uppercase text-lg text-slate-900">Submit Project Showcase</h3>
                            <button onClick={() => setIsNewProjectOpen(false)} className="font-mono font-black text-slate-400 hover:text-slate-900">✕</button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-3 font-mono text-xs">
                            <div>
                                <label className="block font-bold mb-1">Project Title</label>
                                <input type="text" required placeholder="e.g. Custom CAN Telemetry Logger" value={newProjectForm.title} onChange={e => setNewProjectForm({ ...newProjectForm, title: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Author / Team Name</label>
                                <input type="text" required placeholder="e.g. Rahul & Perception Team" value={newProjectForm.author} onChange={e => setNewProjectForm({ ...newProjectForm, author: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Description</label>
                                <textarea rows="3" required placeholder="Brief project overview..." value={newProjectForm.description} onChange={e => setNewProjectForm({ ...newProjectForm, description: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">Tech Stack Tags (comma-separated)</label>
                                <input type="text" placeholder="e.g. ROS2, Python, SolidWorks" value={newProjectForm.tags} onChange={e => setNewProjectForm({ ...newProjectForm, tags: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <div>
                                <label className="block font-bold mb-1">GitHub / Code URL</label>
                                <input type="url" placeholder="https://github.com/..." value={newProjectForm.githubUrl} onChange={e => setNewProjectForm({ ...newProjectForm, githubUrl: e.target.value })} className="w-full p-2 border-2 border-slate-900" />
                            </div>
                            <button type="submit" className="press w-full py-2.5 bg-amber-300 text-slate-900 font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">Publish Project</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
