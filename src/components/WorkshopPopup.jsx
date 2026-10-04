import { useState, useEffect } from 'react';
import { getSoftwareRegistrationState } from '../../server/src/config/workshopPackages.js';

export default function WorkshopPopup({ onOpenWorkshop }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isFooterVisible, setIsFooterVisible] = useState(false);
    const [state, setState] = useState(() => getSoftwareRegistrationState(Date.now(), 145));

    useEffect(() => {
        const updateState = () => setState(getSoftwareRegistrationState(Date.now(), 145));
        updateState();
        const interval = setInterval(updateState, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const docHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight
            );

            // True only when user scrolls near the bottom of the page
            const atFooter = currentScrollY + windowHeight >= docHeight - 350;
            setIsFooterVisible(atFooter);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        let observer;
        const sentinelEl = document.getElementById('footer-sentinel');
        if (sentinelEl) {
            observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setIsFooterVisible(true);
                    }
                },
                { threshold: 0.1 }
            );
            observer.observe(sentinelEl);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (observer && sentinelEl) observer.unobserve(sentinelEl);
        };
    }, []);

    if (!isVisible) return null;

    const badgeText = state.isPaused
        ? 'PAUSED · REOPENS MON'
        : state.isClosed
        ? 'REGISTRATION CLOSED'
        : 'CLOSES TUE 11:59 PM';

    return (
        <aside
            className={`fixed bottom-22 right-3.5 z-40 w-[calc(100vw-1.75rem)] max-w-[290px] rounded-2xl border-2 sm:border-3 border-slate-900 bg-amber-300 p-3 sm:p-3.5 text-slate-900 shadow-[6px_6px_0px_#0f172a] sm:bottom-6 sm:right-6 sm:w-72 select-none pointer-events-auto transition-all duration-500 ease-out ${
                isFooterVisible ? 'translate-y-36 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
            }`}
            aria-labelledby="workshop-popup-title"
        >
            <div
                onClick={onOpenWorkshop}
                className="cursor-pointer group relative"
            >
                {/* Floating Close Button */}
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsVisible(false);
                    }}
                    aria-label="Close workshop announcement"
                    className="absolute -top-1.5 -right-1.5 z-10 w-6 h-6 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center font-mono text-[11px] font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                >
                    ✕
                </button>

                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-md border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[9.5px] font-black uppercase tracking-wider text-amber-300 shadow-[1px_1px_0px_#0f172a]">
                        ✦ WORKSHOPS 2026
                    </span>
                    <span className={`inline-block rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${
                        state.isPaused ? 'border-amber-700 bg-amber-100 text-amber-950 font-black' : 'border-rose-700 bg-rose-50 text-rose-700'
                    }`}>
                        {badgeText}
                    </span>
                </div>

                <h2
                    id="workshop-popup-title"
                    className="text-sm sm:text-base font-black uppercase leading-snug text-slate-900 pr-5 group-hover:text-sky-950 transition-colors"
                >
                    Engineering Workshops
                </h2>

                <p className="mt-1 text-[11px] font-bold leading-tight text-slate-800">
                    Software & Perception · Electronics & Powertrain
                </p>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-900/20">
                    <span className="font-mono text-[10px] font-bold text-slate-700">
                        Starts 29 Sep
                    </span>
                    <button
                        type="button"
                        onClick={onOpenWorkshop}
                        className="press rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 font-mono text-[10px] font-black uppercase text-slate-900 shadow-[2px_2px_0px_#0284c7] hover:bg-sky-100 cursor-pointer flex items-center gap-1"
                    >
                        <span>View Details</span>
                        <span aria-hidden="true">↗</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
