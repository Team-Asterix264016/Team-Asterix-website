import { useState, useEffect, useCallback, useRef } from 'react';
import { apiUrl } from '../lib/api';
import { safeHref } from '../lib/safeHref';
import { useCommunityAuth } from '../context/CommunityAuthContext';
import { downloadAllIcsFile } from '../utils/calendarUtils';
import { WORKSHOP_TRACKS, WORKSHOP_DEPARTMENTS } from '../../server/src/config/workshopPackages.js';
import SessionNotesModal from './SessionNotesModal';
import { resourceBadge } from '../lib/resourceTypes';

const SUBSYSTEMS_PORTAL_DATA = [
    {
        id: 'software-perception',
        name: 'Software & Perception Subsystem',
        badge: 'AI & AUTONOMY',
        color: 'bg-sky-400 text-slate-950',
        tagline:
            'ROS 2 Humble/Jazzy Architecture, Cartographer SLAM, YOLOv8 Neural Perception & TEB Path Planning.',
        details:
            'Handles drive-by-wire autonomy algorithms, LiDAR 3D point-cloud clustering, stereo depth perception, and digital twin Gazebo simulation.',
        officialContact: 'ratheeswar.asterix@gmail.com',
        phone: '+91 86089 44644'
    },
    {
        id: 'powertrain',
        name: 'Powertrain & BMS Subsystem',
        badge: 'EV POWER & ENERGY',
        color: 'bg-amber-400 text-slate-950',
        tagline:
            '72V High-Voltage Battery Enclosure, Active Cell Balancing BMS, Inverter Drive & LTspice Simulations.',
        details:
            'Architects electric drive motors, high-current busbars, thermal management, and power electronics simulation testbenches.',
        officialContact: 'rithvik.asterix@gmail.com',
        phone: '+91 94433 87654'
    },
    {
        id: 'mechanical',
        name: 'Mechanical & Dynamics Subsystem',
        badge: 'CHASSIS & FEA',
        color: 'bg-emerald-400 text-slate-950',
        tagline:
            'AISI 4130 Chromoly Spaceframe, Double-Wishbone Suspension Kinematics, SolidWorks & ANSYS FEA.',
        details:
            'Engineers structural safety cage, TIG welding fabrication, dynamic damper valving, and high-impact crash worthiness.',
        officialContact: 'ananya.mech@psgitech.ac.in',
        phone: '+91 97900 11223'
    }
];

function receiptRows(record) {
    return [
        ['Receipt no.', record.receiptNo || 'Being generated'],
        ['Name', record.name],
        ['Registered no.', record.rollNo],
        ['Department', record.department],
        ['Year', record.year === '1' ? '1st year' : record.year === '2' ? '2nd year' : ''],
        ['Email', record.email],
        ['Phone', record.phone],
        ['Track', record.packageName || record.package],
        ['Amount paid', `${Number(record.amount || 1000).toLocaleString('en-IN')}`],
        ['Paid on', record.paidAt ? new Date(record.paidAt).toLocaleDateString('en-IN') : 'Confirmed'],
        ['Reference', record.registrationId || record._id]
    ].filter(([, value]) => value);
}

function downloadReceipt(rows, fileId) {
    try {
        const W = 640,
            PAD = 36,
            LABEL_W = 170,
            LINE_H = 24,
            ROW_PAD = 18;
        const HEADER_H = 128,
            FOOTER_H = 84;
        const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        const VALUE_FONT = `700 17px ${SANS}`;

        const canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = VALUE_FONT;

        const wrapText = (text, maxWidth) => {
            const lines = [];
            let line = '';
            for (const word of String(text).split(' ')) {
                const next = line ? `${line} ${word}` : word;
                if (line && ctx.measureText(next).width > maxWidth) {
                    lines.push(line);
                    line = word;
                } else {
                    line = next;
                }
            }
            if (line) lines.push(line);
            return lines;
        };

        const laid = rows.map(([label, value]) => ({
            label,
            lines: wrapText(String(value ?? ''), W - PAD * 2 - LABEL_W)
        }));

        const H =
            HEADER_H +
            laid.reduce((sum, row) => sum + row.lines.length * LINE_H + ROW_PAD, 0) +
            FOOTER_H +
            16;
        const scale = 2;
        canvas.width = W * scale;
        canvas.height = H * scale;
        ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.textBaseline = 'top';

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fcd34d';
        ctx.fillRect(0, 0, W, HEADER_H - 16);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, HEADER_H - 20, W, 4);

        ctx.font = `900 13px ${MONO}`;
        ctx.fillStyle = '#0369a1';
        ctx.fillText('TEAM ASTERIX · WORKSHOP 2026', PAD, 30);
        ctx.font = `900 30px ${SANS}`;
        ctx.fillStyle = '#0f172a';
        ctx.fillText('PAYMENT RECEIPT', PAD, 52);

        let y = HEADER_H;
        laid.forEach((row, index) => {
            const rowH = row.lines.length * LINE_H + ROW_PAD;
            if (row.label === 'Amount paid') {
                ctx.fillStyle = '#fcd34d';
                ctx.fillRect(PAD - 12, y - 2, W - PAD * 2 + 24, rowH);
            }
            ctx.font = `900 12px ${MONO}`;
            ctx.fillStyle = '#64748b';
            ctx.fillText(row.label.toUpperCase(), PAD, y + 11);
            ctx.font = VALUE_FONT;
            ctx.fillStyle = '#0f172a';
            row.lines.forEach((line, i) => ctx.fillText(line, PAD + LABEL_W, y + 8 + i * LINE_H));
            y += rowH;
            if (index < laid.length - 1) {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(PAD, y - 2, W - PAD * 2, 2);
            }
        });

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, y + 8, W, 4);
        ctx.font = `700 12px ${MONO}`;
        ctx.fillStyle = '#475569';
        ctx.fillText('Official Team Asterix Workshop Participant Receipt.', PAD, y + 30);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, W, H);

        const safeId = String(fileId || 'Receipt').replace(/[^a-zA-Z0-9_-]/g, '-');
        const filename = `Asterix-Receipt-${safeId}.png`;

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 1000);
    } catch (err) {
        alert('Could not download receipt automatically. Please take a screenshot.');
    }
}

export default function ParticipantProfilePage({ onBack, onSelectSubsystem }) {
    const communityAuth = useCommunityAuth();
    const currentMember = communityAuth?.currentMember;
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState(() => {
        try {
            const saved = sessionStorage.getItem('asterix_profile_auth');
            return saved ? JSON.parse(saved).password || '' : '';
        } catch {
            return '';
        }
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('attendance');
    const [timetableFilter, setTimetableFilter] = useState('all');
    const [timetableSearch, setTimetableSearch] = useState('');
    const [notesModuleFilter, setNotesModuleFilter] = useState('all');
    const [notesSearch, setNotesSearch] = useState('');
    const [selectedSession, setSelectedSession] = useState(null);
    // Today's date in IST (YYYY-MM-DD), read once per visit, for picking the next session.
    const [todayIst] = useState(() => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));

    // Password change modal states
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [pwdCurrent, setPwdCurrent] = useState('');
    const [pwdNew, setPwdNew] = useState('');
    const [pwdConfirm, setPwdConfirm] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    // Edit profile details modal states
    const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        rollNo: '',
        email: '',
        phone: '',
        department: '',
        year: '',
        password: ''
    });
    const [editError, setEditError] = useState('');
    const [editFieldErrors, setEditFieldErrors] = useState({});
    const [editSuccess, setEditSuccess] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const fetchProfile = useCallback(
        async (queryVal, pwdVal) => {
            const target = queryVal !== undefined ? queryVal : identifier;
            const pwd = pwdVal !== undefined ? pwdVal : password;

            if (!target.trim()) {
                setError('Please enter your Email ID, Phone Number, or Roll Number.');
                return;
            }
            if (!pwd.trim()) {
                setError('Please enter your password. (Initial default password is "asterix")');
                return;
            }

            setLoading(true);
            setError('');

            try {
                const res = await fetch(apiUrl('/api/workshop/attendance/profile'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: target.trim(), password: pwd.trim() })
                });

                const data = await res.json();
                if (res.ok && data.ok) {
                    setProfile(data);
                    try {
                        sessionStorage.setItem(
                            'asterix_profile_auth',
                            JSON.stringify({ identifier: target.trim(), password: pwd.trim() })
                        );
                    } catch (e) {
                        console.error('Failed to store profile auth session:', e);
                    }
                } else {
                    setError(data.error || 'No participant registration found for this query.');
                    setProfile(null);
                    setSelectedSession(null);
                }
            } catch {
                setError('Could not connect to server. Check your connection and try again.');
                setProfile(null);
                setSelectedSession(null);
            } finally {
                setLoading(false);
            }
        },
        [identifier, password]
    );

    const hasAutoFilledRef = useRef(false);

    useEffect(() => {
        if (hasAutoFilledRef.current) return;
        hasAutoFilledRef.current = true;

        let savedId = '';
        let savedPwd = '';
        try {
            const saved = sessionStorage.getItem('asterix_profile_auth');
            if (saved) {
                const parsed = JSON.parse(saved);
                savedId = parsed.identifier || '';
                savedPwd = parsed.password || '';
            }
        } catch (e) {
            console.error('Failed to parse saved profile auth session:', e);
        }

        let studentStorageId = '';
        try {
            const studentStr = localStorage.getItem('workshop_student');
            if (studentStr) {
                const parsed = JSON.parse(studentStr);
                studentStorageId = parsed.email || parsed.rollNo || parsed.phone || '';
            }
        } catch (e) {
            console.error('Failed to parse workshop student from localStorage:', e);
        }

        const params = new URLSearchParams(window.location.search);
        const queryParam =
            params.get('query') ||
            params.get('id') ||
            params.get('email') ||
            params.get('phone') ||
            savedId ||
            studentStorageId ||
            currentMember?.rollNo ||
            currentMember?.email ||
            currentMember?.phone;

        if (queryParam) {
            setIdentifier(queryParam);
            const activePwd = savedPwd || 'asterix';
            setPassword(activePwd);
            fetchProfile(queryParam, activePwd);
        }
    }, [fetchProfile, currentMember]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProfile();
    };

    const handleLogoutCandidate = () => {
        setProfile(null);
        setPassword('');
        try {
            sessionStorage.removeItem('asterix_profile_auth');
        } catch (e) {
            console.error('Failed to clear profile auth session:', e);
        }
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!pwdCurrent.trim()) {
            setPwdError('Please enter your current password.');
            return;
        }
        if (!pwdNew.trim()) {
            setPwdError('Please enter your new password.');
            return;
        }
        if (pwdNew.trim().length < 4) {
            setPwdError('New password must be at least 4 characters long.');
            return;
        }
        if (pwdNew.trim() !== pwdConfirm.trim()) {
            setPwdError('New password and confirm password do not match.');
            return;
        }

        setPwdLoading(true);
        setPwdError('');
        setPwdSuccess('');

        try {
            const candidateTarget = profile?.candidate?.rollNo || profile?.candidate?.email || identifier;
            const res = await fetch(apiUrl('/api/workshop/attendance/profile/change-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: candidateTarget,
                    currentPassword: pwdCurrent.trim(),
                    newPassword: pwdNew.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setPwdSuccess(data.message || 'Password updated successfully!');
                setPassword(pwdNew.trim());
                setProfile((prev) => (prev ? { ...prev, isDefaultPassword: false } : prev));
                try {
                    sessionStorage.setItem(
                        'asterix_profile_auth',
                        JSON.stringify({ identifier: candidateTarget, password: pwdNew.trim() })
                    );
                } catch (e) {
                    console.error('Failed to update profile auth session:', e);
                }
                setTimeout(() => {
                    setIsChangePasswordOpen(false);
                    setPwdSuccess('');
                    setPwdCurrent('');
                    setPwdNew('');
                    setPwdConfirm('');
                }, 1500);
            } else {
                setPwdError(data.error || 'Failed to update password. Check your current password.');
            }
        } catch {
            setPwdError('Could not connect to server. Please try again.');
        } finally {
            setPwdLoading(false);
        }
    };

    const openEditDetails = () => {
        const candidate = profile?.candidate || {};
        setEditForm({
            name: candidate.name || '',
            rollNo: candidate.rollNo || '',
            email: candidate.email || '',
            phone: candidate.phone || '',
            department: candidate.department || '',
            year: candidate.year || '',
            password: password || ''
        });
        setEditError('');
        setEditFieldErrors({});
        setEditSuccess('');
        setIsEditDetailsOpen(true);
    };

    const closeEditDetails = () => {
        setIsEditDetailsOpen(false);
        setEditError('');
        setEditFieldErrors({});
        setEditSuccess('');
    };

    const updateEditField = (field, value) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
        setEditFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
    };

    const handleEditDetailsSubmit = async (e) => {
        e.preventDefault();
        if (!editForm.password.trim()) {
            setEditError('Please confirm your profile password to save these changes.');
            return;
        }

        setEditLoading(true);
        setEditError('');
        setEditFieldErrors({});
        setEditSuccess('');

        try {
            const candidateTarget = profile?.candidate?.rollNo || profile?.candidate?.email || identifier;
            const res = await fetch(apiUrl('/api/workshop/attendance/profile/update-details'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: candidateTarget,
                    password: editForm.password.trim(),
                    name: editForm.name.trim(),
                    rollNo: editForm.rollNo.trim().toUpperCase(),
                    email: editForm.email.trim(),
                    phone: editForm.phone.trim(),
                    department: editForm.department,
                    year: editForm.year
                })
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setEditSuccess(data.message || 'Profile details updated successfully!');
                setProfile((prev) =>
                    prev ? { ...prev, candidate: { ...prev.candidate, ...data.candidate } } : prev
                );
                // A corrected roll number or email replaces what unlocks this profile, so the
                // saved session has to point at the new value or the next visit cannot log in.
                const nextIdentifier = data.candidate?.rollNo || data.candidate?.email || candidateTarget;
                setIdentifier(nextIdentifier);
                try {
                    sessionStorage.setItem(
                        'asterix_profile_auth',
                        JSON.stringify({ identifier: nextIdentifier, password: editForm.password.trim() })
                    );
                } catch (err) {
                    console.error('Failed to update profile auth session:', err);
                }
                // The attendance check-in screen prefills from this cached copy, so a stale roll
                // number here would re-create the mismatch the correction just fixed.
                try {
                    const cached = localStorage.getItem('workshop_student');
                    if (cached) {
                        localStorage.setItem(
                            'workshop_student',
                            JSON.stringify({ ...JSON.parse(cached), ...data.candidate })
                        );
                    }
                } catch (err) {
                    console.error('Failed to refresh cached workshop student:', err);
                }
                setTimeout(
                    () => {
                        setIsEditDetailsOpen(false);
                        setEditSuccess('');
                    },
                    data.rollNoChanged ? 3500 : 1500
                );
            } else {
                setEditError(data.error || 'Failed to update your details. Please try again.');
                setEditFieldErrors(data.fieldErrors || {});
            }
        } catch {
            setEditError('Could not connect to server. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleSubsystemNavigate = (subsystemId) => {
        if (onSelectSubsystem) {
            onSelectSubsystem(subsystemId);
        } else {
            window.location.assign('#subsystem');
        }
    };

    const notesResources = profile?.resources || [];
    const notesModules = [
        ...new Set(
            notesResources.map((item) => item.module).filter((mod) => typeof mod === 'string' && mod.trim())
        )
    ];
    const activeNotesModule = notesModules.includes(notesModuleFilter) ? notesModuleFilter : 'all';
    const notesQuery = notesSearch.trim().toLowerCase();
    const filteredNotes = notesResources.filter((item) => {
        if (activeNotesModule !== 'all' && item.module !== activeNotesModule) return false;
        if (!notesQuery) return true;
        return (
            item.title?.toLowerCase().includes(notesQuery) ||
            item.description?.toLowerCase().includes(notesQuery) ||
            item.module?.toLowerCase().includes(notesQuery) ||
            item.track?.toLowerCase().includes(notesQuery) ||
            item.resources?.some((res) => res.label?.toLowerCase().includes(notesQuery))
        );
    });
    const notesBySession = new Map();
    notesResources.forEach((r) => {
        if (!r.sessionId) return;
        if (!notesBySession.has(r.sessionId)) notesBySession.set(r.sessionId, []);
        notesBySession.get(r.sessionId).push(r);
    });
    const multiTrack = (profile?.candidate?.tracksEnrolled?.length || 0) > 1;
    // Holidays and optional catch-ups don't count toward attendance.
    const countedSessions = (profile?.sessionTimeline || []).filter(
        (s) => s.type !== 'holiday' && s.type !== 'catchup'
    ).length;
    const nextSession = profile?.sessionTimeline?.find(
        (s) => s.type !== 'holiday' && s.isoDate && s.isoDate >= todayIst
    );

    return (
        <div className="min-h-screen bg-slate-900 font-sans text-slate-900 selection:bg-amber-300">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 border-b-4 border-slate-900 bg-white/95 px-4 py-3.5 shadow-[0_4px_0px_#0f172a] backdrop-blur-md sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black text-slate-950 uppercase">
                            AST-LOCKER
                        </span>
                        <div>
                            <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase">
                                Team Asterix Permanent Portal
                            </span>
                            <strong className="block text-xs font-black uppercase sm:text-sm">
                                Member &amp; Subsystems Hub 🔓
                            </strong>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase hover:bg-amber-400"
                    >
                        ← Back to Home
                    </button>
                </div>
            </header>

            {!profile ? (
                <main className="mx-auto max-w-6xl p-4 py-8 sm:p-8">
                    {/* Unauthenticated Landing / Search Card */}
                    <div className="shadow-brutal-8 mx-auto w-full max-w-3xl border-4 border-slate-900 bg-white p-6 text-slate-900 sm:p-10">
                        <div className="text-center">
                            <span className="inline-block border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase">
                                ✦ TEAM ASTERIX PERMANENT MEMBER PORTAL
                            </span>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 uppercase sm:text-5xl">
                                UNLOCK YOUR PERMANENT PROFILE
                            </h1>
                            <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed font-bold text-slate-600 sm:text-sm">
                                Enter your college email ID, registered phone number, or roll number below to
                                access your individual workshop attendance summary, class lecture slides,
                                SPICE circuits, Colab notebooks, and payment receipt.
                            </p>
                        </div>

                        <form onSubmit={handleSearch} className="mt-8 space-y-4">
                            <div>
                                <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                    1. College Email / Phone / Roll No
                                </label>
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="College Email ID / Phone No / Roll No (e.g. 26M125)"
                                    className="min-h-12 w-full border-3 border-slate-900 bg-slate-50 px-4 py-3 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:ring-3 focus:ring-amber-400 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                    2. Profile Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password (Initial default: asterix)"
                                        className="min-h-12 w-full border-3 border-slate-900 bg-slate-50 px-4 py-3 pr-20 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:ring-3 focus:ring-amber-400 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="tap-sq press press-y absolute top-1/2 right-2 -translate-y-1/2 border border-slate-900 bg-white px-2.5 py-1 font-mono text-[10px] font-black text-slate-900 uppercase hover:bg-slate-100"
                                    >
                                        {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                                    </button>
                                </div>
                                <p className="mt-1 font-mono text-[11px] font-bold text-slate-600">
                                    💡 Initial default password for all participants is{' '}
                                    <strong className="rounded bg-amber-200 px-1.5 py-0.5 font-mono font-black text-slate-950">
                                        asterix
                                    </strong>
                                    .
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="press shadow-brutal-4-brand min-h-14 w-full border-3 border-slate-900 bg-amber-300 px-8 py-3.5 font-mono text-sm font-black text-slate-950 uppercase hover:bg-amber-400 disabled:opacity-60"
                            >
                                {loading ? 'Unlocking Profile…' : 'Unlock Profile 🔓'}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 border-2 border-rose-600 bg-rose-50 p-3 text-center font-mono text-xs font-black text-rose-800 uppercase">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="mt-4 border-t-2 border-slate-200 pt-3 text-center font-mono text-xs font-bold text-slate-600">
                            Having trouble unlocking your profile? See the floating support badge on the side or call{' '}
                            <a href="tel:+918608944644" className="font-black text-slate-950 underline hover:text-sky-700">
                                +91 86089 44644
                            </a>.
                        </div>
                    </div>

                    {/* Official Subsystems & Team Portal Hub */}
                    <div className="mt-12 space-y-6">
                        <div className="border-b-4 border-white/20 pb-4 text-center">
                            <span className="border-2 border-slate-900 bg-sky-400 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase">
                                🛠️ OFFICIAL SUBSYSTEM DECK DIRECTORY
                            </span>
                            <h2 className="mt-3 text-3xl font-black tracking-tight text-white uppercase sm:text-4xl">
                                EXPLORE SUBSYSTEMS &amp; OFFICIAL TEAM CONTACTS
                            </h2>
                            <p className="mx-auto mt-2 max-w-2xl font-mono text-xs font-bold text-slate-300">
                                Connect safely with official subsystem leads and explore technical
                                specifications, CAD models, and contact lines directly on the official
                                Subsystem Portal.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {SUBSYSTEMS_PORTAL_DATA.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] sm:last:odd:col-span-2 sm:last:odd:mx-auto sm:last:odd:w-[calc(50%-0.75rem)]"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900 pb-3">
                                            <span
                                                className={`border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${sub.color}`}
                                            >
                                                {sub.badge}
                                            </span>
                                            <span className="font-mono text-[10px] font-black text-sky-800 uppercase">
                                                OFFICIAL DECK
                                            </span>
                                        </div>

                                        <h3 className="mt-3 text-2xl font-black text-slate-900 uppercase">
                                            {sub.name}
                                        </h3>
                                        <p className="mt-1 font-mono text-xs leading-relaxed font-bold text-slate-700">
                                            {sub.tagline}
                                        </p>

                                        <p className="mt-3 text-xs leading-relaxed font-medium text-slate-600">
                                            {sub.details}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleSubsystemNavigate(sub.id)}
                                        className="press shadow-brutal-3 mt-6 flex w-full items-center justify-center gap-2 border-2 border-slate-900 bg-amber-300 py-3 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400"
                                    >
                                        <span>Explore Subsystem Deck &amp; Team Contacts</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            ) : (
                <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
                    {/* Greeting */}
                    <div className="mb-6 border-b-4 border-white/20 pb-4 text-white">
                        <span className="font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                            Permanent Member Profile
                        </span>
                        <h1 className="text-2xl font-black text-white uppercase sm:text-3xl">
                            Hey {profile.candidate.name}, ready to learn something new today!!
                        </h1>
                    </div>

                    {/* Profile Dashboard */}
                    {profile && profile.candidate && (
                        <div className="space-y-8">
                            {/* Default Password Security Notice Banner */}
                            {profile.isDefaultPassword && (
                                <div className="shadow-brutal-6 border-4 border-slate-900 bg-amber-300 p-5 text-slate-950">
                                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                        <div>
                                            <span className="inline-block border-2 border-slate-900 bg-slate-950 px-2.5 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                SECURITY ACTION REQUIRED 🔑
                                            </span>
                                            <h3 className="mt-1.5 text-xl font-black text-slate-950 uppercase sm:text-2xl">
                                                You are currently using the default password
                                                (&quot;asterix&quot;)
                                            </h3>
                                            <p className="mt-1 font-mono text-xs font-bold text-slate-900">
                                                Please set your custom password now to secure your personal
                                                workshop profile &amp; attendance records.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPwdCurrent(password || 'asterix');
                                                setIsChangePasswordOpen(true);
                                            }}
                                            className="press shadow-brutal-3 shrink-0 border-3 border-slate-900 bg-slate-950 px-5 py-3 font-mono text-xs font-black text-white uppercase hover:bg-slate-800"
                                        >
                                            Set Custom Password Now 🔒
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Verified Candidate Profile Card */}
                            <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="border-2 border-slate-900 bg-emerald-400 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                ✓ VERIFIED MEMBER / PARTICIPANT
                                            </span>
                                            <span className="border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                Receipt #{profile.candidate.receiptNo || 'Confirmed'}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                            <h2 className="text-2xl font-black text-slate-900 uppercase sm:text-4xl">
                                                {profile.candidate.name}
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={openEditDetails}
                                                title="Edit your profile details"
                                                aria-label="Edit your profile details"
                                                className="press shadow-brutal-2 shrink-0 border-2 border-slate-900 bg-amber-300 px-2 py-1 text-sm leading-none font-black text-slate-950 hover:bg-amber-400"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                        <p className="mt-1 font-mono text-sm font-bold text-sky-800">
                                            Roll No: <strong>{profile.candidate.rollNo}</strong> •{' '}
                                            {profile.candidate.department} (
                                            {profile.candidate.year === '1' ? '1st Year' : '2nd Year'})
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => window.location.assign('#workshop-project-submit')}
                                            className="press shadow-brutal-3 flex items-center gap-1.5 border-2 border-slate-900 bg-emerald-400 px-4 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-emerald-300"
                                        >
                                            <span>📤 Upload Project</span>
                                            <span>→</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                downloadReceipt(
                                                    receiptRows(profile.candidate),
                                                    profile.candidate.receiptNo || profile.candidate.rollNo
                                                )
                                            }
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-slate-900 px-4 py-2.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                        >
                                            Download Receipt PNG ↓
                                        </button>
                                        <a
                                            href="tel:+918608944644"
                                            className="press shadow-brutal-3 flex items-center gap-1.5 border-2 border-slate-900 bg-sky-400 px-4 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-300"
                                        >
                                            <span>📞 Contact Support (+91 86089 44644)</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={openEditDetails}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-white px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-amber-100"
                                        >
                                            ✏️ Edit Details
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPwdCurrent(password || 'asterix');
                                                setIsChangePasswordOpen(true);
                                            }}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-4 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400"
                                        >
                                            🔑 Password
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLogoutCandidate}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-slate-100 px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-rose-100 hover:text-rose-800"
                                        >
                                            🔒 Log Out
                                        </button>
                                    </div>
                                </div>

                                {/* Summary Badges */}
                                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="shadow-brutal-2 border-2 border-slate-900 bg-amber-100 p-3">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">
                                            Enrolled Track(s)
                                        </span>
                                        <strong className="mt-0.5 block text-xs font-black text-slate-950 uppercase sm:text-sm">
                                            {profile.candidate.packageName || profile.candidate.package}
                                        </strong>
                                    </div>
                                    <div className="shadow-brutal-2 border-2 border-slate-900 bg-emerald-100 p-3">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">
                                            Attendance Score
                                        </span>
                                        <strong className="mt-0.5 block text-xs font-black text-emerald-950 sm:text-sm">
                                            {profile.attendanceSummary.attendancePercentage}% (
                                            {profile.attendanceSummary.totalPresent}/
                                            {profile.attendanceSummary.totalConducted} Sessions)
                                        </strong>
                                    </div>
                                    <div className="shadow-brutal-2 border-2 border-slate-900 bg-sky-100 p-3">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">
                                            Certificate Status
                                        </span>
                                        <strong
                                            className={`mt-0.5 block text-xs font-black ${profile.attendanceSummary.isEligibleForCertificate ? 'text-emerald-800' : 'text-rose-700'}`}
                                        >
                                            {profile.attendanceSummary.isEligibleForCertificate
                                                ? '✓ Eligible (≥75%)'
                                                : '⚠️ Under 75%'}
                                        </strong>
                                    </div>
                                    {nextSession ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSession(nextSession)}
                                            className="shadow-brutal-2 w-full min-w-0 border-2 border-slate-900 bg-slate-100 p-3 text-left hover:bg-white"
                                        >
                                            <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">
                                                Next Session
                                            </span>
                                            <strong className="mt-0.5 block text-xs font-black text-slate-950 uppercase">
                                                {nextSession.date}
                                                {nextSession.isoDate === todayIst ? ' · Today' : ''}
                                            </strong>
                                            <span
                                                className="block truncate text-[11px] font-bold text-slate-600"
                                                title={nextSession.title}
                                            >
                                                {nextSession.title}
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="shadow-brutal-2 border-2 border-slate-900 bg-slate-100 p-3">
                                            <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">
                                                Next Session
                                            </span>
                                            <strong className="mt-0.5 block text-xs font-black text-slate-950 uppercase">
                                                Workshop complete
                                            </strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3 Main Navigation Tabs */}
                            <div className="border-b-4 border-slate-900 bg-white">
                                <div className="grid grid-cols-1 gap-1 border-4 border-slate-900 bg-slate-900 p-1 font-mono text-xs font-black uppercase sm:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('attendance')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'attendance'
                                                ? 'shadow-brutal-2 bg-amber-300 text-slate-950'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        📊 Attendance ({profile.attendanceSummary.totalPresent}/
                                        {profile.attendanceSummary.totalConducted})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('timetable')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'timetable'
                                                ? 'shadow-brutal-2 bg-sky-400 text-slate-950'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        🗓️ Timetable ({profile.sessionTimeline?.length || 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('notes')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'notes'
                                                ? 'shadow-brutal-2 bg-emerald-400 text-slate-950'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        📚 Notes ({profile.resources?.length || 0})
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: Session Attendance */}
                            {activeTab === 'attendance' && (
                                <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                    <div className="flex flex-col justify-between gap-3 border-b-4 border-slate-900 pb-5 md:flex-row md:items-center">
                                        <div>
                                            <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                                Graphical Attendance Visualizer &amp; Certificate Eligibility
                                            </span>
                                            <h3 className="mt-1 text-2xl font-black text-slate-900 uppercase sm:text-3xl">
                                                Attendance Dashboard &amp; Analytics
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    window.location.assign('#workshop-project-submit')
                                                }
                                                className="press shadow-brutal-3 flex items-center gap-1.5 border-2 border-slate-900 bg-emerald-400 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-emerald-300"
                                            >
                                                <span>📤 UPLOAD / SUBMIT PROJECT</span>
                                                <span>→</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Graphical Stats Deck */}
                                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        {/* 1. Circular SVG Arc Gauge Chart */}
                                        <div className="shadow-brutal-4 flex flex-col items-center justify-center border-3 border-slate-900 bg-slate-900 p-5 text-center text-white">
                                            <span className="font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                                                ATTENDANCE RATE GAUGE
                                            </span>

                                            <div className="relative mt-3 flex items-center justify-center">
                                                <svg
                                                    className="h-32 w-32 -rotate-90 transform"
                                                    viewBox="0 0 120 120"
                                                >
                                                    <circle
                                                        cx="60"
                                                        cy="60"
                                                        r="48"
                                                        stroke="#1e293b"
                                                        strokeWidth="12"
                                                        fill="transparent"
                                                    />
                                                    <circle
                                                        cx="60"
                                                        cy="60"
                                                        r="48"
                                                        stroke={
                                                            profile.attendanceSummary.attendancePercentage >=
                                                            75
                                                                ? '#10b981'
                                                                : profile.attendanceSummary
                                                                        .attendancePercentage >= 50
                                                                  ? '#f59e0b'
                                                                  : '#f43f5e'
                                                        }
                                                        strokeWidth="12"
                                                        strokeDasharray="301.59"
                                                        strokeDashoffset={
                                                            301.59 -
                                                            (301.59 *
                                                                (profile.attendanceSummary
                                                                    .attendancePercentage || 0)) /
                                                                100
                                                        }
                                                        strokeLinecap="round"
                                                        fill="transparent"
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute flex flex-col items-center justify-center">
                                                    <span className="font-mono text-2xl font-black text-amber-300">
                                                        {profile.attendanceSummary.attendancePercentage}%
                                                    </span>
                                                    <span className="font-mono text-[9px] font-bold text-slate-400 uppercase">
                                                        {profile.attendanceSummary.totalPresent}/
                                                        {profile.attendanceSummary.totalConducted || 1}{' '}
                                                        Attended
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <span
                                                    className={`inline-block border border-slate-900 px-3 py-1 font-mono text-xs font-black uppercase ${
                                                        profile.attendanceSummary.isEligibleForCertificate
                                                            ? 'bg-emerald-400 text-slate-950'
                                                            : 'bg-amber-300 text-slate-950'
                                                    }`}
                                                >
                                                    {profile.attendanceSummary.isEligibleForCertificate
                                                        ? '✓ Certificate Qualified'
                                                        : '⚠️ Certificate Threshold Pending'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 2. Certificate Threshold Progress Bar */}
                                        <div className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-amber-50/80 p-5">
                                            <div>
                                                <span className="font-mono text-xs font-black tracking-widest text-amber-900 uppercase">
                                                    CERTIFICATE QUALIFICATION METER (75% TARGET)
                                                </span>
                                                <h4 className="mt-1 text-lg font-black text-slate-900 uppercase">
                                                    {profile.attendanceSummary.isEligibleForCertificate
                                                        ? 'Target Reached (≥ 75%)'
                                                        : `${Math.max(0, 75 - profile.attendanceSummary.attendancePercentage)}% Required for Certificate`}
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-700">
                                                    Team Asterix certificates are awarded to candidates
                                                    maintaining 75% or higher session attendance.
                                                </p>
                                            </div>

                                            <div className="mt-4">
                                                <div className="mb-1 flex justify-between font-mono text-[10px] font-black text-slate-700">
                                                    <span>0%</span>
                                                    <span className="text-amber-900">🎯 75% Target</span>
                                                    <span>100%</span>
                                                </div>
                                                <div className="shadow-brutal-2 relative h-6 w-full border-2 border-slate-900 bg-white p-0.5">
                                                    <div
                                                        className="absolute top-0 bottom-0 z-10 w-1 bg-amber-600"
                                                        style={{ left: '75%' }}
                                                        title="75% Target Threshold"
                                                    />
                                                    <div
                                                        className={`h-full transition-all duration-700 ${
                                                            profile.attendanceSummary.attendancePercentage >=
                                                            75
                                                                ? 'bg-emerald-500'
                                                                : 'bg-amber-400'
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, profile.attendanceSummary.attendancePercentage || 0)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Session Statistics Summary */}
                                        <div className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-sky-50/80 p-5">
                                            <span className="font-mono text-xs font-black tracking-widest text-sky-900 uppercase">
                                                SUBSYSTEM SESSION METRICS
                                            </span>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-2.5 text-center">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">
                                                        Total Sessions
                                                    </span>
                                                    <strong className="block text-xl font-black text-slate-900">
                                                        {countedSessions}
                                                    </strong>
                                                </div>
                                                <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-2.5 text-center">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">
                                                        Conducted
                                                    </span>
                                                    <strong className="block text-xl font-black text-sky-900">
                                                        {profile.attendanceSummary.totalConducted || 0}
                                                    </strong>
                                                </div>
                                                <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-2.5 text-center">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">
                                                        Verified Present
                                                    </span>
                                                    <strong className="block text-xl font-black text-emerald-700">
                                                        {profile.attendanceSummary.totalPresent || 0}
                                                    </strong>
                                                </div>
                                                <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-2.5 text-center">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">
                                                        Upcoming
                                                    </span>
                                                    <strong className="block text-xl font-black text-amber-700">
                                                        {countedSessions -
                                                            (profile.attendanceSummary.totalConducted || 0)}
                                                    </strong>
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t-2 border-slate-300 pt-2 font-mono text-[11px] font-bold text-slate-600">
                                                Candidate Track:{' '}
                                                <strong className="text-slate-900 uppercase">
                                                    {profile.candidate.package}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex flex-col justify-between gap-3 border-t-4 border-slate-900 pt-6 sm:flex-row sm:items-center">
                                        <p className="font-mono text-xs font-bold text-slate-700">
                                            Each session&apos;s status, notes and key takeaways are in the
                                            Timetable tab.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('timetable')}
                                            className="press shadow-brutal-2 shrink-0 border-2 border-slate-900 bg-sky-400 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-300"
                                        >
                                            Open timetable →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Workshop Timetable & Schedule */}
                            {activeTab === 'timetable' && (
                                <div className="shadow-brutal-8 space-y-6 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                    {/* Header & Sync Bar */}
                                    <div className="flex flex-col justify-between gap-4 border-b-4 border-slate-900 pb-5 md:flex-row md:items-center">
                                        <div>
                                            <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                                Interactive Workshop Timetable &amp; Master Schedule
                                            </span>
                                            <h3 className="mt-1 text-2xl font-black text-slate-900 uppercase sm:text-3xl">
                                                Workshop Timetable &amp; Session Schedule
                                            </h3>
                                            <p className="mt-1 text-xs font-bold text-slate-600">
                                                Track all session dates, timings, lab venues, handled
                                                instructors, mini projects, and reporting instructions.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadAllIcsFile(
                                                        profile.sessionTimeline || [],
                                                        profile.candidate.packageName ||
                                                            'Team Asterix Workshop',
                                                        profile.trackInfo || {}
                                                    )
                                                }
                                                className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-4 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400"
                                            >
                                                📅 Sync All Sessions to Google Calendar (.ics)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Track Guideline / Venue & Timing Cards */}
                                    {profile.candidate.tracksEnrolled?.map((tId) => {
                                        const trkInfo =
                                            (profile.trackInfo && profile.trackInfo[tId]) ||
                                            WORKSHOP_TRACKS[tId];
                                        if (!trkInfo) return null;
                                        return (
                                            <details
                                                key={tId}
                                                className="group shadow-brutal-2 border-3 border-slate-900 bg-amber-50/70"
                                            >
                                                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase [&::-webkit-details-marker]:hidden">
                                                    <span>⚡ {trkInfo.name} · track info</span>
                                                    <span className="flex items-center gap-2">
                                                        <span>{trkInfo.dates}</span>
                                                        <span className="transition-transform group-open:rotate-180">
                                                            ▾
                                                        </span>
                                                    </span>
                                                </summary>

                                                <div className="border-t-2 border-slate-900 p-4">
                                                    <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
                                                        <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-3">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">
                                                                📅 CLASS DAYS
                                                            </span>
                                                            <strong className="mt-0.5 block font-black text-slate-900">
                                                                {trkInfo.days}
                                                            </strong>
                                                        </div>
                                                        <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-3">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">
                                                                🕒 SESSION TIMINGS
                                                            </span>
                                                            <strong className="mt-0.5 block font-black text-sky-900">
                                                                {trkInfo.timing}
                                                            </strong>
                                                        </div>
                                                        <div className="shadow-brutal-2 border-2 border-slate-900 bg-white p-3">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase">
                                                                📍 LAB VENUE
                                                            </span>
                                                            <strong className="mt-0.5 block font-black text-slate-900">
                                                                {trkInfo.venue}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    {trkInfo.reportingInstructions && (
                                                        <div className="shadow-brutal-2 mt-4 border-2 border-slate-900 bg-amber-200 p-3 font-mono text-xs">
                                                            <strong className="block font-black text-slate-950 uppercase">
                                                                🚨 REPORTING &amp; LAB GUIDELINES:
                                                            </strong>
                                                            <span className="mt-0.5 block font-bold text-slate-900">
                                                                {trkInfo.reportingInstructions}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        );
                                    })}

                                    {/* Search & Filter Toolbar */}
                                    <div className="flex flex-col gap-3 border-t-4 border-slate-900 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                        {/* Filter Pills */}
                                        <div className="flex flex-wrap gap-1.5 font-mono text-xs font-black uppercase">
                                            {[
                                                { id: 'all', label: 'All Sessions' },
                                                { id: 'lecture', label: 'Core Lectures' },
                                                { id: 'handson', label: 'Hands-on Labs' },
                                                { id: 'expert', label: 'Industry Experts' },
                                                { id: 'catchup', label: 'Catch-up' }
                                            ].map((f) => (
                                                <button
                                                    key={f.id}
                                                    type="button"
                                                    onClick={() => setTimetableFilter(f.id)}
                                                    className={`border-2 border-slate-900 px-3 py-1.5 transition-all ${
                                                        timetableFilter === f.id
                                                            ? 'shadow-brutal-2 bg-amber-300 text-slate-950'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Search Input */}
                                        <div className="w-full sm:w-72">
                                            <input
                                                type="text"
                                                value={timetableSearch}
                                                onChange={(e) => setTimetableSearch(e.target.value)}
                                                placeholder="🔍 Search sessions, topics, venue..."
                                                className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Session Timetable Grid */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {profile.sessionTimeline
                                            .filter((item) => {
                                                if (
                                                    timetableFilter !== 'all' &&
                                                    item.type !== timetableFilter
                                                )
                                                    return false;
                                                if (!timetableSearch.trim()) return true;
                                                const q = timetableSearch.toLowerCase();
                                                return (
                                                    item.title?.toLowerCase().includes(q) ||
                                                    item.instructor?.toLowerCase().includes(q) ||
                                                    item.venue?.toLowerCase().includes(q) ||
                                                    item.label?.toLowerCase().includes(q) ||
                                                    item.project?.toLowerCase().includes(q)
                                                );
                                            })
                                            .map((session) => {
                                                const isHoliday = session.type === 'holiday';
                                                const sessionNoteCount =
                                                    notesBySession.get(session.id)?.length || 0;
                                                return (
                                                    <div
                                                        key={session.id}
                                                        role={isHoliday ? undefined : 'button'}
                                                        tabIndex={isHoliday ? undefined : 0}
                                                        onClick={
                                                            isHoliday
                                                                ? undefined
                                                                : () => setSelectedSession(session)
                                                        }
                                                        onKeyDown={
                                                            isHoliday
                                                                ? undefined
                                                                : (e) => {
                                                                      if (
                                                                          e.key === 'Enter' ||
                                                                          e.key === ' '
                                                                      ) {
                                                                          if (e.key === ' ')
                                                                              e.preventDefault();
                                                                          setSelectedSession(session);
                                                                      }
                                                                  }
                                                        }
                                                        className={`shadow-brutal-4 flex flex-col border-3 border-slate-900 bg-slate-50 p-4 justify-between${
                                                            isHoliday
                                                                ? ''
                                                                : ' cursor-pointer transition-all hover:-translate-y-0.5 hover:bg-white'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900/20 pb-2">
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                                        {session.label}
                                                                    </span>
                                                                    {multiTrack && (
                                                                        <span
                                                                            className={`border border-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${
                                                                                session.track === 'powertrain'
                                                                                    ? 'bg-amber-200'
                                                                                    : 'bg-sky-200'
                                                                            }`}
                                                                        >
                                                                            {session.track === 'powertrain'
                                                                                ? 'POWERTRAIN'
                                                                                : 'SOFTWARE'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="font-mono text-xs font-black text-slate-800">
                                                                    {session.date} ({session.days})
                                                                </span>
                                                            </div>

                                                            <h4 className="mt-3 text-base font-black text-slate-900 uppercase">
                                                                {session.title}
                                                            </h4>

                                                            <div className="mt-2 space-y-1 font-mono text-xs font-bold text-slate-600">
                                                                <div>
                                                                    👤 <strong>Instructor:</strong>{' '}
                                                                    {session.instructor}
                                                                </div>
                                                                <div>
                                                                    📍 <strong>Venue:</strong> {session.venue}
                                                                </div>
                                                                {session.project && (
                                                                    <div className="text-amber-900">
                                                                        🚀 <strong>Milestone:</strong>{' '}
                                                                        {session.project}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex items-center justify-between gap-2 border-t-2 border-slate-900/20 pt-3">
                                                            <span
                                                                className={`border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                                                                    isHoliday
                                                                        ? 'bg-slate-200 text-slate-700'
                                                                        : session.status === 'PRESENT'
                                                                          ? 'bg-emerald-400 text-slate-950'
                                                                          : session.status === 'ABSENT'
                                                                            ? 'bg-rose-500 text-white'
                                                                            : session.status === 'OPTIONAL'
                                                                              ? 'bg-violet-200 text-violet-950'
                                                                              : 'bg-sky-200 text-sky-950'
                                                                }`}
                                                            >
                                                                {isHoliday
                                                                    ? '🎉 Holiday · no class'
                                                                    : session.status === 'PRESENT'
                                                                      ? '✅ Verified Present'
                                                                      : session.status === 'ABSENT'
                                                                        ? '❌ Missed'
                                                                        : session.status === 'OPTIONAL'
                                                                          ? '💬 Optional · not counted'
                                                                          : '🕒 Upcoming'}
                                                            </span>
                                                            {!isHoliday && (
                                                                <span className="font-mono text-[10px] font-black text-sky-800 uppercase">
                                                                    {sessionNoteCount > 0
                                                                        ? `📚 ${sessionNoteCount} note${sessionNoteCount === 1 ? '' : 's'} →`
                                                                        : 'View details →'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: Notes, Slides & Study Materials */}
                            {activeTab === 'notes' && (
                                <div className="shadow-brutal-8 space-y-6 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                    <div className="flex flex-col justify-between gap-4 border-b-4 border-slate-900 pb-5 md:flex-row md:items-center">
                                        <div>
                                            <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                                Shared by the workshop team
                                            </span>
                                            <h3 className="mt-1 text-2xl font-black text-slate-900 uppercase sm:text-3xl">
                                                Workshop Notes &amp; Study Materials
                                            </h3>
                                            <p className="mt-1 text-xs font-bold text-slate-600">
                                                Notes, slides and links for your sessions, added as the
                                                workshop goes on.
                                            </p>
                                        </div>
                                        <a
                                            href="https://github.com/Team-Asterix264016"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-slate-900 px-4 py-2.5 font-mono text-xs font-black text-amber-300 uppercase no-underline hover:bg-slate-800"
                                        >
                                            💻 Team Asterix GitHub Vault ↗
                                        </a>
                                    </div>

                                    {notesResources.length === 0 ? (
                                        <div className="shadow-brutal-4 border-3 border-slate-900 bg-slate-50 p-6 text-center">
                                            <p className="text-lg font-black text-slate-900 uppercase">
                                                No notes published yet
                                            </p>
                                            <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                                                Session notes, slides and links will appear here once the
                                                workshop team uploads them.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Search & Filter Controls */}
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                {/* Module Filters */}
                                                {notesModules.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 font-mono text-xs font-black uppercase">
                                                        {[
                                                            { id: 'all', label: 'All' },
                                                            ...notesModules.map((mod) => ({
                                                                id: mod,
                                                                label: mod
                                                            }))
                                                        ].map((m) => (
                                                            <button
                                                                key={m.id}
                                                                type="button"
                                                                onClick={() => setNotesModuleFilter(m.id)}
                                                                className={`border-2 border-slate-900 px-3 py-1 transition-all ${
                                                                    activeNotesModule === m.id
                                                                        ? 'shadow-brutal-2 bg-emerald-400 text-slate-950'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                {m.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Search Bar */}
                                                <div className="w-full sm:w-72">
                                                    <input
                                                        type="text"
                                                        value={notesSearch}
                                                        onChange={(e) => setNotesSearch(e.target.value)}
                                                        placeholder="🔍 Search notes by keyword..."
                                                        className="w-full border-2 border-slate-900 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {filteredNotes.length === 0 && (
                                                <div className="border-3 border-slate-900 bg-slate-50 p-5 text-center font-mono text-xs font-black text-slate-600 uppercase">
                                                    No notes match your search.
                                                </div>
                                            )}

                                            {/* Resources Grid */}
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                {filteredNotes.map((item, idx) => {
                                                    const noteSession = item.sessionId
                                                        ? profile.sessionTimeline?.find(
                                                              (s) => s.id === item.sessionId
                                                          )
                                                        : null;
                                                    return (
                                                        <div
                                                            key={item._id || item.id || idx}
                                                            className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-sky-50/60 p-5"
                                                        >
                                                            <div>
                                                                <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900 pb-2">
                                                                    <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                                        {item.track?.toUpperCase()} RESOURCE
                                                                    </span>
                                                                    {item.module && (
                                                                        <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                                            {item.module}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {noteSession && (
                                                                    <span
                                                                        className="mt-2 block truncate font-mono text-[10px] font-black text-sky-800 uppercase"
                                                                        title={`${noteSession.date} · ${noteSession.title}`}
                                                                    >
                                                                        🗓 {noteSession.date} ·{' '}
                                                                        {noteSession.title}
                                                                    </span>
                                                                )}

                                                                <h4 className="mt-3 text-lg font-black text-slate-900 uppercase">
                                                                    {item.title}
                                                                </h4>
                                                                {item.description && (
                                                                    <p className="mt-1 text-xs leading-relaxed font-bold text-slate-700">
                                                                        {item.description}
                                                                    </p>
                                                                )}
                                                                {item.takeaways?.length > 0 && (
                                                                    <div className="mt-3">
                                                                        <span className="font-mono text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                                                            Key takeaways
                                                                        </span>
                                                                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs font-bold text-slate-700">
                                                                            {item.takeaways.map(
                                                                                (point, ti) => (
                                                                                    <li key={ti}>{point}</li>
                                                                                )
                                                                            )}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="mt-4 space-y-2 border-t-2 border-slate-300 pt-3">
                                                                {item.resources?.map((res, i) => {
                                                                    return (
                                                                        <a
                                                                            key={i}
                                                                            href={safeHref(res.url)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="press shadow-brutal-2 flex items-center justify-between border-2 border-slate-900 bg-white px-3.5 py-2 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300"
                                                                        >
                                                                            <span>{res.label}</span>
                                                                            <span>
                                                                                {resourceBadge(res.type)}
                                                                            </span>
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <SessionNotesModal
                        session={selectedSession}
                        notes={selectedSession ? notesBySession.get(selectedSession.id) || [] : []}
                        onClose={() => setSelectedSession(null)}
                    />

                    {/* Edit Profile Details Modal */}
                    {isEditDetailsOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
                            <div className="shadow-brutal-8 relative my-auto w-full max-w-lg border-4 border-slate-900 bg-white p-6 sm:p-8">
                                <div className="flex items-start justify-between gap-3 border-b-3 border-slate-900 pb-3">
                                    <div>
                                        <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase">
                                            Participant Credentials
                                        </span>
                                        <h3 className="text-xl font-black text-slate-900 uppercase sm:text-2xl">
                                            Edit Profile Details ✏️
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeEditDetails}
                                        className="press shrink-0 border-2 border-slate-900 bg-slate-100 px-2.5 py-1 font-mono text-xs font-black text-slate-900 hover:bg-rose-200"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleEditDetailsSubmit} className="mt-5 space-y-4">
                                    <div className="border-2 border-slate-900 bg-slate-100 p-3">
                                        <p className="font-mono text-[11px] font-bold text-slate-700">
                                            🔒 Your enrolled track, amount paid and receipt number cannot be
                                            changed here — call the workshop team on{' '}
                                            <a
                                                href="tel:+918608944644"
                                                className="font-black text-slate-950 underline"
                                            >
                                                +91 86089 44644
                                            </a>{' '}
                                            if those need a correction.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Registered Number (Roll No)
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.rollNo}
                                            onChange={(e) =>
                                                updateEditField('rollNo', e.target.value.toUpperCase())
                                            }
                                            placeholder="e.g. 26M125"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black tracking-wider text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                        {editFieldErrors.rollNo ? (
                                            <p className="mt-1 font-mono text-[11px] font-black text-rose-700">
                                                {editFieldErrors.rollNo}
                                            </p>
                                        ) : (
                                            <p className="mt-1 font-mono text-[11px] font-bold text-amber-800">
                                                ⚠️ Fix this if you typed it wrong while registering — your
                                                attendance, project and quiz records move to the corrected
                                                number automatically. Enter it exactly as printed on your ID
                                                card.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => updateEditField('name', e.target.value)}
                                            placeholder="Your full name"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                        {editFieldErrors.name && (
                                            <p className="mt-1 font-mono text-[11px] font-black text-rose-700">
                                                {editFieldErrors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            College Email
                                        </label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => updateEditField('email', e.target.value)}
                                            placeholder="yourname@psgitech.ac.in"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                        {editFieldErrors.email && (
                                            <p className="mt-1 font-mono text-[11px] font-black text-rose-700">
                                                {editFieldErrors.email}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            value={editForm.phone}
                                            onChange={(e) => updateEditField('phone', e.target.value)}
                                            placeholder="10-digit mobile number"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                        {editFieldErrors.phone && (
                                            <p className="mt-1 font-mono text-[11px] font-black text-rose-700">
                                                {editFieldErrors.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Department
                                        </label>
                                        <select
                                            value={editForm.department}
                                            onChange={(e) => updateEditField('department', e.target.value)}
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 focus:bg-amber-50 focus:outline-none"
                                        >
                                            <option value="">Select department</option>
                                            {WORKSHOP_DEPARTMENTS.map((dept) => (
                                                <option key={dept} value={dept}>
                                                    {dept}
                                                </option>
                                            ))}
                                        </select>
                                        {editFieldErrors.department && (
                                            <p className="mt-1 font-mono text-[11px] font-black text-rose-700">
                                                {editFieldErrors.department}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Year
                                        </label>
                                        <select
                                            value={editForm.year}
                                            onChange={(e) => updateEditField('year', e.target.value)}
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 focus:bg-amber-50 focus:outline-none"
                                        >
                                            <option value="">Select year</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                        </select>
                                        {editFieldErrors.year && (
                                            <p className="mt-1 font-mono text-[11px] font-black text-rose-700">
                                                {editFieldErrors.year}
                                            </p>
                                        )}
                                    </div>

                                    <div className="border-t-2 border-slate-200 pt-4">
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Confirm Profile Password
                                        </label>
                                        <input
                                            type="password"
                                            value={editForm.password}
                                            onChange={(e) => updateEditField('password', e.target.value)}
                                            placeholder="Your profile password (Default: asterix)"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                    </div>

                                    {editError && (
                                        <div className="border-2 border-rose-600 bg-rose-50 p-2.5 text-center font-mono text-xs font-black text-rose-800 uppercase">
                                            ⚠️ {editError}
                                        </div>
                                    )}

                                    {editSuccess && (
                                        <div className="border-2 border-emerald-600 bg-emerald-50 p-2.5 text-center font-mono text-xs font-black text-emerald-800 uppercase">
                                            ✓ {editSuccess}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={closeEditDetails}
                                            className="press border-2 border-slate-900 bg-slate-100 px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={editLoading}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-5 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400 disabled:opacity-60"
                                        >
                                            {editLoading ? 'Saving…' : 'Save Details ✏️'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Change Password Modal */}
                    {isChangePasswordOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                            <div className="shadow-brutal-8 relative w-full max-w-md border-4 border-slate-900 bg-white p-6 sm:p-8">
                                <div className="flex items-center justify-between border-b-3 border-slate-900 pb-3">
                                    <div>
                                        <span className="font-mono text-[10px] font-black tracking-widest text-sky-700 uppercase">
                                            Account Security
                                        </span>
                                        <h3 className="text-xl font-black text-slate-900 uppercase sm:text-2xl">
                                            Change Profile Password 🔑
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangePasswordOpen(false);
                                            setPwdError('');
                                            setPwdSuccess('');
                                        }}
                                        className="press border-2 border-slate-900 bg-slate-100 px-2.5 py-1 font-mono text-xs font-black text-slate-900 hover:bg-rose-200"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleChangePasswordSubmit} className="mt-5 space-y-4">
                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            value={pwdCurrent}
                                            onChange={(e) => setPwdCurrent(e.target.value)}
                                            placeholder="Current password (Default: asterix)"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={pwdNew}
                                            onChange={(e) => setPwdNew(e.target.value)}
                                            placeholder="Enter your new password"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={pwdConfirm}
                                            onChange={(e) => setPwdConfirm(e.target.value)}
                                            placeholder="Confirm your new password"
                                            className="w-full border-3 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none"
                                        />
                                    </div>

                                    {pwdError && (
                                        <div className="border-2 border-rose-600 bg-rose-50 p-2.5 text-center font-mono text-xs font-black text-rose-800 uppercase">
                                            ⚠️ {pwdError}
                                        </div>
                                    )}

                                    {pwdSuccess && (
                                        <div className="border-2 border-emerald-600 bg-emerald-50 p-2.5 text-center font-mono text-xs font-black text-emerald-800 uppercase">
                                            ✓ {pwdSuccess}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsChangePasswordOpen(false);
                                                setPwdError('');
                                                setPwdSuccess('');
                                            }}
                                            className="press border-2 border-slate-900 bg-slate-100 px-4 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={pwdLoading}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-5 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-amber-400 disabled:opacity-60"
                                        >
                                            {pwdLoading ? 'Saving…' : 'Save New Password 🔒'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            )}
            {/* FLOATING SIDE CONTACT SUPPORT WIDGET (Visually striking on dark background) */}
            <aside className="fixed bottom-6 right-6 z-50 flex items-center">
                <a
                    href="tel:+918608944644"
                    className="group relative flex items-center gap-3 rounded-none border-3 border-slate-900 bg-amber-300 px-4 py-3 font-mono text-xs font-black text-slate-950 uppercase shadow-[6px_6px_0px_#000000] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:bg-amber-400 hover:shadow-[9px_9px_0px_#000000]"
                    title="Direct Support Line: +91 86089 44644"
                >
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                    </span>
                    <div className="flex flex-col text-left leading-tight">
                        <span className="text-[9px] font-extrabold tracking-widest text-slate-800 uppercase">
                            LOGIN / PROFILE ISSUES?
                        </span>
                        <span className="text-xs font-black text-slate-950">
                            📞 CONTACT +91 86089 44644 →
                        </span>
                    </div>
                </a>
            </aside>
        </div>
    );
}
