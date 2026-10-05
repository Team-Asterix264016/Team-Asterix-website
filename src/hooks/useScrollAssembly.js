import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * useScrollAssembly
 * Dynamically moves components, cards, headers, badges, and lists into their places
 * as the user scrolls down the page.
 *
 * Each element or element-cluster triggers independently as its own bounding box
 * reaches `top 85%` of the viewport, creating an energetic neo-brutalist entrance
 * with zero stale off-screen animations.
 */

const ENTER_START = 'top 85%';
const MANAGED = '[data-assemble], [data-assemble-section]';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function useScrollAssembly(lenis, dependency) {
    useEffect(() => {
        const ownedTriggers = [];
        const ownedTweens = [];
        const ownedElements = new Set();

        const clearManaged = () => {
            document.querySelectorAll(MANAGED).forEach((el) => {
                el.classList.remove('reveal-init');
            });
            gsap.set(MANAGED, { clearProps: 'transform,opacity,willChange' });

            if (ownedElements.size) {
                const list = [...ownedElements];
                list.forEach((el) => el.classList.remove('reveal-init'));
                gsap.set(list, { clearProps: 'transform,opacity,willChange' });
                ownedElements.clear();
            }
        };

        // If a modal or subpage is open, clear reveals
        if (dependency) {
            clearManaged();
            return;
        }

        // Reduced motion: show everything statically
        if (prefersReducedMotion()) {
            clearManaged();
            return;
        }

        // Synchronize ScrollTrigger with Lenis
        let scrollHandler;
        if (lenis) {
            scrollHandler = () => ScrollTrigger.update();
            lenis.on('scroll', scrollHandler);
        }

        gsap.ticker.lagSmoothing(0);

        let refreshOnLoad;

        const timer = setTimeout(() => {
            const sections = document.querySelectorAll('section, footer, .marquee-hold');

            // Dynamic reveal helper: attaches ScrollTrigger directly to the target element
            // so animation only fires when the specific component enters the reader's view.
            const revealOnce = (targets, triggerEl, fromVars, stagger = 0.08) => {
                const list = Array.isArray(targets) ? targets : Array.from(targets);
                if (!list.length) return null;

                list.forEach((el) => {
                    el.classList.add('reveal-init');
                    ownedElements.add(el);
                });

                const trigger = triggerEl || list[0];

                const tween = gsap.fromTo(
                    list,
                    { ...fromVars, opacity: 0 },
                    {
                        x: 0,
                        y: 0,
                        scale: 1,
                        opacity: 1,
                        duration: 0.7,
                        ease: 'power3.out',
                        stagger: stagger,
                        paused: true,
                        onStart: () => list.forEach((el) => el.classList.remove('reveal-init')),
                        onComplete: () => gsap.set(list, { clearProps: 'transform,willChange' })
                    }
                );

                ownedTweens.push(tween);

                const st = ScrollTrigger.create({
                    trigger: trigger,
                    start: ENTER_START,
                    once: true,
                    invalidateOnRefresh: true,
                    onEnter: () => tween.play()
                });
                ownedTriggers.push(st);
                return tween;
            };

            sections.forEach((section) => {
                // Intro canvas sequence drives its own scrubbed turntable and hero assembly
                if (section.id === 'intro' || section.closest('#intro')) return;

                const isHero = section.id === 'hero' || section.classList.contains('hero-section');

                // CyberHero entrance
                if (isHero) {
                    const heroBadges = Array.from(
                        section.querySelectorAll('[data-assemble="pop"], .border-3')
                    );
                    const heroHeadings = Array.from(section.querySelectorAll('[data-assemble="left"], h1'));
                    const heroBody = Array.from(
                        section.querySelectorAll('[data-assemble="up"], p, .cyber-button, a')
                    );
                    const heroFooter = Array.from(section.querySelectorAll('[data-assemble="down"]'));

                    if (heroBadges.length)
                        revealOnce(heroBadges, heroBadges[0], { y: 20, scale: 0.85 }, 0.05);
                    if (heroHeadings.length) revealOnce(heroHeadings, heroHeadings[0], { x: -48 }, 0.1);
                    if (heroBody.length) revealOnce(heroBody, heroBody[0], { y: 36 }, 0.08);
                    if (heroFooter.length) revealOnce(heroFooter, heroFooter[0], { y: 20 }, 0.05);
                    return;
                }

                // Marquee ribbons (slide in from left & right as scrolled to)
                if (section.classList.contains('marquee-hold')) {
                    const ribbons = Array.from(section.children);
                    if (ribbons[0]) revealOnce([ribbons[0]], ribbons[0], { x: -60 });
                    if (ribbons[1]) revealOnce([ribbons[1]], ribbons[1], { x: 60 });
                    return;
                }

                // The Squad section
                if (section.id === 'squad') {
                    const header = section.querySelector('[data-assemble="header"]');
                    if (header) revealOnce([header], header, { y: -36 });

                    const squadGrid = section.querySelector('[data-assemble="stagger"]');
                    if (squadGrid) {
                        const buttons = Array.from(squadGrid.children);
                        revealOnce(buttons, squadGrid, { y: 36, scale: 0.94 }, 0.06);
                    }
                    return;
                }

                // General section elements with explicit annotations
                const headers = Array.from(section.querySelectorAll('[data-assemble="header"]'));
                const leftElements = Array.from(section.querySelectorAll('[data-assemble="left"]'));
                const rightElements = Array.from(section.querySelectorAll('[data-assemble="right"]'));
                const cards = Array.from(
                    section.querySelectorAll('[data-assemble="card"], [data-assemble="up"]')
                );
                const downElements = Array.from(section.querySelectorAll('[data-assemble="down"]'));
                const popElements = Array.from(
                    section.querySelectorAll('[data-assemble="pop"], [data-assemble="badge"]')
                );
                const staggerContainers = Array.from(section.querySelectorAll('[data-assemble="stagger"]'));

                headers.forEach((h) => revealOnce([h], h, { y: -36 }));
                leftElements.forEach((el) => revealOnce([el], el, { x: -50 }));
                rightElements.forEach((el) => revealOnce([el], el, { x: 50 }));
                cards.forEach((c) => revealOnce([c], c, { y: 48, scale: 0.96 }));
                downElements.forEach((d) => revealOnce([d], d, { y: -40 }));
                popElements.forEach((p) => revealOnce([p], p, { y: 20, scale: 0.85 }));

                staggerContainers.forEach((container) => {
                    const children = Array.from(container.children);
                    revealOnce(children, container, { y: 36, scale: 0.96 }, 0.07);
                });
            });

            ScrollTrigger.refresh();

            refreshOnLoad = () => ScrollTrigger.refresh();
            window.addEventListener('load', refreshOnLoad);
        }, 100);

        return () => {
            clearTimeout(timer);
            if (refreshOnLoad) window.removeEventListener('load', refreshOnLoad);
            if (lenis && scrollHandler) lenis.off('scroll', scrollHandler);

            ownedTriggers.forEach((trigger) => trigger.kill());
            ownedTweens.forEach((tween) => tween.kill());

            clearManaged();
        };
    }, [lenis, dependency]);
}
