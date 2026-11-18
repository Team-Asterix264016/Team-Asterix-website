import { useMemo } from 'react';
import { normalizeInternRecruitment } from '../data/internRecruitment';
import { useWebsiteData } from '../context/WebsiteDataContext';

/* Fixed strip across the top of the home page. CyberNavbar renders it and
   pushes its own headers down by BANNER_OFFSET while it is showing; it slides
   away with the mobile header once the page scrolls. On phones it is taller
   so the catchline can wrap onto a second line instead of being cut off;
   BANNER_OFFSET must track the heights set below. */
export const BANNER_OFFSET = 'top-19 sm:top-11';

export default function RecruitmentBanner({ hidden, onOpenDetails }) {
    const { siteData } = useWebsiteData();
    const INTERN_RECRUITMENT = useMemo(
        () => normalizeInternRecruitment(siteData.internRecruitment),
        [siteData.internRecruitment]
    );

    return (
        <div
            className={`fixed inset-x-0 top-0 z-[60] flex h-19 items-center border-b-4 border-slate-900 bg-amber-300 px-3 text-slate-900 transition-all duration-300 ease-out select-none sm:h-11 sm:px-8 ${
                hidden ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
            role="region"
            aria-label="Intern recruitment"
        >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                    <span className="flex flex-shrink-0 items-center gap-1.5 border-2 border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase">
                        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                        </span>
                        <span>Intern Recruitment</span>
                    </span>
                    {/* Phones: wraps onto a second line. Wider: one line. */}
                    <p className="line-clamp-2 text-[11px] leading-tight font-black uppercase sm:hidden">
                        {INTERN_RECRUITMENT.bannerCatchline}
                    </p>
                    <p className="hidden min-w-0 truncate text-sm font-black uppercase sm:block">
                        {INTERN_RECRUITMENT.bannerCatchline}
                        <span className="ml-2 hidden font-mono text-[10px] font-bold tracking-widest text-slate-700 lg:inline">
                            / {INTERN_RECRUITMENT.eligibilityNote}
                        </span>
                    </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onOpenDetails}
                        className="press shadow-brutal-2 inline-flex cursor-pointer items-center gap-1 border-2 border-slate-900 bg-rose-500 px-2.5 py-1 font-mono text-[10px] font-black text-white uppercase hover:bg-rose-600 sm:text-[11px]"
                    >
                        Register now →
                    </button>
                </div>
            </div>
        </div>
    );
}
