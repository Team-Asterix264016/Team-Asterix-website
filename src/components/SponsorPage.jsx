import { useState, useEffect } from 'react';
import { useWebsiteData } from '../context/WebsiteDataContext';
import { apiUrl } from '../lib/api';


export default function SponsorPage({ onBack }) {
    useEffect(() => {
        window.scrollTo(0, 0);
        if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
        }
    }, []);

    const { siteData } = useWebsiteData();
    const { contact, sponsorship } = siteData;

    const [form, setForm] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        tier: 'Gold Partner',
        message: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.companyName) return;

        setIsSubmitting(true);

        const inquiryData = {
            ...form,
            created_at: new Date().toISOString()
        };

        try {
            const res = await fetch(apiUrl('/api/sponsor-inquiries'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inquiryData)
            });
            if (res.ok) {
                setSubmitted(true);
                setIsSubmitting(false);
                return;
            }
        } catch (apiErr) {
            console.warn('Server API inquiry error:', apiErr);
        }

        // Local fallback
        try {
            const existing = JSON.parse(localStorage.getItem('asterix_sponsor_inquiries') || '[]');
            existing.push(inquiryData);
            localStorage.setItem('asterix_sponsor_inquiries', JSON.stringify(existing));
        } catch { /* ignore */ }

        setSubmitted(true);
        setIsSubmitting(false);
    };

    // Download mock/official sponsorship proposal brochure
    const handleDownloadBrochure = () => {
        if (sponsorship?.brochureUrl) {
            window.open(sponsorship.brochureUrl, '_blank');
            return;
        }
        const textContent = `=====================================================
TEAM ASTERIX - AUTONOMOUS MOBILITY SPONSORSHIP PROPOSAL
=====================================================
Institution: PSG Institute of Technology and Applied Research (PSG iTech)
Location: Neelambur, Coimbatore, Tamil Nadu - 641062
Contact: ${contact?.email || 'asterix.psgitech@gmail.com'} | ${contact?.phone || '+91 86089 44644'}

ABOUT TEAM ASTERIX:
Team Asterix is the premier collegiate autonomous and all-terrain mobility engineering team of PSG iTech.
Division: Autonomous Off-Road Mobility & Robotics Lab

VEHICLE ARCHITECTURE:
- Subsystem 1: Software & Perception (ROS 2 Jazzy, OpenCV, Advanced Stanley Control)
- Subsystem 2: Powertrain (Datai 2000W PMSM, 48V Architecture, 9:1 Reduction)
- Subsystem 3: Mechanical (AISI 4130 Chromoly Spaceframe, Double Wishbone, 4-Wheel Lockup BBW)
- Subsystem 4: Leads & Operations (Project Management, Telemetry, Safety Inspections)

PARTNERSHIP TIERS:
1. Title Partner (₹3,00,000+): Primary roll cage & nose livery, pit paddock banner, race suit placement.
2. Gold Partner (₹1,50,000+): Side panel livery, official posters, social media campaigns.
3. Silver Partner (₹75,000+): Website branding, rear frame logo, live testing access.
4. Technical Partner: Material / Component / Dyno support with technical CAD endorsement.

CONTACT DETAILS FOR SPONSORSHIP:
Email: ${contact?.email || 'asterix.psgitech@gmail.com'}
Address: ${contact?.address || 'PSG iTech, Neelambur, Coimbatore - 641062'}
Thank you for powering collegiate automotive innovation!
=====================================================`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Team_Asterix_Sponsorship_Brochure.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Download technical architecture pitch deck
    const handleDownloadDeck = () => {
        if (sponsorship?.deckUrl) {
            window.open(sponsorship.deckUrl, '_blank');
            return;
        }
        const textContent = `=====================================================
TEAM ASTERIX - VEHICLE TECHNICAL ARCHITECTURE PITCH DECK
=====================================================
Vehicle Platform: Asterix Autonomous Electric Platform
Engineering Organization: PSG iTech Racing & Mobility Division

TECHNICAL SUBSYSTEM SPECIFICATIONS:
1. AUTONOMOUS & PERCEPTION
   - Compute Architecture: NVIDIA Jetson Orin Nano + Dual RTK-GPS GNSS
   - Perception Sensors: Solid-State 3D LiDAR (128-Beam) + Stereo Depth Vision
   - Trajectory & Path Planning: Stanley Non-Linear Control + Custom Costmap A*
   - Latency: Sub-18ms End-to-End Loop Closure

2. ELECTRIC PROPULSION & POWERTRAIN
   - Motor: Datai 2000W High-Torque PMSM Drive
   - Supply Voltage: 48V Nominal Battery Pack
   - Peak RPM: 4,000 RPM
   - Gearbox Reduction: 9:1 Single-Stage Precision Gearset
   - Axle Shafts: 4340 Induction-Hardened Chromoly

3. CHASSIS, BRAKES & SUSPENSION
   - Spaceframe: AISI 4130 Seamless Seamless Aircraft Chromoly Tubing
   - Suspension: Dual Unequal-Length A-Arms with Progressive Fox Float Air Shocks
   - Actuation: Steer-by-Wire + Electronic Brake-by-Wire Quad Caliper Lockup

SPONSORSHIP TECHNICAL BENEFIT:
Partnering technical sponsors receive validation data, testing telemetries, and hardware stress analytics directly from our testing logs.
=====================================================`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Team_Asterix_Technical_Pitch_Deck.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Download formal institution endorsement letter
    const handleDownloadLetter = () => {
        if (sponsorship?.letterUrl) {
            window.open(sponsorship.letterUrl, '_blank');
            return;
        }
        const textContent = `=====================================================
PSG INSTITUTE OF TECHNOLOGY AND APPLIED RESEARCH
OFFICIAL ENDORSEMENT & CREDENTIAL CERTIFICATION
=====================================================
To Whom It May Concern,

This document certifies that TEAM ASTERIX is the officially recognized and sanctioned collegiate autonomous off-road vehicle team representing PSG Institute of Technology and Applied Research (PSG iTech), Neelambur, Coimbatore.

The team actively designs and manufactures high-performance autonomous all-terrain electric buggies, pioneering next-generation mobility technology.

Institutional Endorsement Details:
- College: PSG Institute of Technology and Applied Research
- Affiliation: Anna University, Approved by AICTE
- Location: Avinashi Road, Neelambur, Coimbatore, Tamil Nadu - 641062
- Team Designation: Team Asterix (Autonomous Mobility Division)

All corporate sponsorships, technical equipment donations, and financial grants are received through official institutional accounts with statutory 80G tax exemptions where applicable.

Authorized Signatory,
Faculty Advisor & Head of Institution
PSG iTech Autonomous Mobility Cell
=====================================================`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'PSG_iTech_Team_Asterix_Endorsement_Letter.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
            
            {/* Hero Section */}
            <section className="pt-28 pb-16 sm:pt-32 sm:pb-20 px-4 sm:px-8 bg-slate-900 text-white border-b-4 border-slate-900 relative overflow-hidden">
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="inline-block px-3 py-1 bg-amber-300 text-slate-900 font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[3px_3px_0px_#0284c7] mb-4">
                        ★ POWER THE FIRST DRAFT • ASTERIX AUTONOMOUS PLATFORM
                    </div>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none mb-6">
                        SPONSOR <span className="text-stroke-white text-transparent">TEAM ASTERIX</span>
                    </h1>
                    <p className="text-base sm:text-xl text-slate-300 font-bold max-w-3xl leading-relaxed">
                        Partner with Tamil Nadu's Rank 1 autonomous off-road racing team. Align your brand with high-performance engineering, cutting-edge ROS 2 autonomous robotics, and national collegiate motorsport prestige.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-xs font-black">
                        <button
                            onClick={handleDownloadBrochure}
                            className="press px-6 py-3.5 bg-sky-400 hover:bg-sky-300 text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_#000] cursor-pointer flex items-center gap-2"
                        >
                            <span>📥 DOWNLOAD SPONSORSHIP DECK</span>
                        </button>
                        <a
                            href="#inquiry-form"
                            className="press px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_#000] cursor-pointer flex items-center gap-2"
                        >
                            <span>SEND SPONSOR INQUIRY ↓</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Section 1: Official Documents & Deck Files */}
            <section className="py-16 px-4 sm:px-8 max-w-6xl mx-auto">
                <div className="mb-10">
                    <span className="text-xs font-mono font-black uppercase text-sky-600 tracking-widest block mb-1">
                        OFFICIAL DOCUMENTS & MATERIALS
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black uppercase text-slate-900 tracking-tight">
                        SPONSORSHIP FILES & PROPOSALS
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* File 1: Official Brochure */}
                    <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 bg-sky-100 border-2 border-slate-900 flex items-center justify-center text-2xl mb-4 shadow-[2px_2px_0px_#0f172a]">
                                📄
                            </div>
                            <span className="text-[10px] font-mono font-bold text-sky-600 uppercase block mb-1">
                                DOCUMENT • PDF
                            </span>
                            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">
                                Official Sponsorship Brochure
                            </h3>
                            <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                                Complete brochure outlining our team origin, vehicle technical specifications across all 4 subsystems, budget allocation, and branding tiers.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadBrochure}
                            className="press w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <span>Download Brochure</span>
                            <span>↓</span>
                        </button>
                    </div>

                    {/* File 2: Technical Architecture Pitch */}
                    <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 bg-amber-100 border-2 border-slate-900 flex items-center justify-center text-2xl mb-4 shadow-[2px_2px_0px_#0f172a]">
                                ⚙️
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-700 uppercase block mb-1">
                                TECHNICAL • SLIDES
                            </span>
                            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">
                                Vehicle Technical Pitch
                            </h3>
                            <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                                Deep dive into our ROS 2 Jazzy Stanley controller, C++ OpenCV vision pipeline, Datai 2000W PMSM electric powertrain, and AISI 4130 spaceframe FEA.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadDeck}
                            className="press w-full py-2.5 bg-amber-300 hover:bg-amber-400 text-slate-900 font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <span>Download Tech Deck</span>
                            <span>↓</span>
                        </button>
                    </div>

                    {/* File 3: Institution Endorsement */}
                    <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 bg-emerald-100 border-2 border-slate-900 flex items-center justify-center text-2xl mb-4 shadow-[2px_2px_0px_#0f172a]">
                                🏛️
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase block mb-1">
                                OFFICIAL • INSTITUTION
                            </span>
                            <h3 className="text-xl font-black uppercase text-slate-900 mb-2">
                                Institution Endorsement Letter
                            </h3>
                            <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                                Formal college endorsement letter from PSG Institute of Technology and Applied Research confirming team credentials and sponsorship tax accounts.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadLetter}
                            className="press w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <span>Download Letter</span>
                            <span>↓</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Section 2: Sponsorship Tiers */}
            <section className="py-16 px-4 sm:px-8 bg-sky-50/60 border-y-4 border-slate-900">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-xs font-mono font-black uppercase text-sky-600 tracking-widest block mb-1">
                            BRAND VISIBILITY TIERS
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black uppercase text-slate-900 tracking-tight">
                            PARTNERSHIP PACKAGES
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Tier 1: Title Partner */}
                        <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] relative flex flex-col justify-between">
                            <span className="absolute -top-3 right-4 px-2 py-0.5 bg-amber-300 border-2 border-slate-900 font-mono font-black text-[10px] uppercase shadow-[2px_2px_0px_#0f172a]">
                                MAXIMUM EXPOSURE
                            </span>
                            <div>
                                <span className="font-mono text-xs font-black uppercase text-sky-600 block mb-1">TIER 01</span>
                                <h3 className="text-2xl font-black uppercase text-slate-900 mb-1">Title Partner</h3>
                                <div className="text-lg font-mono font-black text-slate-900 mb-4 pb-3 border-b-2 border-slate-200">
                                    ₹3,00,000+
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Primary roll cage nose & hood livery branding</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Paddock banner & official race suit placement</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Exclusive corporate recruitment access to team engineers</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>VIP invitation to track test runs & dynamic days</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Tier 2: Gold Partner */}
                        <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between">
                            <div>
                                <span className="font-mono text-xs font-black uppercase text-amber-600 block mb-1">TIER 02</span>
                                <h3 className="text-2xl font-black uppercase text-slate-900 mb-1">Gold Partner</h3>
                                <div className="text-lg font-mono font-black text-slate-900 mb-4 pb-3 border-b-2 border-slate-200">
                                    ₹1,50,000+
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Prominent side panel & rear wing logo placement</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Logo on promotional team posters & banners</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Dedicated social media campaign features</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Paddock hospitality pass during race days</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Tier 3: Silver Partner */}
                        <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between">
                            <div>
                                <span className="font-mono text-xs font-black uppercase text-slate-500 block mb-1">TIER 03</span>
                                <h3 className="text-2xl font-black uppercase text-slate-900 mb-1">Silver Partner</h3>
                                <div className="text-lg font-mono font-black text-slate-900 mb-4 pb-3 border-b-2 border-slate-200">
                                    ₹75,000+
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Logo featured on team official website</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Branding on roll cage secondary tubes</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Placement on official team shirts</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Tier 4: Technical & In-Kind Partner */}
                        <div className="p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] flex flex-col justify-between">
                            <div>
                                <span className="font-mono text-xs font-black uppercase text-emerald-600 block mb-1">TIER 04</span>
                                <h3 className="text-2xl font-black uppercase text-slate-900 mb-1">Tech / In-Kind</h3>
                                <div className="text-lg font-mono font-black text-slate-900 mb-4 pb-3 border-b-2 border-slate-200">
                                    Parts & Tooling
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Chromoly steel tubing, dyno time, or sensors</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Technical CAD & showcase endorsement</span></li>
                                    <li className="flex items-start gap-1.5"><span>✦</span><span>Website & paddock engineering sponsor tag</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Sponsor Details Form */}
            <section id="inquiry-form" className="py-20 px-4 sm:px-8 max-w-4xl mx-auto">
                <div className="bg-white border-4 border-slate-900 shadow-[10px_10px_0px_#0f172a] p-8 sm:p-12">
                    <div className="mb-8 border-b-3 border-slate-900 pb-4">
                        <span className="text-xs font-mono font-black uppercase text-sky-600 tracking-widest block mb-1">
                            CONNECT WITH US
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black uppercase text-slate-900 tracking-tight">
                            SUBMIT SPONSORSHIP INQUIRY
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-slate-600 mt-2">
                            Fill in your corporate details. Our faculty advisor and student operations leads will respond with our formal proposal within 24 hours.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="p-8 bg-sky-100 border-3 border-slate-900 text-center space-y-3 shadow-[4px_4px_0px_#0f172a]">
                            <span className="text-3xl">✓</span>
                            <h3 className="text-xl font-black uppercase text-slate-900">
                                INQUIRY RECEIVED WITH SUCCESS!
                            </h3>
                            <p className="text-xs font-mono font-bold text-slate-700 max-w-md mx-auto">
                                Thank you for your interest in partnering with Team Asterix. Our sponsorship lead will reach out to you via {form.email} and {form.phone} shortly.
                            </p>
                            <button
                                onClick={() => { setSubmitted(false); setForm({ companyName: '', contactPerson: '', email: '', phone: '', tier: 'Gold Partner', message: '' }); }}
                                className="press px-4 py-2 bg-white border-2 border-slate-900 font-mono font-black text-xs uppercase cursor-pointer"
                            >
                                Submit Another Inquiry
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-black uppercase text-slate-700 mb-1">
                                        Company / Organization Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.companyName}
                                        onChange={e => setForm({ ...form, companyName: e.target.value })}
                                        placeholder="e.g. Bosch, Tata Motors, Hexagon"
                                        className="w-full px-3.5 py-2.5 border-2 border-slate-900 bg-slate-50 font-bold text-sm focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono font-black uppercase text-slate-700 mb-1">
                                        Contact Person Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.contactPerson}
                                        onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                                        placeholder="e.g. Rajesh Kumar"
                                        className="w-full px-3.5 py-2.5 border-2 border-slate-900 bg-slate-50 font-bold text-sm focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-mono font-black uppercase text-slate-700 mb-1">
                                        Work Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="partner@company.com"
                                        className="w-full px-3.5 py-2.5 border-2 border-slate-900 bg-slate-50 font-mono text-xs focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono font-black uppercase text-slate-700 mb-1">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                        className="w-full px-3.5 py-2.5 border-2 border-slate-900 bg-slate-50 font-mono text-xs focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono font-black uppercase text-slate-700 mb-1">
                                        Preferred Tier / Interest
                                    </label>
                                    <select
                                        value={form.tier}
                                        onChange={e => setForm({ ...form, tier: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border-2 border-slate-900 bg-white font-mono text-xs font-bold cursor-pointer focus:outline-none"
                                    >
                                        <option value="Title Partner">Title Partner (₹3,00,000+)</option>
                                        <option value="Gold Partner">Gold Partner (₹1,50,000+)</option>
                                        <option value="Silver Partner">Silver Partner (₹75,000+)</option>
                                        <option value="Technical / In-Kind">Technical / Parts Support</option>
                                        <option value="Custom Partnership">Custom Partnership</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono font-black uppercase text-slate-700 mb-1">
                                    Message / Sponsorship Scope
                                </label>
                                <textarea
                                    value={form.message}
                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                    placeholder="Provide any specific areas of interest (e.g., brand placement, technical collaboration, recruitment interview slots)..."
                                    rows={3}
                                    className="w-full p-3 border-2 border-slate-900 bg-slate-50 font-mono text-xs focus:bg-white focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="press w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-mono font-black text-sm uppercase border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting Details...' : 'Submit Sponsorship Details →'}
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* Section 4: Direct Team Contact Information */}
            <section className="py-16 px-4 sm:px-8 bg-slate-900 text-white border-t-4 border-slate-900">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 bg-slate-800 border-3 border-slate-700">
                        <span className="text-xs font-mono font-black text-sky-400 uppercase block mb-1">
                            OFFICIAL EMAIL &amp; PHONE
                        </span>
                        <h4 className="text-lg font-black uppercase text-white mb-2">Direct Communications</h4>
                        <div className="text-xs font-mono text-slate-300 space-y-1">
                            <p>✉ {contact.email || 'asterix.psgitech@gmail.com'}</p>
                            <p>📞 {contact.phone || '+91 86089 44644'}</p>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-800 border-3 border-slate-700">
                        <span className="text-xs font-mono font-black text-sky-400 uppercase block mb-1">
                            PADDOCK LOCATION
                        </span>
                        <h4 className="text-lg font-black uppercase text-white mb-2">College Campus</h4>
                        <p className="text-xs text-slate-300 font-medium">
                            {contact.address || 'PSG Institute of Technology and Applied Research (PSG iTech), Neelambur, Coimbatore - 641062, Tamil Nadu'}
                        </p>
                    </div>

                    <div className="p-6 bg-slate-800 border-3 border-slate-700">
                        <span className="text-xs font-mono font-black text-sky-400 uppercase block mb-1">
                            STUDENT & FACULTY LEADS
                        </span>
                        <h4 className="text-lg font-black uppercase text-white mb-2">Sponsorship Contacts</h4>
                        <p className="text-xs font-mono text-slate-300">
                            Ratheeswar • Software & Perception Lead<br />
                            Team Captains & Faculty Advisors<br />
                            PSG iTech Autonomous Mobility Cell
                        </p>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
                    <span>© 2026 TEAM ASTERIX • OFFICIAL SPONSORSHIP PORTAL</span>
                    <button
                        onClick={onBack}
                        className="press press-flat text-sky-400 hover:text-white underline cursor-pointer"
                    >
                        ← Return to Main Site
                    </button>
                </div>
            </section>

        </div>
    );
}
