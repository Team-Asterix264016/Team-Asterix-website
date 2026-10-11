import { useEffect, useId, useState } from 'react';
import {
    COMMENT_MAX,
    fetchComments,
    postComment,
    editComment,
    deleteComment,
    likeComment,
    reportComment,
    rememberedName,
    editTokenFor
} from '../../lib/blogEngagement';
import { timeAgo } from '../../lib/postDate';

const SORTS = [
    { id: 'oldest', label: 'Oldest' },
    { id: 'newest', label: 'Newest' },
    { id: 'top', label: 'Top' }
];

const AVATAR_COLORS = [
    'bg-amber-300',
    'bg-sky-300',
    'bg-rose-300',
    'bg-emerald-300',
    'bg-violet-300',
    'bg-orange-300'
];
const avatarColor = (name) =>
    AVATAR_COLORS[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];

// Applies fn to one comment, whether it opens a thread or replies inside one.
const mapComment = (threads, id, fn) =>
    threads.map((t) =>
        t.id === id
            ? fn(t)
            : t.replies.some((r) => r.id === id)
              ? { ...t, replies: t.replies.map((r) => (r.id === id ? fn(r) : r)) }
              : t
    );

const smallButton =
    'cursor-pointer font-mono text-[11px] font-black text-slate-500 uppercase hover:text-slate-900 disabled:opacity-50';

function CommentForm({ slug, parentId, mode, prefill = '', onPosted, onCancel, autoFocus = false }) {
    const uid = useId();
    const [name, setName] = useState(rememberedName);
    const [body, setBody] = useState(prefill);
    const [website, setWebsite] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState({ message: '', field: '' });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError({ message: '', field: '' });
        try {
            const { comment } = await postComment(slug, { name, body, parentId, website });
            setBody('');
            onPosted(comment);
        } catch (err) {
            setError({ message: err.message, field: err.field || '' });
        } finally {
            setBusy(false);
        }
    };

    const field = (invalid) =>
        `w-full border-2 bg-white px-3 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            invalid ? 'border-rose-600' : 'border-slate-900'
        }`;

    return (
        <form onSubmit={submit} className="space-y-3" noValidate>
            <div>
                <label htmlFor={`${uid}-body`} className="sr-only">
                    {parentId ? 'Your reply' : 'Your comment'}
                </label>
                <textarea
                    id={`${uid}-body`}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={COMMENT_MAX}
                    rows={parentId ? 3 : 4}
                    autoFocus={autoFocus}
                    required
                    data-lenis-prevent
                    aria-invalid={error.field === 'body' || undefined}
                    placeholder={parentId ? 'Write a reply…' : 'Share a thought or ask the team a question…'}
                    className={field(error.field === 'body')}
                />
                {body.length > COMMENT_MAX * 0.8 && (
                    <p className="mt-1 text-right font-mono text-[10px] text-slate-500">
                        {body.length}/{COMMENT_MAX}
                    </p>
                )}
            </div>
            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[12rem] flex-1">
                    <label
                        htmlFor={`${uid}-name`}
                        className="mb-1 block font-mono text-[10px] font-black text-slate-600 uppercase"
                    >
                        Your name
                    </label>
                    <input
                        id={`${uid}-name`}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        autoComplete="name"
                        required
                        aria-invalid={error.field === 'name' || undefined}
                        className={field(error.field === 'name')}
                    />
                </div>
                {/* Left empty by people; bots that fill every field give themselves away. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label htmlFor={`${uid}-website`}>Website</label>
                    <input
                        id={`${uid}-website`}
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="press cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={busy}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-300 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-200 disabled:opacity-50"
                    >
                        {busy ? 'Posting…' : parentId ? 'Reply' : 'Post comment'}
                    </button>
                </div>
            </div>
            {error.message && (
                <p role="alert" className="font-mono text-xs font-bold text-rose-700">
                    {error.message}
                </p>
            )}
            {mode === 'approval' && !error.message && (
                <p className="font-mono text-[11px] text-slate-500">
                    The team reads comments on this post before they appear.
                </p>
            )}
        </form>
    );
}

function CommentItem({ comment, isReply, canReply, onReply, onChange, onRemove }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.body);
    const [confirm, setConfirm] = useState(''); // '' | 'delete' | 'report'
    const [reported, setReported] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const until = comment.editableUntil ? new Date(comment.editableUntil).getTime() : 0;
    const [editOpen, setEditOpen] = useState(() => until > Date.now());

    // The edit button disappears when the server's 15-minute window closes.
    useEffect(() => {
        const left = until - Date.now();
        if (left <= 0) return undefined;
        const timer = setTimeout(() => setEditOpen(false), left);
        return () => clearTimeout(timer);
    }, [until]);

    if (comment.status === 'deleted') {
        return (
            <p className="py-2 font-mono text-xs text-slate-400 italic">
                This comment was deleted by its author.
            </p>
        );
    }

    const ownsToken = comment.mine && Boolean(editTokenFor(comment.id));
    const canEdit = ownsToken && editOpen;

    const act = async (work) => {
        setBusy(true);
        setError('');
        try {
            await work();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const toggleLike = () =>
        act(async () => {
            const on = !comment.liked;
            onChange(comment.id, { liked: on, likes: comment.likes + (on ? 1 : -1) });
            try {
                const data = await likeComment(comment.id, on);
                onChange(comment.id, { liked: data.liked, likes: data.likes });
            } catch (err) {
                onChange(comment.id, { liked: !on, likes: comment.likes });
                throw err;
            }
        });

    const saveEdit = () =>
        act(async () => {
            const data = await editComment(comment.id, draft);
            onChange(comment.id, { body: data.comment.body, editedAt: data.comment.editedAt });
            setEditing(false);
        });

    const remove = () =>
        act(async () => {
            await deleteComment(comment.id);
            onRemove(comment);
        });

    const report = () =>
        act(async () => {
            await reportComment(comment.id);
            setReported(true);
            setConfirm('');
        });

    return (
        <article className="flex gap-3 py-3" aria-label={`Comment by ${comment.name}`}>
            <span
                aria-hidden="true"
                className={`flex shrink-0 items-center justify-center border-2 border-slate-900 font-black ${
                    comment.isTeam
                        ? 'bg-slate-900 text-amber-300'
                        : `${avatarColor(comment.name)} text-slate-900`
                } ${isReply ? 'h-8 w-8 text-sm' : 'h-10 w-10'}`}
            >
                {comment.isTeam ? '✱' : comment.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-slate-900">{comment.name}</span>
                    {comment.isTeam && (
                        <span className="border border-slate-900 bg-amber-300 px-1.5 font-mono text-[10px] font-black text-slate-950 uppercase">
                            Team Asterix
                        </span>
                    )}
                    <time dateTime={comment.createdAt} className="font-mono text-[11px] text-slate-500">
                        {timeAgo(comment.createdAt)}
                    </time>
                    {comment.editedAt && (
                        <span className="font-mono text-[11px] text-slate-400">(edited)</span>
                    )}
                </p>
                {comment.status === 'pending' && (
                    <p className="mt-1 inline-block border border-amber-500 bg-amber-50 px-1.5 font-mono text-[10px] font-bold text-amber-900">
                        Waiting for the team to approve it · only you can see this
                    </p>
                )}

                {editing ? (
                    <div className="mt-2 space-y-2">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={COMMENT_MAX}
                            rows={3}
                            data-lenis-prevent
                            aria-label="Edit your comment"
                            className="w-full border-2 border-slate-900 bg-white px-3 py-2 text-base focus:outline-none"
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={saveEdit}
                                className={`${smallButton} text-sky-700`}
                            >
                                {busy ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(false);
                                    setDraft(comment.body);
                                }}
                                className={smallButton}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line text-slate-800">
                        {comment.body}
                    </p>
                )}

                {!editing && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {comment.status === 'visible' && (
                            <button
                                type="button"
                                disabled={busy}
                                aria-pressed={comment.liked}
                                onClick={toggleLike}
                                className={`${smallButton} ${comment.liked ? 'text-rose-600' : ''}`}
                            >
                                {comment.liked ? '♥' : '♡'} {comment.likes > 0 ? comment.likes : ''} Like
                            </button>
                        )}
                        {canReply && comment.status === 'visible' && (
                            <button type="button" onClick={() => onReply(comment)} className={smallButton}>
                                Reply
                            </button>
                        )}
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDraft(comment.body);
                                    setEditing(true);
                                }}
                                className={smallButton}
                            >
                                Edit
                            </button>
                        )}
                        {ownsToken &&
                            (confirm === 'delete' ? (
                                <span className="flex gap-3">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={remove}
                                        className={`${smallButton} text-rose-700`}
                                    >
                                        Yes, delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirm('')}
                                        className={smallButton}
                                    >
                                        Keep
                                    </button>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirm('delete')}
                                    className={smallButton}
                                >
                                    Delete
                                </button>
                            ))}
                        {!comment.mine &&
                            !comment.isTeam &&
                            comment.status === 'visible' &&
                            (reported ? (
                                <span className="font-mono text-[11px] text-slate-400">
                                    Reported. Thanks.
                                </span>
                            ) : confirm === 'report' ? (
                                <span className="flex gap-3">
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={report}
                                        className={`${smallButton} text-rose-700`}
                                    >
                                        Report as abusive or spam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirm('')}
                                        className={smallButton}
                                    >
                                        Cancel
                                    </button>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirm('report')}
                                    className={smallButton}
                                >
                                    Report
                                </button>
                            ))}
                    </div>
                )}
                {error && (
                    <p role="alert" className="mt-1 font-mono text-[11px] font-bold text-rose-700">
                        {error}
                    </p>
                )}
            </div>
        </article>
    );
}

export default function CommentsSection({ slug, initialMode, onCountChange, ref }) {
    const [sort, setSort] = useState('oldest');
    const [state, setState] = useState({ status: 'loading', threads: [], mode: initialMode, error: '' });
    const [replyTo, setReplyTo] = useState(null); // { threadId, parentId, prefill }
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetchComments(slug, sort)
            .then((data) => {
                if (cancelled) return;
                setState({
                    status: 'ready',
                    threads: data.comments || [],
                    mode: data.mode || 'open',
                    error: ''
                });
                onCountChange(data.count || 0);
            })
            .catch((err) => {
                if (!cancelled) setState((s) => ({ ...s, status: 'error', error: err.message }));
            });
        return () => {
            cancelled = true;
        };
    }, [slug, sort, attempt, onCountChange]);

    const changeSort = (next) => {
        if (next === sort) return;
        setState((s) => ({ ...s, status: 'loading' }));
        setSort(next);
    };

    const retry = () => {
        setState((s) => ({ ...s, status: 'loading' }));
        setAttempt((n) => n + 1);
    };

    const updateComment = (id, changes) =>
        setState((s) => ({ ...s, threads: mapComment(s.threads, id, (c) => ({ ...c, ...changes })) }));

    const addComment = (comment) => {
        if (!comment) return;
        setState((s) => {
            if (!comment.parentId) {
                const thread = { ...comment, replies: [] };
                return { ...s, threads: sort === 'newest' ? [thread, ...s.threads] : [...s.threads, thread] };
            }
            return {
                ...s,
                threads: s.threads.map((t) =>
                    t.id === comment.parentId ? { ...t, replies: [...t.replies, comment] } : t
                )
            };
        });
        if (comment.status === 'visible') onCountChange((n) => n + 1);
        setReplyTo(null);
    };

    const removeComment = (comment) => {
        setState((s) => ({
            ...s,
            threads: s.threads
                .map((t) => {
                    if (t.id === comment.id) return { ...t, status: 'deleted', body: '' };
                    return { ...t, replies: t.replies.filter((r) => r.id !== comment.id) };
                })
                .filter((t) => t.status !== 'deleted' || t.replies.length > 0)
        }));
        if (comment.status === 'visible') onCountChange((n) => Math.max(0, n - 1));
    };

    const startReply = (thread, comment) =>
        setReplyTo({
            threadId: thread.id,
            parentId: comment.id,
            prefill: comment.id === thread.id ? '' : `@${comment.name} `
        });

    const open = state.mode !== 'closed';

    return (
        <section
            ref={ref}
            id="comments"
            aria-labelledby="comments-heading"
            className="mx-auto mt-14 max-w-[38rem] scroll-mt-24"
        >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-slate-900 pb-3">
                <h2 id="comments-heading" className="font-display text-2xl font-bold text-slate-900">
                    Comments
                </h2>
                <div className="flex border-2 border-slate-900" role="group" aria-label="Sort comments">
                    {SORTS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            aria-pressed={sort === s.id}
                            onClick={() => changeSort(s.id)}
                            className={`cursor-pointer px-2.5 py-1 font-mono text-[11px] font-black uppercase ${
                                sort === s.id
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {open ? (
                <div className="mt-5 border-2 border-slate-900 bg-white p-4">
                    <CommentForm slug={slug} mode={state.mode} onPosted={addComment} />
                </div>
            ) : (
                <p className="mt-5 border-2 border-dashed border-slate-300 p-4 text-center font-mono text-xs text-slate-500">
                    Comments are closed on this post.
                </p>
            )}

            <div className="mt-4" aria-live="polite">
                {state.status === 'loading' && (
                    <div className="animate-pulse space-y-4 py-4" aria-busy="true">
                        {[0, 1].map((n) => (
                            <div key={n} className="flex gap-3">
                                <div className="h-10 w-10 bg-slate-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-32 bg-slate-200" />
                                    <div className="h-3 w-full bg-slate-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {state.status === 'error' && (
                    <div className="border-2 border-rose-600 bg-rose-50 p-4 text-center">
                        <p className="font-bold text-rose-900">Could not load comments. {state.error}</p>
                        <button
                            type="button"
                            onClick={retry}
                            className="press mt-2 cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black uppercase"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {state.status === 'ready' && state.threads.length === 0 && (
                    <p className="py-6 text-center text-slate-500">
                        {open ? 'No comments yet. Start the conversation.' : 'No comments on this post.'}
                    </p>
                )}

                {state.status === 'ready' && state.threads.length > 0 && (
                    <ol className="divide-y-2 divide-slate-200">
                        {state.threads.map((thread) => (
                            <li key={thread.id}>
                                <CommentItem
                                    comment={thread}
                                    canReply={open}
                                    onReply={(c) => startReply(thread, c)}
                                    onChange={updateComment}
                                    onRemove={removeComment}
                                />
                                {(thread.replies.length > 0 || replyTo?.threadId === thread.id) && (
                                    <ol className="mb-3 ml-5 border-l-4 border-slate-200 pl-4">
                                        {thread.replies.map((reply) => (
                                            <li key={reply.id}>
                                                <CommentItem
                                                    comment={reply}
                                                    isReply
                                                    canReply={open}
                                                    onReply={(c) => startReply(thread, c)}
                                                    onChange={updateComment}
                                                    onRemove={removeComment}
                                                />
                                            </li>
                                        ))}
                                        {replyTo?.threadId === thread.id && (
                                            <li className="py-3">
                                                <CommentForm
                                                    key={replyTo.parentId}
                                                    slug={slug}
                                                    mode={state.mode}
                                                    parentId={replyTo.parentId}
                                                    prefill={replyTo.prefill}
                                                    autoFocus
                                                    onPosted={addComment}
                                                    onCancel={() => setReplyTo(null)}
                                                />
                                            </li>
                                        )}
                                    </ol>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}
