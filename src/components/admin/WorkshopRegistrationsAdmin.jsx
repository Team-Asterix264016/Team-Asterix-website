import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import WorkshopAnalyticsGraphs from './WorkshopAnalyticsGraphs';

export default function WorkshopRegistrationsAdmin({ showStatus }) {
    const [registrations, setRegistrations] = useState([]);
    const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    // By default, show ONLY the confirmed paid list as requested
    const [statusFilter, setStatusFilter] = useState('paid');
    const [packageFilter, setPackageFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [actionBusyId, setActionBusyId] = useState(null);
    const [isSyncingRazorpay, setIsSyncingRazorpay] = useState(false);

    const fetchRegistrations = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) {
                setError('No admin authorization token found. Please sign in again.');
                setIsLoading(false);
                return;
            }

            const res = await fetch(apiUrl('/api/workshop/registrations'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned HTTP ${res.status}`);
            }

            const data = await res.json();
            setRegistrations(data.registrations || []);
            setSummary(data.summary || { total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 });
        } catch (err) {
            console.error('Error fetching workshop registrations:', err);
            setError(err.message || 'Failed to fetch workshop registrations');
            if (!isSilent && showStatus) {
                showStatus(`⚠️ Failed to load registrations: ${err.message}`);
            }
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [showStatus]);

    useEffect(() => {
        let isMounted = true;
        fetchRegistrations(false);

        // Auto-refresh every 8 seconds for live tracking of payments
        const timer = setInterval(() => {
            if (isMounted) fetchRegistrations(true);
        }, 8000);

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [fetchRegistrations]);

    // Handle CSV Export
    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl('/api/workshop/registrations?format=csv'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to generate CSV export');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `asterix-workshop-registrations-${stamp}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (showStatus) showStatus('Workshop registrations CSV exported successfully! 📥');
        } catch (err) {
            console.error('CSV export failed:', err);
            alert('Failed to download CSV: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    // Verify a single registration's payment strictly with Razorpay API
    const handleVerifySingleRazorpay = async (reg) => {
        setActionBusyId(reg._id);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/registrations/${reg._id}/verify-razorpay`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Payment not verified by Razorpay');

            if (showStatus) showStatus(data.message || `✓ Razorpay confirmed payment for ${reg.name}`);
            setSelectedRegistration(null);
            await fetchRegistrations(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setActionBusyId(null);
        }
    };

    // Delete an unneeded pending registration
    const handleDeleteRegistration = async (reg) => {
        if (!window.confirm(`Are you sure you want to remove the pending registration for ${reg.name} (${reg.rollNo})?`)) {
            return;
        }

        setActionBusyId(reg._id);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/registrations/${reg._id}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete registration');

            if (showStatus) showStatus('✓ Registration record removed.');
            setSelectedRegistration(null);
            await fetchRegistrations(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setActionBusyId(null);
        }
    };

    // Bulk check pending registrations against Razorpay API
    const handleSyncRazorpay = async () => {
        setIsSyncingRazorpay(true);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl('/api/workshop/registrations/sync-razorpay'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to sync with Razorpay');
            if (showStatus) showStatus(data.message || 'Razorpay sync complete!');
            await fetchRegistrations(true);
        } catch (err) {
            console.error('Razorpay sync failed:', err);
            alert('Razorpay Sync error: ' + err.message);
        } finally {
            setIsSyncingRazorpay(false);
        }
    };

    // Filter registrations by status, package, and search query
    const filteredRegistrations = useMemo(() => {
        const list = registrations.filter((reg) => {
            if (statusFilter !== 'all' && reg.status !== statusFilter) return false;
            if (packageFilter !== 'all' && reg.package !== packageFilter) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const matchName = reg.name?.toLowerCase().includes(q);
            const matchEmail = reg.email?.toLowerCase().includes(q);
            const matchPhone = reg.phone?.includes(q);
            const matchRollNo = reg.rollNo?.toLowerCase().includes(q);
            const matchDept = reg.department?.toLowerCase().includes(q);
            const matchReceipt = reg.receiptNo?.toLowerCase().includes(q);
            const matchOrder = reg.razorpayOrderId?.toLowerCase().includes(q);
            const matchPayment = reg.razorpayPaymentId?.toLowerCase().includes(q);

            return matchName || matchEmail || matchPhone || matchRollNo || matchDept || matchReceipt || matchOrder || matchPayment;
        });

        // Sort latest receipts first (descending by receiptNo or paidAt)
        return [...list].sort((a, b) => {
            if (a.receiptNo && b.receiptNo) {
                return b.receiptNo.localeCompare(a.receiptNo, undefined, { numeric: true });
            }
            if (a.receiptNo) return -1;
            if (b.receiptNo) return 1;
            const timeA = new Date(a.paidAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.paidAt || b.createdAt || 0).getTime();
            return timeB - timeA;
        });
    }, [registrations, statusFilter, packageFilter, searchQuery]);

    const formatCurrency = (amt) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return String(dateStr);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3 sm:pb-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 leading-tight">
                            Workshop Registrations
                        </h2>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            LIVE SYNC
                        </span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-500 font-mono mt-1">
                        Viewing confirmed candidates and verified payments.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSyncRazorpay}
                        disabled={isSyncingRazorpay || isLoading}
                        className="press flex-1 sm:flex-none px-3 py-1.5 bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 text-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
                        title="Checks all pending registrations against Razorpay API and marks paid if captured"
                    >
                        <span>⚡</span>
                        <span>{isSyncingRazorpay ? 'Syncing...' : 'Sync Razorpay'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fetchRegistrations(false)}
                        disabled={isLoading || isSyncingRazorpay}
                        className="press flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer disabled:opacity-50 text-center"
                    >
                        {isLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={isExporting || registrations.length === 0}
                        className="press flex-1 sm:flex-none px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 text-slate-900 font-mono font-black text-xs uppercase shadow-[2px_2px_0px_#0f172a] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        <span>📥</span>
                        <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3 sm:p-4 bg-rose-50 border-2 border-rose-600 text-rose-800 font-mono text-xs font-bold space-y-1">
                    <div className="flex items-center justify-between">
                        <span>⚠️ {error}</span>
                        <button onClick={() => fetchRegistrations(false)} className="underline cursor-pointer">Retry</button>
                    </div>
                </div>
            )}

            {/* Key Metrics Cards - 3 cards per row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Confirmed Paid */}
                <div className="p-4 sm:p-5 bg-emerald-50 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-black text-emerald-800 uppercase tracking-wider">
                            Confirmed Paid
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 border border-emerald-500 font-mono text-[10px] font-black uppercase">
                            Verified
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight font-mono">
                            {summary.paid}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-800 font-bold border-t border-emerald-200 pt-2 mt-2">
                        <span>Receipts Issued</span>
                        <span className="text-slate-600">
                            {summary.total > 0 ? `${Math.round((summary.paid / summary.total) * 100)}% conversion` : '—'}
                        </span>
                    </div>
                </div>

                {/* 2. Total Revenue */}
                <div className="p-4 sm:p-5 bg-emerald-400 text-slate-950 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-950">
                            Total Revenue
                        </span>
                        <span className="px-2 py-0.5 bg-white text-slate-950 border border-slate-950 font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_#0f172a]">
                            INR Net
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight font-mono whitespace-nowrap">
                            {formatCurrency(summary.revenue)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-900 border-t border-emerald-500 pt-2 mt-2">
                        <span>Razorpay Settlements</span>
                        <span className="bg-emerald-300 px-1.5 py-0.2 border border-slate-900 text-[10px]">Active</span>
                    </div>
                </div>

                {/* 3. Total Registered */}
                <div className="p-4 sm:p-5 bg-slate-50 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-black text-slate-700 uppercase tracking-wider">
                            Total Registered
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 border border-slate-400 font-mono text-[10px] font-black uppercase">
                            All Records
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                            {summary.total}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600 font-bold border-t border-slate-200 pt-2 mt-2">
                        <span>All Attempts Recorded</span>
                        <span className="text-amber-700">{summary.pending} Unpaid</span>
                    </div>
                </div>

                {/* 4. Powertrain Track Capacity */}
                <div className={`p-4 sm:p-5 ${summary.powertrainCapacity?.soldOut ? 'bg-rose-50 border-rose-600' : 'bg-amber-50'} border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-900">
                                Powertrain Capacity
                            </span>
                            {summary.powertrainCapacity && (
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 border ${
                                    summary.powertrainCapacity.soldOut
                                        ? 'bg-rose-600 text-white border-rose-700 shadow-[1px_1px_0px_#0f172a]'
                                        : 'bg-amber-400 text-slate-950 border-amber-600 shadow-[1px_1px_0px_#0f172a]'
                                }`}>
                                    {summary.powertrainCapacity.soldOut
                                        ? 'SOLD OUT'
                                        : `${summary.powertrainCapacity.seatsLeft} SEATS LEFT`}
                                </span>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2 my-1">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                                {summary.powertrainCapacity?.totalPowertrainPaid ?? 0}
                            </span>
                            <span className="text-sm font-mono font-bold text-slate-500">
                                / {summary.powertrainCapacity?.maxSeats ?? 160} cap
                            </span>
                        </div>

                        {/* Progress Bar */}
                        {summary.powertrainCapacity && (
                            <div className="w-full bg-slate-200 border border-slate-900 h-2.5 my-2 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        summary.powertrainCapacity.soldOut ? 'bg-rose-600' : 'bg-amber-500'
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            Math.round(
                                                (summary.powertrainCapacity.totalPowertrainPaid /
                                                    summary.powertrainCapacity.maxSeats) *
                                                    100
                                            )
                                        )}%`
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="text-xs font-mono text-slate-700 font-bold border-t border-amber-200/80 pt-2 mt-2 flex items-center justify-between">
                        <span>PT Alone: {summary.powertrainCapacity?.powertrainAlonePaid ?? 0}</span>
                        <span>Combo: {summary.powertrainCapacity?.comboPaid ?? 0}</span>
                    </div>
                </div>

                {/* 5. Software Track Capacity */}
                <div className={`p-4 sm:p-5 ${summary.softwareCapacity?.soldOut ? 'bg-rose-50 border-rose-600' : 'bg-sky-50'} border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-mono font-black uppercase tracking-wider text-sky-900">
                                Software Capacity
                            </span>
                            {summary.softwareCapacity && (
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 border ${
                                    summary.softwareCapacity.soldOut
                                        ? 'bg-rose-600 text-white border-rose-700 shadow-[1px_1px_0px_#0f172a]'
                                        : summary.softwareCapacity.seatsLeft <= 25
                                        ? 'bg-amber-400 text-slate-950 border-amber-600 shadow-[1px_1px_0px_#0f172a]'
                                        : 'bg-sky-400 text-slate-950 border-sky-600 shadow-[1px_1px_0px_#0f172a]'
                                }`}>
                                    {summary.softwareCapacity.soldOut
                                        ? 'SOLD OUT'
                                        : summary.softwareCapacity.seatsLeft <= 25
                                        ? `${summary.softwareCapacity.seatsLeft} SEATS LEFT`
                                        : 'AVAILABLE'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-baseline gap-2 my-1">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                                {summary.softwareCapacity?.totalSoftwarePaid ?? 0}
                            </span>
                            <span className="text-sm font-mono font-bold text-slate-500">
                                / {summary.softwareCapacity?.maxSeats ?? 161} cap
                            </span>
                        </div>

                        {/* Progress Bar */}
                        {summary.softwareCapacity && (
                            <div className="w-full bg-slate-200 border border-slate-900 h-2.5 my-2 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        summary.softwareCapacity.soldOut ? 'bg-rose-600' : 'bg-sky-500'
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            Math.round(
                                                (summary.softwareCapacity.totalSoftwarePaid /
                                                    summary.softwareCapacity.maxSeats) *
                                                    100
                                            )
                                        )}%`
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="text-xs font-mono text-slate-700 font-bold border-t border-sky-200/80 pt-2 mt-2 flex items-center justify-between">
                        <span>Soft Alone: {summary.softwareCapacity?.softwareAlonePaid ?? 0}</span>
                        <span>Combo: {summary.softwareCapacity?.comboPaid ?? 0}</span>
                    </div>
                </div>

                {/* 6. Pending Unpaid */}
                <div className="p-4 sm:p-5 bg-amber-50 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-black text-amber-800 uppercase tracking-wider">
                            Pending Unpaid
                        </span>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 border border-amber-400 font-mono text-[10px] font-black uppercase">
                            Follow Up
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="text-3xl sm:text-4xl font-black text-amber-600 tracking-tight font-mono">
                            {summary.pending}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-600 font-bold border-t border-amber-200 pt-2 mt-2">
                        <span>Unverified Orders</span>
                        <span className="text-amber-800 font-bold">Use Sync Razorpay</span>
                    </div>
                </div>
            </div>

            {/* Visual Analytics Graphs */}
            <WorkshopAnalyticsGraphs registrations={registrations} />

            {/* Filter and Search Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-[10px] font-mono font-black uppercase text-slate-700 mb-1">
                            Status (Default: Paid)
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 border-2 border-slate-900 bg-white font-mono text-xs font-bold focus:outline-none"
                        >
                            <option value="paid">✓ Confirmed Paid ({summary.paid}) [Default]</option>
                            <option value="pending">⏳ Pending Unpaid ({summary.pending})</option>
                            <option value="all">All Registrations ({registrations.length})</option>
                            <option value="failed">✕ Payment Failed ({summary.failed})</option>
                        </select>
                    </div>

                    {/* Package Filter */}
                    <div>
                        <label className="block text-[10px] font-mono font-black uppercase text-slate-700 mb-1">
                            Workshop Package
                        </label>
                        <select
                            value={packageFilter}
                            onChange={(e) => setPackageFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 border-2 border-slate-900 bg-white font-mono text-xs font-bold focus:outline-none"
                        >
                            <option value="all">All Packages</option>
                            <option value="software">Software Track</option>
                            <option value="powertrain">Powertrain Track</option>
                            <option value="combo">Combo Package</option>
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono font-black uppercase text-slate-700 mb-1">
                            Search Candidate / Roll No / Email
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, roll no, email, AST-WS-xxxx..."
                                className="w-full px-3 py-1.5 border-2 border-slate-900 bg-white font-mono text-xs focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1.5 text-xs font-mono font-bold text-slate-400 hover:text-slate-900"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono font-bold text-slate-500 pt-1 border-t border-slate-200">
                    <span>Showing {filteredRegistrations.length} of {registrations.length} entries</span>
                    {(statusFilter !== 'paid' || packageFilter !== 'all' || searchQuery) && (
                        <button
                            onClick={() => { setStatusFilter('paid'); setPackageFilter('all'); setSearchQuery(''); }}
                            className="text-sky-600 hover:underline cursor-pointer"
                        >
                            Reset to Paid Only
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile-Friendly Candidate Cards (Visible on screens < 768px) */}
            <div className="block md:hidden space-y-3">
                {isLoading && registrations.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-mono font-bold bg-white border-2 border-slate-900">
                        <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin inline-block mr-2 align-middle"></span>
                        <span>Loading registrations...</span>
                    </div>
                ) : filteredRegistrations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 font-mono text-xs font-bold bg-white border-2 border-slate-900">
                        No registrations found matching this filter.
                    </div>
                ) : (
                    filteredRegistrations.map((reg) => {
                        const isPaid = reg.status === 'paid';
                        const isPending = reg.status === 'pending';

                        return (
                            <div
                                key={reg._id || reg.receiptNo}
                                className="p-3.5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] space-y-2.5 font-mono text-xs"
                            >
                                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                    {reg.receiptNo ? (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-600 font-black text-xs">
                                            {reg.receiptNo}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-500 font-bold text-[10px] uppercase">
                                            ⏳ Unpaid
                                        </span>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 border text-[10px] font-black uppercase ${
                                            reg.package === 'combo'
                                                ? 'bg-purple-100 text-purple-900 border-purple-400'
                                                : reg.package === 'software'
                                                    ? 'bg-sky-100 text-sky-900 border-sky-400'
                                                    : 'bg-amber-100 text-amber-900 border-amber-400'
                                        }`}>
                                            {reg.package}
                                        </span>
                                        <span className="font-black text-slate-900">₹{reg.amount}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase leading-snug">{reg.name}</h4>
                                    <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                                        {reg.rollNo} • Year {reg.year} ({reg.department})
                                    </div>
                                    <div className="text-[10px] text-slate-500 break-all">{reg.email}</div>
                                    <div className="text-[10px] text-sky-700 font-bold mt-0.5">{reg.phone}</div>
                                </div>

                                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                                    <span>
                                        {isPaid ? `Paid: ${formatDate(reg.paidAt)}` : `Registered: ${formatDate(reg.createdAt)}`}
                                    </span>
                                    {reg.razorpayPaymentId ? (
                                        <span className="font-bold text-slate-700 truncate max-w-[120px]">{reg.razorpayPaymentId}</span>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    {isPending && (
                                        <button
                                            type="button"
                                            onClick={() => handleVerifySingleRazorpay(reg)}
                                            disabled={actionBusyId === reg._id}
                                            className="press flex-1 py-1.5 bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 text-slate-950 font-mono text-xs font-black uppercase text-center shadow-[1px_1px_0px_#0f172a] disabled:opacity-50"
                                            title="Check Razorpay API to see if candidate paid"
                                        >
                                            {actionBusyId === reg._id ? 'Checking…' : '⚡ Check Razorpay'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRegistration(reg)}
                                        className="press flex-1 py-1.5 bg-slate-100 hover:bg-sky-100 border-2 border-slate-900 text-slate-900 font-mono text-xs font-black uppercase text-center shadow-[1px_1px_0px_#0f172a]"
                                    >
                                        Details →
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop Table (Visible on screens >= 768px) */}
            <div className="hidden md:block bg-white border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                        <tr className="bg-slate-900 text-white font-black uppercase text-[11px] border-b-2 border-slate-900">
                            <th className="p-3 whitespace-nowrap"># Receipt</th>
                            <th className="p-3">Candidate</th>
                            <th className="p-3">Roll No &amp; Dept</th>
                            <th className="p-3">Package</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Payment Info</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y border-slate-200">
                        {isLoading && registrations.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                                        <span>Fetching workshop registrations...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredRegistrations.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                                    No registrations found matching this filter criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredRegistrations.map((reg) => {
                                const isPaid = reg.status === 'paid';
                                const isPending = reg.status === 'pending';

                                return (
                                    <tr key={reg._id || reg.receiptNo} className="hover:bg-sky-50/50 transition-colors">
                                        {/* Receipt No */}
                                        <td className="p-3 font-black whitespace-nowrap">
                                            {reg.receiptNo ? (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-500 font-mono text-[11px]">
                                                    {reg.receiptNo}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-normal">—</span>
                                            )}
                                        </td>

                                        {/* Candidate Details */}
                                        <td className="p-3">
                                            <div className="font-bold text-slate-900">{reg.name}</div>
                                            <div className="text-[11px] text-slate-600">{reg.email}</div>
                                            <div className="text-[10px] text-sky-700 font-bold">{reg.phone}</div>
                                        </td>

                                        {/* Roll No & Dept */}
                                        <td className="p-3">
                                            <div className="font-bold text-slate-900">{reg.rollNo}</div>
                                            <div className="text-[11px] text-slate-600">{reg.department}</div>
                                            <div className="text-[10px] text-slate-500">Year {reg.year}</div>
                                        </td>

                                        {/* Package / Tracks */}
                                        <td className="p-3 whitespace-nowrap">
                                            <span className={`inline-block px-2 py-0.5 border text-[10px] font-black uppercase ${
                                                reg.package === 'combo'
                                                    ? 'bg-purple-100 text-purple-900 border-purple-400'
                                                    : reg.package === 'software'
                                                        ? 'bg-sky-100 text-sky-900 border-sky-400'
                                                        : 'bg-amber-100 text-amber-900 border-amber-400'
                                            }`}>
                                                {reg.package}
                                            </span>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                {Array.isArray(reg.tracksEnrolled) ? reg.tracksEnrolled.join(' + ') : reg.tracksEnrolled}
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="p-3 font-black text-slate-900 whitespace-nowrap">
                                            ₹{reg.amount}
                                        </td>

                                        {/* Status */}
                                        <td className="p-3 whitespace-nowrap">
                                            {isPaid && (
                                                <span className="px-2 py-0.5 bg-emerald-500 text-white font-black border border-slate-900 shadow-[1px_1px_0px_#0f172a] text-[10px] uppercase flex items-center gap-1 w-fit">
                                                    <span>✓ PAID</span>
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className="px-2 py-0.5 bg-amber-300 text-slate-950 font-black border border-slate-900 shadow-[1px_1px_0px_#0f172a] text-[10px] uppercase flex items-center gap-1 w-fit">
                                                    <span>⏳ PENDING</span>
                                                </span>
                                            )}
                                            {reg.paidAt && (
                                                <div className="text-[9px] text-slate-500 mt-1">
                                                    {formatDate(reg.paidAt)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Payment IDs */}
                                        <td className="p-3 text-[10px] max-w-[140px] truncate">
                                            {reg.razorpayPaymentId ? (
                                                <div>
                                                    <span className="text-slate-400">Pay: </span>
                                                    <span className="font-bold text-slate-800">{reg.razorpayPaymentId}</span>
                                                </div>
                                            ) : null}
                                            {reg.razorpayOrderId ? (
                                                <div>
                                                    <span className="text-slate-400">Ord: </span>
                                                    <span className="text-slate-600">{reg.razorpayOrderId}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isPending && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVerifySingleRazorpay(reg)}
                                                        disabled={actionBusyId === reg._id}
                                                        className="press px-2 py-1 bg-amber-400 hover:bg-amber-300 border border-slate-900 text-slate-950 font-mono text-[10px] font-black uppercase cursor-pointer disabled:opacity-50"
                                                        title="Check Razorpay API to see if candidate paid"
                                                    >
                                                        {actionBusyId === reg._id ? 'Checking…' : '⚡ Check Razorpay'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRegistration(reg)}
                                                    className="press px-2.5 py-1 bg-slate-100 hover:bg-sky-100 border border-slate-900 text-slate-900 font-mono text-[10px] font-black uppercase cursor-pointer"
                                                >
                                                    Details →
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>


            {/* Modal for Candidate Details */}
            {selectedRegistration && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#0f172a] max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto max-w-[calc(100vw-2rem)]">
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                            <div>
                                <span className="text-[10px] font-mono font-black text-sky-600 uppercase block">
                                    REGISTRATION RECORD
                                </span>
                                <h3 className="text-lg sm:text-xl font-black uppercase text-slate-900 leading-tight">
                                    {selectedRegistration.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedRegistration(null)}
                                className="press px-2.5 py-1 bg-slate-100 hover:bg-rose-100 border border-slate-900 text-slate-900 font-mono font-black text-xs uppercase cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 font-mono text-xs">
                            <div className="p-3 bg-sky-50 border border-slate-900 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase block">Receipt Number</span>
                                    <span className="text-base font-black text-slate-900">
                                        {selectedRegistration.receiptNo || 'Unpaid (Pending)'}
                                    </span>
                                </div>
                                <span className={`px-2 py-1 text-xs font-black uppercase border border-slate-900 ${
                                    selectedRegistration.status === 'paid' ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-slate-950'
                                }`}>
                                    {selectedRegistration.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200">
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Email Address</span>
                                    <span className="font-bold text-slate-900 break-all">{selectedRegistration.email}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Phone Number</span>
                                    <span className="font-bold text-slate-900">{selectedRegistration.phone}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Roll Number</span>
                                    <span className="font-bold text-slate-900">{selectedRegistration.rollNo}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Year &amp; Dept</span>
                                    <span className="font-bold text-slate-900">Year {selectedRegistration.year} - {selectedRegistration.department}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">College</span>
                                    <span className="font-bold text-slate-900">{selectedRegistration.college || 'PSG iTech'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 block">Package Enrolled</span>
                                    <span className="font-bold text-slate-900 uppercase">{selectedRegistration.package} (₹{selectedRegistration.amount})</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase font-black">Transaction References</div>
                                <div>
                                    <span className="text-slate-500">Order ID: </span>
                                    <span className="font-bold text-slate-900 break-all">{selectedRegistration.razorpayOrderId || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Payment ID: </span>
                                    <span className="font-bold text-slate-900 break-all">{selectedRegistration.razorpayPaymentId || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Paid At: </span>
                                    <span className="font-bold text-slate-900">{formatDate(selectedRegistration.paidAt)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Registered At: </span>
                                    <span className="font-bold text-slate-900">{formatDate(selectedRegistration.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                            <div>
                                {selectedRegistration.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRegistration(selectedRegistration)}
                                        disabled={actionBusyId === selectedRegistration._id}
                                        className="press px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-600 text-rose-700 font-mono font-bold text-xs uppercase cursor-pointer"
                                    >
                                        🗑 Delete Entry
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedRegistration.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => handleVerifySingleRazorpay(selectedRegistration)}
                                        disabled={actionBusyId === selectedRegistration._id}
                                        className="press px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 text-slate-950 font-mono font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                                        title="Check Razorpay API to see if candidate paid"
                                    >
                                        {actionBusyId === selectedRegistration._id ? 'Checking Razorpay…' : '⚡ Check with Razorpay'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedRegistration(null)}
                                    className="press px-4 py-2 bg-slate-900 text-white font-mono font-black text-xs uppercase cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
