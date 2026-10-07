import { useWebsiteData } from '../context/WebsiteDataContext';

export default function CyberHero({ onOpenModelViewer }) {
    const { siteData } = useWebsiteData();
    const { hero } = siteData;

    return (
        <section
            id="hero"
            className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden px-4 pt-24 pb-12 select-none sm:px-8 sm:pt-32 md:px-12 lg:px-16"
        >
            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="pointer-events-none absolute top-1/4 right-4 z-0 font-mono text-[6rem] leading-none font-black text-slate-900/[0.025] will-change-transform select-none sm:right-12 sm:text-[15rem] md:text-[18rem]"
                aria-hidden="true"
            >
                #01
            </div>

            {/* Floating Kinetic Sticker / Decal (Option D: Floating Badge) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="5"
                className="shadow-brutal-6 pointer-events-none absolute top-40 right-14 z-20 hidden flex-col items-start rounded-xl border-3 border-slate-900 bg-yellow-300 px-4 py-2.5 font-mono text-xs font-black tracking-wider text-slate-950 uppercase will-change-transform lg:flex"
            >
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-ping rounded-full bg-slate-900" />
                    <span>CHAMPIONSHIP SPEC</span>
                </div>
                <span className="mt-0.5 text-[10px] font-bold text-slate-800">ASTERIX AUTONOMOUS LAB</span>
            </div>

            {/* Main Hero Container - Left-aligned text content */}
            <div className="z-10 mx-auto my-auto w-full max-w-7xl pt-4 pb-8">
                {/* Top Badges Row (Dynamic Badges) with Micro-Parallax */}
                <div
                    data-assemble="pop"
                    data-parallax="fast"
                    data-parallax-speed="0.12"
                    className="relative z-20 mb-6 flex flex-wrap items-center gap-3 will-change-transform sm:gap-4"
                >
                    {hero.badges.map((badge, idx) => (
                        <div
                            key={idx}
                            className={`shadow-brutal-4 border-3 border-slate-900 px-4 py-2 text-xs font-black tracking-wider uppercase ${badge.class || 'bg-white text-slate-900'}`}
                        >
                            {badge.label}
                        </div>
                    ))}
                </div>

                {/* Left Content Block */}
                <div className="max-w-2xl text-left lg:max-w-3xl">
                    {/* Giant Stacked Typography with Multi-Speed Separation */}
                    <div data-assemble="left">
                        <h1 className="text-[clamp(3rem,16vw,3.75rem)] leading-[0.88] font-black tracking-tighter text-slate-900 uppercase sm:text-8xl md:text-9xl lg:text-[10rem]">
                            {hero.teamTitle || 'TEAM'}
                        </h1>

                        <h1
                            data-parallax="fast"
                            data-parallax-speed="0.2"
                            className="text-stroke-sky mt-1 text-[clamp(3rem,16vw,3.75rem)] leading-[0.88] font-black tracking-tighter text-transparent uppercase will-change-transform sm:mt-2 sm:text-8xl md:text-9xl lg:text-[10rem]"
                        >
                            {hero.teamName || 'ASTERIX'}
                        </h1>
                    </div>

                    <p
                        data-assemble="up"
                        className="mt-6 max-w-xl text-base leading-snug font-bold text-slate-700 sm:text-xl md:text-2xl"
                    >
                        {hero.tagline || 'Got the passion? We got the track.'}
                    </p>

                    {/* Cyberbites Chunky Action Button */}
                    <div data-assemble="up" className="mt-8 flex flex-wrap items-center gap-5">
                        <a
                            href="#squad"
                            className="press press-flat cyber-button inline-block cursor-pointer px-9 py-4.5 text-sm tracking-widest uppercase sm:text-base"
                        >
                            EXPLORE THE SQUAD →
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Footer Row with Corner 3D Baja Model Option */}
            <div
                data-assemble="down"
                className="z-10 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 font-mono text-xs font-black text-slate-500 uppercase sm:flex-row sm:items-center"
            >
                <span>SCROLL TO BE ON OUR SHOES!!</span>

                {/* Corner 3D Baja Inspector Button */}
                <button
                    onClick={onOpenModelViewer}
                    className="press group shadow-brutal-3 hover:shadow-brutal-5 tap flex cursor-pointer items-center gap-2.5 border-2 border-slate-900 bg-white px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-sky-500 hover:text-slate-950"
                >
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full border border-slate-900 bg-emerald-400" />
                    <span>3D BAJA MODEL</span>
                    <span className="text-sm transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5">
                        ↗
                    </span>
                </button>
            </div>
        </section>
    );
}
