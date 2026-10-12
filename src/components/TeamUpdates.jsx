import AccordionGallery from './AccordionGallery';
import { useWebsiteData } from '../context/WebsiteDataContext';

export default function TeamUpdates() {
    const { siteData } = useWebsiteData();
    const updateItems = siteData.updates;
    return (
        <section
            id="updates"
            className="relative z-10 overflow-hidden border-t-4 border-slate-900 bg-sky-50/60 px-4 py-16 select-none sm:px-8 sm:py-28"
        >
            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="pointer-events-none absolute top-10 right-4 z-0 font-mono text-[6rem] leading-none font-black text-slate-900/[0.025] will-change-transform select-none sm:right-10 sm:text-[11rem] md:text-[13rem]"
                aria-hidden="true"
            >
                // 04 LOGS
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="6"
                className="shadow-brutal-5 pointer-events-none absolute top-14 left-6 z-20 hidden rounded-lg border-3 border-slate-900 bg-rose-300 px-3 py-1.5 font-mono text-[11px] font-black tracking-wider text-slate-950 uppercase will-change-transform sm:left-12 lg:flex"
            >
                <span>● PROVING GROUNDS</span>
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">
                {/* Section Header (Cyberbites Stacked Brutalist Typography) */}
                <div
                    data-assemble="header"
                    className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"
                >
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-6xl leading-none font-black text-slate-900 uppercase sm:text-7xl md:text-8xl">
                                TEAM
                            </h2>
                            <h2
                                data-parallax="fast"
                                data-parallax-speed="0.18"
                                className="text-stroke-black text-6xl leading-none font-black text-transparent uppercase will-change-transform sm:text-7xl md:text-8xl"
                            >
                                UPDATES
                            </h2>
                            <span
                                data-parallax="sticker"
                                data-parallax-rotate="12"
                                className="animate-spin-slow hidden text-4xl text-amber-400 will-change-transform sm:inline-block"
                            >
                                ★
                            </span>
                        </div>
                        <p className="mt-3 max-w-xl text-sm font-bold text-slate-600 sm:text-base">
                            Real-time dispatches from the proving grounds, shop floor, and competition
                            circuit. Hover over any panel to expand full-spectrum coverage.
                        </p>
                    </div>
                </div>

                {/* Seamless AccordionGallery Integration with Micro-Parallax */}
                <div
                    data-assemble="card"
                    data-parallax="fast"
                    data-parallax-speed="0.08"
                    className="w-full will-change-transform"
                >
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
