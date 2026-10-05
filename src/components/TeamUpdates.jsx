import AccordionGallery from './AccordionGallery';
import { useWebsiteData } from '../context/WebsiteDataContext';

export default function TeamUpdates() {
    const { siteData } = useWebsiteData();
    const updateItems = siteData.updates;
    return (
        <section id="updates" className="py-16 sm:py-28 px-4 sm:px-8 bg-sky-50/60 border-t-4 border-slate-900 relative overflow-hidden z-10 select-none">

            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="absolute right-4 sm:right-10 top-10 text-[6rem] sm:text-[11rem] md:text-[13rem] font-black text-slate-900/[0.025] select-none pointer-events-none font-mono leading-none z-0 will-change-transform"
                aria-hidden="true"
            >
                // 04 LOGS
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="6"
                className="hidden lg:flex absolute left-6 sm:left-12 top-14 z-20 bg-rose-300 text-slate-950 border-3 border-slate-900 shadow-brutal-5 rounded-lg px-3 py-1.5 font-mono font-black text-[11px] uppercase tracking-wider pointer-events-none will-change-transform"
            >
                <span>● PROVING GROUNDS</span>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">

                {/* Section Header (Cyberbites Stacked Brutalist Typography) */}
                <div data-assemble="header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-6xl sm:text-7xl md:text-8xl font-black text-slate-900 leading-none uppercase">
                                TEAM
                            </h2>
                            <h2 
                                data-parallax="fast" 
                                data-parallax-speed="0.18"
                                className="text-6xl sm:text-7xl md:text-8xl font-black text-stroke-black text-transparent leading-none uppercase will-change-transform"
                            >
                                UPDATES
                            </h2>
                            <span 
                                data-parallax="sticker"
                                data-parallax-rotate="12"
                                className="animate-spin-slow text-amber-400 text-4xl hidden sm:inline-block will-change-transform"
                            >
                                ★
                            </span>
                        </div>
                        <p className="text-sm sm:text-base font-bold text-slate-600 mt-3 max-w-xl">
                            Real-time dispatches from the proving grounds, shop floor, and competition circuit. Hover over any panel to expand full-spectrum coverage.
                        </p>
                    </div>

                </div>

                {/* Seamless AccordionGallery Integration with Micro-Parallax */}
                <div data-assemble="card" data-parallax="fast" data-parallax-speed="0.08" className="w-full will-change-transform">
                    <AccordionGallery
                        items={updateItems}
                        defaultIndex={2}
                        expandRatio={0.46}
                        trigger="hover"
                        height={480}
                        gap={14}
                        radius={12}
                        tilt={7}
                        parallax={0.4}
                        accentColor="#38bdf8"
                        overlayColor="#0f172a"
                        textColor="#ffffff"
                        grayscale={false}
                        showLabels={true}
                        className="w-full"
                    />
                </div>

            </div>

        </section>
    );
}
