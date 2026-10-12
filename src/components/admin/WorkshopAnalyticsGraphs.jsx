import { useState, useMemo } from 'react';

// Department abbreviations for clean badge display
const DEPT_SHORT_CODES = {
    'Civil Engineering': 'CIVIL',
    'Computer Science and Engineering': 'CSE',
    'Electrical and Electronics Engineering': 'EEE',
    'Electronics and Communication Engineering': 'ECE',
    'Mechanical Engineering': 'MECH',
    'Artificial Intelligence and Data Science': 'AI & DS',
    'Robotics and Artificial Intelligence': 'RAI',
    'Electronics Engineering (VLSI Design and Technology)': 'VLSI',
    'Instrumentation and Control Engineering': 'ICE'
};

const DEPT_COLORS = [
    { bg: 'bg-sky-500', bar: '#0284c7', text: 'text-sky-700', badge: 'bg-sky-100 border-sky-400' },
    {
        bg: 'bg-indigo-500',
        bar: '#6366f1',
        text: 'text-indigo-700',
        badge: 'bg-indigo-100 border-indigo-400'
    },
    {
        bg: 'bg-violet-500',
        bar: '#8b5cf6',
        text: 'text-violet-700',
        badge: 'bg-violet-100 border-violet-400'
    },
    { bg: 'bg-teal-500', bar: '#14b8a6', text: 'text-teal-700', badge: 'bg-teal-100 border-teal-400' },
    { bg: 'bg-rose-500', bar: '#f43f5e', text: 'text-rose-700', badge: 'bg-rose-100 border-rose-400' },
    { bg: 'bg-amber-500', bar: '#f59e0b', text: 'text-amber-700', badge: 'bg-amber-100 border-amber-400' },
    {
        bg: 'bg-emerald-500',
        bar: '#10b981',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 border-emerald-400'
    },
    {
        bg: 'bg-orange-500',
        bar: '#f97316',
        text: 'text-orange-700',
        badge: 'bg-orange-100 border-orange-400'
    },
    { bg: 'bg-cyan-500', bar: '#06b6d4', text: 'text-cyan-700', badge: 'bg-cyan-100 border-cyan-400' }
];

const COURSE_CONFIG = {
    software: {
        id: 'software',
        label: 'Software',
        fullLabel: 'Software & Perception',
        color: '#0284c7',
        bg: 'bg-sky-500',
        light: 'bg-sky-100 border-sky-400 text-sky-800'
    },
    powertrain: {
        id: 'powertrain',
        label: 'Powertrain',
        fullLabel: 'Electronics & Powertrain',
        color: '#d97706',
        bg: 'bg-amber-500',
        light: 'bg-amber-100 border-amber-400 text-amber-800'
    },
    combo: {
        id: 'combo',
        label: 'Combo',
        fullLabel: 'All-Access Combo',
        color: '#059669',
        bg: 'bg-emerald-500',
        light: 'bg-emerald-100 border-emerald-400 text-emerald-800'
    }
};

// Helper to compute SVG donut arc path between startAngle and endAngle
function describeDonutArc(cx, cy, rInner, rOuter, startAngle, endAngle) {
    const angleDiff = endAngle - startAngle;
    if (angleDiff >= 2 * Math.PI - 0.0001) {
        const midAngle = startAngle + Math.PI;
        return `${describeDonutArc(cx, cy, rInner, rOuter, startAngle, midAngle)} ${describeDonutArc(cx, cy, rInner, rOuter, midAngle, endAngle)}`;
    }

    const x1_out = cx + rOuter * Math.cos(startAngle);
    const y1_out = cy + rOuter * Math.sin(startAngle);
    const x2_out = cx + rOuter * Math.cos(endAngle);
    const y2_out = cy + rOuter * Math.sin(endAngle);

    const x2_in = cx + rInner * Math.cos(endAngle);
    const y2_in = cy + rInner * Math.sin(endAngle);
    const x1_in = cx + rInner * Math.cos(startAngle);
    const y1_in = cy + rInner * Math.sin(startAngle);

    const largeArc = angleDiff > Math.PI ? 1 : 0;

    return `M ${x1_out} ${y1_out} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2_out} ${y2_out} L ${x2_in} ${y2_in} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1_in} ${y1_in} Z`;
}

// 12-hour label helper
const formatHourLabel = (h) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

export default function WorkshopAnalyticsGraphs({ registrations = [] }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [datasetScope, setDatasetScope] = useState('paid'); // 'paid' | 'all'
    const [chartMode, setChartMode] = useState('sunburst'); // 'sunburst' | 'stackedBar'
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const [highlightDept, setHighlightDept] = useState(null);
    const [selectedDateFilter, setSelectedDateFilter] = useState('peak'); // 'peak' | 'all' | 'YYYY-MM-DD'
    const [hoveredHour, setHoveredHour] = useState(null);

    // Filter registrations based on scope
    const scopedList = useMemo(() => {
        if (datasetScope === 'paid') {
            return registrations.filter((r) => r.status === 'paid');
        }
        return registrations;
    }, [registrations, datasetScope]);

    // 1. COMBINED DEPARTMENT × COURSE BREAKDOWN DATA
    const deptCourseStats = useMemo(() => {
        const deptMap = {};

        scopedList.forEach((r) => {
            const dept = (r.department || 'Not Specified').trim();
            const pkg = String(r.package || 'software')
                .toLowerCase()
                .trim();
            const validPkg = ['software', 'powertrain', 'combo'].includes(pkg) ? pkg : 'software';

            if (!deptMap[dept]) {
                deptMap[dept] = {
                    name: dept,
                    shortCode: DEPT_SHORT_CODES[dept] || dept.slice(0, 5).toUpperCase(),
                    total: 0,
                    courses: {
                        software: 0,
                        powertrain: 0,
                        combo: 0
                    }
                };
            }
            deptMap[dept].total += 1;
            deptMap[dept].courses[validPkg] += 1;
        });

        const sorted = Object.values(deptMap)
            .sort((a, b) => b.total - a.total)
            .map((dept, index) => {
                const total = dept.total;
                return {
                    ...dept,
                    color: DEPT_COLORS[index % DEPT_COLORS.length],
                    pct: scopedList.length > 0 ? ((total / scopedList.length) * 100).toFixed(1) : 0,
                    courses: {
                        software: {
                            count: dept.courses.software,
                            pct: total > 0 ? ((dept.courses.software / total) * 100).toFixed(1) : 0,
                            config: COURSE_CONFIG.software
                        },
                        powertrain: {
                            count: dept.courses.powertrain,
                            pct: total > 0 ? ((dept.courses.powertrain / total) * 100).toFixed(1) : 0,
                            config: COURSE_CONFIG.powertrain
                        },
                        combo: {
                            count: dept.courses.combo,
                            pct: total > 0 ? ((dept.courses.combo / total) * 100).toFixed(1) : 0,
                            config: COURSE_CONFIG.combo
                        }
                    }
                };
            });

        return {
            list: sorted,
            total: scopedList.length
        };
    }, [scopedList]);

    // GEOMETRY FOR SUNBURST (CONCENTRIC STACKED PIE)
    const sunburstArcs = useMemo(() => {
        if (!deptCourseStats.total || deptCourseStats.list.length === 0) {
            return { inner: [], outer: [] };
        }

        const inner = [];
        const outer = [];
        let currentAngle = -Math.PI / 2; // Start at 12 o'clock
        const total = deptCourseStats.total;
        const cx = 160;
        const cy = 160;

        deptCourseStats.list.forEach((dept) => {
            const deptAngleSpan = (dept.total / total) * (2 * Math.PI);
            const startA = currentAngle;
            const endA = currentAngle + deptAngleSpan;

            // Inner Ring: Department (rInner: 56, rOuter: 98)
            inner.push({
                dept,
                startAngle: startA,
                endAngle: endA,
                path: describeDonutArc(cx, cy, 56, 98, startA, endA),
                midAngle: (startA + endA) / 2,
                span: deptAngleSpan
            });

            // Outer Ring: Courses in this Department (rInner: 104, rOuter: 146)
            let courseAngle = startA;
            ['software', 'powertrain', 'combo'].forEach((key) => {
                const c = dept.courses[key];
                if (c.count > 0) {
                    const courseAngleSpan = (c.count / dept.total) * deptAngleSpan;
                    const cStart = courseAngle;
                    const cEnd = courseAngle + courseAngleSpan;
                    outer.push({
                        dept,
                        courseKey: key,
                        course: c,
                        startAngle: cStart,
                        endAngle: cEnd,
                        path: describeDonutArc(cx, cy, 104, 146, cStart, cEnd),
                        midAngle: (cStart + cEnd) / 2,
                        span: courseAngleSpan
                    });
                    courseAngle = cEnd;
                }
            });

            currentAngle = endA;
        });

        return { inner, outer };
    }, [deptCourseStats]);

    // 2. TRACK & PACKAGE BREAKDOWN DATA
    const packageStats = useMemo(() => {
        const pkgs = {
            software: {
                id: 'software',
                label: 'Software & Perception',
                count: 0,
                revenue: 0,
                color: '#0284c7',
                bg: 'bg-sky-50',
                border: 'border-sky-500',
                text: 'text-sky-700'
            },
            powertrain: {
                id: 'powertrain',
                label: 'Electronics & Powertrain',
                count: 0,
                revenue: 0,
                color: '#d97706',
                bg: 'bg-amber-50',
                border: 'border-amber-500',
                text: 'text-amber-700'
            },
            combo: {
                id: 'combo',
                label: 'All-Access Combo',
                count: 0,
                revenue: 0,
                color: '#059669',
                bg: 'bg-emerald-50',
                border: 'border-emerald-500',
                text: 'text-emerald-700'
            }
        };

        scopedList.forEach((r) => {
            const key = String(r.package || '')
                .toLowerCase()
                .trim();
            const target = pkgs[key] || pkgs.software;
            target.count += 1;
            target.revenue += Number(r.amount || 0);
        });

        const totalPkgCount = scopedList.length || 1;
        const totalPkgRev = Object.values(pkgs).reduce((sum, p) => sum + p.revenue, 0) || 1;

        return {
            items: Object.values(pkgs).map((p) => ({
                ...p,
                countPct: ((p.count / totalPkgCount) * 100).toFixed(1),
                revPct: ((p.revenue / totalPkgRev) * 100).toFixed(1)
            })),
            totalCount: scopedList.length,
            totalRevenue: totalPkgRev
        };
    }, [scopedList]);

    // 4. TIME INTELLIGENCE: HOURLY RUSH & TIME-OF-DAY SURGE ANALYSIS
    const timeIntelligence = useMemo(() => {
        // Collect timestamps converted to IST
        const records = [];
        const dateCountMap = {};

        scopedList.forEach((r) => {
            const raw = datasetScope === 'paid' ? r.paidAt || r.createdAt : r.createdAt;
            if (!raw) return;
            const d = new Date(raw);
            if (isNaN(d.getTime())) return;

            // IST Conversions
            const hourFormatter = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                hour12: false
            });
            const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
            const labelFormatter = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: 'short'
            });

            const hour = parseInt(hourFormatter.format(d), 10);
            const dateKey = dateFormatter.format(d);
            const dateLabel = labelFormatter.format(d);

            records.push({ hour, dateKey, dateLabel, raw: d });
            dateCountMap[dateKey] = dateCountMap[dateKey] || { key: dateKey, label: dateLabel, count: 0 };
            dateCountMap[dateKey].count += 1;
        });

        const availableDates = Object.values(dateCountMap).sort((a, b) => b.count - a.count);
        const peakDate = availableDates[0] || null;

        // Determine which date filter applies
        const activeDateKey =
            selectedDateFilter === 'peak'
                ? peakDate?.key
                : selectedDateFilter === 'all'
                  ? 'all'
                  : selectedDateFilter;

        // Filter records for the active date selection
        const targetRecords =
            activeDateKey === 'all' ? records : records.filter((r) => r.dateKey === activeDateKey);

        // 24-Hour Histogram Array
        const hourlyBuckets = Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            label: formatHourLabel(h),
            range: `${formatHourLabel(h)} – ${formatHourLabel((h + 1) % 24)}`,
            count: 0,
            pct: 0
        }));

        targetRecords.forEach((r) => {
            if (r.hour >= 0 && r.hour < 24) {
                hourlyBuckets[r.hour].count += 1;
            }
        });

        const totalWindowRegistrations = targetRecords.length;
        hourlyBuckets.forEach((b) => {
            b.pct =
                totalWindowRegistrations > 0 ? ((b.count / totalWindowRegistrations) * 100).toFixed(1) : 0;
        });

        const maxHourlyCount = Math.max(1, ...hourlyBuckets.map((b) => b.count));
        const peakHourBucket = [...hourlyBuckets].sort((a, b) => b.count - a.count)[0];

        // Group into 4 Actionable Time-of-Day Slots
        const timeSlots = [
            {
                id: 'morning',
                label: 'Morning Lectures',
                hours: '06:00 – 12:00',
                icon: '🌅',
                color: '#0284c7',
                border: 'border-sky-500',
                bg: 'bg-sky-50',
                count: hourlyBuckets.slice(6, 12).reduce((sum, b) => sum + b.count, 0)
            },
            {
                id: 'afternoon',
                label: 'Afternoon & Labs',
                hours: '12:00 – 17:00',
                icon: '☀️',
                color: '#f59e0b',
                border: 'border-amber-500',
                bg: 'bg-amber-50',
                count: hourlyBuckets.slice(12, 17).reduce((sum, b) => sum + b.count, 0)
            },
            {
                id: 'evening',
                label: 'Evening Rush / Hostels',
                hours: '17:00 – 21:00',
                icon: '⚡',
                color: '#ef4444',
                border: 'border-rose-500',
                bg: 'bg-rose-50',
                count: hourlyBuckets.slice(17, 21).reduce((sum, b) => sum + b.count, 0)
            },
            {
                id: 'night',
                label: 'Night Owls',
                hours: '21:00 – 06:00',
                icon: '🌙',
                color: '#8b5cf6',
                border: 'border-violet-500',
                bg: 'bg-violet-50',
                count: [...hourlyBuckets.slice(21, 24), ...hourlyBuckets.slice(0, 6)].reduce(
                    (sum, b) => sum + b.count,
                    0
                )
            }
        ].map((slot) => ({
            ...slot,
            pct: totalWindowRegistrations > 0 ? ((slot.count / totalWindowRegistrations) * 100).toFixed(1) : 0
        }));

        const primeSlot = [...timeSlots].sort((a, b) => b.count - a.count)[0];

        return {
            availableDates,
            peakDate,
            activeDateKey,
            activeDateLabel:
                activeDateKey === 'all'
                    ? 'All Dates Combined'
                    : availableDates.find((d) => d.key === activeDateKey)?.label || activeDateKey,
            hourlyBuckets,
            maxHourlyCount,
            peakHourBucket,
            timeSlots,
            primeSlot,
            totalInScope: totalWindowRegistrations
        };
    }, [scopedList, datasetScope, selectedDateFilter]);

    const formatCurrency = (amt) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amt || 0);

    return (
        <section className="shadow-brutal-4 border-2 border-slate-900 bg-white p-4 font-mono sm:p-5">
            {/* Header & Controls */}
            <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-900 pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black tracking-wide text-slate-900 uppercase sm:text-base">
                            <span>Workshop Analytics & Insights</span>
                            <span className="bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                                {scopedList.length} {datasetScope === 'paid' ? 'Paid' : 'Total'}
                            </span>
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500">
                            Real-time breakdown for departments × courses, package split, and hourly rush
                            analysis.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Scope Switcher */}
                    <div className="inline-flex border-2 border-slate-900 bg-slate-100 p-0.5 text-[10px] font-black uppercase">
                        <button
                            type="button"
                            onClick={() => setDatasetScope('paid')}
                            className={`cursor-pointer px-2.5 py-1 transition-colors ${
                                datasetScope === 'paid'
                                    ? 'shadow-brutal-1 bg-emerald-400 font-black text-slate-950'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            ✓ Confirmed Paid
                        </button>
                        <button
                            type="button"
                            onClick={() => setDatasetScope('all')}
                            className={`cursor-pointer px-2.5 py-1 transition-colors ${
                                datasetScope === 'all'
                                    ? 'shadow-brutal-1 bg-sky-400 font-black text-slate-950'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All ({registrations.length})
                        </button>
                    </div>

                    {/* Collapse / Expand Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-2.5 py-1 text-[10px] font-black text-slate-900 uppercase hover:bg-slate-100"
                        title={isCollapsed ? 'Expand graphs' : 'Collapse graphs'}
                    >
                        {isCollapsed ? 'Show Graphs ▼' : 'Hide Graphs ▲'}
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="space-y-6 pt-4">
                    {scopedList.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs font-bold text-slate-500">
                            No registration records found for scope:{' '}
                            <strong className="uppercase">{datasetScope}</strong>.
                        </div>
                    ) : (
                        <>
                            {/* GRAPH 1: STACKED DEPARTMENT × COURSE PIE / SUNBURST CHART */}
                            <div className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-slate-50 p-4">
                                <div className="flex flex-col justify-between gap-3 border-b border-slate-300 pb-2.5 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 border border-slate-900 bg-sky-500"></span>
                                        <h4 className="text-xs font-black text-slate-900 uppercase sm:text-sm">
                                            1. Department × Registered Course (Stacked Pie / Sunburst)
                                        </h4>
                                    </div>

                                    {/* Chart Mode Switcher */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex border-2 border-slate-900 bg-white p-0.5 text-[10px] font-black uppercase">
                                            <button
                                                type="button"
                                                onClick={() => setChartMode('sunburst')}
                                                className={`cursor-pointer px-2 py-0.5 ${
                                                    chartMode === 'sunburst'
                                                        ? 'bg-slate-900 text-white'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Stacked Pie ◐
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setChartMode('stackedBar')}
                                                className={`cursor-pointer px-2 py-0.5 ${
                                                    chartMode === 'stackedBar'
                                                        ? 'bg-slate-900 text-white'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                Stacked Bars ▤
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Ring Legend Explainer */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-900 bg-white p-2 text-[10px]">
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-slate-900 uppercase">
                                            Ring Structure:
                                        </span>
                                        <span className="flex items-center gap-1 font-bold text-slate-700">
                                            <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-900 bg-indigo-500"></span>
                                            Inner Ring: Department
                                        </span>
                                        <span className="flex items-center gap-1 font-bold text-slate-700">
                                            <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-900 bg-sky-400"></span>
                                            Outer Ring: Enrolled Course
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 font-bold">
                                        <span className="flex items-center gap-1">
                                            <span className="h-2 w-2 border border-slate-900 bg-[#0284c7]"></span>
                                            <span>Software</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="h-2 w-2 border border-slate-900 bg-[#d97706]"></span>
                                            <span>Powertrain</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="h-2 w-2 border border-slate-900 bg-[#059669]"></span>
                                            <span>Combo</span>
                                        </span>
                                    </div>
                                </div>

                                {/* SUNBURST OR STACKED BAR VIEW */}
                                {chartMode === 'sunburst' ? (
                                    <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
                                        {/* SVG Concentric Donut / Sunburst Chart */}
                                        <div className="flex flex-col items-center justify-center p-2 lg:col-span-5">
                                            <div className="relative h-[280px] w-[280px] sm:h-[320px] sm:w-[320px]">
                                                <svg
                                                    viewBox="0 0 320 320"
                                                    className="h-full w-full select-none"
                                                >
                                                    {/* Outer Ring: Courses */}
                                                    <g>
                                                        {sunburstArcs.outer.map((arc, i) => {
                                                            const isHovered =
                                                                hoveredSlice?.type === 'outer' &&
                                                                hoveredSlice?.key ===
                                                                    `${arc.dept.name}-${arc.courseKey}`;
                                                            const isDeptDimmed =
                                                                highlightDept &&
                                                                highlightDept !== arc.dept.name;

                                                            return (
                                                                <path
                                                                    key={`outer-${i}`}
                                                                    d={arc.path}
                                                                    fill={arc.course.config.color}
                                                                    stroke="#0f172a"
                                                                    strokeWidth="1.5"
                                                                    opacity={
                                                                        isDeptDimmed
                                                                            ? 0.25
                                                                            : isHovered
                                                                              ? 1
                                                                              : 0.9
                                                                    }
                                                                    className="cursor-pointer transition-all duration-200 hover:brightness-110"
                                                                    onMouseEnter={() =>
                                                                        setHoveredSlice({
                                                                            type: 'outer',
                                                                            key: `${arc.dept.name}-${arc.courseKey}`,
                                                                            dept: arc.dept,
                                                                            courseKey: arc.courseKey,
                                                                            course: arc.course
                                                                        })
                                                                    }
                                                                    onMouseLeave={() => setHoveredSlice(null)}
                                                                />
                                                            );
                                                        })}
                                                    </g>

                                                    {/* Inner Ring: Departments */}
                                                    <g>
                                                        {sunburstArcs.inner.map((arc, i) => {
                                                            const isHovered =
                                                                hoveredSlice?.type === 'inner' &&
                                                                hoveredSlice?.dept.name === arc.dept.name;
                                                            const isHighlighted =
                                                                highlightDept === arc.dept.name;
                                                            const isDimmed = highlightDept && !isHighlighted;

                                                            const rMid = 77;
                                                            const lx = 160 + rMid * Math.cos(arc.midAngle);
                                                            const ly = 160 + rMid * Math.sin(arc.midAngle);

                                                            return (
                                                                <g key={`inner-${i}`}>
                                                                    <path
                                                                        d={arc.path}
                                                                        fill={arc.dept.color.bar}
                                                                        stroke="#0f172a"
                                                                        strokeWidth="2"
                                                                        opacity={
                                                                            isDimmed
                                                                                ? 0.25
                                                                                : isHovered || isHighlighted
                                                                                  ? 1
                                                                                  : 0.9
                                                                        }
                                                                        className="cursor-pointer transition-all duration-200 hover:brightness-115"
                                                                        onMouseEnter={() =>
                                                                            setHoveredSlice({
                                                                                type: 'inner',
                                                                                dept: arc.dept
                                                                            })
                                                                        }
                                                                        onMouseLeave={() =>
                                                                            setHoveredSlice(null)
                                                                        }
                                                                    />
                                                                    {arc.span > 0.25 && (
                                                                        <text
                                                                            x={lx}
                                                                            y={ly}
                                                                            textAnchor="middle"
                                                                            dominantBaseline="middle"
                                                                            className="pointer-events-none fill-white text-[9px] font-black drop-shadow select-none"
                                                                        >
                                                                            {arc.dept.shortCode}
                                                                        </text>
                                                                    )}
                                                                </g>
                                                            );
                                                        })}
                                                    </g>

                                                    {/* Center Core Display */}
                                                    <circle
                                                        cx="160"
                                                        cy="160"
                                                        r="52"
                                                        fill="#ffffff"
                                                        stroke="#0f172a"
                                                        strokeWidth="2.5"
                                                        className="shadow-inner"
                                                    />

                                                    {hoveredSlice ? (
                                                        hoveredSlice.type === 'inner' ? (
                                                            <g className="pointer-events-none select-none">
                                                                <text
                                                                    x="160"
                                                                    y="142"
                                                                    textAnchor="middle"
                                                                    className="fill-slate-900 text-[12px] font-black uppercase"
                                                                >
                                                                    {hoveredSlice.dept.shortCode}
                                                                </text>
                                                                <text
                                                                    x="160"
                                                                    y="158"
                                                                    textAnchor="middle"
                                                                    className="fill-indigo-600 text-[14px] font-black"
                                                                >
                                                                    {hoveredSlice.dept.total} Seats
                                                                </text>
                                                                <text
                                                                    x="160"
                                                                    y="174"
                                                                    textAnchor="middle"
                                                                    className="fill-slate-500 text-[9px] font-bold"
                                                                >
                                                                    {hoveredSlice.dept.pct}% Cohort
                                                                </text>
                                                            </g>
                                                        ) : (
                                                            <g className="pointer-events-none select-none">
                                                                <text
                                                                    x="160"
                                                                    y="138"
                                                                    textAnchor="middle"
                                                                    className="truncate fill-slate-900 text-[10px] font-black uppercase"
                                                                >
                                                                    {hoveredSlice.dept.shortCode}
                                                                </text>
                                                                <text
                                                                    x="160"
                                                                    y="152"
                                                                    textAnchor="middle"
                                                                    className="text-[10px] font-black"
                                                                    fill={hoveredSlice.course.config.color}
                                                                >
                                                                    {hoveredSlice.course.config.label}
                                                                </text>
                                                                <text
                                                                    x="160"
                                                                    y="166"
                                                                    textAnchor="middle"
                                                                    className="fill-slate-900 text-[13px] font-black"
                                                                >
                                                                    {hoveredSlice.course.count} (
                                                                    {hoveredSlice.course.pct}%)
                                                                </text>
                                                                <text
                                                                    x="160"
                                                                    y="179"
                                                                    textAnchor="middle"
                                                                    className="fill-slate-400 text-[8px] font-bold"
                                                                >
                                                                    of department
                                                                </text>
                                                            </g>
                                                        )
                                                    ) : (
                                                        <g className="pointer-events-none select-none">
                                                            <text
                                                                x="160"
                                                                y="148"
                                                                textAnchor="middle"
                                                                className="fill-slate-900 text-[17px] font-black"
                                                            >
                                                                {deptCourseStats.total}
                                                            </text>
                                                            <text
                                                                x="160"
                                                                y="164"
                                                                textAnchor="middle"
                                                                className="fill-slate-600 text-[9px] font-black tracking-widest uppercase"
                                                            >
                                                                STUDENTS
                                                            </text>
                                                            <text
                                                                x="160"
                                                                y="178"
                                                                textAnchor="middle"
                                                                className="fill-sky-600 text-[8px] font-bold"
                                                            >
                                                                Hover to inspect
                                                            </text>
                                                        </g>
                                                    )}
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Right Side: Department Breakdown Cards */}
                                        <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1 lg:col-span-7">
                                            {deptCourseStats.list.map((dept) => {
                                                const isHighlighted = highlightDept === dept.name;

                                                return (
                                                    <div
                                                        key={dept.name}
                                                        className={`border-2 border-slate-900 bg-white p-2.5 transition-all ${
                                                            isHighlighted
                                                                ? 'shadow-brutal-4 bg-amber-50/50'
                                                                : 'shadow-brutal-2 hover:bg-slate-50'
                                                        }`}
                                                        onMouseEnter={() => setHighlightDept(dept.name)}
                                                        onMouseLeave={() => setHighlightDept(null)}
                                                    >
                                                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                                                            <div className="flex items-center gap-2 truncate pr-2">
                                                                <span
                                                                    className={`py-0.2 shrink-0 border px-1.5 text-[9px] font-black ${dept.color.badge} text-slate-900`}
                                                                >
                                                                    {dept.shortCode}
                                                                </span>
                                                                <span
                                                                    className="truncate text-[11px] text-slate-900"
                                                                    title={dept.name}
                                                                >
                                                                    {dept.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex shrink-0 items-center gap-2">
                                                                <span className="font-black text-slate-900">
                                                                    {dept.total}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-500">
                                                                    ({dept.pct}%)
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Stacked Mini Bar */}
                                                        <div className="mb-1.5 flex h-3 w-full overflow-hidden border border-slate-900 bg-slate-200">
                                                            {dept.courses.software.count > 0 && (
                                                                <div
                                                                    className="h-full bg-[#0284c7]"
                                                                    style={{
                                                                        width: `${dept.courses.software.pct}%`
                                                                    }}
                                                                    title={`Software: ${dept.courses.software.count} (${dept.courses.software.pct}%)`}
                                                                />
                                                            )}
                                                            {dept.courses.powertrain.count > 0 && (
                                                                <div
                                                                    className="h-full bg-[#d97706]"
                                                                    style={{
                                                                        width: `${dept.courses.powertrain.pct}%`
                                                                    }}
                                                                    title={`Powertrain: ${dept.courses.powertrain.count} (${dept.courses.powertrain.pct}%)`}
                                                                />
                                                            )}
                                                            {dept.courses.combo.count > 0 && (
                                                                <div
                                                                    className="h-full bg-[#059669]"
                                                                    style={{
                                                                        width: `${dept.courses.combo.pct}%`
                                                                    }}
                                                                    title={`Combo: ${dept.courses.combo.count} (${dept.courses.combo.pct}%)`}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Exact Course Count Badges */}
                                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sky-700">
                                                                    SW:{' '}
                                                                    <strong className="text-slate-900">
                                                                        {dept.courses.software.count}
                                                                    </strong>
                                                                </span>
                                                                <span>·</span>
                                                                <span className="text-amber-700">
                                                                    PT:{' '}
                                                                    <strong className="text-slate-900">
                                                                        {dept.courses.powertrain.count}
                                                                    </strong>
                                                                </span>
                                                                <span>·</span>
                                                                <span className="text-emerald-700">
                                                                    Combo:{' '}
                                                                    <strong className="text-slate-900">
                                                                        {dept.courses.combo.count}
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-600">
                                                                Top:{' '}
                                                                {dept.courses.combo.count >=
                                                                    dept.courses.software.count &&
                                                                dept.courses.combo.count >=
                                                                    dept.courses.powertrain.count
                                                                    ? 'Combo'
                                                                    : dept.courses.software.count >=
                                                                        dept.courses.powertrain.count
                                                                      ? 'Software'
                                                                      : 'Powertrain'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    /* STACKED HORIZONTAL BARS VIEW */
                                    <div className="space-y-3 pt-1">
                                        {deptCourseStats.list.map((dept) => {
                                            const fillWidth = Math.max(
                                                10,
                                                (dept.total / deptCourseStats.list[0].total) * 100
                                            );

                                            return (
                                                <div
                                                    key={dept.name}
                                                    className="shadow-brutal-2 space-y-1 border-2 border-slate-900 bg-white p-3"
                                                >
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`py-0.2 border px-1.5 text-[9px] font-black ${dept.color.badge} text-slate-900`}
                                                            >
                                                                {dept.shortCode}
                                                            </span>
                                                            <span className="text-slate-900">
                                                                {dept.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-slate-900">
                                                                {dept.total} candidates
                                                            </span>
                                                            <span className="text-[10px] text-slate-500">
                                                                ({dept.pct}%)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Full Stacked Bar */}
                                                    <div
                                                        className="relative flex h-5 overflow-hidden border-2 border-slate-900 bg-slate-100"
                                                        style={{ width: `${fillWidth}%` }}
                                                    >
                                                        {dept.courses.software.count > 0 && (
                                                            <div
                                                                className="flex h-full items-center justify-center border-r border-slate-900 bg-[#0284c7] px-1 text-[9px] font-black text-white"
                                                                style={{
                                                                    width: `${dept.courses.software.pct}%`
                                                                }}
                                                                title={`Software: ${dept.courses.software.count}`}
                                                            >
                                                                {dept.courses.software.count > 1
                                                                    ? `SW:${dept.courses.software.count}`
                                                                    : dept.courses.software.count}
                                                            </div>
                                                        )}
                                                        {dept.courses.powertrain.count > 0 && (
                                                            <div
                                                                className="flex h-full items-center justify-center border-r border-slate-900 bg-[#d97706] px-1 text-[9px] font-black text-white"
                                                                style={{
                                                                    width: `${dept.courses.powertrain.pct}%`
                                                                }}
                                                                title={`Powertrain: ${dept.courses.powertrain.count}`}
                                                            >
                                                                {dept.courses.powertrain.count > 1
                                                                    ? `PT:${dept.courses.powertrain.count}`
                                                                    : dept.courses.powertrain.count}
                                                            </div>
                                                        )}
                                                        {dept.courses.combo.count > 0 && (
                                                            <div
                                                                className="flex h-full items-center justify-center bg-[#059669] px-1 text-[9px] font-black text-white"
                                                                style={{
                                                                    width: `${dept.courses.combo.pct}%`
                                                                }}
                                                                title={`Combo: ${dept.courses.combo.count}`}
                                                            >
                                                                {dept.courses.combo.count > 1
                                                                    ? `Combo:${dept.courses.combo.count}`
                                                                    : dept.courses.combo.count}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 pt-0.5 text-[10px] font-bold text-slate-500">
                                                        <span>
                                                            Software:{' '}
                                                            <strong className="text-sky-700">
                                                                {dept.courses.software.count}
                                                            </strong>
                                                        </span>
                                                        <span>
                                                            Powertrain:{' '}
                                                            <strong className="text-amber-700">
                                                                {dept.courses.powertrain.count}
                                                            </strong>
                                                        </span>
                                                        <span>
                                                            Combo:{' '}
                                                            <strong className="text-emerald-700">
                                                                {dept.courses.combo.count}
                                                            </strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ROW 2: GRAPH 2 (PACKAGES) & GRAPH 4 (TIME INTELLIGENCE / HOURLY RUSH) */}
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                                {/* GRAPH 2: TRACK & PACKAGE BREAKDOWN (5 cols) */}
                                <div className="shadow-brutal-2 flex flex-col justify-between border-2 border-slate-900 bg-slate-50 p-4 lg:col-span-4">
                                    <div>
                                        <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 border border-slate-900 bg-emerald-500"></span>
                                                <h4 className="text-xs font-black text-slate-900 uppercase">
                                                    2. Track & Package Split
                                                </h4>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500">
                                                Seat Breakdown
                                            </span>
                                        </div>

                                        {/* Multi-Segment Stacked Visual Bar */}
                                        <div className="mb-4 space-y-1">
                                            <span className="block text-[10px] font-bold text-slate-600 uppercase">
                                                Overall Student Enrollment Share
                                            </span>
                                            <div className="flex h-4 w-full overflow-hidden border-2 border-slate-900 bg-slate-200">
                                                {packageStats.items.map((pkg) => (
                                                    <div
                                                        key={pkg.id}
                                                        className="group relative h-full transition-all duration-500"
                                                        style={{
                                                            width: `${pkg.countPct}%`,
                                                            backgroundColor: pkg.color
                                                        }}
                                                        title={`${pkg.label}: ${pkg.count} students (${pkg.countPct}%)`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Detailed Package Cards */}
                                        <div className="space-y-2.5">
                                            {packageStats.items.map((pkg) => (
                                                <div
                                                    key={pkg.id}
                                                    className="shadow-brutal-2 flex items-center justify-between border-2 border-slate-900 bg-white p-2.5"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-3 w-3 shrink-0 border border-slate-900"
                                                            style={{ backgroundColor: pkg.color }}
                                                        />
                                                        <div>
                                                            <div className="text-xs font-black text-slate-900">
                                                                {pkg.label}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-500">
                                                                {pkg.countPct}% of total cohort
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right font-mono">
                                                        <div className="text-sm font-black text-slate-900">
                                                            {pkg.count}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-500">
                                                            Enrolled
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Package Summary Footnote */}
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-2.5 text-[10px] text-slate-500">
                                        <span>
                                            Total Seats:{' '}
                                            <strong className="font-bold text-slate-900">
                                                {packageStats.totalCount}
                                            </strong>
                                        </span>
                                        <span>
                                            Cohort Total:{' '}
                                            <strong className="font-black text-sky-800">
                                                {packageStats.totalCount} Participants
                                            </strong>
                                        </span>
                                    </div>
                                </div>

                                {/* GRAPH 4: TIME INTELLIGENCE & HOURLY RUSH ANALYSIS (8 cols) */}
                                <div className="shadow-brutal-2 flex flex-col justify-between space-y-4 border-2 border-slate-900 bg-slate-50 p-4 lg:col-span-8">
                                    <div>
                                        {/* Header & Date Scope Controls */}
                                        <div className="flex flex-col justify-between gap-2.5 border-b border-slate-300 pb-2.5 sm:flex-row sm:items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 border border-slate-900 bg-amber-500"></span>
                                                <div>
                                                    <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                                                        <span>
                                                            4. Registration Time Intelligence & Hourly Rush
                                                        </span>
                                                        <span className="py-0.2 border border-amber-500 bg-amber-200 px-1.5 text-[9px] font-black text-amber-900">
                                                            IST (24H)
                                                        </span>
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Date Selector Filter */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                    Window:
                                                </span>
                                                <select
                                                    value={selectedDateFilter}
                                                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                                                    className="shadow-brutal-1 cursor-pointer border border-slate-900 bg-white px-2 py-1 text-[10px] font-black text-slate-900 focus:outline-none"
                                                >
                                                    {timeIntelligence.peakDate && (
                                                        <option value="peak">
                                                            🔥 Peak Surge: {timeIntelligence.peakDate.label} (
                                                            {timeIntelligence.peakDate.count})
                                                        </option>
                                                    )}
                                                    <option value="all">
                                                        All Dates Combined ({scopedList.length})
                                                    </option>
                                                    {timeIntelligence.availableDates.map((d) => (
                                                        <option key={d.key} value={d.key}>
                                                            {d.label} ({d.count} registrations)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Highlight Badges Bar */}
                                        <div className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            <div className="shadow-brutal-1 border border-slate-900 bg-white p-2">
                                                <span className="block text-[9px] font-bold text-slate-500 uppercase">
                                                    Selected Window
                                                </span>
                                                <span className="block truncate text-xs font-black text-slate-900">
                                                    {timeIntelligence.activeDateLabel}
                                                </span>
                                                <span className="font-mono text-[9px] text-slate-500">
                                                    {timeIntelligence.totalInScope} signups
                                                </span>
                                            </div>

                                            <div className="shadow-brutal-1 border border-slate-900 bg-amber-50 p-2">
                                                <span className="block text-[9px] font-black text-amber-800 uppercase">
                                                    🔥 Peak Rush Hour
                                                </span>
                                                <span className="block truncate text-xs font-black text-amber-900">
                                                    {timeIntelligence.peakHourBucket?.range}
                                                </span>
                                                <span className="font-mono text-[9px] font-bold text-amber-700">
                                                    {timeIntelligence.peakHourBucket?.count} candidates (
                                                    {timeIntelligence.peakHourBucket?.pct}%)
                                                </span>
                                            </div>

                                            <div className="shadow-brutal-1 border border-slate-900 bg-rose-50 p-2">
                                                <span className="block text-[9px] font-black text-rose-800 uppercase">
                                                    ⚡ Prime Time Slot
                                                </span>
                                                <span className="block truncate text-xs font-black text-rose-900">
                                                    {timeIntelligence.primeSlot?.label}
                                                </span>
                                                <span className="font-mono text-[9px] font-bold text-rose-700">
                                                    {timeIntelligence.primeSlot?.count} signups (
                                                    {timeIntelligence.primeSlot?.pct}%)
                                                </span>
                                            </div>

                                            <div className="shadow-brutal-1 border border-slate-900 bg-sky-50 p-2">
                                                <span className="block text-[9px] font-black text-sky-800 uppercase">
                                                    Avg Speed / Hour
                                                </span>
                                                <span className="block text-xs font-black text-slate-900">
                                                    {(timeIntelligence.totalInScope / 24).toFixed(1)} / hr
                                                </span>
                                                <span className="font-mono text-[9px] font-bold text-sky-700">
                                                    Peak: {timeIntelligence.maxHourlyCount} / hr
                                                </span>
                                            </div>
                                        </div>

                                        {/* 24-HOUR HOURLY HISTOGRAM */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                                                <span className="uppercase">
                                                    Hour-by-Hour Activity (00:00 → 23:59 IST)
                                                </span>
                                                <span className="text-slate-500">
                                                    Hover bar to inspect specific hour
                                                </span>
                                            </div>

                                            <div className="shadow-brutal-2 relative overflow-x-auto border border-slate-900 bg-white p-2 pt-6 pb-2">
                                                <div className="flex h-32 min-w-[540px] items-end gap-1 border-b-2 border-slate-900 px-1 sm:gap-1.5">
                                                    {timeIntelligence.hourlyBuckets.map((bucket) => {
                                                        const isPeak =
                                                            bucket.count ===
                                                                timeIntelligence.maxHourlyCount &&
                                                            bucket.count > 0;
                                                        const isHovered = hoveredHour === bucket.hour;
                                                        const heightPct =
                                                            bucket.count > 0
                                                                ? Math.max(
                                                                      10,
                                                                      (bucket.count /
                                                                          timeIntelligence.maxHourlyCount) *
                                                                          100
                                                                  )
                                                                : 2;

                                                        return (
                                                            <div
                                                                key={bucket.hour}
                                                                className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
                                                                onMouseEnter={() =>
                                                                    setHoveredHour(bucket.hour)
                                                                }
                                                                onMouseLeave={() => setHoveredHour(null)}
                                                            >
                                                                {/* Count label above bar */}
                                                                {bucket.count > 0 && (
                                                                    <div
                                                                        className={`mb-0.5 text-[9px] font-black transition-all ${
                                                                            isPeak || isHovered
                                                                                ? 'scale-110 font-black text-slate-900'
                                                                                : 'text-slate-500'
                                                                        }`}
                                                                    >
                                                                        {bucket.count}
                                                                    </div>
                                                                )}

                                                                {/* Vertical Bar */}
                                                                <div
                                                                    className={`w-full max-w-[20px] transition-all duration-300 ${
                                                                        bucket.count === 0
                                                                            ? 'h-[2px] bg-slate-200'
                                                                            : isPeak
                                                                              ? 'shadow-brutal-1 border border-slate-900 bg-amber-400'
                                                                              : isHovered
                                                                                ? 'border border-slate-900 bg-sky-500'
                                                                                : 'border border-slate-900 bg-sky-400 hover:bg-sky-300'
                                                                    }`}
                                                                    style={{ height: `${heightPct}%` }}
                                                                >
                                                                    {isPeak && (
                                                                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-700">
                                                                            ★
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Hour label below axis (every 2 hours on compact, all on hover) */}
                                                                <span
                                                                    className={`mt-1.5 truncate text-[8px] font-bold tracking-tighter ${
                                                                        isHovered || isPeak
                                                                            ? 'font-black text-slate-900'
                                                                            : 'text-slate-500'
                                                                    }`}
                                                                >
                                                                    {bucket.hour % 3 === 0
                                                                        ? formatHourLabel(bucket.hour)
                                                                        : '·'}
                                                                </span>

                                                                {/* Hover Tooltip Floating Card */}
                                                                {isHovered && (
                                                                    <div className="pointer-events-none absolute -top-14 z-30 border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold whitespace-nowrap text-white shadow-xl">
                                                                        <div className="font-mono text-sky-300">
                                                                            {bucket.range}
                                                                        </div>
                                                                        <div>
                                                                            {bucket.count} candidates (
                                                                            {bucket.pct}% of period)
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4 TIME-OF-DAY SLOTS COMPARISON */}
                                        <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
                                            {timeIntelligence.timeSlots.map((slot) => (
                                                <div
                                                    key={slot.id}
                                                    className={`border-2 border-slate-900 p-2 ${slot.bg} shadow-brutal-2 flex flex-col justify-between`}
                                                >
                                                    <div>
                                                        <div className="mb-0.5 flex items-center justify-between text-xs font-black text-slate-900">
                                                            <span className="flex items-center gap-1">
                                                                <span>{slot.icon}</span>
                                                                <span className="truncate">{slot.label}</span>
                                                            </span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-slate-500">
                                                            {slot.hours}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <div className="flex items-center justify-between text-xs font-black">
                                                            <span className="text-slate-900">
                                                                {slot.count} seats
                                                            </span>
                                                            <span
                                                                className="text-[10px]"
                                                                style={{ color: slot.color }}
                                                            >
                                                                {slot.pct}%
                                                            </span>
                                                        </div>
                                                        {/* Mini progress bar */}
                                                        <div className="mt-1 h-1.5 w-full overflow-hidden border border-slate-900 bg-slate-200">
                                                            <div
                                                                className="h-full"
                                                                style={{
                                                                    width: `${slot.pct}%`,
                                                                    backgroundColor: slot.color
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time Intelligence Footnote */}
                                    <div className="flex flex-wrap items-center justify-between border-t border-slate-300 pt-2.5 text-[10px] text-slate-500">
                                        <span>
                                            Timezone: <strong>Indian Standard Time (IST / UTC+05:30)</strong>
                                        </span>
                                        <span>
                                            Insight: <strong>{timeIntelligence.primeSlot?.label}</strong> is
                                            the most active registration period.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
