import { useSyncExternalStore } from 'react';

/* One place that answers "what size is this viewport".
 *
 * Every component that needed this rolled its own: TeamGallery had this exact
 * store, TheSquad had a resize listener writing state from an effect, ScrollStack
 * and DriftWall each had a useState + matchMedia effect for reduced motion. The
 * store pattern is TeamGallery's, kept because it is the only one of the four
 * that cannot tear and needs no effect at all -- the others tripped the
 * `react/set-state-in-effect` rule .oxlintrc tracks.
 *
 * The imperative readers are deliberately left alone: Car3DCanvas, useParallax
 * and DriftParticles run outside React's render and want the value once per
 * resize, so routing them through a hook would be ceremony and, for
 * Car3DCanvas, would re-render a WebGL canvas.
 *
 * Stores are memoised per query so every consumer of the same breakpoint shares
 * one MediaQueryList and one subscription. */
const stores = new Map();

function storeFor(query) {
    let store = stores.get(query);
    if (!store) {
        const mql = window.matchMedia(query);
        store = {
            subscribe: (callback) => {
                mql.addEventListener('change', callback);
                return () => mql.removeEventListener('change', callback);
            },
            snapshot: () => mql.matches
        };
        stores.set(query, store);
    }
    return store;
}

export function useMediaQuery(query) {
    const store = storeFor(query);
    // Server snapshot is `false`: assume the roomier layout and let the first
    // client render correct it, rather than flashing a phone layout on desktop.
    return useSyncExternalStore(store.subscribe, store.snapshot, () => false);
}

/** Below Tailwind's `sm`: phone width. */
export const useIsNarrow = () => useMediaQuery('(max-width: 639px)');

/** Matches the `(prefers-reduced-motion: reduce)` checks scattered through the
    animation components. */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
