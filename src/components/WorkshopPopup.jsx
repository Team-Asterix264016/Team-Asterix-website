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
            className={`shadow-brutal-6 pointer-events-auto fixed right-3.5 bottom-22 z-40 w-[calc(100vw-1.75rem)] max-w-[290px] rounded-2xl border-2 border-slate-900 bg-amber-300 p-3 text-slate-900 transition-all duration-500 ease-out select-none sm:right-6 sm:bottom-6 sm:w-72 sm:border-3 sm:p-3.5 ${
                isFooterVisible ? 'pointer-events-none translate-y-36 opacity-0' : 'translate-y-0 opacity-100'
            }`}
            aria-labelledby="workshop-popup-title"
        >
            <div onClick={onOpenWorkshop} className="group relative cursor-pointer">
                {/* Floating Close Button */}
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsVisible(false);
                    }}
                    aria-label="Close workshop announcement"
                    className="shadow-brutal-2 absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-slate-900 bg-white font-mono text-[11px] font-black text-slate-900 transition-colors hover:bg-rose-100 hover:text-rose-600"
                >
                    ✕
                </button>

                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="shadow-brutal-1 inline-block rounded-md border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[9.5px] font-black tracking-wider text-amber-300 uppercase">
                        ✦ WORKSHOPS 2026
                    </span>
                    <span
                        className={`inline-block rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${
                            state.isPaused
                                ? 'border-amber-700 bg-amber-100 font-black text-amber-950'
                                : 'border-rose-700 bg-rose-50 text-rose-700'
                        }`}
                    >
                        {badgeText}
                    </span>
                </div>

                <h2
                    id="workshop-popup-title"
                    className="pr-5 text-sm leading-snug font-black text-slate-900 uppercase transition-colors group-hover:text-sky-950 sm:text-base"
                >
                    Engineering Workshops
                </h2>

                <p className="mt-1 text-[11px] leading-tight font-bold text-slate-800">
                    Software & Perception · Electronics & Powertrain
                </p>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-900/20 pt-2">
                    <span className="font-mono text-[10px] font-bold text-slate-700">Starts 29 Sep</span>
                    <button
                        type="button"
                        onClick={onOpenWorkshop}
                        className="press shadow-brutal-2-brand flex cursor-pointer items-center gap-1 rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-sky-100"
                    >
                        <span>View Details</span>
                        <span aria-hidden="true">↗</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
