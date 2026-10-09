import React, { useState, useEffect } from 'react';

export default function CookingChefCommunity({ onBack }) {
    const [heatLevel, setHeatLevel] = useState(1); // 1: Normal, 2: Hot, 3: Overdrive!
    const [chefQuoteIndex, setChefQuoteIndex] = useState(0);
    const [emailInput, setEmailInput] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [extraSparkles, setExtraSparkles] = useState([]);
    const [activeRecipe, setActiveRecipe] = useState(null);

    const chefQuotes = [
        "Whipping up the finest community algorithms! 👨‍🍳⚡",
        "Adding extra spice to the project showcase wall... 🌶️🔥",
        "Sizzling the database for lightning-fast discussion threads! 🥞🚀",
        "Simmering Baja CAD designs & workshop tutorials to perfection! 🍲⚙️",
        "Chef's kiss on the user profile & badge system! 🤌✨"
    ];

    const recipesMenu = [
        {
            id: 'forum',
            icon: '💬',
            title: 'Tech Discussions & Forums',
            prepTime: 'Almost Ready',
            badge: 'MAIN COURSE',
            tagColor: 'bg-emerald-400 text-slate-950',
            description: 'Engage with fellow builders, ask ROS/CAD questions, share tips, and solve engineering challenges together.'
        },
        {
            id: 'showcase',
            icon: '🚀',
            title: 'Project Showcase Wall',
            prepTime: 'Sizzling',
            badge: 'CHEF SPECIAL',
            tagColor: 'bg-amber-400 text-slate-950',
            description: 'Exhibit your custom Baja modifications, code repositories, 3D models, and get peer endorsements.'
        },
        {
            id: 'badges',
            icon: '🏆',
            title: 'Asterix XP & Badges',
            prepTime: 'Garnishing',
            badge: 'SIDE DISH',
            tagColor: 'bg-cyan-300 text-slate-950',
            description: 'Earn exclusive badges for workshop attendance, project submissions, and helpful community answers.'
        },
        {
            id: 'horizon',
            icon: '⚡',
            title: 'Horizon Tech Hub Streams',
            prepTime: 'Baking',
            badge: 'DESSERT',
            tagColor: 'bg-purple-400 text-slate-950',
            description: 'Access recorded sessions, downloadable engineering resource packs, and direct Q&A with team leads.'
        }
    ];

    const handleTurnUpHeat = () => {
        const nextLevel = heatLevel >= 3 ? 1 : heatLevel + 1;
        setHeatLevel(nextLevel);
        setChefQuoteIndex((prev) => (prev + 1) % chefQuotes.length);

        // Spawn a burst of extra floating particles
        const newSparkles = Array.from({ length: 8 }, (_, i) => ({
            id: Date.now() + i,
            left: Math.random() * 80 + 10,
            size: Math.random() * 16 + 12,
            symbol: ['🔥', '✨', '⚡', '🌶️', '🚀', '⭐', '💥'][Math.floor(Math.random() * 7)],
            duration: Math.random() * 1.5 + 1.2
        }));
        setExtraSparkles((prev) => [...prev.slice(-15), ...newSparkles]);
    };

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (emailInput.trim()) {
            setIsSubscribed(true);
            setEmailInput('');
        }
    };

    return (
        <div className="relative flex min-h-[100svh] w-full flex-col bg-slate-950 font-sans text-slate-100 overflow-x-hidden selection:bg-amber-400 selection:text-slate-950">
            {/* Embedded Custom Keyframe Animations */}
            <style>{`
                @keyframes wokFlip {
                    0%, 100% { transform: rotate(0deg) translateY(0px); }
                    30% { transform: rotate(-8deg) translateY(-8px); }
                    50% { transform: rotate(5deg) translateY(-14px); }
                    75% { transform: rotate(-3deg) translateY(-4px); }
                }
                @keyframes foodToss {
                    0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.9; }
                    40% { transform: translateY(-45px) rotate(180deg) scale(1.15); opacity: 1; }
                    80% { transform: translateY(-10px) rotate(320deg) scale(0.95); opacity: 0.9; }
                }
                @keyframes flameDance {
                    0%, 100% { transform: scaleY(1) scaleX(1) rotate(0deg); opacity: 0.9; }
                    25% { transform: scaleY(1.18) scaleX(0.92) rotate(-3deg); opacity: 1; }
                    50% { transform: scaleY(0.95) scaleX(1.08) rotate(2deg); opacity: 0.85; }
                    75% { transform: scaleY(1.12) scaleX(0.96) rotate(-2deg); opacity: 0.95; }
                }
                @keyframes flameDanceIntense {
                    0%, 100% { transform: scaleY(1) scaleX(1) rotate(0deg); opacity: 0.95; }
                    20% { transform: scaleY(1.35) scaleX(0.85) rotate(-6deg); opacity: 1; }
                    40% { transform: scaleY(0.85) scaleX(1.15) rotate(5deg); opacity: 0.9; }
                    60% { transform: scaleY(1.25) scaleX(0.9) rotate(-4deg); opacity: 1; }
                    80% { transform: scaleY(0.9) scaleX(1.1) rotate(3deg); opacity: 0.95; }
                }
                @keyframes steamFloat {
                    0% { transform: translateY(0) scale(0.6); opacity: 0.7; }
                    50% { transform: translateY(-25px) scale(1.1) translateX(6px); opacity: 0.5; }
                    100% { transform: translateY(-50px) scale(1.4) translateX(-8px); opacity: 0; }
                }
                @keyframes emberFloatUp {
                    0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-90px) translateX(var(--tx, 15px)) scale(0.2); opacity: 0; }
                }
                @keyframes chefBlink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes hatWobble {
                    0%, 100% { transform: rotate(0deg); }
                    33% { transform: rotate(-3deg); }
                    66% { transform: rotate(3deg); }
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.3); }
                    50% { box-shadow: 0 0 50px rgba(249, 115, 22, 0.6); }
                }
                .anim-wok { animation: wokFlip ${heatLevel === 3 ? '0.7s' : heatLevel === 2 ? '1s' : '1.4s'} ease-in-out infinite; }
                .anim-flame { animation: ${heatLevel === 3 ? 'flameDanceIntense 0.4s' : 'flameDance 0.7s'} ease-in-out infinite; }
                .anim-hat { animation: hatWobble 3s ease-in-out infinite; }
                .anim-blink { animation: chefBlink 4s infinite; }
            `}</style>

            {/* Cyber Grid & Glowing Ambient Backlight */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/30 via-slate-950 to-slate-950" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            {/* Glowing Embers Background Overlay */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />
                <div className="absolute right-1/4 top-1/2 h-80 w-80 rounded-full bg-orange-600/15 blur-[120px]" />
            </div>

            {/* TOP NAVIGATION BAR */}
            <header className="relative z-20 flex w-full items-center justify-between border-b-2 border-slate-800 bg-slate-900/90 px-4 py-3.5 backdrop-blur-md sm:px-8">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-2 flex items-center gap-2 border-2 border-slate-900 bg-amber-400 px-3.5 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-300 transition-colors"
                    >
                        <span>←</span>
                        <span>Back to Home</span>
                    </button>
                    <span className="hidden sm:inline-block border-2 border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-400">
                        COMMUNITY &amp; HORIZON HUB
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
                    </span>
                    <span className="font-mono text-xs font-bold tracking-wider text-amber-400 uppercase">
                        {heatLevel === 3 ? '🔥 OVERDRIVE COOKING' : heatLevel === 2 ? '⚡ HIGH HEAT' : '👨‍🍳 KITCHEN ACTIVE'}
                    </span>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
                <div className="mx-auto flex w-full max-w-4xl flex-col items-center">

                    {/* TOP BADGE */}
                    <div className="mb-4 inline-flex items-center gap-2 border-2 border-slate-900 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 px-4 py-1.5 shadow-brutal-3">
                        <span className="text-base">🔥</span>
                        <span className="font-mono text-xs font-black uppercase text-slate-950 tracking-wider">
                            ASTERIX TECH KITCHEN IS HEATING UP
                        </span>
                        <span className="text-base">🌶️</span>
                    </div>

                    {/* ANIMATED CHEF COOKING SHOWCASE CONTAINER */}
                    <div className={`relative mb-8 flex w-full max-w-lg flex-col items-center justify-center rounded-2xl border-4 border-slate-900 bg-slate-900/90 p-6 shadow-brutal-8 backdrop-blur-md transition-all duration-300 ${
                        heatLevel === 3 ? 'border-orange-500 shadow-orange-500/20 ring-4 ring-orange-500/30' : ''
                    }`}>

                        {/* Interactive Heat Multiplier Indicator */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border-2 border-slate-800 bg-slate-950 px-3 py-1 font-mono text-xs font-extrabold">
                            <span className="text-slate-400">HEAT:</span>
                            <span className={heatLevel === 3 ? 'text-orange-400 animate-pulse' : heatLevel === 2 ? 'text-amber-400' : 'text-emerald-400'}>
                                {heatLevel === 3 ? '500°F (MAX)' : heatLevel === 2 ? '375°F (MED)' : '250°F (LOW)'}
                            </span>
                        </div>

                        {/* Extra Floating Sparkles Effect */}
                        {extraSparkles.map((sp) => (
                            <div
                                key={sp.id}
                                className="pointer-events-none absolute font-bold z-30"
                                style={{
                                    left: `${sp.left}%`,
                                    bottom: '30%',
                                    fontSize: `${sp.size}px`,
                                    animation: `emberFloatUp ${sp.duration}s cubic-bezier(0,0,0.2,1) forwards`,
                                    '--tx': `${(Math.random() - 0.5) * 60}px`
                                }}
                            >
                                {sp.symbol}
                            </div>
                        ))}

                        {/* CHEF + WOK + FIRE GRAPHIC (SVG ANIMATION) */}
                        <div className="relative flex h-64 w-full items-center justify-center overflow-visible">

                            {/* Rising Steam Clouds */}
                            <div className="pointer-events-none absolute top-8 flex gap-6 z-20">
                                <div className="h-6 w-6 rounded-full bg-slate-300/20 blur-sm" style={{ animation: 'steamFloat 2.2s infinite ease-out' }} />
                                <div className="h-8 w-8 rounded-full bg-slate-200/25 blur-sm" style={{ animation: 'steamFloat 1.8s infinite ease-out 0.4s' }} />
                                <div className="h-5 w-5 rounded-full bg-amber-200/20 blur-sm" style={{ animation: 'steamFloat 2.5s infinite ease-out 0.8s' }} />
                            </div>

                            {/* Leaping Food / Code Ingredients in Air */}
                            <div className="pointer-events-none absolute top-4 z-20 flex w-48 justify-around">
                                <span className="text-2xl" style={{ animation: `foodToss ${heatLevel === 3 ? '0.8s' : '1.3s'} ease-in-out infinite 0s` }}>
                                    ⚡
                                </span>
                                <span className="text-xl font-mono font-black text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-amber-400/50 shadow" style={{ animation: `foodToss ${heatLevel === 3 ? '0.8s' : '1.3s'} ease-in-out infinite 0.3s` }}>
                                    &lt;code/&gt;
                                </span>
                                <span className="text-2xl" style={{ animation: `foodToss ${heatLevel === 3 ? '0.8s' : '1.3s'} ease-in-out infinite 0.6s` }}>
                                    🏎️
                                </span>
                                <span className="text-xl" style={{ animation: `foodToss ${heatLevel === 3 ? '0.8s' : '1.3s'} ease-in-out infinite 0.9s` }}>
                                    🌶️
                                </span>
                            </div>

                            {/* MAIN CHEF ILLUSTRATION */}
                            <svg className="h-full w-full max-w-[280px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">

                                {/* Glow Under Stove */}
                                <ellipse cx="100" cy="180" rx="65" ry="12" fill="url(#stoveGlow)" opacity={heatLevel === 3 ? '0.9' : '0.6'} />

                                {/* CHEF HAT (Toque Blanche) */}
                                <g className="anim-hat" style={{ transformOrigin: '100px 55px' }}>
                                    {/* Hat Base Band */}
                                    <rect x="78" y="52" width="44" height="12" rx="2" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />
                                    <rect x="80" y="55" width="40" height="3" fill="#38BDF8" />

                                    {/* Hat Puffy Top */}
                                    <path d="M72 52C66 40 70 20 85 18C92 16 98 22 100 22C102 22 108 16 115 18C130 20 134 40 128 52Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
                                    {/* Asterix Star Logo on Hat */}
                                    <path d="M100 28L102 33H107L103 36L105 41L100 38L95 41L97 36L93 33H98L100 28Z" fill="#F59E0B" />
                                </g>

                                {/* CHEF HEAD & FACE */}
                                <g>
                                    {/* Head Circle */}
                                    <circle cx="100" cy="72" r="22" fill="#FDE68A" stroke="#0F172A" strokeWidth="3" />

                                    {/* Chef Glasses / Cyber Goggles */}
                                    <rect x="84" y="66" width="14" height="10" rx="3" fill="#0EA5E9" stroke="#0F172A" strokeWidth="2.5" />
                                    <rect x="102" y="66" width="14" height="10" rx="3" fill="#0EA5E9" stroke="#0F172A" strokeWidth="2.5" />
                                    <line x1="98" y1="71" x2="102" y2="71" stroke="#0F172A" strokeWidth="2.5" />
                                    {/* Goggles reflection */}
                                    <line x1="86" y1="68" x2="92" y2="68" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="104" y1="68" x2="110" y2="68" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

                                    {/* Eyes (Blinking) */}
                                    <g className="anim-blink" style={{ transformOrigin: '100px 71px' }}>
                                        <circle cx="91" cy="71" r="2" fill="#0F172A" />
                                        <circle cx="109" cy="71" r="2" fill="#0F172A" />
                                    </g>

                                    {/* Happy Mustache */}
                                    <path d="M88 78C93 78 97 82 100 79C103 82 107 78 112 78C114 82 108 85 100 83C92 85 86 82 88 78Z" fill="#0F172A" />

                                    {/* Cheerful Smile */}
                                    <path d="M94 83Q100 87 106 83" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
                                </g>

                                {/* CHEF BODY & COAT */}
                                <g>
                                    {/* Red Neck Scarf */}
                                    <path d="M88 88C94 92 106 92 112 88L115 95H85L88 88Z" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />

                                    {/* White Coat */}
                                    <path d="M75 96C75 96 85 92 100 92C115 92 125 96 125 96L130 145H70L75 96Z" fill="#F8FAFC" stroke="#0F172A" strokeWidth="3" />

                                    {/* Double Breasted Buttons */}
                                    <circle cx="91" cy="104" r="2.5" fill="#0F172A" />
                                    <circle cx="109" cy="104" r="2.5" fill="#0F172A" />
                                    <circle cx="91" cy="116" r="2.5" fill="#0F172A" />
                                    <circle cx="109" cy="116" r="2.5" fill="#0F172A" />
                                    <circle cx="91" cy="128" r="2.5" fill="#0F172A" />
                                    <circle cx="109" cy="109" r="2.5" fill="#0F172A" />
                                </g>

                                {/* LEFT ARM - HOLDING SPICE SHAKER */}
                                <g>
                                    <path d="M72 100L55 112L45 105" stroke="#F8FAFC" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M72 100L55 112L45 105" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    {/* Spice Shaker Container */}
                                    <rect x="36" y="94" width="12" height="18" rx="2" fill="#94A3B8" stroke="#0F172A" strokeWidth="2" />
                                    <rect x="38" y="92" width="8" height="3" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.5" />
                                    {/* Falling Spices */}
                                    <circle cx="40" cy="118" r="1.5" fill="#F59E0B" />
                                    <circle cx="44" cy="122" r="1.5" fill="#EF4444" />
                                    <circle cx="37" cy="125" r="1.5" fill="#10B981" />
                                </g>

                                {/* RIGHT ARM & WOK - ANIMATED FLIP */}
                                <g className="anim-wok" style={{ transformOrigin: '125px 105px' }}>
                                    {/* Right Arm */}
                                    <path d="M125 100L145 115L160 128" stroke="#F8FAFC" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M125 100L145 115L160 128" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                                    {/* Wok Handle */}
                                    <rect x="150" y="132" width="22" height="6" rx="2" transform="rotate(25 150 132)" fill="#78350F" stroke="#0F172A" strokeWidth="2" />

                                    {/* Wok Bowl */}
                                    <path d="M110 142C110 142 125 162 155 156C175 152 182 135 182 135L110 142Z" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />

                                    {/* Sizzling Hot Interior Glow */}
                                    <path d="M115 143C125 156 150 156 175 138" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
                                </g>

                                {/* FIRE & FLAMES UNDER WOK */}
                                <g className="anim-flame" style={{ transformOrigin: '135px 165px' }}>
                                    {/* Outer Flame (Crimson) */}
                                    <path d="M105 178C100 162 112 150 120 155C125 145 138 142 142 152C148 144 162 148 160 160C168 152 175 165 168 178Z" fill="#DC2626" opacity="0.9" />

                                    {/* Mid Flame (Orange) */}
                                    <path d="M112 178C110 166 118 155 125 160C130 150 140 148 144 157C150 150 158 154 156 165C162 160 166 170 162 178Z" fill="#F97316" />

                                    {/* Core Flame (Yellow) */}
                                    <path d="M120 178C118 170 124 162 130 165C134 158 142 156 145 163C150 158 154 162 152 170C156 166 158 172 155 178Z" fill="#FBBF24" />

                                    {/* Hot Inner Blue Base */}
                                    <ellipse cx="138" cy="176" rx="18" ry="4" fill="#38BDF8" />
                                </g>

                                {/* DEFINITIONS & GRADIENTS */}
                                <defs>
                                    <radialGradient id="stoveGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 180) scale(65 12)">
                                        <stop stopColor="#F97316" stopOpacity="0.8" />
                                        <stop offset="0.6" stopColor="#EF4444" stopOpacity="0.4" />
                                        <stop offset="1" stopColor="#0F172A" stopOpacity="0" />
                                    </radialGradient>
                                </defs>
                            </svg>
                        </div>

                        {/* CHEF DYNAMIC QUOTE BUBBLE */}
                        <div className="relative mt-2 w-full rounded-xl border-2 border-slate-900 bg-amber-400 p-3 shadow-brutal-3 text-center">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-slate-900" />
                            <p className="font-mono text-xs font-black text-slate-950 uppercase sm:text-sm">
                                {chefQuotes[chefQuoteIndex]}
                            </p>
                        </div>
                    </div>

                    {/* HEADLINE & TEXT SECTION */}
                    <div className="mb-8 text-center max-w-2xl">
                        <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
                            COOKING... <br />
                            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent drop-shadow-sm">
                                COMING SOON
                            </span>
                        </h1>
                        <p className="mt-4 text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                            We are building an incredible community space for <span className="font-bold text-amber-300">Team Asterix</span> engineers, students, and workshop participants to share custom projects, collaborate on ROS/CAD code, and earn achievement badges!
                        </p>
                    </div>

                    {/* INTERACTIVE ACTION BUTTONS */}
                    <div className="mb-12 flex flex-wrap items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={handleTurnUpHeat}
                            className="press shadow-brutal-4 flex items-center gap-2.5 border-3 border-slate-900 bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3.5 font-mono text-sm font-black uppercase text-slate-950 hover:from-amber-300 hover:to-orange-400 transition-all"
                        >
                            <span className="text-lg">🔥</span>
                            <span>TURN UP THE HEAT! ({heatLevel}x)</span>
                        </button>

                        <button
                            type="button"
                            onClick={onBack}
                            className="press shadow-brutal-4 flex items-center gap-2 border-3 border-slate-900 bg-slate-800 px-6 py-3.5 font-mono text-sm font-black uppercase text-slate-100 hover:bg-slate-700 transition-colors"
                        >
                            <span>← BACK TO HOME</span>
                        </button>
                    </div>

                    {/* WHAT'S COOKING ON THE MENU? (SNEAK PEEK CARDS) */}
                    <div className="w-full">
                        <div className="mb-6 flex items-center justify-between border-b-2 border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">👨‍🍳</span>
                                <h2 className="font-mono text-sm font-black tracking-wider text-slate-300 uppercase sm:text-base">
                                    ON THE MENU — FEATURE SNEAK PEEK
                                </h2>
                            </div>
                            <span className="font-mono text-xs font-bold text-amber-400">
                                4 DISHES IN PREPARATION
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {recipesMenu.map((dish) => (
                                <div
                                    key={dish.id}
                                    onClick={() => setActiveRecipe(activeRecipe?.id === dish.id ? null : dish)}
                                    className={`group cursor-pointer rounded-xl border-3 border-slate-900 bg-slate-900/80 p-5 shadow-brutal-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:bg-slate-900 ${
                                        activeRecipe?.id === dish.id ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-850' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-900 bg-slate-800 text-2xl shadow-brutal-1">
                                                {dish.icon}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                                                    {dish.title}
                                                </h3>
                                                <span className="font-mono text-[11px] text-slate-400">
                                                    Status: <strong className="text-amber-400">{dish.prepTime}</strong>
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`inline-block rounded border-2 border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${dish.tagColor}`}>
                                            {dish.badge}
                                        </span>
                                    </div>

                                    <p className="mt-3 text-xs leading-relaxed text-slate-400 group-hover:text-slate-300">
                                        {dish.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NOTIFY ME SUBSCRIPTION BOX */}
                    <div className="mt-12 w-full rounded-2xl border-4 border-slate-900 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 shadow-brutal-6 sm:p-8">
                        <div className="flex flex-col items-center text-center">
                            <span className="inline-block rounded-full border-2 border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs font-bold text-amber-400 uppercase">
                                🔔 LAUNCH NOTIFICATION
                            </span>
                            <h3 className="mt-3 text-xl font-black text-white uppercase sm:text-2xl">
                                Want an invite as soon as the kitchen opens?
                            </h3>
                            <p className="mt-2 text-xs text-slate-300 sm:text-sm max-w-lg">
                                Leave your email or workshop roll number below. We'll send you an early access pass when the community portal goes live!
                            </p>

                            {isSubscribed ? (
                                <div className="mt-6 flex items-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-950/80 px-6 py-3 font-mono text-xs font-bold text-emerald-300 shadow-brutal-3">
                                    <span>🎉</span>
                                    <span>YOU'RE ON THE VIP CHEF LIST! WE'LL NOTIFY YOU ON LAUNCH.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSubscribe} className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                                    <input
                                        type="text"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="Enter email or Roll No..."
                                        required
                                        className="w-full rounded-lg border-2 border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        className="press shadow-brutal-2 shrink-0 border-2 border-slate-900 bg-amber-400 px-5 py-3 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-300"
                                    >
                                        GET NOTIFIED 🚀
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {/* FOOTER BAR */}
            <footer className="relative z-10 border-t-2 border-slate-800 bg-slate-950 px-4 py-4 text-center font-mono text-xs text-slate-500">
                <p>© {new Date().getFullYear()} Team Asterix &amp; Horizon Tech Hub. Crafted with 🔥 and passion for engineering.</p>
            </footer>
        </div>
    );
}
