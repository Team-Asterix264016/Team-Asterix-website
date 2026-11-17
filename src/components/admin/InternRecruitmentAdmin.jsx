import { useMemo } from 'react';
import { useWebsiteData } from '../../context/WebsiteDataContext';
import { INTERN_RECRUITMENT_DEFAULTS, normalizeInternRecruitment } from '../../data/internRecruitment';
import ImageField from './ImageField';

// A QR must never be cropped, so the only preview is the square it is shown in.
const QR_FRAMES = [{ id: 'qr', label: 'Recruitment page', ratio: '1 / 1' }];

const INPUT = 'w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 text-sm font-bold';
const LABEL = 'mb-1 block font-mono text-xs font-black text-slate-700 uppercase';
const SMALL_BTN =
    'cursor-pointer border-2 border-slate-900 bg-white px-2 py-1 font-mono text-[11px] font-black uppercase hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40';
const DANGER_BTN =
    'cursor-pointer border-2 border-slate-900 bg-rose-100 px-2 py-1 font-mono text-[11px] font-black text-rose-700 uppercase hover:bg-rose-200';
const ADD_BTN =
    'shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-amber-300 px-3 py-1.5 font-mono text-xs font-black uppercase hover:bg-amber-400';

const move = (list, index, delta) => {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
};

function TextField({ label, value, onChange, placeholder, multiline = false, hint }) {
    return (
        <div>
            <label className={LABEL}>{label}</label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className={INPUT}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={INPUT}
                />
            )}
            {hint && <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">{hint}</p>}
        </div>
    );
}

function SectionCard({ title, subtitle, children }) {
    return (
        <section className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-white p-4 sm:p-5">
            <div className="border-b-2 border-slate-200 pb-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">{title}</h3>
                {subtitle && (
                    <p className="mt-0.5 font-mono text-[11px] font-bold text-slate-500">{subtitle}</p>
                )}
            </div>
            {children}
        </section>
    );
}

export default function InternRecruitmentAdmin({ onImageUpload }) {
    const { siteData, updateInternRecruitment } = useWebsiteData();
    const data = useMemo(
        () => normalizeInternRecruitment(siteData.internRecruitment),
        [siteData.internRecruitment]
    );

    const setField = (key) => (value) => updateInternRecruitment({ [key]: value });

    const updateTrack = (trackId, change) => {
        updateInternRecruitment({
            tracks: data.tracks.map((track) => (track.id === trackId ? change(track) : track))
        });
    };
    const updateQuiz = (trackId, fields) =>
        updateTrack(trackId, (track) => ({ ...track, quiz: { ...track.quiz, ...fields } }));
    const setPortions = (trackId, portions) => updateQuiz(trackId, { portions });

    const setRounds = (rounds) => updateInternRecruitment({ rounds });

    const handleReset = () => {
        if (
            window.confirm(
                'Reset all Intern Recruitment content to the defaults that ship with the site? Your edits here will be replaced.'
            )
        ) {
            updateInternRecruitment(INTERN_RECRUITMENT_DEFAULTS);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Intern Recruitment</h2>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        Edit the first year recruitment page and the home page banner. Changes save
                        automatically.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="/#intern-recruitment"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shadow-brutal-2 border-2 border-slate-900 bg-sky-300 px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-sky-400"
                    >
                        View page ↗
                    </a>
                    <button type="button" onClick={handleReset} className={DANGER_BTN}>
                        Reset to defaults
                    </button>
                </div>
            </div>

            <SectionCard title="Page header" subtitle="Yellow title section at the top of the page.">
                <TextField label="Title" value={data.title} onChange={setField('title')} />
                <TextField
                    label="Catchphrase / tagline"
                    value={data.tagline}
                    onChange={setField('tagline')}
                />
                <TextField
                    label="Note"
                    value={data.eligibilityNote}
                    onChange={setField('eligibilityNote')}
                    hint='Shown as "Note: ..." under the catchphrase and in the banner.'
                />
            </SectionCard>

            <SectionCard title="Registration" subtitle="Blue section with the link and QR code.">
                <TextField
                    label="Registration link"
                    value={data.registerUrl}
                    onChange={setField('registerUrl')}
                    placeholder="https://..."
                />
                <ImageField
                    label="QR code"
                    value={data.registerQr}
                    frames={QR_FRAMES}
                    folder="/asterix/recruitment"
                    onUpload={(e, cb, folder) => onImageUpload?.(e, cb, folder, 'intern_recruitment_qr')}
                    onChange={(fields) => {
                        if (fields.url !== undefined) updateInternRecruitment({ registerQr: fields.url });
                    }}
                />
                <p className="font-mono text-[11px] font-bold text-slate-500">
                    Upload a new QR whenever the registration link changes, so the two match.
                </p>
            </SectionCard>

            <SectionCard title="Home page banner" subtitle="Strip across the top of the home page.">
                <TextField
                    label="Catchline"
                    value={data.bannerCatchline}
                    onChange={setField('bannerCatchline')}
                />
                <TextField
                    label="Short catchline (phones)"
                    value={data.bannerCatchlineShort}
                    onChange={setField('bannerCatchlineShort')}
                />
            </SectionCard>

            <SectionCard title="Round 1: Quiz" subtitle="Each track has its own date and portions.">
                <TextField
                    label="Quiz format note (both tracks)"
                    value={data.quizFormatNote}
                    onChange={setField('quizFormatNote')}
                    multiline
                />

                {data.tracks.map((track) => (
                    <div
                        key={track.id}
                        className="space-y-3 border-2 border-slate-900 bg-slate-50 p-3 sm:p-4"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <TextField
                                label="Track name"
                                value={track.label}
                                onChange={(label) => updateTrack(track.id, (t) => ({ ...t, label }))}
                            />
                            <TextField
                                label="Quiz date"
                                value={track.quiz.date}
                                onChange={(date) => updateQuiz(track.id, { date })}
                                placeholder="e.g. 25 November 2026, 5:30 PM"
                                hint='Leave empty to show "Will be updated soon".'
                            />
                        </div>

                        <div className="space-y-3">
                            <span className={LABEL}>Portions</span>
                            {track.quiz.portions.length === 0 && (
                                <p className="font-mono text-[11px] font-bold text-slate-500">
                                    No sections. The page shows &quot;Portions will be updated soon&quot;.
                                </p>
                            )}
                            {track.quiz.portions.map((section, index) => (
                                <div key={index} className="space-y-2 border-2 border-slate-300 bg-white p-3">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div className="min-w-0 flex-1">
                                            <TextField
                                                label={`Section ${index + 1} title`}
                                                value={section.title}
                                                onChange={(title) =>
                                                    setPortions(
                                                        track.id,
                                                        track.quiz.portions.map((s, i) =>
                                                            i === index ? { ...s, title } : s
                                                        )
                                                    )
                                                }
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className={SMALL_BTN}
                                            disabled={index === 0}
                                            onClick={() =>
                                                setPortions(track.id, move(track.quiz.portions, index, -1))
                                            }
                                            aria-label="Move section up"
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            className={SMALL_BTN}
                                            disabled={index === track.quiz.portions.length - 1}
                                            onClick={() =>
                                                setPortions(track.id, move(track.quiz.portions, index, 1))
                                            }
                                            aria-label="Move section down"
                                        >
                                            ↓
                                        </button>
                                        <button
                                            type="button"
                                            className={DANGER_BTN}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Remove "${section.title || 'this section'}"?`
                                                    )
                                                ) {
                                                    setPortions(
                                                        track.id,
                                                        track.quiz.portions.filter((_, i) => i !== index)
                                                    );
                                                }
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div>
                                        <label className={LABEL}>Topics (one per line)</label>
                                        <textarea
                                            value={section.topics.join('\n')}
                                            onChange={(e) =>
                                                setPortions(
                                                    track.id,
                                                    track.quiz.portions.map((s, i) =>
                                                        i === index
                                                            ? { ...s, topics: e.target.value.split('\n') }
                                                            : s
                                                    )
                                                )
                                            }
                                            rows={Math.min(12, Math.max(3, section.topics.length + 1))}
                                            className={INPUT}
                                        />
                                        <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">
                                            Text before a &quot;: &quot; is shown in bold. Leave empty for a
                                            section with no sub-topics.
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                className={ADD_BTN}
                                onClick={() =>
                                    setPortions(track.id, [...track.quiz.portions, { title: '', topics: [] }])
                                }
                            >
                                + Add section
                            </button>
                        </div>
                    </div>
                ))}
            </SectionCard>

            <SectionCard
                title="Further rounds"
                subtitle="Shown after the quiz on both tracks, numbered from Round 2."
            >
                {data.rounds.length === 0 && (
                    <p className="font-mono text-[11px] font-bold text-slate-500">No further rounds.</p>
                )}
                {data.rounds.map((round, index) => (
                    <div key={round.id} className="space-y-3 border-2 border-slate-900 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-black text-sky-700">
                                ROUND {String(index + 2).padStart(2, '0')}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={SMALL_BTN}
                                    disabled={index === 0}
                                    onClick={() => setRounds(move(data.rounds, index, -1))}
                                    aria-label="Move round up"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    className={SMALL_BTN}
                                    disabled={index === data.rounds.length - 1}
                                    onClick={() => setRounds(move(data.rounds, index, 1))}
                                    aria-label="Move round down"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    className={DANGER_BTN}
                                    onClick={() => {
                                        if (window.confirm(`Remove round "${round.title || index + 2}"?`)) {
                                            setRounds(data.rounds.filter((_, i) => i !== index));
                                        }
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <TextField
                                label="Round name"
                                value={round.title}
                                onChange={(title) =>
                                    setRounds(data.rounds.map((r, i) => (i === index ? { ...r, title } : r)))
                                }
                            />
                            <TextField
                                label="Date (optional)"
                                value={round.date}
                                onChange={(date) =>
                                    setRounds(data.rounds.map((r, i) => (i === index ? { ...r, date } : r)))
                                }
                            />
                        </div>
                        <TextField
                            label="Details"
                            value={round.details}
                            onChange={(details) =>
                                setRounds(data.rounds.map((r, i) => (i === index ? { ...r, details } : r)))
                            }
                            multiline
                            hint='Leave empty to show "Further details will be updated soon."'
                        />
                    </div>
                ))}
                <button
                    type="button"
                    className={ADD_BTN}
                    onClick={() =>
                        setRounds([
                            ...data.rounds,
                            { id: `round-${Date.now()}`, title: '', date: '', details: '' }
                        ])
                    }
                >
                    + Add round
                </button>
            </SectionCard>
        </div>
    );
}
