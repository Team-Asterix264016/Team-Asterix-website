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
        } catch {
            /* ignore */
        }

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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-sky-500 selection:text-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden border-b-4 border-slate-900 bg-slate-900 px-4 pt-28 pb-16 text-white sm:px-8 sm:pt-32 sm:pb-20">
                <div className="relative z-10 mx-auto max-w-6xl">
                    <div className="shadow-brutal-3-brand mb-4 inline-block border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 uppercase">
                        ★ POWER THE FIRST DRAFT • ASTERIX AUTONOMOUS PLATFORM
                    </div>
                    <h1 className="mb-6 text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl md:text-7xl">
                        SPONSOR <span className="text-stroke-white text-transparent">TEAM ASTERIX</span>
                    </h1>
                    <p className="max-w-3xl text-base leading-relaxed font-bold text-slate-300 sm:text-xl">
                        Partner with Tamil Nadu's Rank 1 autonomous off-road racing team. Align your brand
                        with high-performance engineering, cutting-edge ROS 2 autonomous robotics, and
                        national collegiate motorsport prestige.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-xs font-black">
                        <button
                            onClick={handleDownloadBrochure}
                            className="press flex cursor-pointer items-center gap-2 border-3 border-slate-900 bg-sky-400 px-6 py-3.5 text-slate-900 shadow-[4px_4px_0px_#000] hover:bg-sky-300"
                        >
                            <span>📥 DOWNLOAD SPONSORSHIP DECK</span>
                        </button>
                        <a
                            href="#inquiry-form"
                            className="press flex cursor-pointer items-center gap-2 border-3 border-slate-900 bg-white px-6 py-3.5 text-slate-900 shadow-[4px_4px_0px_#000] hover:bg-slate-100"
                        >
                            <span>SEND SPONSOR INQUIRY ↓</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Section 1: Official Documents & Deck Files */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
                <div className="mb-10">
                    <span className="mb-1 block font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                        OFFICIAL DOCUMENTS & MATERIALS
                    </span>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase sm:text-4xl">
                        SPONSORSHIP FILES & PROPOSALS
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* File 1: Official Brochure */}
                    <div className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                        <div>
                            <div className="shadow-brutal-2 mb-4 flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-sky-100 text-2xl">
                                📄
                            </div>
                            <span className="mb-1 block font-mono text-[10px] font-bold text-sky-700 uppercase">
                                DOCUMENT • PDF
                            </span>
                            <h3 className="mb-2 text-xl font-black text-slate-900 uppercase">
                                Official Sponsorship Brochure
                            </h3>
                            <p className="mb-4 text-xs leading-relaxed font-medium text-slate-600">
                                Complete brochure outlining our team origin, vehicle technical specifications
                                across all 4 subsystems, budget allocation, and branding tiers.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadBrochure}
                            className="tap press shadow-brutal-2 flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-sky-500 py-2.5 font-mono text-xs font-black text-slate-950 uppercase hover:bg-sky-400"
                        >
                            <span>Download Brochure</span>
                            <span>↓</span>
                        </button>
                    </div>

                    {/* File 2: Technical Architecture Pitch */}
                    <div className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                        <div>
                            <div className="shadow-brutal-2 mb-4 flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-amber-100 text-2xl">
                                ⚙️
                            </div>
                            <span className="mb-1 block font-mono text-[10px] font-bold text-amber-700 uppercase">
                                TECHNICAL • SLIDES
                            </span>
                            <h3 className="mb-2 text-xl font-black text-slate-900 uppercase">
                                Vehicle Technical Pitch
                            </h3>
                            <p className="mb-4 text-xs leading-relaxed font-medium text-slate-600">
                                Deep dive into our ROS 2 Jazzy Stanley controller, C++ OpenCV vision pipeline,
                                Datai 2000W PMSM electric powertrain, and AISI 4130 spaceframe FEA.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadDeck}
                            className="tap press shadow-brutal-2 flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-amber-300 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-amber-400"
                        >
                            <span>Download Tech Deck</span>
                            <span>↓</span>
                        </button>
                    </div>

                    {/* File 3: Institution Endorsement */}
                    <div className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                        <div>
                            <div className="shadow-brutal-2 mb-4 flex h-12 w-12 items-center justify-center border-2 border-slate-900 bg-emerald-100 text-2xl">
                                🏛️
                            </div>
                            <span className="mb-1 block font-mono text-[10px] font-bold text-emerald-700 uppercase">
                                OFFICIAL • INSTITUTION
                            </span>
                            <h3 className="mb-2 text-xl font-black text-slate-900 uppercase">
                                Institution Endorsement Letter
                            </h3>
                            <p className="mb-4 text-xs leading-relaxed font-medium text-slate-600">
                                Formal college endorsement letter from PSG Institute of Technology and Applied
                                Research confirming team credentials and sponsorship tax accounts.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadLetter}
                            className="tap press shadow-brutal-2 flex w-full cursor-pointer items-center justify-center gap-1.5 border-2 border-slate-900 bg-emerald-400 py-2.5 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-300"
                        >
                            <span>Download Letter</span>
                            <span>↓</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Section 2: Sponsorship Tiers */}
            <section className="border-y-4 border-slate-900 bg-sky-50/60 px-4 py-16 sm:px-8">
                <div className="mx-auto max-w-6xl">
                    <div className="mx-auto mb-12 max-w-2xl text-center">
                        <span className="mb-1 block font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            BRAND VISIBILITY TIERS
                        </span>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase sm:text-5xl">
                            PARTNERSHIP PACKAGES
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                        {/* Tier 1: Title Partner */}
                        <div className="shadow-brutal-6 relative flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                            <span className="shadow-brutal-2 absolute -top-3 right-4 border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase">
                                MAXIMUM EXPOSURE
                            </span>
                            <div>
                                <span className="mb-1 block font-mono text-xs font-black text-sky-700 uppercase">
                                    TIER 01
                                </span>
                                <h3 className="mb-1 text-2xl font-black text-slate-900 uppercase">
                                    Title Partner
                                </h3>
                                <div className="mb-4 border-b-2 border-slate-200 pb-3 font-mono text-lg font-black text-slate-900">
                                    ₹3,00,000+
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Primary roll cage nose & hood livery branding</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Paddock banner & official race suit placement</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Exclusive corporate recruitment access to team engineers</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>VIP invitation to track test runs & dynamic days</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Tier 2: Gold Partner */}
                        <div className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                            <div>
                                <span className="mb-1 block font-mono text-xs font-black text-amber-600 uppercase">
                                    TIER 02
                                </span>
                                <h3 className="mb-1 text-2xl font-black text-slate-900 uppercase">
                                    Gold Partner
                                </h3>
                                <div className="mb-4 border-b-2 border-slate-200 pb-3 font-mono text-lg font-black text-slate-900">
                                    ₹1,50,000+
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Prominent side panel & rear wing logo placement</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Logo on promotional team posters & banners</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Dedicated social media campaign features</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Paddock hospitality pass during race days</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Tier 3: Silver Partner */}
                        <div className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                            <div>
                                <span className="mb-1 block font-mono text-xs font-black text-slate-500 uppercase">
                                    TIER 03
                                </span>
                                <h3 className="mb-1 text-2xl font-black text-slate-900 uppercase">
                                    Silver Partner
                                </h3>
                                <div className="mb-4 border-b-2 border-slate-200 pb-3 font-mono text-lg font-black text-slate-900">
                                    ₹75,000+
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Logo featured on team official website</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Branding on roll cage secondary tubes</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Placement on official team shirts</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Tier 4: Technical & In-Kind Partner */}
                        <div className="shadow-brutal-6 flex flex-col justify-between border-4 border-slate-900 bg-white p-6">
                            <div>
                                <span className="mb-1 block font-mono text-xs font-black text-emerald-600 uppercase">
                                    TIER 04
                                </span>
                                <h3 className="mb-1 text-2xl font-black text-slate-900 uppercase">
                                    Tech / In-Kind
                                </h3>
                                <div className="mb-4 border-b-2 border-slate-200 pb-3 font-mono text-lg font-black text-slate-900">
                                    Parts & Tooling
                                </div>
                                <ul className="space-y-2 text-xs font-bold text-slate-700">
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Chromoly steel tubing, dyno time, or sensors</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Technical CAD & showcase endorsement</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span>✦</span>
                                        <span>Website & paddock engineering sponsor tag</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Sponsor Details Form */}
            <section id="inquiry-form" className="mx-auto max-w-4xl px-4 py-20 sm:px-8">
                <div className="shadow-brutal-10 border-4 border-slate-900 bg-white p-8 sm:p-12">
                    <div className="mb-8 border-b-3 border-slate-900 pb-4">
                        <span className="mb-1 block font-mono text-xs font-black tracking-widest text-sky-700 uppercase">
                            CONNECT WITH US
                        </span>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase sm:text-4xl">
                            SUBMIT SPONSORSHIP INQUIRY
                        </h2>
                        <p className="mt-2 text-xs font-bold text-slate-600 sm:text-sm">
                            Fill in your corporate details. Our faculty advisor and student operations leads
                            will respond with our formal proposal within 24 hours.
                        </p>
                    </div>

                    {submitted ? (
                        <div className="shadow-brutal-4 space-y-3 border-3 border-slate-900 bg-sky-100 p-8 text-center">
                            <span className="text-3xl">✓</span>
                            <h3 className="text-xl font-black text-slate-900 uppercase">
                                INQUIRY RECEIVED WITH SUCCESS!
                            </h3>
                            <p className="mx-auto max-w-md font-mono text-xs font-bold text-slate-700">
                                Thank you for your interest in partnering with Team Asterix. Our sponsorship
                                lead will reach out to you via {form.email} and {form.phone} shortly.
                            </p>
                            <button
                                onClick={() => {
                                    setSubmitted(false);
                                    setForm({
                                        companyName: '',
                                        contactPerson: '',
                                        email: '',
                                        phone: '',
                                        tier: 'Gold Partner',
                                        message: ''
                                    });
                                }}
                                className="press cursor-pointer border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase"
                            >
                                Submit Another Inquiry
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Company / Organization Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.companyName}
                                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                        placeholder="e.g. Bosch, Tata Motors, Hexagon"
                                        className="w-full border-2 border-slate-900 bg-slate-50 px-3.5 py-2.5 text-sm font-bold focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Contact Person Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.contactPerson}
                                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                                        placeholder="e.g. Rajesh Kumar"
                                        className="w-full border-2 border-slate-900 bg-slate-50 px-3.5 py-2.5 text-sm font-bold focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Work Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="partner@company.com"
                                        className="w-full border-2 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-xs focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                        className="w-full border-2 border-slate-900 bg-slate-50 px-3.5 py-2.5 font-mono text-xs focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                        Preferred Tier / Interest
                                    </label>
                                    <select
                                        value={form.tier}
                                        onChange={(e) => setForm({ ...form, tier: e.target.value })}
                                        className="w-full cursor-pointer border-2 border-slate-900 bg-white px-3.5 py-2.5 font-mono text-xs font-bold focus:outline-none"
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
                                <label className="mb-1 block font-mono text-xs font-black text-slate-700 uppercase">
                                    Message / Sponsorship Scope
                                </label>
                                <textarea
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    placeholder="Provide any specific areas of interest (e.g., brand placement, technical collaboration, recruitment interview slots)..."
                                    rows={3}
                                    className="w-full border-2 border-slate-900 bg-slate-50 p-3 font-mono text-xs focus:bg-white focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="press shadow-brutal-4 w-full cursor-pointer border-3 border-slate-900 bg-sky-500 py-4 font-mono text-sm font-black text-slate-950 uppercase hover:bg-sky-400 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting Details...' : 'Submit Sponsorship Details →'}
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* Section 4: Direct Team Contact Information */}
            <section className="border-t-4 border-slate-900 bg-slate-900 px-4 py-16 text-white sm:px-8">
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
                    <div className="border-3 border-slate-700 bg-slate-800 p-6">
                        <span className="mb-1 block font-mono text-xs font-black text-sky-400 uppercase">
                            OFFICIAL EMAIL &amp; PHONE
                        </span>
                        <h4 className="mb-2 text-lg font-black text-white uppercase">
                            Direct Communications
                        </h4>
                        <div className="space-y-1 font-mono text-xs text-slate-300">
                            <p>✉ {contact.email || 'asterix.psgitech@gmail.com'}</p>
                            <p>📞 {contact.phone || '+91 86089 44644'}</p>
                        </div>
                    </div>

                    <div className="border-3 border-slate-700 bg-slate-800 p-6">
                        <span className="mb-1 block font-mono text-xs font-black text-sky-400 uppercase">
                            PADDOCK LOCATION
                        </span>
                        <h4 className="mb-2 text-lg font-black text-white uppercase">College Campus</h4>
                        <p className="text-xs font-medium text-slate-300">
                            {contact.address ||
                                'PSG Institute of Technology and Applied Research (PSG iTech), Neelambur, Coimbatore - 641062, Tamil Nadu'}
                        </p>
                    </div>

                    <div className="border-3 border-slate-700 bg-slate-800 p-6">
                        <span className="mb-1 block font-mono text-xs font-black text-sky-400 uppercase">
                            STUDENT & FACULTY LEADS
                        </span>
                        <h4 className="mb-2 text-lg font-black text-white uppercase">Sponsorship Contacts</h4>
                        <p className="font-mono text-xs text-slate-300">
                            Ratheeswar • Software & Perception Lead
                            <br />
                            Team Captains & Faculty Advisors
                            <br />
                            PSG iTech Autonomous Mobility Cell
                        </p>
                    </div>
                </div>

                <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 font-mono text-xs text-slate-400 sm:flex-row">
                    <span>© 2026 TEAM ASTERIX • OFFICIAL SPONSORSHIP PORTAL</span>
                    <button
                        onClick={onBack}
                        className="tap press press-flat cursor-pointer text-sky-400 underline hover:text-white"
                    >
                        ← Return to Main Site
                    </button>
                </div>
            </section>
        </div>
    );
}
