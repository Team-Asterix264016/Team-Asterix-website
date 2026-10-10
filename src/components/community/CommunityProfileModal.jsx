import { useState } from 'react';
import { useCommunityAuth } from '../../context/CommunityAuthContext';

export default function CommunityProfileModal() {
    const {
        currentMember,
        isProfileModalOpen,
        setIsProfileModalOpen,
        logout,
        setIsMessagingDrawerOpen,
        endorsements,
        endorseMember,
        showcasePins,
        addShowcasePin,
        reactToPin,
        mentorshipStatus,
        mentorshipTopics,
        updateMentorshipStatus,
        praiseList,
        addCrewPraise
    } = useCommunityAuth();

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'showcase' | 'praise' | 'evidence-card'
    const [copiedShareLink, setCopiedShareLink] = useState(false);

    // Pin artifact form state
    const [showPinForm, setShowPinForm] = useState(false);
    const [pinTitle, setPinTitle] = useState('');
    const [pinCategory, setPinCategory] = useState('code');
    const [pinUrl, setPinUrl] = useState('');
    const [pinDesc, setPinDesc] = useState('');

    // Praise form state
    const [showPraiseForm, setShowPraiseForm] = useState(false);
    const [praiseText, setPraiseText] = useState('');

    // Mentorship edit toggle
    const [isEditingMentorship, setIsEditingMentorship] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(mentorshipStatus || 'AVAILABLE');
    const [topicsInput, setTopicsInput] = useState((mentorshipTopics || []).join(', '));

    if (!isProfileModalOpen || !currentMember) return null;

    const memberEndorsements = endorsements[currentMember.id] || {};
    const totalEndorsementsCount = Object.values(memberEndorsements).reduce((sum, val) => sum + val, 0);

    const handleShareCard = () => {
        const shareUrl = `${window.location.origin}/#profile?query=${encodeURIComponent(currentMember.rollNo || currentMember.email || currentMember.id)}`;
        try {
            navigator.clipboard.writeText(shareUrl);
            setCopiedShareLink(true);
            setTimeout(() => setCopiedShareLink(false), 2500);
        } catch {
            setCopiedShareLink(true);
            setTimeout(() => setCopiedShareLink(false), 2500);
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (!pinTitle.trim()) return;
        addShowcasePin({
            title: pinTitle,
            category: pinCategory,
            url: pinUrl,
            description: pinDesc
        });
        setPinTitle('');
        setPinUrl('');
        setPinDesc('');
        setShowPinForm(false);
    };

    const handlePraiseSubmit = (e) => {
        e.preventDefault();
        if (!praiseText.trim()) return;
        addCrewPraise(currentMember.id, praiseText);
        setPraiseText('');
        setShowPraiseForm(false);
    };

    const handleSaveMentorship = () => {
        const parsedTopics = topicsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        updateMentorshipStatus(selectedStatus, parsedTopics);
        setIsEditingMentorship(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm sm:p-6"
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
        >
            <div className="flex h-[100dvh] w-full flex-col overflow-hidden border-4 border-slate-900 bg-white shadow-[10px_10px_0px_#0f172a] sm:h-auto sm:max-h-[92dvh] sm:max-w-4xl">
                {/* Modal Header */}
                <div className="z-10 flex flex-shrink-0 items-center justify-between border-b-4 border-slate-900 bg-slate-900 p-4 text-white">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-sky-400 uppercase">
                            // PROGRESSIVE COMMUNITY PROFILE
                        </span>
                        <span
                            className={`border border-white px-2 py-0.5 font-mono text-[9px] font-black uppercase ${currentMember.badgeBg}`}
                        >
                            LVL {currentMember.level} • {currentMember.rank}
                        </span>
                        <span
                            className={`border border-slate-900 px-2 py-0.5 font-mono text-[9px] font-black uppercase ${
                                currentMember.mentorshipStatus === 'AVAILABLE'
                                    ? 'bg-emerald-400 text-slate-950'
                                    : currentMember.mentorshipStatus === 'LIMITED'
                                      ? 'bg-amber-300 text-slate-950'
                                      : 'bg-slate-400 text-slate-900'
                            }`}
                        >
                            {currentMember.mentorshipStatus === 'AVAILABLE'
                                ? '🟢 OPEN FOR MENTORSHIP'
                                : currentMember.mentorshipStatus === 'LIMITED'
                                  ? '🟡 LIMITED AVAILABILITY'
                                  : '⚪ NOT MENTORING'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMessagingDrawerOpen(true)}
                            className="press cursor-pointer border border-white bg-sky-400 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase hover:bg-sky-300"
                        >
                            💬 DMs &amp; Directory
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            className="press cursor-pointer text-base font-black text-white hover:text-amber-300"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Main Scroll Content */}
                <div
                    data-modal-scroll
                    className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6 sm:p-8"
                    data-lenis-prevent="true"
                    data-lenis-prevent-wheel="true"
                >
                    {/* User Identity Header Card */}
                    <div className="relative flex flex-col items-start justify-between gap-6 border-4 border-slate-900 bg-slate-900 p-6 text-white shadow-[6px_6px_0px_#38bdf8] md:flex-row md:items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border-3 border-white bg-amber-300 font-mono text-3xl font-black text-slate-900 shadow-[3px_3px_0px_#fff]">
                                {currentMember.avatar}
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl leading-none font-black tracking-tight text-white uppercase">
                                        {currentMember.name}
                                    </h2>
                                    {currentMember.isWorkshopVerified && (
                                        <span className="border border-slate-900 bg-emerald-300 px-2 py-0.5 font-mono text-[9px] font-black text-slate-900 uppercase">
                                            ✓ VERIFIED WORKSHOP ALUMNUS
                                        </span>
                                    )}
                                </div>
                                <p className="font-mono text-xs font-bold text-slate-300">
                                    {currentMember.college} • Roll No:{' '}
                                    <strong className="text-sky-400">{currentMember.rollNo}</strong> •{' '}
                                    {currentMember.department}
                                </p>
                                <p className="font-mono text-[11px] text-slate-400">
                                    {currentMember.email} • {currentMember.phone}
                                </p>
                            </div>
                        </div>

                        {/* XP Progress Badge */}
                        <div className="w-full space-y-2 border-3 border-slate-900 bg-white p-4 text-slate-900 shadow-[3px_3px_0px_#0f172a] md:w-56">
                            <div className="flex items-center justify-between font-mono text-xs font-black">
                                <span>CONTRIBUTION XP</span>
                                <span className="text-sky-600">{currentMember.xp} XP</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden border border-slate-900 bg-slate-200">
                                <div
                                    className="h-full bg-sky-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, (currentMember.xp / 1000) * 100)}%` }}
                                />
                            </div>
                            <span className="block text-right font-mono text-[9px] text-slate-500">
                                Next Rank at 600 XP
                            </span>
                        </div>
                    </div>

                    {/* Navigation Sub-tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b-4 border-slate-900 pb-3">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`press cursor-pointer border-2 px-3 py-1.5 font-mono text-xs font-black uppercase ${
                                activeTab === 'overview'
                                    ? 'border-slate-900 bg-sky-500 text-white shadow-[2px_2px_0px_#0f172a]'
                                    : 'border-slate-300 bg-white text-slate-800 hover:bg-sky-50'
                            }`}
                        >
                            📊 Matrix &amp; Mentorship
                        </button>
                        <button
                            onClick={() => setActiveTab('showcase')}
                            className={`press cursor-pointer border-2 px-3 py-1.5 font-mono text-xs font-black uppercase ${
                                activeTab === 'showcase'
                                    ? 'border-slate-900 bg-purple-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                    : 'border-slate-300 bg-white text-slate-800 hover:bg-purple-50'
                            }`}
                        >
                            🛠 Garage Showcase ({showcasePins.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('praise')}
                            className={`press cursor-pointer border-2 px-3 py-1.5 font-mono text-xs font-black uppercase ${
                                activeTab === 'praise'
                                    ? 'border-slate-900 bg-emerald-400 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                    : 'border-slate-300 bg-white text-slate-800 hover:bg-emerald-50'
                            }`}
                        >
                            ✍️ Crew Praise ({praiseList.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('evidence-card')}
                            className={`press cursor-pointer border-2 px-3 py-1.5 font-mono text-xs font-black uppercase ${
                                activeTab === 'evidence-card'
                                    ? 'border-slate-900 bg-amber-300 text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                                    : 'border-slate-300 bg-white text-slate-800 hover:bg-amber-50'
                            }`}
                        >
                            🎓 Engineering Passport Card
                        </button>
                    </div>

                    {/* TAB 1: OVERVIEW & MENTORSHIP MATRIX */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Evidence Cards Grid */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="border-3 border-slate-900 bg-sky-50 p-4 shadow-[3px_3px_0px_#0f172a]">
                                    <span className="block font-mono text-[10px] font-black text-sky-700 uppercase">
                                        WORKSHOP TRACK
                                    </span>
                                    <span className="mt-1 block text-base font-black text-slate-900 uppercase">
                                        {currentMember.track.replace('-', ' ')}
                                    </span>
                                    <span className="mt-1 block font-mono text-[10px] font-bold text-slate-500">
                                        Status: {currentMember.attendanceStatus}
                                    </span>
                                </div>

                                <div className="border-3 border-slate-900 bg-purple-50 p-4 shadow-[3px_3px_0px_#0f172a]">
                                    <span className="block font-mono text-[10px] font-black text-purple-700 uppercase">
                                        PINNED ARTIFACTS
                                    </span>
                                    <span className="mt-1 block text-2xl font-black text-slate-900">
                                        {showcasePins.length} Artifacts Pinned
                                    </span>
                                    <span className="mt-1 block font-mono text-[10px] font-bold text-slate-500">
                                        CAD Renders, ROS2 Nodes, Schematics
                                    </span>
                                </div>

                                <div className="border-3 border-slate-900 bg-emerald-50 p-4 shadow-[3px_3px_0px_#0f172a]">
                                    <span className="block font-mono text-[10px] font-black text-emerald-700 uppercase">
                                        PEER ENDORSEMENTS
                                    </span>
                                    <span className="mt-1 block text-2xl font-black text-slate-900">
                                        {totalEndorsementsCount} Skill Endorsements
                                    </span>
                                    <span className="mt-1 block font-mono text-[10px] font-bold text-slate-500">
                                        ROS2, SolidWorks, C++
                                    </span>
                                </div>
                            </div>

                            {/* Mentorship Status & Office Hours Card */}
                            <div className="space-y-3 border-3 border-slate-900 bg-slate-50 p-5 shadow-[4px_4px_0px_#0f172a]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🎓</span>
                                        <h4 className="text-sm font-black text-slate-900 uppercase">
                                            Peer Mentorship &amp; Office Hours Status
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => setIsEditingMentorship(!isEditingMentorship)}
                                        className="press cursor-pointer border border-slate-900 bg-amber-300 px-2.5 py-1 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-amber-400"
                                    >
                                        {isEditingMentorship ? 'Cancel Edit' : '✏️ Update Status'}
                                    </button>
                                </div>

                                {isEditingMentorship ? (
                                    <div className="space-y-3 border-2 border-slate-900 bg-white p-4">
                                        <div>
                                            <label className="block font-mono text-xs font-black text-slate-900 uppercase">
                                                Mentorship Availability:
                                            </label>
                                            <select
                                                value={selectedStatus}
                                                onChange={(e) => setSelectedStatus(e.target.value)}
                                                className="mt-1 w-full border-2 border-slate-900 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-900"
                                            >
                                                <option value="AVAILABLE">🟢 OPEN FOR MENTORSHIP</option>
                                                <option value="LIMITED">🟡 LIMITED AVAILABILITY</option>
                                                <option value="NONE">⚪ NOT CURRENTLY MENTORING</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-mono text-xs font-black text-slate-900 uppercase">
                                                Topics You Can Guide Juniors In (Comma Separated):
                                            </label>
                                            <input
                                                type="text"
                                                value={topicsInput}
                                                onChange={(e) => setTopicsInput(e.target.value)}
                                                placeholder="e.g. ROS2, SolidWorks, C++, LiDAR Calibration"
                                                className="mt-1 w-full border-2 border-slate-900 bg-slate-50 p-2 font-mono text-xs font-bold text-slate-900"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSaveMentorship}
                                            className="press cursor-pointer border-2 border-slate-900 bg-slate-900 px-4 py-1.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                        >
                                            ✓ Save Status Settings
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2 font-mono text-xs text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">Current Status:</span>
                                            <span
                                                className={`border border-slate-900 px-2 py-0.5 font-black uppercase ${
                                                    currentMember.mentorshipStatus === 'AVAILABLE'
                                                        ? 'bg-emerald-300 text-slate-900'
                                                        : currentMember.mentorshipStatus === 'LIMITED'
                                                          ? 'bg-amber-300 text-slate-900'
                                                          : 'bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {currentMember.mentorshipStatus === 'AVAILABLE'
                                                    ? '🟢 Open to help juniors with technical questions'
                                                    : currentMember.mentorshipStatus === 'LIMITED'
                                                      ? '🟡 Limited hours for Q&A'
                                                      : '⚪ Currently focused on core R&D'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="font-bold">Can Help With:</span>
                                            {(mentorshipTopics || []).map((topic) => (
                                                <span
                                                    key={topic}
                                                    className="border border-slate-900 bg-white px-2 py-0.5 text-[10px] font-bold text-sky-800 shadow-[1px_1px_0px_#0f172a]"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Skills & Peer Endorsements Section */}
                            <div className="space-y-3 border-3 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_#0f172a]">
                                <h4 className="text-sm font-black text-slate-900 uppercase">
                                    Technical Skills &amp; Peer Endorsements
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {currentMember.skills.map((skill) => (
                                        <div
                                            key={skill}
                                            className="flex items-center gap-2 border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold"
                                        >
                                            <span>#{skill}</span>
                                            <button
                                                onClick={() => endorseMember(currentMember.id, skill)}
                                                className="press cursor-pointer border border-slate-900 bg-emerald-300 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-emerald-400"
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

                    {/* TAB 2: GARAGE SHOWCASE (CAD & CODE PINS) */}
                    {activeTab === 'showcase' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">
                                        🛠 Garage Proof-of-Work Showcase
                                    </h3>
                                    <p className="font-mono text-xs text-slate-600">
                                        Pin your CAD renders, ROS2 repositories, circuit diagrams, and
                                        telemetry logs.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPinForm(!showPinForm)}
                                    className="press cursor-pointer border-2 border-slate-900 bg-purple-400 px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-purple-300"
                                >
                                    {showPinForm ? '✕ Close Form' : '+ Pin Artifact (+50 XP)'}
                                </button>
                            </div>

                            {/* Pin Submission Form */}
                            {showPinForm && (
                                <form
                                    onSubmit={handlePinSubmit}
                                    className="space-y-3 border-3 border-slate-900 bg-purple-50 p-5 shadow-[4px_4px_0px_#0f172a]"
                                >
                                    <span className="block font-mono text-xs font-black text-purple-900 uppercase">
                                        // NEW ARTIFACT PIN FORM
                                    </span>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="block font-mono text-[10px] font-black text-slate-900 uppercase">
                                                Project Title *
                                            </label>
                                            <input
                                                type="text"
                                                value={pinTitle}
                                                onChange={(e) => setPinTitle(e.target.value)}
                                                placeholder="e.g. ROS2 PointCloud Filter Node"
                                                className="mt-1 w-full border-2 border-slate-900 bg-white p-2 font-mono text-xs font-bold text-slate-900"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-mono text-[10px] font-black text-slate-900 uppercase">
                                                Category *
                                            </label>
                                            <select
                                                value={pinCategory}
                                                onChange={(e) => setPinCategory(e.target.value)}
                                                className="mt-1 w-full border-2 border-slate-900 bg-white p-2 font-mono text-xs font-bold text-slate-900"
                                            >
                                                <option value="code">💻 Code / ROS2 Node</option>
                                                <option value="cad">⚙️ 3D CAD Model / Assembly</option>
                                                <option value="telemetry">
                                                    📈 Telemetry &amp; Log Graph
                                                </option>
                                                <option value="circuit">⚡ PCB &amp; Circuit Diagram</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-mono text-[10px] font-black text-slate-900 uppercase">
                                            Artifact URL (GitHub / Onshape / Google Drive Link)
                                        </label>
                                        <input
                                            type="url"
                                            value={pinUrl}
                                            onChange={(e) => setPinUrl(e.target.value)}
                                            placeholder="https://github.com/... or https://cad.onshape.com/..."
                                            className="mt-1 w-full border-2 border-slate-900 bg-white p-2 font-mono text-xs font-bold text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-mono text-[10px] font-black text-slate-900 uppercase">
                                            Description / Technical Specs
                                        </label>
                                        <textarea
                                            value={pinDesc}
                                            onChange={(e) => setPinDesc(e.target.value)}
                                            rows={2}
                                            placeholder="Briefly describe what this component does and how it contributed to the vehicle."
                                            className="mt-1 w-full border-2 border-slate-900 bg-white p-2 font-mono text-xs font-bold text-slate-900"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="press cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-2 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                    >
                                        📌 Save &amp; Pin to Profile (+50 XP)
                                    </button>
                                </form>
                            )}

                            {/* Pins Cards Grid */}
                            <div className="space-y-4">
                                {showcasePins.map((pin) => (
                                    <div
                                        key={pin.id}
                                        className="space-y-3 border-3 border-slate-900 bg-white p-5 shadow-[4px_4px_0px_#0f172a]"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="border border-slate-900 bg-purple-200 px-2 py-0.5 font-mono text-[10px] font-black text-purple-900 uppercase">
                                                    {pin.category === 'code'
                                                        ? '💻 CODE'
                                                        : pin.category === 'cad'
                                                          ? '⚙️ CAD MODEL'
                                                          : pin.category === 'telemetry'
                                                            ? '📈 TELEMETRY'
                                                            : '⚡ CIRCUIT'}
                                                </span>
                                                <h4 className="text-base font-black text-slate-900">
                                                    {pin.title}
                                                </h4>
                                            </div>
                                            <span className="font-mono text-[10px] font-bold text-slate-400">
                                                Pinned {pin.date}
                                            </span>
                                        </div>

                                        <p className="font-mono text-xs leading-relaxed text-slate-700">
                                            {pin.description}
                                        </p>

                                        {pin.url && (
                                            <a
                                                href={pin.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 border border-slate-900 bg-sky-100 px-2.5 py-1 font-mono text-[11px] font-black text-sky-900 hover:bg-sky-200"
                                            >
                                                <span>🔗 Open Project Artifact</span>
                                                <span className="text-[9px]">↗</span>
                                            </a>
                                        )}

                                        {/* Reactions row */}
                                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2 font-mono text-xs">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                Peer Praise Reactions:
                                            </span>
                                            <button
                                                onClick={() => reactToPin(pin.id, 'torque')}
                                                className="press cursor-pointer border border-slate-900 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-amber-200"
                                            >
                                                ⚡ +1 Torque ({pin.reactions?.torque || 0})
                                            </button>
                                            <button
                                                onClick={() => reactToPin(pin.id, 'clean')}
                                                className="press cursor-pointer border border-slate-900 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-emerald-200"
                                            >
                                                🔥 Clean Code ({pin.reactions?.clean || 0})
                                            </button>
                                            <button
                                                onClick={() => reactToPin(pin.id, 'brain')}
                                                className="press cursor-pointer border border-slate-900 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-purple-200"
                                            >
                                                🧠 Big Brain ({pin.reactions?.brain || 0})
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: CREW RECOMMENDATIONS & PEER PRAISE */}
                    {activeTab === 'praise' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">
                                        ✍️ Crew Recommendations &amp; Peer Praise
                                    </h3>
                                    <p className="font-mono text-xs text-slate-600">
                                        Testimonials from subsystem leads and teammates praising track
                                        performance.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPraiseForm(!showPraiseForm)}
                                    className="press cursor-pointer border-2 border-slate-900 bg-emerald-400 px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300"
                                >
                                    {showPraiseForm ? '✕ Close' : '+ Write Praise (+25 XP)'}
                                </button>
                            </div>

                            {/* Praise Form */}
                            {showPraiseForm && (
                                <form
                                    onSubmit={handlePraiseSubmit}
                                    className="space-y-3 border-3 border-slate-900 bg-emerald-50 p-5 shadow-[4px_4px_0px_#0f172a]"
                                >
                                    <span className="block font-mono text-xs font-black text-emerald-900 uppercase">
                                        // WRITE TESTIMONIAL FOR {currentMember.name}
                                    </span>
                                    <textarea
                                        value={praiseText}
                                        onChange={(e) => setPraiseText(e.target.value)}
                                        rows={3}
                                        placeholder="Write a 1-3 line recommendation highlighting their technical skills or teamwork during workshop / track testing..."
                                        className="w-full border-2 border-slate-900 bg-white p-3 font-mono text-xs font-bold text-slate-900"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="press cursor-pointer border-2 border-slate-900 bg-slate-900 px-5 py-2 font-mono text-xs font-black text-emerald-300 uppercase hover:bg-slate-800"
                                    >
                                        💬 Submit Peer Recommendation (+25 XP)
                                    </button>
                                </form>
                            )}

                            {/* Praise Cards List */}
                            <div className="space-y-3">
                                {praiseList.map((item) => (
                                    <div
                                        key={item.id}
                                        className="space-y-2 border-3 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_#0f172a]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-amber-300 font-mono font-black text-slate-900">
                                                    {item.authorAvatar}
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-black text-slate-900 uppercase">
                                                        {item.authorName}
                                                    </h5>
                                                    <span className="font-mono text-[10px] font-bold text-sky-700">
                                                        {item.authorRole}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                {item.date}
                                            </span>
                                        </div>
                                        <p className="border-l-3 border-slate-900 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 italic">
                                            "{item.comment}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: PROOF OF CONTRIBUTION PASSPORT CARD */}
                    {activeTab === 'evidence-card' && (
                        <div className="space-y-4">
                            <div className="relative space-y-6 overflow-hidden border-4 border-slate-900 bg-slate-900 p-6 text-white shadow-[8px_8px_0px_#38bdf8] sm:p-8">
                                <div className="flex flex-col items-start justify-between gap-4 border-b-4 border-white pb-4 sm:flex-row sm:items-center">
                                    <div>
                                        <span className="border border-white bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                                            OFFICIAL PROOF OF CONTRIBUTION
                                        </span>
                                        <h3 className="mt-2 text-2xl font-black text-white uppercase">
                                            ASTERIX ENGINEERING PASSPORT
                                        </h3>
                                    </div>
                                    <div className="font-mono text-xs font-bold text-sky-400 sm:text-right">
                                        <div>VERIFIED STUDENT ID</div>
                                        <div className="text-base font-black text-white">
                                            {currentMember.rollNo}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="space-y-2 font-mono text-xs text-slate-300">
                                        <div>
                                            Member Name:{' '}
                                            <strong className="text-white">{currentMember.name}</strong>
                                        </div>
                                        <div>
                                            Institution:{' '}
                                            <strong className="text-white">{currentMember.college}</strong>
                                        </div>
                                        <div>
                                            Current Rank:{' '}
                                            <strong className="text-amber-300">
                                                {currentMember.rank} (LVL {currentMember.level})
                                            </strong>
                                        </div>
                                        <div>
                                            Contribution Score:{' '}
                                            <strong className="text-sky-400">{currentMember.xp} XP</strong>
                                        </div>
                                        <div>
                                            Workshop Track:{' '}
                                            <strong className="text-white uppercase">
                                                {currentMember.track}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-2 border-white/30 bg-white/10 p-4 font-mono text-xs text-slate-200">
                                        <div className="text-[10px] font-black text-emerald-400 uppercase">
                                            ✓ VERIFIED CONTRIBUTIONS SUMMARY
                                        </div>
                                        <div>• Attended SAE BAJA Autonomous Workshop</div>
                                        <div>• {showcasePins.length} Pinned Engineering Artifacts</div>
                                        <div>• Earned {totalEndorsementsCount} Peer Skill Endorsements</div>
                                        <div>• {praiseList.length} Teammate &amp; Lead Testimonials</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-white/20 pt-4">
                                    <button
                                        onClick={handleShareCard}
                                        className="press cursor-pointer border-2 border-white bg-amber-300 px-5 py-2.5 font-mono text-xs font-black text-slate-900 uppercase shadow-[3px_3px_0px_#fff] hover:bg-amber-400"
                                    >
                                        {copiedShareLink
                                            ? '✓ Proof Link Copied!'
                                            : '🔗 Copy Shareable Backlink'}
                                    </button>

                                    <button
                                        onClick={() => window.print()}
                                        className="press cursor-pointer border-2 border-white bg-sky-400 px-4 py-2 font-mono text-xs font-black text-slate-900 uppercase shadow-[3px_3px_0px_#fff] hover:bg-sky-300"
                                    >
                                        🖨 Print / Export PDF Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Logout Footer */}
                    <div className="flex items-center justify-between border-t-2 border-slate-200 pt-4">
                        <button
                            onClick={logout}
                            className="press cursor-pointer border-2 border-slate-900 bg-slate-100 px-4 py-1.5 font-mono text-xs font-black text-rose-700 uppercase shadow-[2px_2px_0px_#0f172a] hover:bg-rose-100"
                        >
                            Log Out Session
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            className="press cursor-pointer border-2 border-slate-900 bg-slate-900 px-4 py-1.5 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                        >
                            Close Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
