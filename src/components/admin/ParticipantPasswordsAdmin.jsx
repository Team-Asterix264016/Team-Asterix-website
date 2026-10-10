import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

export default function ParticipantPasswordsAdmin({ showStatus }) {
    const [auditList, setAuditList] = useState([]);
    const [summary, setSummary] = useState({ totalPaid: 0, hasLoggedIn: 0, customPasswordSet: 0, usingDefaultPassword: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // 'all' | 'loggedin' | 'custom' | 'default'

    const fetchAudit = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (!token) {
                setError('No admin authorization token found. Please sign in again.');
                setIsLoading(false);
                return;
            }

            const res = await fetch(apiUrl('/api/workshop/registrations/superadmin-security'), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned HTTP ${res.status}`);
            }

            const data = await res.json();
            setAuditList(data.auditList || []);
            setSummary(data.summary || { totalPaid: 0, hasLoggedIn: 0, customPasswordSet: 0, usingDefaultPassword: 0 });
        } catch (err) {
            console.error('Error fetching security audit:', err);
            setError(err.message || 'Failed to fetch security audit logs');
            if (!isSilent && showStatus) {
                showStatus(`⚠️ Security audit error: ${err.message}`);
            }
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    }, [showStatus]);

    useEffect(() => {
        let isMounted = true;
        fetchAudit(false);

        const timer = setInterval(() => {
            if (isMounted) fetchAudit(true);
        }, 10000);

        return () => {
            isMounted = false;
            clearInterval(timer);
        };
    }, [fetchAudit]);

    const [actionBusyId, setActionBusyId] = useState(null);

    // Passwords are stored only as hashes, so a forgotten one can't be read back;
    // the participant is put back on the default and sets a new one themselves.
    const handleResetPassword = async (item) => {
        if (!window.confirm(`Reset ${item.name} (${item.rollNo}) to the default password "asterix"?`)) return;

        setActionBusyId(item.id);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/registrations/${item.id}/reset-password`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            if (showStatus) showStatus(data.message || `✓ Reset ${item.name} to the default password`);
            await fetchAudit(true);
        } catch (err) {
            alert('Reset error: ' + err.message);
        } finally {
            setActionBusyId(null);
        }
    };

    const handleUpgradeToCombo = async (item) => {
        if (!item) return;
        if (item.package === 'combo') {
            alert(`${item.name} is already enrolled in Combo.`);
            return;
        }
        if (!window.confirm(`Upgrade ${item.name} (${item.rollNo}) to Dual-Track Combo package?`)) {
            return;
        }

        setActionBusyId(item.id);
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/api/workshop/registrations/${item.id}/upgrade-combo`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to upgrade candidate');

            if (showStatus) showStatus(data.message || `✓ Upgraded ${item.name} to Combo!`);
            await fetchAudit(true);
        } catch (err) {
            alert('Upgrade error: ' + err.message);
        } finally {
            setActionBusyId(null);
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('en-IN', {
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

    const filteredList = useMemo(() => {
        return auditList.filter((item) => {
            // Category filter
            if (filterCategory === 'loggedin' && !item.lastLoginAt && item.loginCount === 0) return false;
            if (filterCategory === 'custom' && !item.isCustomPassword) return false;
            if (filterCategory === 'default' && item.isCustomPassword) return false;

            // Search filter
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            return (
                item.name?.toLowerCase().includes(q) ||
                item.rollNo?.toLowerCase().includes(q) ||
                item.email?.toLowerCase().includes(q) ||
                item.phone?.toLowerCase().includes(q) ||
                item.receiptNo?.toLowerCase().includes(q) ||
                item.package?.toLowerCase().includes(q)
            );
        });
    }, [auditList, filterCategory, searchQuery]);

    return (
        <div className="space-y-6 select-text">
            {/* SuperAdmin Header Banner */}
            <div className="shadow-brutal-6 border-4 border-slate-900 bg-amber-300 p-6 text-slate-950">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="border-2 border-slate-900 bg-slate-950 px-2.5 py-0.5 font-mono text-xs font-black text-amber-300 uppercase">
                                🔒 RESTRICTED • SUPERADMIN ONLY
                            </span>
                            <span className="border-2 border-slate-900 bg-white px-2.5 py-0.5 font-mono text-xs font-black text-slate-900 uppercase">
                                Real-Time Security Audit
                            </span>
                        </div>
                        <h2 className="mt-2 text-3xl font-black uppercase text-slate-950 sm:text-4xl">
                            Participant Logins &amp; Password Status 🔑
                        </h2>
                        <p className="mt-1 font-mono text-xs font-bold text-slate-900">
                            Paid participants who logged into their profile, when and how often, and whether they set their own password. Passwords are stored only as one-way hashes and cannot be viewed; reset a participant to the default if they forget theirs.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchAudit(false)}
                        className="press shadow-brutal-3 shrink-0 border-3 border-slate-900 bg-slate-950 px-5 py-3 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                    >
                        🔄 Refresh Audit Data
                    </button>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="shadow-brutal-4 border-3 border-slate-900 bg-white p-4">
                    <span className="block font-mono text-[10px] font-black text-slate-500 uppercase">Total Paid Participants</span>
                    <strong className="mt-1 block text-2xl font-black text-slate-900 sm:text-3xl">{summary.totalPaid}</strong>
                </div>

                <div className="shadow-brutal-4 border-3 border-slate-900 bg-emerald-100 p-4">
                    <span className="block font-mono text-[10px] font-black text-emerald-800 uppercase">Logged-In Participants</span>
                    <strong className="mt-1 block text-2xl font-black text-emerald-950 sm:text-3xl">{summary.hasLoggedIn}</strong>
                </div>

                <div className="shadow-brutal-4 border-3 border-slate-900 bg-sky-100 p-4">
                    <span className="block font-mono text-[10px] font-black text-sky-800 uppercase">Custom Password Set</span>
                    <strong className="mt-1 block text-2xl font-black text-sky-950 sm:text-3xl">{summary.customPasswordSet}</strong>
                </div>

                <div className="shadow-brutal-4 border-3 border-slate-900 bg-amber-100 p-4">
                    <span className="block font-mono text-[10px] font-black text-amber-800 uppercase">Using Default (&quot;asterix&quot;)</span>
                    <strong className="mt-1 block text-2xl font-black text-amber-950 sm:text-3xl">{summary.usingDefaultPassword}</strong>
                </div>
            </div>

            {/* Controls Bar: Search & Category Filter */}
            <div className="shadow-brutal-4 flex flex-col justify-between gap-4 border-3 border-slate-900 bg-white p-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by candidate name, roll no, email, or phone..."
                        className="min-h-11 w-full flex-1 border-2 border-slate-900 bg-slate-50 px-3.5 py-2 font-mono text-xs font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                    />

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <button
                            type="button"
                            onClick={() => setFilterCategory('all')}
                            className={`press px-3 py-2 font-mono text-xs font-black uppercase transition-all ${
                                filterCategory === 'all'
                                    ? 'shadow-brutal-2 border-2 border-slate-900 bg-slate-900 text-amber-300'
                                    : 'border border-slate-900 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            All ({auditList.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterCategory('loggedin')}
                            className={`press px-3 py-2 font-mono text-xs font-black uppercase transition-all ${
                                filterCategory === 'loggedin'
                                    ? 'shadow-brutal-2 border-2 border-slate-900 bg-emerald-400 text-slate-950'
                                    : 'border border-slate-900 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Logged In ({summary.hasLoggedIn})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterCategory('custom')}
                            className={`press px-3 py-2 font-mono text-xs font-black uppercase transition-all ${
                                filterCategory === 'custom'
                                    ? 'shadow-brutal-2 border-2 border-slate-900 bg-sky-400 text-slate-950'
                                    : 'border border-slate-900 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Custom Pwd ({summary.customPasswordSet})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterCategory('default')}
                            className={`press px-3 py-2 font-mono text-xs font-black uppercase transition-all ${
                                filterCategory === 'default'
                                    ? 'shadow-brutal-2 border-2 border-slate-900 bg-amber-300 text-slate-950'
                                    : 'border border-slate-900 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Default Pwd ({summary.usingDefaultPassword})
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="border-3 border-rose-600 bg-rose-50 p-4 font-mono text-xs font-black text-rose-800 uppercase">
                    ⚠️ {error}
                </div>
            )}

            {/* Audit Logs Table */}
            {isLoading ? (
                <div className="shadow-brutal-4 border-3 border-slate-900 bg-white p-12 text-center font-mono text-sm font-black text-slate-600 uppercase">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
                    <span className="mt-3 block">Loading SuperAdmin Security Audit Logs...</span>
                </div>
            ) : filteredList.length === 0 ? (
                <div className="shadow-brutal-4 border-3 border-slate-900 bg-white p-12 text-center font-mono text-sm font-black text-slate-500 uppercase">
                    No matching candidate login records found.
                </div>
            ) : (
                <div className="shadow-brutal-6 overflow-hidden border-4 border-slate-900 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-sans text-xs">
                            <thead className="border-b-3 border-slate-900 bg-slate-900 font-mono text-[11px] font-black text-white uppercase">
                                <tr>
                                    <th className="px-4 py-3.5"># / Candidate</th>
                                    <th className="px-4 py-3.5">Contact Line</th>
                                    <th className="px-4 py-3.5">Track / Package</th>
                                    <th className="px-4 py-3.5">Last Profile Login</th>
                                    <th className="px-4 py-3.5">Login Count</th>
                                    <th className="px-4 py-3.5">Password Status</th>
                                    <th className="px-4 py-3.5">Password Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-200 font-medium">
                                {filteredList.map((item, idx) => {
                                    const formattedLogin = formatDateTime(item.lastLoginAt);
                                    const formattedPwdUpdate = formatDateTime(item.passwordUpdatedAt);

                                    return (
                                        <tr key={item.id} className="hover:bg-amber-50/60">
                                            {/* Candidate Info */}
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                                                    <span className="rounded border border-slate-900 bg-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-black text-slate-950">
                                                        {item.receiptNo || 'CONFIRMED'}
                                                    </span>
                                                </div>
                                                <strong className="mt-1 block text-sm font-black uppercase text-slate-900">
                                                    {item.name}
                                                </strong>
                                                <span className="font-mono text-xs font-bold text-sky-800">
                                                    Roll: {item.rollNo} • {item.department} ({item.year === '1' ? '1st Yr' : '2nd Yr'})
                                                </span>
                                            </td>

                                            {/* Contact Line */}
                                            <td className="px-4 py-3 align-top font-mono text-xs">
                                                <div className="font-bold text-slate-900">{item.email}</div>
                                                <div className="text-slate-600">📱 {item.phone}</div>
                                            </td>

                                            {/* Track / Package */}
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="inline-block rounded border border-slate-900 bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-sky-950">
                                                        {item.packageName || item.package}
                                                    </span>
                                                    {item.package !== 'combo' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpgradeToCombo(item)}
                                                            disabled={actionBusyId === item.id}
                                                            className="press cursor-pointer border border-purple-900 bg-purple-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase hover:bg-purple-300 disabled:opacity-50"
                                                            title="Upgrade candidate profile to Combo package"
                                                        >
                                                            {actionBusyId === item.id ? 'Upgrading…' : '⚡ Upgrade Combo'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Last Login Time */}
                                            <td className="px-4 py-3 align-top">
                                                {formattedLogin ? (
                                                    <div>
                                                        <span className="inline-block rounded border border-slate-900 bg-emerald-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                            ✓ Active Session
                                                        </span>
                                                        <div className="mt-1 font-mono text-xs font-black text-slate-900">
                                                            {formattedLogin}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="inline-block rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500 uppercase">
                                                        Not Logged In Yet
                                                    </span>
                                                )}
                                            </td>

                                            {/* Login Count */}
                                            <td className="px-4 py-3 align-top font-mono">
                                                <strong className="text-sm font-black text-slate-900">{item.loginCount}</strong>
                                                <span className="block text-[10px] text-slate-500">total logins</span>
                                            </td>

                                            {/* Password Status & Custom Password */}
                                            <td className="px-4 py-3 align-top">
                                                {item.isCustomPassword ? (
                                                    <div className="space-y-1">
                                                        <span className="inline-block rounded border border-slate-900 bg-sky-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                            🔒 Custom Password Set
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResetPassword(item)}
                                                            disabled={actionBusyId === item.id}
                                                            className="press block border border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-rose-100 disabled:opacity-50"
                                                            title="Put this participant back on the default password"
                                                        >
                                                            {actionBusyId === item.id ? 'Resetting…' : '↺ Reset to default'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <span className="inline-block rounded border border-slate-900 bg-amber-200 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                            ⚠️ Initial Default (&quot;asterix&quot;)
                                                        </span>
                                                        <div className="font-mono text-xs font-bold text-slate-600">
                                                            Password: <code className="font-black text-slate-900">asterix</code>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Password Updated At */}
                                            <td className="px-4 py-3 align-top font-mono text-xs text-slate-600">
                                                {formattedPwdUpdate ? (
                                                    <span className="font-bold text-slate-900">{formattedPwdUpdate}</span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
