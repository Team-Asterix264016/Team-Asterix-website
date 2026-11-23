import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../lib/api';
import {
    EXPO_DATE_CONFIRMED,
    EXPO_DATE_LABEL,
    EXPO_GROUND_RULES,
    EXPO_OBJECTIVES,
    EXPO_PROBLEM_STATEMENTS,
    EXPO_PS_CAP,
    EXPO_PS_PDF_NAME,
    EXPO_PS_PDF_URL,
    EXPO_TEAM_COUNT,
    findProblemStatement
} from '../data/expoProblemStatements';

/* Intern recruitment round 2: the Expo. One page with the event details, the
   problem statements (downloadable PDF plus in-page descriptions) and the team
   registration form. Opened from #expo; #expo-register jumps to the form. */

const EMPTY_FORM = {
    teamNo: '',
    teamName: '',
    problemStatement: '',
    captainName: '',
    captainRollNo: '',
    captainPhone: '',
    captainEmail: ''
};

const inputClass =
    'w-full border-2 border-slate-900 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none';
const labelClass = 'mb-1 block font-mono text-[10px] font-black tracking-widest text-slate-600 uppercase';

/* Same rules the server applies, so most mistakes are caught before sending. */
function validate(form) {
    if (!form.teamNo) return 'Pick your team number.';
    if (!form.teamName.trim()) return 'Enter your team name.';
    if (!form.problemStatement) return 'Pick a problem statement.';
    if (!form.captainName.trim()) return "Enter the captain's name.";
    if (!/^\d{12}$/.test(form.captainRollNo.replace(/\s+/g, ''))) {
        return "Enter the captain's 12-digit register number.";
    }
    const phone = form.captainPhone.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '');
    if (!/^[6-9]\d{9}$/.test(phone)) return "Enter the captain's 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.captainEmail.trim())) return "Enter the captain's email address.";
    return '';
}

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* How many teams have taken each problem statement, from the server. Null
   until it loads (or if it cannot): nothing is greyed out then, and the
   server still refuses a full one. */
function useAvailability() {
    const [availability, setAvailability] = useState(null);
    const refresh = useCallback(async () => {
        try {
            const res = await fetch(apiUrl('/api/expo/availability'));
            if (res.ok) setAvailability(await res.json());
        } catch {
            /* keep the last known counts */
        }
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    const cap = availability?.cap || EXPO_PS_CAP;
    const taken = (id) => availability?.counts?.[id] ?? null;
    const isFull = (id) => taken(id) !== null && taken(id) >= cap;
    return { cap, taken, isFull, refresh };
}

function SlotBadge({ taken, cap, full }) {
    if (taken === null) return null;
    return full ? (
        <span className="inline-block self-start border-2 border-slate-500 bg-slate-500 px-1.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-white uppercase">
            Cap reached · {cap}/{cap} teams
        </span>
    ) : (
        <span className="inline-block self-start border-2 border-slate-900 bg-white px-1.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-slate-900 uppercase">
            {cap - taken} of {cap} slots left
        </span>
    );
}

function SectionHeading({ kicker, title, children }) {
    return (
        <div className="mb-6">
            <p className="font-mono text-[11px] font-black tracking-widest text-teal-700 uppercase">{kicker}</p>
            <h2 className="mt-1 text-3xl leading-none font-black tracking-tight text-slate-900 uppercase sm:text-4xl">{title}</h2>
            {children && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">{children}</p>}
        </div>
    );
}

function BulletList({ title, items, ordered }) {
    const List = ordered ? 'ol' : 'ul';
    return (
        <div>
            <h4 className="mb-1.5 font-mono text-[11px] font-black tracking-widest text-slate-900 uppercase">{title}</h4>
            <List className={`space-y-1 pl-5 text-sm leading-relaxed text-slate-700 ${ordered ? 'list-decimal' : 'list-disc'}`}>
                {items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </List>
        </div>
    );
}

function DownloadPdfButton({ variant = 'light' }) {
    const styles =
        variant === 'dark'
            ? 'bg-amber-300 text-slate-900 hover:bg-amber-200'
            : 'bg-slate-900 text-white hover:bg-slate-800';
    return (
        <a
            href={EXPO_PS_PDF_URL}
            download={EXPO_PS_PDF_NAME}
            className={`press shadow-brutal-2 inline-flex items-center gap-2 border-2 border-slate-900 px-4 py-2.5 font-mono text-xs font-black uppercase ${styles}`}
        >
            ↓ Download problem statements (PDF)
        </a>
    );
}

function ProblemStatementDetail({ ps, onBack, onRegister, isChosen, slots }) {
    const full = slots.isFull(ps.id);
    return (
        <article className="shadow-brutal-4 space-y-5 border-4 border-slate-900 bg-white p-4 sm:p-7">
            <button
                type="button"
                onClick={onBack}
                className="cursor-pointer font-mono text-[11px] font-black tracking-widest text-slate-600 uppercase hover:text-slate-900"
            >
                ← All problem statements
            </button>
            <div>
                <p className="font-mono text-[10px] font-black tracking-widest text-teal-700 uppercase">
                    Problem statement {ps.number} · {ps.category}
                </p>
                <h3 className="mt-1 text-2xl leading-tight font-black text-slate-900 uppercase sm:text-3xl">{ps.title}</h3>
                <p className="mt-1 text-sm text-slate-600 italic">{ps.tagline}</p>
                <div className="mt-2">
                    <SlotBadge taken={slots.taken(ps.id)} cap={slots.cap} full={full} />
                </div>
                {full && (
                    <p className="mt-2 border-2 border-slate-400 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
                        This problem statement is full: {slots.cap} teams have already taken it. You can still read the
                        brief, but please register with a different one.
                    </p>
                )}
            </div>
            <dl className="grid gap-px border-2 border-slate-900 bg-slate-900 text-sm sm:grid-cols-2">
                {[
                    ['Seen in', ps.seenIn],
                    ['Power', ps.power],
                    ['Hardware', ps.hardware],
                    ['Est. cost', ps.cost]
                ].map(([label, value]) => (
                    <div key={label} className="bg-amber-50 px-3 py-2">
                        <dt className="font-mono text-[10px] font-black tracking-widest text-slate-500 uppercase">{label}</dt>
                        <dd className="font-bold text-slate-900">{value}</dd>
                    </div>
                ))}
            </dl>
            <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                <h4 className="font-mono text-[11px] font-black tracking-widest text-slate-900 uppercase">The problem</h4>
                {ps.problem.map((para) => (
                    <p key={para.slice(0, 40)}>{para}</p>
                ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
                <BulletList title="How it is used in real life" items={ps.realLife} />
                <BulletList title="What the system must do" items={ps.mustDo} ordered />
                <BulletList title="Electrical scope" items={ps.electrical} />
                <BulletList title="Software scope" items={ps.software} />
            </div>
            <BulletList title="Expo targets" items={ps.targets} />
            <div className="flex flex-wrap gap-3 border-t-2 border-slate-200 pt-4">
                <button
                    type="button"
                    onClick={() => onRegister(ps.id)}
                    disabled={full}
                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-teal-400 px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-teal-300 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                    {full
                        ? 'Cap reached: no slots left'
                        : isChosen
                          ? '✓ Selected. Go to the form ↓'
                          : 'Register with this problem statement ↓'}
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="press cursor-pointer border-2 border-slate-900 bg-white px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                >
                    View the others
                </button>
            </div>
        </article>
    );
}

function ProblemStatementsSection({ chosenId, onRegisterWith, slots }) {
    const [openId, setOpenId] = useState(null);
    const sectionRef = useRef(null);
    const open = findProblemStatement(openId);

    const show = (id) => {
        setOpenId(id);
        // Bring the top of the section (and so the opened statement) into view.
        requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    return (
        <section id="expo-problem-statements" ref={sectionRef} className="scroll-mt-4 border-b-4 border-slate-900 bg-amber-50 px-4 py-14 sm:px-8">
            <div className="mx-auto max-w-6xl">
                <SectionHeading kicker="02 · Choose your build" title="Problem statements">
                    Six real-world systems to recreate. Every team picks one, and each one takes at most {slots.cap}{' '}
                    teams, first come first served. Click a problem statement to read the full brief, or download all
                    six as a PDF.
                </SectionHeading>
                <div className="mb-6">
                    <DownloadPdfButton />
                </div>

                {open ? (
                    <ProblemStatementDetail
                        ps={open}
                        onBack={() => show(null)}
                        onRegister={onRegisterWith}
                        isChosen={chosenId === open.id}
                        slots={slots}
                    />
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {EXPO_PROBLEM_STATEMENTS.map((ps) => {
                            const full = slots.isFull(ps.id);
                            return (
                            <li key={ps.id}>
                                <button
                                    type="button"
                                    onClick={() => show(ps.id)}
                                    className={`press flex h-full w-full cursor-pointer flex-col gap-2 border-2 p-4 text-left ${
                                        full
                                            ? 'border-slate-400 bg-slate-200 opacity-70 grayscale'
                                            : `shadow-brutal-3 border-slate-900 hover:bg-white ${chosenId === ps.id ? 'bg-teal-50' : 'bg-white/80'}`
                                    }`}
                                >
                                    <SlotBadge taken={slots.taken(ps.id)} cap={slots.cap} full={full} />
                                    <span className="font-mono text-[10px] font-black tracking-widest text-teal-700 uppercase">
                                        PS {ps.number} · {ps.category}
                                        {chosenId === ps.id && <span className="ml-1.5 text-slate-900">✓ Selected</span>}
                                    </span>
                                    <span className="text-lg leading-tight font-black text-slate-900 uppercase">{ps.title}</span>
                                    <span className="text-sm leading-snug text-slate-600">{ps.tagline}</span>
                                    <span className="mt-auto flex flex-wrap gap-x-2 pt-2 font-mono text-[10px] font-bold text-slate-500">
                                        <span>{ps.cost}</span>
                                        <span>·</span>
                                        <span>{ps.power}</span>
                                    </span>
                                    <span className="font-mono text-[11px] font-black text-slate-900 uppercase">
                                        {full ? 'Full · Read the brief →' : 'View details →'}
                                    </span>
                                </button>
                            </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}

function RegistrationSection({ form, setForm, slots }) {
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
    const chosen = findProblemStatement(form.problemStatement);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const problem = validate(form);
        if (problem) {
            setError(problem);
            return;
        }
        setError('');
        setIsSubmitting(true);
        try {
            const res = await fetch(apiUrl('/api/expo/registrations'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, teamNo: Number(form.teamNo) })
            });
            const data = await res.json().catch(() => ({}));
            // A full problem statement (or any save) changes the counts others see.
            slots.refresh();
            if (!res.ok) throw new Error(data.error || 'Could not save the registration. Please try again.');
            setResult(data);
            requestAnimationFrame(() => scrollToId('expo-register'));
        } catch (err) {
            setError(
                err.message === 'Failed to fetch'
                    ? 'Could not reach the server. Check your connection and try again.'
                    : err.message
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="expo-register" className="scroll-mt-4 border-b-4 border-slate-900 bg-white px-4 py-14 sm:px-8">
            <div className="mx-auto max-w-3xl">
                <SectionHeading kicker="03 · Team registration" title="Register your team">
                    One person per team (the captain) fills this in. To change anything later, such as your problem
                    statement, just submit again for the same team.
                </SectionHeading>

                {result ? (
                    <div className="shadow-brutal-4 space-y-5 border-4 border-slate-900 bg-teal-50 p-6 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center border-4 border-slate-900 bg-teal-400 text-2xl font-black">
                            ✓
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase">
                                {result.updated ? 'Registration updated' : "You're registered"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">{result.message}</p>
                        </div>
                        <dl className="mx-auto max-w-md divide-y-2 divide-slate-200 border-2 border-slate-900 bg-white text-left text-sm">
                            {[
                                ['Team', `Team ${form.teamNo} · ${form.teamName.trim()}`],
                                ['Problem statement', chosen ? `PS ${chosen.number} · ${chosen.title}` : ''],
                                ['Captain', `${form.captainName.trim()} (${form.captainRollNo.trim()})`]
                            ].map(([label, value]) => (
                                <div key={label} className="px-3 py-2">
                                    <dt className="font-mono text-[10px] font-black tracking-widest text-slate-500 uppercase">{label}</dt>
                                    <dd className="font-bold text-slate-900">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <button
                            type="button"
                            onClick={() => setResult(null)}
                            className="press cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase hover:bg-slate-100"
                        >
                            Edit and resubmit
                        </button>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="shadow-brutal-4 space-y-6 border-4 border-slate-900 bg-white p-4 sm:p-7"
                    >
                        <fieldset className="space-y-4">
                            <legend className="mb-3 font-mono text-[11px] font-black tracking-widest text-slate-900 uppercase">
                                Team
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                                <div>
                                    <label htmlFor="expo-team-no" className={labelClass}>
                                        Team No.
                                    </label>
                                    <select id="expo-team-no" value={form.teamNo} onChange={set('teamNo')} className={inputClass}>
                                        <option value="">Select</option>
                                        {Array.from({ length: EXPO_TEAM_COUNT }, (_, i) => i + 1).map((n) => (
                                            <option key={n} value={n}>
                                                Team {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="expo-team-name" className={labelClass}>
                                        Team name
                                    </label>
                                    <input
                                        id="expo-team-name"
                                        type="text"
                                        maxLength={80}
                                        value={form.teamName}
                                        onChange={set('teamName')}
                                        placeholder="e.g. Circuit Breakers"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="mb-1 flex items-end justify-between gap-2">
                                    <label htmlFor="expo-ps" className={`${labelClass} mb-0`}>
                                        Problem statement
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => scrollToId('expo-problem-statements')}
                                        className="cursor-pointer font-mono text-[10px] font-black tracking-widest text-teal-700 uppercase underline underline-offset-2 hover:text-teal-900"
                                    >
                                        Explore problem statements ↑
                                    </button>
                                </div>
                                <p className="mb-2 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
                                    <strong>Each problem statement is capped at {slots.cap} teams</strong>, first come
                                    first served. Once one fills up it is greyed out and can no longer be picked. A
                                    team that already holds a slot keeps it.
                                </p>
                                <select id="expo-ps" value={form.problemStatement} onChange={set('problemStatement')} className={inputClass}>
                                    <option value="">Select a problem statement</option>
                                    {EXPO_PROBLEM_STATEMENTS.map((ps) => {
                                        const full = slots.isFull(ps.id);
                                        const taken = slots.taken(ps.id);
                                        return (
                                            <option key={ps.id} value={ps.id} disabled={full} className={full ? 'text-slate-400' : ''}>
                                                PS {ps.number} · {ps.title}
                                                {full
                                                    ? ` (cap filled, ${slots.cap}/${slots.cap})`
                                                    : taken !== null
                                                      ? ` (${slots.cap - taken} slots left)`
                                                      : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {chosen && <p className="mt-1.5 text-xs text-slate-600 italic">{chosen.tagline}</p>}
                            </div>
                        </fieldset>

                        <fieldset className="space-y-4">
                            <legend className="mb-3 font-mono text-[11px] font-black tracking-widest text-slate-900 uppercase">
                                Team captain
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="expo-captain-name" className={labelClass}>
                                        Name
                                    </label>
                                    <input
                                        id="expo-captain-name"
                                        type="text"
                                        autoComplete="name"
                                        value={form.captainName}
                                        onChange={set('captainName')}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="expo-captain-roll" className={labelClass}>
                                        Register no.
                                    </label>
                                    <input
                                        id="expo-captain-roll"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={12}
                                        value={form.captainRollNo}
                                        onChange={set('captainRollNo')}
                                        placeholder="7155261XXXXX"
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="expo-captain-phone" className={labelClass}>
                                        Phone
                                    </label>
                                    <input
                                        id="expo-captain-phone"
                                        type="tel"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        value={form.captainPhone}
                                        onChange={set('captainPhone')}
                                        placeholder="10-digit mobile number"
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="expo-captain-email" className={labelClass}>
                                        Email
                                    </label>
                                    <input
                                        id="expo-captain-email"
                                        type="email"
                                        autoComplete="email"
                                        value={form.captainEmail}
                                        onChange={set('captainEmail')}
                                        placeholder="26x000@psgitech.ac.in"
                                        className={`${inputClass} font-mono`}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {error && (
                            <p role="alert" className="border-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="press shadow-brutal-2 w-full cursor-pointer border-2 border-slate-900 bg-rose-500 px-4 py-3 font-mono text-sm font-black text-white uppercase hover:bg-rose-600 disabled:cursor-wait disabled:opacity-60"
                        >
                            {isSubmitting ? 'Submitting…' : 'Register team for the Expo →'}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}

export default function ExpoPage({ onBack, startAtForm = false }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const slots = useAvailability();

    useEffect(() => {
        if (startAtForm) requestAnimationFrame(() => scrollToId('expo-register'));
    }, [startAtForm]);

    const registerWith = (psId) => {
        setForm((prev) => ({ ...prev, problemStatement: psId }));
        requestAnimationFrame(() => scrollToId('expo-register'));
    };

    const facts = [
        ['Date', EXPO_DATE_LABEL, EXPO_DATE_CONFIRMED ? '' : 'Tentative. Final date will be confirmed.'],
        ['Teams', `${EXPO_TEAM_COUNT} shortlisted`, '4 to 5 members each'],
        ['Problem statements', `${EXPO_PROBLEM_STATEMENTS.length} to choose from`, `One per team · max ${slots.cap} teams each`]
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
            <header className="sticky top-0 z-40 border-b-4 border-slate-900 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
                    <button
                        type="button"
                        onClick={onBack}
                        className="press cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-[11px] font-black uppercase hover:bg-slate-100"
                    >
                        ← Home
                    </button>
                    <span className="truncate font-mono text-[11px] font-black tracking-widest text-slate-500 uppercase">
                        Team Asterix · Expo 2026
                    </span>
                    <button
                        type="button"
                        onClick={() => scrollToId('expo-register')}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-rose-500 px-3 py-1.5 font-mono text-[11px] font-black whitespace-nowrap text-white uppercase hover:bg-rose-600"
                    >
                        Register
                    </button>
                </div>
            </header>

            {/* 01: About the Expo */}
            <section className="border-b-4 border-slate-900 bg-slate-900 px-4 pt-14 pb-16 text-white sm:px-8 sm:pt-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-4 inline-block border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                        Intern recruitment · Round 2
                    </div>
                    <h1 className="text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl md:text-7xl">
                        Autonomous Systems <span className="text-teal-300">Expo 2026</span>
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-relaxed font-bold text-slate-300 sm:text-lg">
                        Round 1 is over and {EXPO_TEAM_COUNT} teams are through. In the Expo, each team builds a real
                        autonomous system that senses, decides and acts on its own, using what you learnt in both
                        workshop tracks, then demos it, shows its test results and pitches it to the judges.
                    </p>

                    <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                        {facts.map(([label, value, note]) => (
                            <div key={label} className="border-2 border-slate-700 bg-slate-800/60 p-4">
                                <dt className="font-mono text-[10px] font-black tracking-widest text-amber-300 uppercase">{label}</dt>
                                <dd className="mt-1 text-xl font-black uppercase">{value}</dd>
                                {note && <dd className="mt-0.5 text-xs text-slate-400">{note}</dd>}
                            </div>
                        ))}
                    </dl>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => scrollToId('expo-register')}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-rose-500 px-4 py-2.5 font-mono text-xs font-black text-white uppercase hover:bg-rose-600"
                        >
                            Register your team ↓
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToId('expo-problem-statements')}
                            className="press cursor-pointer border-2 border-white bg-transparent px-4 py-2.5 font-mono text-xs font-black text-white uppercase hover:bg-white/10"
                        >
                            View problem statements ↓
                        </button>
                        <DownloadPdfButton variant="dark" />
                    </div>
                </div>
            </section>

            <section className="border-b-4 border-slate-900 bg-white px-4 py-14 sm:px-8">
                <div className="mx-auto max-w-6xl">
                    <SectionHeading kicker="01 · How it works" title="What the Expo expects">
                        These apply to every team, whichever problem statement you choose.
                    </SectionHeading>
                    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
                        <div className="self-start border-2 border-slate-900 bg-amber-50 p-5">
                            <BulletList title="Objectives" items={EXPO_OBJECTIVES} />
                        </div>
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {EXPO_GROUND_RULES.map((rule) => (
                                <div key={rule.title} className="border-2 border-slate-900 bg-white p-4">
                                    <dt className="font-mono text-[11px] font-black tracking-widest text-slate-900 uppercase">{rule.title}</dt>
                                    <dd className="mt-1 text-sm leading-relaxed text-slate-700">{rule.text}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            <ProblemStatementsSection chosenId={form.problemStatement} onRegisterWith={registerWith} slots={slots} />

            <RegistrationSection form={form} setForm={setForm} slots={slots} />

            <footer className="bg-slate-900 px-4 py-8 text-center sm:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="press cursor-pointer border-2 border-white px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-white/10"
                >
                    ← Back to the Team Asterix site
                </button>
            </footer>
        </div>
    );
}
