import { useEffect, useState } from 'react';
import { adminGet, adminSend } from './adminRequest';
import { timeAgo } from '../../lib/postDate';

const FILTERS = [
    { id: 'review', label: 'Needs review' },
    { id: 'visible', label: 'Visible' },
    { id: 'hidden', label: 'Hidden' },
    { id: 'all', label: 'All' }
];

const STATUS_STYLE = {
    visible: 'border-emerald-700 bg-emerald-100 text-emerald-900',
    pending: 'border-amber-600 bg-amber-100 text-amber-900',
    hidden: 'border-slate-400 bg-slate-100 text-slate-700',
    deleted: 'border-slate-300 bg-white text-slate-500'
};

const rowButton =
    'press press-flat cursor-pointer border border-slate-900 bg-white px-2 py-1 font-mono text-[10px] font-black uppercase hover:bg-slate-100 disabled:opacity-50';

function TeamReply({ comment, onDone, showStatus }) {
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const send = async () => {
        setBusy(true);
        setError('');
        try {
            await adminSend('/api/blog/admin/comments', 'POST', {
                postId: comment.post.id,
                parentId: comment.id,
                body
            });
            showStatus?.('Reply posted with the Team Asterix badge.');
            onDone(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 space-y-2 border-l-4 border-violet-400 pl-3">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={2000}
                autoFocus
                data-lenis-prevent
                aria-label={`Reply to ${comment.name} as Team Asterix`}
                placeholder="Reply as Team Asterix…"
                className="w-full border-2 border-slate-900 bg-white px-3 py-2 text-sm focus:outline-none"
            />
            {error && <p className="font-mono text-xs font-bold text-rose-700">{error}</p>}
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={busy || !body.trim()}
                    onClick={send}
                    className={`${rowButton} bg-violet-300 hover:bg-violet-200`}
                >
                    {busy ? 'Posting…' : 'Post reply'}
                </button>
                <button type="button" onClick={() => onDone(false)} className={rowButton}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

// Reader comments across all Horizon posts: approve, hide, delete, or answer as the team.
export default function BlogCommentsAdmin({ showStatus }) {
    const [filter, setFilter] = useState('review');
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState({ status: 'loading', comments: [], counts: {}, error: '' });
    const [busyId, setBusyId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

    useEffect(() => {
        let cancelled = false;
        adminGet(`/api/blog/admin/comments?filter=${filter}`)
            .then((data) => {
                if (!cancelled)
                    setState({
                        status: 'ready',
                        comments: data.comments || [],
                        counts: data.counts || {},
                        error: ''
                    });
            })
            .catch((err) => {
                if (!cancelled) setState((s) => ({ ...s, status: 'error', error: err.message }));
            });
        return () => {
            cancelled = true;
        };
    }, [filter, attempt]);

    const reload = () => setAttempt((n) => n + 1);

    const pickFilter = (next) => {
        if (next === filter) return;
        setState((s) => ({ ...s, status: 'loading' }));
        setFilter(next);
    };

    const act = async (comment, work, message) => {
        setBusyId(comment.id);
        try {
            await work();
            showStatus?.(message);
            reload();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const setStatus = (comment, status, message) =>
        act(comment, () => adminSend(`/api/blog/admin/comments/${comment.id}`, 'PATCH', { status }), message);

    const remove = (comment) => {
        if (
            !window.confirm(
                `Delete this comment by ${comment.name}${comment.parentId ? '' : ' and its replies'}? This cannot be undone.`
            )
        ) {
            return;
        }
        act(comment, () => adminSend(`/api/blog/admin/comments/${comment.id}`, 'DELETE'), 'Comment deleted.');
    };

    const review = state.counts.review || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Blog Comments</h2>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        {review
                            ? `${state.counts.pending || 0} waiting for approval · ${state.counts.reported || 0} reported by readers`
                            : 'Nothing waiting for review.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setState((s) => ({ ...s, status: 'loading' }));
                        reload();
                    }}
                    className="press press-flat cursor-pointer border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold hover:bg-slate-200"
                >
                    ↻ Refresh
                </button>
            </div>

            <div
                className="flex flex-wrap border-2 border-slate-900"
                role="group"
                aria-label="Filter comments"
            >
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        aria-pressed={filter === f.id}
                        onClick={() => pickFilter(f.id)}
                        className={`flex-1 cursor-pointer px-3 py-1.5 font-mono text-[11px] font-black uppercase ${
                            filter === f.id
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        {f.label}
                        {f.id === 'review' && review > 0 && (
                            <span className="ml-1.5 border border-slate-900 bg-amber-300 px-1 text-slate-950">
                                {review}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {state.status === 'loading' && (
                <div className="p-8 text-center font-mono text-sm text-slate-500">Loading comments…</div>
            )}
            {state.status === 'error' && (
                <div className="border-2 border-rose-600 bg-rose-50 p-4 font-mono text-xs font-bold text-rose-800">
                    ⚠️ {state.error}
                </div>
            )}
            {state.status === 'ready' && state.comments.length === 0 && (
                <div className="border-2 border-dashed border-slate-300 p-8 text-center font-mono text-xs text-slate-500">
                    {filter === 'review'
                        ? 'No comments are waiting. Held and reported comments show up here.'
                        : 'No comments here yet.'}
                </div>
            )}

            {state.status === 'ready' && state.comments.length > 0 && (
                <ul className="space-y-3">
                    {state.comments.map((c) => {
                        const busy = busyId === c.id;
                        return (
                            <li key={c.id} className="border-2 border-slate-900 bg-white p-4">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                                    <span
                                        className={`border px-1.5 py-0.5 font-black uppercase ${STATUS_STYLE[c.status]}`}
                                    >
                                        {c.status === 'pending' ? 'Waiting' : c.status}
                                    </span>
                                    {c.reports > 0 && (
                                        <span className="border border-rose-600 bg-rose-50 px-1.5 py-0.5 font-black text-rose-800 uppercase">
                                            ⚑ {c.reports} {c.reports === 1 ? 'report' : 'reports'}
                                        </span>
                                    )}
                                    <span className="font-bold text-slate-900">
                                        {c.name}
                                        {c.isTeam && ' · Team'}
                                    </span>
                                    <span className="text-slate-500">{timeAgo(c.createdAt)}</span>
                                    {c.parentId && <span className="text-slate-500">reply</span>}
                                    {c.likes > 0 && <span className="text-slate-500">♥ {c.likes}</span>}
                                    {c.post && (
                                        <a
                                            href={`/#community/blog/${c.post.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-auto max-w-full truncate font-bold text-sky-700 hover:text-slate-900"
                                        >
                                            on “{c.post.title}” ↗
                                        </a>
                                    )}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-800">
                                    {c.body}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-1">
                                    {(c.status === 'pending' || c.status === 'hidden' || c.reports > 0) && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() =>
                                                setStatus(
                                                    c,
                                                    'visible',
                                                    c.status === 'hidden'
                                                        ? 'Comment shown again.'
                                                        : 'Comment approved.'
                                                )
                                            }
                                            className={`${rowButton} text-emerald-800`}
                                        >
                                            {c.status === 'hidden'
                                                ? 'Show again'
                                                : c.reports > 0 && c.status === 'visible'
                                                  ? 'Keep (clear reports)'
                                                  : 'Approve'}
                                        </button>
                                    )}
                                    {c.status !== 'hidden' && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() =>
                                                setStatus(c, 'hidden', 'Comment hidden from readers.')
                                            }
                                            className={rowButton}
                                        >
                                            Hide
                                        </button>
                                    )}
                                    {c.post && c.status === 'visible' && (
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                            className={`${rowButton} text-violet-800`}
                                        >
                                            Reply as team
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => remove(c)}
                                        className={`${rowButton} text-rose-700 hover:bg-rose-50`}
                                    >
                                        Delete
                                    </button>
                                </div>

                                {replyingTo === c.id && (
                                    <TeamReply
                                        comment={c}
                                        showStatus={showStatus}
                                        onDone={(posted) => {
                                            setReplyingTo(null);
                                            if (posted) reload();
                                        }}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
