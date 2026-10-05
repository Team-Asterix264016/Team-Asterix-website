export default function MarqueeTicker() {
    const items = [
        '4130 CHROMOLY SPACEFRAME',
        '380 NM PEAK TORQUE',
        'FOX AIR SHOCK DAMPERS',
        '100% LOCKUP BRAKING',
        'CUSTOM CVT DYNAMICS',
        '11.2" INDEPENDENT SUSPENSION',
        'AUTONOMOUS MOBILITY LAB',
        'AEROSPACE GRADE RIGIDITY',
        '4-HOUR ENDURANCE TESTED',
        'FEA OPTIMIZED CHASSIS'
    ];

    return (
        <div className="marquee-hold relative z-20 w-full overflow-hidden border-y-4 border-slate-900 bg-slate-900 select-none">
            {/* Top Marquee Ribbon (Sky Blue Background - Moving Left with Scroll Counter-Parallax) */}
            <div
                data-assemble="left"
                data-parallax="counter-x-left"
                className="flex overflow-hidden border-b-2 border-slate-900 bg-sky-500 py-3 will-change-transform"
            >
                <div className="animate-marquee-left text-sm font-black tracking-widest text-slate-950 uppercase sm:text-base">
                    {[...items, ...items].map((text, idx) => (
                        <div key={idx} className="flex items-center gap-8 pr-8 whitespace-nowrap">
                            <span>{text}</span>
                            <span className="text-lg text-slate-900">✦</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Marquee Ribbon (Slate Black Background - Moving Right with Scroll Counter-Parallax) */}
            <div
                data-assemble="right"
                data-parallax="counter-x-right"
                className="flex overflow-hidden bg-slate-900 py-3 will-change-transform"
            >
                <div className="animate-marquee-right text-sm font-black tracking-widest text-sky-400 uppercase sm:text-base">
                    {[...items, ...items].map((text, idx) => (
                        <div key={idx} className="flex items-center gap-8 pr-8 whitespace-nowrap">
                            <span>{text}</span>
                            <span className="text-lg text-white">✦</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
