import { useState, useEffect, useCallback } from 'react';
import { useWebsiteData, AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';
import { apiUrl } from '../../lib/api';
import Icon from '../Icon';
import ImageField from './ImageField';
import WorkshopScheduleAdmin from './WorkshopScheduleAdmin';
import WorkshopRegistrationsAdmin from './WorkshopRegistrationsAdmin';
import WorkshopAttendanceAdmin from './WorkshopAttendanceAdmin';
import WorkshopProjectSubmissionsAdmin from './WorkshopProjectSubmissionsAdmin';
import WorkshopNotesAdmin from './WorkshopNotesAdmin';
import QuizAdmin from './QuizAdmin';
import teamLogo from '../../assets/Screenshot 2026-08-26 232320.png';

export default function AdminDashboard({ onExit }) {
    const {
        siteData,
        updateHero,
        updateStory,
        updateContact,
        updateSubsystem,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        moveTeamMember,
        addGalleryItem,
        updateGalleryItem,
        deleteGalleryItem,
        addUpdate,
        updateUpdate,
        deleteUpdate,
        addAccount,
        deleteAccount,
        updateSponsorship,
        syncState,
        syncError,
        syncToServer,
        resetToDefaults,
        loadFromBackup,
        AUTH_SESSION_KEY,
        isServerConnected,
        fetchFromDatabase
    } = useWebsiteData();

    // Authentication state
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY)) || null;
        } catch {
            return null;
        }
    });

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        try {
            return sessionStorage.getItem('admin_active_tab') || 'overview';
        } catch {
            return 'overview';
        }
    });
    const [statusMessage, setStatusMessage] = useState('');
    const [isWorkshopOpen, setIsWorkshopOpen] = useState(true);

    useEffect(() => {
        try {
            sessionStorage.setItem('admin_active_tab', activeTab);
        } catch {
            // ignore storage errors
        }
    }, [activeTab]);

    // Active subsystem selection for squad editor
    const [selectedSubsystemId, setSelectedSubsystemId] = useState(
        siteData.subsystems[0]?.id || 'software-perception'
    );
    const currentSubsystem = (siteData.subsystems &&
        siteData.subsystems.find((s) => s.id === selectedSubsystemId)) ||
        siteData.subsystems?.[0] || {
            id: 'software-perception',
            name: 'Software & Perception',
            badge: 'AI & AUTONOMY',
            tagline: 'Perception, Path Planning & Control Systems',
            fullDesc: '',
            contactEmail: '',
            teamMembers: []
        };

    // Forms state
    const [newMember, setNewMember] = useState({
        name: '',
        role: '',
        phone: '',
        initials: '',
        bio: '',
        badge: 'SPECIALIST',
        photo: '',
        photoFit: 'cover',
        photoPosition: '50% 50%',
        status: 'Active Member'
    });
    const [newGallery, setNewGallery] = useState({
        title: '',
        category: 'PIT LANE',
        year: '2026',
        src: '',
        desc: '',
        fit: 'cover',
        position: '50% 50%'
    });
    const [newUpdateItem, setNewUpdateItem] = useState({
        label: '',
        tag: 'PROVING GROUNDS',
        image: '',
        link: '#',
        fit: 'cover',
        position: '50% 50%'
    });
    const [newAccount, setNewAccount] = useState({
        username: '',
        password: '',
        name: '',
        phone: '',
        role: 'Team Member',
        accessLevel: 'Lead'
    });

    // Alliance Leads, Sponsor Inquiries & Database Accounts State
    const [subscribers, setSubscribers] = useState([]);
    const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
    const [sponsorInquiries, setSponsorInquiries] = useState([]);
    const [isLoadingInquiries, setIsLoadingInquiries] = useState(false);
    const [dbAccounts, setDbAccounts] = useState([]);

    const showStatus = useCallback((msg) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 3500);
    }, []);

    /**
     * Sign-in goes to the server and nowhere else.
     *
     * This was previously a three-tier cascade that, before it ever reached the
     * server, compared the typed password against a plaintext list held in
     * `siteData.accounts` and accepted two hardcoded passwords for `admin`.
     * Both shipped inside the production bundle. The server now holds bcrypt
     * hashes and is the only thing that decides whether a login succeeds.
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);

        const username = (loginForm.username || '').trim();
        const password = (loginForm.password || '').trim();

        const targetUrl = apiUrl('/api/auth/login');
        try {
            console.log(`[Admin Auth] Attempting login to: ${targetUrl}`);
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                console.warn('[Admin Auth] Login rejected with status:', res.status, body);
                setLoginError(body.error || 'Invalid username or password.');
                setIsLoggingIn(false);
                return;
            }

            const data = await res.json();
            setCurrentUser(data.user);
            sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
            sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.user));

            showStatus(`Welcome back, ${data.user.name}!`);
            fetchFromDatabase?.();
        } catch (err) {
            console.error('[Admin Auth] Network / Connection error:', err);
            setLoginError(
                `Could not reach backend at ${targetUrl}. If the server is on Render free tier, it may be waking up from sleep (wait ~30-60s and try again) or verify VITE_API_URL in your hosting settings.`
            );
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem('admin_active_tab');
        setLoginForm({ username: '', password: '' });
    };

    // The JWT from this session's login, or null. It used to fall back to
    // logging in as `admin` with a hardcoded password when no token was
    // present, which put that password in the shipped bundle. Uploads now
    // simply require a real signed-in session.
    const ensureAuthToken = async () => sessionStorage.getItem(AUTH_TOKEN_KEY);

    // Handle file upload (images & PDF documents) exclusively to ImageKit Cloud CDN with custom entity naming
    const handleImageUpload = async (e, callback, folder = '/asterix', customName = '') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (!isImage && !isPdf) {
            alert('Please select a valid image or PDF document (JPEG, PNG, WEBP, PDF)');
            return;
        }

        showStatus('Uploading file to ImageKit Cloud... ⚡');

        let uploadFailure = '';

        const token = await ensureAuthToken();
        if (token) {
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('folder', folder);
                formData.append('tags', isPdf ? 'admin_doc,asterix' : 'admin_upload,asterix');

                if (customName && customName.trim()) {
                    const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
                    const ext = extMatch ? extMatch[0] : isPdf ? '.pdf' : '.jpg';
                    const cleanName = customName
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]+/g, '_')
                        .replace(/^_+|_+$/g, '');
                    if (cleanName) {
                        formData.append('fileName', `${cleanName}${ext}`);
                    }
                }

                const res = await fetch(apiUrl('/api/upload'), {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        const finalUrl = data.url.startsWith('http') ? data.url : apiUrl(data.url);
                        callback(finalUrl);
                        showStatus('Uploaded to ImageKit Cloud CDN! 🍃');
                        e.target.value = '';
                        return finalUrl;
                    }
                    uploadFailure = 'The server accepted the upload but returned no ImageKit URL.';
                } else {
                    const body = await res.json().catch(() => ({}));
                    uploadFailure = body.error || `The server refused the upload (HTTP ${res.status}).`;
                }
            } catch (uploadErr) {
                uploadFailure = uploadErr.message || 'Could not reach the upload server.';
            }
        } else {
            uploadFailure = 'Not signed in to admin session.';
        }

        e.target.value = '';
        alert(`ImageKit upload failed: ${uploadFailure}\nAll photos must be stored in ImageKit.`);
        showStatus(`⚠️ Upload failed: ${uploadFailure}`);
        throw new Error(uploadFailure);
    };

    // Export complete data snapshot as JSON
    const handleDownloadBackup = () => {
        const dataStr =
            'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(siteData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute(
            'download',
            `asterix_backup_${new Date().toISOString().slice(0, 10)}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showStatus('Backup snapshot downloaded successfully! ✓');
    };

    // Restore data from JSON backup file
    const handleRestoreBackup = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed && typeof parsed === 'object') {
                    if (
                        !window.confirm(
                            'Restore this backup? It replaces ALL current site content (hero, subsystems, team, workshop schedule, etc.) and cannot be undone.'
                        )
                    ) {
                        e.target.value = '';
                        return;
                    }
                    loadFromBackup(parsed);
                    showStatus('Backup restored successfully! ✓');
                } else {
                    alert('Invalid backup JSON file.');
                }
            } catch {
                alert('Could not parse backup file.');
            }
        };
        reader.readAsText(file);
    };

    // Fetch Alliance Subscribers from database with optional silent refresh
    const fetchSubscribers = useCallback(async (isSilent = false) => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        if (!isSilent) setIsLoadingSubscribers(true);
        try {
            const res = await fetch(apiUrl('/api/subscribers'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                setSubscribers(list);
            }
        } catch (err) {
            console.warn('Failed to fetch subscribers:', err);
        } finally {
            if (!isSilent) setIsLoadingSubscribers(false);
        }
    }, []);

    // Delete single subscriber
    const handleDeleteSubscriber = async (id) => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const res = await fetch(apiUrl(`/api/subscribers/${id}`), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setSubscribers((prev) => prev.filter((s) => s.id !== id));
                showStatus('Subscriber removed.');
            }
        } catch (err) {
            console.error('Failed to delete subscriber:', err);
        }
    };

    // Export subscribers as CSV
    const handleExportSubscribersCSV = () => {
        if (!subscribers.length) return;
        const header = ['Email', 'Phone', 'Joined Date'].join(',');
        const rows = subscribers.map((s) => `"${s.email}","${s.phone || ''}","${s.created_at || ''}"`);
        const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `asterix_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatus('Subscribers CSV exported successfully!');
    };

    // Fetch sponsor inquiries from database with optional silent refresh
    const fetchInquiries = useCallback(async (isSilent = false) => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        if (!isSilent) setIsLoadingInquiries(true);
        try {
            const res = await fetch(apiUrl('/api/sponsor-inquiries'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                setSponsorInquiries(list);
            }
        } catch (err) {
            console.warn('Failed to fetch inquiries:', err);
        } finally {
            if (!isSilent) setIsLoadingInquiries(false);
        }
    }, []);

    const handleUpdateInquiryStatus = async (id, status) => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const res = await fetch(apiUrl(`/api/sponsor-inquiries/${id}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setSponsorInquiries((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, status } : item))
                );
                showStatus(`Inquiry marked as ${status}`);
            }
        } catch (err) {
            console.error('Failed to update inquiry status:', err);
        }
    };

    const handleDeleteInquiry = async (id) => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const res = await fetch(apiUrl(`/api/sponsor-inquiries/${id}`), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setSponsorInquiries((prev) => prev.filter((i) => i.id !== id));
                showStatus('Inquiry removed.');
            }
        } catch (err) {
            console.error('Failed to delete inquiry:', err);
        }
    };

    // Fetch accounts from database
    const fetchAccounts = useCallback(async () => {
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const res = await fetch(apiUrl('/api/auth/accounts'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                setDbAccounts(list);
            }
        } catch (err) {
            console.warn('Failed to fetch DB accounts:', err);
        }
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        const refreshTabContent = (isSilent = false) => {
            if (activeTab === 'subscribers') {
                fetchSubscribers(isSilent);
            }
            if (activeTab === 'sponsorship') {
                fetchInquiries(isSilent);
            }
            if (activeTab === 'accounts') {
                fetchAccounts();
            }
        };

        // Initial fetch on tab change
        refreshTabContent(false);

        // Live polling every 4 seconds
        const pollTimer = setInterval(() => {
            refreshTabContent(true);
        }, 4000);

        // Immediate refresh on tab focus / visibility change
        const handleFocus = () => refreshTabContent(true);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            clearInterval(pollTimer);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [currentUser, activeTab, fetchSubscribers, fetchInquiries, fetchAccounts]);
    // If not authenticated, render Login Screen
    if (!currentUser) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 selection:bg-sky-500 selection:text-white">
                <div className="shadow-brutal-8 w-full max-w-md border-4 border-slate-900 bg-white p-8">
                    <div className="mb-6 text-center">
                        <span className="mb-1 block font-mono text-[11px] font-black tracking-wider text-sky-700 uppercase">
                            RESTRICTED ACCESS
                        </span>
                        <h1 className="text-2xl font-black text-slate-900 uppercase sm:text-3xl">
                            ASTERIX ADMIN PORTAL
                        </h1>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Sign in to manage website content, media & team accounts.
                        </p>
                    </div>

                    {loginError && (
                        <div className="mb-4 border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-700">
                            {loginError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                Username
                            </label>
                            <input
                                type="text"
                                value={loginForm.username}
                                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                placeholder="e.g. admin"
                                required
                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:bg-white focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                Password
                            </label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                placeholder="••••••••"
                                required
                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:bg-white focus:outline-none"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="press shadow-brutal-3 hover:shadow-brutal-5 w-full cursor-pointer border-2 border-slate-900 bg-sky-500 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-sky-400 disabled:opacity-50"
                            >
                                {isLoggingIn ? 'Verifying Credentials...' : 'Login to Dashboard →'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 flex items-center justify-between border-t-2 border-slate-200 pt-4 font-mono text-[11px] font-bold text-slate-500">
                        <button
                            onClick={onExit}
                            className="press press-flat cursor-pointer text-sky-700 underline hover:text-slate-900"
                        >
                            ← Back to Website
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isAdmin =
        currentUser &&
        (currentUser.accessLevel === 'Admin' ||
            currentUser.accessLevel === 'SuperAdmin' ||
            currentUser.role === 'Admin' ||
            currentUser.role === 'SuperAdmin');
    // Matches the server's requireSuperAdmin, which reads accessLevel only.
    const isSuperAdmin = currentUser?.accessLevel === 'SuperAdmin';

    const tabs = [
        { id: 'overview', label: 'Overview', icon: 'overview' },
        { id: 'hero', label: 'Hero & Branding', icon: 'edit' },
        { id: 'story', label: 'Our Story', icon: 'book' },
        { id: 'subsystems', label: 'Subsystems & Squad', icon: 'vehicle' },
        { id: 'sponsorship', label: 'Sponsorship Portal', icon: 'folder' },
        {
            id: 'workshop-group',
            label: 'WORKSHOP MANAGEMENT',
            isGroup: true,
            icon: 'calendar',
            children: [
                { id: 'workshop-schedule', label: 'Workshop Schedule', icon: 'calendar' },
                { id: 'workshop-registrations', label: 'Workshop Registrations & Paid', icon: 'users' },
                { id: 'workshop-attendance', label: 'Workshop Attendance', icon: 'users' },
                { id: 'workshop-notes', label: 'Workshop Notes', icon: 'book' },
                { id: 'workshop-project-submissions', label: 'Workshop Project Submissions', icon: 'folder' },
                { id: 'quiz-manager', label: 'MCQ Quiz Engine', icon: 'clipboard' }
            ]
        },
        { id: 'gallery', label: 'Media Gallery', icon: 'camera' },
        { id: 'updates', label: 'Team Updates', icon: 'megaphone' },
        { id: 'subscribers', label: 'Alliance Leads', icon: 'inbox' },
        { id: 'accounts', label: 'Team Accounts', icon: 'users' },
        { id: 'settings', label: 'Settings & Backup', icon: 'settings' }
    ];

    return (
        <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 select-text selection:bg-sky-500 selection:text-white">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b-4 border-slate-900 bg-white px-4 py-3 sm:px-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onExit}
                        className="press press-flat group flex flex-shrink-0 cursor-pointer items-center text-left focus:outline-none"
                        title="Return to Live Website Homepage"
                    >
                        <img
                            loading="lazy"
                            decoding="async"
                            src={teamLogo}
                            alt="Team Asterix"
                            className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                        />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base leading-none font-black text-slate-900 uppercase sm:text-lg">
                                ASTERIX MANAGEMENT CONSOLE
                            </h1>
                            <span
                                className={`border border-slate-900 px-2 py-0.5 font-mono text-[9px] font-black uppercase ${
                                    syncState === 'synced'
                                        ? 'bg-emerald-300 text-slate-900'
                                        : syncState === 'saving'
                                          ? 'animate-pulse bg-sky-300 text-slate-900'
                                          : syncState === 'error'
                                            ? 'bg-amber-300 text-slate-900'
                                            : isServerConnected
                                              ? 'bg-emerald-300 text-slate-900'
                                              : 'bg-slate-200 text-slate-700'
                                }`}
                                title={syncError || 'Data synced with cloud database'}
                            >
                                {syncState === 'saving'
                                    ? '⟳ Saving to Cloud...'
                                    : syncState === 'synced'
                                      ? '● Cloud Synced'
                                      : syncState === 'error'
                                        ? '⚠️ Local (Cloud Quota Exceeded)'
                                        : isServerConnected
                                          ? '● Online'
                                          : '○ Local Cache'}
                            </span>
                            <span className="flex items-center gap-1.5 border border-emerald-400 bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-emerald-800 uppercase">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                                LIVE REFRESH ACTIVE
                            </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                            Logged in as: <strong className="text-slate-900">{currentUser.name}</strong> (
                            {currentUser.accessLevel})
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {statusMessage && (
                        <span className="hidden border border-emerald-600 bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-800 sm:inline-block">
                            ✓ {statusMessage}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={async () => {
                            showStatus('Pushing changes to Cloud Database...');
                            const ok = await syncToServer(siteData);
                            if (ok) {
                                showStatus('All changes synced to Cloud Database! ✓');
                            } else {
                                showStatus(
                                    syncError ||
                                        'Could not save to Cloud. Edits are preserved safely in browser.'
                                );
                            }
                        }}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-emerald-400 px-3.5 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300"
                        title="Push current modifications to Cloud Database"
                    >
                        ☁ Sync Cloud
                    </button>

                    <button
                        onClick={onExit}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-amber-300 px-3.5 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-amber-400"
                    >
                        View Live Site ↗
                    </button>

                    <button
                        onClick={handleLogout}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-slate-100 px-3.5 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-200"
                    >
                        Log Out
                    </button>
                </div>
            </header>

            {/* Main Workspace Layout */}
            <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-4">
                {/* Sidebar Navigation */}
                <aside className="shadow-brutal-6 flex h-fit flex-col gap-1.5 border-4 border-slate-900 bg-white p-4 md:col-span-1">
                    <span className="mb-2 block px-2 font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase">
                        // NAVIGATION
                    </span>
                    {tabs.map((tab) => {
                        if (tab.isGroup) {
                            const isAnyChildActive = tab.children.some((c) => c.id === activeTab);
                            return (
                                <div key={tab.id} className="my-0.5 flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsWorkshopOpen((prev) => {
                                                const next = !prev;
                                                if (next && !activeTab.startsWith('workshop-')) {
                                                    setActiveTab('workshop-schedule');
                                                }
                                                return next;
                                            });
                                        }}
                                        className={`press press-flat flex w-full cursor-pointer items-center justify-between gap-2 border-2 px-3.5 py-2.5 text-left font-mono text-xs font-black uppercase transition-colors ${
                                            isAnyChildActive
                                                ? 'shadow-brutal-2 border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-900 bg-slate-100 text-slate-900 hover:bg-sky-100'
                                        }`}
                                        aria-expanded={isWorkshopOpen}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon name={tab.icon} className="h-4 w-4" />
                                            <span>{tab.label}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                                    isAnyChildActive
                                                        ? 'border-sky-300 bg-sky-400 text-slate-900'
                                                        : 'border-slate-400 bg-white text-slate-700'
                                                }`}
                                            >
                                                {tab.children.length}
                                            </span>
                                            <span className="text-[10px] leading-none font-black">
                                                {isWorkshopOpen ? '▲' : '▼'}
                                            </span>
                                        </span>
                                    </button>

                                    {isWorkshopOpen && (
                                        <div className="my-1 ml-1 flex flex-col gap-1 border-l-2 border-slate-300 pl-2">
                                            {tab.children.map((child) => {
                                                const isTabRestricted = child.adminOnly && !isAdmin;
                                                const isActive = activeTab === child.id;
                                                return (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => setActiveTab(child.id)}
                                                        className={`press press-flat flex w-full cursor-pointer items-center justify-between gap-2 border-2 px-3 py-2 text-left font-mono text-[11px] uppercase transition-all ${
                                                            isActive
                                                                ? 'shadow-brutal-2 translate-x-1 border-slate-900 bg-sky-500 font-black text-slate-950'
                                                                : 'border-transparent bg-white font-bold text-slate-800 hover:border-slate-300 hover:bg-sky-50'
                                                        }`}
                                                        aria-current={isActive ? 'page' : undefined}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Icon name={child.icon} className="h-3.5 w-3.5" />
                                                            <span>{child.label}</span>
                                                        </span>
                                                        {isTabRestricted ? (
                                                            <span className="border border-amber-400 bg-amber-100 px-1 py-0.5 font-mono text-[8px] font-black text-amber-700">
                                                                ADMIN
                                                            </span>
                                                        ) : (
                                                            <span aria-hidden="true" className="text-xs">
                                                                →
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const isTabRestricted = tab.adminOnly && !isAdmin;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`press press-flat flex w-full cursor-pointer items-center justify-between gap-2 border-2 px-3.5 py-2.5 text-left font-mono text-xs font-black uppercase ${
                                    activeTab === tab.id
                                        ? 'shadow-brutal-2 translate-x-1 border-slate-900 bg-sky-500 text-slate-950'
                                        : 'border-transparent bg-white text-slate-800 hover:border-slate-300 hover:bg-sky-50'
                                }`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon name={tab.icon} className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                </span>
                                {isTabRestricted ? (
                                    <span className="border border-amber-400 bg-amber-100 px-1 py-0.5 font-mono text-[8px] font-black text-amber-700">
                                        ADMIN
                                    </span>
                                ) : (
                                    <span aria-hidden="true">→</span>
                                )}
                            </button>
                        );
                    })}

                    <div className="mt-6 border-t-2 border-slate-200 pt-4">
                        <div className="space-y-1 font-mono text-[10px] text-slate-500">
                            <div>
                                •{' '}
                                {isServerConnected
                                    ? '✓ Database connected (MongoDB Atlas)'
                                    : '• Local browser cache'}
                            </div>
                            <div>• {siteData.subsystems.length} Subsystems active</div>
                            <div>• {siteData.gallery.length} Gallery items</div>
                            <div>• {subscribers.length} Alliance leads captured</div>
                        </div>
                    </div>
                </aside>

                {/* Content Workspace Area */}
                <main className="shadow-brutal-6 border-4 border-slate-900 bg-white p-6 sm:p-8 md:col-span-3">
                    {/* TAB 1: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Website Overview
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Last synchronized: {new Date(siteData.lastModified).toLocaleString()}
                                </p>
                            </div>

                            {/* Key Stats Cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                                <div className="shadow-brutal-3 border-2 border-slate-900 bg-sky-50 p-4">
                                    <span className="block font-mono text-[10px] font-black text-sky-700 uppercase">
                                        Subsystems
                                    </span>
                                    <span className="text-3xl font-black text-slate-900">
                                        {siteData.subsystems.length}
                                    </span>
                                </div>
                                <div className="shadow-brutal-3 border-2 border-slate-900 bg-amber-50 p-4">
                                    <span className="block font-mono text-[10px] font-black text-amber-600 uppercase">
                                        Specialists
                                    </span>
                                    <span className="text-3xl font-black text-slate-900">
                                        {siteData.subsystems.reduce(
                                            (sum, s) => sum + (s.teamMembers?.length || 0),
                                            0
                                        )}
                                    </span>
                                </div>
                                <div className="shadow-brutal-3 border-2 border-slate-900 bg-emerald-50 p-4">
                                    <span className="block font-mono text-[10px] font-black text-emerald-600 uppercase">
                                        Gallery
                                    </span>
                                    <span className="text-3xl font-black text-slate-900">
                                        {siteData.gallery.length}
                                    </span>
                                </div>
                                <div className="shadow-brutal-3 border-2 border-slate-900 bg-rose-50 p-4">
                                    <span className="block font-mono text-[10px] font-black text-rose-600 uppercase">
                                        Updates
                                    </span>
                                    <span className="text-3xl font-black text-slate-900">
                                        {siteData.updates.length}
                                    </span>
                                </div>
                                <div className="shadow-brutal-3 border-2 border-slate-900 bg-indigo-50 p-4">
                                    <span className="block font-mono text-[10px] font-black text-indigo-600 uppercase">
                                        Leads
                                    </span>
                                    <span className="text-3xl font-black text-slate-900">
                                        {subscribers.length}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Action Shortcuts */}
                            <div className="mt-8 space-y-3">
                                <span className="block font-mono text-xs font-black text-slate-900 uppercase">
                                    Quick Shortcuts:
                                </span>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <button
                                        onClick={() => setActiveTab('hero')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>Edit Hero Headline & Badges</span>
                                        <span>→</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('subsystems')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>Add / Edit Squad Members</span>
                                        <span>→</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('subscribers')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>View Alliance Newsletter Leads ({subscribers.length})</span>
                                        <span>→</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('gallery')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>Add New Photo to DriftWall Gallery</span>
                                        <span>→</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('sponsorship')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>Manage Sponsorship Documents & Inquiries</span>
                                        <span>→</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('workshop-schedule')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>Manage Workshop Details, Timings & Venue</span>
                                        <span>→</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('quiz-manager')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-emerald-50 p-3 text-left font-mono text-xs font-bold hover:bg-emerald-100"
                                    >
                                        <span>Manage MCQ Quizzes, Questions & Leaderboards</span>
                                        <span>→</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('accounts')}
                                        className="press press-flat flex cursor-pointer items-center justify-between border-2 border-slate-900 bg-slate-50 p-3 text-left font-mono text-xs font-bold hover:bg-sky-50"
                                    >
                                        <span>Manage Member Login Credentials</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: HERO & GENERAL CONTENT */}
                    {activeTab === 'hero' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Hero Section & Branding
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Modify the landing title, tagline, ranking badges, and links.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Top Title Line
                                        </label>
                                        <input
                                            type="text"
                                            value={siteData.hero.teamTitle}
                                            onChange={(e) => updateHero({ teamTitle: e.target.value })}
                                            className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Main Brand Name
                                        </label>
                                        <input
                                            type="text"
                                            value={siteData.hero.teamName}
                                            onChange={(e) => updateHero({ teamName: e.target.value })}
                                            className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Hero Tagline / Subtitle
                                    </label>
                                    <input
                                        type="text"
                                        value={siteData.hero.tagline}
                                        onChange={(e) => updateHero({ tagline: e.target.value })}
                                        className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-2 text-sm font-bold"
                                    />
                                </div>

                                <div className="border-t-2 border-slate-200 pt-4">
                                    <span className="mb-2 block font-mono text-xs font-black text-slate-900 uppercase">
                                        Hero Ranking Badges:
                                    </span>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        {siteData.hero.badges.map((badge, idx) => (
                                            <div
                                                key={idx}
                                                className="border-2 border-slate-900 bg-slate-50 p-3"
                                            >
                                                <span className="mb-1 block font-mono text-[10px] text-slate-500 uppercase">
                                                    Badge #{idx + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={badge.label}
                                                    onChange={(e) => {
                                                        const updated = [...siteData.hero.badges];
                                                        updated[idx] = {
                                                            ...updated[idx],
                                                            label: e.target.value
                                                        };
                                                        updateHero({ badges: updated });
                                                    }}
                                                    className="w-full border border-slate-900 bg-white px-2 py-1 font-mono text-xs font-bold"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="space-y-3 border-t-2 border-slate-200 pt-6">
                                    <h3 className="font-mono text-sm font-black text-slate-900 uppercase">
                                        Official Contact & Social Channels
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={siteData.contact.email}
                                                onChange={(e) => updateContact({ email: e.target.value })}
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600">
                                                Official Phone / Helpline
                                            </label>
                                            <input
                                                type="text"
                                                value={siteData.contact.phone || ''}
                                                onChange={(e) => updateContact({ phone: e.target.value })}
                                                placeholder="+91 86089 44644"
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600">
                                                Campus Location
                                            </label>
                                            <input
                                                type="text"
                                                value={siteData.contact.address}
                                                onChange={(e) => updateContact({ address: e.target.value })}
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600">
                                                Instagram URL
                                            </label>
                                            <input
                                                type="text"
                                                value={siteData.contact.instagramUrl}
                                                onChange={(e) =>
                                                    updateContact({ instagramUrl: e.target.value })
                                                }
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600">
                                                LinkedIn URL
                                            </label>
                                            <input
                                                type="text"
                                                value={siteData.contact.linkedinUrl}
                                                onChange={(e) =>
                                                    updateContact({ linkedinUrl: e.target.value })
                                                }
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block font-mono text-[11px] font-bold text-slate-600">
                                                GitHub URL
                                            </label>
                                            <input
                                                type="text"
                                                value={siteData.contact.githubUrl}
                                                onChange={(e) => updateContact({ githubUrl: e.target.value })}
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: OUR STORY */}
                    {activeTab === 'story' && (
                        <div className="space-y-4">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Our Story Narrative
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Edit the origin essay displayed on the landing page. (Supports
                                    paragraphs).
                                </p>
                            </div>

                            <textarea
                                value={siteData.story}
                                onChange={(e) => updateStory(e.target.value)}
                                rows={18}
                                className="w-full border-2 border-slate-900 bg-slate-50 p-4 font-mono text-xs leading-relaxed focus:bg-white focus:outline-none"
                            />

                            <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-500">
                                <span>
                                    {siteData.story.length} Characters • ~
                                    {siteData.story.split(/\s+/).filter(Boolean).length} Words
                                </span>
                                <button
                                    onClick={() => showStatus('Story updated and saved!')}
                                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-500 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase"
                                >
                                    Save Story Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SUBSYSTEMS & SQUAD MEMBERS */}
                    {activeTab === 'subsystems' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Subsystem & Squad Roster
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Manage technical specs, subsystem descriptions, specialist tags and
                                    portraits. Each member's downloadable badge is generated from these
                                    fields.
                                </p>
                            </div>

                            {/* Subsystem Selector Pills */}
                            <div className="flex flex-wrap gap-2">
                                {siteData.subsystems.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSubsystemId(s.id)}
                                        className={`cursor-pointer border-2 border-slate-900 px-3 py-1.5 font-mono text-xs font-black uppercase transition-all ${
                                            selectedSubsystemId === s.id
                                                ? 'shadow-brutal-2-bright bg-slate-900 text-white'
                                                : 'bg-white text-slate-800 hover:bg-slate-100'
                                        }`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>

                            {/* Active Subsystem Fields */}
                            <div className="space-y-4 border-2 border-slate-900 bg-slate-50 p-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Subsystem Title
                                        </label>
                                        <input
                                            type="text"
                                            value={currentSubsystem.name}
                                            onChange={(e) =>
                                                updateSubsystem(currentSubsystem.id, { name: e.target.value })
                                            }
                                            className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Category Badge
                                        </label>
                                        <input
                                            type="text"
                                            value={currentSubsystem.badge}
                                            onChange={(e) =>
                                                updateSubsystem(currentSubsystem.id, {
                                                    badge: e.target.value
                                                })
                                            }
                                            className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Short Pitch / Tagline
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSubsystem.tagline}
                                        onChange={(e) =>
                                            updateSubsystem(currentSubsystem.id, { tagline: e.target.value })
                                        }
                                        className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Technical Description
                                    </label>
                                    <textarea
                                        value={currentSubsystem.fullDesc}
                                        onChange={(e) =>
                                            updateSubsystem(currentSubsystem.id, { fullDesc: e.target.value })
                                        }
                                        rows={4}
                                        className="w-full border-2 border-slate-900 bg-white p-3 font-mono text-xs leading-relaxed"
                                    />
                                </div>

                                {/* The address the subsystem page offers for questions.
                                    The page used to carry a hardcoded contact@teamasterix.org
                                    that nobody reads; it now shows whatever is typed here, and
                                    shows nothing at all while this is blank. */}
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Mailing Address for {currentSubsystem.name} Enquiries
                                    </label>
                                    <input
                                        type="email"
                                        value={currentSubsystem.contactEmail || ''}
                                        onChange={(e) =>
                                            updateSubsystem(currentSubsystem.id, {
                                                contactEmail: e.target.value
                                            })
                                        }
                                        placeholder="e.g. software.asterix@psgitech.ac.in — leave blank to hide the contact line entirely"
                                        className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                    <p className="mt-1 font-mono text-[10px] font-bold text-slate-500">
                                        Shown on the public {currentSubsystem.name} page as a mail link for
                                        this subsystem&apos;s engineers. Blank means no contact line is
                                        rendered.
                                    </p>
                                </div>
                            </div>

                            {/* Suggestions only. The tag stays free text so a new
                                discipline does not need a code change to be named. */}
                            <datalist id="asterix-specialist-tags">
                                {[
                                    ...new Set([
                                        'SUBSYSTEM LEAD',
                                        'SPECIALIST',
                                        'PERCEPTION',
                                        'CONTROLS',
                                        'EMBEDDED',
                                        'POWERTRAIN',
                                        'CHASSIS',
                                        'SUSPENSION',
                                        'MANUFACTURING',
                                        'ALUMNI LEAD',
                                        ...siteData.subsystems.flatMap((s) =>
                                            (s.teamMembers || []).map((m) => m.badge).filter(Boolean)
                                        )
                                    ])
                                ].map((tag) => (
                                    <option key={tag} value={tag} />
                                ))}
                            </datalist>

                            {/* Team Members List in this Subsystem */}
                            <div className="space-y-4 border-t-2 border-slate-200 pt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-mono text-sm font-black text-slate-900 uppercase">
                                        Specialists in {currentSubsystem.name} (
                                        {currentSubsystem.teamMembers?.length || 0})
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {(currentSubsystem.teamMembers || []).map((m, idx) => (
                                        <div
                                            key={idx}
                                            className="shadow-brutal-3 relative flex flex-col justify-between border-2 border-slate-900 bg-white p-3.5"
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                                <span className="font-mono text-[10px] font-black text-sky-700 uppercase">
                                                    # Pos {idx + 1} of {currentSubsystem.teamMembers.length}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() =>
                                                            moveTeamMember(currentSubsystem.id, idx, idx - 1)
                                                        }
                                                        className="press cursor-pointer border border-slate-900 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100 disabled:opacity-30"
                                                        title="Move Up in UI"
                                                    >
                                                        ▲ Up
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            idx === currentSubsystem.teamMembers.length - 1
                                                        }
                                                        onClick={() =>
                                                            moveTeamMember(currentSubsystem.id, idx, idx + 1)
                                                        }
                                                        className="press cursor-pointer border border-slate-900 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100 disabled:opacity-30"
                                                        title="Move Down in UI"
                                                    >
                                                        ▼ Down
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    `Remove ${m.name || 'this member'} from ${currentSubsystem.name || 'this subsystem'}?`
                                                                )
                                                            )
                                                                deleteTeamMember(currentSubsystem.id, idx);
                                                        }}
                                                        className="press cursor-pointer border border-slate-900 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-black text-rose-600 uppercase hover:bg-rose-100"
                                                        title="Delete Member"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2.5">
                                                {/* Photo, with the crop shown in the frames the
                                                    site really uses rather than in a 56px square. */}
                                                <ImageField
                                                    label={`${m.name || 'Specialist'} — portrait`}
                                                    value={m.photo || ''}
                                                    fit={m.photoFit}
                                                    position={m.photoPosition}
                                                    frames="member"
                                                    folder="/asterix/squad"
                                                    onUpload={(e, cb, f) =>
                                                        handleImageUpload(e, cb, f, m.name || 'specialist')
                                                    }
                                                    onChange={(fields) =>
                                                        updateTeamMember(currentSubsystem.id, idx, {
                                                            ...(fields.url !== undefined
                                                                ? { photo: fields.url }
                                                                : {}),
                                                            ...(fields.fit !== undefined
                                                                ? { photoFit: fields.fit }
                                                                : {}),
                                                            ...(fields.position !== undefined
                                                                ? { photoPosition: fields.position }
                                                                : {})
                                                        })
                                                    }
                                                />

                                                <input
                                                    type="text"
                                                    value={m.name}
                                                    onChange={(e) =>
                                                        updateTeamMember(currentSubsystem.id, idx, {
                                                            name: e.target.value
                                                        })
                                                    }
                                                    placeholder="Member Name"
                                                    className="w-full border-b border-slate-300 pb-0.5 text-sm font-black focus:border-slate-900 focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={m.role}
                                                    onChange={(e) =>
                                                        updateTeamMember(currentSubsystem.id, idx, {
                                                            role: e.target.value
                                                        })
                                                    }
                                                    placeholder="Role Title"
                                                    className="w-full border-b border-slate-200 pb-0.5 font-mono text-xs font-bold text-sky-700 focus:border-slate-900 focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={m.phone || ''}
                                                    onChange={(e) =>
                                                        updateTeamMember(currentSubsystem.id, idx, {
                                                            phone: e.target.value
                                                        })
                                                    }
                                                    placeholder="Phone / Mobile (e.g. +91 98765 43210)"
                                                    className="w-full border-b border-slate-200 pb-0.5 font-mono text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none"
                                                />

                                                {/* The corner tag on the public member card. It was
                                                    settable when adding a specialist and then frozen
                                                    forever, so a promotion could not be reflected. */}
                                                <div className="flex items-center gap-2">
                                                    <span className="shrink-0 font-mono text-[10px] font-black text-slate-500 uppercase">
                                                        Tag:
                                                    </span>
                                                    <input
                                                        type="text"
                                                        list="asterix-specialist-tags"
                                                        value={m.badge || ''}
                                                        onChange={(e) =>
                                                            updateTeamMember(currentSubsystem.id, idx, {
                                                                badge: e.target.value.toUpperCase()
                                                            })
                                                        }
                                                        placeholder="SPECIALIST"
                                                        className="min-w-0 flex-1 border-2 border-slate-900 bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-black uppercase focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-[10px] font-black text-slate-500 uppercase">
                                                            Status:
                                                        </span>
                                                        <select
                                                            value={m.status || 'Active Member'}
                                                            onChange={(e) =>
                                                                updateTeamMember(currentSubsystem.id, idx, {
                                                                    status: e.target.value
                                                                })
                                                            }
                                                            className={`cursor-pointer border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black ${
                                                                m.status === 'Alumni'
                                                                    ? 'bg-amber-100 text-amber-900'
                                                                    : 'bg-sky-100 text-sky-900'
                                                            }`}
                                                        >
                                                            <option value="Active Member">
                                                                Active Member
                                                            </option>
                                                            <option value="Alumni">Alumni</option>
                                                        </select>
                                                    </div>
                                                    <span
                                                        className={`border border-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                                            m.status === 'Alumni'
                                                                ? 'bg-amber-300 text-amber-950'
                                                                : 'bg-sky-300 text-sky-950'
                                                        }`}
                                                    >
                                                        {m.status === 'Alumni' ? '★ ALUMNI' : '● ACTIVE'}
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={m.bio}
                                                    onChange={(e) =>
                                                        updateTeamMember(currentSubsystem.id, idx, {
                                                            bio: e.target.value
                                                        })
                                                    }
                                                    placeholder="Bio / Responsibilities"
                                                    rows={2}
                                                    className="w-full border border-slate-200 p-1.5 font-mono text-[11px] text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add New Member Form */}
                                <div className="space-y-3 border-2 border-slate-900 bg-sky-50 p-4">
                                    <span className="block font-mono text-xs font-black text-slate-900 uppercase">
                                        + Add New Specialist to {currentSubsystem.name}
                                    </span>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                        <input
                                            type="text"
                                            value={newMember.name}
                                            onChange={(e) =>
                                                setNewMember({ ...newMember, name: e.target.value })
                                            }
                                            placeholder="Specialist Full Name"
                                            className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold"
                                        />
                                        <input
                                            type="text"
                                            value={newMember.role}
                                            onChange={(e) =>
                                                setNewMember({ ...newMember, role: e.target.value })
                                            }
                                            placeholder="Role / Title"
                                            className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold"
                                        />
                                        <input
                                            type="text"
                                            value={newMember.phone || ''}
                                            onChange={(e) =>
                                                setNewMember({ ...newMember, phone: e.target.value })
                                            }
                                            placeholder="Phone Number"
                                            className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={newMember.badge}
                                            onChange={(e) =>
                                                setNewMember({ ...newMember, badge: e.target.value })
                                            }
                                            placeholder="Badge (e.g. SPECIALIST)"
                                            className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                        />
                                        <select
                                            value={newMember.status || 'Active Member'}
                                            onChange={(e) =>
                                                setNewMember({ ...newMember, status: e.target.value })
                                            }
                                            className="cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-bold"
                                        >
                                            <option value="Active Member">Active Member</option>
                                            <option value="Alumni">Alumni</option>
                                        </select>
                                    </div>

                                    {/* Member Photo Input */}
                                    <ImageField
                                        label="Specialist portrait"
                                        value={newMember.photo}
                                        fit={newMember.photoFit}
                                        position={newMember.photoPosition}
                                        frames="member"
                                        folder="/asterix/squad"
                                        onUpload={(e, cb, f) =>
                                            handleImageUpload(e, cb, f, newMember.name || 'specialist')
                                        }
                                        onChange={(fields) =>
                                            setNewMember((prev) => ({
                                                ...prev,
                                                ...(fields.url !== undefined ? { photo: fields.url } : {}),
                                                ...(fields.fit !== undefined ? { photoFit: fields.fit } : {}),
                                                ...(fields.position !== undefined
                                                    ? { photoPosition: fields.position }
                                                    : {})
                                            }))
                                        }
                                    />

                                    <textarea
                                        value={newMember.bio}
                                        onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}
                                        placeholder="Engineering focus & responsibilities..."
                                        rows={2}
                                        className="w-full border-2 border-slate-900 bg-white p-2 font-mono text-xs"
                                    />
                                    <button
                                        onClick={() => {
                                            if (!newMember.name.trim())
                                                return alert('Please enter specialist name');
                                            const initials =
                                                newMember.name
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .join('')
                                                    .slice(0, 2)
                                                    .toUpperCase() || 'TM';
                                            addTeamMember(currentSubsystem.id, { ...newMember, initials });
                                            setNewMember({
                                                name: '',
                                                role: '',
                                                phone: '',
                                                initials: '',
                                                bio: '',
                                                badge: 'SPECIALIST',
                                                photo: '',
                                                photoFit: 'cover',
                                                photoPosition: '50% 50%',
                                                status: 'Active Member'
                                            });
                                            showStatus('New specialist added with photo & status!');
                                        }}
                                        className="press press-flat cursor-pointer bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                                    >
                                        Add Specialist →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: SPONSORSHIP PORTAL */}
                    {activeTab === 'sponsorship' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Sponsorship Portal & Deck Files
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Configure downloadable pitch files, brochures, and partnership documents
                                    displayed on #sponsor.
                                </p>
                            </div>

                            <div className="shadow-brutal-6 space-y-6 border-4 border-slate-900 bg-white p-6">
                                {/* 1. Brochure */}
                                <div className="space-y-2 border-2 border-slate-900 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block font-mono text-xs font-black text-slate-800 uppercase">
                                            1. Official Sponsorship Proposal Brochure (PDF)
                                        </label>
                                        {siteData.sponsorship?.brochureUrl && (
                                            <a
                                                href={siteData.sponsorship.brochureUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono text-[11px] font-black text-sky-700 underline hover:text-sky-800"
                                            >
                                                Preview Document ↗
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="text"
                                            value={siteData.sponsorship?.brochureUrl || ''}
                                            onChange={(e) =>
                                                updateSponsorship({ brochureUrl: e.target.value })
                                            }
                                            placeholder="Paste document URL, or upload below (blank uses default auto-generator)"
                                            className="flex-1 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs focus:outline-none"
                                        />
                                        <label className="press flex shrink-0 cursor-pointer items-center justify-center bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800">
                                            <span>Upload PDF ↑</span>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                onChange={(e) =>
                                                    handleImageUpload(
                                                        e,
                                                        (url) => updateSponsorship({ brochureUrl: url }),
                                                        '/asterix/docs',
                                                        'sponsorship_brochure'
                                                    )
                                                }
                                                className="hidden"
                                            />
                                        </label>
                                        {siteData.sponsorship?.brochureUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Clear the brochure link and fall back to the default document?'
                                                        )
                                                    )
                                                        updateSponsorship({ brochureUrl: '' });
                                                }}
                                                className="press shrink-0 cursor-pointer border-2 border-slate-900 bg-rose-100 px-3 py-2 font-mono text-xs font-black text-rose-800 uppercase hover:bg-rose-200"
                                                title="Reset to default auto-generated document"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Pitch Deck */}
                                <div className="space-y-2 border-2 border-slate-900 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block font-mono text-xs font-black text-slate-800 uppercase">
                                            2. Vehicle Technical Architecture Pitch Deck (PDF / Presentation)
                                        </label>
                                        {siteData.sponsorship?.deckUrl && (
                                            <a
                                                href={siteData.sponsorship.deckUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono text-[11px] font-black text-sky-700 underline hover:text-sky-800"
                                            >
                                                Preview Document ↗
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="text"
                                            value={siteData.sponsorship?.deckUrl || ''}
                                            onChange={(e) => updateSponsorship({ deckUrl: e.target.value })}
                                            placeholder="Paste deck URL, or upload file below (blank uses default tech brief)"
                                            className="flex-1 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs focus:outline-none"
                                        />
                                        <label className="press flex shrink-0 cursor-pointer items-center justify-center bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800">
                                            <span>Upload Deck ↑</span>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                onChange={(e) =>
                                                    handleImageUpload(
                                                        e,
                                                        (url) => updateSponsorship({ deckUrl: url }),
                                                        '/asterix/docs',
                                                        'technical_pitch_deck'
                                                    )
                                                }
                                                className="hidden"
                                            />
                                        </label>
                                        {siteData.sponsorship?.deckUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Clear the pitch deck link and fall back to the default tech brief?'
                                                        )
                                                    )
                                                        updateSponsorship({ deckUrl: '' });
                                                }}
                                                className="press shrink-0 cursor-pointer border-2 border-slate-900 bg-rose-100 px-3 py-2 font-mono text-xs font-black text-rose-800 uppercase hover:bg-rose-200"
                                                title="Reset to default tech brief"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Endorsement Letter */}
                                <div className="space-y-2 border-2 border-slate-900 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block font-mono text-xs font-black text-slate-800 uppercase">
                                            3. Formal Institution Endorsement & Credential Letter (PDF)
                                        </label>
                                        {siteData.sponsorship?.letterUrl && (
                                            <a
                                                href={siteData.sponsorship.letterUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono text-[11px] font-black text-sky-700 underline hover:text-sky-800"
                                            >
                                                Preview Document ↗
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="text"
                                            value={siteData.sponsorship?.letterUrl || ''}
                                            onChange={(e) => updateSponsorship({ letterUrl: e.target.value })}
                                            placeholder="Paste endorsement letter URL, or upload file below"
                                            className="flex-1 border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs focus:outline-none"
                                        />
                                        <label className="press flex shrink-0 cursor-pointer items-center justify-center bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800">
                                            <span>Upload Letter ↑</span>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                onChange={(e) =>
                                                    handleImageUpload(
                                                        e,
                                                        (url) => updateSponsorship({ letterUrl: url }),
                                                        '/asterix/docs',
                                                        'institution_endorsement_letter'
                                                    )
                                                }
                                                className="hidden"
                                            />
                                        </label>
                                        {siteData.sponsorship?.letterUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Clear the endorsement letter link and fall back to the default document?'
                                                        )
                                                    )
                                                        updateSponsorship({ letterUrl: '' });
                                                }}
                                                className="press shrink-0 cursor-pointer border-2 border-slate-900 bg-rose-100 px-3 py-2 font-mono text-xs font-black text-rose-800 uppercase hover:bg-rose-200"
                                                title="Reset to default credential document"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Incoming Corporate Sponsor Inquiries */}
                            <div className="space-y-4 border-t-4 border-slate-900 pt-6">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 uppercase">
                                            <span>Corporate Sponsor Inquiries</span>
                                            <span className="bg-sky-500 px-2 py-0.5 font-mono text-xs font-bold text-slate-950">
                                                {sponsorInquiries.length}
                                            </span>
                                        </h3>
                                        <p className="font-mono text-xs font-bold text-slate-500">
                                            Inquiries submitted via the partnership proposal form on #sponsor.
                                        </p>
                                    </div>
                                    <button
                                        onClick={fetchInquiries}
                                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold hover:bg-slate-200"
                                    >
                                        ↻ Refresh Inquiries
                                    </button>
                                </div>

                                {isLoadingInquiries ? (
                                    <div className="border-2 border-slate-900 bg-white p-8 text-center font-mono text-sm text-slate-500">
                                        Loading inquiries from MongoDB Atlas...
                                    </div>
                                ) : sponsorInquiries.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-300 bg-white p-8 text-center font-mono text-xs text-slate-500">
                                        No sponsor inquiries recorded yet. Submissions from the Sponsorship
                                        form will appear here.
                                    </div>
                                ) : (
                                    <div className="shadow-brutal-4 overflow-x-auto border-2 border-slate-900 bg-white">
                                        <table className="w-full text-left font-mono text-xs">
                                            <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                                                <tr>
                                                    <th className="p-2.5">Company & Contact</th>
                                                    <th className="p-2.5">Email / Phone</th>
                                                    <th className="p-2.5">Tier</th>
                                                    <th className="p-2.5">Message</th>
                                                    <th className="p-2.5">Status</th>
                                                    <th className="p-2.5 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {sponsorInquiries.map((inq) => (
                                                    <tr key={inq.id} className="hover:bg-slate-50">
                                                        <td className="p-2.5">
                                                            <div className="font-bold text-slate-900">
                                                                {inq.companyName}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500">
                                                                {inq.contactPerson || '—'}
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <div className="text-slate-800">{inq.email}</div>
                                                            <div className="text-[11px] text-slate-500">
                                                                {inq.phone || '—'}
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <span className="border border-slate-900 bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                                                                {inq.tier}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className="max-w-xs truncate p-2.5 text-slate-600"
                                                            title={inq.message}
                                                        >
                                                            {inq.message || '—'}
                                                        </td>
                                                        <td className="p-2.5">
                                                            <select
                                                                value={inq.status}
                                                                onChange={(e) =>
                                                                    handleUpdateInquiryStatus(
                                                                        inq.id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="border border-slate-900 bg-white px-1.5 py-0.5 text-[10px] font-bold focus:outline-none"
                                                            >
                                                                <option value="NEW">NEW</option>
                                                                <option value="REVIEWED">REVIEWED</option>
                                                                <option value="CONTACTED">CONTACTED</option>
                                                                <option value="ARCHIVED">ARCHIVED</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2.5 text-right">
                                                            <button
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            `Delete the sponsor inquiry from ${inq.companyName || 'this company'}? This cannot be undone.`
                                                                        )
                                                                    )
                                                                        handleDeleteInquiry(inq.id);
                                                                }}
                                                                className="press press-flat cursor-pointer text-xs font-black text-rose-600 hover:text-rose-900"
                                                            >
                                                                Delete ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workshop-schedule' && (
                        <WorkshopScheduleAdmin
                            currentUser={currentUser}
                            isAdmin={isAdmin}
                            showStatus={showStatus}
                            onImageUpload={handleImageUpload}
                        />
                    )}

                    {activeTab === 'workshop-registrations' && (
                        <WorkshopRegistrationsAdmin showStatus={showStatus} />
                    )}

                    {activeTab === 'workshop-attendance' && (
                        <WorkshopAttendanceAdmin
                            showStatus={showStatus}
                            onOpenProjector={(preferredTrack) => {
                                window.location.hash = `#attendance-projector?track=${preferredTrack || 'software'}`;
                            }}
                        />
                    )}

                    {activeTab === 'workshop-notes' && <WorkshopNotesAdmin showStatus={showStatus} />}

                    {activeTab === 'workshop-project-submissions' && (
                        <WorkshopProjectSubmissionsAdmin showStatus={showStatus} />
                    )}

                    {activeTab === 'quiz-manager' && <QuizAdmin showStatus={showStatus} />}

                    {/* TAB 5: GALLERY & MEDIA */}
                    {activeTab === 'gallery' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    DriftWall Media Gallery
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Add, update, or remove track and workshop photos in the 3D gallery
                                    archive.
                                </p>
                            </div>

                            {/* Add Photo Form */}
                            <div className="space-y-3 border-2 border-slate-900 bg-sky-50 p-4">
                                <span className="block font-mono text-xs font-black text-slate-900 uppercase">
                                    + Add New Image to Gallery
                                </span>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <input
                                        type="text"
                                        value={newGallery.title}
                                        onChange={(e) =>
                                            setNewGallery({ ...newGallery, title: e.target.value })
                                        }
                                        placeholder="Photo Title"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold"
                                    />
                                    <input
                                        type="text"
                                        value={newGallery.category}
                                        onChange={(e) =>
                                            setNewGallery({ ...newGallery, category: e.target.value })
                                        }
                                        placeholder="Tag (e.g. WORKSHOP • FAB)"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                    <input
                                        type="text"
                                        value={newGallery.year}
                                        onChange={(e) =>
                                            setNewGallery({ ...newGallery, year: e.target.value })
                                        }
                                        placeholder="Year (e.g. 2026)"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                </div>

                                <ImageField
                                    label="Gallery photo"
                                    value={newGallery.src}
                                    fit={newGallery.fit}
                                    position={newGallery.position}
                                    frames="gallery"
                                    folder="/asterix/gallery"
                                    onUpload={(e, cb, f) =>
                                        handleImageUpload(e, cb, f, newGallery.title || 'gallery_photo')
                                    }
                                    onChange={(fields) =>
                                        setNewGallery((prev) => ({
                                            ...prev,
                                            ...(fields.url !== undefined ? { src: fields.url } : {}),
                                            ...(fields.fit !== undefined ? { fit: fields.fit } : {}),
                                            ...(fields.position !== undefined
                                                ? { position: fields.position }
                                                : {})
                                        }))
                                    }
                                />

                                <input
                                    type="text"
                                    value={newGallery.desc}
                                    onChange={(e) => setNewGallery({ ...newGallery, desc: e.target.value })}
                                    placeholder="Photo description / technical context"
                                    className="w-full border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                />

                                <button
                                    onClick={() => {
                                        if (!newGallery.title || !newGallery.src)
                                            return alert('Please provide photo title and image URL/file');
                                        addGalleryItem({ ...newGallery, id: `gal-${Date.now()}` });
                                        setNewGallery({
                                            title: '',
                                            category: 'PIT LANE',
                                            year: '2026',
                                            src: '',
                                            desc: '',
                                            fit: 'cover',
                                            position: '50% 50%'
                                        });
                                        showStatus('New photo added to gallery!');
                                    }}
                                    className="press press-flat cursor-pointer bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                                >
                                    Publish Photo to Gallery →
                                </button>
                            </div>

                            {/* Gallery List */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {siteData.gallery.map((item) => (
                                    <div
                                        key={item.id}
                                        className="shadow-brutal-3 flex flex-col justify-between border-2 border-slate-900 bg-white p-3"
                                    >
                                        <div>
                                            <div className="mb-2">
                                                <ImageField
                                                    label={item.title || 'Gallery photo'}
                                                    value={item.src}
                                                    fit={item.fit}
                                                    position={item.position}
                                                    frames="gallery"
                                                    folder="/asterix/gallery"
                                                    onUpload={(e, cb, f) =>
                                                        handleImageUpload(
                                                            e,
                                                            cb,
                                                            f,
                                                            item.title || 'gallery_photo'
                                                        )
                                                    }
                                                    onChange={(fields) =>
                                                        updateGalleryItem(item.id, {
                                                            ...(fields.url !== undefined
                                                                ? { src: fields.url }
                                                                : {}),
                                                            ...(fields.fit !== undefined
                                                                ? { fit: fields.fit }
                                                                : {}),
                                                            ...(fields.position !== undefined
                                                                ? { position: fields.position }
                                                                : {})
                                                        })
                                                    }
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={item.title}
                                                onChange={(e) =>
                                                    updateGalleryItem(item.id, { title: e.target.value })
                                                }
                                                className="w-full border-b border-slate-300 pb-0.5 text-xs font-black focus:outline-none"
                                            />
                                            <span className="mt-1 block font-mono text-[10px] text-sky-700">
                                                {item.category} • {item.year}
                                            </span>
                                            <p className="mt-1 line-clamp-2 font-mono text-[11px] text-slate-600">
                                                {item.desc}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex justify-end border-t border-slate-200 pt-2">
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this gallery photo?'))
                                                        deleteGalleryItem(item.id);
                                                }}
                                                className="press press-flat cursor-pointer font-mono text-xs font-black text-rose-600 hover:text-rose-800"
                                            >
                                                Delete Photo ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 6: TEAM UPDATES */}
                    {activeTab === 'updates' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Proving Grounds Team Updates
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Manage cards in the accordion updates feed.
                                </p>
                            </div>

                            {/* Add Update Form */}
                            <div className="space-y-3 border-2 border-slate-900 bg-sky-50 p-4">
                                <span className="block font-mono text-xs font-black text-slate-900 uppercase">
                                    + Add New Team Update
                                </span>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <input
                                        type="text"
                                        value={newUpdateItem.label}
                                        onChange={(e) =>
                                            setNewUpdateItem({ ...newUpdateItem, label: e.target.value })
                                        }
                                        placeholder="Update Title / Milestone"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold"
                                    />
                                    <input
                                        type="text"
                                        value={newUpdateItem.tag}
                                        onChange={(e) =>
                                            setNewUpdateItem({ ...newUpdateItem, tag: e.target.value })
                                        }
                                        placeholder="Tag (e.g. FEB 2026 • PIT LANE)"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                </div>
                                <ImageField
                                    label="Update photo"
                                    value={newUpdateItem.image}
                                    fit={newUpdateItem.fit}
                                    position={newUpdateItem.position}
                                    frames="update"
                                    folder="/asterix/updates"
                                    onUpload={(e, cb, f) =>
                                        handleImageUpload(e, cb, f, newUpdateItem.label || 'team_update')
                                    }
                                    onChange={(fields) =>
                                        setNewUpdateItem((prev) => ({
                                            ...prev,
                                            ...(fields.url !== undefined ? { image: fields.url } : {}),
                                            ...(fields.fit !== undefined ? { fit: fields.fit } : {}),
                                            ...(fields.position !== undefined
                                                ? { position: fields.position }
                                                : {})
                                        }))
                                    }
                                />
                                <button
                                    onClick={() => {
                                        if (!newUpdateItem.label)
                                            return alert('Please provide an update title');
                                        addUpdate({ ...newUpdateItem, id: `upd-${Date.now()}` });
                                        setNewUpdateItem({
                                            label: '',
                                            tag: 'PROVING GROUNDS',
                                            image: '',
                                            link: '#',
                                            fit: 'cover',
                                            position: '50% 50%'
                                        });
                                        showStatus('Team update published!');
                                    }}
                                    className="press press-flat cursor-pointer bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                                >
                                    Publish Update →
                                </button>
                            </div>

                            {/* Updates List */}
                            <div className="space-y-3">
                                {siteData.updates.map((upd) => (
                                    <div
                                        key={upd.id}
                                        className="shadow-brutal-2 space-y-2 border-2 border-slate-900 bg-white p-3"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <input
                                                    type="text"
                                                    value={upd.label}
                                                    onChange={(e) =>
                                                        updateUpdate(upd.id, { label: e.target.value })
                                                    }
                                                    className="w-full border-b border-slate-300 text-xs font-bold focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={upd.tag || ''}
                                                    onChange={(e) =>
                                                        updateUpdate(upd.id, { tag: e.target.value })
                                                    }
                                                    placeholder="Tag (e.g. FEB 2026 • PIT LANE)"
                                                    className="mt-1 w-full border-b border-slate-200 font-mono text-[10px] text-sky-700 focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            upd.label
                                                                ? `Delete the update "${upd.label}"?`
                                                                : 'Delete this update?'
                                                        )
                                                    )
                                                        deleteUpdate(upd.id);
                                                }}
                                                className="press press-flat shrink-0 cursor-pointer font-mono text-xs font-black text-rose-600 hover:text-rose-800"
                                            >
                                                Delete ✕
                                            </button>
                                        </div>
                                        <ImageField
                                            label={upd.label || 'Update photo'}
                                            value={upd.image}
                                            fit={upd.fit}
                                            position={upd.position}
                                            frames="update"
                                            folder="/asterix/updates"
                                            onUpload={(e, cb, f) =>
                                                handleImageUpload(e, cb, f, upd.label || 'team_update')
                                            }
                                            onChange={(fields) =>
                                                updateUpdate(upd.id, {
                                                    ...(fields.url !== undefined
                                                        ? { image: fields.url }
                                                        : {}),
                                                    ...(fields.fit !== undefined ? { fit: fields.fit } : {}),
                                                    ...(fields.position !== undefined
                                                        ? { position: fields.position }
                                                        : {})
                                                })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: ALLIANCE LEADS / SUBSCRIBERS */}
                    {activeTab === 'subscribers' && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase">
                                        Alliance Leads & Subscribers
                                    </h2>
                                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                        Submissions from the "Join the Alliance" newsletter form, stored
                                        securely in MongoDB Atlas.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={fetchSubscribers}
                                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold hover:bg-slate-200"
                                    >
                                        ↻ Refresh
                                    </button>
                                    <button
                                        onClick={handleExportSubscribersCSV}
                                        disabled={subscribers.length === 0}
                                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-500 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-400 disabled:opacity-50"
                                    >
                                        Export CSV ↓
                                    </button>
                                </div>
                            </div>

                            {isLoadingSubscribers ? (
                                <div className="p-8 text-center font-mono text-sm text-slate-500">
                                    Loading subscribers from database...
                                </div>
                            ) : subscribers.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-300 p-8 text-center font-mono text-xs text-slate-500">
                                    No alliance leads recorded yet. Submissions from the website newsletter
                                    section will appear here automatically.
                                </div>
                            ) : (
                                <div className="overflow-x-auto border-2 border-slate-900">
                                    <table className="w-full text-left font-mono text-xs">
                                        <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                                            <tr>
                                                <th className="p-2.5">Email</th>
                                                <th className="p-2.5">Phone</th>
                                                <th className="p-2.5">Joined Date</th>
                                                <th className="p-2.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {subscribers.map((sub) => (
                                                <tr key={sub.id} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-bold text-slate-900">
                                                        {sub.email}
                                                    </td>
                                                    <td className="p-2.5 text-slate-600">
                                                        {sub.phone || '—'}
                                                    </td>
                                                    <td className="p-2.5 text-[11px] text-slate-500">
                                                        {sub.created_at
                                                            ? new Date(sub.created_at).toLocaleString()
                                                            : 'Recent'}
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        <button
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        `Delete ${sub.email || 'this subscriber'} from the subscriber list? This cannot be undone.`
                                                                    )
                                                                )
                                                                    handleDeleteSubscriber(sub.id);
                                                            }}
                                                            className="press press-flat cursor-pointer font-black text-rose-600 hover:text-rose-900"
                                                        >
                                                            Delete ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: TEAM MEMBER ACCOUNTS */}
                    {activeTab === 'accounts' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    Team Member Logins & Access
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Manage usernames, passwords, and permissions for members authorized to
                                    edit the site.
                                </p>
                            </div>

                            {/* Add Account Form */}
                            <div className="space-y-3 border-2 border-slate-900 bg-sky-50 p-4">
                                <span className="block font-mono text-xs font-black text-slate-900 uppercase">
                                    + Add New Team Member Login
                                </span>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <input
                                        type="text"
                                        value={newAccount.username}
                                        onChange={(e) =>
                                            setNewAccount({ ...newAccount, username: e.target.value })
                                        }
                                        placeholder="Username (e.g. software_lead)"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                    <input
                                        type="password"
                                        value={newAccount.password}
                                        onChange={(e) =>
                                            setNewAccount({ ...newAccount, password: e.target.value })
                                        }
                                        placeholder="Password"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                    <input
                                        type="text"
                                        value={newAccount.name}
                                        onChange={(e) =>
                                            setNewAccount({ ...newAccount, name: e.target.value })
                                        }
                                        placeholder="Full Name"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold"
                                    />
                                    <input
                                        type="text"
                                        value={newAccount.phone || ''}
                                        onChange={(e) =>
                                            setNewAccount({ ...newAccount, phone: e.target.value })
                                        }
                                        placeholder="Phone Number (e.g. +91 98765 43210)"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs"
                                    />
                                    <input
                                        type="text"
                                        value={newAccount.role}
                                        onChange={(e) =>
                                            setNewAccount({ ...newAccount, role: e.target.value })
                                        }
                                        placeholder="Team Role (e.g. Powertrain Lead)"
                                        className="border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold sm:col-span-2 lg:col-span-1"
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!newAccount.username || !newAccount.password)
                                            return alert('Username and password are required');
                                        const cleanUsername = newAccount.username.trim();
                                        const cleanPassword = newAccount.password.trim();
                                        const createdAccount = {
                                            id: `acc-${Date.now()}`,
                                            username: cleanUsername,
                                            password: cleanPassword,
                                            name: newAccount.name.trim() || cleanUsername,
                                            phone: (newAccount.phone || '').trim(),
                                            role: newAccount.role || 'Team Member',
                                            accessLevel: newAccount.accessLevel || 'Lead'
                                        };

                                        // 1. Add to siteData accounts array immediately (persists in localStorage, Firestore, and MongoDB)
                                        addAccount(createdAccount);

                                        // 2. Register in backend DB if token is available
                                        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
                                        if (token) {
                                            try {
                                                const res = await fetch(apiUrl('/api/auth/accounts'), {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Authorization: `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify(createdAccount)
                                                });
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    if (data.account) {
                                                        setDbAccounts((prev) => [
                                                            ...prev.filter(
                                                                (a) => a.username !== cleanUsername
                                                            ),
                                                            data.account
                                                        ]);
                                                    }
                                                }
                                            } catch (err) {
                                                console.warn('Backend API account notice:', err);
                                            }
                                        }

                                        setNewAccount({
                                            username: '',
                                            password: '',
                                            name: '',
                                            phone: '',
                                            role: 'Team Member',
                                            accessLevel: 'Lead'
                                        });
                                        showStatus(`New login created for ${createdAccount.name}! ✓`);
                                    }}
                                    className="press press-flat cursor-pointer bg-slate-900 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                                >
                                    Create Member Login →
                                </button>
                            </div>

                            {/* Accounts Table */}
                            <div className="overflow-x-auto border-2 border-slate-900">
                                <table className="w-full text-left font-mono text-xs">
                                    <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                                        <tr>
                                            <th className="p-2.5">User</th>
                                            <th className="p-2.5">Username</th>
                                            <th className="p-2.5">Phone</th>
                                            <th className="p-2.5">Role</th>
                                            <th className="p-2.5">Access</th>
                                            <th className="p-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {(dbAccounts.length > 0 ? dbAccounts : siteData.accounts).map(
                                            (acc) => (
                                                <tr key={acc.id} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-bold">{acc.name}</td>
                                                    <td className="p-2.5 font-bold text-sky-700">
                                                        {acc.username}
                                                    </td>
                                                    <td className="p-2.5 font-bold text-slate-700">
                                                        {acc.phone || '—'}
                                                    </td>
                                                    <td className="p-2.5">{acc.role}</td>
                                                    <td className="p-2.5">
                                                        <span className="border border-slate-400 bg-slate-100 px-2 py-0.5 text-[10px]">
                                                            {acc.accessLevel}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-right">
                                                        {acc.username !== 'admin' && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (
                                                                        !confirm(
                                                                            `Delete account for ${acc.name}?`
                                                                        )
                                                                    )
                                                                        return;
                                                                    const token =
                                                                        sessionStorage.getItem(
                                                                            AUTH_TOKEN_KEY
                                                                        );
                                                                    if (token) {
                                                                        try {
                                                                            const res = await fetch(
                                                                                apiUrl(
                                                                                    `/api/auth/accounts/${acc.id}`
                                                                                ),
                                                                                {
                                                                                    method: 'DELETE',
                                                                                    headers: {
                                                                                        Authorization: `Bearer ${token}`
                                                                                    }
                                                                                }
                                                                            );
                                                                            if (res.ok) {
                                                                                setDbAccounts((prev) =>
                                                                                    prev.filter(
                                                                                        (a) => a.id !== acc.id
                                                                                    )
                                                                                );
                                                                                deleteAccount(acc.id);
                                                                                showStatus(
                                                                                    'Account removed from database!'
                                                                                );
                                                                                return;
                                                                            }
                                                                        } catch (err) {
                                                                            console.warn(
                                                                                'Backend delete failed:',
                                                                                err
                                                                            );
                                                                        }
                                                                    }
                                                                    deleteAccount(acc.id);
                                                                    showStatus('Account removed.');
                                                                }}
                                                                className="press press-flat cursor-pointer font-black text-rose-600 hover:text-rose-900"
                                                            >
                                                                Delete ✕
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 8: SETTINGS & BACKUP */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <h2 className="text-2xl font-black text-slate-900 uppercase">
                                    System Backup & Maintenance
                                </h2>
                                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                    Download all edits as JSON, restore from existing files, or reset to
                                    original defaults.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-3 border-2 border-slate-900 bg-slate-50 p-4">
                                    <h3 className="font-mono text-xs font-black text-slate-900 uppercase">
                                        Export Data Backup
                                    </h3>
                                    <p className="text-xs text-slate-600">
                                        Downloads a complete JSON snapshot containing all text content, media
                                        links, squad members, and accounts.
                                    </p>
                                    <button
                                        onClick={handleDownloadBackup}
                                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-500 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase"
                                    >
                                        Download Backup JSON ↓
                                    </button>
                                </div>

                                <div className="space-y-3 border-2 border-slate-900 bg-slate-50 p-4">
                                    <h3 className="font-mono text-xs font-black text-slate-900 uppercase">
                                        Restore from Backup
                                    </h3>
                                    <p className="text-xs text-slate-600">
                                        Upload a previously exported JSON backup file to instantly populate
                                        the site with your saved data.
                                    </p>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleRestoreBackup}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            </div>

                            {/* Reset Section: wipes all site content, so SuperAdmin only */}
                            {isSuperAdmin && (
                                <div className="border-t-2 border-slate-200 pt-6">
                                    <div className="space-y-2 border-2 border-rose-600 bg-rose-50 p-4">
                                        <h3 className="font-mono text-xs font-black text-rose-700 uppercase">
                                            Reset to Factory Defaults
                                        </h3>
                                        <p className="text-xs text-rose-800">
                                            Clears all customized edits in local storage and restores the
                                            initial original Team Asterix data.
                                        </p>
                                        <button
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        'Are you sure you want to reset all content to default settings?'
                                                    )
                                                ) {
                                                    resetToDefaults();
                                                    showStatus('Reset completed successfully!');
                                                }
                                            }}
                                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-rose-600 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-rose-700"
                                        >
                                            Reset All Content
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
