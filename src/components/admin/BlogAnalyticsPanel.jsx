import { useEffect, useState } from 'react';
import { adminGet } from './adminRequest';

// Checked with the dataviz palette validator against the white card surface.
const READ_COLOR = '#0369a1';
const UNREAD_COLOR = '#7c3aed';
const BAR_COLOR = '#0369a1';

const RANGES = [
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
    { days: 365, label: '1 year' }
];

const REACTION_LABELS = {
    like: '❤️ Like',
    insightful: '💡 Insightful',
    fire: '🔥 Fire',
    clap: '👏 Applause'
};
const SHARE_LABELS = {
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
    x: 'X',
    copy: 'Copied link',
    native: 'Phone share sheet'
};

const formatSeconds = (s) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const formatDay = (day) =>
    new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// Long ranges read better as weeks than as hundreds of hairline days.
function bucketDays(daily) {
    if (daily.length <= 60) return daily.map((d) => ({ ...d, label: formatDay(d.day) }));
    const weeks = [];
    for (let i = 0; i < daily.length; i += 7) {
        const slice = daily.slice(i, i + 7);
        weeks.push({
            day: slice[0].day,
            label: `${formatDay(slice[0].day)} – ${formatDay(slice[slice.length - 1].day)}`,
            views: slice.reduce((n, d) => n + d.views, 0),
            reads: slice.reduce((n, d) => n + d.reads, 0)
        });
    }
    return weeks;
}

function Card({ title, children, className = '' }) {
    return (
        <section className={`border-2 border-slate-900 bg-white p-4 ${className}`}>
            <h3 className="font-mono text-[11px] font-black text-slate-900 uppercase">{title}</h3>
            <div className="mt-3">{children}</div>
        </section>
    );
}

function Tile({ label, value, note }) {
    return (
        <div className="border-2 border-slate-900 bg-white p-3">
            <p className="font-mono text-[10px] font-black text-slate-500 uppercase">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
            {note && <p className="mt-0.5 font-mono text-[10px] text-slate-500">{note}</p>}
        </div>
    );
}

// Horizontal bars with the value at the bar's end; one series, so no legend.
function BarList({ rows, emptyText }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    if (rows.every((r) => r.value === 0))
        return <p className="font-mono text-xs text-slate-500">{emptyText}</p>;
    return (
        <ul className="space-y-2">
            {rows.map((row) => (
                <li
                    key={row.label}
                    className="grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 text-sm"
                >
                    <span className="truncate text-slate-700" title={row.label}>
                        {row.label}
                    </span>
                    <span className="flex items-center gap-2">
                        <span
                            className="h-3 rounded-r-[4px]"
                            style={{
                                width: `${(row.value / max) * 85}%`,
                                minWidth: row.value ? 2 : 0,
                                background: BAR_COLOR
                            }}
                        />
                        <span className="font-mono text-xs font-bold whitespace-nowrap text-slate-900 tabular-nums">
                            {row.display ?? row.value}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

// Daily views split into readers who finished and readers who did not, with a hover readout and a table.
function DailyChart({ daily, totals }) {
    const [hover, setHover] = useState(null);
    const buckets = bucketDays(daily);
    const max = Math.max(1, ...buckets.map((b) => b.views));
    const shown = hover === null ? null : buckets[hover];

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <ul className="flex gap-4 font-mono text-[11px] text-slate-700">
                    <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5" style={{ background: READ_COLOR }} /> Read to the end
                    </li>
                    <li className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5" style={{ background: UNREAD_COLOR }} /> Opened, did not
                        finish
                    </li>
                </ul>
                <p className="font-mono text-[11px] text-slate-900" aria-live="polite">
                    {shown
                        ? `${shown.label}: ${shown.views} views, ${shown.reads} read`
                        : `${totals.views} views, ${totals.reads} read in this period`}
                </p>
            </div>

            <div className="relative mt-3">
                <span className="absolute top-0 left-0 font-mono text-[10px] text-slate-400 tabular-nums">
                    {max}
                </span>
                <div className="absolute inset-x-0 top-0 ml-8 border-t border-slate-200" />
                <div className="absolute inset-x-0 top-1/2 ml-8 border-t border-slate-100" />
                <div
                    className="ml-8 flex h-40 items-end gap-[2px] border-b border-slate-300"
                    onMouseLeave={() => setHover(null)}
                >
                    {buckets.map((b, i) => {
                        const unread = b.views - b.reads;
                        return (
                            <div
                                key={b.day}
                                className="flex h-full min-w-0 flex-1 cursor-crosshair flex-col justify-end"
                                onMouseEnter={() => setHover(i)}
                                style={{ background: hover === i ? 'rgb(241 245 249)' : undefined }}
                            >
                                {unread > 0 && (
                                    <div
                                        className="w-full rounded-t-[4px]"
                                        style={{
                                            height: `${(unread / max) * 100}%`,
                                            background: UNREAD_COLOR,
                                            marginBottom: b.reads ? 2 : 0
                                        }}
                                    />
                                )}
                                {b.reads > 0 && (
                                    <div
                                        className={`w-full ${unread > 0 ? '' : 'rounded-t-[4px]'}`}
                                        style={{
                                            height: `${(b.reads / max) * 100}%`,
                                            background: READ_COLOR
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-1 ml-8 flex justify-between font-mono text-[10px] text-slate-500">
                    <span>{buckets[0]?.label}</span>
                    <span>{buckets[buckets.length - 1]?.label}</span>
                </div>
            </div>

            <details className="mt-3">
                <summary className="cursor-pointer font-mono text-[11px] font-bold text-slate-600">
                    Show as a table
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto border border-slate-300" data-lenis-prevent>
                    <table className="w-full text-left font-mono text-xs">
                        <thead className="sticky top-0 bg-slate-100">
                            <tr>
                                <th className="p-1.5">Date</th>
                                <th className="p-1.5 text-right">Views</th>
                                <th className="p-1.5 text-right">Read</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buckets.map((b) => (
                                <tr key={b.day} className="border-t border-slate-200">
                                    <td className="p-1.5">{b.label}</td>
                                    <td className="p-1.5 text-right tabular-nums">{b.views}</td>
                                    <td className="p-1.5 text-right tabular-nums">{b.reads}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}

/* One post's reach: who opened it, who finished it, how far they scrolled,
   where they came from, and what they did (reactions, shares, votes, comments). */
export default function BlogAnalyticsPanel({ postId, onBack }) {
    const [days, setDays] = useState(30);
    const [state, setState] = useState({ status: 'loading', data: null, error: '' });

    useEffect(() => {
        let cancelled = false;
        adminGet(`/api/blog/admin/${postId}/analytics?days=${days}`)
            .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
            .catch((err) => !cancelled && setState({ status: 'error', data: null, error: err.message }));
        return () => {
            cancelled = true;
        };
    }, [postId, days]);

    const pickRange = (next) => {
        setState((s) => ({ ...s, status: 'loading' }));
        setDays(next);
    };

    const data = state.data;
    const s = data?.summary;
    const shareTotal = data ? Object.values(data.shares).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    const deviceTotal = s ? s.devices.mobile + s.devices.desktop : 0;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-100"
                    >
                        ← All posts
                    </button>
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] font-black text-violet-700 uppercase">
                            Reach &amp; engagement
                        </p>
                        <h2 className="truncate text-xl font-black text-slate-900">
                            {data?.post.title || 'Loading…'}
                        </h2>
                    </div>
                </div>
                <div className="flex border-2 border-slate-900" role="group" aria-label="Date range">
                    {RANGES.map((r) => (
                        <button
                            key={r.days}
                            type="button"
                            aria-pressed={days === r.days}
                            onClick={() => pickRange(r.days)}
                            className={`cursor-pointer px-2.5 py-1 font-mono text-[11px] font-black uppercase ${
                                days === r.days
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {state.status === 'loading' && (
                <div className="p-8 text-center font-mono text-sm text-slate-500">Loading analytics…</div>
            )}
            {state.status === 'error' && (
                <div className="border-2 border-rose-600 bg-rose-50 p-4 font-mono text-xs font-bold text-rose-800">
                    ⚠️ {state.error}
                </div>
            )}

            {state.status === 'ready' && (
                <>
                    {data.post.status !== 'published' && (
                        <p className="border-2 border-amber-500 bg-amber-50 p-3 font-mono text-xs text-amber-900">
                            This post is a draft. Readers cannot see it, so it collects no new views.
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        <Tile label="Views" value={s.views} note={`${data.allTime.views} all time`} />
                        <Tile label="Unique readers" value={s.uniqueVisitors} note="Counted per browser" />
                        <Tile label="Read to the end" value={s.reads} note={`${s.readRate}% of views`} />
                        <Tile
                            label="Avg. reading time"
                            value={formatSeconds(s.avgEngagedSeconds)}
                            note="Tab open and active"
                        />
                        <Tile
                            label="Comments"
                            value={data.comments.visible}
                            note={
                                data.comments.pending
                                    ? `${data.comments.pending} waiting for review`
                                    : 'All time'
                            }
                        />
                        <Tile label="Shares" value={shareTotal} note="All time" />
                    </div>

                    <Card title={days > 60 ? 'Views per week' : 'Views per day'}>
                        {s.views === 0 ? (
                            <p className="font-mono text-xs text-slate-500">No views in this period yet.</p>
                        ) : (
                            <DailyChart daily={s.daily} totals={s} />
                        )}
                    </Card>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card title="How far readers scrolled">
                            <BarList
                                emptyText="No reading data yet."
                                rows={[25, 50, 75, 100].map((mark) => ({
                                    label: mark === 100 ? 'The very end' : `${mark}% of the post`,
                                    value: s.scrollFunnel[mark],
                                    display: `${percent(s.scrollFunnel[mark], s.views)}%`
                                }))}
                            />
                        </Card>
                        <Card title="Where readers came from">
                            <BarList
                                emptyText="No views in this period yet."
                                rows={s.sources.map((src) => ({ label: src.source, value: src.views }))}
                            />
                        </Card>
                        <Card title="Reactions (all time)">
                            <BarList
                                emptyText="No reactions yet."
                                rows={Object.entries(REACTION_LABELS).map(([type, label]) => ({
                                    label,
                                    value: data.reactions[type] || 0
                                }))}
                            />
                        </Card>
                        <Card title="Shares (all time)">
                            <BarList
                                emptyText="Nobody has shared this post from the page yet."
                                rows={Object.entries(SHARE_LABELS).map(([channel, label]) => ({
                                    label,
                                    value: data.shares[channel] || 0
                                }))}
                            />
                        </Card>
                        <Card title="Devices">
                            {deviceTotal === 0 ? (
                                <p className="font-mono text-xs text-slate-500">
                                    No views in this period yet.
                                </p>
                            ) : (
                                <BarList
                                    emptyText=""
                                    rows={[
                                        {
                                            label: '📱 Phone or tablet',
                                            value: s.devices.mobile,
                                            display: `${percent(s.devices.mobile, deviceTotal)}%`
                                        },
                                        {
                                            label: '💻 Computer',
                                            value: s.devices.desktop,
                                            display: `${percent(s.devices.desktop, deviceTotal)}%`
                                        }
                                    ]}
                                />
                            )}
                        </Card>
                        {data.polls.map((poll) => (
                            <Card
                                key={poll.key}
                                title={`Poll · ${poll.total} ${poll.total === 1 ? 'vote' : 'votes'}`}
                            >
                                <p className="mb-3 font-bold text-slate-900">{poll.question}</p>
                                <BarList
                                    emptyText="No votes yet."
                                    rows={poll.options.map((option, n) => ({
                                        label: option,
                                        value: poll.counts[n],
                                        display: `${percent(poll.counts[n], poll.total)}% (${poll.counts[n]})`
                                    }))}
                                />
                            </Card>
                        ))}
                    </div>

                    <p className="font-mono text-[10px] text-slate-500">
                        A read is a view that reached the end of the post with enough reading time behind it.
                        Readers are counted with a random id their browser keeps; no names, emails or IP
                        addresses are stored.
                    </p>
                </>
            )}
        </div>
    );
}
