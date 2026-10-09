export default function CookingChefCommunity({ onBack }) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-900 font-sans text-white selection:bg-amber-300 selection:text-slate-950">
            <header className="border-b-4 border-slate-900 bg-white/95 px-4 py-3.5 shadow-[0_4px_0px_#0f172a] sm:px-8">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black text-slate-950 uppercase">
                            AST-COMMUNITY
                        </span>
                        <strong className="text-xs font-black text-slate-900 uppercase sm:text-sm">
                            Team Asterix Community Hub
                        </strong>
                    </div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400"
                    >
                        ← Back to Home
                    </button>
                </div>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
                <div className="shadow-brutal-8 w-full max-w-2xl border-4 border-slate-900 bg-white p-8 text-center text-slate-900 sm:p-12">
                    <span className="inline-block border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-[11px] font-black tracking-widest text-slate-950 uppercase">
                        Community Hub
                    </span>

                    <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 uppercase sm:text-6xl">
                        Coming Soon
                    </h1>

                    <div className="mx-auto mt-5 h-1 w-24 bg-slate-900" />

                    <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed font-bold text-slate-600 sm:text-base">
                        The Team Asterix Community Hub is currently under development. It will bring our
                        engineers, students and workshop participants together in one place to share projects,
                        discuss ideas and access team resources.
                    </p>

                    <p className="mt-4 font-mono text-xs font-black tracking-widest text-sky-800 uppercase">
                        Stay tuned — we will announce the launch shortly.
                    </p>

                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-4-brand mt-8 border-3 border-slate-900 bg-amber-300 px-8 py-3.5 font-mono text-sm font-black text-slate-950 uppercase hover:bg-amber-400"
                    >
                        ← Back to Home
                    </button>
                </div>
            </main>
        </div>
    );
}
