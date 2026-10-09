import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import WorkshopAnalyticsGraphs from './WorkshopAnalyticsGraphs';
import { useModalBehavior } from '../../hooks/useModalBehavior';

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
    const [editingRegistration, setEditingRegistration] = useState(null);
    const [isSavingStudent, setIsSavingStudent] = useState(false);
    const [studentEditError, setStudentEditError] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [actionBusyId, setActionBusyId] = useState(null);
    const [isSyncingRazorpay, setIsSyncingRazorpay] = useState(false);

    const detailsModalRef = useModalBehavior(Boolean(selectedRegistration), () =>
        setSelectedRegistration(null)
    );
    const editModalRef = useModalBehavior(Boolean(editingRegistration), () => setEditingRegistration(null));

    const fetchRegistrations = useCallback(
        async (isSilent = false) => {
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
                        Authorization: `Bearer ${token}`
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
        },
        [showStatus]
    );

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
                    Authorization: `Bearer ${token}`
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
                    Authorization: `Bearer ${token}`
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
        if (
            !window.confirm(
                `Are you sure you want to remove the pending registration for ${reg.name} (${reg.rollNo})?`
            )
        ) {
            return;
        }

        setActionBusyId(reg._id);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/registrations/${reg._id}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
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
                    Authorization: `Bearer ${token}`
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

    const handleSaveStudent = async (event) => {
        event.preventDefault();
        if (!editingRegistration) return;
        setIsSavingStudent(true);
        setStudentEditError('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/registrations/${editingRegistration._id}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editingRegistration)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not update student details.');
            setEditingRegistration(null);
            await fetchRegistrations(true);
            if (showStatus) showStatus('Student registration details updated.');
        } catch (err) {
            setStudentEditError(err.message || 'Could not update student details.');
        } finally {
            setIsSavingStudent(false);
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

            return (
                matchName ||
                matchEmail ||
                matchPhone ||
                matchRollNo ||
                matchDept ||
                matchReceipt ||
                matchOrder ||
                matchPayment
            );
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
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amt || 0);
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
        <div className="max-w-full space-y-4 overflow-hidden sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-200 pb-3 sm:flex-row sm:items-center sm:pb-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl leading-tight font-black text-slate-900 uppercase sm:text-2xl">
                            Workshop Registrations
                        </h2>
                        <span className="flex items-center gap-1 border border-emerald-400 bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                            LIVE SYNC
                        </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] font-bold text-slate-500 sm:text-xs">
                        Viewing confirmed candidates and verified payments.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSyncRazorpay}
                        disabled={isSyncingRazorpay || isLoading}
                        className="press shadow-brutal-2 flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-amber-400 px-3 py-1.5 text-center font-mono text-xs font-black text-slate-900 uppercase hover:bg-amber-300 disabled:opacity-50 sm:flex-none"
                        title="Checks all pending registrations against Razorpay API and marks paid if captured"
                    >
                        <span>⚡</span>
                        <span>{isSyncingRazorpay ? 'Syncing...' : 'Sync Razorpay'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fetchRegistrations(false)}
                        disabled={isLoading || isSyncingRazorpay}
                        className="press shadow-brutal-2 flex-1 cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 text-center font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100 disabled:opacity-50 sm:flex-none"
                    >
                        {isLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        disabled={isExporting || registrations.length === 0}
                        className="press shadow-brutal-2 flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-emerald-400 px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300 disabled:opacity-50 sm:flex-none"
                    >
                        <span>📥</span>
                        <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="space-y-1 border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-800 sm:p-4">
                    <div className="flex items-center justify-between">
                        <span>⚠️ {error}</span>
                        <button
                            onClick={() => fetchRegistrations(false)}
                            className="cursor-pointer underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Key Metrics Cards - 3 cards per row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {/* 1. Confirmed Paid */}
                <div className="shadow-brutal-4 flex flex-col justify-between border-2 border-slate-900 bg-emerald-50 p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-emerald-800 uppercase">
                            Confirmed Paid
                        </span>
                        <span className="border border-emerald-500 bg-emerald-200 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-900 uppercase">
                            Verified
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="font-mono text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl">
                            {summary.paid}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-emerald-200 pt-2 font-mono text-xs font-bold text-emerald-800">
                        <span>Receipts Issued</span>
                        <span className="text-slate-600">
                            {summary.total > 0
                                ? `${Math.round((summary.paid / summary.total) * 100)}% conversion`
                                : '—'}
                        </span>
                    </div>
                </div>

                {/* 2. Total Revenue */}
                <div className="shadow-brutal-4 flex flex-col justify-between border-2 border-slate-900 bg-emerald-400 p-4 text-slate-950 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-slate-950 uppercase">
                            Total Revenue
                        </span>
                        <span className="shadow-brutal-1 border border-slate-950 bg-white px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                            INR Net
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="font-mono text-2xl font-black tracking-tight whitespace-nowrap text-slate-950 sm:text-3xl lg:text-4xl">
                            {formatCurrency(summary.revenue)}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-emerald-500 pt-2 font-mono text-xs font-bold text-slate-900">
                        <span>Razorpay Settlements</span>
                        <span className="py-0.2 border border-slate-900 bg-emerald-300 px-1.5 text-[10px]">
                            Active
                        </span>
                    </div>
                </div>

                {/* 3. Total Registered */}
                <div className="shadow-brutal-4 flex flex-col justify-between border-2 border-slate-900 bg-slate-50 p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-slate-700 uppercase">
                            Total Registered
                        </span>
                        <span className="border border-slate-400 bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-black text-slate-800 uppercase">
                            All Records
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="font-mono text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            {summary.total}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 font-mono text-xs font-bold text-slate-600">
                        <span>All Attempts Recorded</span>
                        <span className="text-amber-700">{summary.pending} Unpaid</span>
                    </div>
                </div>

                {/* 4. Powertrain Track Capacity */}
                <div
                    className={`p-4 sm:p-5 ${summary.powertrainCapacity?.soldOut ? 'border-rose-600 bg-rose-50' : 'bg-amber-50'} shadow-brutal-4 flex flex-col justify-between border-2 border-slate-900`}
                >
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-black tracking-wider text-amber-900 uppercase">
                                Powertrain Capacity
                            </span>
                            {summary.powertrainCapacity && (
                                <span
                                    className={`border px-2 py-0.5 font-mono text-[10px] font-black ${
                                        summary.powertrainCapacity.soldOut
                                            ? 'shadow-brutal-1 border-rose-700 bg-rose-600 text-white'
                                            : 'shadow-brutal-1 border-amber-600 bg-amber-400 text-slate-950'
                                    }`}
                                >
                                    {summary.powertrainCapacity.soldOut
                                        ? 'SOLD OUT'
                                        : `${summary.powertrainCapacity.seatsLeft} SEATS LEFT`}
                                </span>
                            )}
                        </div>

                        <div className="my-1 flex items-baseline gap-2">
                            <span className="font-mono text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                {summary.powertrainCapacity?.totalPowertrainPaid ?? 0}
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-500">
                                / {summary.powertrainCapacity?.maxSeats ?? 160} cap
                            </span>
                        </div>

                        {/* Progress Bar */}
                        {summary.powertrainCapacity && (
                            <div className="my-2 h-2.5 w-full overflow-hidden border border-slate-900 bg-slate-200 shadow-inner">
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

                    <div className="mt-2 flex items-center justify-between border-t border-amber-200/80 pt-2 font-mono text-xs font-bold text-slate-700">
                        <span>PT Alone: {summary.powertrainCapacity?.powertrainAlonePaid ?? 0}</span>
                        <span>Combo: {summary.powertrainCapacity?.comboPaid ?? 0}</span>
                    </div>
                </div>

                {/* 5. Software Track Capacity */}
                <div
                    className={`p-4 sm:p-5 ${summary.softwareCapacity?.soldOut ? 'border-rose-600 bg-rose-50' : 'bg-sky-50'} shadow-brutal-4 flex flex-col justify-between border-2 border-slate-900`}
                >
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-black tracking-wider text-sky-900 uppercase">
                                Software Capacity
                            </span>
                            {summary.softwareCapacity && (
                                <span
                                    className={`border px-2 py-0.5 font-mono text-[10px] font-black ${
                                        summary.softwareCapacity.soldOut
                                            ? 'shadow-brutal-1 border-rose-700 bg-rose-600 text-slate-950'
                                            : summary.softwareCapacity.seatsLeft <= 25
                                              ? 'shadow-brutal-1 border-amber-600 bg-amber-400 text-slate-950'
                                              : 'shadow-brutal-1 border-sky-600 bg-sky-400 text-slate-950'
                                    }`}
                                >
                                    {summary.softwareCapacity.soldOut
                                        ? 'SOLD OUT'
                                        : summary.softwareCapacity.seatsLeft <= 25
                                          ? `${summary.softwareCapacity.seatsLeft} SEATS LEFT`
                                          : 'AVAILABLE'}
                                </span>
                            )}
                        </div>

                        <div className="my-1 flex items-baseline gap-2">
                            <span className="font-mono text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                {summary.softwareCapacity?.totalSoftwarePaid ?? 0}
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-500">
                                / {summary.softwareCapacity?.maxSeats ?? 161} cap
                            </span>
                        </div>

                        {/* Progress Bar */}
                        {summary.softwareCapacity && (
                            <div className="my-2 h-2.5 w-full overflow-hidden border border-slate-900 bg-slate-200 shadow-inner">
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

                    <div className="mt-2 flex items-center justify-between border-t border-sky-200/80 pt-2 font-mono text-xs font-bold text-slate-700">
                        <span>Soft Alone: {summary.softwareCapacity?.softwareAlonePaid ?? 0}</span>
                        <span>Combo: {summary.softwareCapacity?.comboPaid ?? 0}</span>
                    </div>
                </div>

                {/* 6. Pending Unpaid */}
                <div className="shadow-brutal-4 flex flex-col justify-between border-2 border-slate-900 bg-amber-50 p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-amber-800 uppercase">
                            Pending Unpaid
                        </span>
                        <span className="border border-amber-400 bg-amber-200 px-2 py-0.5 font-mono text-[10px] font-black text-amber-900 uppercase">
                            Follow Up
                        </span>
                    </div>
                    <div className="my-1">
                        <span className="font-mono text-3xl font-black tracking-tight text-amber-600 sm:text-4xl">
                            {summary.pending}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-amber-200 pt-2 font-mono text-xs font-bold text-slate-600">
                        <span>Unverified Orders</span>
                        <span className="font-bold text-amber-800">Use Sync Razorpay</span>
                    </div>
                </div>
            </div>

            {/* Visual Analytics Graphs */}
            <WorkshopAnalyticsGraphs registrations={registrations} />

            {/* Filter and Search Bar */}
            <div className="shadow-brutal-3 space-y-3 border-2 border-slate-900 bg-slate-50 p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-4">
                    {/* Status Filter */}
                    <div>
                        <label className="mb-1 block font-mono text-[10px] font-black text-slate-700 uppercase">
                            Status (Default: Paid)
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 font-mono text-xs font-bold focus:outline-none"
                        >
                            <option value="paid">✓ Confirmed Paid ({summary.paid}) [Default]</option>
                            <option value="pending">⏳ Pending Unpaid ({summary.pending})</option>
                            <option value="all">All Registrations ({registrations.length})</option>
                            <option value="failed">✕ Payment Failed ({summary.failed})</option>
                        </select>
                    </div>

                    {/* Package Filter */}
                    <div>
                        <label className="mb-1 block font-mono text-[10px] font-black text-slate-700 uppercase">
                            Workshop Package
                        </label>
                        <select
                            value={packageFilter}
                            onChange={(e) => setPackageFilter(e.target.value)}
                            className="w-full border-2 border-slate-900 bg-white px-2.5 py-1.5 font-mono text-xs font-bold focus:outline-none"
                        >
                            <option value="all">All Packages</option>
                            <option value="software">Software Track</option>
                            <option value="powertrain">Powertrain Track</option>
                            <option value="combo">Combo Package</option>
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="sm:col-span-2">
                        <label className="mb-1 block font-mono text-[10px] font-black text-slate-700 uppercase">
                            Search Candidate / Roll No / Email
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, roll no, email, AST-WS-xxxx..."
                                className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute top-1.5 right-2 font-mono text-xs font-bold text-slate-500 hover:text-slate-900"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-1 font-mono text-[11px] font-bold text-slate-500">
                    <span>
                        Showing {filteredRegistrations.length} of {registrations.length} entries
                    </span>
                    {(statusFilter !== 'paid' || packageFilter !== 'all' || searchQuery) && (
                        <button
                            onClick={() => {
                                setStatusFilter('paid');
                                setPackageFilter('all');
                                setSearchQuery('');
                            }}
                            className="cursor-pointer text-sky-700 hover:underline"
                        >
                            Reset to Paid Only
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile-Friendly Candidate Cards (Visible on screens < 768px) */}
            <div className="block space-y-3 md:hidden">
                {isLoading && registrations.length === 0 ? (
                    <div className="border-2 border-slate-900 bg-white p-8 text-center font-mono font-bold text-slate-500">
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent align-middle"></span>
                        <span>Loading registrations...</span>
                    </div>
                ) : filteredRegistrations.length === 0 ? (
                    <div className="border-2 border-slate-900 bg-white p-6 text-center font-mono text-xs font-bold text-slate-500">
                        No registrations found matching this filter.
                    </div>
                ) : (
                    filteredRegistrations.map((reg) => {
                        const isPaid = reg.status === 'paid';
                        const isPending = reg.status === 'pending';

                        return (
                            <div
                                key={reg._id || reg.receiptNo}
                                className="shadow-brutal-3 space-y-2.5 border-2 border-slate-900 bg-white p-3.5 font-mono text-xs"
                            >
                                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                    {reg.receiptNo ? (
                                        <span className="border border-emerald-600 bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-900">
                                            {reg.receiptNo}
                                        </span>
                                    ) : (
                                        <span className="border border-amber-500 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                                            ⏳ Unpaid
                                        </span>
                                    )}

                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`border px-2 py-0.5 text-[10px] font-black uppercase ${
                                                reg.package === 'combo'
                                                    ? 'border-purple-400 bg-purple-100 text-purple-900'
                                                    : reg.package === 'software'
                                                      ? 'border-sky-400 bg-sky-100 text-sky-900'
                                                      : 'border-amber-400 bg-amber-100 text-amber-900'
                                            }`}
                                        >
                                            {reg.package}
                                        </span>
                                        <span className="font-black text-slate-900">₹{reg.amount}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm leading-snug font-black text-slate-900 uppercase">
                                        {reg.name}
                                    </h4>
                                    <div className="mt-0.5 text-[11px] font-bold text-slate-700">
                                        {reg.rollNo} • Year {reg.year} ({reg.department})
                                    </div>
                                    <div className="text-[10px] break-all text-slate-500">{reg.email}</div>
                                    <div className="mt-0.5 text-[10px] font-bold text-sky-700">
                                        {reg.phone}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[10px] text-slate-500">
                                    <span>
                                        {isPaid
                                            ? `Paid: ${formatDate(reg.paidAt)}`
                                            : `Registered: ${formatDate(reg.createdAt)}`}
                                    </span>
                                    {reg.razorpayPaymentId ? (
                                        <span className="max-w-[120px] truncate font-bold text-slate-700">
                                            {reg.razorpayPaymentId}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    {isPending && (
                                        <button
                                            type="button"
                                            onClick={() => handleVerifySingleRazorpay(reg)}
                                            disabled={actionBusyId === reg._id}
                                            className="press shadow-brutal-1 flex-1 border-2 border-slate-900 bg-amber-400 py-1.5 text-center font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-300 disabled:opacity-50"
                                            title="Check Razorpay API to see if candidate paid"
                                        >
                                            {actionBusyId === reg._id ? 'Checking…' : '⚡ Check Razorpay'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRegistration(reg)}
                                        className="press shadow-brutal-1 flex-1 border-2 border-slate-900 bg-slate-100 py-1.5 text-center font-mono text-xs font-black text-slate-900 uppercase hover:bg-sky-100"
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
            <div className="shadow-brutal-4 hidden overflow-x-auto border-2 border-slate-900 bg-white md:block">
                <table className="w-full border-collapse text-left font-mono text-xs">
                    <thead>
                        <tr className="border-b-2 border-slate-900 bg-slate-900 text-[11px] font-black text-white uppercase">
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
                                <td colSpan={8} className="p-8 text-center font-bold text-slate-500">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></span>
                                        <span>Fetching workshop registrations...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredRegistrations.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center font-bold text-slate-500">
                                    No registrations found matching this filter criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredRegistrations.map((reg) => {
                                const isPaid = reg.status === 'paid';
                                const isPending = reg.status === 'pending';

                                return (
                                    <tr
                                        key={reg._id || reg.receiptNo}
                                        className="transition-colors hover:bg-sky-50/50"
                                    >
                                        {/* Receipt No */}
                                        <td className="p-3 font-black whitespace-nowrap">
                                            {reg.receiptNo ? (
                                                <span className="border border-emerald-500 bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-900">
                                                    {reg.receiptNo}
                                                </span>
                                            ) : (
                                                <span className="font-normal text-slate-500">—</span>
                                            )}
                                        </td>

                                        {/* Candidate Details */}
                                        <td className="p-3">
                                            <div className="font-bold text-slate-900">{reg.name}</div>
                                            <div className="text-[11px] text-slate-600">{reg.email}</div>
                                            <div className="text-[10px] font-bold text-sky-700">
                                                {reg.phone}
                                            </div>
                                        </td>

                                        {/* Roll No & Dept */}
                                        <td className="p-3">
                                            <div className="font-bold text-slate-900">{reg.rollNo}</div>
                                            <div className="text-[11px] text-slate-600">{reg.department}</div>
                                            <div className="text-[10px] text-slate-500">Year {reg.year}</div>
                                        </td>

                                        {/* Package / Tracks */}
                                        <td className="p-3 whitespace-nowrap">
                                            <span
                                                className={`inline-block border px-2 py-0.5 text-[10px] font-black uppercase ${
                                                    reg.package === 'combo'
                                                        ? 'border-purple-400 bg-purple-100 text-purple-900'
                                                        : reg.package === 'software'
                                                          ? 'border-sky-400 bg-sky-100 text-sky-900'
                                                          : 'border-amber-400 bg-amber-100 text-amber-900'
                                                }`}
                                            >
                                                {reg.package}
                                            </span>
                                            <div className="mt-0.5 text-[10px] text-slate-500">
                                                {Array.isArray(reg.tracksEnrolled)
                                                    ? reg.tracksEnrolled.join(' + ')
                                                    : reg.tracksEnrolled}
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="p-3 font-black whitespace-nowrap text-slate-900">
                                            ₹{reg.amount}
                                        </td>

                                        {/* Status */}
                                        <td className="p-3 whitespace-nowrap">
                                            {isPaid && (
                                                <span className="shadow-brutal-1 flex w-fit items-center gap-1 border border-slate-900 bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white uppercase">
                                                    <span>✓ PAID</span>
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className="shadow-brutal-1 flex w-fit items-center gap-1 border border-slate-900 bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase">
                                                    <span>⏳ PENDING</span>
                                                </span>
                                            )}
                                            {reg.paidAt && (
                                                <div className="mt-1 text-[9px] text-slate-500">
                                                    {formatDate(reg.paidAt)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Payment IDs */}
                                        <td className="max-w-[140px] truncate p-3 text-[10px]">
                                            {reg.razorpayPaymentId ? (
                                                <div>
                                                    <span className="text-slate-500">Pay: </span>
                                                    <span className="font-bold text-slate-800">
                                                        {reg.razorpayPaymentId}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {reg.razorpayOrderId ? (
                                                <div>
                                                    <span className="text-slate-500">Ord: </span>
                                                    <span className="text-slate-600">
                                                        {reg.razorpayOrderId}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">—</span>
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
                                                        className="press cursor-pointer border border-slate-900 bg-amber-400 px-2 py-1 font-mono text-[10px] font-black text-slate-950 uppercase hover:bg-amber-300 disabled:opacity-50"
                                                        title="Check Razorpay API to see if candidate paid"
                                                    >
                                                        {actionBusyId === reg._id
                                                            ? 'Checking…'
                                                            : '⚡ Check Razorpay'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRegistration(reg)}
                                                    className="press cursor-pointer border border-slate-900 bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-sky-100"
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedRegistration(null);
                    }}
                >
                    <div
                        ref={detailsModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="workshop-registration-details-title"
                        tabIndex={-1}
                        className="shadow-brutal-8 max-h-[90vh] w-full max-w-[calc(100vw-2rem)] max-w-lg space-y-4 overflow-y-auto border-4 border-slate-900 bg-white p-4 sm:p-6"
                    >
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                            <div>
                                <span className="block font-mono text-[10px] font-black text-sky-700 uppercase">
                                    REGISTRATION RECORD
                                </span>
                                <h3
                                    id="workshop-registration-details-title"
                                    className="text-lg leading-tight font-black text-slate-900 uppercase sm:text-xl"
                                >
                                    {selectedRegistration.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedRegistration(null)}
                                className="press cursor-pointer border border-slate-900 bg-slate-100 px-2.5 py-1 font-mono text-xs font-black text-slate-900 uppercase hover:bg-rose-100"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 font-mono text-xs">
                            <div className="flex items-center justify-between border border-slate-900 bg-sky-50 p-3">
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase">
                                        Receipt Number
                                    </span>
                                    <span className="text-base font-black text-slate-900">
                                        {selectedRegistration.receiptNo || 'Unpaid (Pending)'}
                                    </span>
                                </div>
                                <span
                                    className={`border border-slate-900 px-2 py-1 text-xs font-black uppercase ${
                                        selectedRegistration.status === 'paid'
                                            ? 'bg-emerald-400 text-slate-950'
                                            : 'bg-amber-300 text-slate-950'
                                    }`}
                                >
                                    {selectedRegistration.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                                <div>
                                    <span className="block text-[10px] text-slate-500">Email Address</span>
                                    <span className="font-bold break-all text-slate-900">
                                        {selectedRegistration.email}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500">Phone Number</span>
                                    <span className="font-bold text-slate-900">
                                        {selectedRegistration.phone}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500">Roll Number</span>
                                    <span className="font-bold text-slate-900">
                                        {selectedRegistration.rollNo}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500">Year &amp; Dept</span>
                                    <span className="font-bold text-slate-900">
                                        Year {selectedRegistration.year} - {selectedRegistration.department}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500">College</span>
                                    <span className="font-bold text-slate-900">
                                        {selectedRegistration.college || 'PSG iTech'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500">Package Enrolled</span>
                                    <span className="font-bold text-slate-900 uppercase">
                                        {selectedRegistration.package} (₹{selectedRegistration.amount})
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 border border-slate-200 bg-slate-50 p-3">
                                <div className="text-[10px] font-black text-slate-500 uppercase">
                                    Transaction References
                                </div>
                                <div>
                                    <span className="text-slate-500">Order ID: </span>
                                    <span className="font-bold break-all text-slate-900">
                                        {selectedRegistration.razorpayOrderId || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Payment ID: </span>
                                    <span className="font-bold break-all text-slate-900">
                                        {selectedRegistration.razorpayPaymentId || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Paid At: </span>
                                    <span className="font-bold text-slate-900">
                                        {formatDate(selectedRegistration.paidAt)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Registered At: </span>
                                    <span className="font-bold text-slate-900">
                                        {formatDate(selectedRegistration.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
                            <div>
                                {selectedRegistration.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRegistration(selectedRegistration)}
                                        disabled={actionBusyId === selectedRegistration._id}
                                        className="press cursor-pointer border border-rose-600 bg-rose-50 px-3 py-1.5 font-mono text-xs font-bold text-rose-700 uppercase hover:bg-rose-100"
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
                                        className="press cursor-pointer border-2 border-slate-900 bg-amber-400 px-3.5 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-300 disabled:opacity-50"
                                        title="Check Razorpay API to see if candidate paid"
                                    >
                                        {actionBusyId === selectedRegistration._id
                                            ? 'Checking Razorpay…'
                                            : '⚡ Check with Razorpay'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingRegistration({ ...selectedRegistration });
                                        setSelectedRegistration(null);
                                        setStudentEditError('');
                                    }}
                                    className="press cursor-pointer border-2 border-slate-900 bg-sky-100 px-3.5 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-200"
                                >
                                    Edit student
                                </button>
                                <button
                                    onClick={() => setSelectedRegistration(null)}
                                    className="press cursor-pointer bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingRegistration && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3">
                    <form
                        ref={editModalRef}
                        onSubmit={handleSaveStudent}
                        className="shadow-brutal-7-brand max-h-[92vh] w-full max-w-xl overflow-y-auto border-4 border-slate-900 bg-white p-5 sm:p-7"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-workshop-student-title"
                    >
                        <div className="flex items-start justify-between gap-3 border-b-2 border-slate-200 pb-4">
                            <div>
                                <p className="font-mono text-[10px] font-black text-sky-700 uppercase">
                                    Registration {editingRegistration.receiptNo || ''}
                                </p>
                                <h3
                                    id="edit-workshop-student-title"
                                    className="mt-1 text-lg font-black uppercase"
                                >
                                    Edit student details
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingRegistration(null)}
                                disabled={isSavingStudent}
                                className="text-xl font-black"
                                aria-label="Close editor"
                            >
                                ×
                            </button>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {[
                                ['name', 'Full name', 'text'],
                                ['email', 'Email', 'email'],
                                ['phone', 'Phone', 'tel'],
                                ['rollNo', 'Registered number', 'text'],
                                ['department', 'Department', 'text'],
                                ['year', 'Year', 'text'],
                                ['college', 'College', 'text']
                            ].map(([field, label, type]) => (
                                <label key={field} className="block text-[10px] font-black uppercase">
                                    {label}
                                    <input
                                        className="mt-1.5 min-h-10 w-full border-2 border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-600 focus:outline-none"
                                        type={type}
                                        value={editingRegistration[field] || ''}
                                        required={field !== 'college'}
                                        onChange={(event) =>
                                            setEditingRegistration({
                                                ...editingRegistration,
                                                [field]: event.target.value
                                            })
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                        {studentEditError && (
                            <p
                                role="alert"
                                className="mt-4 border-2 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800"
                            >
                                {studentEditError}
                            </p>
                        )}
                        <p className="mt-4 text-[11px] font-bold text-slate-500">
                            These fields update the workshop registration and the participant&apos;s
                            attendance, project and quiz records, so a corrected registered number keeps its
                            attendance history. Package and payment details are unchanged.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingRegistration(null)}
                                disabled={isSavingStudent}
                                className="border-2 border-slate-900 bg-white px-4 py-2 text-xs font-black uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingStudent}
                                className="border-2 border-slate-900 bg-emerald-400 px-4 py-2 text-xs font-black uppercase disabled:opacity-60"
                            >
                                {isSavingStudent ? 'Saving...' : 'Save student'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
