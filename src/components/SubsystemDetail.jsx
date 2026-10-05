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
    const currentSystem = subsystems.find((s) => s.id === subsystemId) || subsystems[0];
    const currentIndex = subsystems.findIndex((s) => s.id === currentSystem.id);
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
        const onKey = (e) => {
            if (e.key === 'Escape') setPortrait(null);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.lenis?.start();
            window.removeEventListener('keydown', onKey);
        };
    }, [portrait]);

    return (
        <div className="relative z-30 min-h-screen bg-white px-4 pt-28 pb-20 text-slate-900 selection:bg-sky-500 selection:text-white sm:px-8">
            <div className="mx-auto max-w-6xl">
                {/* Top Navigation & Back Button */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <button
                        onClick={onBack}
                        className="press press-flat cyber-button-white flex cursor-pointer items-center gap-2 px-6 py-3 text-xs tracking-wider uppercase"
                    >
                        <span>← Back to Overview</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => selectSubsystem(prevSystem.id)}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 text-xs font-bold transition-colors hover:bg-sky-100"
                        >
                            ← Prev Spec
                        </button>
                        <span className="bg-slate-900 px-3 py-1 font-mono text-xs font-black text-white">
                            0{currentIndex + 1} / 0{subsystems.length}
                        </span>
                        <button
                            onClick={() => selectSubsystem(nextSystem.id)}
                            className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 text-xs font-bold transition-colors hover:bg-sky-100"
                        >
                            Next Spec →
                        </button>
                    </div>
                </div>

                {/* Main Subsystem Hero Card */}
                <div className="shadow-brutal-10 relative mb-12 overflow-hidden border-4 border-slate-900 bg-white p-6 sm:p-12">
                    {/* Top Accent Color Strip */}
                    <div
                        className={`-mx-6 -mt-6 mb-8 h-4 sm:-mx-12 sm:-mt-12 ${currentSystem.color} border-b-4 border-slate-900`}
                    />

                    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-start">
                        <div>
                            <div className="mb-3 flex items-center gap-3">
                                <span className="bg-slate-900 px-3 py-1 font-mono text-xs font-black tracking-widest text-white uppercase">
                                    {currentSystem.badge}
                                </span>
                                <span className="border border-slate-900 bg-sky-100 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                                    {currentSystem.stat}
                                </span>
                            </div>

                            <h1 className="text-4xl leading-none font-black tracking-tight text-slate-900 uppercase sm:text-6xl md:text-7xl">
                                {currentSystem.name}
                            </h1>
                            <p className="mt-2 text-lg font-bold text-sky-700 sm:text-xl">
                                {currentSystem.tagline}
                            </p>
                        </div>

                        <div className="shadow-brutal-4 hidden h-24 w-24 items-center justify-center border-3 border-slate-900 bg-sky-50 font-mono text-3xl font-black text-slate-900 lg:flex">
                            0{currentIndex + 1}
                        </div>
                    </div>

                    <p className="max-w-4xl text-base leading-relaxed font-bold text-slate-700 sm:text-lg">
                        {currentSystem.fullDesc}
                    </p>
                </div>

                {/* Subsystem Specifications & Highlights (Full Width Clean Layout) */}
                <div className="shadow-brutal-10 mb-16 border-4 border-slate-900 bg-white p-6 sm:p-10">
                    <div className="mb-8 flex items-center justify-between border-b-3 border-slate-900 pb-4">
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase sm:text-3xl">
                            TECHNICAL SPECIFICATIONS
                        </h3>
                    </div>

                    {/* Specifications Grid */}
                    <div className="mb-8 grid grid-cols-1 gap-4 font-mono sm:grid-cols-2 lg:grid-cols-4">
                        {(currentSystem.specifications || []).map((spec, idx) => (
                            <div
                                key={idx}
                                className="shadow-brutal-4 border-3 border-slate-900 bg-sky-50 p-4"
                            >
                                <span className="mb-1.5 block font-mono text-[11px] font-bold text-slate-600 uppercase">
                                    {spec.label}
                                </span>
                                <span className="block font-mono text-base leading-tight font-black text-slate-900 sm:text-lg">
                                    {spec.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Key Engineering Highlights */}
                    <div className="mb-8 border-t-2 border-slate-200 pt-6">
                        <h4 className="mb-4 text-sm font-black tracking-wider text-slate-900 uppercase">
                            KEY ENGINEERING HIGHLIGHTS:
                        </h4>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {(currentSystem.highlights || []).map((highlight, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-2.5 border-2 border-slate-900 bg-slate-50 p-3.5"
                                >
                                    <span className="text-base leading-none font-black text-sky-700">✦</span>
                                    <span className="text-xs leading-relaxed font-bold text-slate-800 sm:text-sm">
                                        {highlight}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mailing line for this subsystem. Rendered only when the admin
                        has set an address for it -- this used to be a fixed
                        contact@teamasterix.org button that reached nobody. */}
                    {currentSystem.contactEmail && (
                        <div className="flex flex-col justify-between gap-4 border-2 border-t-3 border-slate-900 bg-sky-50/70 p-6 pt-6 sm:flex-row sm:items-center">
                            <p className="text-sm font-black text-slate-900 uppercase sm:text-base">
                                Have a question about {currentSystem.name}?
                            </p>
                            <a
                                href={`mailto:${currentSystem.contactEmail}`}
                                className="press press-flat cyber-button inline-block cursor-pointer self-start px-6 py-3 text-xs tracking-wider whitespace-nowrap uppercase sm:self-auto"
                            >
                                {currentSystem.contactEmail} →
                            </a>
                        </div>
                    )}
                </div>

                {/* Subsystem Team Members Section */}
                <div className="shadow-brutal-10 mb-16 border-4 border-slate-900 bg-white p-6 sm:p-12">
                    <div className="mb-10 flex flex-col justify-between gap-4 border-b-3 border-slate-900 pb-4 sm:flex-row sm:items-end">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase sm:text-5xl">
                                Members
                            </h2>
                        </div>
                        <span className="self-start border-2 border-slate-900 bg-sky-100 px-3 py-1 font-mono text-xs font-black sm:self-auto">
                            {(currentSystem.teamMembers || []).length} ENGINEERS ASSIGNED
                        </span>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {(currentSystem.teamMembers || []).map((member, idx) => (
                            <div
                                key={idx}
                                className="cyber-card group flex flex-col justify-between bg-white p-5 transition-all hover:translate-y-[-2px]"
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
                                        aria-label={
                                            member.photo
                                                ? `View the full portrait of ${member.name}`
                                                : undefined
                                        }
                                        disabled={!member.photo}
                                        className="shadow-brutal-3 relative mb-4 block aspect-[3/4] w-full cursor-zoom-in overflow-hidden border-2 border-slate-900 bg-slate-100 p-0 disabled:cursor-default sm:aspect-[4/5]"
                                    >
                                        {(() => {
                                            const photoUrl = apiUrl(member.photo);
                                            if (!photoUrl) {
                                                return (
                                                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-sky-50 p-4 text-center">
                                                        <div className="shadow-brutal-3-brand mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-sky-400 bg-slate-900 font-mono text-xl font-black text-white">
                                                            {member.initials ||
                                                                member.name?.slice(0, 2).toUpperCase() ||
                                                                'TM'}
                                                        </div>
                                                        <span className="font-mono text-[10px] font-bold tracking-wider text-slate-600 uppercase">
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
                                                        className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            if (e.currentTarget.nextElementSibling) {
                                                                e.currentTarget.nextElementSibling.classList.remove(
                                                                    'hidden'
                                                                );
                                                                e.currentTarget.nextElementSibling.classList.add(
                                                                    'flex'
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <div className="hidden h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-sky-50 p-4 text-center">
                                                        <div className="shadow-brutal-3-brand mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-sky-400 bg-slate-900 font-mono text-xl font-black text-white">
                                                            {member.initials ||
                                                                member.name?.slice(0, 2).toUpperCase() ||
                                                                'TM'}
                                                        </div>
                                                        <span className="font-mono text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                                                            [ PHOTO PENDING ]
                                                        </span>
                                                    </div>
                                                    <span className="absolute bottom-2 left-2 bg-slate-900/85 px-2 py-0.5 font-mono text-[9px] font-black tracking-wider text-white uppercase opacity-0 transition-opacity group-hover:opacity-100">
                                                        ⤢ View full photo
                                                    </span>
                                                </>
                                            );
                                        })()}

                                        {/* Corner Role Badge */}
                                        <span className="shadow-brutal-2 absolute top-2.5 right-2.5 border-2 border-slate-900 bg-white/95 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase backdrop-blur-xs">
                                            {member.badge || 'ENGINEER'}
                                        </span>
                                    </button>

                                    <h4 className="mb-0.5 text-lg font-black text-slate-900 uppercase sm:text-xl">
                                        {member.name}
                                    </h4>
                                    <p className="mb-2.5 font-mono text-xs font-bold text-sky-700">
                                        {member.role}
                                    </p>
                                    <p className="text-xs leading-relaxed font-medium text-slate-600">
                                        {member.bio}
                                    </p>

                                    {member.phone && (
                                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                            <a
                                                href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                                                className="press press-flat inline-flex cursor-pointer items-center gap-1.5 truncate font-mono text-[11px] font-bold text-slate-700 hover:text-sky-700"
                                            >
                                                <Icon
                                                    name="phone"
                                                    className="h-3 w-3 shrink-0 text-sky-700"
                                                />
                                                <span className="truncate">{member.phone}</span>
                                            </a>
                                            <a
                                                href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="press press-flat shrink-0 font-mono text-[10px] font-black text-emerald-600 hover:text-emerald-700"
                                                title="WhatsApp Direct"
                                            >
                                                WA ↗
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 font-mono text-[10px] font-bold uppercase">
                                    <span className="text-slate-500">TEAM ASTERIX</span>
                                    {member.status === 'Alumni' ? (
                                        <span className="shadow-brutal-1 flex items-center gap-1 border border-amber-400 bg-amber-100 px-2 py-0.5 font-black text-amber-900">
                                            ★ ALUMNI
                                        </span>
                                    ) : (
                                        <span className="shadow-brutal-1 flex items-center gap-1 border border-sky-400 bg-sky-100 px-2 py-0.5 font-black text-sky-700">
                                            ● ACTIVE MEMBER
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={badgeBusy === idx}
                                    onClick={() => saveBadge(member, idx)}
                                    className="press press-flat mt-2 w-full cursor-pointer border-2 border-slate-900 bg-slate-900 px-2 py-1.5 font-mono text-[10px] font-black tracking-wider text-white uppercase hover:bg-sky-600 disabled:cursor-wait disabled:bg-slate-400"
                                >
                                    {badgeBusy === idx ? 'Drawing…' : '🎖 Download badge'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {badgeError && (
                        <p
                            role="alert"
                            className="mt-6 border-2 border-rose-500 bg-rose-100 p-3 font-mono text-xs font-bold text-rose-800"
                        >
                            {badgeError}
                        </p>
                    )}
                </div>

                {/* Bottom Subsystem Switcher Footer */}
                <div className="shadow-brutal-8-brand flex flex-col items-center justify-between gap-4 border-4 border-slate-900 bg-slate-900 p-6 text-white sm:flex-row">
                    <div className="flex items-center gap-3">
                        <Icon name="bolt" className="h-6 w-6 text-sky-400" />
                        <div>
                            <span className="block font-mono text-[10px] text-sky-400 uppercase">
                                Next System in Line:
                            </span>
                            <span className="text-base font-black uppercase">{nextSystem.name}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => selectSubsystem(nextSystem.id)}
                        className="press press-flat cyber-button cursor-pointer px-8 py-3.5 text-xs font-black uppercase"
                    >
                        EXPLORE {nextSystem.name} →
                    </button>
                </div>
            </div>

            {/* Full, uncropped portrait */}
            {portrait &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="anim-fade fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
                        onClick={() => setPortrait(null)}
                        data-lenis-prevent
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Portrait of ${portrait.name}`}
                    >
                        <div
                            className="anim-pop-center shadow-brutal-12-brand relative flex w-full max-w-md flex-col border-4 border-slate-900 bg-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 font-mono text-[11px] font-black text-white uppercase">
                                <span className="truncate">{portrait.name}</span>
                                <button
                                    onClick={() => setPortrait(null)}
                                    className="press press-flat flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center border-2 border-white bg-rose-500 font-sans text-sm font-bold text-white hover:bg-rose-600"
                                    aria-label="Close portrait"
                                >
                                    <span aria-hidden="true">✕</span>
                                </button>
                            </div>
                            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden bg-slate-950">
                                <img
                                    loading="lazy"
                                    decoding="async"
                                    src={apiUrl(portrait.photo)}
                                    alt={portrait.name}
                                    className="max-h-[70vh] max-w-full object-contain"
                                />
                            </div>
                            <div className="border-t-3 border-slate-900 p-4">
                                <p className="font-mono text-xs font-black text-sky-700 uppercase">
                                    {portrait.role}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed font-medium text-slate-600">
                                    {portrait.bio}
                                </p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
