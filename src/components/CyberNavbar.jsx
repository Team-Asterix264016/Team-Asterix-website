import { useState, useEffect } from 'react';
import teamLogo from '../assets/Screenshot 2026-08-26 232320.png';
import TextDock, { DockTextItem } from './Dock';
import { useWebsiteData } from '../context/WebsiteDataContext';
import Icon from './Icon';

export default function CyberNavbar({
    onSelectSubsystem,
    isDetailPage,
    currentPage = 'home',
    onBackToHome,
    onOpenSponsor,
    onOpenWorkshop,
    onOpenCommunity
}) {
    const { siteData } = useWebsiteData();
    const subsystems = siteData.subsystems;
    const { contact } = siteData;
    const [shopOpen, setShopOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileContactOpen, setMobileContactOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(false);

    useEffect(() => {
        let lastScrollY = window.scrollY || document.documentElement.scrollTop;
        const handleScroll = () => {
            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const docHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight
            );

            const scrolled = currentScrollY > 40;
            setIsScrolled(scrolled);

            // True only when user scrolls near the bottom of the page where the footer is revealed
            const atFooter = currentScrollY + windowHeight >= docHeight - 350;
            setIsFooterVisible(atFooter);

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
                        setIsFooterVisible(true);
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

    const handleNavigate = (hash) => {
        setShopOpen(false);
        setContactOpen(false);
        if (isDetailPage && onBackToHome) {
            onBackToHome();
            setTimeout(() => {
                const el = document.querySelector(hash);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            const el = document.querySelector(hash);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
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

                                    {isScrolled ? (
                                        /* Scrolled: Compact Merged Explore / Sections Dropdown */
                                        <div className="relative">
                                            <DockTextItem
                                                mouseX={mouseX}
                                                onClick={() => {
                                                    setMobileOpen((prev) => !prev);
                                                    setShopOpen(false);
                                                    setContactOpen(false);
                                                }}
                                                className={`press hover:shadow-brutal-2 flex items-center gap-1 rounded-md border border-slate-900 bg-white px-2.5 py-1 text-[11px] font-bold hover:bg-sky-100 ${
                                                    mobileOpen ? '!bg-sky-200' : ''
                                                }`}
                                            >
                                                <span>EXPLORE</span>
                                                <span className="text-[9px]">▼</span>
                                            </DockTextItem>

                                            {mobileOpen && (
                                                <div
                                                    className="shadow-brutal-6 anim-pop absolute top-full left-1/2 z-50 mt-2.5 w-56 -translate-x-1/2 rounded-xl border-3 border-slate-900 bg-white p-3"
                                                    onMouseLeave={() => setMobileOpen(false)}
                                                >
                                                    <div className="mb-2 flex items-center justify-between border-b-2 border-slate-200 pb-1">
                                                        <span className="font-mono text-[10px] font-black text-sky-700 uppercase">
                                                            // SECTIONS
                                                        </span>
                                                        <button
                                                            onClick={() => setMobileOpen(false)}
                                                            className="press press-flat cursor-pointer text-xs font-black text-slate-500 hover:text-slate-900"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setMobileOpen(false);
                                                                handleNavigate('#gallery');
                                                            }}
                                                            className="flex cursor-pointer items-center justify-between rounded border border-slate-900 bg-sky-50 p-1.5 text-left text-xs font-bold transition-colors hover:bg-sky-500 hover:text-slate-950"
                                                        >
                                                            <span>Gallery</span>
                                                            <span>→</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMobileOpen(false);
                                                                handleNavigate('#updates');
                                                            }}
                                                            className="flex cursor-pointer items-center justify-between rounded border border-slate-900 bg-sky-50 p-1.5 text-left text-xs font-bold transition-colors hover:bg-sky-500 hover:text-slate-950"
                                                        >
                                                            <span>Updates</span>
                                                            <span>→</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMobileOpen(false);
                                                                handleNavigate('#story');
                                                            }}
                                                            className="flex cursor-pointer items-center justify-between rounded border border-slate-900 bg-sky-50 p-1.5 text-left text-xs font-bold transition-colors hover:bg-sky-500 hover:text-slate-950"
                                                        >
                                                            <span>Our Story</span>
                                                            <span>→</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Top State: Full Links */
                                        <>
                                            {/* Gallery */}
                                            <DockTextItem
                                                mouseX={mouseX}
                                                onClick={() => handleNavigate('#gallery')}
                                                className="shadow-brutal-2 hover:shadow-brutal-3 border-2 border-slate-900 bg-white px-3 py-1.5 text-xs hover:bg-sky-100"
                                            >
                                                <span>Gallery</span>
                                            </DockTextItem>

                                            {/* Updates */}
                                            <DockTextItem
                                                mouseX={mouseX}
                                                onClick={() => handleNavigate('#updates')}
                                                className="shadow-brutal-2 hover:shadow-brutal-3 border-2 border-slate-900 bg-white px-3 py-1.5 text-xs hover:bg-sky-100"
                                            >
                                                <span>Updates</span>
                                            </DockTextItem>

                                            {/* Our Story */}
                                            <DockTextItem
                                                mouseX={mouseX}
                                                onClick={() => handleNavigate('#story')}
                                                className="shadow-brutal-2 hover:shadow-brutal-3 border-2 border-slate-900 bg-white px-3 py-1.5 text-xs hover:bg-sky-100"
                                            >
                                                <span>Our Story</span>
                                            </DockTextItem>
                                        </>
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
                                                        href={`tel:${(contact.phone || '+91 86089 44644').replace(/[^0-9+]/g, '')}`}
                                                        className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-700 hover:text-sky-700"
                                                    >
                                                        <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-sky-100 p-0.5">
                                                            <Icon name="phone" className="h-2.5 w-2.5" />
                                                        </span>
                                                        <span>{contact.phone || '+91 86089 44644'}</span>
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

                                    {/* Workshop Button -- amber so it stands apart from the sky links */}
                                    <DockTextItem
                                        mouseX={mouseX}
                                        onClick={() => onOpenWorkshop?.()}
                                        className={`flex cursor-pointer items-center gap-1 border-slate-900 bg-amber-300 font-black text-slate-900 hover:bg-amber-400 ${
                                            isScrolled
                                                ? 'hover:shadow-brutal-2 rounded-md border px-2.5 py-1 text-[11px]'
                                                : 'shadow-brutal-2 hover:shadow-brutal-3 border-2 px-3.5 py-1.5 text-xs'
                                        }`}
                                    >
                                        <span>WORKSHOP</span>
                                        <span className="text-[9px]">✦</span>
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
                    className="flex cursor-pointer items-center gap-1.5 focus:outline-none"
                    aria-label="Asterix Racing Home"
                >
                    <img src={teamLogo} alt="Asterix Racing" className="h-6 w-auto object-contain" />
                </button>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onOpenWorkshop?.()}
                        className="press shadow-brutal-1 flex cursor-pointer items-center gap-1 rounded border border-slate-900 bg-amber-300 px-2 py-0.5 text-[10px] font-black text-slate-900 uppercase"
                    >
                        <span>Workshop</span>
                        <span className="text-[9px]">✦</span>
                    </button>
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
                className={`fixed inset-x-3 bottom-3 z-50 flex flex-col items-center transition-all duration-500 ease-out select-none md:hidden ${
                    isScrolled && !isFooterVisible
                        ? 'pointer-events-auto translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-36 opacity-0'
                }`}
            >
                {/* Mobile Slide-Up Cockpit Drawer */}
                {mobileOpen && (
                    <div className="shadow-brutal-6 anim-sheet-slide-up pointer-events-auto mb-2 max-h-[75vh] w-full max-w-md overflow-y-auto rounded-2xl border-3 border-slate-900 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between border-b-2 border-slate-900 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
                                <span className="font-mono text-[11px] font-black tracking-wider text-slate-900 uppercase">
                                    COCKPIT HUD // MENU
                                </span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="press press-flat cursor-pointer rounded border border-slate-900 bg-slate-100 px-2 py-1 text-xs font-black hover:bg-slate-900 hover:text-white"
                            >
                                ✕ CLOSE
                            </button>
                        </div>

                        {/* Navigation Sections */}
                        <div className="mb-3 grid grid-cols-3 gap-2">
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    handleNavigate('#gallery');
                                }}
                                className="shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-50 p-2 text-center text-xs font-black uppercase hover:bg-sky-200"
                            >
                                Gallery
                            </button>
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    handleNavigate('#updates');
                                }}
                                className="shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-50 p-2 text-center text-xs font-black uppercase hover:bg-sky-200"
                            >
                                Updates
                            </button>
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    handleNavigate('#story');
                                }}
                                className="shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-sky-50 p-2 text-center text-xs font-black uppercase hover:bg-sky-200"
                            >
                                Story
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
                                        className="flex cursor-pointer items-center justify-between truncate border border-slate-900 bg-white p-2 text-left text-[11px] font-bold hover:bg-sky-500 hover:text-slate-950"
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
                                className="flex w-full cursor-pointer items-center justify-between text-xs font-black text-slate-900 uppercase"
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
                                            className="flex items-center justify-between border border-slate-900 bg-white p-2 text-xs font-bold hover:bg-sky-100"
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
                                        href={`tel:${(contact.phone || '+91 86089 44644').replace(/[^0-9+]/g, '')}`}
                                        className="flex items-center gap-1.5 border border-slate-900 bg-white p-2 font-mono text-[10px] font-bold text-slate-700"
                                    >
                                        <span className="flex h-4 w-4 items-center justify-center border border-slate-900 bg-sky-100 p-0.5">
                                            <Icon name="phone" className="h-2.5 w-2.5" />
                                        </span>
                                        <span>{contact.phone || '+91 86089 44644'}</span>
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
                                    onOpenWorkshop?.();
                                }}
                                className="shadow-brutal-2 flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-amber-300 p-2.5 text-center text-xs font-black text-slate-900 uppercase hover:bg-amber-400"
                            >
                                <span>Workshops 2026</span>
                                <span>✦</span>
                            </button>
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    if (onOpenCommunity) onOpenCommunity();
                                    else window.location.hash = '#community';
                                }}
                                className="shadow-brutal-2 flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-emerald-300 p-2.5 text-center text-xs font-black text-slate-900 uppercase hover:bg-emerald-400"
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
                                className="shadow-brutal-2 flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-sky-500 p-2.5 text-center text-xs font-black text-slate-950 uppercase hover:bg-sky-400"
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
                    className="shadow-brutal-4 pointer-events-auto flex w-full max-w-sm items-center justify-between gap-1.5 rounded-2xl border-3 border-slate-900 bg-white/95 px-2.5 py-1.5 backdrop-blur-md"
                >
                    {/* Home / Logo Anchor */}
                    <button
                        onClick={
                            isDetailPage
                                ? onBackToHome
                                : () => window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                        className="press press-flat flex cursor-pointer items-center justify-center rounded-lg bg-slate-900 p-1.5 text-[11px] font-black text-white"
                        title={isDetailPage ? 'Back to Home' : 'Scroll to Top'}
                    >
                        {isDetailPage ? '← HOME' : '▲ TOP'}
                    </button>

                    {/* Subsystems Trigger */}
                    <button
                        onClick={() => {
                            setMobileOpen(true);
                            setMobileContactOpen(false);
                        }}
                        className={`press flex items-center gap-1 rounded-lg border-2 border-slate-900 p-1.5 text-xs font-black uppercase ${
                            shopOpen ? 'bg-sky-200' : 'bg-sky-50'
                        }`}
                    >
                        <span>SPECS</span>
                        <span className="py-0.2 rounded bg-slate-900 px-1 font-mono text-[9px] text-white">
                            {subsystems.length}
                        </span>
                    </button>

                    {/* Cockpit HUD Menu Toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className={`press flex items-center gap-1.5 rounded-lg border-2 border-slate-900 px-2.5 py-1.5 text-xs font-black uppercase ${
                            mobileOpen ? 'bg-slate-900 text-white' : 'shadow-brutal-2 bg-white text-slate-900'
                        }`}
                        aria-expanded={mobileOpen}
                        aria-label="Toggle navigation HUD menu"
                    >
                        <span>{mobileOpen ? '✕' : '☰'}</span>
                        <span>MENU</span>
                    </button>

                    {/* Quick CTA Pill: Sponsor */}
                    <button
                        onClick={() => {
                            if (onOpenSponsor) onOpenSponsor();
                            else window.location.hash = '#sponsor';
                        }}
                        className="press shadow-brutal-2 flex cursor-pointer items-center gap-0.5 rounded-lg border-2 border-slate-900 bg-sky-500 px-2.5 py-1.5 text-xs font-black text-slate-950 uppercase"
                    >
                        <span>SPONSOR</span>
                        <span className="text-[10px]">↗</span>
                    </button>
                </nav>
            </div>
        </>
    );
}
