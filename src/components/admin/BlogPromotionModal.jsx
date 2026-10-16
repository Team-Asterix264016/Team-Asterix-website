import { useEffect, useRef, useState } from 'react';
import { renderBlogPromo, generateSocialAdCopy } from '../../lib/blogPromoImage';

export default function BlogPromotionModal({ post, onClose }) {
    const canvasRef = useRef(null);
    const [format, setFormat] = useState('story'); // 'story' | 'portrait' | 'square'
    const [theme, setTheme] = useState('sky'); // 'sky' | 'dark'
    const [ctaText, setCtaText] = useState('LINK IN BIO TO READ');
    const [copiedKey, setCopiedKey] = useState(null);
    const [rendering, setRendering] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://asterix.psgitech.ac.in';
    const adCopy = generateSocialAdCopy(post, siteOrigin);

    useEffect(() => {
        let active = true;
        setRendering(true);
        if (canvasRef.current) {
            renderBlogPromo(canvasRef.current, post, format, {
                theme,
                callToAction: ctaText,
                siteOrigin
            }).finally(() => {
                if (active) setRendering(false);
            });
        }
        return () => {
            active = false;
        };
    }, [post, format, theme, ctaText, siteOrigin]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setDownloading(true);
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const cleanSlug = post.slug || 'post';
            link.download = `asterix-promo-${cleanSlug}-${format}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('Failed to export image: ' + err.message);
        } finally {
            setDownloading(false);
        }
    };

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2500);
        });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm"
        >
            <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col border-4 border-slate-900 bg-white shadow-[12px_12px_0px_#0f172a] sm:overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b-4 border-slate-900 bg-sky-500 px-5 py-3.5 text-slate-950">
                    <div className="flex items-center gap-2.5">
                        <span className="border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#0f172a]">
                            INSTAGRAM KIT
                        </span>
                        <h3 id="promo-modal-title" className="font-mono text-sm font-black tracking-tight uppercase sm:text-base">
                            Social Media & Ad Studio
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="press flex h-8 w-8 cursor-pointer items-center justify-center border-2 border-slate-900 bg-white font-mono text-base font-black text-slate-950 hover:bg-rose-400"
                        title="Close window"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
                    {/* Left Column: Visual Poster Preview & Download */}
                    <div className="flex flex-col items-center justify-between border-b-4 border-slate-900 bg-slate-100 p-4 sm:p-6 lg:col-span-6 lg:border-r-4 lg:border-b-0">
                        {/* Format & Theme Switchers */}
                        <div className="w-full space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-xs font-black uppercase text-slate-700">
                                    Canvas Format:
                                </span>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                    {[
                                        { id: 'story', label: 'Story (9:16)' },
                                        { id: 'portrait', label: 'Feed (4:5)' },
                                        { id: 'square', label: 'Square (1:1)' }
                                    ].map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setFormat(f.id)}
                                            className={`press cursor-pointer border-2 border-slate-900 px-2.5 py-1 uppercase ${
                                                format === f.id
                                                    ? 'bg-sky-400 font-black text-slate-950 shadow-[2px_2px_0px_#0f172a]'
                                                    : 'bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-xs font-black uppercase text-slate-700">
                                    Theme Style:
                                </span>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setTheme('sky')}
                                        className={`press cursor-pointer border-2 border-slate-900 px-3 py-1 uppercase ${
                                            theme === 'sky'
                                                ? 'bg-amber-300 font-black text-slate-950 shadow-[2px_2px_0px_#0f172a]'
                                                : 'bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        Light Track
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`press cursor-pointer border-2 border-slate-900 px-3 py-1 uppercase ${
                                            theme === 'dark'
                                                ? 'bg-slate-900 font-black text-sky-400 shadow-[2px_2px_0px_#38bdf8]'
                                                : 'bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        Cyber Dark
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Canvas Rendering Area */}
                        <div className="my-5 flex w-full flex-1 items-center justify-center overflow-hidden">
                            <div className="relative max-h-[460px] max-w-[280px] sm:max-h-[520px] sm:max-w-[320px] shadow-[8px_8px_0px_#0f172a] border-3 border-slate-900 bg-white">
                                <canvas
                                    ref={canvasRef}
                                    className="block h-auto max-h-[500px] w-auto max-w-full object-contain"
                                />
                                {rendering && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 font-mono text-xs font-black text-slate-900 backdrop-blur-xs">
                                        Generating Graphic…
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Direct Download Button */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={rendering || downloading}
                            className="press shadow-[4px_4px_0px_#0f172a] flex w-full cursor-pointer items-center justify-center gap-2 border-3 border-slate-900 bg-emerald-400 py-3 font-mono text-xs font-black uppercase text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                        >
                            <span>📥 Download High-Res Photo (PNG)</span>
                        </button>
                    </div>

                    {/* Right Column: Advertisement Copy, Captions & Link Bio tools */}
                    <div className="flex flex-col space-y-5 p-4 sm:p-6 lg:col-span-6">
                        <div>
                            <span className="border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                                CAMPAIGN COPY
                            </span>
                            <h4 className="mt-2 text-lg font-black uppercase text-slate-900">
                                Instagram Post & Story Ads
                            </h4>
                            <p className="mt-0.5 font-mono text-xs text-slate-600">
                                Ready-to-paste promotional copy with hashtags and links for Instagram, LinkedIn, and WhatsApp.
                            </p>
                        </div>

                        {/* Custom CTA Input */}
                        <div className="border-2 border-slate-900 bg-sky-50 p-3">
                            <label className="block font-mono text-[10px] font-black uppercase text-slate-700">
                                Banner Call-To-Action Text
                            </label>
                            <input
                                type="text"
                                value={ctaText}
                                onChange={(e) => setCtaText(e.target.value.toUpperCase())}
                                placeholder="LINK IN BIO TO READ"
                                className="mt-1 h-9 w-full border-2 border-slate-900 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:outline-none"
                            />
                        </div>

                        {/* Ad Copy Box 1: Short / Story Caption */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black uppercase text-slate-800">
                                    1. Story Caption / Quick Reel Ad
                                </span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(adCopy.shortAd, 'short')}
                                    className="press cursor-pointer border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100"
                                >
                                    {copiedKey === 'short' ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                            <textarea
                                readOnly
                                rows={4}
                                value={adCopy.shortAd}
                                className="w-full resize-none border-2 border-slate-900 bg-slate-50 p-2.5 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none"
                            />
                        </div>

                        {/* Ad Copy Box 2: Detailed Feed Caption */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black uppercase text-slate-800">
                                    2. Full Feed Caption + Hashtags
                                </span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(adCopy.detailedAd, 'detailed')}
                                    className="press cursor-pointer border-2 border-slate-900 bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase hover:bg-sky-100"
                                >
                                    {copiedKey === 'detailed' ? '✓ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                            <textarea
                                readOnly
                                rows={6}
                                value={adCopy.detailedAd}
                                className="w-full resize-none border-2 border-slate-900 bg-slate-50 p-2.5 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none"
                            />
                        </div>

                        {/* Share URL Row */}
                        <div className="mt-auto border-2 border-slate-900 bg-slate-900 p-3 text-white">
                            <span className="block font-mono text-[10px] font-black uppercase text-sky-400">
                                Direct Article Link (For Bio / Story Link Sticker):
                            </span>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="truncate font-mono text-xs font-bold text-slate-200">
                                    {adCopy.postUrl}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(adCopy.postUrl, 'url')}
                                    className="press shrink-0 cursor-pointer border-2 border-white bg-sky-400 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-slate-950 hover:bg-sky-300"
                                >
                                    {copiedKey === 'url' ? '✓ Copied' : 'Copy Link'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
