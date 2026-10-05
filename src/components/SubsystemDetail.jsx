import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { apiUrl } from '../lib/api';
import { memberFramingStyle } from '../lib/imageFraming';
import { downloadBadge } from '../lib/badgeImage';
import Icon from './Icon';

export default function SubsystemDetail({ subsystemId, onBack, onSelectSubsystem }) {
    const { siteData } = useWebsiteData();
    const subsystems = siteData.subsystems;
    const currentSystem = subsystems.find(s => s.id === subsystemId) || subsystems[0];
    const currentIndex = subsystems.findIndex(s => s.id === currentSystem.id);
    const nextSystem = subsystems[(currentIndex + 1) % subsystems.length];
    const prevSystem = subsystems[(currentIndex - 1 + subsystems.length) % subsystems.length];

    /* The card frame has to crop to keep the grid even. This is the escape
       hatch: the original picture, whole, at whatever aspect it was shot in. */
    const [portrait, setPortrait] = useState(null);
    /* Which member's badge is currently rendering, and the last error if one
       failed. Rendering is fast but not instant -- it waits on webfonts and on
       the photo -- so the button has to say something while it works.

       Tracked by roster index rather than by name: two people on a subsystem
       can share a first-and-last name, and keying on the name put both their
       buttons into the busy state at once. */
    const [badgeBusy, setBadgeBusy] = useState(null);
    const [badgeError, setBadgeError] = useState('');

    /* Switching subsystem has to drop whatever portrait is open, or the modal
       outlives the page it belongs to. Done in the handler rather than in an
       effect on `subsystemId`, so there is no render where the two disagree. */
    const selectSubsystem = (id) => {
        setPortrait(null);
        setBadgeError('');
        // An index means nothing once the roster under it changes, so a render
        // still in flight must not leave a button on the new page marked busy.
        setBadgeBusy(null);
        onSelectSubsystem(id);
    };

    const saveBadge = async (member, index) => {
        setBadgeError('');
        setBadgeBusy(index);
        try {
            await downloadBadge(member, currentSystem);
        } catch (err) {
            setBadgeError(`${member.name}: ${err.message}`);
        } finally {
            setBadgeBusy(null);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
        }
    }, [subsystemId]);


    useEffect(() => {
        if (!portrait) return undefined;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.lenis?.stop();
        const onKey = (e) => { if (e.key === 'Escape') setPortrait(null); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.lenis?.start();
            window.removeEventListener('keydown', onKey);
        };
    }, [portrait]);

    return (
        <div className="min-h-screen bg-white text-slate-900 pt-28 pb-20 px-4 sm:px-8 relative z-30 selection:bg-sky-500 selection:text-white">
            <div className="max-w-6xl mx-auto">

                {/* Top Navigation & Back Button */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="press press-flat cyber-button-white px-6 py-3 text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                        <span>← Back to Overview</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => selectSubsystem(prevSystem.id)}
                            className="press px-4 py-2 border-2 border-slate-900 bg-white font-bold text-xs shadow-brutal-2 hover:bg-sky-100 transition-colors cursor-pointer"
                        >
                            ← Prev Spec
                        </button>
                        <span className="font-mono font-black text-xs px-3 py-1 bg-slate-900 text-white">
                            0{currentIndex + 1} / 0{subsystems.length}
                        </span>
                        <button
                            onClick={() => selectSubsystem(nextSystem.id)}
                            className="press px-4 py-2 border-2 border-slate-900 bg-white font-bold text-xs shadow-brutal-2 hover:bg-sky-100 transition-colors cursor-pointer"
                        >
                            Next Spec →
                        </button>
                    </div>
                </div>

                {/* Main Subsystem Hero Card */}
                <div className="bg-white border-4 border-slate-900 shadow-brutal-10 p-6 sm:p-12 mb-12 relative overflow-hidden">
                    {/* Top Accent Color Strip */}
                    <div className={`h-4 -mx-6 sm:-mx-12 -mt-6 sm:-mt-12 mb-8 ${currentSystem.color} border-b-4 border-slate-900`} />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 bg-slate-900 text-white font-mono font-black text-xs uppercase tracking-widest">
                                    {currentSystem.badge}
                                </span>
                                <span className="px-3 py-1 bg-sky-100 border border-slate-900 text-slate-900 font-mono font-black text-xs uppercase">
                                    {currentSystem.stat}
                                </span>
                            </div>

                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                {currentSystem.name}
                            </h1>
                            <p className="text-lg sm:text-xl font-bold text-sky-700 mt-2">
                                {currentSystem.tagline}
                            </p>
                        </div>

                        <div className="hidden lg:flex items-center justify-center w-24 h-24 bg-sky-50 border-3 border-slate-900 shadow-brutal-4 font-mono font-black text-3xl text-slate-900">
                            0{currentIndex + 1}
                        </div>
                    </div>

                    <p className="text-base sm:text-lg text-slate-700 font-bold leading-relaxed max-w-4xl">
                        {currentSystem.fullDesc}
                    </p>
                </div>

                {/* Subsystem Specifications & Highlights (Full Width Clean Layout) */}
                <div className="bg-white border-4 border-slate-900 shadow-brutal-10 p-6 sm:p-10 mb-16">
                    <div className="flex items-center justify-between mb-8 border-b-3 border-slate-900 pb-4">
                        <h3 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 tracking-tight">
                            TECHNICAL SPECIFICATIONS
                        </h3>
                    </div>

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono mb-8">
                        {(currentSystem.specifications || []).map((spec, idx) => (
                            <div key={idx} className="p-4 bg-sky-50 border-3 border-slate-900 shadow-brutal-4">
                                <span className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5 font-mono">
                                    {spec.label}
                                </span>
                                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight font-mono">
                                    {spec.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Key Engineering Highlights */}
                    <div className="pt-6 border-t-2 border-slate-200 mb-8">
                        <h4 className="text-sm font-black uppercase text-slate-900 mb-4 tracking-wider">
                            KEY ENGINEERING HIGHLIGHTS:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(currentSystem.highlights || []).map((highlight, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-slate-50 border-2 border-slate-900">
                                    <span className="text-sky-700 font-black text-base leading-none">✦</span>
                                    <span className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">{highlight}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mailing line for this subsystem. Rendered only when the admin
                        has set an address for it -- this used to be a fixed
                        contact@teamasterix.org button that reached nobody. */}
                    {currentSystem.contactEmail && (
                        <div className="pt-6 border-t-3 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sky-50/70 p-6 border-2 border-slate-900">
                            <p className="text-sm sm:text-base font-black text-slate-900 uppercase">
                                Have a question about {currentSystem.name}?
                            </p>
                            <a
                                href={`mailto:${currentSystem.contactEmail}`}
                                className="press press-flat cyber-button px-6 py-3 text-xs tracking-wider uppercase whitespace-nowrap inline-block self-start sm:self-auto cursor-pointer"
                            >
                                {currentSystem.contactEmail} →
                            </a>
                        </div>
                    )}
                </div>

                {/* Subsystem Team Members Section */}
                <div className="bg-white border-4 border-slate-900 shadow-brutal-10 p-6 sm:p-12 mb-16">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 border-b-3 border-slate-900 pb-4">
                        <div>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tight">
                                Members
                            </h2>
                        </div>
                        <span className="px-3 py-1 bg-sky-100 border-2 border-slate-900 font-mono font-black text-xs self-start sm:self-auto">
                            {(currentSystem.teamMembers || []).length} ENGINEERS ASSIGNED
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(currentSystem.teamMembers || []).map((member, idx) => (
                            <div
                                key={idx}
                                className="cyber-card p-5 flex flex-col justify-between bg-white group hover:translate-y-[-2px] transition-all"
                            >
                                <div>
                                    {/* Member Photo Frame.
                                        The frame used to be a fixed 224px tall box on every
                                        viewport, so a portrait shot on a phone was cropped
                                        hardest on the phone that took it. It is now a ratio
                                        that stays portrait at every width, honours the focal
                                        point chosen in the admin, and opens the uncropped
                                        original on tap. */}
                                    <button
                                        type="button"
                                        onClick={() => member.photo && setPortrait(member)}
                                        aria-label={member.photo ? `View the full portrait of ${member.name}` : undefined}
                                        disabled={!member.photo}
                                        className="w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden border-2 border-slate-900 bg-slate-100 relative mb-4 shadow-brutal-3 block p-0 disabled:cursor-default cursor-zoom-in"
                                    >
                                        {(() => {
                                            const photoUrl = apiUrl(member.photo);
                                            if (!photoUrl) {
                                                return (
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-sky-50 flex flex-col items-center justify-center p-4 text-center">
                                                        <div className="w-16 h-16 rounded-full bg-slate-900 text-white font-mono font-black text-xl flex items-center justify-center border-2 border-sky-400 shadow-brutal-3-brand mb-2">
                                                            {member.initials || member.name?.slice(0, 2).toUpperCase() || 'TM'}
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                                                            [ PHOTO PENDING ]
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <>
                                                    <img
                                                        loading="lazy"
                                                        decoding="async"
                                                        src={photoUrl}
                                                        alt={member.name}
                                                        style={memberFramingStyle(member)}
                                                        className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            if (e.currentTarget.nextElementSibling) {
                                                                e.currentTarget.nextElementSibling.classList.remove('hidden');
                                                                e.currentTarget.nextElementSibling.classList.add('flex');
                                                            }
                                                        }}
                                                    />
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-sky-50 hidden flex-col items-center justify-center p-4 text-center">
                                                        <div className="w-16 h-16 rounded-full bg-slate-900 text-white font-mono font-black text-xl flex items-center justify-center border-2 border-sky-400 shadow-brutal-3-brand mb-2">
                                                            {member.initials || member.name?.slice(0, 2).toUpperCase() || 'TM'}
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                                                            [ PHOTO PENDING ]
                                                        </span>
                                                    </div>
                                                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/85 text-white font-mono font-black text-[9px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                                        ⤢ View full photo
                                                    </span>
                                                </>
                                            );
                                        })()}

                                        {/* Corner Role Badge */}
                                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 bg-white/95 backdrop-blur-xs border-2 border-slate-900 font-mono font-black text-[10px] uppercase shadow-brutal-2">
                                            {member.badge || 'ENGINEER'}
                                        </span>
                                    </button>

                                    <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase mb-0.5">
                                        {member.name}
                                    </h4>
                                    <p className="text-xs font-mono font-bold text-sky-700 mb-2.5">
                                        {member.role}
                                    </p>
                                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                        {member.bio}
                                    </p>

                                    {member.phone && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <a
                                                href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                                                className="press press-flat inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-700 hover:text-sky-700 cursor-pointer truncate"
                                            >
                                                <Icon name="phone" className="w-3 h-3 text-sky-700 shrink-0" />
                                                <span className="truncate">{member.phone}</span>
                                            </a>
                                            <a
                                                href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="press press-flat text-[10px] font-mono font-black text-emerald-600 hover:text-emerald-700 shrink-0"
                                                title="WhatsApp Direct"
                                            >
                                                WA ↗
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 pt-3 border-t border-slate-200 text-[10px] font-mono font-bold uppercase flex items-center justify-between">
                                    <span className="text-slate-500">TEAM ASTERIX</span>
                                    {member.status === 'Alumni' ? (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-400 font-black flex items-center gap-1 shadow-brutal-1">
                                            ★ ALUMNI
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-sky-100 text-sky-700 border border-sky-400 font-black flex items-center gap-1 shadow-brutal-1">
                                            ● ACTIVE MEMBER
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={badgeBusy === idx}
                                    onClick={() => saveBadge(member, idx)}
                                    className="press press-flat mt-2 w-full px-2 py-1.5 bg-slate-900 hover:bg-sky-600 disabled:bg-slate-400 text-white font-mono font-black text-[10px] uppercase tracking-wider border-2 border-slate-900 cursor-pointer disabled:cursor-wait"
                                >
                                    {badgeBusy === idx ? 'Drawing…' : '🎖 Download badge'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {badgeError && (
                        <p role="alert" className="mt-6 p-3 bg-rose-100 border-2 border-rose-500 font-mono text-xs font-bold text-rose-800">
                            {badgeError}
                        </p>
                    )}
                </div>

                {/* Bottom Subsystem Switcher Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-900 text-white border-4 border-slate-900 shadow-brutal-8-brand">
                    <div className="flex items-center gap-3">
                        <Icon name="bolt" className="w-6 h-6 text-sky-400" />
                        <div>
                            <span className="text-[10px] font-mono text-sky-400 uppercase block">Next System in Line:</span>
                            <span className="text-base font-black uppercase">{nextSystem.name}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => selectSubsystem(nextSystem.id)}
                        className="press press-flat cyber-button px-8 py-3.5 text-xs font-black uppercase cursor-pointer"
                    >
                        EXPLORE {nextSystem.name} →
                    </button>
                </div>

            </div>

            {/* Full, uncropped portrait */}
            {portrait && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 anim-fade"
                    onClick={() => setPortrait(null)}
                    data-lenis-prevent
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Portrait of ${portrait.name}`}
                >
                    <div
                        className="anim-pop-center relative w-full max-w-md bg-white border-4 border-slate-900 shadow-brutal-12-brand flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 font-mono text-[11px] font-black uppercase">
                            <span className="truncate">{portrait.name}</span>
                            <button
                                onClick={() => setPortrait(null)}
                                className="press press-flat w-7 h-7 shrink-0 bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center border-2 border-white cursor-pointer font-sans text-sm font-bold"
                                aria-label="Close portrait"
                            >
                                <span aria-hidden="true">✕</span>
                            </button>
                        </div>
                        <div className="bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
                            <img
                                loading="lazy"
                                decoding="async"
                                src={apiUrl(portrait.photo)}
                                alt={portrait.name}
                                className="max-w-full max-h-[70vh] object-contain"
                            />
                        </div>
                        <div className="p-4 border-t-3 border-slate-900">
                            <p className="font-mono text-xs font-black text-sky-700 uppercase">{portrait.role}</p>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">{portrait.bio}</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
