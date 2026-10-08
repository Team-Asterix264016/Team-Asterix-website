import teamLogo from '../assets/Screenshot 2026-08-26 232320.png';
import { useWebsiteData } from '../context/WebsiteDataContext';
import Icon from './Icon';

export default function CyberFooter({ onOpenAdmin, onOpenSponsor, onOpenWorkshop }) {
    const { siteData } = useWebsiteData();
    const { contact } = siteData;

    return (
        /* Was `sticky bottom-0 z-0`: the footer sat pinned to the viewport bottom
           and <main> slid over it as a curtain. That only works while the
           covering element is opaque, and <main>'s `bg-white` was also painting
           over the fixed ambient layer -- the light blooms, dot grid, drifting
           grit and 3D buggy -- everywhere, including the two sections written to
           be transparent for it. The two effects cannot both sit behind <main>.
           The ambient layer won; the footer now flows at the end of the page. */
        <footer
            id="site-footer"
            className="relative z-10 w-full border-t-4 border-slate-900 bg-slate-50 px-4 pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] text-slate-900 select-none sm:px-8 sm:pt-12 md:pb-8"
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
                {/* Main Content Grid */}
                <div data-assemble="stagger" className="grid grid-cols-1 gap-6 md:grid-cols-12 lg:gap-10">
                    {/* Brand, Socials/Admin & Contact (Col 1-5) */}
                    <div className="flex flex-col gap-2.5 sm:gap-3.5 md:col-span-6 lg:col-span-5">
                        {/* Top Identity Row */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <img
                                loading="lazy"
                                decoding="async"
                                src={teamLogo}
                                alt="Asterix Racing"
                                className="h-7 w-auto object-contain sm:h-8.5"
                            />
                            <span className="rounded border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black text-slate-900 uppercase shadow-[1.5px_1.5px_0px_#0f172a]">
                                AUTONOMOUS MOBILITY LAB
                            </span>
                        </div>

                        {/* Admin Portal & Social Tags Row (Placed directly above description) */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 sm:gap-2">
                            <button
                                onClick={onOpenAdmin}
                                className="press shadow-brutal-2-brand tap flex cursor-pointer items-center gap-1 rounded-lg border-2 border-slate-900 bg-slate-900 px-2.5 py-1 font-mono text-[10px] font-black tracking-wider text-white transition-all hover:bg-slate-800"
                                title="Open Admin Management Interface"
                            >
                                <span className="text-sky-400">⚡</span>
                                <span>ADMIN PORTAL</span>
                            </button>

                            {[
                                {
                                    name: 'INSTAGRAM',
                                    emoji: '📸',
                                    url: contact.instagramUrl || 'https://www.instagram.com/asterix_itech/',
                                    color: 'hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-500 hover:text-white hover:border-pink-600'
                                },
                                {
                                    name: 'LINKEDIN',
                                    emoji: '💼',
                                    url:
                                        contact.linkedinUrl ||
                                        'https://www.linkedin.com/company/teamasterix/',
                                    color: 'hover:bg-sky-600 hover:text-white hover:border-sky-700'
                                },
                                {
                                    name: 'GITHUB',
                                    emoji: '💻',
                                    url: contact.githubUrl || 'https://github.com/Team-Asterix264016/',
                                    color: 'hover:bg-slate-950 hover:text-white hover:border-slate-950'
                                }
                            ].map((net) => (
                                <a
                                    key={net.name}
                                    href={net.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`press shadow-brutal-2 tap rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-[10px] font-black text-slate-900 uppercase ${net.color} flex cursor-pointer items-center gap-1 transition-all`}
                                >
                                    <span>{net.emoji}</span>
                                    <span>{net.name}</span>
                                    <span className="text-[9px] opacity-70">↗</span>
                                </a>
                            ))}
                        </div>

                        {/* Description Text */}
                        <p className="max-w-md text-xs leading-relaxed font-medium text-slate-600 sm:text-sm">
                            Official collegiate off-road engineering team from PSG iTech, designing, building,
                            and operating high-performance autonomous vehicles.
                        </p>

                        {/* Interactive Quick Contact Chips */}
                        <div className="grid grid-cols-1 gap-2 pt-0.5 font-mono text-xs sm:grid-cols-3">
                            <a
                                href="tel:+918608944644"
                                className="press shadow-brutal-2 flex cursor-pointer items-center gap-2 rounded-lg border-2 border-slate-900 bg-white p-2 font-bold text-slate-800 transition-colors hover:border-sky-600 hover:bg-sky-50"
                            >
                                <span className="flex flex-shrink-0 items-center justify-center rounded border border-slate-900 bg-sky-100 p-1 text-slate-900">
                                    <Icon name="phone" className="h-3.5 w-3.5" />
                                </span>
                                <span className="truncate text-[11px]">
                                    +91 86089 44644
                                </span>
                            </a>

                            <a
                                href={`mailto:${contact.email || 'asterix.psgitech@gmail.com'}`}
                                className="press shadow-brutal-2 flex cursor-pointer items-center gap-2 rounded-lg border-2 border-slate-900 bg-white p-2 font-bold text-slate-800 transition-colors hover:border-sky-600 hover:bg-sky-50"
                            >
                                <span className="flex flex-shrink-0 items-center justify-center rounded border border-slate-900 bg-sky-100 p-1 text-slate-900">
                                    <Icon name="mail" className="h-3.5 w-3.5" />
                                </span>
                                <span className="truncate text-[11px]">
                                    {contact.email || 'asterix.psgitech@gmail.com'}
                                </span>
                            </a>

                            <div className="shadow-brutal-2 flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white p-2 font-bold text-slate-800">
                                <span className="flex flex-shrink-0 items-center justify-center rounded border border-slate-900 bg-sky-100 p-1 text-slate-900">
                                    <Icon name="pin" className="h-3.5 w-3.5" />
                                </span>
                                <span className="truncate text-[11px]">PSG iTech, Coimbatore</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Columns (Col 6-12) */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:col-span-6 lg:col-span-7 lg:gap-8">
                        {/* Section: The Squad */}
                        <div className="flex flex-col gap-2">
                            <span className="mb-0.5 flex items-center gap-1.5 font-mono text-[11px] font-black tracking-wider text-sky-700 uppercase">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                                <span>THE SQUAD</span>
                            </span>
                            <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                                {[
                                    { name: 'Software & Perception', href: '#squad' },
                                    { name: 'Powertrain & Electrical', href: '#squad' },
                                    { name: 'Mechanical & Chassis', href: '#squad' },
                                    { name: 'Team Leadership', href: '#squad' }
                                ].map((item) => (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        className="hover:shadow-brutal-2 group tap -mx-1.5 flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 text-slate-800 transition-all hover:border-slate-900 hover:bg-sky-50"
                                    >
                                        <span>{item.name}</span>
                                        <span className="font-mono text-[11px] text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-sky-700">
                                            →
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Section: Portals & Logs */}
                        <div className="flex flex-col gap-2">
                            <span className="mb-0.5 flex items-center gap-1.5 font-mono text-[11px] font-black tracking-wider text-amber-700 uppercase">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>PORTALS & LOGS</span>
                            </span>

                            <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                                <button
                                    onClick={() => {
                                        if (onOpenWorkshop) onOpenWorkshop();
                                        else window.location.hash = '#workshop';
                                    }}
                                    className="hover:shadow-brutal-2 group tap -mx-1.5 flex cursor-pointer items-center justify-between rounded-lg border border-slate-900 bg-amber-50 p-2 text-left font-bold text-slate-900 transition-all hover:bg-amber-200"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span>Workshops 2026</span>
                                        <span className="shadow-brutal-1 rounded border border-slate-900 bg-amber-300 px-1.5 py-px text-[9px] font-black text-slate-900">
                                            ✦
                                        </span>
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-amber-900">
                                        →
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                        if (onOpenSponsor) onOpenSponsor();
                                        else window.location.hash = '#sponsor';
                                    }}
                                    className="hover:shadow-brutal-2 group tap -mx-1.5 flex cursor-pointer items-center justify-between rounded-lg border border-slate-900 bg-sky-50 p-2 text-left font-bold text-slate-900 transition-all hover:bg-sky-200"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span>Sponsor Portal</span>
                                        <span className="shadow-brutal-1 rounded border border-slate-900 bg-sky-200 px-1.5 py-px font-mono text-[9px] font-black text-sky-900">
                                            ↗
                                        </span>
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-sky-800">
                                        →
                                    </span>
                                </button>

                                <a
                                    href="#hero"
                                    className="group tap -mx-1.5 flex cursor-pointer items-center justify-between rounded-lg p-1.5 font-mono text-[10px] font-bold text-slate-500 transition-all hover:bg-slate-200/70 hover:text-slate-950"
                                >
                                    <span>Back to Top</span>
                                    <span className="font-mono text-[10px] transition-transform group-hover:-translate-y-0.5">
                                        ↑
                                    </span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar: Crafted by top line, Faded smaller Copyright below */}
                <div className="flex flex-col items-center justify-center gap-0.5 pt-2 text-center font-mono sm:pt-3">
                    <p className="text-[10px] font-bold text-slate-600 sm:text-[11px]">
                        Crafted with ❤️ by the Software & Perception Subsystem
                    </p>
                    <p className="text-[8px] font-semibold tracking-widest text-slate-600 uppercase sm:text-[9px]">
                        © 2026 TEAM ASTERIX • ALL RIGHTS RESERVED
                    </p>
                </div>
            </div>
        </footer>
    );
}
