import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DriftWall from './DriftWall';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { useIsNarrow } from '../hooks/useMediaQuery';
import { apiUrl } from '../lib/api';
import { framingStyle } from '../lib/imageFraming';
import Icon from './Icon';

export default function TeamGallery() {
    const { siteData } = useWebsiteData();
    const [lightboxIndex, setLightboxIndex] = useState(null);

    // Re-lays-out on resize rather than keeping whatever breakpoint happened to
    // be true on first paint.
    const isNarrow = useIsNarrow();

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
            category: g.category || 'PADDOCK & TRACK',
            location: g.location || 'Asterix Mobility Proving Grounds',
            date: g.year || '2026',
            image: apiUrl(g.src),
            badge: g.category || 'GALLERY',
            description: g.desc || '',
            // Crop chosen in the admin against a preview of this exact tile.
            fit: g.fit,
            position: g.position
        }));
    }, [siteData.gallery]);

    // Multiplied list to provide a continuous, fluid drifting wall across columns
    const driftItems = useMemo(() => {
        return [...galleryItems, ...galleryItems, ...galleryItems];
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
        const foundIdx = galleryItems.findIndex((g) => g.id === item.id);
        setLightboxIndex(foundIdx !== -1 ? foundIdx : 0);
    };

    const [viewMode, setViewMode] = useState('wall'); // 'wall' | 'grid'

    return (
        <section
            id="gallery"
            className="relative z-10 overflow-hidden border-t-4 border-slate-900 bg-white px-4 py-16 select-none sm:px-8 sm:py-28"
        >
            {/* Background Parallax Watermark (Option A: Slow layer) */}
            <div
                data-parallax="slow"
                className="pointer-events-none absolute top-10 right-4 z-0 font-mono text-[7rem] leading-none font-black text-slate-900/[0.025] will-change-transform select-none sm:right-10 sm:text-[12rem] md:text-[14rem]"
                aria-hidden="true"
            >
                // 03 ARCHIVE
            </div>

            {/* Floating Kinetic Decal (Option D) */}
            <div
                data-parallax="sticker"
                data-parallax-rotate="-7"
                className="shadow-brutal-5 pointer-events-none absolute top-14 left-6 z-20 hidden rounded-lg border-3 border-slate-900 bg-emerald-300 px-3 py-1.5 font-mono text-[11px] font-black tracking-wider text-slate-950 uppercase will-change-transform sm:left-12 lg:flex"
            >
                <span>● PADDOCK ARCHIVE</span>
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">
                {/* Section Header */}
                <div
                    data-assemble="header"
                    className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"
                >
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-6xl leading-none font-black text-slate-900 uppercase sm:text-7xl md:text-8xl">
                                OUR
                            </h2>
                            <h2
                                data-parallax="fast"
                                data-parallax-speed="0.18"
                                className="text-stroke-black text-6xl leading-none font-black text-transparent uppercase will-change-transform sm:text-7xl md:text-8xl"
                            >
                                GALLERY
                            </h2>
                            <span
                                data-parallax="sticker"
                                data-parallax-rotate="4"
                                className="shadow-brutal-2 border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase will-change-transform"
                            >
                                ★ {galleryItems.length} ARCHIVE PHOTOS
                            </span>
                        </div>
                        <p className="mt-3 max-w-xl text-sm font-bold text-slate-600 sm:text-base">
                            Moments from our workshop fabrication, autonomous sensor calibration, proving
                            trials, and race day celebrations. Click any photo to inspect.
                        </p>
                    </div>

                    {/* View Mode Switcher */}
                    <div className="shadow-brutal-3 flex items-center gap-2 border-2 border-slate-900 bg-slate-100 p-1.5">
                        <button
                            onClick={() => setViewMode('wall')}
                            className={`press tap cursor-pointer border border-slate-900 px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                                viewMode === 'wall'
                                    ? 'shadow-brutal-2 bg-sky-500 text-slate-950'
                                    : 'bg-white text-slate-900 hover:bg-sky-100'
                            }`}
                        >
                            3D Drift Wall
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`press tap cursor-pointer border border-slate-900 px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                                viewMode === 'grid'
                                    ? 'shadow-brutal-2 bg-sky-500 text-slate-950'
                                    : 'bg-white text-slate-900 hover:bg-sky-100'
                            }`}
                        >
                            Grid Gallery ({galleryItems.length})
                        </button>
                    </div>
                </div>

                {/* 3D DriftWall or High-Density Grid Gallery Stage */}
                {viewMode === 'wall' ? (
                    <div
                        data-assemble="card"
                        className="shadow-brutal-10 relative h-[420px] w-full overflow-hidden border-4 border-slate-900 bg-sky-50/40 sm:h-[620px] md:h-[680px]"
                    >
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
                            className="h-full w-full"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {galleryItems.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                onClick={() => setLightboxIndex(idx)}
                                className="press group shadow-brutal-5 hover:shadow-brutal-8-brand relative flex cursor-pointer flex-col justify-between overflow-hidden border-3 border-slate-900 bg-white hover:translate-x-[-2px] hover:translate-y-[-2px]"
                            >
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                                    <img
                                        loading="lazy"
                                        decoding="async"
                                        src={apiUrl(item.image)}
                                        alt={item.title}
                                        style={framingStyle(item.fit, item.position)}
                                        className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src =
                                                'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80';
                                        }}
                                    />
                                    <span className="absolute top-2 left-2 border border-white/20 bg-slate-900/90 px-2 py-0.5 font-mono text-[9px] font-black text-white uppercase">
                                        {item.badge}
                                    </span>
                                </div>
                                <div className="flex flex-1 flex-col justify-between border-t-2 border-slate-900 bg-white p-3">
                                    <h3 className="line-clamp-1 text-sm font-black text-slate-900 uppercase transition-colors group-hover:text-sky-700">
                                        {item.title}
                                    </h3>
                                    <span className="mt-1 block font-mono text-[10px] font-bold text-slate-500">
                                        {item.location} • {item.date}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Modal (Detailed High-Res Photo View with Keyboard & Click Navigation) */}
            {activeItem &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="anim-fade fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm sm:p-8"
                        onClick={() => setLightboxIndex(null)}
                        data-lenis-prevent
                    >
                        <div
                            className="anim-pop-center shadow-brutal-12-brand relative flex w-full max-w-5xl flex-col overflow-hidden border-4 border-slate-900 bg-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header Bar */}
                            <div className="flex items-center justify-between border-b-3 border-slate-900 bg-slate-900 px-5 py-3 font-mono text-xs font-black text-white">
                                <div className="flex items-center gap-3">
                                    <span className="status-dot h-2.5 w-2.5 rounded-full bg-sky-400 text-sky-400" />
                                    <span className="tracking-wider uppercase">
                                        TEAM ASTERIX ARCHIVE • {pad(lightboxIndex + 1)} OF{' '}
                                        {pad(galleryItems.length)}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setLightboxIndex(null)}
                                    className="press press-flat flex h-8 w-8 cursor-pointer items-center justify-center border-2 border-white bg-rose-500 font-sans text-base font-bold text-white hover:bg-rose-600"
                                    aria-label="Close Lightbox"
                                >
                                    <span aria-hidden="true">✕</span>
                                </button>
                            </div>

                            {/* Image Viewer Frame */}
                            <div className="relative flex aspect-[16/10] max-h-[60dvh] w-full items-center justify-center overflow-hidden bg-slate-950 sm:aspect-[16/9]">
                                <img
                                    loading="lazy"
                                    decoding="async"
                                    src={apiUrl(activeItem.image)}
                                    alt={activeItem.title}
                                    className="max-h-full max-w-full object-contain select-none"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src =
                                            'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1000&q=80';
                                    }}
                                />

                                {/* Prev Navigation Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex((prev) =>
                                            prev > 0 ? prev - 1 : galleryItems.length - 1
                                        );
                                    }}
                                    className="press-y shadow-brutal-3 absolute top-1/2 left-4 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center border-2 border-slate-900 bg-white/90 text-xl font-black text-slate-900 hover:bg-sky-500 hover:text-slate-950"
                                    aria-label="Previous Photo"
                                >
                                    <span aria-hidden="true">←</span>
                                </button>

                                {/* Next Navigation Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex((prev) =>
                                            prev < galleryItems.length - 1 ? prev + 1 : 0
                                        );
                                    }}
                                    className="press-y shadow-brutal-3 absolute top-1/2 right-4 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center border-2 border-slate-900 bg-white/90 text-xl font-black text-slate-900 hover:bg-sky-500 hover:text-slate-950"
                                    aria-label="Next Photo"
                                >
                                    <span aria-hidden="true">→</span>
                                </button>
                            </div>

                            {/* Modal Footer Description */}
                            <div className="border-t-3 border-slate-900 bg-white p-6 sm:p-8">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-black text-white uppercase">
                                            {activeItem.badge}
                                        </span>
                                        <span className="border border-slate-900 bg-sky-100 px-2.5 py-0.5 font-mono text-xs font-black text-sky-700 uppercase">
                                            {activeItem.category}
                                        </span>
                                    </div>

                                    <div className="font-mono text-xs font-bold text-slate-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Icon name="pin" className="h-3 w-3" />
                                            {activeItem.location}
                                        </span>{' '}
                                        • <span>{activeItem.date}</span>
                                    </div>
                                </div>

                                <h3 className="mb-2 text-2xl font-black text-slate-900 uppercase sm:text-3xl">
                                    {activeItem.title}
                                </h3>

                                <p className="text-sm leading-relaxed font-bold text-slate-700 sm:text-base">
                                    {activeItem.description}
                                </p>

                                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 font-mono text-xs text-slate-500">
                                    <span>USE ARROW KEYS (← / →) TO NAVIGATE • [ESC] TO CLOSE</span>
                                    <button
                                        onClick={() => setLightboxIndex(null)}
                                        className="press press-flat cursor-pointer font-black text-slate-900 hover:text-sky-700"
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
