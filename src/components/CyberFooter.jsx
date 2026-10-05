import teamLogo from '../assets/Screenshot 2026-08-26 232320.png';
import { useWebsiteData } from '../context/WebsiteDataContext';
import Icon from './Icon';

export default function CyberFooter({ onOpenAdmin, onOpenSponsor, onOpenWorkshop }) {
    const { siteData } = useWebsiteData();
    const { contact } = siteData;

    return (
        <footer
            id="site-footer"
            className="sticky bottom-0 z-0 w-full bg-slate-50 border-t-4 border-slate-900 text-slate-900 pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-8 select-none"
        >
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-8">

                {/* Main Content Grid */}
                <div data-assemble="stagger" className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10">

                    {/* Brand, Socials/Admin & Contact (Col 1-5) */}
                    <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-2.5 sm:gap-3.5">
                        
                        {/* Top Identity Row */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <img
                                src={teamLogo}
                                alt="Asterix Racing"
                                className="h-7 sm:h-8.5 w-auto object-contain"
                            />
                            <span className="px-2 py-0.5 rounded border border-slate-900 bg-amber-300 text-[10px] font-mono font-black uppercase text-slate-900 shadow-[1.5px_1.5px_0px_#0f172a]">
                                AUTONOMOUS MOBILITY LAB
                            </span>
                        </div>

                        {/* Admin Portal & Social Tags Row (Placed directly above description) */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5">
                            <button
                                onClick={onOpenAdmin}
                                className="press px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 rounded-lg text-[10px] font-mono font-black shadow-[2px_2px_0px_#0284c7] tracking-wider cursor-pointer flex items-center gap-1 transition-all"
                                title="Open Admin Management Interface"
                            >
                                <span className="text-sky-400">⚡</span>
                                <span>ADMIN PORTAL</span>
                            </button>

                            {[
                                { name: 'INSTAGRAM', emoji: '📸', url: contact.instagramUrl || 'https://www.instagram.com/asterix_itech/', color: 'hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-500 hover:text-white hover:border-pink-600' },
                                { name: 'LINKEDIN', emoji: '💼', url: contact.linkedinUrl || 'https://www.linkedin.com/company/teamasterix/', color: 'hover:bg-sky-600 hover:text-white hover:border-sky-700' },
                                { name: 'GITHUB', emoji: '💻', url: contact.githubUrl || 'https://github.com/Team-Asterix264016/', color: 'hover:bg-slate-950 hover:text-white hover:border-slate-950' }
                            ].map((net) => (
                                <a
                                    key={net.name}
                                    href={net.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`press px-2.5 py-1 bg-white border-2 border-slate-900 rounded-lg text-[10px] font-black uppercase text-slate-900 shadow-[2px_2px_0px_#0f172a] ${net.color} cursor-pointer transition-all flex items-center gap-1`}
                                >
                                    <span>{net.emoji}</span>
                                    <span>{net.name}</span>
                                    <span className="text-[9px] opacity-70">↗</span>
                                </a>
                            ))}
                        </div>

                        {/* Description Text */}
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md">
                            Official collegiate off-road engineering team from PSG iTech, designing, building, and operating high-performance autonomous vehicles.
                        </p>

                        {/* Interactive Quick Contact Chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 font-mono text-xs">
                            <a
                                href={`tel:${(contact.phone || '+91 86089 44644').replace(/[^0-9+]/g, '')}`}
                                className="press p-2 bg-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-sky-50 hover:border-sky-600 flex items-center gap-2 font-bold text-slate-800 cursor-pointer transition-colors"
                            >
                                <span className="p-1 bg-sky-100 rounded border border-slate-900 text-slate-900 flex items-center justify-center flex-shrink-0">
                                    <Icon name="phone" className="w-3.5 h-3.5" />
                                </span>
                                <span className="truncate text-[11px]">{contact.phone || '+91 86089 44644'}</span>
                            </a>

                            <a
                                href={`mailto:${contact.email || 'asterix.psgitech@gmail.com'}`}
                                className="press p-2 bg-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-sky-50 hover:border-sky-600 flex items-center gap-2 font-bold text-slate-800 cursor-pointer transition-colors"
                            >
                                <span className="p-1 bg-sky-100 rounded border border-slate-900 text-slate-900 flex items-center justify-center flex-shrink-0">
                                    <Icon name="mail" className="w-3.5 h-3.5" />
                                </span>
                                <span className="truncate text-[11px]">{contact.email || 'asterix.psgitech@gmail.com'}</span>
                            </a>

                            <div className="p-2 bg-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center gap-2 font-bold text-slate-800">
                                <span className="p-1 bg-sky-100 rounded border border-slate-900 text-slate-900 flex items-center justify-center flex-shrink-0">
                                    <Icon name="pin" className="w-3.5 h-3.5" />
                                </span>
                                <span className="truncate text-[11px]">PSG iTech, Coimbatore</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Columns (Col 6-12) */}
                    <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 gap-5 lg:gap-8">
                        
                        {/* Section: The Squad */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-black font-mono text-sky-700 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                                <span className="w-1.5 h-1.5 bg-sky-600 rounded-full" />
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
                                        className="p-2 -mx-1.5 rounded-lg border border-transparent hover:border-slate-900 hover:bg-sky-50 hover:shadow-[2px_2px_0px_#0f172a] transition-all flex items-center justify-between group cursor-pointer text-slate-800"
                                    >
                                        <span>{item.name}</span>
                                        <span className="font-mono text-[11px] text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all">→</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Section: Portals & Logs */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-black font-mono text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                <span>PORTALS & LOGS</span>
                            </span>
                            
                            <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
                                <button
                                    onClick={() => {
                                        if (onOpenWorkshop) onOpenWorkshop();
                                        else window.location.hash = '#workshop';
                                    }}
                                    className="p-2 -mx-1.5 rounded-lg border border-slate-900 bg-amber-50 hover:bg-amber-200 hover:shadow-[2px_2px_0px_#0f172a] transition-all flex items-center justify-between group text-left cursor-pointer font-bold text-slate-900"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span>Workshops 2026</span>
                                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-300 border border-slate-900 rounded font-black text-slate-900 shadow-[1px_1px_0px_#0f172a]">✦</span>
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400 group-hover:text-amber-900 group-hover:translate-x-0.5 transition-all">→</span>
                                </button>

                                <button
                                    onClick={() => {
                                        if (onOpenSponsor) onOpenSponsor();
                                        else window.location.hash = '#sponsor';
                                    }}
                                    className="p-2 -mx-1.5 rounded-lg border border-slate-900 bg-sky-50 hover:bg-sky-200 hover:shadow-[2px_2px_0px_#0f172a] transition-all flex items-center justify-between group text-left cursor-pointer font-bold text-slate-900"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span>Sponsor Portal</span>
                                        <span className="text-[9px] px-1.5 py-0.2 bg-sky-200 text-sky-900 border border-slate-900 rounded font-black font-mono shadow-[1px_1px_0px_#0f172a]">↗</span>
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400 group-hover:text-sky-800 group-hover:translate-x-0.5 transition-all">→</span>
                                </button>

                                {[
                                    { name: 'Photo Gallery', href: '#gallery' },
                                    { name: 'Team Updates', href: '#updates' },
                                    { name: 'Our Story', href: '#story' }
                                ].map((item) => (
                                    <a
                                        key={item.name}
                                        href={item.href}
                                        className="p-2 -mx-1.5 rounded-lg border border-transparent hover:border-slate-900 hover:bg-slate-100 hover:shadow-[2px_2px_0px_#0f172a] transition-all flex items-center justify-between group cursor-pointer text-slate-800"
                                    >
                                        <span>{item.name}</span>
                                        <span className="font-mono text-[11px] text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all">→</span>
                                    </a>
                                ))}

                                <a
                                    href="#hero"
                                    className="p-1.5 -mx-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-950 transition-all flex items-center justify-between group font-mono text-[10px] font-bold text-slate-500 cursor-pointer"
                                >
                                    <span>Back to Top</span>
                                    <span className="font-mono text-[10px] group-hover:-translate-y-0.5 transition-transform">↑</span>
                                </a>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Bottom Bar: Crafted by top line, Faded smaller Copyright below */}
                <div className="pt-2 sm:pt-3 flex flex-col items-center justify-center gap-0.5 text-center font-mono">
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                        Crafted with ❤️ by the Software & Perception Subsystem
                    </p>
                    <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400/80 uppercase tracking-widest">
                        © 2026 TEAM ASTERIX • ALL RIGHTS RESERVED
                    </p>
                </div>

            </div>
        </footer>
    );
}
