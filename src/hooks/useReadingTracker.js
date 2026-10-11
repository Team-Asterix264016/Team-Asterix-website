import { useEffect } from 'react';
import { startView, sendProgress } from '../lib/blogEngagement';
import { isRead } from '../lib/blogText';

// A reader idle longer than this stops adding engaged seconds.
const ACTIVE_WINDOW_MS = 30000;
const FLUSH_EVERY_MS = 15000;
// Waiting a moment before counting skips accidental clicks and StrictMode's double mount.
const START_DELAY_MS = 1000;

let entryUsed = false;

/* Where this visit came from. Only the first article opened in a page load owns
   the outside referrer and the share link's utm_source; later articles were
   reached from inside the site. The utm tag is then removed from the address
   bar so a copied link does not carry it on. */
function entryContext() {
    if (entryUsed) return { referrer: window.location.host, source: '' };
    entryUsed = true;
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || '';
    let referrer = '';
    try {
        const host = new URL(document.referrer).host;
        if (host !== window.location.host) referrer = host;
    } catch {
        /* No referrer: typed, bookmarked or opened from an app. */
    }
    if (source) {
        params.delete('utm_source');
        const query = params.toString();
        window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
        );
    }
    return { referrer, source };
}

const deviceKind = () =>
    window.matchMedia('(max-width: 767px), (pointer: coarse)').matches ? 'mobile' : 'desktop';

/* Records one view of a post and reports how it was read: how far down the body
   the reader got, how many seconds they were actually there (tab visible and
   not idle), and whether that adds up to a read. Nothing identifies the reader. */
export function useReadingTracker({ slug, readMinutes, bodyRef, enabled }) {
    useEffect(() => {
        if (!enabled) return undefined;

        const progress = { maxScroll: 0, engagedSeconds: 0, read: false };
        let viewId = null;
        let lastSent = '';
        let lastActive = Date.now();
        let frame = 0;

        const measure = () => {
            frame = 0;
            const el = bodyRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const seen = rect.height > 0 ? ((window.innerHeight - rect.top) / rect.height) * 100 : 0;
            progress.maxScroll = Math.max(progress.maxScroll, Math.round(Math.min(100, Math.max(0, seen))));
        };

        const flush = () => {
            if (!viewId) return;
            const payload = JSON.stringify(progress);
            if (payload === lastSent) return;
            lastSent = payload;
            sendProgress(viewId, progress);
        };

        const onActivity = () => {
            lastActive = Date.now();
        };
        const onScroll = () => {
            onActivity();
            if (!frame) frame = requestAnimationFrame(measure);
        };
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flush();
        };

        const tick = setInterval(() => {
            if (document.visibilityState !== 'visible' || Date.now() - lastActive > ACTIVE_WINDOW_MS) return;
            progress.engagedSeconds += 1;
            if (!progress.read && isRead({ ...progress, readMinutes })) {
                progress.read = true;
                flush();
            }
        }, 1000);
        const flusher = setInterval(flush, FLUSH_EVERY_MS);

        let cancelled = false;
        const starter = setTimeout(() => {
            startView(slug, { ...entryContext(), device: deviceKind() })
                .then((data) => {
                    if (cancelled) return;
                    viewId = data.viewId;
                    measure();
                    flush();
                })
                .catch(() => {
                    /* Analytics never get in the reader's way. */
                });
        }, START_DELAY_MS);

        const activity = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];
        activity.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', flush);

        return () => {
            cancelled = true;
            clearTimeout(starter);
            clearInterval(tick);
            clearInterval(flusher);
            if (frame) cancelAnimationFrame(frame);
            activity.forEach((type) => window.removeEventListener(type, onActivity));
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', flush);
            flush();
        };
    }, [slug, readMinutes, bodyRef, enabled]);
}
