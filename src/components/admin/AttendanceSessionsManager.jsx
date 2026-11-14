import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY, useWebsiteData } from '../../context/WebsiteDataContext';

/* Create sessions, rename them, and run attendance for each one on its own.
   Everything here works by session, not by date or number: a session's QR,
   roster and live count all point at that session, and a combo session's
   software and powertrain halves each list only the students in that track. */

const TRACK_STYLE = {
    software: 'border-sky-500 bg-sky-100 text-sky-900',
    powertrain: 'border-amber-500 bg-amber-100 text-amber-900',
    combo: 'border-violet-500 bg-violet-100 text-violet-900'
};
const TYPES = [
    ['lecture', 'Core Talk'],
    ['handson', 'Hands-on Lab'],
    ['expert', 'Industry / Expert'],
    ['online', 'Online'],
    ['complimentary', 'Complimentary'],
    ['catchup', 'Catch-up (not counted)']
];
const EMPTY_FORM = {
    track: 'software',
    date: '',
    title: '',
    label: '',
    instructor: '',
    venue: '',
    type: 'lecture',
    countsForAttendance: true
};

async function call(path, options = {}) {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
    const res = await fetch(apiUrl(path), {
        ...options,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server HTTP ${res.status}`);
    return data;
}

const prettyDate = (iso) =>
    iso
        ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
          })
        : 'No date';

const refParam = (group) =>
    group.jointKey
        ? `jointKey=${encodeURIComponent(group.jointKey)}`
        : `sessionKey=${encodeURIComponent(group.sessions[0].sessionKey)}`;

export default function AttendanceSessionsManager({ showStatus }) {
    const { forceLiveRefresh } = useWebsiteData();
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [trackFilter, setTrackFilter] = useState('all');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [editing, setEditing] = useState(null); // { id, title, label, instructor, venue, date, hasAttendance }
    const [openRoster, setOpenRoster] = useState(null); // group id

    const load = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await call('/api/workshop/attendance/sessions/manage');
            setSessions(data.sessions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // A combo session's two halves are shown, renamed and run as one.
    const groups = useMemo(() => {
        const byJoint = new Map();
        const list = [];
        sessions.forEach((s) => {
            if (s.jointKey) {
                if (!byJoint.has(s.jointKey)) {
                    const group = { id: s.jointKey, jointKey: s.jointKey, track: 'combo', sessions: [] };
                    byJoint.set(s.jointKey, group);
                    list.push(group);
                }
                byJoint.get(s.jointKey).sessions.push(s);
            } else {
                list.push({ id: s.sessionKey, jointKey: null, track: s.track, sessions: [s] });
            }
        });
        return list.filter((g) => trackFilter === 'all' || g.track === trackFilter);
    }, [sessions, trackFilter]);

    const afterChange = (message) => {
        if (showStatus) showStatus(message);
        load();
        // The website schedule lives in site data; pull it now rather than on the next poll.
        if (forceLiveRefresh) forceLiveRefresh();
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const data = await call('/api/workshop/attendance/sessions/create', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            setForm(EMPTY_FORM);
            setShowCreate(false);
            afterChange(data.message);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const startEdit = (group) => {
        const s = group.sessions[0];
        setEditing({
            id: group.id,
            sessionKey: s.sessionKey,
            title: s.title,
            label: s.label,
            instructor: s.instructor,
            venue: s.venue,
            date: s.date,
            originalDate: s.date,
            hasAttendance: group.sessions.some((x) => x.present > 0)
        });
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            const body = {
                sessionKey: editing.sessionKey,
                title: editing.title,
                label: editing.label,
                instructor: editing.instructor,
                venue: editing.venue
            };
            if (editing.date !== editing.originalDate) body.date = editing.date;
            const data = await call('/api/workshop/attendance/sessions/details', {
                method: 'PATCH',
                body: JSON.stringify(body)
            });
            setEditing(null);
            afterChange(data.message);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const openProjector = (group) => {
        const param = group.jointKey
            ? `joint=${encodeURIComponent(group.jointKey)}`
            : `session=${encodeURIComponent(group.sessions[0].sessionKey)}`;
        if (
            !group.sessions.some((s) => s.isOpen) &&
            !window.confirm('Showing the QR opens this session for check-in and marks it as held. Continue?')
        )
            return;
        window.location.hash = `#attendance-projector?${param}`;
    };

    const input =
        'w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none';
    const labelCls = 'mb-1 block text-[10px] font-black text-slate-700 uppercase';

    return (
        <div className="space-y-4">
            <div className="shadow-brutal-3 flex flex-col justify-between gap-3 border-2 border-slate-900 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div>
                    <span className="block text-[10px] font-black tracking-wider text-sky-700 uppercase">
                        // Sessions on the schedule
                    </span>
                    <p className="mt-1 text-xs text-slate-600">
                        Create or rename sessions here and the website schedule updates too. Each session has
                        its own QR.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={trackFilter}
                        onChange={(e) => setTrackFilter(e.target.value)}
                        className="border-2 border-slate-900 bg-white px-2 py-1 text-xs font-black uppercase"
                    >
                        <option value="all">All tracks</option>
                        <option value="software">Software</option>
                        <option value="powertrain">Powertrain</option>
                        <option value="combo">Combo</option>
                    </select>
                    <button
                        type="button"
                        onClick={load}
                        disabled={isLoading}
                        className="press cursor-pointer border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black uppercase hover:bg-slate-100"
                    >
                        {isLoading ? '⟳ Loading…' : '⟳ Refresh'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreate((v) => !v)}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950 uppercase hover:bg-emerald-300"
                    >
                        {showCreate ? '✕ Cancel' : '＋ New Session'}
                    </button>
                </div>
            </div>

            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className="shadow-brutal-3 space-y-3 border-2 border-slate-900 bg-white p-4"
                >
                    <span className="block text-[10px] font-black tracking-wider text-emerald-700 uppercase">
                        // New session
                    </span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                            <label className={labelCls}>Track</label>
                            <select
                                value={form.track}
                                onChange={(e) => setForm({ ...form, track: e.target.value })}
                                className={input}
                            >
                                <option value="software">Software only</option>
                                <option value="powertrain">Powertrain only</option>
                                <option value="combo">Combo (both tracks)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Date (IST)</label>
                            <input
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className={input}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Label</label>
                            <input
                                type="text"
                                value={form.label}
                                onChange={(e) => setForm({ ...form, label: e.target.value })}
                                placeholder="e.g. Session 9 or Industry Session"
                                className={input}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Type</label>
                            <select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className={input}
                            >
                                {TYPES.map(([value, name]) => (
                                    <option key={value} value={value}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Session name</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Basic Dev Tools"
                                className={input}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Conducted by</label>
                            <input
                                type="text"
                                value={form.instructor}
                                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                                className={input}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Venue</label>
                            <input
                                type="text"
                                value={form.venue}
                                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                className={input}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.countsForAttendance}
                                onChange={(e) => setForm({ ...form, countsForAttendance: e.target.checked })}
                            />
                            Counts toward the attendance %
                        </label>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-900 px-4 py-1.5 text-xs font-black text-white uppercase hover:bg-slate-700 disabled:opacity-50"
                        >
                            {isSaving ? 'Creating…' : 'Create Session'}
                        </button>
                    </div>
                    {form.track === 'combo' && (
                        <p className="text-[11px] text-slate-500">
                            Creates the session on both schedules with one QR. Software students are marked
                            under Software, powertrain students under Powertrain, and combo students under
                            both.
                        </p>
                    )}
                </form>
            )}

            {error && (
                <div className="border-2 border-rose-600 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                    ⚠️ {error}
                </div>
            )}

            <div className="shadow-brutal-4 overflow-x-auto border-2 border-slate-900 bg-white">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="bg-slate-900 text-[10px] text-white uppercase">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Track</th>
                            <th className="p-2.5">Session</th>
                            <th className="p-2.5 text-center">Present</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {groups.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-6 text-center font-bold text-slate-500">
                                    {isLoading ? 'Loading sessions…' : 'No sessions to show.'}
                                </td>
                            </tr>
                        )}
                        {groups.map((group) => {
                            const s = group.sessions[0];
                            const isEditing = editing?.id === group.id;
                            const anyOpen = group.sessions.some((x) => x.isOpen);
                            return [
                                <tr
                                    key={group.id}
                                    className={s.countsForAttendance ? '' : 'bg-slate-50 text-slate-500'}
                                >
                                    <td className="p-2.5 font-bold whitespace-nowrap">
                                        {prettyDate(s.date)}
                                    </td>
                                    <td className="p-2.5">
                                        <span
                                            className={`border px-1.5 py-0.5 text-[9px] font-black uppercase ${TRACK_STYLE[group.track]}`}
                                        >
                                            {group.track}
                                        </span>
                                    </td>
                                    <td className="p-2.5">
                                        {isEditing ? (
                                            <div className="grid min-w-[260px] grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                <input
                                                    className={`${input} sm:col-span-2`}
                                                    value={editing.title}
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, title: e.target.value })
                                                    }
                                                    placeholder="Session name"
                                                />
                                                <input
                                                    className={input}
                                                    value={editing.label}
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, label: e.target.value })
                                                    }
                                                    placeholder="Label"
                                                />
                                                <input
                                                    type="date"
                                                    className={input}
                                                    value={editing.date || ''}
                                                    disabled={editing.hasAttendance}
                                                    title={
                                                        editing.hasAttendance
                                                            ? 'This session has attendance, so its date is fixed.'
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, date: e.target.value })
                                                    }
                                                />
                                                <input
                                                    className={input}
                                                    value={editing.instructor}
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, instructor: e.target.value })
                                                    }
                                                    placeholder="Conducted by"
                                                />
                                                <input
                                                    className={input}
                                                    value={editing.venue}
                                                    onChange={(e) =>
                                                        setEditing({ ...editing, venue: e.target.value })
                                                    }
                                                    placeholder="Venue"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-black text-slate-900">{s.title}</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {s.label}
                                                    {s.instructor ? ` · ${s.instructor}` : ''}
                                                    {s.countsForAttendance ? '' : ' · not counted'}
                                                    {s.onSchedule ? '' : ' · not on website schedule'}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2.5 text-center font-black whitespace-nowrap">
                                        {group.sessions.map((x) => (
                                            <div key={x.sessionKey}>
                                                {group.sessions.length > 1
                                                    ? `${x.track.slice(0, 2).toUpperCase()} `
                                                    : ''}
                                                {x.present}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="p-2.5 text-center">
                                        <span
                                            className={`border px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                                anyOpen
                                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                                                    : s.status === 'conducted'
                                                      ? 'border-slate-400 bg-slate-100 text-slate-700'
                                                      : 'border-sky-300 bg-sky-50 text-sky-800'
                                            }`}
                                        >
                                            {anyOpen ? 'Open' : s.status}
                                        </span>
                                    </td>
                                    <td className="p-2.5">
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={isSaving}
                                                        onClick={handleSaveEdit}
                                                        className="press cursor-pointer border border-slate-900 bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase"
                                                    >
                                                        {isSaving ? 'Saving…' : 'Save'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditing(null)}
                                                        className="press cursor-pointer border border-slate-900 bg-white px-2 py-1 text-[10px] font-black uppercase"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(group)}
                                                        className="press cursor-pointer border border-slate-900 bg-white px-2 py-1 text-[10px] font-black uppercase hover:bg-slate-100"
                                                    >
                                                        ✎ Rename
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenRoster(
                                                                openRoster === group.id ? null : group.id
                                                            )
                                                        }
                                                        className="press cursor-pointer border border-slate-900 bg-sky-200 px-2 py-1 text-[10px] font-black uppercase hover:bg-sky-300"
                                                    >
                                                        {openRoster === group.id
                                                            ? 'Hide Roster'
                                                            : '📋 Roster'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openProjector(group)}
                                                        className="press cursor-pointer border border-slate-900 bg-amber-400 px-2 py-1 text-[10px] font-black uppercase hover:bg-amber-300"
                                                    >
                                                        🖥 QR
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>,
                                openRoster === group.id && (
                                    <tr key={`${group.id}-roster`}>
                                        <td colSpan="6" className="bg-slate-50 p-3">
                                            <SessionRoster
                                                group={group}
                                                showStatus={showStatus}
                                                onChanged={load}
                                            />
                                        </td>
                                    </tr>
                                )
                            ];
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* Present/absent lists for one session, one list per track for a combo. */
function SessionRoster({ group, showStatus, onChanged }) {
    const [lists, setLists] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [busy, setBusy] = useState('');

    const load = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await call(`/api/workshop/attendance/sessions/roster?${refParam(group)}`);
            setLists(data.sessions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [group]);

    useEffect(() => {
        load();
    }, [load]);

    const mark = async (list, cand) => {
        const reason = window.prompt(
            `Why is ${cand.rollNo} being marked present for ${list.track}?\n(Recorded against your name.)`
        );
        if (reason === null) return;
        if (reason.trim().length < 3) {
            alert('A reason is required for a manual attendance mark.');
            return;
        }
        setBusy(`${list.sessionKey}|${cand.rollNo}`);
        try {
            const data = await call('/api/workshop/attendance/sessions/manual-mark', {
                method: 'POST',
                body: JSON.stringify({
                    sessionKey: list.sessionKey,
                    rollNo: cand.rollNo,
                    reason: reason.trim()
                })
            });
            if (showStatus) showStatus(data.message);
            load();
            onChanged();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy('');
        }
    };

    const exportCsv = (list) => {
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [
            [
                'S.No',
                'Roll Number',
                'Name',
                'Department',
                'Year',
                'Package',
                'Receipt No',
                'Status',
                'Check-in Time (IST)',
                'Verified By'
            ].join(',')
        ];
        list.roster.forEach((c, i) => {
            lines.push(
                [
                    i + 1,
                    esc(c.rollNo),
                    esc(c.name),
                    esc(c.department),
                    esc(c.year),
                    esc(c.package),
                    esc(c.receiptNo),
                    c.isPresent ? 'PRESENT' : 'ABSENT',
                    esc(
                        c.checkedInAt
                            ? new Date(c.checkedInAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                            : '—'
                    ),
                    esc(c.verifiedBy || '—')
                ].join(',')
            );
        });
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${list.track}-${list.date}-${list.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    if (error)
        return (
            <div className="border-2 border-rose-600 bg-rose-50 p-2 text-xs font-bold text-rose-800">
                ⚠️ {error}
            </div>
        );
    if (isLoading && lists.length === 0)
        return <div className="p-3 text-xs font-bold text-slate-500">Loading roster…</div>;

    const q = query.trim().toLowerCase();
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {['all', 'present', 'absent'].map((f) => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`cursor-pointer border border-slate-900 px-2.5 py-1 text-[10px] font-black uppercase ${
                            filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                        }`}
                    >
                        {f}
                    </button>
                ))}
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search roll, name, dept…"
                    className="w-full max-w-xs border-2 border-slate-900 px-2 py-1 text-xs focus:outline-none"
                />
                <button
                    type="button"
                    onClick={load}
                    className="cursor-pointer border border-slate-900 bg-white px-2.5 py-1 text-[10px] font-black uppercase"
                >
                    ⟳
                </button>
            </div>
            <div className={`grid gap-3 ${lists.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                {lists.map((list) => {
                    const rows = list.roster.filter(
                        (c) =>
                            (filter === 'all' || (filter === 'present') === c.isPresent) &&
                            (!q ||
                                [c.rollNo, c.name, c.department, c.receiptNo].some((v) =>
                                    String(v || '')
                                        .toLowerCase()
                                        .includes(q)
                                ))
                    );
                    return (
                        <div key={list.sessionKey} className="border-2 border-slate-900 bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-900 p-2">
                                <span
                                    className={`border px-1.5 py-0.5 text-[10px] font-black uppercase ${TRACK_STYLE[list.track]}`}
                                >
                                    {list.track}
                                </span>
                                <span className="text-xs font-black">
                                    {list.totalPresent} present / {list.totalEligible} enrolled
                                </span>
                                <button
                                    type="button"
                                    onClick={() => exportCsv(list)}
                                    className="cursor-pointer border border-slate-900 bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase"
                                >
                                    📥 CSV
                                </button>
                            </div>
                            <div className="max-h-[420px] overflow-y-auto">
                                <table className="w-full text-left text-[11px]">
                                    <tbody className="divide-y divide-slate-100">
                                        {rows.map((c) => (
                                            <tr
                                                key={c.rollNo}
                                                className={c.isPresent ? 'bg-emerald-50/40' : ''}
                                            >
                                                <td className="p-1.5 font-black">{c.rollNo}</td>
                                                <td className="p-1.5">
                                                    <div className="font-bold">{c.name}</div>
                                                    <div className="text-[9px] text-slate-500">
                                                        {c.department} · {c.package}
                                                    </div>
                                                </td>
                                                <td className="p-1.5 text-right whitespace-nowrap">
                                                    {c.isPresent ? (
                                                        <span className="text-[10px] font-black text-emerald-700">
                                                            ✓{' '}
                                                            {c.checkedInAt
                                                                ? new Date(c.checkedInAt).toLocaleTimeString(
                                                                      'en-IN',
                                                                      { hour: '2-digit', minute: '2-digit' }
                                                                  )
                                                                : ''}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                busy === `${list.sessionKey}|${c.rollNo}`
                                                            }
                                                            onClick={() => mark(list, c)}
                                                            className="cursor-pointer border border-slate-900 bg-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase disabled:opacity-50"
                                                        >
                                                            Mark ✓
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {rows.length === 0 && (
                                            <tr>
                                                <td className="p-3 text-center text-slate-500" colSpan="3">
                                                    Nobody matches.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
