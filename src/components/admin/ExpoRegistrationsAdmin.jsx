import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import { EXPO_PROBLEM_STATEMENTS } from '../../data/expoProblemStatements';

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

function downloadCsv(rows) {
    const header = ['Team No', 'Team Name', 'Problem Statement', 'Captain', 'Register No', 'Phone', 'Email', 'Members', 'Submissions', 'Last Updated'];
    const lines = rows.map((r) =>
        [
            r.teamNo,
            r.teamName,
            r.problemStatementTitle,
            r.captainName,
            r.captainRollNo,
            r.captainPhone,
            r.captainEmail,
            r.members.join('; '),
            r.submissions,
            new Date(r.updatedAt).toLocaleString('en-IN')
        ]
            .map(csvCell)
            .join(',')
    );
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expo_registrations.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export default function ExpoRegistrationsAdmin() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl('/api/expo/registrations'), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || `Server HTTP ${res.status}`);
            setData(body);
        } catch (err) {
            setError(err.message || 'Could not load expo registrations');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const rows = data?.registrations || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Expo Registrations</h2>
                    <p className="text-sm text-slate-500">
                        Team captains register from the Expo page. A team that submits again replaces its earlier
                        details, up to {data?.maxSubmissions ?? 4} submissions in all; after that its entry is locked.
                        Teams are not told on the site that they can resubmit.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={load}
                        disabled={isLoading}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-black uppercase disabled:opacity-50"
                    >
                        {isLoading ? 'Loading…' : 'Refresh'}
                    </button>
                    <button
                        type="button"
                        onClick={() => downloadCsv(rows)}
                        disabled={!rows.length}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-teal-400 px-3 py-2 font-mono text-xs font-black uppercase disabled:opacity-50"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {error && (
                <p className="border-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>
            )}

            {data && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="border-2 border-slate-900 bg-teal-50 p-4">
                            <p className="font-mono text-[11px] font-black tracking-widest text-slate-600 uppercase">Registered</p>
                            <p className="text-3xl font-black text-slate-900">
                                {rows.length} <span className="text-base text-slate-500">/ {data.totalTeams}</span>
                            </p>
                        </div>
                        <div className="border-2 border-slate-900 bg-amber-50 p-4 sm:col-span-2">
                            <p className="font-mono text-[11px] font-black tracking-widest text-slate-600 uppercase">
                                Not registered yet ({data.missingTeams.length})
                            </p>
                            <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                                {data.missingTeams.length ? data.missingTeams.map((t) => `T${t}`).join(', ') : 'Every team has registered.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {EXPO_PROBLEM_STATEMENTS.map((ps) => {
                            const count = data.counts?.[ps.id] ?? 0;
                            const full = count >= data.cap;
                            return (
                                <span
                                    key={ps.id}
                                    className={`border-2 px-2 py-1 font-mono text-[11px] font-bold ${
                                        full ? 'border-slate-500 bg-slate-500 text-white' : 'border-slate-900 bg-white'
                                    }`}
                                >
                                    PS {ps.number} · {ps.title}: {count}/{data.cap}
                                    {full && ' · FULL'}
                                </span>
                            );
                        })}
                    </div>

                    <div className="overflow-x-auto border-2 border-slate-900">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-900 font-mono text-[11px] tracking-widest text-white uppercase">
                                <tr>
                                    <th className="p-2.5">Team</th>
                                    <th className="p-2.5">Problem statement</th>
                                    <th className="p-2.5">Captain</th>
                                    <th className="p-2.5">Contact</th>
                                    <th className="p-2.5">Members</th>
                                    <th className="p-2.5">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {rows.map((r) => (
                                    <tr key={r.id} className="align-top">
                                        <td className="p-2.5">
                                            <span className="font-mono font-black">T{r.teamNo}</span>
                                            <div className="font-bold">{r.teamName}</div>
                                        </td>
                                        <td className="p-2.5">{r.problemStatementTitle}</td>
                                        <td className="p-2.5">
                                            <div className="font-bold">{r.captainName}</div>
                                            <div className="font-mono text-xs text-slate-500">{r.captainRollNo}</div>
                                        </td>
                                        <td className="p-2.5 font-mono text-xs">
                                            <div>{r.captainPhone}</div>
                                            <div className="text-slate-500">{r.captainEmail}</div>
                                        </td>
                                        <td className="p-2.5 text-xs text-slate-600">{r.members.join(', ')}</td>
                                        <td className="p-2.5 text-xs text-slate-500">
                                            {new Date(r.updatedAt).toLocaleString('en-IN')}
                                            {r.submissions > 1 && (
                                                <div>
                                                    Submitted {r.submissions} of {data.maxSubmissions}
                                                </div>
                                            )}
                                            {r.submissions >= data.maxSubmissions && (
                                                <div className="mt-0.5 inline-block bg-slate-700 px-1 font-mono text-[10px] font-black text-white uppercase">
                                                    Locked
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {!rows.length && (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-slate-500">
                                            No registrations yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
