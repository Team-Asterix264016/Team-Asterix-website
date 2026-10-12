import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { PostCover, PostMeta } from './PostParts';

/* The landing page's way into the blog, placed between Our Story and the
   newsletter CTA so a reader goes story -> proof -> subscribe. It renders
   nothing until a post is published (or if the API is unreachable), so the
   home page never shows an empty shell or placeholder cards. */
export default function HomeBlogStrip() {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        let cancelled = false;
        fetch(apiUrl('/api/blog'))
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && Array.isArray(data?.posts)) setPosts(data.posts.slice(0, 3));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    if (posts.length === 0) return null;

    return (
        <section
            aria-labelledby="home-blog-title"
            className="relative z-10 border-t-4 border-slate-900 bg-white px-4 py-14 sm:px-8 sm:py-20"
        >
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <span className="font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            Horizon blog
                        </span>
                        <h2
                            id="home-blog-title"
                            className="mt-2 text-4xl leading-none font-black text-slate-900 uppercase sm:text-5xl"
                        >
                            Latest from the team
                        </h2>
                    </div>
                    <a
                        href="#community"
                        className="press shadow-brutal-2 border-2 border-slate-900 bg-amber-300 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase no-underline hover:bg-amber-400"
                    >
                        All posts →
                    </a>
                </div>

                <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {posts.map((post) => (
                        <li key={post.slug}>
                            {/* Phones get compact rows with a side thumbnail, so three posts
                                don't add several screens to the landing page; md+ shows cards. */}
                            <a
                                href={`#community/blog/${post.slug}`}
                                className="group shadow-brutal-4 flex h-full flex-row overflow-hidden border-4 border-slate-900 bg-white no-underline md:flex-col"
                            >
                                <PostCover
                                    post={post}
                                    className="aspect-square w-24 shrink-0 border-r-4 border-slate-900 object-cover sm:w-32 md:aspect-[16/9] md:w-full md:border-r-0 md:border-b-4"
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4 md:gap-2 md:p-5">
                                    {post.category && (
                                        <span className="font-mono text-[10px] font-black tracking-wider text-sky-800 uppercase">
                                            {post.category}
                                        </span>
                                    )}
                                    <h3 className="font-display text-base leading-snug font-bold text-slate-900 group-hover:underline md:text-lg">
                                        {post.title}
                                    </h3>
                                    {post.excerpt && (
                                        <p className="line-clamp-2 hidden text-sm leading-relaxed text-slate-600 sm:block md:line-clamp-3">
                                            {post.excerpt}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-2">
                                        <PostMeta post={post} />
                                    </div>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
