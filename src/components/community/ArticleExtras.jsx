import { renderInline } from '../../lib/renderMarkdown';
import { PostCover, PostMeta } from './PostParts';
import { scrollToElement } from '../../lib/readerShare';

export function Takeaways({ items }) {
    if (!items?.length) return null;
    return (
        <section
            aria-labelledby="takeaways-heading"
            className="shadow-brutal-4 mx-auto mt-8 max-w-[38rem] border-2 border-slate-900 bg-amber-50 p-5"
        >
            <h2 id="takeaways-heading" className="font-mono text-xs font-black text-slate-900 uppercase">
                Key takeaways
            </h2>
            <ul className="mt-3 space-y-2">
                {items.map((item, n) => (
                    <li key={n} className="flex gap-2.5 leading-relaxed text-slate-800">
                        <span aria-hidden="true" className="mt-0.5 font-black text-emerald-700">
                            ✓
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// Section links for longer posts. The site routes on the URL hash, so these scroll instead of linking.
export function TableOfContents({ headings }) {
    if (headings.length < 3) return null;
    return (
        <nav
            aria-label="In this post"
            className="mx-auto mt-6 max-w-[38rem] border-l-4 border-sky-500 bg-white py-3 pr-4 pl-5"
        >
            <p className="font-mono text-xs font-black text-slate-900 uppercase">In this post</p>
            <ol className="mt-2 space-y-1.5">
                {headings.map((h, n) => (
                    <li key={h.id} className="flex gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                            {String(n + 1).padStart(2, '0')}
                        </span>
                        <button
                            type="button"
                            onClick={() => scrollToElement(document.getElementById(h.id))}
                            className="cursor-pointer text-left text-[15px] font-semibold text-sky-800 hover:text-slate-900 hover:underline"
                        >
                            {renderInline(h.text)}
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export function RelatedPosts({ posts }) {
    if (!posts?.length) return null;
    return (
        <section aria-labelledby="related-heading" className="mt-14">
            <h2 id="related-heading" className="font-display text-2xl font-bold text-slate-900">
                Keep reading
            </h2>
            <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {posts.map((post) => (
                    <li key={post.slug}>
                        <a
                            href={`#community/blog/${post.slug}`}
                            className="group shadow-brutal-4 flex h-full flex-col overflow-hidden border-2 border-slate-900 bg-white no-underline"
                        >
                            <PostCover
                                post={post}
                                className="aspect-[16/9] w-full border-b-2 border-slate-900 object-cover"
                            />
                            <div className="flex flex-1 flex-col gap-2 p-4">
                                {post.category && (
                                    <span className="font-mono text-[10px] font-black tracking-wider text-sky-800 uppercase">
                                        {post.category}
                                    </span>
                                )}
                                <h3 className="font-display leading-snug font-bold text-slate-900 group-hover:underline">
                                    {post.title}
                                </h3>
                                <div className="mt-auto pt-1">
                                    <PostMeta post={post} />
                                </div>
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}
