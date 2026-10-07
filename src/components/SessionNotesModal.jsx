import { useEffect, useRef } from 'react';
import { safeHref } from '../lib/safeHref';
import { resourceBadge } from '../lib/resourceTypes';

export default function SessionNotesModal({ session, notes = [], onClose }) {
    const closeRef = useRef(null);

    useEffect(() => {
        if (!session) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [session, onClose]);

    useEffect(() => {
        if (session) closeRef.current?.focus();
    }, [session]);

    if (!session) return null;

    const isHoliday = session.type === 'holiday';
    const takeaways = notes.flatMap((n) => n.takeaways || []).filter(Boolean);
    const showInstructor = session.instructor && session.instructor !== '-';
    const showVenue = session.venue && session.venue !== '-';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-notes-title"
                data-lenis-prevent
                data-modal-scroll
                className="shadow-brutal-8 h-[100dvh] w-full overflow-y-auto border-4 border-slate-900 bg-white p-5 sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:p-8"
            >
                <div className="flex items-start justify-between gap-3 border-b-4 border-slate-900 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                            {session.label}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-800">
                            {session.date} ({session.days})
                        </span>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="press shadow-brutal-2 shrink-0 border-2 border-slate-900 bg-white px-2.5 py-1 font-mono text-xs font-black text-slate-900 hover:bg-rose-200"
                    >
                        ✕
                    </button>
                </div>

                <h3
                    id="session-notes-title"
                    className="mt-4 text-xl font-black text-slate-900 uppercase sm:text-2xl"
                >
                    {session.title}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                        className={`border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                            session.status === 'PRESENT'
                                ? 'bg-emerald-400 text-slate-950'
                                : session.status === 'ABSENT'
                                  ? 'bg-rose-500 text-white'
                                  : session.status === 'OPTIONAL'
                                    ? 'bg-violet-200 text-violet-950'
                                    : 'bg-sky-200 text-sky-950'
                        }`}
                    >
                        {session.status === 'PRESENT'
                            ? '✅ Present'
                            : session.status === 'ABSENT'
                              ? '❌ Missed'
                              : session.status === 'OPTIONAL'
                                ? '💬 Optional knowledge-sharing session · not counted for attendance'
                                : '🕒 Upcoming'}
                    </span>
                    {session.status === 'PRESENT' && session.checkedInAt && (
                        <span className="font-mono text-[11px] font-bold text-slate-600">
                            Checked in at{' '}
                            {new Date(session.checkedInAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    )}
                </div>

                <div className="mt-4 space-y-1 font-mono text-xs font-bold text-slate-600">
                    {showInstructor && (
                        <div>
                            👤 <strong>Instructor:</strong> {session.instructor}
                        </div>
                    )}
                    {showVenue && (
                        <div>
                            📍 <strong>Venue:</strong> {session.venue}
                        </div>
                    )}
                    {session.project && (
                        <div className="text-amber-900">
                            🚀 <strong>Milestone:</strong> {session.project}
                        </div>
                    )}
                </div>

                {isHoliday ? (
                    <p className="mt-6 font-mono text-xs font-black text-slate-700 uppercase">
                        No session on this day.
                    </p>
                ) : (
                    <>
                        {takeaways.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                    Key takeaways
                                </h4>
                                <ul className="mt-3 space-y-2">
                                    {takeaways.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2 text-sm font-bold text-slate-800"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="mt-1.5 h-2 w-2 shrink-0 border border-slate-900 bg-amber-300"
                                            />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {notes.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                    Session notes
                                </h4>
                                <div className="mt-3 space-y-4">
                                    {notes.map((note) => (
                                        <div
                                            key={note._id}
                                            className="shadow-brutal-4 border-2 border-slate-900 bg-slate-50 p-4"
                                        >
                                            <h5 className="text-base font-black text-slate-900 uppercase">
                                                {note.title}
                                            </h5>
                                            {note.description && (
                                                <p className="mt-1 text-xs font-bold text-slate-600">
                                                    {note.description}
                                                </p>
                                            )}
                                            {(note.resources || []).length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {note.resources.map((res, i) => (
                                                        <a
                                                            key={i}
                                                            href={safeHref(res.url)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="press shadow-brutal-2 flex items-center justify-between gap-2 border-2 border-slate-900 bg-white px-3.5 py-2 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300"
                                                        >
                                                            <span className="truncate">{res.label}</span>
                                                            <span className="shrink-0">
                                                                {resourceBadge(res.type)}
                                                            </span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {takeaways.length === 0 && notes.length === 0 && (
                            <div className="mt-6 border-2 border-dashed border-slate-400 p-4 text-center font-mono text-xs font-bold text-slate-500">
                                Notes and key takeaways will be added after this session.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
