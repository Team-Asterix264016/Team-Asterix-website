import { safeHref } from '../../lib/safeHref';
import { formatPostDate } from '../../lib/postDate';

// Post card pieces shared by the community page and the home page strip.

export function PostCover({ post, className }) {
    const src = safeHref(post.coverImage);
    if (src) {
        return (
            <img
                src={src}
                alt={post.coverAlt || ''}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: post.coverPosition || '50% 50%' }}
                className={className}
            />
        );
    }
    return (
        <div aria-hidden="true" className={`${className} flex items-center justify-center bg-slate-900`}>
            <span className="font-display text-4xl font-bold text-sky-400">✱</span>
        </div>
    );
}

// Date, read time, and reaction and comment counts once a post has any.
export function PostMeta({ post }) {
    const reactions = post.stats?.reactions || 0;
    const comments = post.stats?.comments || 0;
    return (
        <p className="font-mono text-[11px] font-bold text-slate-500">
            <time dateTime={post.publishedAt || undefined}>{formatPostDate(post.publishedAt)}</time>
            <span aria-hidden="true"> · </span>
            {post.readMinutes} min read
            {reactions > 0 && (
                <>
                    <span aria-hidden="true"> · ❤️ {reactions}</span>
                    <span className="sr-only">, {reactions} reactions</span>
                </>
            )}
            {comments > 0 && (
                <>
                    <span aria-hidden="true"> · 💬 {comments}</span>
                    <span className="sr-only">, {comments} comments</span>
                </>
            )}
        </p>
    );
}
