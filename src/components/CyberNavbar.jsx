import { useState, useEffect } from 'react';
import teamLogo from '../assets/Screenshot 2026-08-26 232320.png';
import TextDock, { DockTextItem } from './Dock';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { useCommunityAuth } from '../context/CommunityAuthContext';
import Icon from './Icon';

export default function CyberNavbar({
    onSelectSubsystem,
    isDetailPage,
    currentPage = 'home',
    onBackToHome,
    onOpenSponsor,
    onOpenCommunity,
    onOpenProfile
}) {
    const { siteData } = useWebsiteData();
    const communityAuth = useCommunityAuth();
    const currentMember = communityAuth?.currentMember;
    const setIsProfileModalOpen = communityAuth?.setIsProfileModalOpen;
    const setIsLoginModalOpen = communityAuth?.setIsLoginModalOpen;
    const subsystems = siteData.subsystems;
    const { contact } = siteData;
    const [shopOpen, setShopOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileContactOpen, setMobileContactOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        let lastScrollY = window.scrollY || document.documentElement.scrollTop;
        /* Reads only window.scrollY. The previous version also measured
           body/documentElement scrollHeight and offsetHeight here to decide
           whether the footer was in view -- four forced layout reads on every
           scroll event, on a page already running Lenis, ScrollTrigger, a WebGL
           loop, a particle loop and the DriftWall rAF. That measurement existed
           only to hide the mobile dock near the footer, which is exactly when a
           phone still needs it; the footer now reserves space for the dock
           instead. */
        const handleScroll = () => {
            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            setIsScrolled(currentScrollY > 40);

            if (Math.abs(currentScrollY - lastScrollY) > 60) {
                setShopOpen(false);
                setContactOpen(false);
                setMobileContactOpen(false);
            }
            lastScrollY = currentScrollY;
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Sentinel observer targeting the non-sticky end of main
        let observer;
        const sentinelEl = document.getElementById('footer-sentinel');
        if (sentinelEl) {
            observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setMobileOpen(false);
                    }
                },
                { threshold: 0.1 }
            );
            observer.observe(sentinelEl);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (observer && sentinelEl) observer.unobserve(sentinelEl);
        };
    }, []);

    const socialLinks = [
        {
            name: 'Instagram',
            handle: '@asterix_itech',
            url: contact.instagramUrl || 'https://www.instagram.com/asterix_itech/',
            color: 'hover:bg-pink-50 hover:text-pink-600',
            icon: (
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            )
        },
        {
            name: 'LinkedIn',
            handle: 'Team Asterix',
            url: 'https://www.linkedin.com/company/teamasterix/',
            color: 'hover:bg-blue-50 hover:text-blue-600',
            icon: (
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
            )
        },
        {
            name: 'GitHub',
            handle: 'Team-Asterix264016',
            url: 'https://github.com/Team-Asterix264016/',
            color: 'hover:bg-slate-100 hover:text-slate-950',
            icon: (
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                </svg>
            )
        }
    ];

    const handleSubsystemClick = (id) => {
        setShopOpen(false);
        setContactOpen(false);
        setMobileOpen(false);
        if (onSelectSubsystem) {
            onSelectSubsystem(id);
        }
    };

    return (
        <>
            {/* =========================================================================
                DESKTOP NAVIGATION: Option 2 — Morphing Floating Cyber Island (>= md)
                ========================================================================= */}
            <header
                className={`fixed z-50 hidden transition-all duration-300 ease-out select-none md:block ${
                    isScrolled
                        ? 'shadow-brutal-3 top-2.5 left-1/2 w-max max-w-[95vw] -translate-x-1/2 rounded-full border-2 border-slate-900 bg-white/90 px-3.5 py-1 backdrop-blur-md'
                        : 'inset-x-0 top-0 w-full rounded-none border-b-4 border-slate-900 bg-white/95 px-4 py-2.5 shadow-none backdrop-blur-md sm:px-8'
                }`}
            >
                <div className="relative flex items-center justify-between gap-2.5 lg:gap-4">
                    {/* Brand Logo */}
                    <button
                        onClick={onBackToHome}
                        className="press press-flat group flex flex-shrink-0 cursor-pointer items-center text-left focus:outline-none"
                        aria-label="Asterix Racing Home"
                    >
                        <img
                            src={teamLogo}
                            alt="Asterix Racing"
                            className={`w-auto object-contain transition-all duration-200 group-hover:scale-105 ${
                                isScrolled ? 'h-6 lg:h-6.5' : 'h-8 sm:h-9 md:h-10'
                            }`}
                        />
                    </button>

                    {/* React Bits TextDock: Proximity magnification on the actual letters/buttons */}
                    <div className="flex items-center">
                        <TextDock className={isScrolled ? 'py-0' : 'py-0.5'}>
                            {({ mouseX }) => (
                                <div
                                    className={`flex items-center ${isScrolled ? 'gap-1 lg:gap-1.5' : 'gap-1.5 lg:gap-2'}`}
                                >
                                    {/* The Subsystems Text Item */}
                                    <div className="relative">
                                        <DockTextItem
                                            mouseX={mouseX}
                                            onClick={() => {
                                                setShopOpen((prev) => !prev);
                                                setContactOpen(false);
                                            }}
                                            className={`press flex items-center gap-1 border-slate-900 bg-white transition-colors ${
                                                isScrolled
                                                    ? 'hover:shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px] font-bold hover:bg-sky-100'
                                                    : 'shadow-brutal-2 hover:shadow-brutal-3 border-2 px-3 py-1.5 text-xs hover:bg-sky-100'
                                            } ${shopOpen ? '!bg-sky-200' : ''}`}
                                        >
                                            <span>{isScrolled ? 'SUBSYSTEMS' : 'THE SUBSYSTEMS'}</span>
                                            <span className="text-[9px]">▼</span>
                                        </DockTextItem>

                                        {/* Mega Dropdown Menu */}
                                        {shopOpen && (
                                            <div
                                                className="shadow-brutal-6 anim-pop absolute top-full left-0 z-50 mt-2.5 w-80 rounded-xl border-3 border-slate-900 bg-white p-4"
                                                onMouseLeave={() => setShopOpen(false)}
                                            >
                                                <div className="mb-2.5 flex items-center justify-between border-b-2 border-slate-200 pb-1">
                                                    <span className="font-mono text-[10px] font-black text-sky-700 uppercase">
                                                        // SELECT SUBSYSTEM DECK
                                                    </span>
                                                    <button
                                                        onClick={() => setShopOpen(false)}
                                                        className="press press-flat cursor-pointer text-xs font-black text-slate-500 hover:text-slate-900"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {subsystems.map((s) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => handleSubsystemClick(s.id)}
                                                            className="press press-flat flex cursor-pointer items-center justify-between rounded border border-slate-900 bg-sky-50 p-2 text-left text-xs font-bold transition-colors hover:bg-sky-500 hover:text-slate-950"
                                                        >
                                                            <span>{s.name}</span>
                                                            <span>→</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isDetailPage && (
                                        <DockTextItem
                                            mouseX={mouseX}
                                            onClick={onBackToHome}
                                            className={`press flex items-center gap-1 border-slate-900 bg-amber-300 font-bold text-slate-900 hover:bg-amber-400 ${
                                                isScrolled
                                                    ? 'shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px]'
                                                    : 'shadow-brutal-2 border-2 px-3 py-1.5 text-xs'
                                            }`}
                                        >
                                            <span>← Home</span>
                                        </DockTextItem>
                                    )}

                                    {/* Contact Us Button */}
                                    <div className="relative">
                                        <DockTextItem
                                            mouseX={mouseX}
                                            onClick={() => {
                                                setContactOpen((prev) => !prev);
                                                setShopOpen(false);
                                                setMobileOpen(false);
                                            }}
                                            className={`press flex items-center gap-1 border-slate-900 bg-white ${
                                                isScrolled
                                                    ? 'hover:shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px] font-bold hover:bg-sky-100'
                                                    : 'shadow-brutal-2 hover:shadow-brutal-3 border-2 px-3 py-1.5 text-xs hover:bg-sky-100'
                                            } ${contactOpen ? '!bg-sky-200' : ''}`}
                                        >
                                            <span>CONTACT</span>
                                            <span className="text-[9px]">▼</span>
                                        </DockTextItem>

                                        {/* Contact Us Dropdown Pop-up Card */}
                                        {contactOpen && (
                                            <div
                                                className="shadow-brutal-6 anim-pop absolute top-full right-0 z-50 mt-2.5 w-72 rounded-xl border-3 border-slate-900 bg-white p-3.5"
                                                onMouseLeave={() => setContactOpen(false)}
                                            >
                                                <div className="mb-2.5 flex items-center justify-between border-b-2 border-slate-200 pb-1">
                                                    <span className="font-mono text-[10px] font-black text-sky-700 uppercase">
                                                        // COMMS & SOCIALS
                                                    </span>
                                                    <button
                                                        onClick={() => setContactOpen(false)}
                                                        className="press press-flat cursor-pointer text-xs font-black text-slate-500 hover:text-slate-900"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    {socialLinks.map((item) => (
                                                        <a
                                                            key={item.name}
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => setContactOpen(false)}
                                                            className={`rounded border border-slate-900 bg-sky-50 p-2 ${item.color} hover:shadow-brutal-3 group flex cursor-pointer items-center justify-between text-xs font-bold transition-all hover:translate-x-[-1px] hover:translate-y-[-1px]`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {item.icon}
                                                                <div>
                                                                    <span className="block text-[11px] font-black text-slate-900 uppercase group-hover:text-inherit">
                                                                        {item.name}
                                                                    </span>
                                                                    <span className="block font-mono text-[9px] text-slate-500">
                                                                        {item.handle}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-900 group-hover:text-inherit">
                                                                ↗
                                                            </span>
                                                        </a>
                                                    ))}
                                                </div>

                                                <div className="mt-2.5 flex flex-col gap-1.5 border-t border-slate-200 pt-2">
                                                    <a
                                                        href="tel:+918608944644"
                                                        className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-700 hover:text-sky-700"
                                                    >
                                                        <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-sky-100 p-0.5">
                                                            <Icon name="phone" className="h-2.5 w-2.5" />
                                                        </span>
                                                        <span>+91 86089 44644</span>
                                                    </a>
                                                    <a
                                                        href={`mailto:${contact.email || 'asterix.psgitech@gmail.com'}`}
                                                        className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-600 hover:text-sky-700"
                                                    >
                                                        <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-sky-100 p-0.5">
                                                            <Icon name="mail" className="h-2.5 w-2.5" />
                                                        </span>
                                                        <span className="truncate">
                                                            {contact.email || 'asterix.psgitech@gmail.com'}
                                                        </span>
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Profile & Attendance Button */}
                                    <DockTextItem
                                        mouseX={mouseX}
                                        onClick={() => {
                                            if (currentMember) {
                                                setIsProfileModalOpen?.(true);
                                            } else if (onOpenProfile) {
                                                onOpenProfile();
                                            } else {
                                                setIsLoginModalOpen?.(true);
                                            }
                                        }}
                                        className={`cursor-pointer border-slate-900 ${
                                            currentPage === 'profile'
                                                ? 'bg-purple-400 font-black text-slate-900 shadow-[inset_2px_2px_0px_#000]'
                                                : 'bg-purple-300 font-black text-slate-900 hover:bg-purple-400'
                                        } ${
                                            isScrolled
                                                ? 'hover:shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px]'
                                                : 'shadow-brutal-2 hover:shadow-brutal-3 border-2 px-3.5 py-1.5 text-xs'
                                        }`}
                                    >
                                        {currentMember ? (
                                            <span className="flex items-center gap-1.5 font-mono text-[11px] font-black">
                                                <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-slate-900 text-amber-300">
                                                    {currentMember.avatar}
                                                </span>
                                                <span>LVL {currentMember.level}</span>
                                            </span>
                                        ) : (
                                            <span>PROFILE 🔓</span>
                                        )}
                                    </DockTextItem>

                                    {/* Community Button */}
                                    <DockTextItem
                                        mouseX={mouseX}
                                        onClick={() => {
                                            if (onOpenCommunity) onOpenCommunity();
                                            else window.location.hash = '#community';
                                        }}
                                        className={`cursor-pointer border-slate-900 ${
                                            currentPage === 'community'
                                                ? 'bg-emerald-400 font-black text-slate-900 shadow-[inset_2px_2px_0px_#000]'
                                                : 'bg-emerald-300 font-black text-slate-900 hover:bg-emerald-400'
                                        } ${
                                            isScrolled
                                                ? 'hover:shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px]'
                                                : 'shadow-brutal-2 hover:shadow-brutal-3 border-2 px-3.5 py-1.5 text-xs'
                                        }`}
                                    >
                                        <span>COMMUNITY</span>
                                        <span className="text-[9px]">💬</span>
                                    </DockTextItem>

                                    {/* Sponsor Team Button */}
                                    <DockTextItem
                                        mouseX={mouseX}
                                        onClick={() => {
                                            if (onOpenSponsor) onOpenSponsor();
                                            else window.location.hash = '#sponsor';
                                        }}
                                        className={`cursor-pointer border-slate-900 ${
                                            currentPage === 'sponsor'
                                                ? 'bg-sky-600 font-black text-slate-950 shadow-[inset_2px_2px_0px_#000]'
                                                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                                        } ${
                                            isScrolled
                                                ? 'hover:shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px] font-bold'
                                                : 'shadow-brutal-2 hover:shadow-brutal-3 border-2 px-3.5 py-1.5 text-xs'
                                        }`}
                                    >
                                        <span>Sponsor</span>
                                        <span className="text-[9px]">↗</span>
                                    </DockTextItem>
                                </div>
                            )}
                        </TextDock>
                    </div>
                </div>
            </header>

            {/* =========================================================================
                MOBILE DYNAMIC TOP BRAND HEADER (< md)
                Shown on the first page, smoothly slides away on scroll
                ========================================================================= */}
            <header
                className={`fixed inset-x-0 top-0 z-50 flex h-[46px] items-center justify-between border-b-2 border-slate-900 bg-white/95 px-3.5 py-1.5 shadow-[0_2px_4px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 ease-out select-none md:hidden ${
                    isScrolled
                        ? 'pointer-events-none -translate-y-full opacity-0'
                        : 'translate-y-0 opacity-100'
                }`}
            >
                <button
                    onClick={onBackToHome}
                    className="tap flex cursor-pointer items-center gap-1.5 focus:outline-none"
                    aria-label="Asterix Racing Home"
                >
                    <img src={teamLogo} alt="Asterix Racing" className="h-6 w-auto object-contain" />
                </button>
                <div className="flex items-center gap-1.5">
                    <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-700 uppercase">
                        AUTONOMY
                    </span>
                </div>
            </header>

            {/* =========================================================================
                MOBILE NAVIGATION: Option 3 — Cockpit Telemetry Bottom Dock (< md)
                Slides up into view only AFTER scrolling past first page, and slides away at footer
                ========================================================================= */}
            <div
                className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-50 flex flex-col items-center transition-all duration-500 ease-out select-none md:hidden ${
                    isScrolled
                        ? 'pointer-events-auto translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-36 opacity-0'
                }`}
            >
                {/* Mobile Slide-Up Cockpit Drawer */}
                {mobileOpen && (
                    <div
                        /* Lenis intercepts the wheel over a fixed overlay unless it is
                           told not to; data-modal-scroll hands the vertical axis back
                           on touch. dvh rather than vh so the sheet is measured
                           against the visible area, not the one behind the URL bar. */
                        data-lenis-prevent
                        data-modal-scroll
                        className="shadow-brutal-6 anim-sheet-slide-up pointer-events-auto mb-2 max-h-[min(70dvh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl border-3 border-slate-900 bg-white p-4"
                    >
                        <div className="mb-3 flex items-center justify-between border-b-2 border-slate-900 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
                                <span className="font-mono text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    COCKPIT HUD // MENU
                                </span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="press press-flat tap-sq cursor-pointer rounded border border-slate-900 bg-slate-100 px-2 py-1 text-xs font-black hover:bg-slate-900 hover:text-white"
                            >
                                ✕ CLOSE
                            </button>
                        </div>

                        {/* Subsystems List */}
                        <div className="mb-3">
                            <span className="mb-1.5 block font-mono text-[10px] font-black text-sky-700 uppercase">
                                // SUBSYSTEMS ARCHIVE
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                                {subsystems.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSubsystemClick(s.id)}
                                        className="tap flex cursor-pointer items-center justify-between truncate border border-slate-900 bg-white p-2 text-left text-[11px] font-bold hover:bg-sky-500 hover:text-slate-950"
                                    >
                                        <span className="truncate">{s.name}</span>
                                        <span className="ml-1 text-[10px]">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contact & Socials Accordion */}
                        <div className="mb-3 rounded border-2 border-slate-900 bg-slate-50 p-2.5">
                            <button
                                onClick={() => setMobileContactOpen(!mobileContactOpen)}
                                className="tap flex w-full cursor-pointer items-center justify-between text-xs font-black text-slate-900 uppercase"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span>CONTACT & SOCIALS</span>
                                </span>
                                <span className="text-xs">{mobileContactOpen ? '▲' : '▼'}</span>
                            </button>

                            {mobileContactOpen && (
                                <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-200 pt-2">
                                    {socialLinks.map((item) => (
                                        <a
                                            key={item.name}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setMobileOpen(false)}
                                            className="tap flex items-center justify-between border border-slate-900 bg-white p-2 text-xs font-bold hover:bg-sky-100"
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.icon}
                                                <span className="font-bold">{item.name}</span>
                                            </div>
                                            <span className="font-mono text-[11px] text-slate-500">
                                                {item.handle} ↗
                                            </span>
                                        </a>
                                    ))}
                                    <a
                                        href="tel:+918608944644"
                                        className="flex items-center gap-1.5 border border-slate-900 bg-white p-2 font-mono text-[10px] font-bold text-slate-700"
                                    >
                                        <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-sky-100 p-0.5">
                                            <Icon name="phone" className="h-2.5 w-2.5" />
                                        </span>
                                        <span>+91 86089 44644</span>
                                    </a>
                                    <a
                                        href={`mailto:${contact.email || 'asterix.psgitech@gmail.com'}`}
                                        className="flex items-center gap-1.5 truncate border border-slate-900 bg-white p-2 font-mono text-[10px] font-bold text-slate-700"
                                    >
                                        <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-sky-100 p-0.5">
                                            <Icon name="mail" className="h-2.5 w-2.5" />
                                        </span>
                                        <span className="truncate">
                                            {contact.email || 'asterix.psgitech@gmail.com'}
                                        </span>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Direct Action Button */}
                        <div className="flex flex-col gap-2 pt-1">
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    if (onOpenProfile) onOpenProfile();
                                    else window.location.hash = '#workshop-profile';
                                }}
                                className="shadow-brutal-2 tap flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-purple-300 p-2.5 text-center text-xs font-black text-slate-900 uppercase hover:bg-purple-400"
                            >
                                <span>My Profile & Notes 🔓</span>
                            </button>
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    if (onOpenCommunity) onOpenCommunity();
                                    else window.location.hash = '#community';
                                }}
                                className="shadow-brutal-2 tap flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-emerald-300 p-2.5 text-center text-xs font-black text-slate-900 uppercase hover:bg-emerald-400"
                            >
                                <span>Community & Horizon</span>
                                <span>💬</span>
                            </button>
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    if (onOpenSponsor) onOpenSponsor();
                                    else window.location.hash = '#sponsor';
                                }}
                                className="shadow-brutal-2 tap flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-sky-500 p-2.5 text-center text-xs font-black text-slate-950 uppercase hover:bg-sky-400"
                            >
                                <span>Sponsor Asterix Racing</span>
                                <span>↗</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Floating Bottom Cockpit Dock Bar */}
                <nav
                    aria-label="Mobile Navigation Cockpit"
                    className="shadow-brutal-4 pointer-events-auto flex w-full max-w-sm items-stretch justify-between gap-2 rounded-2xl border-3 border-slate-900 bg-white/95 p-2 backdrop-blur-md"
                >
                    {/* Home / Logo Anchor */}
                    <button
                        onClick={
                            isDetailPage
                                ? onBackToHome
                                : () => window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                        className="press press-flat tap flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-3 text-[11px] font-black text-white"
                        title={isDetailPage ? 'Back to Home' : 'Scroll to Top'}
                    >
                        {isDetailPage ? '← HOME' : '▲ TOP'}
                    </button>

                    {/* Cockpit HUD Menu Toggle. Carries the subsystem count, which used
                        to live on a second button beside it that opened this same
                        drawer -- two triggers for one panel, and the one that was
                        removed styled itself from `shopOpen`, which only the desktop
                        header ever sets. */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className={`press tap flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-slate-900 px-3 text-xs font-black uppercase ${
                            mobileOpen ? 'bg-slate-900 text-white' : 'shadow-brutal-2 bg-white text-slate-900'
                        }`}
                        aria-expanded={mobileOpen}
                        aria-label="Toggle navigation HUD menu"
                    >
                        <span>{mobileOpen ? '✕' : '☰'}</span>
                        <span>MENU</span>
                        <span
                            className={`rounded px-1 py-px font-mono text-[9px] ${
                                mobileOpen ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                            }`}
                        >
                            {subsystems.length}
                        </span>
                    </button>

                    {/* Quick CTA Pill: Sponsor */}
                    <button
                        onClick={() => {
                            if (onOpenSponsor) onOpenSponsor();
                            else window.location.hash = '#sponsor';
                        }}
                        className="press shadow-brutal-2 tap flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border-2 border-slate-900 bg-sky-500 px-3 text-xs font-black text-slate-950 uppercase"
                    >
                        <span>SPONSOR</span>
                        <span className="text-[10px]">↗</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
