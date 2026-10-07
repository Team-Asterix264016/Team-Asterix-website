import { useEffect, useRef } from 'react';

/**
 * DriftParticles
 * A slow field of airborne grit drifting behind the 3D buggy, in the same
 * sky-blue key as the rest of the background layer.
 *
 * Everything is drawn to a single 2D canvas and driven by one rAF loop. No
 * React state is written per frame, so scrolling and animating this layer
 * never triggers a re-render of the tree it sits in.
 */

const PARTICLE_COLORS = [
    'rgba(56, 189, 248, ALPHA)', // sky-400
    'rgba(2, 132, 199, ALPHA)', // sky-600
    'rgba(148, 163, 184, ALPHA)', // slate-400
    'rgba(251, 191, 36, ALPHA)' // amber-400, sparingly
];

// Amber is an accent, not a peer: bias selection heavily toward the blues.
const COLOR_WEIGHTS = [0.4, 0.28, 0.26, 0.06];

const pickColor = () => {
    let r = Math.random();
    for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
        r -= COLOR_WEIGHTS[i];
        if (r <= 0) return PARTICLE_COLORS[i];
    }
    return PARTICLE_COLORS[0];
};

const makeParticle = (w, h, seedAnywhere) => {
    const depth = Math.random(); // 0 = far, 1 = near
    return {
        x: Math.random() * w,
        // Fresh particles enter from below the fold; the initial field is
        // seeded across the whole viewport so it does not visibly "fill in".
        y: seedAnywhere ? Math.random() * h : h + Math.random() * 60,
        depth,
        radius: 0.6 + depth * 2.2,
        // Near particles drift faster than far ones.
        driftY: -(4 + depth * 16),
        driftX: (Math.random() - 0.5) * (6 + depth * 10),
        // Each mote sways on its own sine, so the field never looks gridded.
        swayPhase: Math.random() * Math.PI * 2,
        swayRate: 0.3 + Math.random() * 0.5,
        swayWidth: 6 + depth * 14,
        alpha: 0.12 + depth * 0.38,
        color: pickColor()
    };
};

export default function DriftParticles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        let particles = [];
        let width = 0;
        let height = 0;
        let dpr = 1;
        let rafId = null;
        let lastTs = null;

        // Scroll is read from a passive listener and consumed in the rAF loop,
        // rather than driving the animation directly, so a burst of scroll
        // events cannot cause a burst of work.
        let lastScrollY = window.scrollY || 0;
        let scrollVelocity = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            if (width === 0 || height === 0) return;

            // Matches Car3DCanvas's mobile cap. This is a full-screen alpha canvas
            // cleared and recomposited every frame on top of the WebGL canvas and
            // three blurred orbs; the motes are 1-3px soft dots, so there is no
            // detail for the extra device pixels to resolve.
            dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Density scales with area but is capped so large monitors do not
            // pay a proportionally larger cost.
            const target = Math.min(90, Math.round((width * height) / 26000));
            if (particles.length === 0) {
                particles = Array.from({ length: target }, () => makeParticle(width, height, true));
            } else if (target > particles.length) {
                while (particles.length < target) {
                    particles.push(makeParticle(width, height, true));
                }
            } else {
                particles.length = target;
            }
        };

        const handleScroll = () => {
            const y = window.scrollY || 0;
            scrollVelocity += y - lastScrollY;
            lastScrollY = y;
        };

        const draw = (ts) => {
            rafId = requestAnimationFrame(draw);

            if (lastTs === null) lastTs = ts;
            // Clamp dt so a backgrounded tab does not teleport the whole field
            // on its first frame back.
            const dt = Math.min(0.05, (ts - lastTs) / 1000);
            lastTs = ts;

            if (width === 0 || height === 0) return;

            ctx.clearRect(0, 0, width, height);

            // Scroll pushes the field against the direction of travel, then
            // decays back to the ambient drift.
            const scrollPush = scrollVelocity * 0.35;
            scrollVelocity *= 0.88;
            if (Math.abs(scrollVelocity) < 0.01) scrollVelocity = 0;

            const elapsed = ts / 1000;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                p.y += p.driftY * dt - scrollPush * p.depth * dt * 12;
                p.x += p.driftX * dt;

                const sway = Math.sin(elapsed * p.swayRate + p.swayPhase) * p.swayWidth;
                const drawX = p.x + sway;

                // Recycle off-screen motes instead of allocating new ones.
                if (p.y < -20) {
                    p.y = height + 20;
                    p.x = Math.random() * width;
                } else if (p.y > height + 80) {
                    p.y = -20;
                    p.x = Math.random() * width;
                }
                if (drawX < -40) p.x += width + 80;
                else if (drawX > width + 40) p.x -= width + 80;

                ctx.beginPath();
                ctx.arc(drawX, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color.replace('ALPHA', p.alpha.toFixed(3));
                ctx.fill();
            }
        };

        const start = () => {
            if (rafId !== null) return;
            lastTs = null;
            rafId = requestAnimationFrame(draw);
        };

        const stop = () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = null;
        };

        // A static, dimmer field for readers who ask for reduced motion.
        const drawStatic = () => {
            if (width === 0 || height === 0) return;
            ctx.clearRect(0, 0, width, height);
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color.replace('ALPHA', (p.alpha * 0.6).toFixed(3));
                ctx.fill();
            }
        };

        const applyMotionPreference = () => {
            if (reduceMotion.matches) {
                stop();
                drawStatic();
            } else {
                start();
            }
        };

        const handleResize = () => {
            resize();
            if (reduceMotion.matches) drawStatic();
        };

        resize();
        applyMotionPreference();

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, { passive: true });
        reduceMotion.addEventListener('change', applyMotionPreference);

        // Do not burn frames on a tab nobody is looking at.
        const handleVisibility = () => {
            if (document.hidden) stop();
            else applyMotionPreference();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            stop();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            reduceMotion.removeEventListener('change', applyMotionPreference);
            document.removeEventListener('visibilitychange', handleVisibility);
            particles = [];
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            aria-hidden="true"
        />
    );
}
