import { useCallback, useEffect, useState } from 'react';
import { adminGet, adminSend } from './adminRequest';
import { formatPostDate } from '../../lib/postDate';
import BlogPostEditor from './BlogPostEditor';

const rowButton =
    'press press-flat cursor-pointer border border-slate-900 bg-white px-2 py-1 font-mono text-[10px] font-black uppercase hover:bg-slate-100 disabled:opacity-50';

// Horizon posts: the list, quick publish/feature toggles, and the editor.
export default function CommunityBlogAdmin({ showStatus, onUploadImage, defaultAuthor }) {
    const [state, setState] = useState({ status: 'loading', posts: [], error: '' });
    const [editing, setEditing] = useState(null); // null | 'new' | post id
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const data = await adminGet('/api/blog/admin/all');
            setState({ status: 'ready', posts: data.posts || [], error: '' });
        } catch (err) {
            setState({ status: 'error', posts: [], error: err.message });
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const reload = () => {
        setState((prev) => ({ ...prev, status: 'loading' }));
        load();
    };

    const patch = async (post, changes, message) => {
        setBusyId(post.id);
        try {
            await adminSend(`/api/blog/admin/${post.id}`, 'PATCH', changes);
            showStatus?.(message);
            await load();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (post) => {
        if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
        setBusyId(post.id);
        try {
            await adminSend(`/api/blog/admin/${post.id}`, 'DELETE');
            showStatus?.('Post deleted.');
            await load();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyId(null);
        }
    };

    if (editing) {
        return (
            <BlogPostEditor
                key={editing}
                postId={editing === 'new' ? null : editing}
                defaultAuthor={defaultAuthor}
                onUploadImage={onUploadImage}
                showStatus={showStatus}
                onClose={() => {
                    setEditing(null);
                    reload();
                }}
            />
        );
    }

    const published = state.posts.filter((p) => p.status === 'published').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Horizon Blog Posts</h2>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        {state.status === 'ready'
                            ? `${published} published · ${state.posts.length - published} draft`
                            : 'Write, publish and feature posts for the community page.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={reload}
                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold hover:bg-slate-200"
                    >
                        ↻ Refresh
                    </button>
                    <a
                        href="/#community"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press press-flat border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black text-slate-900 uppercase no-underline hover:bg-slate-100"
                    >
                        Public page ↗
                    </a>
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-violet-400 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-300"
                    >
                        + New post
                    </button>
                </div>
            </div>

            {state.status === 'loading' && (
                <div className="p-8 text-center font-mono text-sm text-slate-500">Loading posts…</div>
            )}

            {state.status === 'error' && (
                <div className="border-2 border-rose-600 bg-rose-50 p-4 font-mono text-xs font-bold text-rose-800">
                    ⚠️ {state.error}
                </div>
            )}

            {state.status === 'ready' && state.posts.length === 0 && (
                <div className="border-2 border-dashed border-slate-300 p-8 text-center">
                    <p className="font-mono text-xs text-slate-500">
                        No posts yet. Until one is published, the community page says the first posts are on the
                        way and the home page shows no blog section.
                    </p>
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="press shadow-brutal-2 mt-4 cursor-pointer border-2 border-slate-900 bg-violet-400 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-300"
                    >
                        Write the first post
                    </button>
                </div>
            )}

            {state.status === 'ready' && state.posts.length > 0 && (
                <div className="overflow-x-auto border-2 border-slate-900">
                    <table className="w-full min-w-[760px] text-left font-mono text-xs">
                        <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                            <tr>
                                <th className="p-2.5">Title</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5">Published</th>
                                <th className="p-2.5">Read</th>
                                <th className="p-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {state.posts.map((post) => {
                                const isPublished = post.status === 'published';
                                const busy = busyId === post.id;
                                return (
                                    <tr key={post.id} className="hover:bg-slate-50">
                                        <td className="p-2.5">
                                            <span className="block font-bold text-slate-900">
                                                {post.featured && (
                                                    <span className="mr-1 text-violet-700" title="Featured">
                                                        ★
                                                    </span>
                                                )}
                                                {post.title}
                                            </span>
                                            <span className="block text-[10px] text-slate-500">
                                                {post.author}
                                                {post.category ? ` · ${post.category}` : ''}
                                            </span>
                                        </td>
                                        <td className="p-2.5">
                                            <span
                                                className={`border px-1.5 py-0.5 text-[10px] font-black uppercase ${
                                                    isPublished
                                                        ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                                                        : 'border-slate-400 bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {post.status}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-slate-600">{formatPostDate(post.publishedAt) || '—'}</td>
                                        <td className="p-2.5 text-slate-600">{post.readMinutes} min</td>
                                        <td className="p-2.5">
                                            <div className="flex flex-wrap justify-end gap-1">
                                                <button type="button" onClick={() => setEditing(post.id)} className={rowButton}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        patch(
                                                            post,
                                                            { status: isPublished ? 'draft' : 'published' },
                                                            isPublished ? 'Post unpublished.' : 'Post published.'
                                                        )
                                                    }
                                                    className={rowButton}
                                                >
                                                    {isPublished ? 'Unpublish' : 'Publish'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    aria-pressed={post.featured}
                                                    onClick={() =>
                                                        patch(
                                                            post,
                                                            { featured: !post.featured },
                                                            post.featured ? 'Post unfeatured.' : 'Post featured.'
                                                        )
                                                    }
                                                    className={rowButton}
                                                >
                                                    {post.featured ? '★ Unfeature' : '☆ Feature'}
                                                </button>
                                                {isPublished && (
                                                    <a
                                                        href={`/#community/blog/${post.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`${rowButton} text-sky-700 no-underline`}
                                                    >
                                                        View ↗
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => remove(post)}
                                                    className={`${rowButton} text-rose-700 hover:bg-rose-50`}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
