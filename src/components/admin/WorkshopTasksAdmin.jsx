import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeHref } from '../../lib/safeHref';
import { adminGet, adminSend } from './adminRequest';

/* Make-up tasks for candidates whose attendance can no longer reach the
   threshold. Approving one credits the exact session it covers, so the
   percentage recovers through the normal denominator. The server refuses a
   credit past the per-track cap or once attendance has reached the threshold,
   so the limits do not depend on anyone remembering them here. */

const STATUS_STYLES = {
    assigned: 'bg-amber-300 text-slate-950',
    submitted: 'bg-sky-300 text-slate-950',
    approved: 'bg-emerald-400 text-slate-950',
    rejected: 'bg-rose-400 text-white'
};

const FILTERS = ['submitted', 'assigned', 'approved', 'rejected', 'all'];

export default function WorkshopTasksAdmin({ showStatus }) {
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('submitted');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [notes, setNotes] = useState({});

    const notify = useCallback((message, kind) => {
        if (typeof showStatus === 'function') showStatus(message, kind);
    }, [showStatus]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminGet('/api/workshop/attendance/tasks');
            setTasks(data.tasks || []);
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => { load(); }, [load]);

    const review = useCallback(async (task, decision) => {
        setBusyId(task._id);
        try {
            const data = await adminSend(
                `/api/workshop/attendance/tasks/${task._id}/review`,
                'POST',
                { decision, reviewNote: notes[task._id] || '' }
            );
            notify(data.message || 'Done.', 'success');
            await load();
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setBusyId(null);
        }
    }, [load, notify, notes]);

    const visible = useMemo(() => (
        filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)
    ), [tasks, filter]);

    const counts = useMemo(() => tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {}), [tasks]);

    if (loading) {
        return <div className="border-2 border-slate-900 bg-white p-6 font-mono text-sm font-black">Loading tasks…</div>;
    }

    return (
        <div className="space-y-4">
            <div className="shadow-brutal-3 border-4 border-slate-900 bg-white p-4">
                <h2 className="font-mono text-sm font-black text-slate-950 uppercase">
                    🛠️ Make-up Tasks ({tasks.length})
                </h2>
                <p className="mt-1 font-mono text-[11px] font-bold text-slate-600">
                    Approving a task credits the session it covers, so check the proof of work first.
                    Tasks carry no brief: the exercise is handed out by the team, and the candidate
                    only sees the session it makes up.
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                    {FILTERS.map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`border-2 border-slate-900 px-2.5 py-1 font-mono text-[10px] font-black uppercase ${
                                filter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                            }`}
                        >
                            {value} {value === 'all' ? tasks.length : (counts[value] || 0)}
                        </button>
                    ))}
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="border-2 border-slate-900 bg-white p-6 font-mono text-sm font-black text-slate-600">
                    Nothing here.
                </div>
            ) : visible.map((task) => (
                <div key={task._id} className="shadow-brutal-2 border-2 border-slate-900 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <strong className="block text-sm font-black text-slate-950">{task.name} · {task.rollNo}</strong>
                            <span className="block font-mono text-[11px] font-bold text-slate-600">
                                {task.title} — {task.track} · {task.sessionDate}
                            </span>
                        </div>
                        <span className={`border-2 border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${STATUS_STYLES[task.status]}`}>
                            {task.status}
                        </span>
                    </div>

                    {task.individualSeed ? (
                        <span className="mt-2 inline-block border-2 border-slate-900 bg-violet-200 px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                            Their value: {task.individualSeed}
                        </span>
                    ) : null}

                    {task.driveLink ? (
                        <p className="mt-2 font-mono text-[11px] font-bold">
                            Proof:{' '}
                            <a
                                href={safeHref(task.driveLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-sky-700 underline"
                            >
                                {task.driveLink}
                            </a>
                        </p>
                    ) : (
                        <p className="mt-2 font-mono text-[11px] font-bold text-slate-500">Not submitted yet.</p>
                    )}

                    {task.submissionNote ? (
                        <p className="mt-1 border-l-4 border-slate-300 pl-2 font-mono text-[11px] font-bold text-slate-700">
                            {task.submissionNote}
                        </p>
                    ) : null}

                    {task.reviewNote ? (
                        <p className="mt-1 font-mono text-[11px] font-bold text-slate-600">
                            Last review ({task.reviewedBy || 'unknown'}): {task.reviewNote}
                        </p>
                    ) : null}

                    {task.status === 'approved' ? null : (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={notes[task._id] || ''}
                                onChange={(e) => setNotes((prev) => ({ ...prev, [task._id]: e.target.value }))}
                                placeholder="Note to the candidate (shown on their profile)"
                                className="min-w-[200px] flex-1 border-2 border-slate-900 px-2 py-1.5 font-mono text-[11px] font-bold"
                            />
                            <button
                                type="button"
                                disabled={busyId === task._id || !task.driveLink}
                                onClick={() => review(task, 'approve')}
                                className="border-2 border-slate-900 bg-emerald-400 px-3 py-1.5 font-mono text-[11px] font-black uppercase disabled:opacity-50"
                            >
                                Approve &amp; credit
                            </button>
                            <button
                                type="button"
                                disabled={busyId === task._id || !task.driveLink}
                                onClick={() => review(task, 'reject')}
                                className="border-2 border-slate-900 bg-rose-400 px-3 py-1.5 font-mono text-[11px] font-black text-white uppercase disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
