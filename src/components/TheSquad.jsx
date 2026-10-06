import React, { useState, useEffect } from 'react';
import ScrollStack from './ScrollStack';
import { useWebsiteData } from '../context/WebsiteDataContext';

export default function TheSquad({ onSelectSubsystem }) {
    const { siteData } = useWebsiteData();
    const subsystems = siteData.subsystems;
    const [activeIdx, setActiveIdx] = useState(0);
    const [cardWidth, setCardWidth] = useState(840);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setCardWidth(width - 32);
            } else if (width < 1024) {
                setCardWidth(Math.min(width - 64, 720));
            } else {
                setCardWidth(840);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const activeSystem = subsystems[activeIdx] || subsystems[0];

    return (
        <section
            id="squad"
            className="relative z-10 overflow-hidden border-t-4 border-slate-900 bg-slate-50/50 select-none"
        >
            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="pointer-events-none absolute top-12 right-4 z-0 font-mono text-[7rem] leading-none font-black text-slate-900/[0.03] will-change-transform select-none sm:right-10 sm:text-[12rem] md:text-[14rem]"
                aria-hidden="true"
            >
                // 02 SQUAD
            </div>

            {/* Floating Kinetic Sticker / Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="-5"
                className="shadow-brutal-5 pointer-events-none absolute top-6 left-6 z-20 hidden rounded-lg border-3 border-slate-900 bg-sky-300 px-3 py-1.5 font-mono text-[11px] font-black tracking-wider text-slate-950 uppercase will-change-transform sm:left-12 lg:flex"
            >
                <span>● ROSTER // ACTIVE CREW</span>
            </div>

            {/* Section Header */}
            {/* lg:pt-40 reserves the band the kinetic sticker occupies (it sits at
                top-6 plus a fixed 55px GSAP offset, so it runs to ~125px inside this
                section). Without it the sticker lands on top of the word THE. */}
            <div className="relative z-10 mx-auto max-w-7xl px-4 pt-16 pb-6 sm:px-8 sm:pt-24 sm:pb-10 lg:pt-44">
                <div
                    data-assemble="header"
                    className="flex flex-col justify-between gap-6 md:flex-row md:items-end"
                >
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-6xl leading-none font-black tracking-tight text-slate-900 uppercase sm:text-7xl md:text-8xl">
                                THE
                            </h2>
                            <h2
                                data-parallax="fast"
                                data-parallax-speed="0.18"
                                className="text-stroke-black text-6xl leading-none font-black tracking-tight text-transparent uppercase will-change-transform sm:text-7xl md:text-8xl"
                            >
                                SQUAD
                            </h2>
                            <span
                                data-parallax="sticker"
                                data-parallax-rotate="15"
                                className="animate-spin-slow hidden text-4xl text-amber-400 will-change-transform sm:inline-block"
                            >
                                ★
                            </span>
                        </div>
                        <p className="mt-3 max-w-xl text-sm font-bold text-slate-600 sm:text-base">
                            Scroll down to cycle through the engineering decks. Click any card to inspect the
                            crew.
                        </p>
                    </div>

                    {/* Active Deck Status Indicator */}
                    <div
                        data-parallax="fast"
                        data-parallax-speed="0.1"
                        className="hidden items-center gap-3 font-mono will-change-transform sm:flex"
                    >
                        <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">
                            CURRENT DECK:
                        </span>
                        <span className="shadow-brutal-2 border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black text-sky-700 uppercase">
                            {activeSystem.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* React Bits Pro <ScrollStack /> Component with Cartoon / Retro-Brutalist Theme */}
            <ScrollStack
                variant="deck"
                scrollLength={0.85}
                peek={32}
                scaleStep={0.05}
                blur={2}
                dim={0.16}
                smooth={0.16}
                depth={4}
                cardWidth={cardWidth}
                cardHeight={0.62}
                borderRadius={18}
                perspective={1200}
                showProgress={true}
                showCounter={true}
                onIndexChange={(idx) => setActiveIdx(idx)}
                className="my-2"
            >
                {subsystems.map((system, idx) => (
                    <article
                        key={system.id}
                        onClick={() => {
                            if (onSelectSubsystem) {
                                onSelectSubsystem(system.id);
                            }
                        }}
                        className="group shadow-brutal-10 sm:shadow-brutal-14 hover:shadow-brutal-14-brand relative flex h-full w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-4 border-slate-900 bg-white p-6 transition-transform duration-200 select-none hover:-translate-y-1 sm:p-8 md:p-10"
                    >
                        {/* Top Color Accent Stripe */}
                        <div
                            className={`-mx-6 -mt-6 mb-6 h-5 sm:-mx-8 sm:-mt-8 sm:mb-8 sm:h-6 md:-mx-10 md:-mt-10 ${system.color} flex items-center justify-between border-b-4 border-slate-900 px-6`}
                        >
                            <span className="font-mono text-[10px] font-black tracking-widest text-slate-900 uppercase">
                                DECK 0{idx + 1}
                            </span>
                            <span className="font-mono text-[10px] font-black text-slate-900 uppercase">
                                TEAM ASTERIX
                            </span>
                        </div>

                        {/* Card Content Area */}
                        <div className="flex flex-1 flex-col justify-start">
                            {/* Badges Row */}
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <span className="shadow-brutal-2 rounded-sm bg-slate-900 px-3 py-1 font-mono text-[11px] font-black tracking-wider text-white uppercase sm:text-xs">
                                    {system.badge}
                                </span>
                                <span className="shadow-brutal-2 rounded-sm border-2 border-slate-900 bg-sky-100 px-3 py-1 font-mono text-[11px] font-black text-slate-900 sm:text-xs">
                                    {system.stat}
                                </span>
                            </div>

                            {/* Subsystem Name */}
                            <h3 className="mb-3 text-3xl font-black tracking-tight text-slate-900 uppercase transition-colors group-hover:text-sky-700 sm:text-4xl md:text-5xl">
                                {system.name}
                            </h3>

                            {/* Description */}
                            <p className="mb-4 line-clamp-3 max-w-2xl text-sm leading-relaxed font-bold text-slate-700 sm:line-clamp-4 sm:text-base">
                                {system.shortDesc || system.tagline}
                            </p>

                            {/* Engineering Specifications Highlights (Visible on tablets & desktops) */}
                            {system.specifications && system.specifications.length > 0 && (
                                <div className="mt-auto hidden flex-wrap gap-2 pt-2 sm:flex">
                                    {system.specifications.slice(0, 3).map((spec, sIdx) => (
                                        <span
                                            key={sIdx}
                                            className="shadow-brutal-1 rounded border-2 border-slate-900 bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-800 sm:text-[11px]"
                                        >
                                            <strong className="font-black text-slate-900">
                                                {spec.label}:
                                            </strong>{' '}
                                            {spec.value}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Card Bottom Bar */}
                        <div className="mt-4 flex items-center justify-between gap-4 border-t-3 border-slate-900 pt-5">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full border border-slate-900 bg-emerald-500" />
                                <span className="font-mono text-xs font-black tracking-wider text-slate-600 uppercase sm:text-sm">
                                    {system.id === 'leads'
                                        ? `${system.teamMembers?.length || 4} CORE LEADS`
                                        : `${system.teamMembers?.length || 3} ASSIGNED ENGINEERS`}
                                </span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectSubsystem) {
                                        onSelectSubsystem(system.id);
                                    }
                                }}
                                className="shadow-brutal-3 hover:shadow-brutal-1 cursor-pointer border-3 border-slate-900 bg-sky-500 px-4 py-2 text-xs font-black text-slate-950 uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-slate-900 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:px-6 sm:py-2.5 sm:text-sm"
                            >
                                VIEW CREW →
                            </button>
                        </div>
                    </article>
                ))}
            </ScrollStack>

            {/* Quick Subsystem Direct Navigation Grid (Allows direct 1-click access to all 5 subsystems) */}
            <div className="mx-auto mt-8 max-w-7xl border-t-3 border-slate-900 px-4 py-16 sm:px-8">
                <span
                    data-assemble="header"
                    className="mb-6 block text-center font-mono text-xs font-black tracking-widest text-slate-500 uppercase"
                >
                    OR DIRECTLY SELECT A SUBSYSTEM TO INSPECT
                </span>

                <div
                    data-assemble="stagger"
                    className="grid grid-cols-2 gap-3 font-mono sm:grid-cols-3 lg:grid-cols-5"
                >
                    {subsystems.map((s, idx) => (
                        <button
                            key={s.id}
                            onClick={() => onSelectSubsystem(s.id)}
                            className="press shadow-brutal-3 hover:shadow-brutal-5 flex cursor-pointer flex-col justify-between border-2 border-slate-900 bg-white p-3 text-left transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-sky-500 hover:text-slate-950"
                        >
                            <span className="text-[10px] font-black opacity-60">0{idx + 1}</span>
                            <span className="mt-2 text-xs leading-tight font-black uppercase">{s.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
