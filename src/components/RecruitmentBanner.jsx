import { useMemo } from 'react';
import { normalizeInternRecruitment } from '../data/internRecruitment';
import { useWebsiteData } from '../context/WebsiteDataContext';

/* Fixed strip across the top of the home page. CyberNavbar renders it and
   pushes its own headers down by BANNER_OFFSET while it is showing; it slides
   away with the mobile header once the page scrolls. */
export const BANNER_OFFSET = 'top-11';

export default function RecruitmentBanner({ hidden, onOpenDetails }) {
    const { siteData } = useWebsiteData();
    const INTERN_RECRUITMENT = useMemo(
        () => normalizeInternRecruitment(siteData.internRecruitment),
        [siteData.internRecruitment]
    );

    return (
        <div
            className={`fixed inset-x-0 top-0 z-[60] flex h-11 items-center border-b-4 border-slate-900 bg-amber-300 px-3 text-slate-900 transition-all duration-300 ease-out select-none sm:px-8 ${
                hidden ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
            role="region"
            aria-label="Intern recruitment"
        >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex flex-shrink-0 items-center gap-1.5 border-2 border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase">
                        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                        </span>
                        <span className="hidden sm:inline">Intern Recruitment</span>
                        <span className="sm:hidden">Recruiting</span>
                    </span>
                    <p className="truncate text-xs font-black uppercase sm:text-sm">
                        <span className="hidden md:inline">{INTERN_RECRUITMENT.bannerCatchline}</span>
                        <span className="md:hidden">
                            {INTERN_RECRUITMENT.bannerCatchlineShort || INTERN_RECRUITMENT.bannerCatchline}
                        </span>
                        <span className="ml-2 hidden font-mono text-[10px] font-bold tracking-widest text-slate-700 lg:inline">
                            / {INTERN_RECRUITMENT.eligibilityNote}
                        </span>
                    </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onOpenDetails}
                        className="press hidden cursor-pointer border-2 border-slate-900 bg-white px-2.5 py-1 font-mono text-[10px] font-black uppercase hover:bg-sky-100 sm:inline-flex"
                    >
                        Rounds &amp; portions →
                    </button>
                    <a
                        href={INTERN_RECRUITMENT.registerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press shadow-brutal-2 inline-flex items-center gap-1 border-2 border-slate-900 bg-rose-500 px-2.5 py-1 font-mono text-[10px] font-black text-white uppercase no-underline hover:bg-rose-600 sm:text-[11px]"
                    >
                        Register now ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
