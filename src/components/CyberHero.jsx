import { useWebsiteData } from '../context/WebsiteDataContext';

export default function CyberHero({ onOpenModelViewer }) {
    const { siteData } = useWebsiteData();
    const { hero } = siteData;

    return (
        <section id="hero" className="min-h-screen pt-24 sm:pt-32 pb-12 px-4 sm:px-8 md:px-12 lg:px-16 relative overflow-hidden flex flex-col justify-between select-none">

            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="absolute right-4 sm:right-12 top-1/4 text-[9rem] sm:text-[15rem] md:text-[18rem] font-black text-slate-900/[0.025] select-none pointer-events-none font-mono leading-none z-0 will-change-transform"
                aria-hidden="true"
            >
                #01
            </div>

            {/* Floating Kinetic Sticker / Decal (Option D: Floating Badge) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="5"
                className="hidden lg:flex absolute right-14 top-40 z-20 flex-col items-start bg-yellow-300 text-slate-950 border-3 border-slate-900 shadow-[6px_6px_0px_#0f172a] rounded-xl px-4 py-2.5 font-mono font-black text-xs uppercase tracking-wider pointer-events-none will-change-transform"
            >
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
                    <span>CHAMPIONSHIP SPEC</span>
                </div>
                <span className="text-[10px] text-slate-800 mt-0.5 font-bold">ASTERIX AUTONOMOUS LAB</span>
            </div>

            {/* Main Hero Container - Left-aligned text content */}
            <div className="max-w-7xl mx-auto w-full my-auto z-10 pt-4 pb-8">

                {/* Top Badges Row (Dynamic Badges) with Micro-Parallax */}
                <div data-assemble="pop" data-parallax="fast" data-parallax-speed="0.12" className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 z-20 relative will-change-transform">
                    {hero.badges.map((badge, idx) => (
                        <div 
                            key={idx} 
                            className={`border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] px-4 py-2 font-black text-xs uppercase tracking-wider ${badge.class || 'bg-white text-slate-900'}`}
                        >
                            {badge.label}
                        </div>
                    ))}
                </div>

                {/* Left Content Block */}
                <div className="max-w-2xl lg:max-w-3xl text-left">

                    {/* Giant Stacked Typography with Multi-Speed Separation */}
                    <div data-assemble="left">
                        <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black text-slate-900 leading-[0.88] tracking-tighter uppercase">
                            {hero.teamTitle || "TEAM"}
                        </h1>

                        <h1 
                            data-parallax="fast" 
                            data-parallax-speed="0.2"
                            className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black text-stroke-sky text-transparent leading-[0.88] tracking-tighter uppercase mt-1 sm:mt-2 will-change-transform"
                        >
                            {hero.teamName || "ASTERIX"}
                        </h1>
                    </div>

                    <p data-assemble="up" className="mt-6 text-base sm:text-xl md:text-2xl text-slate-700 font-bold leading-snug max-w-xl">
                        {hero.tagline || "Got the passion? We got the track."}
                    </p>

                    {/* Cyberbites Chunky Action Button */}
                    <div data-assemble="up" className="mt-8 flex flex-wrap items-center gap-5">
                        <a
                            href="#squad"
                            className="press press-flat cyber-button px-9 py-4.5 text-sm sm:text-base tracking-widest uppercase cursor-pointer inline-block"
                        >
                            EXPLORE THE SQUAD →
                        </a>
                    </div>

                </div>

            </div>

            {/* Bottom Floating Footer Row with Corner 3D Baja Model Option */}
            <div data-assemble="down" className="max-w-7xl mx-auto w-full z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-500 font-mono text-xs font-black uppercase">
                <span>SCROLL TO BE ON OUR SHOES!!</span>

                {/* Corner 3D Baja Inspector Button */}
                <button
                    onClick={onOpenModelViewer}
                    className="press group px-4 py-2.5 bg-white hover:bg-sky-500 text-slate-900 hover:text-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#0f172a] flex items-center gap-2.5 font-mono font-black text-xs uppercase cursor-pointer"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 animate-pulse" />
                    <span>3D BAJA MODEL</span>
                    <span className="text-sm transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5">↗</span>
                </button>
            </div>

        </section>
    );
}
