// Share links and in-page scrolling for Horizon articles.

// Targets carry scroll-margin-top, which both Lenis and scrollIntoView honour.
export function scrollToElement(el) {
    if (!el) return;
    if (window.lenis) window.lenis.scrollTo(el);
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Share links carry utm_source so the analytics can tell which network a reader came from.
export const postUrl = (slug, source) =>
    `${window.location.origin}/${source ? `?utm_source=${source}` : ''}#community/blog/${slug}`;

export const SHARE_TARGETS = [
    {
        channel: 'whatsapp',
        label: 'WhatsApp',
        className: 'bg-emerald-300 hover:bg-emerald-200',
        href: (slug, title) =>
            `https://wa.me/?text=${encodeURIComponent(`${title} ${postUrl(slug, 'whatsapp')}`)}`
    },
    {
        channel: 'linkedin',
        label: 'LinkedIn',
        className: 'bg-sky-300 hover:bg-sky-200',
        href: (slug) =>
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl(slug, 'linkedin'))}`
    },
    {
        channel: 'x',
        label: 'X',
        className: 'bg-white hover:bg-slate-100',
        href: (slug, title) =>
            `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(postUrl(slug, 'x'))}`
    }
];

export const canShareNatively = () =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

// Opens the phone's share sheet; resolves false where there is none or the reader backed out.
export async function shareNatively(post, onShare) {
    if (!canShareNatively()) return false;
    try {
        await navigator.share({
            title: post.title,
            text: post.excerpt || post.title,
            url: postUrl(post.slug)
        });
        onShare('native');
        return true;
    } catch {
        return false;
    }
}
