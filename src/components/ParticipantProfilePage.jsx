import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

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

export default function ParticipantProfilePage({ onBack }) {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState('attendance');

    useEffect(() => {
        // Auto-search from URL search params
        const params = new URLSearchParams(window.location.search);
        const queryParam = params.get('query') || params.get('id') || params.get('email') || params.get('phone');
        if (queryParam) {
            setIdentifier(queryParam);
            fetchProfile(queryParam);
        }
    }, []);

    const fetchProfile = async (queryVal) => {
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
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchProfile();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 selection:bg-amber-300">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b-4 border-slate-900 bg-white/95 px-4 py-3.5 shadow-[0_4px_0px_#0f172a] backdrop-blur-md sm:px-8">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div>
                        <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            Team Asterix
                        </span>
                        <strong className="block text-sm font-black uppercase">Participant Portal 🔓</strong>
                    </div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="press shadow-brutal-3 border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black uppercase hover:bg-amber-400"
                    >
                        ← Back to Workshop Deck
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
                {/* Search Bar Banner */}
                <div className="shadow-brutal-6 border-4 border-slate-900 bg-slate-900 p-6 text-white sm:p-8">
                    <span className="inline-block border-2 border-amber-300 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-950 uppercase">
                        ✦ INDIVIDUAL PARTICIPANT LOCKER
                    </span>
                    <h1 className="mt-3 text-2xl font-black uppercase sm:text-4xl">
                        View Attendance, Notes &amp; Verified Records
                    </h1>
                    <p className="mt-2 max-w-2xl text-xs font-bold text-slate-300 sm:text-sm">
                        Enter your college email ID, registered phone number, or roll number below to access your individual workshop attendance summary, class lecture slides, SPICE circuits, Colab notebooks, and receipt.
                    </p>

                    <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="College Email ID / Phone No / Roll No (e.g. 26M125)"
                            className="w-full min-h-12 border-3 border-white bg-white px-4 py-3 font-mono text-sm font-black text-slate-900 placeholder:text-slate-500 focus:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="press shadow-brutal-4-brand min-h-12 shrink-0 border-3 border-amber-400 bg-amber-400 px-6 py-3 font-mono text-sm font-black text-slate-950 uppercase hover:bg-amber-300 disabled:opacity-60"
                        >
                            {loading ? 'Searching Profile…' : 'Open Profile 🔓'}
                        </button>
                    </form>

                    {error && (
                        <p className="mt-4 border-2 border-rose-500 bg-rose-950/80 p-3 font-mono text-xs font-black text-rose-200 uppercase">
                            ⚠️ {error}
                        </p>
                    )}
                </div>

                {/* Profile Dashboard */}
                {profile && profile.candidate && (
                    <div className="mt-8 space-y-8">
                        {/* Verified Candidate Profile Card */}
                        <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="border-2 border-slate-900 bg-emerald-400 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                            ✓ VERIFIED PARTICIPANT
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

                        {/* Navigation Tabs */}
                        <div className="border-b-4 border-slate-900 bg-white">
                            <div className="flex border-4 border-slate-900 bg-slate-900 p-1 font-mono text-xs font-black uppercase">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('attendance')}
                                    className={`flex-1 px-4 py-3 transition-all ${
                                        activeTab === 'attendance'
                                            ? 'bg-amber-300 text-slate-950 shadow-brutal-2'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    📊 Session Attendance ({profile.attendanceSummary.totalPresent}/{profile.attendanceSummary.totalConducted})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('notes')}
                                    className={`flex-1 px-4 py-3 transition-all ${
                                        activeTab === 'notes'
                                            ? 'bg-sky-400 text-slate-950 shadow-brutal-2'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    📚 Workshop Notes &amp; Slides ({profile.resources.length})
                                </button>
                            </div>
                        </div>

                        {/* Attendance Tab Content */}
                        {activeTab === 'attendance' && (
                            <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                <div className="flex flex-col justify-between gap-3 border-b-4 border-slate-900 pb-5 md:flex-row md:items-center">
                                    <div>
                                        <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                            Attendance Log &amp; Certificate Eligibility
                                        </span>
                                        <h3 className="mt-1 text-2xl font-black uppercase text-slate-900">
                                            Track Attendance Timeline
                                        </h3>
                                    </div>
                                    <div className="border-2 border-slate-900 bg-amber-100 px-4 py-2 font-mono text-xs font-black">
                                        {profile.attendanceSummary.certificateMessage}
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4">
                                    {profile.sessionTimeline.map((item) => {
                                        const isPresent = item.status === 'PRESENT';
                                        const isAbsent = item.status === 'ABSENT';

                                        return (
                                            <div
                                                key={item.id}
                                                className={`border-3 border-slate-900 p-4 shadow-brutal-4 transition-all ${
                                                    isPresent
                                                        ? 'bg-emerald-50/80'
                                                        : isAbsent
                                                        ? 'bg-rose-50/80'
                                                        : 'bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 uppercase">
                                                                {item.label}
                                                            </span>
                                                            <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase">
                                                                {item.days} ({item.date})
                                                            </span>
                                                            {isPresent ? (
                                                                <span className="border border-slate-900 bg-emerald-400 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                                                                    ✓ PRESENT
                                                                </span>
                                                            ) : isAbsent ? (
                                                                <span className="border border-slate-900 bg-rose-500 px-2.5 py-0.5 font-mono text-[10px] font-black text-white uppercase">
                                                                    ✕ ABSENT
                                                                </span>
                                                            ) : (
                                                                <span className="border border-slate-900 bg-sky-200 px-2.5 py-0.5 font-mono text-[10px] font-black text-slate-800 uppercase">
                                                                    ⏳ UPCOMING
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h4 className="text-base font-black uppercase text-slate-900 sm:text-lg">
                                                            {item.title}
                                                        </h4>
                                                        <p className="font-mono text-xs font-bold text-slate-600">
                                                            👤 Handled by: <strong>{item.instructor}</strong> • 📍 {item.venue}
                                                        </p>
                                                    </div>

                                                    {isPresent && item.checkedInAt && (
                                                        <div className="shrink-0 text-right font-mono text-xs font-bold text-emerald-800">
                                                            <span>Checked in:</span>
                                                            <br />
                                                            <strong>{new Date(item.checkedInAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Notes & Slides Tab Content */}
                        {activeTab === 'notes' && (
                            <div className="shadow-brutal-8 border-4 border-slate-900 bg-white p-6 sm:p-8">
                                <div className="border-b-4 border-slate-900 pb-5">
                                    <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                                        Lecture Slides, Circuit Files, Code Repos &amp; Handouts
                                    </span>
                                    <h3 className="mt-1 text-2xl font-black uppercase text-slate-900">
                                        Workshop Study Materials &amp; Notes
                                    </h3>
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
                    </div>
                )}
            </main>
        </div>
    );
}
