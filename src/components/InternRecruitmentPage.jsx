import { useMemo, useState } from 'react';
import { normalizeInternRecruitment } from '../data/internRecruitment';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { apiUrl } from '../lib/api';

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
    const [trackId, setTrackId] = useState(null);
    const track = INTERN_TRACKS.find((t) => t.id === trackId) || null;
    // Blank lines come from the admin's one-topic-per-line editor.
    const portions = track
        ? (Array.isArray(track.quiz.portions) ? track.quiz.portions : []).map((section) => ({
              ...section,
              topics: section.topics.filter((topic) => topic.trim())
          }))
        : [];

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
                <section className="border-b-4 border-slate-900 bg-amber-300 px-4 py-10 sm:px-8 sm:py-14">
                    <div className="mx-auto max-w-6xl">
                        {/* Same scale as the subsystem page titles */}
                        <h1 className="text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl md:text-7xl">
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
                                src={apiUrl(INTERN_RECRUITMENT.registerQr)}
                                alt="QR code for the intern recruitment registration form"
                                width="430"
                                height="430"
                                className="h-24 w-24 object-contain sm:h-32 sm:w-32"
                            />
                        </a>
                    </div>
                </section>

                {/* Safe Exam Browser (SEB) Download */}
                <section className="border-b-4 border-slate-900 bg-emerald-100 px-4 py-7 sm:px-8 sm:py-9">
                    <div className="mx-auto max-w-6xl">
                        <div className="shadow-brutal-6 border-4 border-slate-900 bg-white p-5 sm:p-8">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                <div className="max-w-2xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="border-2 border-slate-900 bg-emerald-400 px-2.5 py-0.5 font-mono text-xs font-black tracking-widest text-slate-900 uppercase">
                                            Round 1 Online Exam
                                        </span>
                                        <span className="border-2 border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-black tracking-wide text-amber-300 uppercase">
                                            Safe Exam Browser (.seb)
                                        </span>
                                    </div>
                                    <h2 className="mt-3 text-2xl font-black uppercase text-slate-900 sm:text-3xl md:text-4xl">
                                        Safe Exam Browser Configuration
                                    </h2>
                                    <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700 sm:text-base">
                                        The recruitment quiz is conducted through Safe Exam Browser (SEB). Download the official{' '}
                                        <code className="border border-slate-900 bg-amber-200 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-900">
                                            {INTERN_RECRUITMENT.sebFileName || 'config-trial pg.seb'}
                                        </code>{' '}
                                        configuration file below to launch the test.
                                    </p>

                                    {/* 3 Quick Steps */}
                                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                        <div className="border-2 border-slate-900 bg-slate-50 p-3">
                                            <span className="block font-mono text-[10px] font-black tracking-wider text-sky-600 uppercase">
                                                Step 01
                                            </span>
                                            <strong className="block text-xs font-black uppercase text-slate-900">
                                                Install SEB
                                            </strong>
                                            <p className="mt-0.5 text-[11px] font-bold text-slate-600">
                                                Get Safe Exam Browser for your laptop
                                            </p>
                                        </div>
                                        <div className="border-2 border-slate-900 bg-slate-50 p-3">
                                            <span className="block font-mono text-[10px] font-black tracking-wider text-sky-600 uppercase">
                                                Step 02
                                            </span>
                                            <strong className="block text-xs font-black uppercase text-slate-900">
                                                Download .seb
                                            </strong>
                                            <p className="mt-0.5 text-[11px] font-bold text-slate-600">
                                                Click the green button to download
                                            </p>
                                        </div>
                                        <div className="border-2 border-slate-900 bg-slate-50 p-3">
                                            <span className="block font-mono text-[10px] font-black tracking-wider text-sky-600 uppercase">
                                                Step 03
                                            </span>
                                            <strong className="block text-xs font-black uppercase text-slate-900">
                                                Launch Exam
                                            </strong>
                                            <p className="mt-0.5 text-[11px] font-bold text-slate-600">
                                                Double-click the .seb file to open
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-start gap-3 sm:items-end">
                                    <a
                                        href={apiUrl(INTERN_RECRUITMENT.sebFileUrl || '/recruitment/config-trial pg.seb')}
                                        download={INTERN_RECRUITMENT.sebFileName || 'config-trial pg.seb'}
                                        className="press shadow-brutal-4 inline-flex items-center gap-2 border-2 border-slate-900 bg-emerald-400 px-5 py-3.5 text-center font-mono text-sm font-black uppercase text-slate-900 no-underline transition-all hover:bg-emerald-300"
                                    >
                                        <span>Download SEB File</span>
                                        <span className="text-base font-black">↓</span>
                                    </a>
                                    <span className="font-mono text-[11px] font-bold text-slate-600">
                                        {INTERN_RECRUITMENT.sebFileName || 'config-trial pg.seb'}
                                    </span>
                                    <a
                                        href="https://safeexambrowser.org/download_en.html"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-mono text-xs font-bold text-sky-700 underline hover:text-sky-900"
                                    >
                                        Need Safe Exam Browser? Download here ↗
                                    </a>
                                </div>
                            </div>
                        </div>
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
                                            aria-controls={active ? `panel-${t.id}` : undefined}
                                            onClick={() => setTrackId(t.id)}
                                            className={`cursor-pointer px-3 py-2 font-mono text-[11px] font-black tracking-wide uppercase transition-colors sm:px-4 sm:text-xs ${
                                                index > 0 ? 'border-l-2 border-slate-900' : ''
                                            } ${
                                                active
                                                    ? 'bg-slate-900 text-amber-300'
                                                    : 'bg-white text-slate-900 hover:bg-amber-300'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {!track ? (
                            <div className="shadow-brutal-6 mt-7 border-4 border-slate-900 bg-white p-6 sm:p-10">
                                <div className="max-w-2xl">
                                    <span className="inline-block border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black tracking-widest text-slate-900 uppercase">
                                        Step 1: Choose Your Subsystem
                                    </span>
                                    <h3 className="mt-3 text-2xl font-black uppercase text-slate-900 sm:text-3xl md:text-4xl">
                                        Select a subsystem to view syllabus & rounds
                                    </h3>
                                    <p className="mt-2 text-sm font-bold text-slate-600 sm:text-base">
                                        Team Asterix recruits for both Software & Perception and Powertrain. Choose a subsystem below (or use the tabs above) to see its quiz syllabus, portions, and round schedule.
                                    </p>
                                </div>

                                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {INTERN_TRACKS.map((t) => {
                                        const isPowertrain = t.id === 'powertrain';
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setTrackId(t.id)}
                                                className="press shadow-brutal-4 group flex flex-col justify-between border-4 border-slate-900 bg-slate-50 p-6 text-left transition-all hover:-translate-y-1 hover:bg-amber-300 sm:p-7"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs font-black tracking-widest text-sky-600 uppercase group-hover:text-slate-900">
                                                            Subsystem Track
                                                        </span>
                                                        <span className="border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                                                            {isPowertrain ? 'Hardware & Electronics' : 'Software & AI'}
                                                        </span>
                                                    </div>
                                                    <h4 className="mt-3 text-2xl font-black uppercase text-slate-900 sm:text-3xl">
                                                        {t.label}
                                                    </h4>
                                                    <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600 group-hover:text-slate-900">
                                                        {isPowertrain
                                                            ? 'Electrical fundamentals, basic electronic components, sensors & actuators, microcontrollers, communication systems, and general aptitude.'
                                                            : 'Development tools, machine learning, system design, basics of C, logic building, coordinate geometry, and general aptitude.'}
                                                    </p>
                                                </div>
                                                <div className="mt-6 flex items-center justify-between border-t-2 border-slate-900 pt-4">
                                                    <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-900">
                                                        View Quiz Syllabus & Details
                                                    </span>
                                                    <span className="font-mono text-base font-black text-slate-900 transition-transform group-hover:translate-x-1">
                                                        →
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div
                                id={`panel-${track.id}`}
                                role="tabpanel"
                                aria-labelledby={`tab-${track.id}`}
                                className="mt-7 flex flex-col gap-6"
                            >
                                {/* Subsystem Switcher Bar */}
                                <div className="shadow-brutal-2 flex flex-wrap items-center justify-between gap-3 border-2 border-slate-900 bg-amber-100 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-black text-slate-700 uppercase">
                                            Selected Subsystem:
                                        </span>
                                        <span className="border-2 border-slate-900 bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-black text-amber-300 uppercase">
                                            {track.label}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {INTERN_TRACKS.filter((t) => t.id !== track.id).map((otherTrack) => (
                                            <button
                                                key={otherTrack.id}
                                                type="button"
                                                onClick={() => setTrackId(otherTrack.id)}
                                                className="press cursor-pointer border-2 border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black uppercase hover:bg-amber-300"
                                            >
                                                Switch to {otherTrack.label} →
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setTrackId(null)}
                                            className="cursor-pointer font-mono text-xs font-black text-slate-700 uppercase underline hover:text-slate-900"
                                        >
                                            View Both Options
                                        </button>
                                    </div>
                                </div>

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

                                    {/* SEB Config Download */}
                                    <div className="mt-4 flex flex-col justify-between gap-3 border-2 border-slate-900 bg-emerald-50 p-3.5 sm:flex-row sm:items-center">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="border border-slate-900 bg-emerald-400 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900">
                                                    Exam Client
                                                </span>
                                                <strong className="text-xs font-black uppercase text-slate-900 sm:text-sm">
                                                    Safe Exam Browser Configuration (.seb)
                                                </strong>
                                            </div>
                                            <p className="mt-1 text-xs font-bold text-slate-600">
                                                Download{' '}
                                                <span className="font-mono font-black text-slate-900">
                                                    {INTERN_RECRUITMENT.sebFileName || 'config-trial pg.seb'}
                                                </span>{' '}
                                                to launch into the online exam portal.
                                            </p>
                                        </div>
                                        <a
                                            href={apiUrl(INTERN_RECRUITMENT.sebFileUrl || '/recruitment/config-trial pg.seb')}
                                            download={INTERN_RECRUITMENT.sebFileName || 'config-trial pg.seb'}
                                            className="press shadow-brutal-2 inline-flex flex-shrink-0 items-center gap-1.5 border-2 border-slate-900 bg-emerald-400 px-3.5 py-2 font-mono text-xs font-black uppercase text-slate-900 no-underline hover:bg-emerald-300"
                                        >
                                            <span>Download .seb</span>
                                            <span>↓</span>
                                        </a>
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
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
