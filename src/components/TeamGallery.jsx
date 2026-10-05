import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import DriftWall from './DriftWall';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { apiUrl } from '../lib/api';
import { framingStyle } from '../lib/imageFraming';
import Icon from './Icon';

export default function TeamGallery() {
    const { siteData } = useWebsiteData();
    const [lightboxIndex, setLightboxIndex] = useState(null);

    // Read once per resize rather than once per render, so the wall actually
    // re-lays-out when the viewport changes instead of keeping whatever
    // breakpoint happened to be true on first paint.
    const isNarrow = useSyncExternalStore(
        (callback) => {
            const mq = window.matchMedia('(max-width: 639px)');
            mq.addEventListener('change', callback);
            return () => mq.removeEventListener('change', callback);
        },
        () => window.matchMedia('(max-width: 639px)').matches,
        () => false
    );

    // Disable scrolling when lightbox modal is open
    useEffect(() => {
        if (lightboxIndex === null) return;

        const prevBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.lenis?.stop();

        return () => {
            document.body.style.overflow = prevBodyOverflow;
            window.lenis?.start();
        };
    }, [lightboxIndex]);

    const galleryItems = useMemo(() => {
        return siteData.gallery.map((g, idx) => ({
            id: g.id || idx,
            title: g.title,
            category: g.category || "PADDOCK & TRACK",
            location: g.location || "Asterix Mobility Proving Grounds",
            date: g.year || "2026",
            image: apiUrl(g.src),
            badge: g.category || "GALLERY",
            description: g.desc || "",
            // Crop chosen in the admin against a preview of this exact tile.
            fit: g.fit,
            position: g.position
        }));
    }, [siteData.gallery]);

    // Multiplied list to provide a continuous, fluid drifting wall across columns
    const driftItems = useMemo(() => {
        return [
            ...galleryItems,
            ...galleryItems,
            ...galleryItems
        ];
    }, [galleryItems]);

    // Keyboard navigation for lightbox modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (lightboxIndex === null) return;
            if (e.key === 'Escape') setLightboxIndex(null);
            if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
            }
            if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, galleryItems.length]);

    const activeItem = lightboxIndex !== null ? galleryItems[lightboxIndex] : null;

    const pad = (n) => String(n).padStart(2, '0');

    const handleTileClick = (item) => {
        const foundIdx = galleryItems.findIndex(g => g.id === item.id);
        setLightboxIndex(foundIdx !== -1 ? foundIdx : 0);
    };

    const [viewMode, setViewMode] = useState('wall'); // 'wall' | 'grid'

    return (
        <section id="gallery" className="py-16 sm:py-28 px-4 sm:px-8 bg-white border-t-4 border-slate-900 relative overflow-hidden z-10 select-none">

            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="absolute right-4 sm:right-10 top-10 text-[7rem] sm:text-[12rem] md:text-[14rem] font-black text-slate-900/[0.025] select-none pointer-events-none font-mono leading-none z-0 will-change-transform"
                aria-hidden="true"
            >
                // 03 ARCHIVE
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="-7"
                className="hidden lg:flex absolute left-6 sm:left-12 top-14 z-20 bg-emerald-300 text-slate-950 border-3 border-slate-900 shadow-brutal-5 rounded-lg px-3 py-1.5 font-mono font-black text-[11px] uppercase tracking-wider pointer-events-none will-change-transform"
            >
                <span>● PADDOCK ARCHIVE</span>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">

                {/* Section Header */}
                <div data-assemble="header" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-6xl sm:text-7xl md:text-8xl font-black text-slate-900 leading-none uppercase">
                                OUR
                            </h2>
                            <h2 
                                data-parallax="fast" 
                                data-parallax-speed="0.18"
                                className="text-6xl sm:text-7xl md:text-8xl font-black text-stroke-black text-transparent leading-none uppercase will-change-transform"
                            >
                                GALLERY
                            </h2>
                            <span 
                                data-parallax="sticker"
                                data-parallax-rotate="4"
                                className="px-3 py-1 bg-amber-300 border-2 border-slate-900 shadow-brutal-2 font-mono text-xs font-black text-slate-900 uppercase will-change-transform"
                            >
                                ★ {galleryItems.length} ARCHIVE PHOTOS
                            </span>
                        </div>
                        <p className="text-sm sm:text-base font-bold text-slate-600 mt-3 max-w-xl">
                            Moments from our workshop fabrication, autonomous sensor calibration, proving trials, and race day celebrations. Click any photo to inspect.
                        </p>
                    </div>

                    {/* View Mode Switcher */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 border-2 border-slate-900 shadow-brutal-3">
                        <button
                            onClick={() => setViewMode('wall')}
                            className={`press px-4 py-2 font-mono text-xs font-black uppercase cursor-pointer border border-slate-900 transition-all ${
                                viewMode === 'wall'
                                    ? 'bg-sky-500 text-slate-950 shadow-brutal-2'
                                    : 'bg-white text-slate-900 hover:bg-sky-100'
                            }`}
                        >
                            3D Drift Wall
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`press px-4 py-2 font-mono text-xs font-black uppercase cursor-pointer border border-slate-900 transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-sky-500 text-slate-950 shadow-brutal-2'
                                    : 'bg-white text-slate-900 hover:bg-sky-100'
                            }`}
                        >
                            Grid Gallery ({galleryItems.length})
                        </button>
                    </div>
                </div>

                {/* 3D DriftWall or High-Density Grid Gallery Stage */}
                {viewMode === 'wall' ? (
                    <div data-assemble="card" className="relative w-full h-[540px] sm:h-[620px] md:h-[680px] bg-sky-50/40 border-4 border-slate-900 shadow-brutal-10 overflow-hidden">
                        {/* The 3D DriftWall */}
                        <DriftWall
                            items={driftItems}
                            columns={isNarrow ? 3 : 5}
                            tileWidth={isNarrow ? 165 : 220}
                            tileHeight={isNarrow ? 115 : 150}
                            gap={18}
                            radius={12}
                            tilt={16}
                            turn={-14}
                            perspective={1200}
                            depth={100}
                            speed={38}
                            direction="up"
                            variance={0.45}
                            parallax={0.6}
                            lift={54}
                            fade={0.3}
                            dim={0.92}
                            overlayColor="transparent"
                            onItemClick={handleTileClick}
                            className="w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {galleryItems.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                onClick={() => setLightboxIndex(idx)}
                                className="press group relative bg-white border-3 border-slate-900 shadow-brutal-5 hover:shadow-brutal-8-brand hover:translate-x-[-2px] hover:translate-y-[-2px] overflow-hidden cursor-pointer flex flex-col justify-between"
                            >
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                                    <img
                                        loading="lazy"
                                        decoding="async"
                                        src={apiUrl(item.image)}
                                        alt={item.title}
                                        style={framingStyle(item.fit, item.position)}
                                        className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80';
                                        }}
                                    />
                                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/90 text-white font-mono text-[9px] font-black uppercase border border-white/20">
                                        {item.badge}
                                    </span>
                                </div>
                                <div className="p-3 bg-white border-t-2 border-slate-900 flex flex-col justify-between flex-1">
                                    <h3 className="font-black text-sm uppercase text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-1">
                                        {item.title}
                                    </h3>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 block mt-1">
                                        {item.location} • {item.date}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Lightbox Modal (Detailed High-Res Photo View with Keyboard & Click Navigation) */}
            {activeItem && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 anim-fade"
                    onClick={() => setLightboxIndex(null)}
                    data-lenis-prevent
                >
                    <div
                        className="anim-pop-center relative max-w-5xl w-full bg-white border-4 border-slate-900 shadow-brutal-12-brand overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header Bar */}
                        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b-3 border-slate-900 font-mono text-xs font-black">
                            <div className="flex items-center gap-3">
                                <span className="status-dot w-2.5 h-2.5 rounded-full bg-sky-400 text-sky-400" />
                                <span className="uppercase tracking-wider">TEAM ASTERIX ARCHIVE • {pad(lightboxIndex + 1)} OF {pad(galleryItems.length)}</span>
                            </div>

                            <button
                                onClick={() => setLightboxIndex(null)}
                                className="press press-flat w-8 h-8 bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center border-2 border-white cursor-pointer font-sans text-base font-bold"
                                aria-label="Close Lightbox"
                            >
                                <span aria-hidden="true">✕</span>
                            </button>
                        </div>

                        {/* Image Viewer Frame */}
                        <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-[60vh] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                            <img
                                loading="lazy"
                                decoding="async"
                                src={apiUrl(activeItem.image)}
                                alt={activeItem.title}
                                className="max-w-full max-h-full object-contain select-none"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1000&q=80';
                                }}
                            />

                            {/* Prev Navigation Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(prev => (prev > 0 ? prev - 1 : galleryItems.length - 1));
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 press-y w-12 h-12 bg-white/90 hover:bg-sky-500 hover:text-slate-950 text-slate-900 border-2 border-slate-900 shadow-brutal-3 flex items-center justify-center text-xl font-black cursor-pointer"
                                aria-label="Previous Photo"
                            >
                                <span aria-hidden="true">←</span>
                            </button>

                            {/* Next Navigation Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(prev => (prev < galleryItems.length - 1 ? prev + 1 : 0));
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 press-y w-12 h-12 bg-white/90 hover:bg-sky-500 hover:text-slate-950 text-slate-900 border-2 border-slate-900 shadow-brutal-3 flex items-center justify-center text-xl font-black cursor-pointer"
                                aria-label="Next Photo"
                            >
                                <span aria-hidden="true">→</span>
                            </button>
                        </div>

                        {/* Modal Footer Description */}
                        <div className="p-6 sm:p-8 bg-white border-t-3 border-slate-900">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-black text-xs uppercase">
                                        {activeItem.badge}
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-sky-100 border border-slate-900 font-mono font-black text-xs text-sky-700 uppercase">
                                        {activeItem.category}
                                    </span>
                                </div>

                                <div className="text-xs font-mono font-bold text-slate-500">
                                    <span className="inline-flex items-center gap-1"><Icon name="pin" className="w-3 h-3" />{activeItem.location}</span> • <span>{activeItem.date}</span>
                                </div>
                            </div>

                            <h3 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 mb-2">
                                {activeItem.title}
                            </h3>

                            <p className="text-sm sm:text-base text-slate-700 font-bold leading-relaxed">
                                {activeItem.description}
                            </p>

                            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
                                <span>USE ARROW KEYS (← / →) TO NAVIGATE • [ESC] TO CLOSE</span>
                                <button
                                    onClick={() => setLightboxIndex(null)}
                                    className="press press-flat text-slate-900 font-black hover:text-sky-700 cursor-pointer"
                                >
                                    CLOSE VIEWER ✕
                                </button>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}

        </section>
    );
}
