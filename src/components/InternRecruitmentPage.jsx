import { useMemo, useState } from 'react';
import { normalizeInternRecruitment } from '../data/internRecruitment';
import { useWebsiteData } from '../context/WebsiteDataContext';

const SOON = 'Will be updated soon';

/* "Git/GitHub: Clone, add..." renders its lead-in before the colon in bold. */
function TopicText({ text }) {
    const split = text.indexOf(': ');
    if (split <= 0) return <span>{text}</span>;
    return (
        <span>
            <span className="font-black text-slate-900">{text.slice(0, split)}:</span> {text.slice(split + 2)}
        </span>
    );
}

export default function InternRecruitmentPage({ onBack }) {
    const { siteData } = useWebsiteData();
    const INTERN_RECRUITMENT = useMemo(
        () => normalizeInternRecruitment(siteData.internRecruitment),
        [siteData.internRecruitment]
    );
    const INTERN_TRACKS = INTERN_RECRUITMENT.tracks;
    const [trackId, setTrackId] = useState(INTERN_TRACKS[0].id);
    const track = INTERN_TRACKS.find((t) => t.id === trackId) || INTERN_TRACKS[0];
    // Blank lines come from the admin's one-topic-per-line editor.
    const portions = (Array.isArray(track.quiz.portions) ? track.quiz.portions : []).map((section) => ({
        ...section,
        topics: section.topics.filter((topic) => topic.trim())
    }));

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
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-7 sm:px-8 sm:py-9">
                    <div className="mx-auto max-w-6xl">
                        <h1 className="text-4xl leading-[0.9] font-black tracking-tight uppercase sm:text-6xl">
                            {INTERN_RECRUITMENT.title}
                        </h1>
                        <p className="mt-3 max-w-3xl text-base leading-snug font-bold sm:text-lg">
                            {INTERN_RECRUITMENT.tagline}
                        </p>
                        <p
                            role="note"
                            className="mt-3 font-mono text-xs font-black tracking-widest uppercase"
                        >
                            <span className="text-rose-600">Note:</span> {INTERN_RECRUITMENT.eligibilityNote}
                        </p>
                    </div>
                </section>

                {/* Registration */}
                <section className="border-b-4 border-slate-900 bg-sky-200 px-4 py-5 sm:px-8 sm:py-6">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-5">
                        <div className="min-w-0">
                            <h2 className="text-2xl font-black uppercase sm:text-3xl">Register here</h2>
                            <a
                                href={INTERN_RECRUITMENT.registerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="press shadow-brutal-3 mt-3 inline-flex items-center gap-1.5 border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-sm font-black break-all text-slate-900 no-underline hover:bg-sky-100"
                            >
                                {INTERN_RECRUITMENT.registerUrl.replace(/^https?:\/\//, '')} ↗
                            </a>
                            <p className="mt-2 font-mono text-[11px] font-bold tracking-wide text-slate-700 uppercase">
                                Or scan the QR code
                            </p>
                        </div>
                        <a
                            href={INTERN_RECRUITMENT.registerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shadow-brutal-4 flex-shrink-0 border-2 border-slate-900 bg-white p-1.5"
                            aria-label="Registration form QR code"
                        >
                            <img
                                src={INTERN_RECRUITMENT.registerQr}
                                alt="QR code for the intern recruitment registration form"
                                width="430"
                                height="430"
                                className="h-24 w-24 sm:h-32 sm:w-32"
                            />
                        </a>
                    </div>
                </section>

                {/* Tracks and rounds */}
                <section className="border-b-4 border-slate-900 bg-white px-4 py-8 sm:px-8 sm:py-10">
                    <div className="mx-auto max-w-6xl">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <span className="font-mono text-xs font-black tracking-widest text-sky-600 uppercase">
                                    Select your track
                                </span>
                                <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">
                                    Recruitment rounds
                                </h2>
                            </div>
                            <div
                                role="tablist"
                                aria-label="Recruitment track"
                                className="shadow-brutal-3 inline-flex border-2 border-slate-900 bg-white"
                            >
                                {INTERN_TRACKS.map((t, index) => {
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
                                            className={`cursor-pointer px-3 py-2 font-mono text-[11px] font-black tracking-wide uppercase transition-colors sm:px-4 sm:text-xs ${
                                                index > 0 ? 'border-l-2 border-slate-900' : ''
                                            } ${
                                                active
                                                    ? 'bg-slate-900 text-amber-300'
                                                    : 'bg-white text-slate-900 hover:bg-sky-100'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            id={`panel-${track.id}`}
                            role="tabpanel"
                            aria-labelledby={`tab-${track.id}`}
                            className="mt-7 flex flex-col gap-6"
                        >
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

                                {/* Quiz format */}
                                <div className="mt-4 flex items-start gap-3 border-2 border-slate-900 bg-slate-900 px-3 py-2.5 text-white sm:items-center">
                                    <span className="flex-shrink-0 border-2 border-amber-300 px-2 py-0.5 font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase">
                                        Quiz format
                                    </span>
                                    <p className="text-sm leading-snug font-bold">
                                        {INTERN_RECRUITMENT.quizFormatNote}
                                    </p>
                                </div>

                                <h4 className="mt-6 border-b-2 border-slate-900 pb-2 font-mono text-xs font-black tracking-widest uppercase">
                                    Portions
                                </h4>
                                {portions.length > 0 ? (
                                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {portions.map((section, index) => (
                                            <div
                                                key={index}
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
                                                {section.topics.length > 0 && (
                                                    <ul className="mt-3 space-y-1.5">
                                                        {section.topics.map((topic, topicIndex) => (
                                                            <li
                                                                key={topicIndex}
                                                                className="flex gap-2 text-sm leading-snug font-bold text-slate-700"
                                                            >
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-slate-900"
                                                                />
                                                                <TopicText text={topic} />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm font-bold text-slate-600">
                                        Portions {SOON.toLowerCase()}.
                                    </p>
                                )}
                            </article>

                            {/* Later rounds, shared by both tracks */}
                            {INTERN_RECRUITMENT.rounds.map((round, index) => (
                                <article
                                    key={round.id}
                                    className="shadow-brutal-6 border-4 border-slate-900 bg-white p-5 sm:p-7"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <span className="font-mono text-xs font-black text-sky-600">
                                                ROUND {String(index + 2).padStart(2, '0')}
                                            </span>
                                            <h3 className="mt-1 text-2xl font-black uppercase sm:text-3xl">
                                                {round.title}
                                            </h3>
                                        </div>
                                        {round.date && (
                                            <div className="border-2 border-slate-900 bg-amber-100 px-3 py-2">
                                                <span className="block font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase">
                                                    Date
                                                </span>
                                                <span className="block font-mono text-xs font-black text-amber-700 uppercase">
                                                    {round.date}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-4 text-sm font-bold whitespace-pre-line text-slate-600">
                                        {round.details || 'Further details will be updated soon.'}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
