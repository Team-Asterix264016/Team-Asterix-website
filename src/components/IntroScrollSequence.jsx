import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import teamLogo from '../assets/Screenshot 2026-08-26 232320.png';
import { introHandoff, resetIntroHandoff } from '../lib/introHandoff';

gsap.registerPlugin(ScrollTrigger);

/**
 * IntroScrollSequence
 * A scroll-scrubbed turn of the buggy, from its rear round to the pose the live
 * 3D scene is holding, ending with the team mark emerging.
 *
 * The frames were extracted from the workshop turntable clip by
 * scripts/extract-intro-frames.ps1 into public/intro/{desktop,mobile}, every
 * third frame, cropped to drop the generator watermark. Two tiers exist so
 * phones do not download the full-resolution sequence.
 *
 * Playback order is the clip's own. The orbit runs rear-three-quarter (frame 1)
 * -> side profile (~frame 33) -> dead front (~frame 62) -> front-three-quarter
 * (frame 80), so it already opens on the buggy's back and turns it to face the
 * reader. Frame 80 is the pose Car3DCanvas holds through the cross-dissolve:
 * the model is built nose-on-+Z with the camera at +Z, so its `rotY: -0.48`
 * hero keyframe is a front three-quarter, and reversing the sequence would land
 * the footage 180 degrees away from it.
 *
 * Implementation notes:
 * - The sticky child inside a tall section gives the pinned effect without
 *   GSAP's pin-spacer, which is far less likely to fight Lenis or the
 *   surrounding layout. ScrollTrigger is used only to read progress.
 * - Frames are drawn to a canvas rather than swapped as <img> src, so there is
 *   no flash between frames and no layout work per frame.
 * - The canvas is driven by its own rAF loop rather than painted straight from
 *   the scroll handler. Scroll position is a *fractional* frame index that the
 *   loop eases toward, and the two frames bracketing it are cross-faded. Those
 *   two things together are what make 80 discrete stills read as continuous
 *   rotation rather than a slide show, and stop a flicked mouse wheel from
 *   jumping the turn several degrees in one paint.
 */

const FRAME_COUNT = 80;
const SCRUB_END = 0.48; // turntable finishes its turn here
const SHRINK_START = 0.52; // box starts shrinking from full-screen to compact card
const SHRINK_END = 0.74; // box is fully compact card size
const LOGO_START = 0.74; // logo starts appearing right as box reaches compact size
const LOGO_END = 0.94; // logo fully resolved inside compact box
const HANDOFF_START = 0.52; // footage dissolves into live 3D scene concurrently with shrink
const HANDOFF_END = 0.75; // 3D scene handoff finishes

const TEAM_STAGES = [
    {
        step: '01',
        tag: 'WHO WE ARE',
        tagColor: 'bg-yellow-400 text-slate-950',
        title: 'PASSION DRIVEN',
        desc: 'Collegiate engineers designing and building high-performance off-road racecars from scratch.'
    },
    {
        step: '02',
        tag: 'WHAT WE DO',
        tagColor: 'bg-sky-400 text-slate-950',
        title: 'BUILT BY HAND',
        desc: '100% in-house CAD design, chassis fabrication, precision machining, and custom powertrain tuning.'
    },
    {
        step: '03',
        tag: 'OUR MISSION',
        tagColor: 'bg-emerald-400 text-slate-950',
        title: 'ENGINEERING EXCELLENCE',
        desc: 'Engineering next-generation autonomous mobility. Built with grit, tested in dirt, and engineered to conquer.'
    }
];

// Enough of the sequence to start without stalling; the rest streams in behind.
const FRAMES_BEFORE_START = 14;

// Settling time for the eased frame position, in seconds. Long enough to
// absorb a wheel notch, short enough that the turn never feels detached from
// the scroll.
const FRAME_TAU = 0.085;

const framePath = (tier, index) =>
    `${import.meta.env.BASE_URL}intro/${tier}/frame_${String(index + 1).padStart(3, '0')}.webp`;

export default function IntroScrollSequence() {
    const sectionRef = useRef(null);
    const stageRef = useRef(null);
    const canvasRef = useRef(null);
    const logoRef = useRef(null);
    const boxRef = useRef(null);
    const contentRef = useRef(null);
    const subtitleRef = useRef(null);
    const keepScrollingRef = useRef(null);
    const scrimRef = useRef(null);

    // Left-side friendly story card refs
    const hudRef = useRef(null);
    const hudScrimRef = useRef(null);
    const stage0Ref = useRef(null);
    const stage1Ref = useRef(null);
    const stage2Ref = useRef(null);
    const dot0Ref = useRef(null);
    const dot1Ref = useRef(null);
    const dot2Ref = useRef(null);

    const [ready, setReady] = useState(false);
    const [loadPercent, setLoadPercent] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const section = sectionRef.current;
        if (!canvas || !section) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const tier = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';

        // Take ownership of the 3D scene's opening pose for as long as this
        // section is mounted. Starting at 0 holds the buggy on the frame that
        // matches the footage, so nothing jumps when the dissolve begins.
        introHandoff.active = true;
        introHandoff.progress = 0;

        const images = Array.from({ length: FRAME_COUNT });
        let loadedCount = 0;
        let cancelled = false;
        let trigger = null;

        // Frame position is fractional throughout: `target` is where the scroll
        // says the turn should be, `display` is where it has eased to, and
        // `painted` is what is actually on the canvas.
        let targetPos = 0;
        let displayPos = 0;
        let paintedPos = -1;

        let rafId = null;
        let running = false;
        let lastTime = 0;

        // --- painting -------------------------------------------------------

        const isLoaded = (index) => {
            const img = images[index];
            return !!img && img.complete && img.naturalWidth > 0;
        };

        // Cover on every viewport: the footage fills the screen edge to edge.
        // Letterboxing portrait kept the whole vehicle visible but turned the
        // opening shot into a small band floating in a dark field, which read
        // as a video player rather than a full-bleed sequence.
        const drawFrame = (index) => {
            const img = images[index];
            const cw = canvas.width;
            const ch = canvas.height;

            const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;

            // Portrait crops hard, so bias the visible window slightly above
            // centre: the buggy sits a little high in frame and the floor,
            // which carries no detail, is what gets cut.
            const portrait = ch > cw;
            const originY = portrait ? (ch - dh) * 0.42 : (ch - dh) / 2;

            ctx.drawImage(img, (cw - dw) / 2, originY, dw, dh);
        };

        // Fall back to the closest already-decoded frame so scrubbing ahead of
        // the download never shows a blank canvas.
        const nearestLoaded = (index) => {
            if (isLoaded(index)) return index;
            for (let step = 1; step < FRAME_COUNT; step++) {
                if (isLoaded(index - step)) return index - step;
                if (isLoaded(index + step)) return index + step;
            }
            return -1;
        };

        const paint = (pos) => {
            const cw = canvas.width;
            const ch = canvas.height;
            if (!cw || !ch) return;

            const lo = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(pos)));
            const hi = Math.min(FRAME_COUNT - 1, lo + 1);
            const t = Math.min(1, Math.max(0, pos - lo));

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, cw, ch);

            // Both bracketing frames present: cross-fade between them, which is
            // what turns an 80-still sequence into a continuous turn. If either
            // is still downloading, fall back to the nearest whole frame rather
            // than blending in something from a different part of the orbit.
            if (hi !== lo && t > 0.002 && isLoaded(lo) && isLoaded(hi)) {
                drawFrame(lo);
                ctx.globalAlpha = t;
                drawFrame(hi);
                ctx.globalAlpha = 1;
            } else {
                const fallback = nearestLoaded(lo);
                if (fallback < 0) return;
                drawFrame(fallback);
            }

            paintedPos = pos;
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (!w || !h) return;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            // Resizing the backing store resets every bit of context state.
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            paintedPos = -1; // force a repaint at the new size
            paint(displayPos);
        };

        // --- render loop ----------------------------------------------------

        // Frame-rate independent damping: the same settling time whether the
        // display runs at 60Hz or 144Hz.
        const tick = (now) => {
            rafId = null;
            if (cancelled) return;

            const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
            lastTime = now;

            const k = 1 - Math.exp(-dt / FRAME_TAU);
            displayPos += (targetPos - displayPos) * k;
            if (Math.abs(targetPos - displayPos) < 0.01) displayPos = targetPos;

            // A few thousandths of a frame is well under a pixel of movement;
            // repainting for it is pure cost.
            if (Math.abs(displayPos - paintedPos) > 0.004) paint(displayPos);

            if (running) rafId = requestAnimationFrame(tick);
        };

        const startLoop = () => {
            if (running || cancelled) return;
            running = true;
            lastTime = performance.now();
            rafId = requestAnimationFrame(tick);
        };

        const stopLoop = () => {
            running = false;
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = null;
        };

        // --- loading --------------------------------------------------------

        const loadFrame = (index) =>
            new Promise((resolve) => {
                const img = new Image();
                img.decoding = 'async';
                if (index < FRAMES_BEFORE_START) img.fetchPriority = 'high';

                const done = () => {
                    loadedCount++;
                    if (!cancelled) {
                        setLoadPercent(Math.round((loadedCount / FRAME_COUNT) * 100));
                    }
                    resolve();
                };

                // Decoding up front costs nothing here and keeps the first
                // drawImage of each frame off the critical path -- a synchronous
                // decode inside the rAF tick is a dropped frame mid-scrub.
                img.onload = () => {
                    if (typeof img.decode === 'function') img.decode().then(done, done);
                    else done();
                };
                img.onerror = done;
                img.src = framePath(tier, index);
                images[index] = img;
            });

        const start = async () => {
            // Load the opening frames first so the sequence is usable quickly.
            await Promise.all(Array.from({ length: FRAMES_BEFORE_START }, (_, i) => loadFrame(i)));
            if (cancelled) return;

            resize();
            setReady(true);
            startLoop();

            // Remainder streams in sequentially, staying out of the way of the
            // rest of the page's requests.
            for (let i = FRAMES_BEFORE_START; i < FRAME_COUNT; i++) {
                if (cancelled) return;
                await loadFrame(i);
                // A frame arriving behind the scrub replaces whichever fallback
                // is standing in for it, so force the next tick to repaint.
                paintedPos = -1;
            }
        };

        // --- scroll wiring --------------------------------------------------

        // Releasing the pin at the end of the range, the way GSAP's own pinning
        // does. A fixed stage cannot scroll away on its own, so simply fading
        // it out left the remaining viewport of the section as an empty dark
        // gap before the hero. Parked at the section's bottom edge instead, it
        // sits exactly where it was pinned and scrolls off with the section.
        let pinned = null;
        const setPinned = (next) => {
            const stage = stageRef.current;
            if (!stage || pinned === next) return;
            pinned = next;
            if (next) {
                stage.style.position = 'fixed';
                stage.style.top = '0px';
                stage.style.bottom = '';
            } else {
                stage.style.position = 'absolute';
                stage.style.top = 'auto';
                stage.style.bottom = '0px';
            }
        };

        const setupTrigger = () => {
            let currentStage = 0;

            // Set initial stage visibility immediately on initial home screen (p = 0)
            if (stage0Ref.current) gsap.set(stage0Ref.current, { opacity: 1, y: 0 });
            if (stage1Ref.current) gsap.set(stage1Ref.current, { opacity: 0, y: 14 });
            if (stage2Ref.current) gsap.set(stage2Ref.current, { opacity: 0, y: 14 });
            if (hudRef.current) gsap.set(hudRef.current, { opacity: 1 });
            if (hudScrimRef.current) gsap.set(hudScrimRef.current, { opacity: 1 });

            const updateDots = (stageIdx) => {
                const dots = [dot0Ref.current, dot1Ref.current, dot2Ref.current];
                dots.forEach((dot, i) => {
                    if (!dot) return;
                    if (i === stageIdx) {
                        dot.style.width = '24px';
                        dot.style.backgroundColor = '#0f172a';
                    } else {
                        dot.style.width = '8px';
                        dot.style.backgroundColor = '#cbd5e1';
                    }
                });
            };

            updateDots(0);

            trigger = ScrollTrigger.create({
                trigger: section,
                start: 'top top',
                end: 'bottom bottom',
                scrub: true,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    const p = self.progress;

                    // Fractional on purpose -- the rAF loop eases toward this
                    // and cross-fades the two frames around it.
                    targetPos = Math.min(1, p / SCRUB_END) * (FRAME_COUNT - 1);

                    // --- 1. Left-side friendly story card & dark backdrop fade-out before shrink ---
                    const hudOut = 1 - gsap.utils.clamp(0, 1, (p - 0.44) / 0.06);
                    if (hudRef.current) {
                        gsap.set(hudRef.current, { opacity: hudOut });
                    }
                    if (hudScrimRef.current) {
                        gsap.set(hudScrimRef.current, { opacity: hudOut });
                    }

                    // --- 2. Discrete text stage selection (NEVER gets stuck in the middle) ---
                    let targetStage = 0;
                    if (p >= 0.36) {
                        targetStage = 2;
                    } else if (p >= 0.18) {
                        targetStage = 1;
                    } else {
                        targetStage = 0;
                    }

                    if (targetStage !== currentStage) {
                        const prev = currentStage;
                        currentStage = targetStage;
                        updateDots(targetStage);

                        const stageEls = [stage0Ref.current, stage1Ref.current, stage2Ref.current];
                        const prevEl = stageEls[prev];
                        const nextEl = stageEls[targetStage];

                        if (prevEl) {
                            gsap.to(prevEl, {
                                opacity: 0,
                                y: -12,
                                duration: 0.22,
                                ease: 'power2.in',
                                overwrite: 'auto'
                            });
                        }
                        if (nextEl) {
                            gsap.fromTo(
                                nextEl,
                                { opacity: 0, y: 12 },
                                { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' }
                            );
                        }
                    }

                    // --- 4. Live 3D Scene Handoff ---
                    const rawHandoff = gsap.utils.clamp(
                        0,
                        1,
                        (p - HANDOFF_START) / (HANDOFF_END - HANDOFF_START)
                    );
                    const handoff = gsap.parseEase('power2.inOut')(rawHandoff);
                    introHandoff.progress = handoff;

                    // --- 3. Shrink Box First (0.52 -> 0.70) ---
                    const shrinkRaw = gsap.utils.clamp(
                        0,
                        1,
                        (p - SHRINK_START) / (SHRINK_END - SHRINK_START)
                    );
                    const shrinkP = gsap.parseEase('power2.inOut')(shrinkRaw);

                    const stage = stageRef.current;
                    const box = boxRef.current;

                    if (stage && box) {
                        const stageRect = stage.getBoundingClientRect();
                        const isMd = window.matchMedia('(min-width: 768px)').matches;
                        const isSm = window.matchMedia('(min-width: 640px)').matches;

                        let targetW = 310;
                        let targetH = 155;
                        if (isMd) {
                            targetW = 380;
                            targetH = 185;
                        } else if (isSm) {
                            targetW = 340;
                            targetH = 165;
                        }

                        // Lerp width and height
                        const curW = stageRect.width + (targetW - stageRect.width) * shrinkP;
                        const curH = stageRect.height + (targetH - stageRect.height) * shrinkP;

                        // Center in stage viewport
                        const xEnd = (stageRect.width - targetW) / 2;
                        const yEnd = (stageRect.height - targetH) / 2;

                        const x = xEnd * shrinkP;
                        const y = yEnd * shrinkP;

                        gsap.set(box, {
                            left: 0,
                            top: 0,
                            x: x,
                            y: y,
                            width: `${curW}px`,
                            height: `${curH}px`,
                            borderWidth: `${shrinkP * 3}px`,
                            borderStyle: 'solid',
                            borderColor: '#0f172a',
                            boxShadow: `${shrinkP * 6}px ${shrinkP * 6}px 0px #0f172a`,
                            borderRadius: `${shrinkP * 12}px`
                        });
                    }

                    // Canvas fades out during shrink, turning box into solid dark card
                    const canvasVeil =
                        1 - gsap.utils.clamp(0, 1, (p - SHRINK_START) / (SHRINK_END - SHRINK_START));
                    gsap.set(canvasRef.current, { opacity: canvasVeil });

                    // Scrim inside card darkens to solid slate-950
                    const scrimP = gsap.utils.clamp(
                        0,
                        1,
                        (p - SHRINK_START) / ((SHRINK_END - SHRINK_START) * 0.7)
                    );
                    gsap.set(scrimRef.current, { opacity: scrimP });

                    // --- 4. Logo & Details Reveal INSIDE Small Box (0.68 -> 0.84) ---
                    const logoRaw = gsap.utils.clamp(0, 1, (p - LOGO_START) / (LOGO_END - LOGO_START));
                    const easedLogo = gsap.parseEase('power2.out')(logoRaw);

                    gsap.set(logoRef.current, {
                        opacity: easedLogo,
                        scale: 0.88 + easedLogo * 0.12
                    });
                    gsap.set(subtitleRef.current, {
                        opacity: gsap.utils.clamp(0, 1, (logoRaw - 0.2) / 0.8),
                        y: (1 - easedLogo) * 8
                    });
                    gsap.set(keepScrollingRef.current, {
                        opacity: gsap.utils.clamp(0, 1, (logoRaw - 0.4) / 0.6)
                    });

                    // --- 5. Pin state ---
                    // When p < 1, stage is fixed. Once intro completes at p = 1,
                    // unpin so further scroll pushes the stage up naturally.
                    setPinned(p < 1);
                },
                // The canvas only has work to do while the section is on
                // screen. Outside the range it is either untouched or fully
                // faded out, so the loop is parked rather than left spinning
                // for the rest of the page.
                onToggle: (self) => {
                    if (self.isActive) {
                        startLoop();
                    } else {
                        stopLoop();
                        displayPos = targetPos;
                        paint(displayPos);
                    }
                },
                // onUpdate stops firing once scrolled clear of the range, so
                // the pin state is settled explicitly at both edges.
                onLeave: () => setPinned(false),
                onEnterBack: () => setPinned(true)
            });

            setPinned(true);
        };

        // Reduced motion: no scrub. Show the closing frame with the mark
        // already resolved, and let the section collapse to a single screen.
        const applyReducedMotion = () => {
            section.style.height = '100vh';
            // No scrub means no dissolve to drive, so the 3D scene keeps its
            // normal framing from the start.
            introHandoff.progress = 1;
            introHandoff.active = false;
            // Without a scrub there is nothing to drive the fixed stage out of
            // the way, so it becomes a normal in-flow layer that scrolls off.
            if (stageRef.current) stageRef.current.style.position = 'absolute';
            loadFrame(FRAME_COUNT - 1).then(() => {
                if (cancelled) return;
                targetPos = FRAME_COUNT - 1;
                displayPos = FRAME_COUNT - 1;
                resize();
                setReady(true);

                const stage = stageRef.current;
                const box = boxRef.current;

                if (stage && box) {
                    const stageRect = stage.getBoundingClientRect();
                    const isMd = window.matchMedia('(min-width: 768px)').matches;
                    const isSm = window.matchMedia('(min-width: 640px)').matches;
                    let targetW = 310;
                    let targetH = 155;
                    if (isMd) {
                        targetW = 380;
                        targetH = 185;
                    } else if (isSm) {
                        targetW = 340;
                        targetH = 165;
                    }

                    const x = (stageRect.width - targetW) / 2;
                    const y = (stageRect.height - targetH) / 2;

                    gsap.set(box, {
                        left: 0,
                        top: 0,
                        x: x,
                        y: y,
                        width: `${targetW}px`,
                        height: `${targetH}px`,
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        borderColor: '#0f172a',
                        boxShadow: '6px 6px 0px #0f172a',
                        borderRadius: '12px'
                    });
                }

                gsap.set(scrimRef.current, { opacity: 1 });
                gsap.set(canvasRef.current, { opacity: 0 });
                gsap.set(logoRef.current, { opacity: 1, scale: 1 });
                gsap.set(subtitleRef.current, { opacity: 1, y: 0 });
                gsap.set(keepScrollingRef.current, { opacity: 1 });
                if (hudRef.current) gsap.set(hudRef.current, { opacity: 0 });
                if (hudScrimRef.current) gsap.set(hudScrimRef.current, { opacity: 0 });
            });
        };

        if (reduceMotion.matches) {
            applyReducedMotion();
        } else {
            start();
            setupTrigger();
        }

        window.addEventListener('resize', resize);

        return () => {
            cancelled = true;
            stopLoop();
            resetIntroHandoff();
            window.removeEventListener('resize', resize);
            trigger?.kill();
            // Drop the decoded bitmaps; the sequence is a real amount of memory
            // to leave behind on a route change.
            for (let i = 0; i < FRAME_COUNT; i++) {
                if (images[i]) images[i].src = '';
                images[i] = null;
            }
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            id="intro"
            // Deliberately transparent. The dark backdrop is painted by the
            // frame canvas itself, so fading that canvas out at the end reveals
            // the live 3D scene sitting behind this section instead of a flat
            // slate panel, which is what made the handoff read as a hard cut.
            className="relative h-[200vh] w-full select-none"
            aria-label="Team Asterix buggy walkaround"
        >
            {/* Fixed rather than sticky. The app root and body both set
                overflow-x: hidden, which per spec makes the other axis compute
                to auto -- that turns the ancestor into a scroll container and
                silently breaks position: sticky, leaving the stage to scroll
                away instead of holding. A fixed layer is unaffected by overflow
                ancestors; setPinned parks it at the section's bottom edge once
                the scrub is done so it scrolls off with the section. */}
            <div
                ref={stageRef}
                className="pointer-events-none fixed inset-x-0 top-0 h-screen w-full overflow-hidden"
            >
                <div
                    ref={boxRef}
                    className="absolute top-0 left-0 flex flex-col items-center justify-center overflow-hidden bg-slate-950 will-change-[width,height,transform,border-radius,box-shadow]"
                    style={{ width: '100vw', height: '100vh' }}
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute top-1/2 left-1/2 block max-h-none max-w-none -translate-x-1/2 -translate-y-1/2"
                        style={{ width: '100vw', height: '100vh' }}
                        aria-hidden="true"
                    />

                    {/* Darkens the footage as the mark takes over. */}
                    <div
                        ref={scrimRef}
                        className="pointer-events-none absolute inset-0 bg-slate-950 opacity-0"
                        aria-hidden="true"
                    />

                    {/* Emerging team mark inside compact card */}
                    <div
                        ref={contentRef}
                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 will-change-transform select-none sm:p-5"
                    >
                        <img
                            ref={logoRef}
                            src={teamLogo}
                            alt="Team Asterix"
                            className="h-auto max-h-14 w-40 object-contain opacity-0 [filter:brightness(0)_invert(1)_drop-shadow(0_0_20px_rgba(56,189,248,0.7))] sm:max-h-16 sm:w-48 md:w-52"
                        />
                        <p
                            ref={subtitleRef}
                            className="mt-2 text-center text-xs leading-none font-black tracking-wider text-white uppercase opacity-0 sm:text-sm"
                        >
                            ASTERIX AUTONOMOUS MOBILITY
                        </p>
                        <div
                            ref={keepScrollingRef}
                            className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.25em] text-sky-400 uppercase opacity-0 sm:text-[10px]"
                        >
                            <span>KEEP SCROLLING</span>
                            <span className="inline-block animate-bounce">↓</span>
                        </div>
                    </div>
                </div>

                {/* Left-Side Ambient Dark Backdrop to blend smoothly */}
                <div
                    ref={hudScrimRef}
                    className="pointer-events-none absolute inset-0 z-10"
                    aria-hidden="true"
                >
                    <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent sm:w-4/5 sm:bg-gradient-to-r md:w-3/5" />
                </div>

                {/* Left-Side Friendly Colourful Team Story Card */}
                <div
                    ref={hudRef}
                    className="pointer-events-none absolute inset-x-0 top-[45%] z-20 mx-auto flex w-full max-w-[320px] -translate-y-1/2 items-center justify-center px-4 select-none sm:inset-y-0 sm:right-auto sm:left-0 sm:mx-0 sm:max-w-[400px] sm:translate-y-0 sm:justify-start sm:p-10 md:max-w-[440px] md:p-14 lg:p-16"
                >
                    <div className="shadow-brutal-5 sm:shadow-brutal-8 relative w-full overflow-hidden rounded-xl border-2 border-slate-900 bg-white/95 p-4.5 text-slate-900 backdrop-blur-md sm:rounded-2xl sm:border-3 sm:p-7 md:p-8">
                        {/* Dynamic Stages Stack using CSS Grid overlapping (prevents overlap with footer) */}
                        <div className="relative grid grid-cols-1 grid-rows-1">
                            {/* Stage 0 */}
                            <div
                                ref={stage0Ref}
                                className="col-start-1 row-start-1 flex flex-col justify-start will-change-[transform,opacity]"
                            >
                                <div className="mb-3.5 flex items-center justify-between gap-2">
                                    <span
                                        className={`${TEAM_STAGES[0].tagColor} shadow-brutal-2 rounded-md border-2 border-slate-900 px-3 py-1 text-[10px] font-black tracking-wider uppercase sm:text-xs`}
                                    >
                                        {TEAM_STAGES[0].tag}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-500 sm:text-sm">
                                        01 / 03
                                    </span>
                                </div>
                                <h3 className="mb-2 text-xl leading-tight font-black tracking-tight text-slate-900 uppercase sm:mb-2.5 sm:text-2xl">
                                    {TEAM_STAGES[0].title}
                                </h3>
                                <p className="text-xs leading-relaxed font-medium text-slate-700 sm:text-sm md:text-[15px]">
                                    {TEAM_STAGES[0].desc}
                                </p>
                            </div>

                            {/* Stage 1 */}
                            <div
                                ref={stage1Ref}
                                className="col-start-1 row-start-1 flex flex-col justify-start opacity-0 will-change-[transform,opacity]"
                            >
                                <div className="mb-3.5 flex items-center justify-between gap-2">
                                    <span
                                        className={`${TEAM_STAGES[1].tagColor} shadow-brutal-2 rounded-md border-2 border-slate-900 px-3 py-1 text-[10px] font-black tracking-wider uppercase sm:text-xs`}
                                    >
                                        {TEAM_STAGES[1].tag}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-500 sm:text-sm">
                                        02 / 03
                                    </span>
                                </div>
                                <h3 className="mb-2 text-xl leading-tight font-black tracking-tight text-slate-900 uppercase sm:mb-2.5 sm:text-2xl">
                                    {TEAM_STAGES[1].title}
                                </h3>
                                <p className="text-xs leading-relaxed font-medium text-slate-700 sm:text-sm md:text-[15px]">
                                    {TEAM_STAGES[1].desc}
                                </p>
                            </div>

                            {/* Stage 2 */}
                            <div
                                ref={stage2Ref}
                                className="col-start-1 row-start-1 flex flex-col justify-start opacity-0 will-change-[transform,opacity]"
                            >
                                <div className="mb-3.5 flex items-center justify-between gap-2">
                                    <span
                                        className={`${TEAM_STAGES[2].tagColor} shadow-brutal-2 rounded-md border-2 border-slate-900 px-3 py-1 text-[10px] font-black tracking-wider uppercase sm:text-xs`}
                                    >
                                        {TEAM_STAGES[2].tag}
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-500 sm:text-sm">
                                        03 / 03
                                    </span>
                                </div>
                                <h3 className="mb-2 text-xl leading-tight font-black tracking-tight text-slate-900 uppercase sm:mb-2.5 sm:text-2xl">
                                    {TEAM_STAGES[2].title}
                                </h3>
                                <p className="text-xs leading-relaxed font-medium text-slate-700 sm:text-sm md:text-[15px]">
                                    {TEAM_STAGES[2].desc}
                                </p>
                            </div>
                        </div>

                        {/* Step Indicator Progress Dots */}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-900/10 pt-3 sm:mt-7 sm:pt-4">
                            <span className="font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase sm:text-xs">
                                SCROLL TO ADVANCE
                            </span>
                            <div className="flex items-center gap-2">
                                <div
                                    ref={dot0Ref}
                                    className="h-2 w-6 rounded-full border border-slate-900 bg-slate-900 transition-all duration-300"
                                />
                                <div
                                    ref={dot1Ref}
                                    className="h-2 w-2 rounded-full border border-slate-900 bg-slate-200 transition-all duration-300"
                                />
                                <div
                                    ref={dot2Ref}
                                    className="h-2 w-2 rounded-full border border-slate-900 bg-slate-200 transition-all duration-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading state. The bar is the only thing on screen until
                    enough of the sequence has decoded to scrub smoothly. */}
                {!ready && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900">
                        <span className="font-mono text-[10px] font-black tracking-[0.3em] text-sky-400 uppercase">
                            Loading walkaround
                        </span>
                        <div className="h-2.5 w-56 overflow-hidden border-2 border-sky-400/70">
                            <div
                                className="h-full bg-sky-400 transition-[width] duration-200 ease-linear"
                                style={{ width: `${loadPercent}%` }}
                            />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 tabular-nums">
                            {loadPercent}%
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}
