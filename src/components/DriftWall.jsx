import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore
} from 'react';
import { apiUrl } from '../lib/api';
import { framingStyle } from '../lib/imageFraming';

const DEFAULT_ITEMS = Array.from({ length: 15 }, (_, i) => {
    const ids = [1015, 1025, 1039, 1043, 1044, 1050, 1062, 1069, 1074, 1080, 1084, 106, 110, 133, 164];
    return {
        image: `https://picsum.photos/id/${ids[i % ids.length]}/600/400`,
        title: `Tile ${i + 1}`,
        href: undefined
    };
});

const cx = (...parts) => parts.filter(Boolean).join(' ');

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const columnFactor = (index, variance) => {
    const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
    return 1 + variance * pseudo;
};

const DriftWall = ({
    items = DEFAULT_ITEMS,
    columns = 5,
    tileWidth = 200,
    tileHeight = 132,
    gap = 18,
    radius = 14,
    tilt = 16,
    turn = -14,
    roll = 0,
    perspective = 1200,
    depth = 120,
    speed = 42,
    direction = 'up',
    variance = 0.45,
    parallax = 0.6,
    pauseOnHover = false,
    lift = 64,
    fade = 0.6,
    dim = 0.55,
    grayscale = false,
    overlayColor = '#060010',
    className = '',
    style,
    onItemClick
}) => {
    const containerRef = useRef(null);
    const planeRef = useRef(null);
    const trackRefs = useRef([]);
    const rafRef = useRef(null);

    const offsetsRef = useRef([]);
    const velocitiesRef = useRef([]);
    const hoveredColRef = useRef(-1);
    const wallHoveredRef = useRef(false);
    const pointerRef = useRef({ x: 0, y: 0 });
    const pointerDampedRef = useRef({ x: 0, y: 0 });
    const lastTsRef = useRef(null);

    const [containerHeight, setContainerHeight] = useState(600);
    const reduced = useSyncExternalStore(
        (callback) => {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            mq.addEventListener('change', callback);
            return () => mq.removeEventListener('change', callback);
        },
        prefersReducedMotion,
        () => false
    );

    // Hover state is deliberately kept out of React. A wall of five columns
    // renders on the order of a hundred tiles; putting the hovered tile in state
    // re-rendered all of them on every pointer move. The active tile is tracked
    // by reference and its class is toggled directly.
    const activeIdRef = useRef(null);
    const activeElRef = useRef(null);
    const pendingHitRef = useRef(null);
    const hitFrameRef = useRef(null);

    const columnItems = useMemo(() => {
        const cols = Array.from({ length: columns }, () => []);
        items.forEach((item, i) => cols[i % columns].push(item));
        return cols.map((col) => (col.length ? col : items.slice(0, 1)));
    }, [items, columns]);

    const columnMeta = useMemo(() => {
        const unit = tileHeight + gap;
        return columnItems.map((col) => {
            const copyHeight = Math.max(unit, col.length * unit);
            const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1);
            return { copyHeight, copies };
        });
    }, [columnItems, tileHeight, gap, containerHeight]);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerHeight(entry.contentRect.height || 600);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const baseVelocities = useMemo(() => {
        const dirSign = direction === 'up' ? 1 : -1;
        return columnItems.map((_, c) => {
            const altSign = c % 2 === 0 ? 1 : -1;
            return speed * columnFactor(c, variance) * dirSign * altSign;
        });
    }, [columnItems, speed, direction, variance]);

    useEffect(() => {
        offsetsRef.current = columnMeta.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1));
        velocitiesRef.current = columnItems.map(() => 0);
    }, [columnMeta, columnItems]);

    const applyPlaneTransform = useCallback(
        (px, py) => {
            const plane = planeRef.current;
            if (!plane) return;
            plane.style.transform =
                `translate(-50%, -50%) scale(1.18) ` +
                `rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) ` +
                `translateZ(${-depth}px)`;
        },
        [tilt, turn, roll, depth]
    );

    useEffect(() => {
        const animate = (ts) => {
            if (lastTsRef.current === null) lastTsRef.current = ts;
            const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000);
            lastTsRef.current = ts;

            const maxTilt = parallax * 8;
            const targetX = pointerRef.current.x * maxTilt;
            const targetY = -pointerRef.current.y * maxTilt;
            const damp = 1 - Math.exp(-dt / 0.12);
            pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp;
            pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp;
            applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

            if (!reduced) {
                for (let c = 0; c < trackRefs.current.length; c++) {
                    const meta = columnMeta[c];
                    if (!meta) continue;
                    const paused = wallHoveredRef.current && pauseOnHover;
                    const factor = paused || hoveredColRef.current === c ? 0 : 1;
                    const target = baseVelocities[c] * factor;

                    const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
                    velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease;
                    let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt;
                    next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
                    offsetsRef.current[c] = next;

                    const el = trackRefs.current[c];
                    if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`;
                }
            } else {
                for (let c = 0; c < trackRefs.current.length; c++) {
                    const el = trackRefs.current[c];
                    const meta = columnMeta[c];
                    if (el && meta)
                        el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`;
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            lastTsRef.current = null;
        };
    }, [baseVelocities, columnMeta, pauseOnHover, parallax, reduced, applyPlaneTransform]);

    const activate = useCallback((id, index, el) => {
        if (activeIdRef.current === id) return;
        if (activeElRef.current) activeElRef.current.classList.remove('is-active');
        activeIdRef.current = id;
        activeElRef.current = el ?? null;
        hoveredColRef.current = index;
        if (el) el.classList.add('is-active');
    }, []);

    const release = useCallback(() => {
        if (activeElRef.current) activeElRef.current.classList.remove('is-active');
        activeIdRef.current = null;
        activeElRef.current = null;
        hoveredColRef.current = -1;
    }, []);

    const handlePointerMove = useCallback(
        (e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            if (parallax > 0 && !reduced) {
                pointerRef.current = {
                    x: (e.clientX - rect.left) / rect.width - 0.5,
                    y: (e.clientY - rect.top) / rect.height - 0.5
                };
            }

            // elementFromPoint forces a hit test, so it runs at most once per frame
            // rather than once per pointermove event.
            pendingHitRef.current = { x: e.clientX, y: e.clientY };
            if (hitFrameRef.current !== null) return;

            hitFrameRef.current = requestAnimationFrame(() => {
                hitFrameRef.current = null;
                const point = pendingHitRef.current;
                if (!point) return;

                const hit = document.elementFromPoint(point.x, point.y);
                const tile = hit && hit.closest ? hit.closest('[data-tile-id]') : null;

                // Moving into a gap between tiles used to leave the previous tile
                // stuck in its lifted state.
                if (!tile) {
                    release();
                    return;
                }
                activate(tile.dataset.tileId, Number(tile.dataset.col), tile);
            });
        },
        [parallax, reduced, activate, release]
    );

    const handlePointerLeaveWall = useCallback(() => {
        wallHoveredRef.current = false;
        pointerRef.current = { x: 0, y: 0 };
        release();
    }, [release]);

    useEffect(
        () => () => {
            if (hitFrameRef.current !== null) cancelAnimationFrame(hitFrameRef.current);
        },
        []
    );

    const maskStyle =
        'radial-gradient(ellipse 78% 82% at 50% 46%, #000 var(--dw-edge), transparent 100%), ' +
        'linear-gradient(to top, #000 var(--dw-edge), transparent 100%)';

    const cssVars = useMemo(
        () => ({
            '--dw-tile-w': `${tileWidth}px`,
            '--dw-tile-h': `${tileHeight}px`,
            '--dw-gap': `${gap}px`,
            '--dw-radius': `${radius}px`,
            '--dw-lift': `${lift}px`,
            '--dw-dim': dim,
            '--dw-gray': grayscale ? 1 : 0,
            '--dw-overlay': overlayColor,
            '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`,
            perspective: `${perspective}px`,
            perspectiveOrigin: '50% 50%',
            WebkitMaskImage: maskStyle,
            maskImage: maskStyle,
            WebkitMaskComposite: 'source-in',
            maskComposite: 'intersect',
            ...style
        }),
        [
            tileWidth,
            tileHeight,
            gap,
            radius,
            lift,
            dim,
            grayscale,
            overlayColor,
            fade,
            perspective,
            maskStyle,
            style
        ]
    );

    const tileClass = cx(
        'group/tile relative block flex-none cursor-pointer outline-none',
        'w-full h-[calc(var(--dw-tile-h)+var(--dw-gap))] [transform-style:preserve-3d]'
    );
    const innerClass = cx(
        'pointer-events-none absolute inset-[calc(var(--dw-gap)/2)] block overflow-hidden bg-white border-2 border-slate-900',
        'rounded-[var(--dw-radius)] opacity-[var(--dw-dim)] [transform:translateZ(0)]',
        'transition-[transform,opacity,box-shadow,border-color] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'group-[.is-active]/tile:opacity-100 group-[.is-active]/tile:[transform:translateZ(var(--dw-lift))]',
        'group-[.is-active]/tile:border-slate-900 group-[.is-active]/tile:shadow-brutal-8-brand',
        // Clicking a tile pushes it back down toward the wall, so a click on an
        // already-lifted tile still reads as a press.
        'group-active/tile:[transform:translateZ(calc(var(--dw-lift)*0.4))] group-active/tile:shadow-brutal-2-brand',
        'group-active/tile:duration-[120ms]',
        'group-focus-visible/tile:opacity-100 group-focus-visible/tile:[transform:translateZ(var(--dw-lift))]',
        'group-focus-visible/tile:border-slate-900 group-focus-visible/tile:shadow-brutal-8-brand'
    );
    const imgClass = cx(
        'block h-full w-full select-none object-cover',
        '[filter:grayscale(var(--dw-gray))_saturate(0.98)]',
        'transition-[filter] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'group-[.is-active]/tile:[filter:grayscale(0)_saturate(1.08)] group-focus-visible/tile:[filter:grayscale(0)_saturate(1.08)]'
    );
    const overlayClass = cx(
        'pointer-events-none absolute inset-0 bg-[var(--dw-overlay)] opacity-[0.1]',
        'transition-opacity duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'group-[.is-active]/tile:opacity-0 group-focus-visible/tile:opacity-0'
    );

    const renderTile = (item, id, colIndex) => {
        const inner = (
            <span className={innerClass}>
                <img
                    src={apiUrl(item.image)}
                    alt={item.title ?? ''}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={imgClass}
                    style={framingStyle(item.fit, item.position)}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                            'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80';
                    }}
                />
                <span className={overlayClass} aria-hidden="true" />
            </span>
        );
        const commonProps = {
            className: tileClass,
            'data-tile-id': id,
            'data-col': colIndex,
            onFocus: (e) => activate(id, colIndex, e.currentTarget),
            onBlur: release,
            onClick: () => {
                onItemClick?.(item);
            }
        };
        if (item.href) {
            return (
                <a key={id} href={item.href} target="_blank" rel="noreferrer noopener" {...commonProps}>
                    {inner}
                </a>
            );
        }
        return (
            <div key={id} tabIndex={0} role="button" aria-label={item.title ?? 'tile'} {...commonProps}>
                {inner}
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className={cx('relative h-full w-full overflow-hidden', className)}
            style={cssVars}
            onPointerMove={handlePointerMove}
            onPointerEnter={() => {
                wallHoveredRef.current = true;
            }}
            onPointerLeave={handlePointerLeaveWall}
            role="group"
            aria-label="Drifting wall of tiles"
        >
            {/* No press utility on this plane: its transform is rewritten every
          frame by applyPlaneTransform, and an !important :active transform
          would flatten the whole wall on mousedown. The tiles carry their own
          press state instead. */}
            <div
                ref={planeRef}
                className="absolute top-1/2 left-1/2 flex [transform-origin:50%_50%] cursor-pointer flex-row will-change-transform [transform-style:preserve-3d]"
            >
                {columnItems.map((col, c) => {
                    const meta = columnMeta[c];
                    const copies = Array.from({ length: meta.copies });
                    return (
                        <div
                            className="relative w-[calc(var(--dw-tile-w)+var(--dw-gap))] [transform-style:preserve-3d]"
                            key={`col-${c}`}
                        >
                            <div
                                className="flex flex-col will-change-transform [transform-style:preserve-3d]"
                                ref={(el) => {
                                    trackRefs.current[c] = el;
                                }}
                            >
                                {copies.map((_, copyIndex) =>
                                    col.map((item, itemIndex) =>
                                        renderTile(item, `${c}-${copyIndex}-${itemIndex}`, c)
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DriftWall;
