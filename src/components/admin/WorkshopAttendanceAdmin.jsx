import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import BarcodeAttendanceAdmin from './BarcodeAttendanceAdmin';

export default function WorkshopAttendanceAdmin({ showStatus, onOpenProjector }) {
    const [viewMode, setViewMode] = useState('roster'); // 'roster' | 'barcode'
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
    const [locationStatus, setLocationStatus] = useState('idle');

    const handleSetAdminLocation = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        setLocationStatus('acquiring');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
                    const res = await fetch(apiUrl('/api/workshop/attendance/session-location'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            track,
                            sessionNumber,
                            sessionDate,
                            sessionTopic,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to save location');

                    setLocationStatus('saved');
                    if (showStatus) showStatus('✓ Session GPS location saved! Students within 50m can check in.');
                } catch (err) {
                    alert('Error saving GPS location: ' + err.message);
                    setLocationStatus('error');
                }
            },
            (err) => {
                alert('GPS location acquisition error: ' + err.message);
                setLocationStatus('error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

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

            const res = await fetch(
                apiUrl(`/api/workshop/attendance/records?sessionId=${encodeURIComponent(sessionId)}`),
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

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
                    Authorization: `Bearer ${token}`
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
            const res = await fetch(
                apiUrl(`/api/workshop/attendance/export?sessionId=${encodeURIComponent(sessionId)}`),
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

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

        if (filterStatus === 'present') list = list.filter((c) => c.isPresent);
        if (filterStatus === 'absent') list = list.filter((c) => !c.isPresent);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (c) =>
                    c.rollNo?.toLowerCase().includes(q) ||
                    c.name?.toLowerCase().includes(q) ||
                    c.department?.toLowerCase().includes(q) ||
                    c.receiptNo?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [rosterData.roster, filterStatus, searchQuery]);

    const absentCount = (rosterData.totalEligible || 0) - (rosterData.totalPresent || 0);
    const attendancePct =
        rosterData.totalEligible > 0
            ? (((rosterData.totalPresent || 0) / rosterData.totalEligible) * 100).toFixed(1)
            : 0;

    return (
        <div className="space-y-6 font-mono text-slate-900">
            {/* Header with Projector Button & Export */}
            <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl leading-tight font-black text-slate-900 uppercase sm:text-2xl">
                            Workshop Session Attendance
                        </h2>
                        <span className="border border-sky-400 bg-sky-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-sky-800 uppercase">
                            Live Scanner Engine
                        </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        Live tracking and verified check-in.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onOpenProjector && (
                        <button
                            type="button"
                            onClick={() => onOpenProjector(track)}
                            className="press shadow-brutal-2 flex cursor-pointer items-center gap-1.5 border-2 border-slate-900 bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 uppercase hover:bg-amber-300"
                        >
                            <span>🖥</span>
                            <span>Open Projector Mode ↗</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={isExporting || rosterData.totalEligible === 0}
                        className="press shadow-brutal-2 flex cursor-pointer items-center gap-1.5 border-2 border-slate-900 bg-emerald-400 px-3.5 py-1.5 text-xs font-black text-slate-950 uppercase hover:bg-emerald-300 disabled:opacity-50"
                    >
                        <span>📥</span>
                        <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={fetchRecords}
                        disabled={isLoading}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                    >
                        {isLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
                    </button>
                </div>
            </div>

            {/* View Mode Selector Tabs */}
            <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1">
                <button
                    type="button"
                    onClick={() => setViewMode('roster')}
                    className={`press cursor-pointer border-2 border-slate-900 px-4 py-2 text-xs font-black uppercase transition-all ${
                        viewMode === 'roster'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                >
                    📋 Attendance Roster & Overrides
                </button>
                <button
                    type="button"
                    onClick={() => setViewMode('barcode')}
                    className={`press cursor-pointer border-2 border-slate-900 px-4 py-2 text-xs font-black uppercase transition-all ${
                        viewMode === 'barcode'
                            ? 'bg-sky-500 text-slate-950 shadow-md'
                            : 'bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                >
                    ⚡ Barcode Scanner Mode (College Register No)
                </button>
            </div>

            {viewMode === 'barcode' ? (
                <BarcodeAttendanceAdmin showStatus={showStatus} />
            ) : (
                <>
                    {/* Session Settings & Selector Bar */}
                    <div className="shadow-brutal-3 space-y-3 border-2 border-slate-900 bg-slate-50 p-4">
                <span className="block text-[10px] font-black tracking-wider text-sky-700 uppercase">
                    // Attendance Session Configuration
                </span>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {/* Track Selection */}
                    <div>
                        <label className="mb-1 block text-[10px] font-black text-slate-700 uppercase">
                            Workshop Track
                        </label>
                        <select
                            value={track}
                            onChange={(e) => setTrack(e.target.value)}
                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        >
                            <option value="software">Software & Perception</option>
                            <option value="powertrain">Electronics & Powertrain</option>
                        </select>
                    </div>

                    {/* Session Number */}
                    <div>
                        <label className="mb-1 block text-[10px] font-black text-slate-700 uppercase">
                            Session Number
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={sessionNumber}
                            onChange={(e) => setSessionNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        />
                    </div>

                    {/* Session Date */}
                    <div>
                        <label className="mb-1 block text-[10px] font-black text-slate-700 uppercase">
                            Session Date (IST)
                        </label>
                        <input
                            type="date"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        />
                    </div>

                    {/* Topic (Optional) */}
                    <div>
                        <label className="mb-1 block text-[10px] font-black text-slate-700 uppercase">
                            Session Topic (Optional)
                        </label>
                        <input
                            type="text"
                            value={sessionTopic}
                            onChange={(e) => setSessionTopic(e.target.value)}
                            placeholder="e.g. ROS Publisher Nodes"
                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-500">
                    <span>
                        Active Session Key: <strong className="text-slate-900">{sessionId}</strong>
                    </span>

                    <button
                        type="button"
                        onClick={handleSetAdminLocation}
                        className="press shadow-brutal-1 flex cursor-pointer items-center gap-1 border-2 border-slate-900 bg-sky-300 px-3 py-1 text-[11px] font-black text-slate-950 uppercase hover:bg-sky-400"
                        title="Acquire admin browser GPS coordinates to enforce 50m distance check"
                    >
                        <span>📍</span>
                        <span>{locationStatus === 'acquiring' ? 'Acquiring GPS...' : locationStatus === 'saved' ? 'Update GPS Location ✓' : 'Set Session GPS Location 📍'}</span>
                    </button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="shadow-brutal-3 border-2 border-slate-900 bg-emerald-50 p-3.5">
                    <span className="block truncate text-[10px] font-black text-emerald-800 uppercase">
                        Present In Class
                    </span>
                    <span className="text-2xl font-black text-emerald-700 sm:text-3xl">
                        {rosterData.totalPresent}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-emerald-600">Verified attendees</span>
                </div>

                <div className="shadow-brutal-3 border-2 border-slate-900 bg-rose-50 p-3.5">
                    <span className="block truncate text-[10px] font-black text-rose-800 uppercase">
                        Absent / Pending
                    </span>
                    <span className="text-2xl font-black text-rose-700 sm:text-3xl">{absentCount}</span>
                    <span className="mt-0.5 block text-[10px] text-rose-600">Awaiting check-in</span>
                </div>

                <div className="shadow-brutal-3 border-2 border-slate-900 bg-sky-50 p-3.5">
                    <span className="block truncate text-[10px] font-black text-sky-800 uppercase">
                        Total Eligible
                    </span>
                    <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                        {rosterData.totalEligible}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">Paid candidates in track</span>
                </div>

                <div className="shadow-brutal-3 border-2 border-slate-900 bg-amber-50 p-3.5">
                    <span className="block truncate text-[10px] font-black text-amber-800 uppercase">
                        Attendance Rate
                    </span>
                    <span className="text-2xl font-black text-amber-800 sm:text-3xl">{attendancePct}%</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">Quorum achieved</span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-800">
                    ⚠️ {error}
                </div>
            )}

            {/* Roster Search & Filter Controls */}
            <div className="shadow-brutal-2 flex flex-col justify-between gap-3 border-2 border-slate-900 bg-white p-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[10px] font-black text-slate-500 uppercase">Filter:</span>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('all')}
                        className={`cursor-pointer border border-slate-900 px-2.5 py-1 text-[10px] font-black uppercase ${
                            filterStatus === 'all'
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        All ({rosterData.roster?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('present')}
                        className={`cursor-pointer border border-slate-900 px-2.5 py-1 text-[10px] font-black uppercase ${
                            filterStatus === 'present'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Present ({rosterData.totalPresent || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('absent')}
                        className={`cursor-pointer border border-slate-900 px-2.5 py-1 text-[10px] font-black uppercase ${
                            filterStatus === 'absent'
                                ? 'bg-rose-500 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        Absent ({absentCount || 0})
                    </button>
                </div>

                <div className="relative w-full max-w-xs">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search roll, name, dept..."
                        className="w-full border-2 border-slate-900 px-2.5 py-1 font-mono text-xs focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute top-1 right-2 text-xs text-slate-600 hover:text-slate-900"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Roster Table */}
            <div className="shadow-brutal-4 overflow-x-auto border-2 border-slate-900 bg-white">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="bg-slate-900 font-mono text-[10px] text-white uppercase">
                            <th className="border-r border-slate-700 p-2.5">Roll No</th>
                            <th className="border-r border-slate-700 p-2.5">Name</th>
                            <th className="border-r border-slate-700 p-2.5">Department</th>
                            <th className="border-r border-slate-700 p-2.5">Package</th>
                            <th className="border-r border-slate-700 p-2.5 text-center">Status</th>
                            <th className="border-r border-slate-700 p-2.5">Check-in Time</th>
                            <th className="p-2.5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center font-bold text-slate-500">
                                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent align-middle"></span>
                                    Loading attendance roster...
                                </td>
                            </tr>
                        ) : filteredRoster.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-8 text-center font-bold text-slate-500">
                                    No candidates found matching the selected filter.
                                </td>
                            </tr>
                        ) : (
                            filteredRoster.map((cand) => {
                                const isBusy = actionBusyRoll === cand.rollNo;

                                return (
                                    <tr
                                        key={cand.rollNo}
                                        className={`transition-colors hover:bg-slate-50 ${
                                            cand.isPresent ? 'bg-emerald-50/30' : ''
                                        }`}
                                    >
                                        <td className="border-r border-slate-200 p-2.5 font-mono font-black text-slate-900">
                                            {cand.rollNo}
                                        </td>
                                        <td className="border-r border-slate-200 p-2.5 font-bold text-slate-900">
                                            <div>{cand.name}</div>
                                            <div className="font-mono text-[10px] text-slate-500">
                                                {cand.email}
                                            </div>
                                        </td>
                                        <td className="border-r border-slate-200 p-2.5 text-slate-700">
                                            <div>{cand.department}</div>
                                            <div className="text-[10px] text-slate-500">Year {cand.year}</div>
                                        </td>
                                        <td className="border-r border-slate-200 p-2.5">
                                            <span className="border border-slate-900 bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase">
                                                {cand.package}
                                            </span>
                                        </td>
                                        <td className="border-r border-slate-200 p-2.5 text-center">
                                            {cand.isPresent ? (
                                                <span className="border border-emerald-500 bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900 uppercase">
                                                    ✓ Present
                                                </span>
                                            ) : (
                                                <span className="border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="border-r border-slate-200 p-2.5 font-mono text-[11px] text-slate-600">
                                            {cand.checkedInAt ? (
                                                <div>
                                                    <span className="font-bold text-slate-900">
                                                        {new Date(cand.checkedInAt).toLocaleTimeString(
                                                            'en-IN',
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit',
                                                                hour12: true
                                                            }
                                                        )}
                                                    </span>
                                                    <span className="block text-[9px] text-slate-500">
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
                                                    className="press shadow-brutal-1 cursor-pointer border border-slate-900 bg-amber-300 px-2 py-1 text-[10px] font-black text-slate-950 uppercase hover:bg-amber-400 disabled:opacity-50"
                                                    title="Mark present manually if student phone has issue"
                                                >
                                                    {isBusy ? 'Saving...' : 'Mark Present ✓'}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-700">
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
                </>
            )}
        </div>
    );
}
