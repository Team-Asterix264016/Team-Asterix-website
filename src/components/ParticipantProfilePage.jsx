import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../lib/api';
import { useCommunityAuth } from '../context/CommunityAuthContext';
import { downloadAllIcsFile, getGoogleCalendarUrl } from '../utils/calendarUtils';
import { WORKSHOP_TRACKS } from '../../server/src/config/workshopPackages.js';

const SUBSYSTEMS_PORTAL_DATA = [
    {
        id: 'software-perception',
        name: 'Software & Perception Subsystem',
        badge: 'AI & AUTONOMY',
        color: 'bg-sky-400 text-slate-950',
        tagline: 'ROS 2 Humble/Jazzy Architecture, Cartographer SLAM, YOLOv8 Neural Perception & TEB Path Planning.',
        details: 'Handles drive-by-wire autonomy algorithms, LiDAR 3D point-cloud clustering, stereo depth perception, and digital twin Gazebo simulation.',
        officialContact: 'ratheeswar.asterix@gmail.com',
        phone: '+91 86089 44644'
    },
    {
        id: 'powertrain',
        name: 'Powertrain & BMS Subsystem',
        badge: 'EV POWER & ENERGY',
        color: 'bg-amber-400 text-slate-950',
        tagline: '72V High-Voltage Battery Enclosure, Active Cell Balancing BMS, Inverter Drive & LTspice Simulations.',
        details: 'Architects electric drive motors, high-current busbars, thermal management, and power electronics simulation testbenches.',
        officialContact: 'rithvik.asterix@gmail.com',
        phone: '+91 94433 87654'
    },
    {
        id: 'mechanical',
        name: 'Mechanical & Dynamics Subsystem',
        badge: 'CHASSIS & FEA',
        color: 'bg-emerald-400 text-slate-950',
        tagline: 'AISI 4130 Chromoly Spaceframe, Double-Wishbone Suspension Kinematics, SolidWorks & ANSYS FEA.',
        details: 'Engineers structural safety cage, TIG welding fabrication, dynamic damper valving, and high-impact crash worthiness.',
        officialContact: 'ananya.mech@psgitech.ac.in',
        phone: '+91 97900 11223'
    },
    {
        id: 'leads-admin',
        name: 'Embedded Comms & Telemetry',
        badge: 'HARDWARE & GATEWAYS',
        color: 'bg-purple-400 text-slate-950',
        tagline: 'ESP32 Microcontrollers, FreeRTOS, ISO 11898 CAN Bus Gateway & Wireless Pit Wall Telemetry.',
        details: 'Interfaces drive-by-wire actuators, pedal encoders, emergency stop relays, and live telemetry data streaming.',
        officialContact: 'asterix.psgitech@gmail.com',
        phone: '+91 86089 44644'
    }
];

const ACHIEVEMENTS_DATA = [
    {
        id: 'ach-1',
        title: 'ROS 2 Autonomous Navigation & SLAM Pipeline',
        category: 'SOFTWARE & AUTONOMY',
        subsystem: 'Software & Perception',
        date: 'Jan 2026',
        desc: 'Designed and deployed a full 2D/3D Cartographer SLAM and TEB Local Planner pipeline on the vehicle onboard computer, maintaining <5cm trajectory accuracy on off-road terrain.',
        badge: 'VERIFIED OPERATIONAL',
        tech: ['ROS 2 Humble', 'C++', 'TEB Local Planner', 'Cartographer', 'TF2']
    },
    {
        id: 'ach-2',
        title: 'LiDAR & Neural Vision Fusion for Cone Tracking',
        category: 'PERCEPTION & AI',
        subsystem: 'Software & Perception',
        date: 'Feb 2026',
        desc: 'Integrated 3D LiDAR point-cloud clustering with YOLOv8 camera detection for 360° obstacle boundary estimation at 45 FPS on NVIDIA Jetson Orin Nano.',
        badge: 'VERIFIED OPERATIONAL',
        tech: ['PyTorch', 'CUDA', 'OpenCV', 'LiDAR PointCloud2', 'TensorRT']
    },
    {
        id: 'ach-3',
        title: 'High-Voltage Battery Pack & Active BMS System',
        category: 'POWERTRAIN & ENERGY',
        subsystem: 'Powertrain & BMS',
        date: 'Dec 2025',
        desc: 'Engineered a custom 72V LiFePO4 battery pack with active cell balancing, CAN-bus thermal monitoring, and LTspice simulated motor drive dynamics.',
        badge: 'VERIFIED OPERATIONAL',
        tech: ['LTspice', 'Active BMS', 'CAN 2.0B', 'Thermal FEA']
    },
    {
        id: 'ach-4',
        title: 'Hardware-In-The-Loop (HIL) Drive-By-Wire Testbench',
        category: 'EMBEDDED & CONTROLS',
        subsystem: 'Embedded Comms',
        date: 'Jan 2026',
        desc: 'Built a benchtop HIL simulator connecting ESP32 FreeRTOS microcontrollers with electronic throttle, brake actuators, and steering encoders.',
        badge: 'VERIFIED OPERATIONAL',
        tech: ['ESP32', 'FreeRTOS', 'CAN Bus', 'PWM Motor Drivers']
    },
    {
        id: 'ach-5',
        title: '3D Chromoly Spaceframe & Suspension Digital Twin',
        category: 'MECHANICAL & DYNAMICS',
        subsystem: 'Mechanical & Chassis',
        date: 'Nov 2025',
        desc: 'Modeled and optimized the vehicle AISI 4130 spaceframe cage in SolidWorks with ANSYS structural impact testing and dynamic Gazebo track simulation.',
        badge: 'VERIFIED OPERATIONAL',
        tech: ['SolidWorks', 'ANSYS FEA', 'Gazebo Sim', 'Rviz2']
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
        const W = 640, PAD = 36, LABEL_W = 170, LINE_H = 24, ROW_PAD = 18;
        const HEADER_H = 128, FOOTER_H = 84;
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

        const H = HEADER_H + laid.reduce((sum, row) => sum + row.lines.length * LINE_H + ROW_PAD, 0) + FOOTER_H + 16;
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('attendance');
    const [timetableFilter, setTimetableFilter] = useState('all');
    const [timetableSearch, setTimetableSearch] = useState('');
    const [notesModuleFilter, setNotesModuleFilter] = useState('all');
    const [notesSearch, setNotesSearch] = useState('');

    const fetchProfile = useCallback(async (queryVal) => {
        const target = queryVal || identifier;
        if (!target.trim()) {
            setError('Please enter your Email ID, Phone Number, or Roll Number.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(apiUrl('/api/workshop/attendance/profile'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: target.trim() })
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                setProfile(data);
            } else {
                setError(data.error || 'No participant registration found for this query.');
                setProfile(null);
            }
        } catch {
            setError('Could not connect to server. Check your connection and try again.');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [identifier]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const queryParam =
            params.get('query') ||
            params.get('id') ||
            params.get('email') ||
            params.get('phone') ||
            currentMember?.rollNo ||
            currentMember?.email ||
            currentMember?.phone;

        if (queryParam) {
            setIdentifier(queryParam);
            fetchProfile(queryParam);
        }
    }, [fetchProfile, currentMember]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProfile();
    };

    const handleSubsystemNavigate = (subsystemId) => {
        if (onSelectSubsystem) {
            onSelectSubsystem(subsystemId);
        } else {
            window.location.hash = `#subsystem`;
        }
    };

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
                            <strong className="block text-xs font-black uppercase sm:text-sm">Member &amp; Subsystems Hub 🔓</strong>
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
                            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-5xl">
                                UNLOCK YOUR PERMANENT PROFILE
                            </h1>
                            <p className="mx-auto mt-3 max-w-xl text-xs font-bold leading-relaxed text-slate-600 sm:text-sm">
                                Enter your college email ID, registered phone number, or roll number below to access your individual workshop attendance summary, class lecture slides, SPICE circuits, Colab notebooks, and payment receipt.
                            </p>
                        </div>

                        <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="College Email ID / Phone No / Roll No (e.g. 26M125)"
                                className="min-h-14 w-full border-3 border-slate-900 bg-slate-50 px-4 py-3.5 font-mono text-base font-black text-slate-900 placeholder:text-slate-400 focus:bg-amber-50 focus:outline-none focus:ring-3 focus:ring-amber-400"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="press shadow-brutal-4-brand min-h-14 shrink-0 border-3 border-slate-900 bg-amber-300 px-8 py-3.5 font-mono text-sm font-black text-slate-950 uppercase hover:bg-amber-400 disabled:opacity-60"
                            >
                                {loading ? 'Searching Profile…' : 'Open Profile 🔓'}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 border-2 border-rose-600 bg-rose-50 p-3 text-center font-mono text-xs font-black uppercase text-rose-800">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="mt-8 grid grid-cols-1 gap-3 border-t-4 border-slate-900 pt-6 sm:grid-cols-3">
                            <div className="border-2 border-slate-900 bg-sky-50 p-3.5 text-center shadow-brutal-2">
                                <span className="text-xl">📊</span>
                                <h4 className="mt-1 font-mono text-xs font-black uppercase text-slate-900">Live QR Attendance</h4>
                                <p className="mt-0.5 font-mono text-[10px] font-bold text-slate-600">Track check-ins &amp; 75% certificate qualification</p>
                            </div>
                            <div className="border-2 border-slate-900 bg-emerald-50 p-3.5 text-center shadow-brutal-2">
                                <span className="text-xl">📚</span>
                                <h4 className="mt-1 font-mono text-xs font-black uppercase text-slate-900">Subsystem Materials</h4>
                                <p className="mt-0.5 font-mono text-[10px] font-bold text-slate-600">ROS 2, OpenCV, LTspice &amp; ESP32 notes</p>
                            </div>
                            <div className="border-2 border-slate-900 bg-amber-50 p-3.5 text-center shadow-brutal-2">
                                <span className="text-xl">💳</span>
                                <h4 className="mt-1 font-mono text-xs font-black uppercase text-slate-900">Verified Receipt</h4>
                                <p className="mt-0.5 font-mono text-[10px] font-bold text-slate-600">Download official payment receipt PNG</p>
                            </div>
                        </div>
                    </div>

                    {/* Official Subsystems & Team Portal Hub */}
                    <div className="mt-12 space-y-6">
                        <div className="border-b-4 border-white/20 pb-4 text-center">
                            <span className="border-2 border-slate-900 bg-sky-400 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase">
                                🛠️ OFFICIAL SUBSYSTEM DECK DIRECTORY
                            </span>
                            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                                EXPLORE SUBSYSTEMS &amp; OFFICIAL TEAM CONTACTS
                            </h2>
                            <p className="mx-auto mt-2 max-w-2xl font-mono text-xs font-bold text-slate-300">
                                Connect safely with official subsystem leads and explore technical specifications, CAD models, and contact lines directly on the official Subsystem Portal.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {SUBSYSTEMS_PORTAL_DATA.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900 pb-3">
                                            <span className={`border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${sub.color}`}>
                                                {sub.badge}
                                            </span>
                                            <span className="font-mono text-[10px] font-black text-sky-800 uppercase">
                                                OFFICIAL DECK
                                            </span>
                                        </div>

                                        <h3 className="mt-3 text-2xl font-black uppercase text-slate-900">{sub.name}</h3>
                                        <p className="mt-1 font-mono text-xs font-bold text-slate-700 leading-relaxed">
                                            {sub.tagline}
                                        </p>

                                        <p className="mt-3 text-xs text-slate-600 leading-relaxed font-medium">
                                            {sub.details}
                                        </p>

                                        <div className="mt-4 border-t-2 border-slate-200 pt-3 font-mono text-[11px] space-y-1">
                                            <div>📧 <strong>Official Email:</strong> {sub.officialContact}</div>
                                            <div>📞 <strong>Official Contact:</strong> {sub.phone}</div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleSubsystemNavigate(sub.id)}
                                        className="press shadow-brutal-3 mt-6 flex w-full items-center justify-center gap-2 border-2 border-slate-900 bg-amber-300 py-3 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-400"
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
                    {/* Header Bar to Switch Candidate */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-4 border-white/20 pb-4 text-white">
                        <div>
                            <span className="font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                                Permanent Member Profile
                            </span>
                            <h1 className="text-2xl font-black uppercase text-white sm:text-3xl">
                                {profile.candidate.name}&apos;s Permanent Locker &amp; Portfolio
                            </h1>
                        </div>
                        <button
                            type="button"
                            onClick={() => setProfile(null)}
                            className="press shadow-brutal-2 border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-amber-300"
                        >
                            🔍 Search Another Candidate
                        </button>
                    </div>

                    {/* Profile Dashboard */}
                    {profile && profile.candidate && (
                        <div className="space-y-8">
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

                                        <h2 className="mt-3 text-2xl font-black uppercase text-slate-900 sm:text-4xl">
                                            {profile.candidate.name}
                                        </h2>
                                        <p className="mt-1 font-mono text-sm font-bold text-sky-800">
                                            Roll No: <strong>{profile.candidate.rollNo}</strong> • {profile.candidate.department} ({profile.candidate.year === '1' ? '1st Year' : '2nd Year'})
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => downloadReceipt(receiptRows(profile.candidate), profile.candidate.receiptNo || profile.candidate.rollNo)}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-slate-900 px-4 py-2.5 font-mono text-xs font-black text-amber-300 uppercase hover:bg-slate-800"
                                        >
                                            Download Receipt PNG ↓
                                        </button>
                                    </div>
                                </div>

                                {/* Summary Badges */}
                                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="border-2 border-slate-900 bg-amber-100 p-3 shadow-brutal-2">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">Enrolled Track(s)</span>
                                        <strong className="mt-0.5 block text-xs font-black uppercase text-slate-950 sm:text-sm">
                                            {profile.candidate.packageName || profile.candidate.package}
                                        </strong>
                                    </div>
                                    <div className="border-2 border-slate-900 bg-emerald-100 p-3 shadow-brutal-2">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">Attendance Score</span>
                                        <strong className="mt-0.5 block text-xs font-black text-emerald-950 sm:text-sm">
                                            {profile.attendanceSummary.attendancePercentage}% ({profile.attendanceSummary.totalPresent}/{profile.attendanceSummary.totalConducted} Sessions)
                                        </strong>
                                    </div>
                                    <div className="border-2 border-slate-900 bg-sky-100 p-3 shadow-brutal-2">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">Certificate Status</span>
                                        <strong className={`mt-0.5 block text-xs font-black ${profile.attendanceSummary.isEligibleForCertificate ? 'text-emerald-800' : 'text-rose-700'}`}>
                                            {profile.attendanceSummary.isEligibleForCertificate ? '✓ Eligible (≥75%)' : '⚠️ Under 75%'}
                                        </strong>
                                    </div>
                                    <div className="border-2 border-slate-900 bg-slate-100 p-3 shadow-brutal-2">
                                        <span className="block font-mono text-[10px] font-black text-slate-600 uppercase">Payment Status</span>
                                        <strong className="mt-0.5 block text-xs font-black text-slate-950 uppercase">
                                            Paid ₹{profile.candidate.amount || 1000}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* 4 Main Navigation Tabs */}
                            <div className="border-b-4 border-slate-900 bg-white">
                                <div className="grid grid-cols-2 gap-1 border-4 border-slate-900 bg-slate-900 p-1 font-mono text-xs font-black uppercase md:grid-cols-4">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('attendance')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'attendance'
                                                ? 'bg-amber-300 text-slate-950 shadow-brutal-2'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        📊 Attendance ({profile.attendanceSummary.totalPresent}/{profile.attendanceSummary.totalConducted})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('notes')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'notes'
                                                ? 'bg-sky-400 text-slate-950 shadow-brutal-2'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        📚 Notes &amp; Schedule ({profile.resources.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('achievements')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'achievements'
                                                ? 'bg-emerald-400 text-slate-950 shadow-brutal-2'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        🏎️ Autonomous Projects ({ACHIEVEMENTS_DATA.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('subsystems')}
                                        className={`px-3 py-3 text-center transition-all ${
                                            activeTab === 'subsystems'
                                                ? 'bg-purple-400 text-slate-950 shadow-brutal-2'
                                                : 'text-slate-300 hover:text-white'
                                        }`}
                                    >
                                        🛠️ Subsystem Decks ({SUBSYSTEMS_PORTAL_DATA.length})
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
                                            <h3 className="mt-1 text-2xl font-black uppercase text-slate-900 sm:text-3xl">
                                                Attendance Dashboard &amp; Analytics
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (window.confirm('Clear all attendance activity from the database?')) {
                                                        try {
                                                            const res = await fetch(apiUrl('/api/workshop/attendance/clear-all'), {
                                                                method: 'POST'
                                                            });
                                                            const d = await res.json();
                                                            alert(d.message || 'Attendance activity cleared.');
                                                            fetchProfile();
                                                        } catch {
                                                            alert('Failed to clear DB attendance records.');
                                                        }
                                                    }
                                                }}
                                                className="press shadow-brutal-2 border-2 border-slate-900 bg-rose-500 px-3 py-1.5 font-mono text-xs font-black uppercase text-white hover:bg-rose-600"
                                            >
                                                🧹 Clear DB Attendance Activity
                                            </button>
                                        </div>
                                    </div>

                                    {/* Graphical Stats Deck */}
                                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        {/* 1. Circular SVG Arc Gauge Chart */}
                                        <div className="shadow-brutal-4 border-3 border-slate-900 bg-slate-900 p-5 text-white flex flex-col items-center justify-center text-center">
                                            <span className="font-mono text-xs font-black tracking-widest text-amber-300 uppercase">
                                                ATTENDANCE RATE GAUGE
                                            </span>
                                            
                                            <div className="relative mt-3 flex items-center justify-center">
                                                <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 120 120">
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
                                                            profile.attendanceSummary.attendancePercentage >= 75
                                                                ? '#10b981'
                                                                : profile.attendanceSummary.attendancePercentage >= 50
                                                                ? '#f59e0b'
                                                                : '#f43f5e'
                                                        }
                                                        strokeWidth="12"
                                                        strokeDasharray="301.59"
                                                        strokeDashoffset={
                                                            301.59 - (301.59 * (profile.attendanceSummary.attendancePercentage || 0)) / 100
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
                                                        {profile.attendanceSummary.totalPresent}/{profile.attendanceSummary.totalConducted || 1} Attended
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <span className={`inline-block border border-slate-900 px-3 py-1 font-mono text-xs font-black uppercase ${
                                                    profile.attendanceSummary.isEligibleForCertificate
                                                        ? 'bg-emerald-400 text-slate-950'
                                                        : 'bg-amber-300 text-slate-950'
                                                }`}>
                                                    {profile.attendanceSummary.isEligibleForCertificate
                                                        ? '✓ Certificate Qualified'
                                                        : '⚠️ Certificate Threshold Pending'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 2. Certificate Threshold Progress Bar */}
                                        <div className="shadow-brutal-4 border-3 border-slate-900 bg-amber-50/80 p-5 flex flex-col justify-between">
                                            <div>
                                                <span className="font-mono text-xs font-black tracking-widest text-amber-900 uppercase">
                                                    CERTIFICATE QUALIFICATION METER (75% TARGET)
                                                </span>
                                                <h4 className="mt-1 text-lg font-black uppercase text-slate-900">
                                                    {profile.attendanceSummary.isEligibleForCertificate
                                                        ? 'Target Reached (≥ 75%)'
                                                        : `${Math.max(0, 75 - profile.attendanceSummary.attendancePercentage)}% Required for Certificate`}
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-700">
                                                    Team Asterix certificates are awarded to candidates maintaining 75% or higher session attendance.
                                                </p>
                                            </div>

                                            <div className="mt-4">
                                                <div className="flex justify-between font-mono text-[10px] font-black text-slate-700 mb-1">
                                                    <span>0%</span>
                                                    <span className="text-amber-900">🎯 75% Target</span>
                                                    <span>100%</span>
                                                </div>
                                                <div className="relative h-6 w-full border-2 border-slate-900 bg-white p-0.5 shadow-brutal-2">
                                                    <div
                                                        className="absolute top-0 bottom-0 z-10 w-1 bg-amber-600"
                                                        style={{ left: '75%' }}
                                                        title="75% Target Threshold"
                                                    />
                                                    <div
                                                        className={`h-full transition-all duration-700 ${
                                                            profile.attendanceSummary.attendancePercentage >= 75
                                                                ? 'bg-emerald-500'
                                                                : 'bg-amber-400'
                                                        }`}
                                                        style={{ width: `${Math.min(100, profile.attendanceSummary.attendancePercentage || 0)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Session Statistics Summary */}
                                        <div className="shadow-brutal-4 border-3 border-slate-900 bg-sky-50/80 p-5 flex flex-col justify-between">
                                            <span className="font-mono text-xs font-black tracking-widest text-sky-900 uppercase">
                                                SUBSYSTEM SESSION METRICS
                                            </span>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div className="border-2 border-slate-900 bg-white p-2.5 text-center shadow-brutal-2">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">Total Sessions</span>
                                                    <strong className="block text-xl font-black text-slate-900">{profile.sessionTimeline?.length || 0}</strong>
                                                </div>
                                                <div className="border-2 border-slate-900 bg-white p-2.5 text-center shadow-brutal-2">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">Conducted</span>
                                                    <strong className="block text-xl font-black text-sky-900">{profile.attendanceSummary.totalConducted || 0}</strong>
                                                </div>
                                                <div className="border-2 border-slate-900 bg-white p-2.5 text-center shadow-brutal-2">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">Verified Present</span>
                                                    <strong className="block text-xl font-black text-emerald-700">{profile.attendanceSummary.totalPresent || 0}</strong>
                                                </div>
                                                <div className="border-2 border-slate-900 bg-white p-2.5 text-center shadow-brutal-2">
                                                    <span className="font-mono text-[10px] font-black text-slate-500 uppercase">Upcoming</span>
                                                    <strong className="block text-xl font-black text-amber-700">
                                                        {(profile.sessionTimeline?.length || 0) - (profile.attendanceSummary.totalConducted || 0)}
                                                    </strong>
                                                </div>
                                            </div>

                                            <div className="mt-3 border-t-2 border-slate-300 pt-2 font-mono text-[11px] font-bold text-slate-600">
                                                Candidate Track: <strong className="uppercase text-slate-900">{profile.candidate.package}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session Heatmap Matrix Grid */}
                                    <div className="mt-8 border-t-4 border-slate-900 pt-6">
                                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                            <div>
                                                <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                                    Visual Session Grid &amp; QR Scan Logs
                                                </span>
                                                <h4 className="mt-0.5 text-xl font-black uppercase text-slate-900">
                                                    Session Heatmap &amp; Timeline Nodes ({profile.sessionTimeline.length} Sessions)
                                                </h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2 font-mono text-[11px] font-black uppercase">
                                                <span className="flex items-center gap-1.5 border border-slate-900 bg-emerald-100 px-2 py-1 text-emerald-950">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                                                    <span>Present</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 border border-slate-900 bg-sky-100 px-2 py-1 text-sky-950">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500"></span>
                                                    <span>Upcoming / Scan Lab QR</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {profile.sessionTimeline.map((item) => {
                                                const isPresent = item.status === 'PRESENT';
                                                const isAbsent = item.status === 'ABSENT';

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`border-3 border-slate-900 p-4 shadow-brutal-4 transition-all ${
                                                            isPresent
                                                                ? 'bg-emerald-50/90 border-emerald-900'
                                                                : isAbsent
                                                                ? 'bg-rose-50/90 border-rose-900'
                                                                : 'bg-sky-50/60'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900/20 pb-2">
                                                            <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                                {item.label}
                                                            </span>
                                                            <span className="font-mono text-[11px] font-black text-slate-700">
                                                                {item.date} ({item.days})
                                                            </span>
                                                        </div>

                                                        <div className="mt-3 space-y-1">
                                                            <h5 className="text-sm font-black uppercase text-slate-900 line-clamp-2">
                                                                {item.title}
                                                            </h5>
                                                            <p className="font-mono text-[11px] font-bold text-slate-600">
                                                                👤 Handled by: <strong>{item.instructor}</strong>
                                                            </p>
                                                            <p className="font-mono text-[10px] font-bold text-slate-500">
                                                                📍 {item.venue}
                                                            </p>
                                                        </div>

                                                        <div className="mt-4 pt-2 border-t-2 border-slate-900/20">
                                                            {isPresent ? (
                                                                <div className="flex items-center justify-between border-2 border-emerald-700 bg-emerald-400 p-2 text-slate-950">
                                                                    <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase">
                                                                        <span>✅ VERIFIED PRESENT</span>
                                                                    </div>
                                                                    {item.checkedInAt && (
                                                                        <span className="font-mono text-[10px] font-bold">
                                                                            {new Date(item.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : isAbsent ? (
                                                                <div className="flex items-center justify-between border-2 border-rose-700 bg-rose-500 p-2 text-white font-mono text-xs font-black uppercase">
                                                                    <span>❌ MISSED SESSION</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between border-2 border-slate-900 bg-white p-2 font-mono text-xs font-bold text-slate-700">
                                                                    <span className="flex items-center gap-1 text-sky-800">
                                                                        <span>🕒 UPCOMING</span>
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-slate-900">Scan QR in Lab</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Notes & Study Materials & Calendar Export */}
                            {activeTab === 'notes' && (
                                <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                    <div className="flex flex-col justify-between gap-4 border-b-4 border-slate-900 pb-5 md:flex-row md:items-center">
                                        <div>
                                            <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                                Lecture Slides, Circuit Files, Code Repos &amp; Handouts
                                            </span>
                                            <h3 className="mt-1 text-2xl font-black uppercase text-slate-900 sm:text-3xl">
                                                Workshop Study Materials &amp; Schedule
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => downloadAllIcsFile(profile.sessionTimeline || [])}
                                            className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-400"
                                        >
                                            📅 Sync All Sessions to Calendar (.ics)
                                        </button>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {profile.resources.map((item, idx) => (
                                            <div key={item.id || idx} className="shadow-brutal-4 border-3 border-slate-900 bg-sky-50/60 p-5">
                                                <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                    {item.track?.toUpperCase()} RESOURCE
                                                </span>
                                                <h4 className="mt-2 text-lg font-black uppercase text-slate-900">{item.title}</h4>
                                                {item.description && (
                                                    <p className="mt-1 text-xs font-bold text-slate-700 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}

                                                <div className="mt-4 space-y-2 border-t-2 border-slate-300 pt-3">
                                                    {item.resources?.map((res, i) => (
                                                        <a
                                                            key={i}
                                                            href={res.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="press shadow-brutal-2 flex items-center justify-between border-2 border-slate-900 bg-white px-3.5 py-2 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-amber-300"
                                                        >
                                                            <span>{res.label}</span>
                                                            <span>{res.type === 'pdf' ? '📄 PDF' : res.type === 'code' ? '💻 Code' : '↗ Open'}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: Autonomous Domain Achievements */}
                            {activeTab === 'achievements' && (
                                <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                    <div className="border-b-4 border-slate-900 pb-5">
                                        <span className="font-mono text-xs font-black tracking-widest text-emerald-700 uppercase">
                                            Permanent Autonomous Domain Achievements &amp; Projects
                                        </span>
                                        <h3 className="mt-1 text-2xl font-black uppercase text-slate-900 sm:text-3xl">
                                            Autonomous Engineering Achievements
                                        </h3>
                                        <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                                            Permanent record of R&amp;D projects completed in ROS 2, LTspice Powertrain simulations, OpenCV Perception pipelines, and drive-by-wire hardware.
                                        </p>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        {ACHIEVEMENTS_DATA.map((ach) => (
                                            <div
                                                key={ach.id}
                                                className="shadow-brutal-4 border-3 border-slate-900 bg-slate-50 p-5 transition-all hover:bg-white"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="border border-slate-900 bg-emerald-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                            {ach.badge}
                                                        </span>
                                                        <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                            {ach.category}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-xs font-black text-sky-800">
                                                        Completed: {ach.date}
                                                    </span>
                                                </div>

                                                <h4 className="mt-3 text-xl font-black uppercase text-slate-900">
                                                    {ach.title}
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-700 leading-relaxed">
                                                    {ach.desc}
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-1.5 border-t-2 border-slate-200 pt-3 font-mono text-[10px]">
                                                    <span className="font-black text-slate-500 uppercase">TECH STACK:</span>
                                                    {ach.tech.map((t, i) => (
                                                        <span key={i} className="border border-slate-900 bg-sky-100 px-2 py-0.5 font-bold text-slate-900 uppercase">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: Subsystem Decks & Official Contacts */}
                            {activeTab === 'subsystems' && (
                                <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                    <div className="border-b-4 border-slate-900 pb-5">
                                        <span className="font-mono text-xs font-black tracking-widest text-purple-700 uppercase">
                                            Official Subsystem Decks &amp; Team Contacts
                                        </span>
                                        <h3 className="mt-1 text-2xl font-black uppercase text-slate-900 sm:text-3xl">
                                            Subsystem Decks Directory
                                        </h3>
                                        <p className="mt-1 font-mono text-xs font-bold text-slate-600">
                                            Explore official subsystem technical specifications, CAD models, and contact lines safely listed on the official Subsystem Portal.
                                        </p>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        {SUBSYSTEMS_PORTAL_DATA.map((sub) => (
                                            <div
                                                key={sub.id}
                                                className="shadow-brutal-4 flex flex-col justify-between border-3 border-slate-900 bg-slate-50 p-5 transition-all hover:bg-white"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 border-b-2 border-slate-900 pb-2">
                                                        <span className={`border border-slate-900 px-2 py-0.5 font-mono text-[10px] font-black uppercase ${sub.color}`}>
                                                            {sub.badge}
                                                        </span>
                                                        <span className="font-mono text-[10px] font-black text-sky-800 uppercase">
                                                            OFFICIAL DECK
                                                        </span>
                                                    </div>

                                                    <h4 className="mt-3 text-xl font-black uppercase text-slate-900">{sub.name}</h4>
                                                    <p className="mt-1 font-mono text-xs font-bold text-slate-700 leading-relaxed">
                                                        {sub.tagline}
                                                    </p>

                                                    <p className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">
                                                        {sub.details}
                                                    </p>

                                                    <div className="mt-3 border-t-2 border-slate-200 pt-2 font-mono text-[11px] space-y-0.5 text-slate-700">
                                                        <div>📧 <strong>Official Email:</strong> {sub.officialContact}</div>
                                                        <div>📞 <strong>Official Contact:</strong> {sub.phone}</div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSubsystemNavigate(sub.id)}
                                                    className="press shadow-brutal-2 mt-4 flex w-full items-center justify-center gap-1.5 border-2 border-slate-900 bg-amber-300 py-2.5 font-mono text-xs font-black uppercase text-slate-950 hover:bg-amber-400"
                                                >
                                                    <span>Explore Subsystem Deck &amp; Team Contacts</span>
                                                    <span>→</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            )}
        </div>
    );
}
