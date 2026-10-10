import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminGet } from './adminRequest';

const SEGMENTS = [
    { id: 'all', label: 'All' },
    { id: 'participant', label: 'Logged-in participants' },
    { id: 'subscriber', label: 'Subscribers' },
    { id: 'both', label: 'Both' }
];

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Quote every cell, and defuse values a spreadsheet would run as a formula.
function csvCell(value) {
    let text = value == null ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function matchesSegment(contact, segment) {
    const p = contact.segments.includes('participant');
    const s = contact.segments.includes('subscriber');
    if (segment === 'participant') return p;
    if (segment === 'subscriber') return s;
    if (segment === 'both') return p && s;
    return true;
}

// Read-only audience list: logged-in workshop participants plus newsletter subscribers.
export default function MailClusterAdmin({ showStatus }) {
    const [state, setState] = useState({ status: 'loading', contacts: [], counts: null, error: '' });
    const [segment, setSegment] = useState('all');
    const [query, setQuery] = useState('');
    const [manualCopy, setManualCopy] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await adminGet('/api/community/admin/mail-cluster');
            setState({ status: 'ready', contacts: data.contacts || [], counts: data.counts, error: '' });
        } catch (err) {
            setState({ status: 'error', contacts: [], counts: null, error: err.message });
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const reload = () => {
        setState((prev) => ({ ...prev, status: 'loading' }));
        load();
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return state.contacts.filter(
            (c) =>
                matchesSegment(c, segment) &&
                (!q || [c.email, c.name, c.department].some((v) => String(v || '').toLowerCase().includes(q)))
        );
    }, [state.contacts, segment, query]);

    const copyEmails = async () => {
        const list = visible.map((c) => c.email).join(', ');
        try {
            await navigator.clipboard.writeText(list);
            setManualCopy('');
            showStatus?.(`Copied ${visible.length} email${visible.length === 1 ? '' : 's'}. Paste them into BCC.`);
        } catch {
            setManualCopy(list);
        }
    };

    const exportCsv = () => {
        const header = ['Email', 'Name', 'Department', 'Year', 'Segments', 'Last login', 'Login count', 'Subscribed', 'Source'];
        const rows = visible.map((c) =>
            [
                c.email,
                c.name,
                c.department,
                c.year,
                c.segments.join(' + '),
                c.lastLoginAt || '',
                c.loginCount || 0,
                c.subscribedAt || '',
                c.source || ''
            ]
                .map(csvCell)
                .join(',')
        );
        const blob = new Blob([[header.map(csvCell).join(','), ...rows].join('\n')], {
            type: 'text/csv;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `asterix_mail_cluster_${segment}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showStatus?.(`Exported ${visible.length} contact${visible.length === 1 ? '' : 's'}.`);
    };

    const counts = state.counts || { total: 0, participants: 0, subscribers: 0, both: 0 };
    const tiles = [
        { label: 'Unique emails', value: counts.total },
        { label: 'Logged-in participants', value: counts.participants },
        { label: 'Subscribers', value: counts.subscribers },
        { label: 'Both', value: counts.both }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div>
                    <h2 className="flex flex-wrap items-center gap-2 text-2xl font-black text-slate-900 uppercase">
                        Mail Cluster
                        <span className="border border-slate-900 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black text-slate-700">
                            READ-ONLY
                        </span>
                    </h2>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        Everyone who has logged in to a workshop profile, plus newsletter subscribers.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={reload}
                    className="press press-flat cursor-pointer border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold hover:bg-slate-200"
                >
                    ↻ Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {tiles.map((tile) => (
                    <div key={tile.label} className="shadow-brutal-2 border-2 border-slate-900 bg-white p-3">
                        <span className="block font-mono text-[10px] font-black text-slate-500 uppercase">
                            {tile.label}
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                            {state.status === 'ready' ? tile.value : '—'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="space-y-3 border-2 border-slate-900 bg-violet-50 p-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Segment">
                    {SEGMENTS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            aria-pressed={segment === s.id}
                            onClick={() => setSegment(s.id)}
                            className={`press press-flat cursor-pointer border-2 px-2.5 py-1 font-mono text-[11px] font-black uppercase ${
                                segment === s.id
                                    ? 'border-slate-900 bg-violet-400 text-slate-950'
                                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search email, name or department"
                        aria-label="Search contacts"
                        className="min-w-0 flex-1 border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={copyEmails}
                            disabled={visible.length === 0}
                            className="press shadow-brutal-2 flex-1 cursor-pointer border-2 border-slate-900 bg-violet-300 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-200 disabled:opacity-50 sm:flex-none"
                        >
                            Copy {visible.length} emails
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            disabled={visible.length === 0}
                            className="press shadow-brutal-2 flex-1 cursor-pointer border-2 border-slate-900 bg-sky-500 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-400 disabled:opacity-50 sm:flex-none"
                        >
                            Export CSV ↓
                        </button>
                    </div>
                </div>
                <p className="font-mono text-[10px] font-bold text-slate-600">
                    Paste copied addresses into BCC, never To or CC, so recipients cannot see each other.
                </p>
                {manualCopy && (
                    <div>
                        <label className="block font-mono text-[10px] font-black text-slate-700 uppercase">
                            Clipboard blocked. Select and copy:
                        </label>
                        <textarea
                            readOnly
                            value={manualCopy}
                            onFocus={(e) => e.target.select()}
                            rows={3}
                            className="mt-1 w-full border-2 border-slate-900 bg-white p-2 font-mono text-[11px]"
                        />
                    </div>
                )}
            </div>

            {state.status === 'loading' && (
                <div className="p-8 text-center font-mono text-sm text-slate-500">Building the mail cluster…</div>
            )}

            {state.status === 'error' && (
                <div className="border-2 border-rose-600 bg-rose-50 p-4 font-mono text-xs font-bold text-rose-800">
                    ⚠️ {state.error}
                </div>
            )}

            {state.status === 'ready' && visible.length === 0 && (
                <div className="border-2 border-dashed border-slate-300 p-8 text-center font-mono text-xs text-slate-500">
                    {state.contacts.length === 0
                        ? 'No logged-in participants or subscribers yet.'
                        : 'No contacts match this filter.'}
                </div>
            )}

            {state.status === 'ready' && visible.length > 0 && (
                <div className="overflow-x-auto border-2 border-slate-900">
                    <table className="w-full min-w-[680px] text-left font-mono text-xs">
                        <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                            <tr>
                                <th className="p-2.5">Email</th>
                                <th className="p-2.5">Name</th>
                                <th className="p-2.5">Segments</th>
                                <th className="p-2.5">Last login</th>
                                <th className="p-2.5">Subscribed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {visible.map((c) => (
                                <tr key={c.email} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold break-all text-slate-900">{c.email}</td>
                                    <td className="p-2.5 text-slate-700">
                                        {c.name || '—'}
                                        {c.department && (
                                            <span className="block text-[10px] text-slate-500">
                                                {c.department}
                                                {c.year ? ` · Year ${c.year}` : ''}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2.5">
                                        <span className="flex flex-wrap gap-1">
                                            {c.segments.includes('participant') && (
                                                <span className="border border-amber-600 bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900 uppercase">
                                                    Participant
                                                </span>
                                            )}
                                            {c.segments.includes('subscriber') && (
                                                <span className="border border-violet-600 bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-900 uppercase">
                                                    Subscriber
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="p-2.5 text-slate-600">
                                        {formatDate(c.lastLoginAt)}
                                        {c.loginCount > 0 && (
                                            <span className="block text-[10px] text-slate-400">
                                                {c.loginCount} login{c.loginCount === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2.5 text-slate-600">
                                        {formatDate(c.subscribedAt)}
                                        {c.source && (
                                            <span className="block text-[10px] text-slate-400">via {c.source}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
