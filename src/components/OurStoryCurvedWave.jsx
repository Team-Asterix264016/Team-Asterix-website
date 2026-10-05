import { useState, useRef, useLayoutEffect } from 'react';
import { useWebsiteData } from '../context/WebsiteDataContext';

const COLLAPSED_HEIGHT = 118;

export default function OurStoryCurvedWave({ onOpenSponsor }) {
    const { siteData } = useWebsiteData();
    const [isExpanded, setIsExpanded] = useState(false);
    const storyParagraphs = (siteData.story || "").split(/\n\n+/).filter(Boolean);

    // `max-height` cannot transition to or from `none`, so the previous
    // max-h-[118px] -> max-h-none swap snapped open with no animation. Measure
    // the real content height and animate between two concrete pixel values.
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);

    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        const measure = () => setContentHeight(el.scrollHeight);
        measure();

        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [storyParagraphs.length]);

    return (
        <section id="story" className="py-16 sm:py-28 px-4 sm:px-8 bg-slate-900 text-white border-t-4 border-slate-900 relative overflow-hidden z-10 select-none">

            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="absolute right-4 sm:right-10 top-10 text-[6rem] sm:text-[11rem] md:text-[13rem] font-black text-white/[0.03] select-none pointer-events-none font-mono leading-none z-0 will-change-transform"
                aria-hidden="true"
            >
                // 05 ORIGIN
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="-5"
                className="hidden lg:flex absolute left-6 sm:left-12 top-12 z-20 bg-yellow-400 text-slate-950 border-3 border-slate-900 shadow-brutal-5-brand rounded-lg px-3 py-1.5 font-mono font-black text-[11px] uppercase tracking-wider pointer-events-none will-change-transform"
            >
                <span>● FOUNDING LOGS</span>
            </div>

            {/* Animated SVG Sinusoidal Wave Text Path with Floating Parallax */}
            <div
                data-assemble="down"
                data-parallax="fast"
                data-parallax-speed="0.12"
                className="w-full overflow-hidden opacity-90 mb-14 will-change-transform
                           [mask-image:linear-gradient(to_right,transparent_0%,#000_12%,#000_88%,transparent_100%)]
                           [-webkit-mask-image:linear-gradient(to_right,transparent_0%,#000_12%,#000_88%,transparent_100%)]"
            >
                <svg className="w-full h-28 sm:h-40 md:h-48" viewBox="0 0 1200 200" fill="none">
                    <path
                        id="storyCurve"
                        d="M 0,100 C 300,10 600,190 900,100 C 1200,10 1500,190 1800,100 C 2100,10 2400,190 2700,100"
                        fill="none"
                    />
                    <text className="font-black text-2xl sm:text-3xl tracking-widest fill-sky-400 uppercase font-mono">
                        <textPath href="#storyCurve" startOffset="0%">
                            OUR STORY ✦ FROM TRAINING PROGRAM TO CHENNAI ✦ SAEINDIA a-BAJA 2026 ✦ THE FIRST DRAFT ✦ OUR STORY ✦ FROM TRAINING PROGRAM TO CHENNAI ✦
                            <animate
                                attributeName="startOffset"
                                values="0%;-34%;0%"
                                keyTimes="0;0.5;1"
                                calcMode="spline"
                                keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                                dur="44s"
                                repeatCount="indefinite"
                            />
                        </textPath>
                    </text>
                </svg>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">

                {/* Main Story Box (Essay Format) with Subtle Elevation Parallax */}
                <div data-assemble="card" data-parallax="fast" data-parallax-speed="0.05" className="bg-white text-slate-900 border-4 border-slate-900 shadow-brutal-12-brand p-6 sm:p-12 md:p-14 relative will-change-transform">

                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b-3 border-slate-900 pb-6">
                        <div>
                            <span className="text-xs font-mono font-black text-sky-700 tracking-widest uppercase block mb-1">
                                CHRONICLES • HOW IT ALL BEGAN
                            </span>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 uppercase leading-none">
                                OUR STORY
                            </h2>
                        </div>

                        <button
                            onClick={() => {
                                if (onOpenSponsor) onOpenSponsor();
                                else window.location.hash = '#sponsor';
                            }}
                            className="press cyber-button px-7 py-3.5 text-xs font-black tracking-wider uppercase inline-block self-start md:self-auto cursor-pointer whitespace-nowrap shadow-brutal-4"
                        >
                            SPONSOR TEAM →
                        </button>
                    </div>

                    {/* Essay Container (Cut after 4 lines when collapsed, full story when expanded) */}
                    <div className="relative">
                        <div
                            id="story-essay"
                            className="overflow-hidden transition-[max-height] duration-[var(--dur-slow)] ease-[var(--ease-brutal)]"
                            style={{
                                maxHeight: isExpanded
                                    ? `${Math.max(contentHeight, COLLAPSED_HEIGHT)}px`
                                    : `${COLLAPSED_HEIGHT}px`
                            }}
                        >
                            <div
                                ref={contentRef}
                                className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed space-y-5"
                            >
                                {storyParagraphs.map((para, idx) => (
                                    <p
                                        key={idx}
                                        className={idx === 0 ? "font-bold text-slate-900 text-lg sm:text-xl" : ""}
                                    >
                                        {para}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Fade overlay when collapsed. Kept mounted and faded
                            by opacity so it does not pop out of existence the
                            instant the essay starts expanding. */}
                        <div
                            className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-brutal)] ${isExpanded ? 'opacity-0' : 'opacity-100'
                                }`}
                        />
                    </div>

                    {/* Show More / Show Less Button */}
                    <div className="mt-5 pt-4 border-t-2 border-slate-100 flex items-center justify-between">
                        {/* This used to apply the pressed-in look on hover,
                            which left nothing for the actual click to do.
                            Hover lifts, :active presses. */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            aria-controls="story-essay"
                            className="press inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-900 font-black text-xs uppercase tracking-wider text-slate-900 shadow-brutal-3 hover:bg-sky-100 hover:shadow-brutal-5 hover:-translate-x-[1px] hover:-translate-y-[1px] cursor-pointer"
                        >
                            <span>
                                {isExpanded ? "SHOW LESS" : "READ FULL STORY (SHOW MORE)"}
                                <span aria-hidden="true">{isExpanded ? " ↑" : " ↓"}</span>
                            </span>
                        </button>


                    </div>

                    {/* Milestones Strip */}
                    <div data-assemble="stagger" className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t-3 border-slate-900 text-center font-mono">
                        <div className="p-4 bg-sky-50 border-2 border-slate-900 shadow-brutal-3">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 block">YEAR 1</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Training Genesis</span>
                        </div>
                        <div className="p-4 bg-sky-50 border-2 border-slate-900 shadow-brutal-3">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 block">4</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">Core Subsystems</span>
                        </div>
                        <div className="p-4 bg-sky-50 border-2 border-slate-900 shadow-brutal-3">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 block">AIR 13</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">a-BAJA 2026 Finish</span>
                        </div>
                        <div className="p-4 bg-amber-300 border-2 border-slate-900 shadow-brutal-3">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 block">GEN 2</span>
                            <span className="text-[10px] font-bold text-slate-900 uppercase">The Next Build</span>
                        </div>
                    </div>

                </div>

            </div>

        </section>
    );
}
