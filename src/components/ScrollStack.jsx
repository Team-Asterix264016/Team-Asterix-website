import React, { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';

/**
 * React Bits Pro - ScrollStack Component
 * Pinned cards that stack, turn, and dissolve as the page scrolls.
 *
 * Supports multiple variants:
 * - "deck": Cards stack, turn/rotate with 3D perspective, and dissolve
 * - "stack": Clean linear vertical stacking with peek offsets
 * - "flip": 3D card flip turnover
 * - "fade": Smooth scale and opacity crossfade
 * - "zoom": Dynamic perspective zoom
 * - "reveal": Card sliding reveal
 */

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
const smoothStep = (x) => x * x * (3 - 2 * x);

const makeFilter = (progress, dim, blur) => {
    const parts = [];
    if (blur > 0.01) parts.push(`blur(${(progress * blur).toFixed(2)}px)`);
    if (dim > 0.001) parts.push(`brightness(${(1 - progress * dim).toFixed(3)})`);
    return parts.length ? parts.join(' ') : 'none';
};

const calculateTransform = (variant, offset, index, config) => {
    const clip = `inset(0 0 0 0 round ${config.radius}px)`;
    const sign = index % 2 === 0 ? 1 : -1;

    // Incoming card (offset < 0: moving from bottom towards the front slot)
    if (offset < 0) {
        const t = clamp(offset + 1, 0, 1);
        const eased = smoothStep(t);
        switch (variant) {
            case 'fade':
                return {
                    transform: `translate3d(0,0,0) scale(${(1.06 - 0.06 * eased).toFixed(4)})`,
                    opacity: eased,
                    filter: 'none',
                    clip
                };
            case 'flip':
                return {
                    transform: `translate3d(0,${((1 - eased) * 26).toFixed(2)}%,0) rotateX(${(-((1 - eased) * 72)).toFixed(2)}deg)`,
                    opacity: clamp(1.6 * eased, 0, 1),
                    filter: 'none',
                    clip
                };
            case 'zoom':
                return {
                    transform: `translate3d(0,0,0) scale(${(0.52 + 0.48 * eased).toFixed(4)})`,
                    opacity: clamp(1.4 * eased, 0, 1),
                    filter: config.blur > 0.01 ? `blur(${((1 - eased) * config.blur).toFixed(2)}px)` : 'none',
                    clip
                };
            case 'reveal':
                return {
                    transform: 'translate3d(0,0,0)',
                    opacity: 1,
                    filter: 'none',
                    clip: `inset(${((1 - t) * 100).toFixed(2)}% 0 0 0 round ${config.radius}px)`
                };
            case 'deck':
                return {
                    transform: `translate3d(0,${((1 - t) * (config.enter + 6)).toFixed(2)}%,0) rotate(${((1 - eased) * 4 * sign).toFixed(2)}deg)`,
                    opacity: 1,
                    filter: 'none',
                    clip
                };
            default: // 'stack'
                return {
                    transform: `translate3d(0,${((1 - t) * config.enter).toFixed(2)}%,0)`,
                    opacity: 1,
                    filter: 'none',
                    clip
                };
        }
    }

    // Active / Covered card (offset >= 0: resting or covered by subsequent cards)
    const eased = smoothStep(clamp(offset, 0, 1));
    switch (variant) {
        case 'fade':
            return {
                transform: `translate3d(0,0,0) scale(${(1 - 0.06 * eased).toFixed(4)})`,
                opacity: 1 - eased,
                filter: makeFilter(eased, config.dim, config.blur),
                clip
            };
        case 'flip':
            return {
                transform: `translate3d(0,${(-(26 * eased)).toFixed(2)}%,0) rotateX(${(72 * eased).toFixed(2)}deg)`,
                opacity: 1 - eased,
                filter: makeFilter(eased, config.dim, 0),
                clip
            };
        case 'zoom':
            return {
                transform: `translate3d(0,0,0) scale(${(1 + 0.42 * eased).toFixed(4)})`,
                opacity: 1 - eased,
                filter: config.blur > 0.01 ? `blur(${(eased * config.blur * 1.4).toFixed(2)}px)` : 'none',
                clip
            };
        case 'reveal':
            return {
                transform: `translate3d(0,${(-offset * config.peek * 0.5).toFixed(2)}px,0) scale(${(1 - offset * config.scaleStep * 0.7).toFixed(4)})`,
                opacity: 1,
                filter: makeFilter(offset, config.dim, config.blur),
                clip
            };
        case 'deck':
            return {
                transform: `translate3d(0,${(-offset * config.peek * 0.75).toFixed(2)}px,0) rotate(${(4.2 * offset * sign).toFixed(2)}deg) scale(${(1 - offset * config.scaleStep * 0.85).toFixed(4)})`,
                opacity: 1,
                filter: makeFilter(offset, config.dim, config.blur),
                clip
            };
        default: // 'stack'
            return {
                transform: `translate3d(0,${(-offset * config.peek).toFixed(2)}px,0) scale(${(1 - offset * config.scaleStep).toFixed(4)})`,
                opacity: 1,
                filter: makeFilter(offset, config.dim, config.blur),
                clip
            };
    }
};

export default function ScrollStack({
    items,
    children,
    variant = 'deck',
    scrollLength = 0.9,
    peek = 30,
    scaleStep = 0.05,
    blur = 2,
    dim = 0.18,
    smooth = 0.16,
    depth = 4,
    cardWidth = 820,
    cardHeight = 0.62,
    borderRadius = 20,
    perspective = 1200,
    showProgress = true,
    showCounter = true,
    onIndexChange,
    className = '',
    id,
    header
}) {
    const childCards = useMemo(() => Children.toArray(children).filter((c) => isValidElement(c)), [children]);
    const cardList = childCards.length > 0 ? childCards : items || [];
    const total = cardList.length;

    const sectionRef = useRef(null);
    const stageRef = useRef(null);
    const cardRefs = useRef([]);
    const progressRailRef = useRef(null);

    const currentScrollProgress = useRef(0);
    const lastTimeRef = useRef(0);
    const rafRef = useRef(0);
    const isAnimating = useRef(false);
    const currentIndexRef = useRef(-1);
    const onIndexChangeRef = useRef(onIndexChange);

    const [activeIndex, setActiveIndex] = useState(0);
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        onIndexChangeRef.current = onIndexChange;
    }, [onIndexChange]);

    const config = useMemo(
        () => ({
            peek: Math.max(0, peek),
            scaleStep: clamp(scaleStep, 0, 0.4),
            blur: prefersReducedMotion ? 0 : Math.max(0, blur),
            dim: clamp(dim, 0, 1),
            radius: Math.max(0, borderRadius),
            enter: ((1 + 1 / clamp(cardHeight, 0.2, 0.95)) / 2) * 100 + 3
        }),
        [peek, scaleStep, blur, dim, borderRadius, prefersReducedMotion, cardHeight]
    );

    const updateCardTransforms = useCallback(
        (progress) => {
            const maxVisibleDepth = Math.max(1, Math.round(depth));

            for (let i = 0; i < total; i += 1) {
                const el = cardRefs.current[i];
                if (!el) continue;

                const offset = progress - i;

                // Hide cards that are far away to optimize performance
                if (offset < -1.0005 || offset > maxVisibleDepth) {
                    if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
                    continue;
                }

                if (el.style.visibility === 'hidden') el.style.visibility = '';

                const t = calculateTransform(variant, offset, i, config);
                el.style.transform = t.transform;
                el.style.opacity = t.opacity.toString();
                el.style.filter = t.filter;
                el.style.clipPath = t.clip;

                // Make sure the active or topmost visible card has pointer events enabled
                if (Math.abs(offset) < 0.4) {
                    el.style.zIndex = (total + 10).toString();
                } else {
                    el.style.zIndex = (total - Math.abs(offset) * 2).toFixed(0);
                }
            }

            if (progressRailRef.current && total > 1) {
                const normalized = clamp(progress / (total - 1), 0, 1);
                progressRailRef.current.style.transform = `scaleX(${normalized.toFixed(4)})`;
            }

            const rounded = clamp(Math.round(progress), 0, total - 1);
            if (rounded !== currentIndexRef.current) {
                currentIndexRef.current = rounded;
                setActiveIndex(rounded);
                onIndexChangeRef.current?.(rounded);
            }
        },
        [total, depth, variant, config]
    );

    const getTargetProgress = useCallback(() => {
        const section = sectionRef.current;
        if (!section || total < 1) return 0;
        const win = section.ownerDocument.defaultView || window;
        const innerHeight = win.innerHeight || 0;
        const rect = section.getBoundingClientRect();
        const scrollableDistance = rect.height - innerHeight;
        return scrollableDistance <= 0 ? 0 : clamp(-rect.top / scrollableDistance, 0, 1) * (total - 1);
    }, [total]);

    // Handle stage pinning (fixed while inside section, absolute at start and bottom)
    const updatePinState = useCallback(() => {
        const section = sectionRef.current;
        const stage = stageRef.current;
        if (!section || !stage) return;

        const win = section.ownerDocument.defaultView || window;
        const innerHeight = win.innerHeight || 0;
        const rect = section.getBoundingClientRect();

        if (rect.top <= 0 && rect.bottom >= innerHeight) {
            stage.style.position = 'fixed';
            stage.style.top = '0px';
            stage.style.bottom = 'auto';
        } else if (rect.bottom < innerHeight) {
            stage.style.position = 'absolute';
            stage.style.top = 'auto';
            stage.style.bottom = '0px';
        } else {
            stage.style.position = 'absolute';
            stage.style.top = '0px';
            stage.style.bottom = 'auto';
        }
    }, []);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const win = section.ownerDocument.defaultView || window;
        if (!win) return;

        const damping = prefersReducedMotion ? 0 : clamp(smooth, 0, 0.95);

        const tick = (time) => {
            const prevTime = lastTimeRef.current || time;
            const dt = Math.min(0.05, Math.max(0, (time - prevTime) / 1000));
            lastTimeRef.current = time;

            const target = getTargetProgress();
            const current = currentScrollProgress.current;
            const next =
                current + (target - current) * (damping > 0 ? 1 - Math.pow(1 - damping, 60 * dt) : 1);

            currentScrollProgress.current = next;
            updateCardTransforms(next);
            updatePinState();

            if (Math.abs(target - next) > 0.0004) {
                rafRef.current = win.requestAnimationFrame(tick);
            } else {
                currentScrollProgress.current = target;
                updateCardTransforms(target);
                updatePinState();
                isAnimating.current = false;
            }
        };

        const onScrollOrResize = () => {
            updatePinState();
            if (!isAnimating.current) {
                isAnimating.current = true;
                lastTimeRef.current = 0;
                rafRef.current = win.requestAnimationFrame(tick);
            }
        };

        currentScrollProgress.current = getTargetProgress();
        updateCardTransforms(currentScrollProgress.current);
        updatePinState();

        win.addEventListener('scroll', onScrollOrResize, { passive: true });
        section.ownerDocument.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
        win.addEventListener('resize', onScrollOrResize);

        const observer = new ResizeObserver(onScrollOrResize);
        observer.observe(section);

        return () => {
            win.cancelAnimationFrame(rafRef.current);
            isAnimating.current = false;
            win.removeEventListener('scroll', onScrollOrResize);
            section.ownerDocument.removeEventListener('scroll', onScrollOrResize, { capture: true });
            win.removeEventListener('resize', onScrollOrResize);
            observer.disconnect();
        };
    }, [getTargetProgress, updateCardTransforms, updatePinState, smooth, prefersReducedMotion]);

    // Section height: enough viewport height to scroll through all cards comfortably
    const totalSectionHeightVh = 100 + Math.max(0, total - 1) * Math.max(0.4, scrollLength) * 100;

    return (
        <section
            id={id}
            ref={sectionRef}
            aria-label="Scrolling card stack"
            className={`relative w-full ${className}`.trim()}
            style={{ height: `${totalSectionHeightVh}vh` }}
        >
            {/* Pinned Stage Container */}
            <div
                ref={stageRef}
                className="pointer-events-none top-0 left-0 z-20 flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-4 sm:px-8"
                style={{ perspective: `${Math.max(200, perspective)}px` }}
            >
                {/* Optional Header inside the pinned stage */}
                {header && (
                    <div className="pointer-events-auto mx-auto mb-6 w-full max-w-5xl select-none sm:mb-8">
                        {header}
                    </div>
                )}

                {/* Card Stage Box */}
                <div
                    className="pointer-events-auto relative w-full"
                    style={{
                        maxWidth: `${Math.max(320, cardWidth)}px`,
                        // svh, matching the stage: the pin maths is in
                        // window.innerHeight, so vh would size the card against a
                        // box taller than the visible area on mobile.
                        height: `min(${Math.round(100 * clamp(cardHeight, 0.3, 0.85))}svh, 520px)`,
                        // Was a flat 380px, which on a 320x568 phone exceeded the
                        // 62svh the stage actually offers and overflowed it.
                        minHeight: 'min(380px, 62svh)'
                    }}
                >
                    {cardList.map((card, idx) => (
                        <div
                            key={card.key || idx}
                            ref={(el) => {
                                cardRefs.current[idx] = el;
                            }}
                            className="absolute inset-0 transition-shadow [will-change:transform,opacity] [backface-visibility:hidden] [transform-style:preserve-3d]"
                            style={{
                                zIndex: idx
                            }}
                        >
                            {card}
                        </div>
                    ))}
                </div>

                {/* Bottom Progress Rail and Counter */}
                {(showProgress || showCounter) && total > 1 && (
                    <div className="pointer-events-none mt-6 flex items-center justify-center gap-4 px-6 select-none sm:mt-8">
                        {showProgress && (
                            <span className="shadow-brutal-2 relative h-2 w-32 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-200 sm:w-52">
                                <span
                                    ref={progressRailRef}
                                    className="absolute inset-0 origin-left rounded-full bg-sky-500 transition-transform"
                                    style={{ transform: 'scaleX(0)' }}
                                />
                            </span>
                        )}
                        {showCounter && (
                            <span className="shadow-brutal-2 rounded-md border-2 border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black tracking-wider text-slate-900">
                                {String(activeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
