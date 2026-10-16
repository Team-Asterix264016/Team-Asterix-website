import { useEffect, useRef, useState } from 'react';
import { renderBlogPromo, generateSocialAdCopy } from '../../lib/blogPromoImage';
import { PiCheck, PiCopy, PiDownloadSimple, PiShareNetwork, PiWhatsappLogo, PiLinkedinLogo, PiXLogo } from 'react-icons/pi';

export default function BlogPostShareModal({ post, onClose }) {
    const canvasRef = useRef(null);
    const [format, setFormat] = useState('portrait'); // 'portrait' | 'story' | 'square'
    const [rendering, setRendering] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedCaption, setCopiedCaption] = useState(false);

    const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://asterix-website.vercel.app';
    const adCopy = generateSocialAdCopy(post, siteOrigin);

    useEffect(() => {
        let active = true;
        setRendering(true);
        if (canvasRef.current) {
            renderBlogPromo(canvasRef.current, post, format, {
                siteOrigin,
                callToAction: 'READ ON ASTERIX BLOGS — HORIZON →'
            }).finally(() => {
                if (active) setRendering(false);
            });
        }
        return () => {
            active = false;
        };
    }, [post, format, siteOrigin]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setDownloading(true);
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const cleanSlug = post.slug || 'post';
            link.download = `horizon-${cleanSlug}-${format}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('Failed to export flyer: ' + err.message);
        } finally {
            setDownloading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(adCopy.postUrl).then(() => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2500);
        });
    };

    const copyCaption = () => {
        navigator.clipboard.writeText(adCopy.shortAd).then(() => {
            setCopiedCaption(true);
            setTimeout(() => setCopiedCaption(false), 2500);
        });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-preview-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm"
        >
            <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col border-4 border-black bg-white shadow-[12px_12px_0px_#000] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b-4 border-black bg-[#ffe500] px-5 py-3 text-black">
                    <div className="flex items-center gap-2.5">
                        <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_#000]">
                            HORIZON DISPATCH
                        </span>
                        <h3 id="share-preview-title" className="font-mono text-sm font-black tracking-tight uppercase sm:text-base">
                            Share Preview & Flyer Studio
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="press flex h-8 w-8 cursor-pointer items-center justify-center border-2 border-black bg-white font-mono text-base font-black text-black hover:bg-rose-400"
                        title="Close window"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
                    {/* Left: Flyer Preview */}
                    <div className="flex flex-col items-center justify-between border-b-4 border-black bg-[#f2eee5] p-4 sm:p-6 lg:col-span-7 lg:border-r-4 lg:border-b-0">
                        {/* Format selector */}
                        <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-black uppercase text-slate-800">
                                Flyer Format:
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                                {[
                                    { id: 'portrait', label: 'Flyer (4:5)', desc: '1080 × 1350 px' },
                                    { id: 'story', label: 'Story (9:16)', desc: '1080 × 1920 px' },
                                    { id: 'square', label: 'Square (1:1)', desc: '1080 × 1080 px' }
                               ].map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setFormat(f.id)}
                                        className={`press cursor-pointer border-2 border-black px-3 py-1 uppercase ${
                                            format === f.id
                                                ? 'bg-[#ffe500] font-black text-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-white text-slate-800 hover:bg-slate-100'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Live Canvas Viewport */}
                        <div className="relative flex w-full max-w-[480px] items-center justify-center overflow-hidden border-3 border-black bg-white p-2 shadow-[6px_6px_0px_#000]">
                            {rendering && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-xs font-mono text-xs font-black text-black">
                                    RENDERING FLYER…
                                </div>
                            )}
                            <canvas
                                ref={canvasRef}
                                className="h-auto max-h-[58vh] w-full object-contain"
                            />
                        </div>

                        {/* Download CTA under preview */}
                        <div className="mt-4 flex w-full max-w-[480px] gap-2">
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="press flex flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-black bg-[#ffe500] py-2.5 font-mono text-xs font-black text-black uppercase shadow-[3px_3px_0px_#000] hover:bg-yellow-400 disabled:opacity-50"
                            >
                                <PiDownloadSimple className="h-4 w-4" />
                                <span>{downloading ? 'Exporting…' : 'Download Flyer Image'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={copyLink}
                                className="press flex cursor-pointer items-center justify-center gap-1.5 border-2 border-black bg-white px-4 py-2.5 font-mono text-xs font-black text-black uppercase shadow-[3px_3px_0px_#000] hover:bg-slate-100"
                            >
                                {copiedLink ? <PiCheck className="h-4 w-4 text-emerald-600" /> : <PiCopy className="h-4 w-4" />}
                                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Social Sharing & Ad Copy */}
                    <div className="flex flex-col justify-between bg-white p-5 sm:p-6 lg:col-span-5 space-y-6">
                        <div>
                            <span className="font-mono text-xs font-black uppercase text-slate-800">
                                Direct Social Channels
                            </span>
                            <div className="mt-2.5 grid grid-cols-3 gap-2">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Check out "${post.title}" on Horizon: ${adCopy.postUrl}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="press flex flex-col items-center justify-center gap-1 border-2 border-black bg-emerald-50 py-3 text-emerald-950 shadow-[2px_2px_0px_#000] hover:bg-emerald-100 no-underline"
                                >
                                    <PiWhatsappLogo className="h-6 w-6 text-emerald-700" />
                                    <span className="font-mono text-[11px] font-bold">WhatsApp</span>
                                </a>
                                <a
                                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(adCopy.postUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="press flex flex-col items-center justify-center gap-1 border-2 border-black bg-sky-50 py-3 text-sky-950 shadow-[2px_2px_0px_#000] hover:bg-sky-100 no-underline"
                                >
                                    <PiLinkedinLogo className="h-6 w-6 text-sky-700" />
                                    <span className="font-mono text-[11px] font-bold">LinkedIn</span>
                                </a>
                                <a
                                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(`"${post.title}" via @asterix_itech: `)}&url=${encodeURIComponent(adCopy.postUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="press flex flex-col items-center justify-center gap-1 border-2 border-black bg-slate-50 py-3 text-slate-950 shadow-[2px_2px_0px_#000] hover:bg-slate-100 no-underline"
                                >
                                    <PiXLogo className="h-6 w-6 text-slate-900" />
                                    <span className="font-mono text-[11px] font-bold">X (Twitter)</span>
                                </a>
                            </div>

                            {/* Ready Instagram Post Caption */}
                            <div className="mt-6">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs font-black uppercase text-slate-800">
                                        Instagram / Social Caption
                                    </span>
                                    <button
                                        type="button"
                                        onClick={copyCaption}
                                        className="press font-mono text-[11px] font-bold text-sky-700 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        {copiedCaption ? <PiCheck className="h-3.5 w-3.5 text-emerald-600" /> : <PiCopy className="h-3.5 w-3.5" />}
                                        <span>{copiedCaption ? 'Copied' : 'Copy Caption'}</span>
                                    </button>
                                </div>
                                <div className="mt-2 border-2 border-black bg-slate-50 p-3 font-mono text-xs text-slate-800 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                                    {adCopy.shortAd}
                                </div>
                            </div>
                        </div>

                        {/* Article Details Info Box */}
                        <div className="border-2 border-black bg-[#ffe500]/20 p-3.5 font-mono text-xs text-slate-900">
                            <p className="font-black uppercase">// READY TO POST //</p>
                            <p className="mt-1 text-slate-700">
                                Download this high-resolution flyer to post directly on Instagram stories, feed carousel, or status updates.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
