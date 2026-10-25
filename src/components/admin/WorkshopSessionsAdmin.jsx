import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminGet, adminSend } from './adminRequest';

/* The attendance percentage divides by the sessions marked "conducted" here, so
   this screen is what decides certificates. Nothing on it is inferred from the
   attendance data: a session counts because someone said it was held. */

const STATUS_STYLES = {
    conducted: 'bg-emerald-400 text-slate-950',
    scheduled: 'bg-sky-200 text-slate-950',
    cancelled: 'bg-slate-300 text-slate-700'
};

const FLAG_LABELS = {
    'late-scan': 'Late scan',
    'shared-device': 'Shared device'
};

export default function WorkshopSessionsAdmin({ showStatus }) {
    const [sessions, setSessions] = useState([]);
    const [flagged, setFlagged] = useState([]);
    const [threshold, setThreshold] = useState(65);
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState(null);
    const [trackFilter, setTrackFilter] = useState('all');

    const notify = useCallback((message, kind) => {
        if (typeof showStatus === 'function') showStatus(message, kind);
    }, [showStatus]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sessionData, flaggedData] = await Promise.all([
                adminGet('/api/workshop/attendance/sessions'),
                adminGet('/api/workshop/attendance/flagged')
            ]);
            setSessions(sessionData.sessions || []);
            setThreshold(sessionData.threshold || 65);
            setFlagged(flaggedData.rows || []);
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => { load(); }, [load]);

    const act = useCallback(async (sessionKey, run) => {
        setBusyKey(sessionKey);
        try {
            const data = await run();
            notify(data.message || 'Updated.', 'success');
            await load();
        } catch (err) {
            notify(err.message, 'error');
        } finally {
            setBusyKey(null);
        }
    }, [load, notify]);

    const visible = useMemo(() => (
        trackFilter === 'all' ? sessions : sessions.filter((s) => s.track === trackFilter)
    ), [sessions, trackFilter]);

    // What each track's denominator currently is, which is the number that matters.
    const denominators = useMemo(() => {
        const out = {};
        sessions.forEach((s) => {
            if (!s.countsForAttendance || s.status !== 'conducted') return;
            out[s.track] = (out[s.track] || 0) + 1;
        });
        return out;
    }, [sessions]);

    if (loading) {
        return <div className="border-2 border-slate-900 bg-white p-6 font-mono text-sm font-black">Loading sessions…</div>;
    }

    return (
        <div className="space-y-4">
            <div className="shadow-brutal-3 border-4 border-slate-900 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-mono text-sm font-black text-slate-950 uppercase">
                        Sessions &amp; Attendance Denominator
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(denominators).map(([track, count]) => (
                            <span key={track} className="border-2 border-slate-900 bg-slate-900 px-2 py-1 font-mono text-[10px] font-black text-white uppercase">
                                {track}: {count} counted
                            </span>
                        ))}
                        <span className="border-2 border-slate-900 bg-amber-300 px-2 py-1 font-mono text-[10px] font-black uppercase">
                            {threshold}% to qualify
                        </span>
                    </div>
                </div>
                <p className="mt-2 font-mono text-[11px] font-bold text-slate-600">
                    A session counts toward attendance only when it is marked conducted and set to count.
                    Check-in is refused unless the session is open; putting the QR on the projector opens it.
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                    {['all', 'software', 'powertrain'].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTrackFilter(value)}
                            className={`border-2 border-slate-900 px-2.5 py-1 font-mono text-[10px] font-black uppercase ${
                                trackFilter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto border-2 border-slate-900 bg-white">
                <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-slate-900 font-mono text-[10px] text-white uppercase">
                        <tr>
                            <th className="px-3 py-2">Session</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Rows</th>
                            <th className="px-3 py-2">Counts</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Window</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-[11px] font-bold">
                        {visible.map((session) => (
                            <tr key={session.sessionKey} className="border-t-2 border-slate-200">
                                <td className="px-3 py-2">
                                    <span className="block text-slate-950">{session.title || session.label}</span>
                                    <span className="block text-[10px] text-slate-500">{session.sessionKey}</span>
                                </td>
                                <td className="px-3 py-2 text-slate-700">{session.date || '—'}</td>
                                <td className="px-3 py-2 text-slate-700">{session.type}</td>
                                <td className="px-3 py-2 text-slate-700">{session.rows}</td>
                                <td className="px-3 py-2">
                                    <label className="flex cursor-pointer items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={session.countsForAttendance}
                                            disabled={busyKey === session.sessionKey}
                                            onChange={(e) => act(session.sessionKey, () => adminSend(
                                                '/api/workshop/attendance/sessions',
                                                'PATCH',
                                                { sessionKey: session.sessionKey, countsForAttendance: e.target.checked }
                                            ))}
                                        />
                                        <span className="text-[10px] uppercase">{session.countsForAttendance ? 'Yes' : 'No'}</span>
                                    </label>
                                </td>
                                <td className="px-3 py-2">
                                    <select
                                        value={session.status}
                                        disabled={busyKey === session.sessionKey}
                                        onChange={(e) => act(session.sessionKey, () => adminSend(
                                            '/api/workshop/attendance/sessions',
                                            'PATCH',
                                            { sessionKey: session.sessionKey, status: e.target.value }
                                        ))}
                                        className={`border-2 border-slate-900 px-1.5 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLES[session.status] || ''}`}
                                    >
                                        <option value="scheduled">Scheduled</option>
                                        <option value="conducted">Conducted</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td className="px-3 py-2">
                                    <button
                                        type="button"
                                        disabled={busyKey === session.sessionKey}
                                        onClick={() => act(session.sessionKey, () => adminSend(
                                            `/api/workshop/attendance/sessions/${session.isOpen ? 'close' : 'open'}`,
                                            'POST',
                                            { sessionKey: session.sessionKey }
                                        ))}
                                        className={`border-2 border-slate-900 px-2 py-1 text-[10px] font-black uppercase ${
                                            session.isOpen ? 'bg-emerald-400 text-slate-950' : 'bg-white text-slate-900'
                                        }`}
                                    >
                                        {session.isOpen ? 'Open · close it' : 'Closed · open it'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="shadow-brutal-3 border-4 border-slate-900 bg-white p-4">
                <h2 className="font-mono text-sm font-black text-slate-950 uppercase">
                    ⚠️ Flagged Check-ins ({flagged.length})
                </h2>
                <p className="mt-1 font-mono text-[11px] font-bold text-slate-600">
                    None of these were blocked. They carry a signal worth a look, and the call is yours.
                </p>
                {flagged.length === 0 ? (
                    <p className="mt-3 font-mono text-[11px] font-bold text-slate-500">Nothing flagged.</p>
                ) : (
                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left font-mono text-[11px] font-bold">
                            <thead className="bg-slate-100 text-[10px] uppercase">
                                <tr>
                                    <th className="px-2 py-1">Roll</th>
                                    <th className="px-2 py-1">Name</th>
                                    <th className="px-2 py-1">Session</th>
                                    <th className="px-2 py-1">Flags</th>
                                    <th className="px-2 py-1">Scanned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flagged.map((row) => (
                                    <tr key={row._id} className="border-t border-slate-200">
                                        <td className="px-2 py-1">{row.rollNo}</td>
                                        <td className="px-2 py-1">{row.name}</td>
                                        <td className="px-2 py-1">{row.sessionKey || row.sessionId}</td>
                                        <td className="px-2 py-1">
                                            {(row.flags || []).map((flag) => (
                                                <span key={flag} className="mr-1 inline-block border border-slate-900 bg-amber-200 px-1 text-[10px] uppercase">
                                                    {FLAG_LABELS[flag] || flag}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-2 py-1 text-slate-600">
                                            {row.checkedInAt ? new Date(row.checkedInAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
