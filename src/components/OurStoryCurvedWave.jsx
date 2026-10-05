import { useState, useRef, useLayoutEffect } from 'react';
import { useWebsiteData } from '../context/WebsiteDataContext';

const COLLAPSED_HEIGHT = 118;

export default function OurStoryCurvedWave({ onOpenSponsor }) {
    const { siteData } = useWebsiteData();
    const [isExpanded, setIsExpanded] = useState(false);
    const storyParagraphs = (siteData.story || '').split(/\n\n+/).filter(Boolean);

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
        <section
            id="story"
            className="relative z-10 overflow-hidden border-t-4 border-slate-900 bg-slate-900 px-4 py-16 text-white select-none sm:px-8 sm:py-28"
        >
            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="pointer-events-none absolute top-10 right-4 z-0 font-mono text-[6rem] leading-none font-black text-white/[0.03] will-change-transform select-none sm:right-10 sm:text-[11rem] md:text-[13rem]"
                aria-hidden="true"
            >
                // 05 ORIGIN
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="-5"
                className="shadow-brutal-5-brand pointer-events-none absolute top-12 left-6 z-20 hidden rounded-lg border-3 border-slate-900 bg-yellow-400 px-3 py-1.5 font-mono text-[11px] font-black tracking-wider text-slate-950 uppercase will-change-transform sm:left-12 lg:flex"
            >
                <span>● FOUNDING LOGS</span>
            </div>

            {/* Animated SVG Sinusoidal Wave Text Path with Floating Parallax */}
            <div
                data-assemble="down"
                data-parallax="fast"
                data-parallax-speed="0.12"
                className="mb-14 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,#000_12%,#000_88%,transparent_100%)] opacity-90 will-change-transform [-webkit-mask-image:linear-gradient(to_right,transparent_0%,#000_12%,#000_88%,transparent_100%)]"
            >
                <svg className="h-28 w-full sm:h-40 md:h-48" viewBox="0 0 1200 200" fill="none">
                    <path
                        id="storyCurve"
                        d="M 0,100 C 300,10 600,190 900,100 C 1200,10 1500,190 1800,100 C 2100,10 2400,190 2700,100"
                        fill="none"
                    />
                    <text className="fill-sky-400 font-mono text-2xl font-black tracking-widest uppercase sm:text-3xl">
                        <textPath href="#storyCurve" startOffset="0%">
                            OUR STORY ✦ FROM TRAINING PROGRAM TO CHENNAI ✦ SAEINDIA a-BAJA 2026 ✦ THE FIRST
                            DRAFT ✦ OUR STORY ✦ FROM TRAINING PROGRAM TO CHENNAI ✦
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

            <div className="relative z-10 mx-auto max-w-4xl">
                {/* Main Story Box (Essay Format) with Subtle Elevation Parallax */}
                <div
                    data-assemble="card"
                    data-parallax="fast"
                    data-parallax-speed="0.05"
                    className="shadow-brutal-12-brand relative border-4 border-slate-900 bg-white p-6 text-slate-900 will-change-transform sm:p-12 md:p-14"
                >
                    {/* Section Header */}
                    <div className="mb-8 flex flex-col justify-between gap-6 border-b-3 border-slate-900 pb-6 md:flex-row md:items-start">
                        <div>
                            <span className="mb-1 block font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                CHRONICLES • HOW IT ALL BEGAN
                            </span>
                            <h2 className="text-4xl leading-none font-black text-slate-900 uppercase sm:text-5xl md:text-6xl">
                                OUR STORY
                            </h2>
                        </div>

                        <button
                            onClick={() => {
                                if (onOpenSponsor) onOpenSponsor();
                                else window.location.hash = '#sponsor';
                            }}
                            className="press cyber-button shadow-brutal-4 inline-block cursor-pointer self-start px-7 py-3.5 text-xs font-black tracking-wider whitespace-nowrap uppercase md:self-auto"
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
                                className="space-y-5 text-base leading-relaxed font-medium text-slate-700 sm:text-lg"
                            >
                                {storyParagraphs.map((para, idx) => (
                                    <p
                                        key={idx}
                                        className={
                                            idx === 0 ? 'text-lg font-bold text-slate-900 sm:text-xl' : ''
                                        }
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
                            className={`pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-brutal)] ${
                                isExpanded ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                    </div>

                    {/* Show More / Show Less Button */}
                    <div className="mt-5 flex items-center justify-between border-t-2 border-slate-100 pt-4">
                        {/* This used to apply the pressed-in look on hover,
                            which left nothing for the actual click to do.
                            Hover lifts, :active presses. */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            aria-controls="story-essay"
                            className="press shadow-brutal-3 hover:shadow-brutal-5 inline-flex cursor-pointer items-center gap-2 border-2 border-slate-900 bg-white px-6 py-3 text-xs font-black tracking-wider text-slate-900 uppercase hover:-translate-x-[1px] hover:-translate-y-[1px] hover:bg-sky-100"
                        >
                            <span>
                                {isExpanded ? 'SHOW LESS' : 'READ FULL STORY (SHOW MORE)'}
                                <span aria-hidden="true">{isExpanded ? ' ↑' : ' ↓'}</span>
                            </span>
                        </button>
                    </div>

                    {/* Milestones Strip */}
                    <div
                        data-assemble="stagger"
                        className="mt-8 grid grid-cols-2 gap-4 border-t-3 border-slate-900 pt-8 text-center font-mono sm:grid-cols-4"
                    >
                        <div className="shadow-brutal-3 border-2 border-slate-900 bg-sky-50 p-4">
                            <span className="block text-2xl font-black text-slate-900 sm:text-3xl">
                                YEAR 1
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">
                                Training Genesis
                            </span>
                        </div>
                        <div className="shadow-brutal-3 border-2 border-slate-900 bg-sky-50 p-4">
                            <span className="block text-2xl font-black text-slate-900 sm:text-3xl">4</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">
                                Core Subsystems
                            </span>
                        </div>
                        <div className="shadow-brutal-3 border-2 border-slate-900 bg-sky-50 p-4">
                            <span className="block text-2xl font-black text-slate-900 sm:text-3xl">
                                AIR 13
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">
                                a-BAJA 2026 Finish
                            </span>
                        </div>
                        <div className="shadow-brutal-3 border-2 border-slate-900 bg-amber-300 p-4">
                            <span className="block text-2xl font-black text-slate-900 sm:text-3xl">
                                GEN 2
                            </span>
                            <span className="text-[10px] font-bold text-slate-900 uppercase">
                                The Next Build
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
