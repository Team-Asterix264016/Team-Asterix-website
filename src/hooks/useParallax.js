import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PARALLAX_SELECTOR = '[data-parallax]';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * useParallax
 * Drives multi-speed depth parallax and kinetic decal floating across all sections.
 *
 * Modes:
 * - "slow" / "bg": trails behind scroll for deep background layers (e.g. -35px -> +35px)
 * - "fast" / "fg": glides ahead of scroll for foreground typography & callouts (e.g. +45px -> -55px)
 * - "reverse": drifts oppositely to scroll for counter-momentum
 * - "sticker": floating badges/decals with vertical drift & gentle rotational tilt
 * - custom speed via `data-parallax-speed="0.3"`
 */
export default function useParallax(lenis, dependency) {
    useEffect(() => {
        // Disabled on reduced motion
        if (prefersReducedMotion()) return;

        // If a subpage or modal is active, skip
        if (dependency) return;

        const ownedTriggers = [];
        const ownedTweens = [];

        // Synchronize ScrollTrigger with Lenis
        let scrollHandler;
        if (lenis) {
            scrollHandler = () => ScrollTrigger.update();
            lenis.on('scroll', scrollHandler);
        }

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const scaleFactor = isMobile ? 0.45 : 1;

        const timer = setTimeout(() => {
            const sections = document.querySelectorAll('section, footer, .marquee-hold');

            sections.forEach((section) => {
                // Intro canvas sequence drives its own timeline
                if (section.id === 'intro' || section.closest('#intro')) return;

                const parallaxElements = section.querySelectorAll(PARALLAX_SELECTOR);
                if (!parallaxElements.length) return;

                parallaxElements.forEach((el) => {
                    const mode = el.getAttribute('data-parallax') || 'slow';
                    const customSpeed = parseFloat(el.getAttribute('data-parallax-speed')) || 0;
                    const customX = parseFloat(el.getAttribute('data-parallax-x')) || 0;
                    const customRotate = parseFloat(el.getAttribute('data-parallax-rotate')) || 0;

                    let fromY = 0;
                    let toY = 0;
                    let fromRotate = 0;
                    let toRotate = 0;
                    let fromX = 0;
                    let toX = 0;

                    if (customSpeed !== 0) {
                        const dist = 100 * customSpeed * scaleFactor;
                        fromY = dist;
                        toY = -dist;
                    } else {
                        switch (mode) {
                            case 'fast':
                            case 'fg':
                                fromY = 45 * scaleFactor;
                                toY = -55 * scaleFactor;
                                break;
                            case 'slow':
                            case 'bg':
                                fromY = -35 * scaleFactor;
                                toY = 35 * scaleFactor;
                                break;
                            case 'reverse':
                                fromY = -50 * scaleFactor;
                                toY = 50 * scaleFactor;
                                break;
                            case 'sticker':
                                fromY = 55 * scaleFactor;
                                toY = -75 * scaleFactor;
                                fromRotate = customRotate || -4;
                                toRotate = -(customRotate || -4);
                                break;
                            case 'counter-x-left':
                                fromX = 35 * scaleFactor;
                                toX = -45 * scaleFactor;
                                break;
                            case 'counter-x-right':
                                fromX = -35 * scaleFactor;
                                toX = 45 * scaleFactor;
                                break;
                            default:
                                fromY = 30 * scaleFactor;
                                toY = -30 * scaleFactor;
                                break;
                        }
                    }

                    if (customX !== 0) {
                        fromX = customX * scaleFactor;
                        toX = -customX * scaleFactor;
                    }

                    const tween = gsap.fromTo(
                        el,
                        {
                            y: fromY,
                            x: fromX,
                            rotate: fromRotate
                        },
                        {
                            y: toY,
                            x: toX,
                            rotate: toRotate,
                            ease: 'none',
                            scrollTrigger: {
                                trigger: section,
                                start: 'top bottom',
                                end: 'bottom top',
                                scrub: 0.6,
                                invalidateOnRefresh: true
                            }
                        }
                    );

                    ownedTweens.push(tween);
                    if (tween.scrollTrigger) {
                        ownedTriggers.push(tween.scrollTrigger);
                    }
                });
            });

            ScrollTrigger.refresh();
        }, 150);

        return () => {
            clearTimeout(timer);
            if (lenis && scrollHandler) lenis.off('scroll', scrollHandler);

            ownedTriggers.forEach((st) => st.kill());
            ownedTweens.forEach((tw) => tw.kill());

            // Clear transforms on cleanup
            const allElements = document.querySelectorAll(PARALLAX_SELECTOR);
            gsap.set(allElements, { clearProps: 'y,x,rotate' });
        };
    }, [lenis, dependency]);
}
