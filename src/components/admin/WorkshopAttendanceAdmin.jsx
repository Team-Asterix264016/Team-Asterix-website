import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

export default function WorkshopAttendanceAdmin({ showStatus, onOpenProjector }) {
    const [track, setTrack] = useState('software');
    const [sessionNumber, setSessionNumber] = useState(1);
    const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [sessionTopic, setSessionTopic] = useState('');

    const [rosterData, setRosterData] = useState({ totalEligible: 0, totalPresent: 0, roster: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'present' | 'absent'
    const [searchQuery, setSearchQuery] = useState('');
    const [actionBusyRoll, setActionBusyRoll] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const sessionId = `${track}-s${String(sessionNumber).padStart(2, '0')}-${sessionDate}`;

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) {
                setError('Authorization missing. Please sign in again.');
                return;
            }

            const res = await fetch(apiUrl(`/api/workshop/attendance/records?sessionId=${encodeURIComponent(sessionId)}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Server HTTP ${res.status}`);
            }

            const data = await res.json();
            setRosterData(data);
        } catch (err) {
            console.error('Error fetching attendance roster:', err);
            setError(err.message || 'Could not load attendance roster');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Manual Mark Present handler
    const handleManualMark = async (rollNo) => {
        setActionBusyRoll(rollNo);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl('/api/workshop/attendance/manual-mark'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rollNo,
                    sessionId,
                    sessionTopic
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to mark candidate present');

            if (showStatus) showStatus(data.message || `✓ Marked ${rollNo} present`);
            fetchRecords();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionBusyRoll(null);
        }
    };

    // CSV Export handler
    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/attendance/export?sessionId=${encodeURIComponent(sessionId)}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to generate attendance CSV');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-${sessionId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (showStatus) showStatus('Attendance CSV exported successfully! 📥');
        } catch (err) {
            alert('Export failed: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    // Filtered roster
    const filteredRoster = useMemo(() => {
        let list = rosterData.roster || [];

        if (filterStatus === 'present') list = list.filter(c => c.isPresent);
        if (filterStatus === 'absent') list = list.filter(c => !c.isPresent);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c =>
                c.rollNo?.toLowerCase().includes(q) ||
                c.name?.toLowerCase().includes(q) ||
                c.department?.toLowerCase().includes(q) ||
                c.receiptNo?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [rosterData.roster, filterStatus, searchQuery]);

    const absentCount = (rosterData.totalEligible || 0) - (rosterData.totalPresent || 0);
    const attendancePct = rosterData.totalEligible > 0
        ? (((rosterData.totalPresent || 0) / rosterData.totalEligible) * 100).toFixed(1)
        : 0;

    return (
        <div className="space-y-6 font-mono text-slate-900">
            {/* Header with Projector Button & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 leading-tight">
                            Workshop Session Attendance
                        </h2>
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-400 text-[10px] font-bold uppercase tracking-wider">
                            Live Scanner Engine
                        </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                        Dynamic rotating QR code, live tracking, and verified check-in.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onOpenProjector && (
                        <button
                            type="button"
                            onClick={() => onOpenProjector(track)}
                            className="press px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 text-slate-950 font-black text-xs uppercase shadow-brutal-2 cursor-pointer flex items-center gap-1.5"
                        >
                            <span>🖥</span>
                            <span>Open Projector Mode ↗</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={isExporting || rosterData.totalEligible === 0}
                        className="press px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 text-slate-950 font-black text-xs uppercase shadow-brutal-2 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <span>📥</span>
                        <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={fetchRecords}
                        disabled={isLoading}
                        className="press px-3.5 py-1.5 bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 font-black text-xs uppercase shadow-brutal-2 cursor-pointer"
                    >
                        {isLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
                    </button>
                </div>
            </div>

            {/* Session Settings & Selector Bar */}
            <div className="p-4 bg-slate-50 border-2 border-slate-900 shadow-brutal-3 space-y-3">
                <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider block">
                    // Attendance Session Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Track Selection */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                            Workshop Track
                        </label>
                        <select
                            value={track}
                            onChange={(e) => setTrack(e.target.value)}
                            className="w-full px-2.5 py-1.5 border-2 border-slate-900 bg-white font-bold text-xs focus:outline-none"
                        >
                            <option value="software">Software & Perception</option>
                            <option value="powertrain">Electronics & Powertrain</option>
                        </select>
                    </div>

                    {/* Session Number */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                            Session Number
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={sessionNumber}
                            onChange={(e) => setSessionNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full px-2.5 py-1.5 border-2 border-slate-900 bg-white font-bold text-xs focus:outline-none"
                        />
                    </div>

                    {/* Session Date */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                            Session Date (IST)
                        </label>
                        <input
                            type="date"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 border-2 border-slate-900 bg-white font-bold text-xs focus:outline-none"
                        />
                    </div>

                    {/* Topic (Optional) */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                            Session Topic (Optional)
                        </label>
                        <input
                            type="text"
                            value={sessionTopic}
                            onChange={(e) => setSessionTopic(e.target.value)}
                            placeholder="e.g. ROS Publisher Nodes"
                            className="w-full px-2.5 py-1.5 border-2 border-slate-900 bg-white font-bold text-xs focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Active Session Key: <strong className="text-slate-900">{sessionId}</strong></span>
                    <span className="text-[10px] text-sky-700 font-bold">Only paid candidates enrolled in {track.toUpperCase()} can check in</span>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-emerald-50 border-2 border-slate-900 shadow-brutal-3">
                    <span className="text-[10px] font-black text-emerald-800 uppercase block truncate">Present In Class</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700">{rosterData.totalPresent}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">Verified attendees</span>
                </div>

                <div className="p-3.5 bg-rose-50 border-2 border-slate-900 shadow-brutal-3">
                    <span className="text-[10px] font-black text-rose-800 uppercase block truncate">Absent / Pending</span>
                    <span className="text-2xl sm:text-3xl font-black text-rose-700">{absentCount}</span>
                    <span className="text-[10px] text-rose-600 block mt-0.5">Awaiting check-in</span>
                </div>

                <div className="p-3.5 bg-sky-50 border-2 border-slate-900 shadow-brutal-3">
                    <span className="text-[10px] font-black text-sky-800 uppercase block truncate">Total Eligible</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">{rosterData.totalEligible}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Paid candidates in track</span>
                </div>

                <div className="p-3.5 bg-amber-50 border-2 border-slate-900 shadow-brutal-3">
                    <span className="text-[10px] font-black text-amber-800 uppercase block truncate">Attendance Rate</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-800">{attendancePct}%</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Quorum achieved</span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3 bg-rose-50 border-2 border-rose-600 text-rose-800 font-mono text-xs font-bold">
                    ⚠️ {error}
                </div>
            )}

            {/* Roster Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border-2 border-slate-900 shadow-brutal-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Filter:</span>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('all')}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase border border-slate-900 cursor-pointer ${
                            filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        All ({rosterData.roster?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('present')}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase border border-slate-900 cursor-pointer ${
                            filterStatus === 'present' ? 'bg-emerald-500 text-slate-950' : 'bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        Present ({rosterData.totalPresent || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('absent')}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase border border-slate-900 cursor-pointer ${
                            filterStatus === 'absent' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        Absent ({absentCount || 0})
                    </button>
                </div>

                <div className="relative max-w-xs w-full">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search roll, name, dept..."
                        className="w-full px-2.5 py-1 border-2 border-slate-900 text-xs font-mono focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1 text-xs text-slate-600 hover:text-slate-900"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Roster Table */}
            <div className="border-2 border-slate-900 bg-white shadow-brutal-4 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                            <th className="p-2.5 border-r border-slate-700">Roll No</th>
                            <th className="p-2.5 border-r border-slate-700">Name</th>
                            <th className="p-2.5 border-r border-slate-700">Department</th>
                            <th className="p-2.5 border-r border-slate-700">Package</th>
                            <th className="p-2.5 border-r border-slate-700 text-center">Status</th>
                            <th className="p-2.5 border-r border-slate-700">Check-in Time</th>
                            <th className="p-2.5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">
                                    <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin inline-block mr-2 align-middle"></span>
                                    Loading attendance roster...
                                </td>
                            </tr>
                        ) : filteredRoster.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-500 font-bold">
                                    No candidates found matching the selected filter.
                                </td>
                            </tr>
                        ) : (
                            filteredRoster.map((cand) => {
                                const isBusy = actionBusyRoll === cand.rollNo;

                                return (
                                    <tr
                                        key={cand.rollNo}
                                        className={`hover:bg-slate-50 transition-colors ${
                                            cand.isPresent ? 'bg-emerald-50/30' : ''
                                        }`}
                                    >
                                        <td className="p-2.5 font-black text-slate-900 font-mono border-r border-slate-200">
                                            {cand.rollNo}
                                        </td>
                                        <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                                            <div>{cand.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{cand.email}</div>
                                        </td>
                                        <td className="p-2.5 text-slate-700 border-r border-slate-200">
                                            <div>{cand.department}</div>
                                            <div className="text-[10px] text-slate-500">Year {cand.year}</div>
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200">
                                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase border border-slate-900 bg-slate-100">
                                                {cand.package}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-center border-r border-slate-200">
                                            {cand.isPresent ? (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-500 font-black text-[10px] uppercase">
                                                    ✓ Present
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[10px] uppercase">
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2.5 text-slate-600 font-mono text-[11px] border-r border-slate-200">
                                            {cand.checkedInAt ? (
                                                <div>
                                                    <span className="font-bold text-slate-900">
                                                        {new Date(cand.checkedInAt).toLocaleTimeString('en-IN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                            hour12: true
                                                        })}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 block">
                                                        via {cand.verifiedBy}
                                                    </span>
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="p-2.5 text-right">
                                            {!cand.isPresent ? (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleManualMark(cand.rollNo)}
                                                    className="press px-2 py-1 bg-amber-300 hover:bg-amber-400 border border-slate-900 text-slate-950 font-black text-[10px] uppercase shadow-brutal-1 cursor-pointer disabled:opacity-50"
                                                    title="Mark present manually if student phone has issue"
                                                >
                                                    {isBusy ? 'Saving...' : 'Mark Present ✓'}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-emerald-700 font-bold">
                                                    Recorded
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
