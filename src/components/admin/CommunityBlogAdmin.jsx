import { useCallback, useEffect, useState } from 'react';
import { adminGet } from './adminGet';
import { formatPostDate } from '../../lib/postDate';

// Read-only list of Horizon posts. Writing and editing arrive with the blog editor.
export default function CommunityBlogAdmin() {
    const [state, setState] = useState({ status: 'loading', posts: [], error: '' });

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

    const published = state.posts.filter((p) => p.status === 'published').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div>
                    <h2 className="flex flex-wrap items-center gap-2 text-2xl font-black text-slate-900 uppercase">
                        Horizon Blog Posts
                        <span className="border border-slate-900 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black text-slate-700">
                            READ-ONLY
                        </span>
                    </h2>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                        {state.status === 'ready'
                            ? `${published} published · ${state.posts.length - published} draft`
                            : 'Posts shown on the public community page.'}
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
                        className="press shadow-brutal-2 border-2 border-slate-900 bg-violet-300 px-3 py-1.5 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-violet-200"
                    >
                        Open public page ↗
                    </a>
                </div>
            </div>

            <div className="border-2 border-dashed border-slate-400 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700">
                The editor is coming later. Until then a developer adds a post from a Markdown file with front
                matter:
                <code className="mt-2 block overflow-x-auto bg-slate-900 px-3 py-2 whitespace-nowrap text-slate-100">
                    node server/scripts/importBlogPost.js post.md --publish
                </code>
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
                <div className="border-2 border-dashed border-slate-300 p-8 text-center font-mono text-xs text-slate-500">
                    No posts yet. The public page shows a "first posts are on the way" notice until one is
                    published.
                </div>
            )}

            {state.status === 'ready' && state.posts.length > 0 && (
                <div className="overflow-x-auto border-2 border-slate-900">
                    <table className="w-full min-w-[640px] text-left font-mono text-xs">
                        <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                            <tr>
                                <th className="p-2.5">Title</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5">Published</th>
                                <th className="p-2.5">Read</th>
                                <th className="p-2.5">Author</th>
                                <th className="p-2.5 text-right">Public</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {state.posts.map((post) => (
                                <tr key={post.slug} className="hover:bg-slate-50">
                                    <td className="p-2.5">
                                        <span className="block font-bold text-slate-900">{post.title}</span>
                                        <span className="block text-[10px] text-slate-500">{post.slug}</span>
                                    </td>
                                    <td className="p-2.5">
                                        <span
                                            className={`border px-1.5 py-0.5 text-[10px] font-black uppercase ${
                                                post.status === 'published'
                                                    ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                                                    : 'border-slate-400 bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="p-2.5 text-slate-600">{formatPostDate(post.publishedAt) || '—'}</td>
                                    <td className="p-2.5 text-slate-600">{post.readMinutes} min</td>
                                    <td className="p-2.5 text-slate-600">{post.author}</td>
                                    <td className="p-2.5 text-right">
                                        {post.status === 'published' ? (
                                            <a
                                                href={`/#community/blog/${post.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-black text-sky-700 hover:text-slate-900"
                                            >
                                                View ↗
                                            </a>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
