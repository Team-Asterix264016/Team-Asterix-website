/* Floating call-to-action pinned to the bottom-right corner on every page that
   carries CyberNavbar. Opens the Intern Recruitment page. On phones it hands
   over to the "Join as Intern" button in the bottom cockpit dock once that dock
   has slid in, so the two never show at once. */
export default function RecruitmentBubble({ onOpen, dockVisible, hidden }) {
    const hideOnPhone = dockVisible ? 'max-md:pointer-events-none max-md:scale-90 max-md:opacity-0' : '';
    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label="Open Intern Recruitment"
            className={`press shadow-brutal-3 group fixed right-3 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-[55] flex cursor-pointer items-center gap-2 rounded-full border-3 border-slate-900 bg-rose-500 px-4 py-2.5 text-left text-white transition-all duration-300 ease-out select-none hover:bg-rose-600 md:right-6 md:bottom-6 md:px-5 md:py-3 ${hideOnPhone} ${
                hidden ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100'
            }`}
        >
            <span className="text-xs font-black uppercase md:text-sm">
                Join as Intern <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </span>
        </button>
    );
}
