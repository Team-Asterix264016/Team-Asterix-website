import { useState, useEffect, useCallback } from 'react';
import trackDirt from '../../assets/gallery/04_track_dirt_action.jpg';
import workshopWelding from '../../assets/gallery/02_workshop_welding.jpg';
import lidarTuning from '../../assets/gallery/03_lidar_sensor_tuning.jpg';
import teamPaddock from '../../assets/gallery/01_team_paddock.jpg';
import pitlaneMechanics from '../../assets/gallery/05_pitlane_mechanics.jpg';
import teamCelebration from '../../assets/gallery/06_team_celebration.jpg';
import { useWebsiteData } from '../../context/WebsiteDataContext';

export default function HeroPaddockGrid({ onOpenModelViewer }) {
    const { siteData } = useWebsiteData();
    const [activePhoto, setActivePhoto] = useState(null);

    const bentoItems = [
        {
            id: 'track-action',
            src: trackDirt,
            alt: 'Team Asterix Baja racecar drifting in high-speed dirt proving grounds',
            badge: 'DYNAMIC TESTING // PROVING GROUNDS',
            badgeBg: 'bg-amber-300 text-slate-950',
            title: 'High-G Dirt Drift & Cornering',
            desc: 'Full-throttle endurance run across punishing washboard ruts and loose red dirt trails. Dual wishbone suspension soaking rough terrain at speed.',
            stat: 'SPEED: 58 KM/H · LATERAL: 2.4G',
            statHighlight: 'TERRAIN TRIAL',
            featured: true,
            colSpan: 'col-span-12 lg:col-span-8'
        },
        {
            id: 'workshop-welding',
            src: workshopWelding,
            alt: 'Precision TIG welding 4130 chromoly roll cage and spaceframe',
            badge: 'FABRICATION // WORKSHOP',
            badgeBg: 'bg-rose-300 text-slate-950',
            title: '4130 Chromoly Spaceframe',
            desc: 'In-house laser coping, jigging, and precision TIG welding of AISI 4130 spaceframe joints with zero dimensional warpage.',
            stat: 'TORSIONAL RIGIDITY: 1,420 Nm/°',
            statHighlight: 'IN-HOUSE JIGGING',
            featured: false,
            colSpan: 'col-span-12 sm:col-span-6 lg:col-span-4'
        },
        {
            id: 'lidar-tuning',
            src: lidarTuning,
            alt: 'LiDAR sensor calibration and ROS2 autonomous perception pipeline',
            badge: 'AI LAB // PERCEPTION & SLAM',
            badgeBg: 'bg-cyan-300 text-slate-950',
            title: '32-Beam Real-Time SLAM',
            desc: 'Point-cloud mapping, stereo camera depth fusion, and ROS2 obstacle avoidance algorithms running in real time.',
            stat: 'INFERENCE LATENCY: 18ms',
            statHighlight: 'AUTONOMOUS STACK',
            featured: false,
            colSpan: 'col-span-12 sm:col-span-6 lg:col-span-4'
        },
        {
            id: 'pitlane-mechanics',
            src: pitlaneMechanics,
            alt: 'Mechanics tuning 3-way adjustable dampers trackside in pitlane',
            badge: 'PIT BAY // QUICK SERVICE',
            badgeBg: 'bg-yellow-300 text-slate-950',
            title: 'Damper & Brake Valving',
            desc: 'Trackside 3-way adjustable coilover valving adjustments and hydraulic line bleeding between harsh dynamic heats.',
            stat: 'TRAVEL: 10" FRONT / 11" REAR',
            statHighlight: 'RAPID PIT RESPONSE',
            featured: false,
            colSpan: 'col-span-12 sm:col-span-6 lg:col-span-4'
        },
        {
            id: 'team-paddock',
            src: teamPaddock,
            alt: 'Team Asterix student engineers performing paddock pre-race inspections',
            badge: 'COLLEGIATE CREW // SCRUTINEERING',
            badgeBg: 'bg-emerald-300 text-slate-950',
            title: 'Paddock Scrutineering',
            desc: 'Pre-race safety checklist, electrical harness lockout audits, and telemetry calibration under paddock sunrise.',
            stat: 'ROSTER: 35+ STUDENT ENGINEERS',
            statHighlight: 'SAE BAJA COHORT',
            featured: false,
            colSpan: 'col-span-12 sm:col-span-12 lg:col-span-4'
        },
        {
            id: 'team-celebration',
            src: teamCelebration,
            alt: 'Team Asterix members celebrating successful endurance trial finish',
            badge: 'MILESTONE // VICTORY',
            badgeBg: 'bg-purple-300 text-slate-950',
            title: 'Built By Students. Tested In Dirt.',
            desc: 'Months of workshop midnight oil culminated in flawless dynamic endurance passes on the national competition circuit.',
            stat: '100% IN-HOUSE FABRICATED',
            statHighlight: 'PROVING GROUNDS MILESTONE',
            featured: false,
            colSpan: 'col-span-12'
        }
    ];

    const handleKeyDown = useCallback(
        (e) => {
            if (activePhoto === null) return;
            if (e.key === 'Escape') setActivePhoto(null);
            if (e.key === 'ArrowRight') {
                setActivePhoto((prev) => (prev + 1) % bentoItems.length);
            }
            if (e.key === 'ArrowLeft') {
                setActivePhoto((prev) => (prev - 1 + bentoItems.length) % bentoItems.length);
            }
        },
        [activePhoto, bentoItems.length]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <section
            id="hero"
            className="relative min-h-[92vh] overflow-hidden border-b-4 border-slate-900 bg-white px-4 pt-10 pb-16 sm:px-8 lg:px-12 select-none"
        >
            {/* Ambient Background Grid Decal */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgb(15 23 42) 1.5px, transparent 0)',
                    backgroundSize: '28px 28px'
                }}
                aria-hidden="true"
            />

            <div className="relative z-10 mx-auto max-w-7xl">
                {/* Top Status & Verification Badges */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="shadow-brutal-2 border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black uppercase text-slate-950">
                        ⚡ TEAM ASTERIX MOTORSPORT
                    </span>
                    <span className="shadow-brutal-2 border-2 border-slate-900 bg-sky-300 px-3 py-1 font-mono text-xs font-black uppercase text-slate-950">
                        PSG iTech · SAE BAJA & AUTONOMOUS VEHICLES
                    </span>
                    <span className="shadow-brutal-2 border-2 border-slate-900 bg-slate-900 px-3 py-1 font-mono text-xs font-black uppercase text-white">
                        100% REAL RACING · ZERO AI
                    </span>
                    <span className="hidden sm:inline-block shadow-brutal-2 border-2 border-slate-900 bg-emerald-300 px-3 py-1 font-mono text-xs font-black uppercase text-slate-950">
                        CAR #01 · PROVING GROUNDS TESTED
                    </span>
                </div>

                {/* Main Hero Header & Primary Actions */}
                <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                    <div className="max-w-3xl">
                        <span className="font-mono text-xs font-black uppercase tracking-widest text-sky-800">
                            Collegiate Engineering & Off-Road Robotics
                        </span>
                        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] tracking-tight text-slate-900 sm:text-7xl lg:text-8xl">
                            Built By Hand. <br />
                            <span className="text-amber-500">Tested In Dirt.</span>
                        </h1>
                        <p className="mt-4 text-base font-bold leading-relaxed text-slate-700 sm:text-xl">
                            Real sparks, real mud, real engineering. Student engineers at PSG iTech designing,
                            welding, coding, and racing high-performance autonomous Baja vehicles.
                        </p>
                    </div>

                    {/* Primary Hero CTAs */}
                    <div className="flex flex-wrap items-center gap-3">
                        {onOpenModelViewer && (
                            <button
                                onClick={onOpenModelViewer}
                                className="press shadow-brutal-4 cursor-pointer border-3 border-slate-900 bg-amber-400 px-6 py-3.5 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-300"
                            >
                                Inspect 3D CAD Buggy ↗
                            </button>
                        )}
                        <a
                            href="#squad"
                            className="press shadow-brutal-4 border-3 border-slate-900 bg-slate-900 px-6 py-3.5 font-mono text-xs font-black uppercase text-white no-underline hover:bg-slate-800"
                        >
                            The Squad →
                        </a>
                        <a
                            href="#community"
                            className="press shadow-brutal-2 border-2 border-slate-900 bg-white px-5 py-3 font-mono text-xs font-black uppercase text-slate-900 no-underline hover:bg-slate-100"
                        >
                            Dispatches & Blog 📰
                        </a>
                        <a
                            href="#sponsor"
                            className="press shadow-brutal-2 border-2 border-slate-900 bg-emerald-400 px-5 py-3 font-mono text-xs font-black uppercase text-slate-950 no-underline hover:bg-emerald-300"
                        >
                            Partner With Us ⚡
                        </a>
                    </div>
                </div>

                {/* Section Sub-bar */}
                <div className="mt-8 flex items-center justify-between border-b-2 border-slate-900 pb-2">
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">
                        // PADDOCK & PROVING GROUNDS PHOTOGRAPHY ARCHIVE //
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600">
                        CLICK ANY PHOTO TO INSPECT TELEMETRY
                    </span>
                </div>

                {/* Authentic Photo Bento Grid (All 6 Real Track & Workshop Photos) */}
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-12">
                    {bentoItems.map((item, index) => {
                        const isFeatured = item.featured;
                        const isBanner = item.id === 'team-celebration';

                        if (isBanner) {
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setActivePhoto(index)}
                                    className="group shadow-brutal-6 relative col-span-12 cursor-pointer overflow-hidden border-4 border-slate-900 bg-slate-950 text-white transition-all hover:-translate-y-1"
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-12">
                                        <div className="relative lg:col-span-7">
                                            <img
                                                src={item.src}
                                                alt={item.alt}
                                                className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:aspect-[21/9] lg:aspect-[16/9]"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
                                        </div>
                                        <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 bg-slate-950">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`border-2 border-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase shadow-brutal-2 ${item.badgeBg}`}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                    <span className="font-mono text-[10px] font-bold text-emerald-400">
                                                        ✓ VERIFIED RUN
                                                    </span>
                                                </div>
                                                <h3 className="mt-3 font-display text-2xl font-black uppercase text-white sm:text-3xl">
                                                    {item.title}
                                                </h3>
                                                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                                    {item.desc}
                                                </p>
                                            </div>

                                            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-800 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                                    <span className="font-mono text-xs font-black text-amber-300">
                                                        {item.stat}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-white">
                                                    Inspect Photo ↗
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={item.id}
                                onClick={() => setActivePhoto(index)}
                                className={`group relative cursor-pointer overflow-hidden border-4 border-slate-900 bg-slate-950 ${
                                    isFeatured
                                        ? 'shadow-brutal-8 col-span-12 lg:col-span-8'
                                        : `${item.colSpan} shadow-brutal-4`
                                } transition-all hover:-translate-y-1`}
                            >
                                <img
                                    src={item.src}
                                    alt={item.alt}
                                    className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                                        isFeatured
                                            ? 'aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10]'
                                            : 'aspect-[4/3] sm:aspect-[16/10]'
                                    }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                                {/* Card Header Overlay */}
                                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                                    <span
                                        className={`border-2 border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-brutal-2 ${item.badgeBg}`}
                                    >
                                        {item.badge}
                                    </span>
                                    <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-xs">
                                        #{String(index + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                {/* Card Bottom Details Overlay */}
                                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                                    <h3
                                        className={`font-display font-black uppercase text-white leading-tight ${
                                            isFeatured ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg sm:text-xl'
                                        }`}
                                    >
                                        {item.title}
                                    </h3>
                                    <p
                                        className={`mt-1 font-sans text-slate-300 line-clamp-2 ${
                                            isFeatured ? 'text-xs sm:text-sm' : 'text-xs'
                                        }`}
                                    >
                                        {item.desc}
                                    </p>
                                    <div className="mt-2.5 flex items-center justify-between border-t border-white/20 pt-2">
                                        <span className="font-mono text-[11px] font-bold text-amber-300">
                                            {item.stat}
                                        </span>
                                        <span className="hidden sm:inline font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-white">
                                            View ↗
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Interactive Lightbox Inspector Modal */}
            {activePhoto !== null && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
                    onClick={() => setActivePhoto(null)}
                >
                    <div
                        className="shadow-brutal-8 relative max-h-[92vh] w-full max-w-5xl overflow-hidden border-4 border-white bg-slate-950 text-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Lightbox Header Bar */}
                        <div className="flex items-center justify-between border-b-2 border-slate-800 bg-slate-900 px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span
                                    className={`border-2 border-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase ${bentoItems[activePhoto].badgeBg}`}
                                >
                                    {bentoItems[activePhoto].badge}
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-400">
                                    [{activePhoto + 1} OF {bentoItems.length}]
                                </span>
                            </div>
                            <button
                                onClick={() => setActivePhoto(null)}
                                className="press cursor-pointer border-2 border-white bg-rose-600 px-3 py-1 font-mono text-xs font-black uppercase text-white hover:bg-rose-500"
                            >
                                ✕ Close [ESC]
                            </button>
                        </div>

                        {/* Lightbox Image Stage */}
                        <div className="relative max-h-[60vh] overflow-hidden bg-black flex items-center justify-center">
                            <img
                                src={bentoItems[activePhoto].src}
                                alt={bentoItems[activePhoto].alt}
                                className="max-h-[60vh] w-full object-contain"
                            />
                        </div>

                        {/* Lightbox Footer Info & Controls */}
                        <div className="p-4 sm:p-6 bg-slate-950">
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                <div>
                                    <h2 className="font-display text-2xl font-black uppercase text-white sm:text-3xl">
                                        {bentoItems[activePhoto].title}
                                    </h2>
                                    <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-300">
                                        {bentoItems[activePhoto].desc}
                                    </p>
                                    <div className="mt-2 font-mono text-xs font-black text-amber-300">
                                        TECHNICAL TELEMETRY: {bentoItems[activePhoto].stat}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setActivePhoto(
                                                (prev) => (prev - 1 + bentoItems.length) % bentoItems.length
                                            )
                                        }
                                        className="press cursor-pointer border-2 border-white bg-slate-800 px-4 py-2 font-mono text-xs font-black uppercase text-white hover:bg-slate-700"
                                    >
                                        ← Prev
                                    </button>
                                    <button
                                        onClick={() =>
                                            setActivePhoto((prev) => (prev + 1) % bentoItems.length)
                                        }
                                        className="press cursor-pointer border-2 border-white bg-amber-400 px-4 py-2 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-300"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
