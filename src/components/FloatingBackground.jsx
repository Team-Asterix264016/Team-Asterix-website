import { useEffect, useRef } from 'react';
import Car3DCanvas from './Car3DCanvas';
import DriftParticles from './DriftParticles';

/**
 * FloatingBackground
 * The fixed ambient layer behind the whole site: parallax light blooms, a
 * technical dot grid, the 3D buggy canvas, and a drifting grit field.
 *
 * The parallax offsets are written straight to the DOM from a rAF loop rather
 * than held in React state. Holding them in state re-rendered this entire
 * subtree, the WebGL canvas included, on every scroll event.
 */
export default function FloatingBackground() {
    const orb1Ref = useRef(null);
    const orb2Ref = useRef(null);
    const orb3Ref = useRef(null);
    const gridRef = useRef(null);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        let rafId = null;
        let targetY = window.scrollY || 0;
        let currentY = targetY;

        const layers = [
            { ref: orb1Ref, factor: 0.35 },
            { ref: orb2Ref, factor: -0.25 },
            { ref: orb3Ref, factor: 0.18 },
            { ref: gridRef, factor: 0.08 }
        ];

        const paint = (y) => {
            for (const { ref, factor } of layers) {
                const el = ref.current;
                if (el) el.style.transform = `translate3d(0, ${(y * factor).toFixed(2)}px, 0)`;
            }
        };

        const tick = () => {
            // Ease toward the real scroll position so the blooms trail the
            // content slightly instead of locking rigidly to it.
            currentY += (targetY - currentY) * 0.12;

            if (Math.abs(targetY - currentY) < 0.1) {
                currentY = targetY;
                paint(currentY);
                rafId = null; // settled; wait for the next scroll to restart
                return;
            }

            paint(currentY);
            rafId = requestAnimationFrame(tick);
        };

        const handleScroll = () => {
            targetY = window.scrollY || 0;

            if (reduceMotion.matches) {
                currentY = targetY;
                paint(currentY);
                return;
            }

            if (rafId === null) rafId = requestAnimationFrame(tick);
        };

        paint(currentY);
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-white via-sky-50/40 to-white select-none">
            {/* Parallax Floating Sky Blue Ambient Light Blooms */}
            <div
                ref={orb1Ref}
                className="pointer-events-none absolute top-[-5%] right-[-5%] h-[48rem] w-[48rem] rounded-full bg-sky-400/12 blur-3xl will-change-transform"
            />
            <div
                ref={orb2Ref}
                className="pointer-events-none absolute top-[40%] left-[-10%] h-[44rem] w-[44rem] rounded-full bg-sky-300/10 blur-3xl will-change-transform"
            />
            <div
                ref={orb3Ref}
                className="pointer-events-none absolute top-[75%] right-[5%] h-[50rem] w-[50rem] rounded-full bg-sky-400/12 blur-3xl will-change-transform"
            />

            {/* Subtle Sky Blue Technical Grid with Parallax */}
            <div
                ref={gridRef}
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:36px_36px] opacity-[0.22] will-change-transform"
            />

            {/* PHOTOREALISTIC 3D BAJA BUGGY WEBGL CANVAS */}
            <Car3DCanvas />

            {/* Airborne grit drifting through the background layer */}
            <DriftParticles />
        </div>
    );
}
