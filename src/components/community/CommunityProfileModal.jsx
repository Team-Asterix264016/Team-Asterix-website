import { useState } from 'react';
import { useCommunityAuth } from '../../context/CommunityAuthContext';

export default function CommunityProfileModal() {
    const { currentMember, isProfileModalOpen, setIsProfileModalOpen, logout, setIsMessagingDrawerOpen, endorsements, endorseMember } = useCommunityAuth();
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'evidence-card' | 'endorsements'
    const [copiedShareLink, setCopiedShareLink] = useState(false);

    if (!isProfileModalOpen || !currentMember) return null;

    const memberEndorsements = endorsements[currentMember.id] || {};
    const totalEndorsementsCount = Object.values(memberEndorsements).reduce((sum, val) => sum + val, 0);

    const handleShareCard = () => {
        const shareUrl = `${window.location.origin}/#community-member-${currentMember.rollNo || currentMember.id}`;
        try {
            navigator.clipboard.writeText(shareUrl);
            setCopiedShareLink(true);
            setTimeout(() => setCopiedShareLink(false), 2500);
        } catch {
            setCopiedShareLink(true);
            setTimeout(() => setCopiedShareLink(false), 2500);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
        >
            <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="p-4 bg-slate-900 text-white border-b-4 border-slate-900 flex items-center justify-between flex-shrink-0 z-10">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black uppercase text-sky-400">// PROGRESSIVE COMMUNITY PROFILE</span>
                        <span className={`px-2 py-0.5 font-mono text-[9px] font-black uppercase border border-white ${currentMember.badgeBg}`}>
                            LVL {currentMember.level} • {currentMember.rank}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMessagingDrawerOpen(true)}
                            className="press px-3 py-1 bg-sky-400 text-slate-900 font-mono font-black text-xs uppercase border border-white cursor-pointer"
                        >
                            💬 DMs & Directory
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            className="press text-white hover:text-amber-300 font-black text-base cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Main Scroll Content */}
                <div
                    className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar"
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                >
                    {/* User Identity Header Card */}
                    <div className="bg-slate-900 text-white border-4 border-slate-900 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative shadow-[6px_6px_0px_#38bdf8]">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-none bg-amber-300 text-slate-900 border-3 border-white font-mono text-3xl font-black flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0px_#fff]">
                                {currentMember.avatar}
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                                        {currentMember.name}
                                    </h2>
                                    {currentMember.isWorkshopVerified && (
                                        <span className="px-2 py-0.5 bg-emerald-300 text-slate-900 font-mono text-[9px] font-black uppercase border border-slate-900">
                                            ✓ VERIFIED WORKSHOP ALUMNUS
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-mono text-slate-300 font-bold">
                                    {currentMember.college} • Roll No: <strong className="text-sky-400">{currentMember.rollNo}</strong> • {currentMember.department}
                                </p>
                                <p className="text-[11px] font-mono text-slate-400">
                                    {currentMember.email} • {currentMember.phone}
                                </p>
                            </div>
                        </div>

                        {/* XP Progress Badge */}
                        <div className="bg-white text-slate-900 border-3 border-slate-900 p-4 space-y-2 w-full md:w-56 shadow-[3px_3px_0px_#0f172a]">
                            <div className="flex items-center justify-between text-xs font-mono font-black">
                                <span>CONTRIBUTION XP</span>
                                <span className="text-sky-600">{currentMember.xp} XP</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 border border-slate-900 overflow-hidden">
                                <div
                                    className="h-full bg-sky-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, (currentMember.xp / 1000) * 100)}%` }}
                                ></div>
                            </div>
                            <span className="block text-[9px] font-mono text-slate-500 text-right">Next Rank at 600 XP</span>
                        </div>
                    </div>

                    {/* Navigation Sub-tabs */}
                    <div className="flex items-center gap-2 border-b-4 border-slate-900 pb-3">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`press px-4 py-2 border-2 font-mono font-black text-xs uppercase cursor-pointer ${
                                activeTab === 'overview'
                                    ? 'bg-sky-500 text-white border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                    : 'bg-white text-slate-800 border-slate-300 hover:bg-sky-50'
                            }`}
                        >
                            📊 Evidence Matrix & Badges
                        </button>
                        <button
                            onClick={() => setActiveTab('evidence-card')}
                            className={`press px-4 py-2 border-2 font-mono font-black text-xs uppercase cursor-pointer ${
                                activeTab === 'evidence-card'
                                    ? 'bg-amber-300 text-slate-900 border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                    : 'bg-white text-slate-800 border-slate-300 hover:bg-amber-50'
                            }`}
                        >
                            🎓 Proof-of-Contribution Passport Card
                        </button>
                    </div>

                    {/* TAB 1: OVERVIEW & EVIDENCE MATRIX */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Evidence Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-sky-50 border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                    <span className="text-[10px] font-mono font-black text-sky-700 uppercase block">WORKSHOP TRACK</span>
                                    <span className="text-base font-black text-slate-900 block mt-1 uppercase">
                                        {currentMember.track.replace('-', ' ')}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 block mt-1">
                                        Status: {currentMember.attendanceStatus}
                                    </span>
                                </div>

                                <div className="p-4 bg-amber-50 border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                    <span className="text-[10px] font-mono font-black text-amber-700 uppercase block">SUBMITTED PROJECTS</span>
                                    <span className="text-2xl font-black text-slate-900 block mt-1">1 Verified</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 block mt-1">
                                        Autonomous Perception Module
                                    </span>
                                </div>

                                <div className="p-4 bg-emerald-50 border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                                    <span className="text-[10px] font-mono font-black text-emerald-700 uppercase block">PEER ENDORSEMENTS</span>
                                    <span className="text-2xl font-black text-slate-900 block mt-1">{totalEndorsementsCount} Endorsements</span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 block mt-1">
                                        ROS2, SolidWorks, C++
                                    </span>
                                </div>
                            </div>

                            {/* Skills & Peer Endorsements Section */}
                            <div className="bg-white border-3 border-slate-900 p-5 space-y-3 shadow-[4px_4px_0px_#0f172a]">
                                <h4 className="text-sm font-black uppercase text-slate-900">Technical Skills & Peer Endorsements</h4>
                                <div className="flex flex-wrap gap-2">
                                    {currentMember.skills.map(skill => (
                                        <div key={skill} className="px-3 py-1.5 bg-slate-100 border-2 border-slate-900 font-mono text-xs font-bold flex items-center gap-2">
                                            <span>#{skill}</span>
                                            <button
                                                onClick={() => endorseMember(currentMember.id, skill)}
                                                className="press px-1.5 py-0.5 bg-emerald-300 text-slate-900 text-[10px] font-black uppercase border border-slate-900 cursor-pointer"
                                                title={`Endorse ${currentMember.name} for ${skill}`}
                                            >
                                                + Endorse ({memberEndorsements[skill] || 0})
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PROOF OF CONTRIBUTION PASSPORT CARD */}
                    {activeTab === 'evidence-card' && (
                        <div className="space-y-4">
                            <div className="bg-slate-900 text-white border-4 border-slate-900 shadow-[8px_8px_0px_#38bdf8] p-6 sm:p-8 space-y-6 relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-4 border-white pb-4">
                                    <div>
                                        <span className="px-3 py-1 bg-amber-300 text-slate-900 font-mono text-xs font-black uppercase border border-white">
                                            OFFICIAL PROOF OF CONTRIBUTION
                                        </span>
                                        <h3 className="text-2xl font-black uppercase text-white mt-2">
                                            ASTERIX ENGINEERING PASSPORT
                                        </h3>
                                    </div>
                                    <div className="text-right font-mono text-xs text-sky-400 font-bold">
                                        <div>VERIFIED STUDENT ID</div>
                                        <div className="text-white text-base font-black">{currentMember.rollNo}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 font-mono text-xs text-slate-300">
                                        <div>Member Name: <strong className="text-white">{currentMember.name}</strong></div>
                                        <div>Institution: <strong className="text-white">{currentMember.college}</strong></div>
                                        <div>Current Rank: <strong className="text-amber-300">{currentMember.rank} (LVL {currentMember.level})</strong></div>
                                        <div>Contribution Score: <strong className="text-sky-400">{currentMember.xp} XP</strong></div>
                                        <div>Workshop Track: <strong className="text-white uppercase">{currentMember.track}</strong></div>
                                    </div>

                                    <div className="p-4 bg-white/10 border-2 border-white/30 font-mono text-xs space-y-2 text-slate-200">
                                        <div className="text-[10px] text-emerald-400 font-black uppercase">✓ VERIFIED CONTRIBUTIONS SUMMARY</div>
                                        <div>• Attended SAE BAJA Autonomous Workshop</div>
                                        <div>• Submitted Project: Autonomous Perception Module</div>
                                        <div>• Earned {totalEndorsementsCount} Peer Skill Endorsements</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t-2 border-white/20">
                                    <button
                                        onClick={handleShareCard}
                                        className="press px-5 py-2.5 bg-amber-300 hover:bg-amber-400 text-slate-900 border-2 border-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#fff] cursor-pointer"
                                    >
                                        {copiedShareLink ? '✓ Proof Link Copied!' : '🔗 Copy Shareable Proof Link'}
                                    </button>

                                    <button
                                        onClick={() => window.print()}
                                        className="press px-4 py-2 bg-sky-400 hover:bg-sky-300 text-slate-900 border-2 border-white font-mono font-black text-xs uppercase shadow-[3px_3px_0px_#fff] cursor-pointer"
                                    >
                                        🖨 Print / Export PDF Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Logout Footer */}
                    <div className="pt-4 border-t-2 border-slate-200 flex items-center justify-between">
                        <button
                            onClick={logout}
                            className="press px-4 py-1.5 bg-slate-100 hover:bg-rose-100 text-rose-700 border-2 border-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                        >
                            Log Out Session
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            className="press px-4 py-1.5 bg-slate-900 text-white font-mono font-black text-xs uppercase border-2 border-slate-900 cursor-pointer"
                        >
                            Close Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
