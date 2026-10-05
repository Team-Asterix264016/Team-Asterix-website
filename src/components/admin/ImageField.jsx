import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../lib/api';
import {
    DEFAULT_FIT,
    DEFAULT_POSITION,
    FRAME_PRESETS,
    formatPosition,
    framingStyle,
    normalizeFit,
    parsePosition
} from '../../lib/imageFraming';

/**
 * The admin's picture control: upload, and fix the crop when it needs fixing.
 *
 * Resting state is one row -- a thumbnail, the URL, and the buttons. The
 * thumbnail is drawn with the record's own framing, so the cropped result is
 * visible at a glance without any of the crop machinery being on screen. With
 * the focal stage and the frame previews permanently expanded, a roster of a
 * dozen members became several screens of image editor and pushed the name,
 * role and bio fields out of reach.
 *
 * "Adjust crop" opens the rest: the whole picture with its focal point marked,
 * a fill/fit toggle, and a strip of previews at the real ratios the site uses.
 * That answers the thing a 56px square never could -- what a portrait actually
 * looks like once a phone card has cropped it.
 */

const PRESET_POSITIONS = [
    { label: 'Face', value: '50% 20%' },
    { label: 'Centre', value: '50% 50%' },
    { label: 'Lower', value: '50% 75%' }
];

/** Every preview is this tall; its aspect ratio gives it its width. */
const PREVIEW_H = 54;

export default function ImageField({
    label = 'Image',
    value = '',
    fit = DEFAULT_FIT,
    position = DEFAULT_POSITION,
    onChange,
    onUpload,
    folder = '/asterix',
    frames = 'member',
}) {
    const framePresets = Array.isArray(frames) ? frames : (FRAME_PRESETS[frames] || FRAME_PRESETS.member);
    const resolved = apiUrl(value);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showCrop, setShowCrop] = useState(false);
    /* The URL that failed to load, rather than a boolean. A boolean needed an
       effect to clear it whenever the URL changed, which meant a replaced photo
       rendered once as broken before the reset landed. */
    const [failedUrl, setFailedUrl] = useState(null);
    const failed = Boolean(resolved) && failedUrl === resolved;
    const stageRef = useRef(null);

    const patch = (fields) => onChange?.(fields);

    const handleFileChange = async (e) => {
        if (!e.target.files?.[0] || !onUpload) return;
        setIsUploading(true);
        try {
            await onUpload(e, (url) => patch({ url }), folder);
        } catch (err) {
            console.error('Upload error in ImageField:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const pointToPosition = useCallback((clientX, clientY) => {
        const node = stageRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        patch({ position: formatPosition(x, y) });
    }, [onChange]); // eslint-disable-line react-hooks/exhaustive-deps

    /* Dragging is tracked on the window rather than on the image so the focal
       point keeps following a pointer that leaves the preview mid-drag, which is
       the normal way of pushing a crop right to an edge. */
    useEffect(() => {
        if (!isDragging) return undefined;
        const move = (e) => {
            e.preventDefault();
            pointToPosition(e.clientX, e.clientY);
        };
        const stop = () => setIsDragging(false);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
        };
    }, [isDragging, pointToPosition]);

    const focal = parsePosition(position);
    const style = framingStyle(fit, position);
    const hasImage = Boolean(resolved) && !failed;

    const nudge = (dx, dy) => patch({ position: formatPosition(focal.x + dx, focal.y + dy) });

    const miniBtn = 'press press-flat px-2 py-1 border-2 border-slate-900 font-mono text-[10px] font-black uppercase cursor-pointer';

    return (
        <div className="bg-white border-2 border-slate-900 p-2.5 space-y-2">

            {/* Resting row: photo preview, label, and action controls */}
            <div className="flex items-center gap-3">
                <div className="w-14 h-14 shrink-0 border-2 border-slate-900 bg-slate-100 overflow-hidden relative">
                    {isUploading ? (
                        <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center text-white z-10 p-0.5">
                            <svg className="animate-spin h-4 w-4 text-sky-400 mb-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="font-mono text-[7px] font-black text-sky-300 uppercase leading-none">Saving...</span>
                        </div>
                    ) : hasImage ? (
                        <img
                            loading="lazy"
                            decoding="async"
                            src={resolved}
                            alt=""
                            style={style}
                            onError={() => setFailedUrl(resolved)}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="w-full h-full flex items-center justify-center text-center font-mono text-[8px] font-black uppercase leading-tight text-slate-600">
                            {failed ? 'Bad link' : 'No photo'}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <span className="block text-[11px] font-mono font-black uppercase tracking-wider text-slate-800 truncate">
                        {label}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <label className={`${miniBtn} ${isUploading ? 'opacity-50 pointer-events-none' : ''} bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1`}>
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin h-3 w-3 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>{value ? 'Replace' : 'Upload'}</span>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                disabled={isUploading}
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>

                        {hasImage && !isUploading && (
                            <button
                                type="button"
                                onClick={() => setShowCrop((v) => !v)}
                                aria-expanded={showCrop}
                                className={`${miniBtn} ${showCrop ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-slate-100 text-slate-900'}`}
                            >
                                {showCrop ? 'Done ▲' : 'Adjust crop ▼'}
                            </button>
                        )}

                        {value && !isUploading && (
                            <button
                                type="button"
                                onClick={() => patch({ url: '' })}
                                className={`${miniBtn} bg-rose-50 hover:bg-rose-100 text-rose-700`}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {hasImage && showCrop && (
                <div className="space-y-2 pt-2 border-t-2 border-slate-200">

                    {/* The whole picture, uncropped, with the focal point marked. */}
                    <div
                        ref={stageRef}
                        onPointerDown={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                            pointToPosition(e.clientX, e.clientY);
                        }}
                        className="relative w-full max-h-44 bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:12px_12px] border-2 border-slate-900 overflow-hidden cursor-crosshair touch-none select-none"
                    >
                        <img
                            loading="lazy"
                            decoding="async"
                            src={resolved}
                            alt="Uploaded original"
                            draggable={false}
                            onError={() => setFailedUrl(resolved)}
                            className="block w-full max-h-44 object-contain pointer-events-none"
                        />
                        <span
                            aria-hidden="true"
                            className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white bg-sky-500/70 shadow-[0_0_0_2px_#0f172a] pointer-events-none"
                            style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
                        />
                    </div>

                    <p className="font-mono text-[9px] font-bold text-slate-500 leading-relaxed">
                        Drag to choose what stays in shot when a frame has to crop.
                    </p>

                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={() => patch({ fit: 'cover' })}
                            className={`${miniBtn} ${normalizeFit(fit) === 'cover' ? 'bg-sky-500 text-slate-950' : 'bg-white text-slate-900'}`}
                        >
                            Fill
                        </button>
                        <button
                            type="button"
                            onClick={() => patch({ fit: 'contain' })}
                            title="Never crops. The whole picture is shown and the frame is letterboxed."
                            className={`${miniBtn} ${normalizeFit(fit) === 'contain' ? 'bg-sky-500 text-slate-950' : 'bg-white text-slate-900'}`}
                        >
                            Fit whole
                        </button>
                        <span className="w-px h-5 bg-slate-300 mx-0.5" aria-hidden="true" />
                        {PRESET_POSITIONS.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                onClick={() => patch({ position: p.value })}
                                className={`${miniBtn} ${
                                    formatPosition(focal.x, focal.y) === p.value
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white text-slate-900'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        {[['←', -4, 0], ['→', 4, 0], ['↑', 0, -4], ['↓', 0, 4]].map(([sym, dx, dy]) => (
                            <button
                                key={sym}
                                type="button"
                                onClick={() => nudge(dx, dy)}
                                aria-label={`Nudge focal point ${sym}`}
                                className="press press-flat w-6 h-6 bg-white hover:bg-slate-100 border-2 border-slate-900 font-mono text-[10px] font-black cursor-pointer"
                            >
                                {sym}
                            </button>
                        ))}
                    </div>

                    {/* The real frames, at a size that stays out of the way. */}
                    <div className="flex flex-wrap items-end gap-2 pt-1">
                        {framePresets.map((frame) => (
                            <div key={frame.id}>
                                <div
                                    className="border-2 border-slate-900 bg-slate-950 overflow-hidden"
                                    style={{ height: PREVIEW_H, aspectRatio: frame.ratio }}
                                >
                                    <img
                                        loading="lazy"
                                        decoding="async"
                                        src={resolved}
                                        alt={`${frame.label} preview`}
                                        draggable={false}
                                        className="w-full h-full"
                                        style={style}
                                    />
                                </div>
                                <span className="block mt-0.5 font-mono text-[8px] font-black uppercase text-slate-500">
                                    {frame.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
