export default function MarqueeTicker() {
    const items = [
        "4130 CHROMOLY SPACEFRAME",
        "380 NM PEAK TORQUE",
        "FOX AIR SHOCK DAMPERS",
        "100% LOCKUP BRAKING",
        "CUSTOM CVT DYNAMICS",
        "11.2\" INDEPENDENT SUSPENSION",
        "AUTONOMOUS MOBILITY LAB",
        "AEROSPACE GRADE RIGIDITY",
        "4-HOUR ENDURANCE TESTED",
        "FEA OPTIMIZED CHASSIS"
    ];

    return (
        <div className="marquee-hold w-full overflow-hidden bg-slate-900 border-y-4 border-slate-900 select-none relative z-20">
            
            {/* Top Marquee Ribbon (Sky Blue Background - Moving Left with Scroll Counter-Parallax) */}
            <div data-assemble="left" data-parallax="counter-x-left" className="bg-sky-500 py-3 border-b-2 border-slate-900 flex overflow-hidden will-change-transform">
                <div className="animate-marquee-left text-white font-black text-sm sm:text-base tracking-widest uppercase">
                    {[...items, ...items].map((text, idx) => (
                        <div key={idx} className="flex items-center gap-8 pr-8 whitespace-nowrap">
                            <span>{text}</span>
                            <span className="text-slate-900 text-lg">✦</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Marquee Ribbon (Slate Black Background - Moving Right with Scroll Counter-Parallax) */}
            <div data-assemble="right" data-parallax="counter-x-right" className="bg-slate-900 py-3 flex overflow-hidden will-change-transform">
                <div className="animate-marquee-right text-sky-400 font-black text-sm sm:text-base tracking-widest uppercase">
                    {[...items, ...items].map((text, idx) => (
                        <div key={idx} className="flex items-center gap-8 pr-8 whitespace-nowrap">
                            <span>{text}</span>
                            <span className="text-white text-lg">✦</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
