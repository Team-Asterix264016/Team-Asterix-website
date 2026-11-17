import { useState } from 'react';
import { INTERN_RECRUITMENT, INTERN_TRACKS } from '../data/internRecruitment';

const SOON = 'Will be updated soon';

export default function InternRecruitmentPage({ onBack }) {
    const [trackId, setTrackId] = useState(INTERN_TRACKS[0].id);
    const track = INTERN_TRACKS.find((t) => t.id === trackId) || INTERN_TRACKS[0];
    const portions = Array.isArray(track.quiz.portions) ? track.quiz.portions : [];

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 selection:bg-amber-300 selection:text-slate-900">
            <header className="sticky top-0 z-50 border-b-4 border-slate-900 bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div className="min-w-0">
                        <span className="font-mono text-xs font-black tracking-widest text-sky-600 uppercase">
                            Team Asterix
                        </span>
                        <strong className="block truncate text-sm font-black uppercase">
                            {INTERN_RECRUITMENT.title}
                        </strong>
                    </div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-3 flex-shrink-0 border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase hover:bg-amber-400"
                    >
                        ← Main Website
                    </button>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-14 sm:px-8 sm:py-20">
                    <div className="mx-auto max-w-6xl">
                        <span className="inline-block border-2 border-slate-900 bg-slate-900 px-3 py-1 font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                            Recruitment 2026
                        </span>
                        <h1 className="mt-5 text-4xl leading-[0.9] font-black tracking-tight uppercase sm:text-7xl">
                            {INTERN_RECRUITMENT.title}
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed font-bold sm:text-xl">
                            {INTERN_RECRUITMENT.tagline}
                        </p>
                        <p className="mt-4 text-sm leading-relaxed font-bold sm:text-base">
                            Register here:{' '}
                            <a
                                href={INTERN_RECRUITMENT.registerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs break-all text-slate-900 underline decoration-2 underline-offset-2 hover:text-sky-700 sm:text-sm"
                            >
                                {INTERN_RECRUITMENT.registerUrl}
                            </a>
                        </p>
                        <p
                            role="note"
                            className="mt-6 font-mono text-xs font-black tracking-widest uppercase"
                        >
                            <span className="text-rose-600">Note:</span> {INTERN_RECRUITMENT.eligibilityNote}
                        </p>
                    </div>
                </section>

                {/* Track tabs */}
                <section className="border-b-4 border-slate-900 bg-sky-100 px-4 py-10 sm:px-8 sm:py-14">
                    <div className="mx-auto max-w-6xl">
                        <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            Select your track
                        </span>
                        <div
                            role="tablist"
                            aria-label="Recruitment track"
                            className="mt-4 grid grid-cols-1 gap-3 sm:inline-grid sm:grid-cols-2"
                        >
                            {INTERN_TRACKS.map((t) => {
                                const active = t.id === trackId;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        role="tab"
                                        id={`tab-${t.id}`}
                                        aria-selected={active}
                                        aria-controls={`panel-${t.id}`}
                                        onClick={() => setTrackId(t.id)}
                                        className={`press border-2 border-slate-900 px-5 py-3 text-left text-sm font-black uppercase sm:text-base ${
                                            active
                                                ? 'bg-slate-900 text-amber-300 shadow-[inset_2px_2px_0px_#000]'
                                                : 'shadow-brutal-3 bg-white text-slate-900 hover:bg-sky-200'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Rounds for the selected track */}
                <section
                    id={`panel-${track.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${track.id}`}
                    className="border-b-4 border-slate-900 bg-slate-100 px-4 py-12 sm:px-8 sm:py-16"
                >
                    <div className="mx-auto max-w-6xl">
                        <span className="font-mono text-xs font-black tracking-widest text-sky-600 uppercase">
                            {track.label} / Rounds
                        </span>
                        <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">Recruitment rounds</h2>

                        <div className="mt-8 flex flex-col gap-6">
                            {/* Round 1 */}
                            <article className="shadow-brutal-6 border-4 border-slate-900 bg-white p-5 sm:p-7">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <span className="font-mono text-xs font-black text-sky-600">
                                            ROUND 01
                                        </span>
                                        <h3 className="mt-1 text-2xl font-black uppercase sm:text-3xl">
                                            Quiz
                                        </h3>
                                    </div>
                                    <div className="border-2 border-slate-900 bg-amber-100 px-3 py-2">
                                        <span className="block font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase">
                                            Date
                                        </span>
                                        <span className="block font-mono text-xs font-black text-amber-700 uppercase">
                                            {track.quiz.date || SOON}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="mt-6 border-b-2 border-slate-900 pb-2 font-mono text-xs font-black tracking-widest uppercase">
                                    Portions
                                </h4>
                                {portions.length > 0 ? (
                                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {portions.map((section, index) => (
                                            <div
                                                key={section.title}
                                                className="shadow-brutal-2 border-2 border-slate-900 bg-slate-50 p-4"
                                            >
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-mono text-xs font-black text-sky-600">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <h5 className="text-base font-black uppercase">
                                                        {section.title}
                                                    </h5>
                                                </div>
                                                <ul className="mt-3 space-y-1.5">
                                                    {section.topics.map((topic) => (
                                                        <li
                                                            key={topic}
                                                            className="flex gap-2 text-sm leading-snug font-bold text-slate-700"
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-slate-900"
                                                            />
                                                            <span>{topic}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm font-bold text-slate-600">
                                        Portions {SOON.toLowerCase()}.
                                    </p>
                                )}
                            </article>

                            {/* Round 2 */}
                            <article className="shadow-brutal-6 border-4 border-slate-900 bg-white p-5 sm:p-7">
                                <span className="font-mono text-xs font-black text-sky-600">ROUND 02</span>
                                <h3 className="mt-1 text-2xl font-black uppercase sm:text-3xl">Expo</h3>
                                <p className="mt-4 text-sm font-bold text-slate-600">
                                    Further details will be updated soon.
                                </p>
                            </article>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
