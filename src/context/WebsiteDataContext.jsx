import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WebsiteDataContext } from './WebsiteContext';
import { subsystems as initialSubsystems } from '../data/subsystemsData';
import { apiUrl } from '../lib/api';
import { SOFTWARE_PERCEPTION_DATA, POWERTRAIN_CHALLENGE_DATA, POWERTRAIN_TEST_DATA, MECHANICAL_MYSTERY_DATA } from '../data/recruitmentProblemStatements';
import { WORKSHOP_TRACKS } from '../../server/src/config/workshopPackages.js';

import imgPaddock from '../assets/gallery/01_team_paddock.jpg';
import imgWelding from '../assets/gallery/02_workshop_welding.jpg';
import imgLidar from '../assets/gallery/03_lidar_sensor_tuning.jpg';
import imgTrack from '../assets/gallery/04_track_dirt_action.jpg';
import imgMechanics from '../assets/gallery/05_pitlane_mechanics.jpg';
import imgCelebration from '../assets/gallery/06_team_celebration.jpg';

const LOCAL_STORAGE_KEY = 'asterix_website_data_v2';
export const AUTH_SESSION_KEY = 'asterix_admin_session_v1';
export const AUTH_TOKEN_KEY = 'asterix_admin_token_v1';

// Initial default story narrative
const initialStoryText = `It started as a training program.

In the first year, there was no Team Asterix, no competition vehicle, and no clear idea where the journey would lead. It was simply a group of students learning how vehicles worked. Months were spent understanding vehicle dynamics, control systems, electronics, and autonomous technologies.

About a year later, the group decided to take the program seriously and registered for SAE BAJA 2026. Somewhere along that journey, the name Asterix came into existence, and the training program evolved into a team with a much bigger ambition.

That was where the real learning began.

The project was divided into four major subsystems: Software & Perception, Powertrain, Mechanical, and Leads. Each had its own challenges, but the vehicle could only work when all four came together.

The team started with planning. Budgets were prepared, timelines were drawn, documents were written, and everything looked organized on paper. But this was the first BAJA vehicle ever built by this group. When work moved from paper to the workshop, reality hit hard.

Parts did not arrive on time. Some components were missing. Others arrived damaged or did not fit the way they were supposed to. Fabrication work was delayed, and testing schedules had to be rewritten again and again. Every week brought a new obstacle, and progress felt painfully slow.

Then came the physical assembly.

Mounting the systems was far more complicated than expected. Wires had to be rerouted, brackets had to be redesigned, and mechanical adjustments had to be made directly on the vehicle frame. Days were spent troubleshooting electrical noise, sensor communication drops, and mechanical alignment issues. The workshop slowly became a place of long hours, frustration, and continuous trial and error.

Testing brought another layer of difficulty.

Systems that worked in isolation failed when connected together. Sensors gave unexpected readings when the vehicle moved. The steering actuator responded with slight delays that had to be corrected through control tuning. The brake actuator required precise pressure calibration to ensure safe stopping distances. Each test run revealed a new flaw, and each flaw meant going back to the design, changing parameters, and testing again.

There were moments when things seemed stalled. The competition deadline was approaching, the vehicle was still not performing reliably, and fatigue was beginning to set in. The team had to make difficult decisions: simplify certain mechanisms, rebuild faulty connections, and work through nights to keep the project alive.

What kept the team moving forward was simple: the vehicle had to drive.

Bit by bit, the problems were solved. The software pipeline stabilized. The drive-by-wire systems began responding accurately to commands. The mechanical assembly became solid. The vehicle that once existed only as sketches and CAD files slowly became an actual running machine.

Team Asterix was not built with experience or endless resources. It was built through mistakes, delays, redesigns, and the stubborn refusal to leave the workshop until the car worked.

SAE BAJA was never just a competition for this team.

It was the reason a training program turned into a family of engineers who learned how to build something real from nothing.`;

// Initial default hero data
const initialHeroData = {
    teamTitle: "TEAM",
    teamName: "ASTERIX",
    tagline: "Pioneering Next-Gen Autonomous Mobility & Off-Road Robotics.",
    badges: [
        { label: "AUTONOMOUS MOBILITY LAB", class: "rotate-[-3deg] bg-amber-300 text-slate-900" },
        { label: "ADVANCED R&D DIVISION", class: "bg-white text-slate-900" },
        { label: "★ PSG iTECH ENGINEERING", class: "rotate-[3deg] bg-sky-400 text-white" }
    ],
    ctaText: "EXPLORE THE SQUAD →",
    ctaLink: "#squad",
    joinFormUrl: "https://forms.gle/6hHG6aXqrunnfj7V6"
};

// Initial default gallery items
const initialGalleryItems = [
    {
        id: "gal-1",
        title: "Paddock Dawn Inspection",
        category: "FIELD TESTING • SCRUTINEERING",
        year: "2026",
        src: imgPaddock,
        desc: "Complete pre-test technical inspection and telemetry calibration under paddock sunrise."
    },
    {
        id: "gal-2",
        title: "Spaceframe Chassis TIG Welding",
        category: "WORKSHOP • CHASSIS FAB",
        year: "2025",
        src: imgWelding,
        desc: "Precision TIG welding of AISI 4130 chromoly roll cage joints with zero dimensional distortion."
    },
    {
        id: "gal-3",
        title: "LiDAR & Neural Vision Tuning",
        category: "AI LAB • PERCEPTION",
        year: "2026",
        src: imgLidar,
        desc: "Real-time point-cloud registration and stereo camera depth calibration on the test bench."
    },
    {
        id: "gal-4",
        title: "High-Speed Dirt Proving Grounds",
        category: "DYNAMIC TESTING • TERRAIN",
        year: "2026",
        src: imgTrack,
        desc: "Full-throttle endurance run across punishing washboard ruts and loose red dirt trails."
    },
    {
        id: "gal-5",
        title: "Suspension & Brake Tuning",
        category: "PIT BAY • QUICK SERVICE",
        year: "2026",
        src: imgMechanics,
        desc: "Trackside damper valving adjustments and hydraulic line bleeding between endurance testing runs."
    },
    {
        id: "gal-6",
        title: "Platform Milestone & Victory",
        category: "PROVING GROUNDS • MILESTONE",
        year: "2026",
        src: imgCelebration,
        desc: "Team Asterix celebrating major technical milestones and successful autonomous field trials."
    }
];

// Initial default updates
const initialUpdates = [
    {
        id: "upd-1",
        label: "Paddock Lineup & Shakedown",
        tag: "FEB 2026 • PIT LANE",
        image: imgPaddock,
        link: "#"
    },
    {
        id: "upd-2",
        label: "Spaceframe TIG Welding",
        tag: "NOV 2025 • CHASSIS BAY",
        image: imgWelding,
        link: "#"
    },
    {
        id: "upd-3",
        label: "LiDAR & Neural Perception",
        tag: "JAN 2026 • AI LAB",
        image: imgLidar,
        link: "#"
    },
    {
        id: "upd-4",
        label: "High-Speed Dirt Testing",
        tag: "JAN 2026 • PROVING GROUNDS",
        image: imgTrack,
        link: "#"
    },
    {
        id: "upd-5",
        label: "Autonomous Field Milestone",
        tag: "FEB 2026 • PROVING GROUNDS",
        image: imgCelebration,
        link: "#"
    }
];

// Initial default contact info
const initialContactInfo = {
    email: "asterix.psgitech@gmail.com",
    phone: "+91 86089 44644",
    address: "PSG iTech, Neelambur, Coimbatore, Tamil Nadu",
    category: "Autonomous All-Terrain Vehicle Development",
    instagramUrl: "https://www.instagram.com/asterix_itech/",
    linkedinUrl: "https://www.linkedin.com/company/teamasterix/",
    githubUrl: "https://github.com/Team-Asterix264016/"
};

/* Roster of admin accounts, for display in the Team Accounts tab only.
   Passwords used to be listed here in plaintext, which shipped them inside the
   production JavaScript bundle for anyone to read. Authentication now happens
   solely against the server, which stores bcrypt hashes, so nothing here is a
   credential. */
const initialAccounts = [
    {
        id: "acc-1",
        username: "admin",
        name: "Ratheeswar",
        phone: "+91 86089 44644",
        role: "System Administrator & Software Lead",
        accessLevel: "SuperAdmin"
    },
    {
        id: "acc-2",
        username: "powertrain_lead",
        name: "Joel Anto Edwin",
        phone: "+91 72079 60077",
        role: "Powertrain Subsystem Lead",
        accessLevel: "Lead"
    },
    {
        id: "acc-3",
        username: "chassis_lead",
        name: "Soorya Ramprakash",
        phone: "+91 89394 52244",
        role: "Chassis & Mechanical Lead",
        accessLevel: "Lead"
    }
];

const initialSponsorshipData = {
    brochureUrl: '',
    deckUrl: '',
    contactPerson: 'Ratheeswar & Team Leads',
    contactEmail: 'asterix.psgitech@gmail.com',
    contactPhone: '+91 98765 43210'
};

/* Recruitment portal — static content only.
   Applications run through the team's Google Form. Everything here is display
   content the leads edit from the admin dashboard. Each subsystem recruits on
   its own terms, so the content is split into three fixed tracks, each carrying
   its own timeline (deadlines), its own problem statement(s) and its own form.
   No dates are invented — an empty track timeline shows a "to be announced"
   state, and empty problem statements show the same. */
const RECRUITMENT_TRACKS = [
    {
        id: 'software-perception',
        name: 'Software & Perception',
        blurb: SOFTWARE_PERCEPTION_DATA.blurb,
        lead: SOFTWARE_PERCEPTION_DATA.lead,
        applyUrl: '',
        timeline: SOFTWARE_PERCEPTION_DATA.timeline,
        problemStatements: [
            {
                id: 'ps-cv-01',
                title: 'Problem Statement 01: Vision-Based Object Detection',
                summary: 'Design and implement a practical 2D multi-class object detection system for our autonomous vehicle using a ZED 2i camera and NVIDIA Jetson Orin NX across Phase 1 (due 8th night 11:59 PM) and Phase 2 (due 15th night 11:59 PM).',
                body: 'Phase 01: Research, Architecture & Proposal (Deadline: 8 September 2026, 11:59 PM IST)\nPhase 02: Implementation & Evaluation (Deadline: 15 September 2026, 11:59 PM IST)\nHardware: NVIDIA Jetson Orin NX + ZED 2i Camera\n9 Classes: Cone, Traffic barrier, Cow, Pedestrian, Bicyclist, Red traffic light, Green traffic light, Orange/amber traffic light, Two-wheeler.'
            },
            {
                id: 'ps-fusion-02',
                title: 'Problem Statement 02: Sensor Fusion & Track Reconstruction',
                summary: 'Reconstruct a clean 2D cone map from noisy, backward-mounted (180° inverted) perception data and vehicle telemetry, handling ghost cone hallucinations across Phase 1 (offline pipeline due 8th night 11:59 PM) and Phase 2 (online streaming pipeline due 15th night 11:59 PM).',
                body: 'Phase 01: Offline Map Reconstruction & Noise Filtering (Deadline: 8 September 2026, 11:59 PM IST)\nPhase 02: Online Streaming & Uncertainty (Deadline: 15 September 2026, 11:59 PM IST)\nTarget: Asterix Autonomous Buggy Platform + 180° backward-facing perception sensor.'
            }
        ]
    },
    {
        id: 'powertrain',
        name: 'Powertrain',
        blurb: POWERTRAIN_CHALLENGE_DATA.blurb,
        lead: POWERTRAIN_CHALLENGE_DATA.lead,
        applyUrl: '',
        timeline: POWERTRAIN_CHALLENGE_DATA.timeline,
        problemStatements: POWERTRAIN_CHALLENGE_DATA.challenges.map((c) => ({
            id: c.id,
            title: `Problem Statement ${c.number}: ${c.title}`,
            summary: `${c.tagline} (${c.badge} • ${c.deadlineLabel})`,
            body: `${c.title}\n${c.tagline}\n\nMandatory Demo: ${c.mandatoryDemo}\nDeadline: ${c.deadlineLabel}\nDomain: ${c.domain}`
        }))
    },
    {
        id: 'mechanical',
        name: 'Mechanical',
        blurb: MECHANICAL_MYSTERY_DATA.blurb,
        lead: MECHANICAL_MYSTERY_DATA.lead,
        applyUrl: '',
        timeline: MECHANICAL_MYSTERY_DATA.timeline,
        problemStatements: MECHANICAL_MYSTERY_DATA.challenges.map((c) => ({
            id: c.id,
            title: c.title,
            summary: c.tagline || (Array.isArray(c.parts) ? c.parts.map(p => p.partLabel).join(' • ') : 'Teams of 2.'),
            body: `${c.title}\n${c.tagline || ''}\n\n` + (Array.isArray(c.parts) ? c.parts.map(p => `${p.partLabel}: ${p.target}`).join('\n\n') : '')
        }))
    }
];

const makeRecruitmentTrack = (canonical) => ({
    id: canonical.id,
    name: canonical.name,
    blurb: canonical.blurb || '',
    lead: canonical.lead || null,
    applyUrl: canonical.applyUrl || '',
    timeline: canonical.timeline || [],
    problemStatements: canonical.problemStatements || []
});

const initialRecruitment = {
    headline: 'CREW RECRUITMENT',
    intro: "Team Asterix recruits subsystem by subsystem, and each one selects on its own terms. Pick your subsystem below for its problem statement, its deadlines and its form.",
    notice: '',
    applyUrl: '',                                 // shared fallback Google Form
    applyLabel: 'Apply on the Google Form',
    freshers: {
        enabled: true,
        badge: 'FRESHERS RECRUITMENT 2026',
        title: 'Build the next Team Asterix machine',
        description: 'Applications are open for enthusiastic freshers who want to learn, build and compete with Team Asterix.',
        ctaLabel: 'Explore freshers recruitment',
        applyUrl: '',
        posterUrl: '',
        posterFit: 'cover',
        posterPosition: '50% 50%',
        timeline: [
            { id: 'freshers-timeline-1', label: 'Applications open', detail: 'Submit your details and tell us where you want to contribute.', date: '' },
            { id: 'freshers-timeline-2', label: 'Shortlist and induction', detail: 'Selected freshers meet the subsystem leads and begin onboarding.', date: '' }
        ],
        details: [
            { id: 'freshers-detail-1', title: 'Who can apply?', body: 'Freshers and students who are ready to contribute to an engineering subsystem can apply.' },
            { id: 'freshers-detail-2', title: 'What happens next?', body: 'Choose a subsystem, review its brief and follow the application instructions on the recruitment portal.' }
        ]
    },
    tracks: RECRUITMENT_TRACKS.map(makeRecruitmentTrack)
};

const normalizeRecruitmentTrack = (track, canonical) => {
    const canonicalTimeline = canonical.timeline || [];
    const canonicalStatements = canonical.problemStatements || [];
    const canonicalLead = canonical.lead || null;

    let userTimeline = canonicalTimeline;
    if (Array.isArray(track?.timeline) && track.timeline.length > 0) {
        userTimeline = canonicalTimeline.map((canItem) => {
            const match = track.timeline.find((t) => t?.id === canItem.id);
            if (!match) return canItem;
            return {
                ...canItem,
                ...match,
                date: canItem.date || match.date,
                detail: canItem.detail || match.detail
            };
        });
    }

    const userStatements = Array.isArray(track?.problemStatements) && track.problemStatements.length > 0
        ? track.problemStatements
        : canonicalStatements;

    return {
        ...makeRecruitmentTrack(canonical),
        ...(track && typeof track === 'object' ? track : {}),
        id: canonical.id,
        name: track?.name || canonical.name,
        blurb: track?.blurb || canonical.blurb || '',
        lead: canonicalLead,
        applyUrl: track?.applyUrl ?? canonical.applyUrl ?? '',
        timeline: userTimeline,
        problemStatements: userStatements
    };
};

/* Guarantees the recruitment blob always carries the shared header fields and
   exactly the three canonical tracks (merged by id), whatever a partial server
   document or an older backup holds. As a courtesy it also folds a legacy flat
   `problemStatements[]` — the pre-split shape — into the track its `subsystem`
   tag names, so a blob saved before this change is not lost. */
const normalizeRecruitment = (rec) => {
    const source = rec && typeof rec === 'object' ? rec : {};
    const incoming = Array.isArray(source.tracks) ? source.tracks : [];
    const tracks = RECRUITMENT_TRACKS.map((canonical) =>
        normalizeRecruitmentTrack(incoming.find((t) => t?.id === canonical.id), canonical)
    );

    if (!Array.isArray(source.tracks) && Array.isArray(source.problemStatements)) {
        for (const ps of source.problemStatements) {
            const tag = String(ps?.subsystem || '').toLowerCase();
            const target = tracks.find(
                (t) => tag && (t.id.includes(tag) || t.name.toLowerCase().includes(tag))
            ) || tracks[0];
            const rest = { ...ps };
            delete rest.subsystem;
            target.problemStatements = [...target.problemStatements, rest];
        }
    }

    return {
        headline: source.headline ?? initialRecruitment.headline,
        intro: source.intro ?? initialRecruitment.intro,
        notice: source.notice ?? '',
        applyUrl: source.applyUrl ?? '',
        applyLabel: source.applyLabel ?? initialRecruitment.applyLabel,
        freshers: {
            ...initialRecruitment.freshers,
            ...(source.freshers && typeof source.freshers === 'object' ? source.freshers : {}),
            details: Array.isArray(source.freshers?.details)
                ? source.freshers.details.map((detail, index) => ({
                    id: detail?.id || `freshers-detail-${index + 1}`,
                    title: detail?.title || '',
                    body: detail?.body || ''
                }))
                : initialRecruitment.freshers.details,
            timeline: Array.isArray(source.freshers?.timeline)
                ? source.freshers.timeline.map((item, index) => ({
                    id: item?.id || `freshers-timeline-${index + 1}`,
                    label: item?.label || '',
                    detail: item?.detail || '',
                    date: item?.date || ''
                }))
                : initialRecruitment.freshers.timeline
        },
        tracks
    };
};

const initialWorkshopData = {
    tracks: WORKSHOP_TRACKS
};

const STALE_WORKSHOP_DATES = [
    'From 1 Oct 2026 · 4 weeks',
    '1 Oct – 6 Nov 2026',
    '1 Oct - 6 Nov 2026',
    '29 Sep – 6 Nov 2026',
    '29 Sep – 29 Oct 2026'
];
const STALE_WORKSHOP_START_LABELS = [
    'First session 1 Oct 2026',
    'First session Wed 7 Oct 2026'
];
const STALE_WORKSHOP_REMOVED_IDS = ['sch-pt-b3', 'sch-pt-b4'];
const STALE_WORKSHOP_ITEM_DATES = [
    '1 Oct & 3 Oct',
    '8 Oct & 10 Oct',
    '15 Oct & 17 Oct',
    '22 Oct & 24 Oct',
    '6 Oct & 8 Oct',
    '13 Oct & 15 Oct',
    '20 Oct & 22 Oct',
    '27 Oct & 29 Oct',
    '7 – 9 Oct',
    '12 – 16 Oct',
    '19 – 23 Oct',
    '26 – 30 Oct',
    '2 – 6 Nov'
];

const normalizeWorkshop = (ws) => {
    const source = ws && typeof ws === 'object' ? ws : {};
    const tracksSource = source.tracks && typeof source.tracks === 'object' ? source.tracks : {};
    const mergedTracks = {};
    for (const key of Object.keys(WORKSHOP_TRACKS)) {
        const canonical = WORKSHOP_TRACKS[key];
        const incoming = tracksSource[key] || {};

        // Reconcile schedule: Ensure Week 0 is present for both software and powertrain,
        // and migrate legacy date ranges/stale strings to canonical dates.
        let reconciledSchedule = canonical.schedule;
        if (Array.isArray(incoming.schedule) && incoming.schedule.length > 0) {
            const validIncoming = incoming.schedule.filter(
                s => !STALE_WORKSHOP_REMOVED_IDS.includes(s?.id) && s?.label !== 'Bonus III' && s?.label !== 'Bonus IV'
            );
            const hasWeek0 = validIncoming.some(
                s => s?.id === `sch-${key === 'software' ? 'sw' : 'pt'}-0` || s?.label?.trim().toLowerCase() === 'week 0'
            );
            if (hasWeek0) {
                reconciledSchedule = validIncoming.map((item, idx) => {
                    const isStale = STALE_WORKSHOP_ITEM_DATES.includes(item?.date?.trim());
                    const canMatch = canonical.schedule.find(c => c.id === item?.id || c.label === item?.label);
                    return {
                        id: item?.id || canMatch?.id || `sch-${key}-${idx}`,
                        label: item?.label || canMatch?.label || `Week ${idx}`,
                        days: item?.days || canMatch?.days || '',
                        date: (isStale && canMatch) ? canMatch.date : (item?.date || canMatch?.date || ''),
                        title: item?.title || canMatch?.title || '',
                        venue: item?.venue !== undefined ? item.venue : (canMatch?.venue || 'To be announced'),
                        reportingInstructions: item?.reportingInstructions !== undefined ? item.reportingInstructions : (canMatch?.reportingInstructions || 'Arrive 10 minutes prior to session timing.')
                    };
                });
            } else {
                // Incoming cache is from pre-Week 0 schema -> load canonical schedule with Week 0
                reconciledSchedule = canonical.schedule;
            }
        }

        mergedTracks[key] = {
            ...canonical,
            ...incoming,
            id: canonical.id,
            name: incoming.name || canonical.name,
            syllabus: incoming.syllabus || canonical.syllabus,
            timing: incoming.timing || canonical.timing,
            dates: (incoming.dates && !STALE_WORKSHOP_DATES.includes(incoming.dates.trim())) ? incoming.dates : canonical.dates,
            days: incoming.days || canonical.days,
            startLabel: (incoming.startLabel && !STALE_WORKSHOP_START_LABELS.includes(incoming.startLabel.trim())) ? incoming.startLabel : canonical.startLabel,
            format: incoming.format || canonical.format,
            audience: incoming.audience || canonical.audience,
            venue: incoming.venue !== undefined ? incoming.venue : (canonical.venue || ''),
            reportingInstructions: incoming.reportingInstructions !== undefined ? incoming.reportingInstructions : (canonical.reportingInstructions || ''),
            bonus: canonical.bonus,
            ongoingWeek: incoming.ongoingWeek || canonical.ongoingWeek || 'Week 0',
            startDate: canonical.startDate,
            schedule: reconciledSchedule
        };
    }
    return {
        tracks: mergedTracks
    };
};

// Helper to ensure 4 subsystems are active without discarding user edits
const normalizeSubsystems = (subs) => {
    if (!subs || !Array.isArray(subs) || subs.length === 0) {
        return initialSubsystems;
    }
    const filtered = subs.filter(s => s.id !== 'drive-by-wire' && s.id !== 'brake-by-wire');

    if (!filtered.some(s => s.id === 'mechanical')) {
        const defaultMechanical = initialSubsystems.find(s => s.id === 'mechanical');
        if (defaultMechanical) filtered.splice(2, 0, defaultMechanical);
    }

    const requiredIds = ['software-perception', 'powertrain', 'mechanical', 'leads'];
    const result = requiredIds.map(id => {
        const defaultSys = initialSubsystems.find(s => s.id === id);
        const existing = filtered.find(s => s.id === id);
        if (existing) {
            // If existing powertrain carries legacy combustion defaults, migrate to current spec defaults
            if (id === 'powertrain' && (
                existing.specifications?.[0]?.value?.includes('Vanguard') ||
                existing.tagline?.includes('Continuous Variable')
            )) {
                return {
                    ...existing,
                    tagline: defaultSys?.tagline,
                    badge: defaultSys?.badge,
                    stat: defaultSys?.stat,
                    shortDesc: defaultSys?.shortDesc,
                    fullDesc: defaultSys?.fullDesc,
                    specifications: defaultSys?.specifications,
                    highlights: defaultSys?.highlights,
                    teamMembers: (existing.teamMembers || []).map(m => ({
                        ...m,
                        status: m.status || 'Active Member',
                        phone: m.phone || ''
                    }))
                };
            }
            const teamMembers = (existing.teamMembers || []).map(m => ({
                ...m,
                status: m.status || 'Active Member',
                phone: m.phone || ''
            }));
            return {
                ...defaultSys,
                ...existing,
                specifications: (existing.specifications && existing.specifications.length > 0) ? existing.specifications : (defaultSys?.specifications || []),
                highlights: (existing.highlights && existing.highlights.length > 0) ? existing.highlights : (defaultSys?.highlights || []),
                teamMembers
            };
        }
        return defaultSys;
    }).filter(Boolean);

    return result.length === 4 ? result : initialSubsystems;
};

export function WebsiteDataProvider({ children }) {
    const [isServerConnected, setIsServerConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [syncState, setSyncState] = useState('idle'); // 'idle' | 'saving' | 'synced' | 'error'
    const [syncError, setSyncError] = useState(null);
    const isInitialMount = useRef(true);
    /* The `lastModified` of the last payload the server handed us. Anything
       different on `siteData` is therefore a local edit that has not been
       acknowledged yet. */
    const lastServerStamp = useRef(null);
    /* True from the moment an admin edit lands until the server confirms it.
       While it is set, a poll must not overwrite state -- see the merge below. */
    const hasPendingEdit = useRef(false);

    // Initial state from localStorage or defaults
    const [siteData, setSiteData] = useState(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    hero: parsed.hero || initialHeroData,
                    story: parsed.story || initialStoryText,
                    subsystems: normalizeSubsystems(parsed.subsystems),
                    gallery: parsed.gallery || initialGalleryItems,
                    updates: parsed.updates || initialUpdates,
                    contact: parsed.contact || initialContactInfo,
                    accounts: parsed.accounts || initialAccounts,
                    sponsorship: parsed.sponsorship || initialSponsorshipData,
                    recruitment: normalizeRecruitment(parsed.recruitment),
                    workshop: normalizeWorkshop(parsed.workshop),
                    lastModified: parsed.lastModified || '1970-01-01T00:00:00.000Z'
                };
            }
        } catch (e) {
            console.error("Failed to load website data from localStorage:", e);
        }
        return {
            hero: initialHeroData,
            story: initialStoryText,
            subsystems: initialSubsystems,
            gallery: initialGalleryItems,
            updates: initialUpdates,
            contact: initialContactInfo,
            accounts: initialAccounts,
            sponsorship: initialSponsorshipData,
            recruitment: initialRecruitment,
            workshop: normalizeWorkshop(initialWorkshopData),
            lastModified: '1970-01-01T00:00:00.000Z'
        };
    });

    const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
    const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);

    // Fetch live website data from database API (MongoDB Atlas on Render) with background auto-refresh
    const fetchFromDatabase = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setIsLiveRefreshing(true);
        try {
            const res = await fetch(apiUrl('/api/site-data'));
            if (res.ok) {
                const data = await res.json();
                if (data && (data.hero || data.subsystems?.length > 0)) {
                    setSiteData(prev => {
                        /* An edit of ours is still on its way to the server, so
                           nothing the server says right now can be newer than what
                           is on screen. Checked before the timestamps because the
                           timestamps cannot settle this: `localTime` comes from
                           this browser's clock and `remoteTime` from whichever
                           machine wrote last, so a device running a few seconds
                           fast made every other admin's poll discard their own
                           unsaved work. That is what made an uploaded photo appear
                           and then vanish on the next refresh -- the picture had
                           reached the CDN, but the record naming it was overwritten
                           in the second between the edit and the debounced save. */
                        if (hasPendingEdit.current) {
                            return prev;
                        }

                        const remoteTime = new Date(data.lastModified || 0).getTime();
                        const localTime = new Date(prev.lastModified || 0).getTime();

                        // Preserve local edits if newer than server timestamp
                        if (localTime > remoteTime && remoteTime > 0) {
                            return prev;
                        }

                        const merged = {
                            ...prev,
                            hero: data.hero || prev.hero,
                            story: data.story || prev.story,
                            subsystems: (data.subsystems && data.subsystems.length > 0) ? normalizeSubsystems(data.subsystems) : prev.subsystems,
                            gallery: (data.gallery && data.gallery.length > 0) ? data.gallery : prev.gallery,
                            updates: (data.updates && data.updates.length > 0) ? data.updates : prev.updates,
                            contact: data.contact || prev.contact,
                            sponsorship: data.sponsorship || prev.sponsorship || initialSponsorshipData,
                            recruitment: normalizeRecruitment(data.recruitment || prev.recruitment),
                            workshop: normalizeWorkshop(data.workshop || prev.workshop),
                            lastModified: data.lastModified || prev.lastModified
                        };
                        try {
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
                        } catch { /* ignore */ }
                        lastServerStamp.current = merged.lastModified;
                        return merged;
                    });
                    setIsServerConnected(true);
                    setLastRefreshedAt(new Date());
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.warn("Backend database API notice:", err.message);
            return false;
        } finally {
            if (!isSilent) setIsLoading(false);
            setIsLiveRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        Promise.resolve().then(() => fetchFromDatabase(false));

        // Live refresh polling (every 3.5 seconds)
        const pollInterval = setInterval(() => {
            fetchFromDatabase(true);
        }, 3500);

        // Immediate refresh on tab focus / visibility change
        const handleFocus = () => {
            fetchFromDatabase(true);
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [fetchFromDatabase]);

    // Save to database (Express API / MongoDB Atlas)
    const syncToServer = useCallback(async (dataToSync) => {
        if (!dataToSync) return false;

        setSyncState('saving');
        const payload = {
            hero: dataToSync.hero,
            story: dataToSync.story,
            subsystems: dataToSync.subsystems,
            gallery: dataToSync.gallery,
            updates: dataToSync.updates,
            contact: dataToSync.contact,
            sponsorship: dataToSync.sponsorship || initialSponsorshipData,
            recruitment: normalizeRecruitment(dataToSync.recruitment),
            workshop: normalizeWorkshop(dataToSync.workshop),
            lastModified: new Date().toISOString()
        };

        // 1. Primary: Express Server API (MongoDB Atlas on Render - 50MB payload support)
        //
        // If there is no token, there is no save. This used to silently log in
        // as `admin` with a password written a few lines below, which meant that
        // password shipped inside the production bundle -- anyone who opened
        // devtools could read it, mint a SuperAdmin token, and rewrite the site.
        // An unauthenticated visitor now simply keeps their local copy.
        const token = sessionStorage.getItem(AUTH_TOKEN_KEY);

        if (token) {
            try {
                const res = await fetch(apiUrl('/api/site-data'), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const respData = await res.json();
                    setIsServerConnected(true);
                    setSyncState('synced');
                    setSyncError(null);
                    return respData.lastModified || true;
                }
            } catch (err) {
                console.warn('Backend server save notice:', err.message);
            }
        }

        if (token) {
            setSyncState('error');
            setSyncError('Backend server unreachable. Changes saved locally.');
            return false;
        }

        /* No token means no PUT happened. This used to report 'synced' and
           return true, so the console showed "Cloud Synced" while the edit sat
           in localStorage and never reached the site -- which is exactly what
           "the admin is not synced with the website" looks like from outside.
           The token lives in sessionStorage, so it is gone after a tab is
           closed or the browser restarts, and the console otherwise gives no
           sign of it. */
        setSyncState('error');
        setSyncError('Not signed in, so nothing was saved to the server. Log out and back in, then press Sync Cloud.');
        return false;
    }, []);

    // Save changes to localStorage and automatically sync to backend database if admin is authenticated
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(siteData));
        } catch (e) {
            console.error("Failed to save website data to localStorage:", e);
        }

        /* Guarded on the token alone, which is the thing `syncToServer`
           actually needs. It used to accept a session object OR a token, so a
           browser holding a stale session with no token got past this guard,
           reached a `syncToServer` that could not send anything, and was told
           the save had succeeded. */
        if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) {
            return;
        }

        /* A change that matches the last thing the server sent is that payload
           arriving, not somebody typing. Only a real edit blocks the poll, or a
           reader would freeze their own page simply by receiving an update. */
        if (siteData.lastModified === lastServerStamp.current) {
            return undefined;
        }
        hasPendingEdit.current = true;

        // Debounce syncing manual admin edits to database
        const timer = setTimeout(() => {
            syncToServer(siteData).then((resData) => {
                if (resData) {
                    const newStamp = typeof resData === 'string' ? resData : siteData.lastModified;
                    /* Cleared only on success. A failed save keeps the poll
                       locked out, which is the right way round: the edit is the
                       only copy that exists and must not be silently replaced by
                       the stale server one. `syncError` tells the admin. */
                    lastServerStamp.current = newStamp;
                    if (newStamp !== siteData.lastModified) {
                        setSiteData(prev => ({ ...prev, lastModified: newStamp }));
                    }
                    hasPendingEdit.current = false;
                }
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [siteData, syncToServer]);


    // Update helpers
    const updateHero = (newHero) => {
        setSiteData(prev => ({
            ...prev,
            hero: { ...prev.hero, ...newHero },
            lastModified: new Date().toISOString()
        }));
    };

    const updateStory = (newStory) => {
        setSiteData(prev => ({
            ...prev,
            story: newStory,
            lastModified: new Date().toISOString()
        }));
    };

    const updateContact = (newContact) => {
        setSiteData(prev => ({
            ...prev,
            contact: { ...prev.contact, ...newContact },
            lastModified: new Date().toISOString()
        }));
    };

    const updateSubsystem = (subsystemId, updatedFields) => {
        setSiteData(prev => ({
            ...prev,
            subsystems: prev.subsystems.map(s => 
                s.id === subsystemId ? { ...s, ...updatedFields } : s
            ),
            lastModified: new Date().toISOString()
        }));
    };

    const addTeamMember = (subsystemId, newMember) => {
        setSiteData(prev => ({
            ...prev,
            subsystems: prev.subsystems.map(s => {
                if (s.id === subsystemId) {
                    return {
                        ...s,
                        teamMembers: [...(s.teamMembers || []), newMember]
                    };
                }
                return s;
            }),
            lastModified: new Date().toISOString()
        }));
    };

    const updateTeamMember = (subsystemId, memberIndex, updatedMember) => {
        setSiteData(prev => ({
            ...prev,
            subsystems: prev.subsystems.map(s => {
                if (s.id === subsystemId) {
                    const members = [...(s.teamMembers || [])];
                    members[memberIndex] = { ...members[memberIndex], ...updatedMember };
                    return { ...s, teamMembers: members };
                }
                return s;
            }),
            lastModified: new Date().toISOString()
        }));
    };

    const deleteTeamMember = (subsystemId, memberIndex) => {
        setSiteData(prev => ({
            ...prev,
            subsystems: prev.subsystems.map(s => {
                if (s.id === subsystemId) {
                    const members = (s.teamMembers || []).filter((_, idx) => idx !== memberIndex);
                    return { ...s, teamMembers: members };
                }
                return s;
            }),
            lastModified: new Date().toISOString()
        }));
    };

    const moveTeamMember = (subsystemId, fromIndex, toIndex) => {
        setSiteData(prev => ({
            ...prev,
            subsystems: prev.subsystems.map(s => {
                if (s.id === subsystemId) {
                    const members = [...(s.teamMembers || [])];
                    if (toIndex < 0 || toIndex >= members.length) return s;
                    const [moved] = members.splice(fromIndex, 1);
                    members.splice(toIndex, 0, moved);
                    return { ...s, teamMembers: members };
                }
                return s;
            }),
            lastModified: new Date().toISOString()
        }));
    };

    const addGalleryItem = (newItem) => {
        setSiteData(prev => ({
            ...prev,
            gallery: [newItem, ...prev.gallery],
            lastModified: new Date().toISOString()
        }));
    };

    const updateGalleryItem = (id, updatedFields) => {
        setSiteData(prev => ({
            ...prev,
            gallery: prev.gallery.map(item => item.id === id ? { ...item, ...updatedFields } : item),
            lastModified: new Date().toISOString()
        }));
    };

    const deleteGalleryItem = (id) => {
        setSiteData(prev => ({
            ...prev,
            gallery: prev.gallery.filter(item => item.id !== id),
            lastModified: new Date().toISOString()
        }));
    };

    const addUpdate = (newUpdate) => {
        setSiteData(prev => ({
            ...prev,
            updates: [newUpdate, ...prev.updates],
            lastModified: new Date().toISOString()
        }));
    };

    const updateUpdate = (id, updatedFields) => {
        setSiteData(prev => ({
            ...prev,
            updates: prev.updates.map(item => item.id === id ? { ...item, ...updatedFields } : item),
            lastModified: new Date().toISOString()
        }));
    };

    const deleteUpdate = (id) => {
        setSiteData(prev => ({
            ...prev,
            updates: prev.updates.filter(item => item.id !== id),
            lastModified: new Date().toISOString()
        }));
    };

    const addAccount = (account) => {
        setSiteData(prev => ({
            ...prev,
            accounts: [...prev.accounts, account],
            lastModified: new Date().toISOString()
        }));
    };

    const updateAccount = (id, fields) => {
        setSiteData(prev => ({
            ...prev,
            accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, ...fields } : acc),
            lastModified: new Date().toISOString()
        }));
    };

    const deleteAccount = (id) => {
        setSiteData(prev => ({
            ...prev,
            accounts: prev.accounts.filter(acc => acc.id !== id),
            lastModified: new Date().toISOString()
        }));
    };

    const updateSponsorship = (fields) => {
        setSiteData(prev => ({
            ...prev,
            sponsorship: { ...(prev.sponsorship || initialSponsorshipData), ...fields },
            lastModified: new Date().toISOString()
        }));
    };

    /* One setter for the whole recruitment blob. The admin editor manages the
       timeline and problem-statement arrays wholesale (add / edit / reorder /
       remove) and hands the finished field back through here, so there is a
       single path the debounced sync watches. */
    const updateRecruitment = (fields) => {
        setSiteData(prev => ({
            ...prev,
            recruitment: normalizeRecruitment({ ...(prev.recruitment || initialRecruitment), ...fields }),
            lastModified: new Date().toISOString()
        }));
    };

    const updateWorkshop = (fields) => {
        setSiteData(prev => ({
            ...prev,
            workshop: normalizeWorkshop({ ...(prev.workshop || initialWorkshopData), ...fields }),
            lastModified: new Date().toISOString()
        }));
    };

    const resetToDefaults = () => {
        const defaults = {
            hero: initialHeroData,
            story: initialStoryText,
            subsystems: initialSubsystems,
            gallery: initialGalleryItems,
            updates: initialUpdates,
            contact: initialContactInfo,
            accounts: initialAccounts,
            sponsorship: initialSponsorshipData,
            recruitment: initialRecruitment,
            workshop: normalizeWorkshop(initialWorkshopData),
            lastModified: new Date().toISOString()
        };
        setSiteData(defaults);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
        syncToServer(defaults);
    };

    const loadFromBackup = (data) => {
        const updated = {
            ...data,
            lastModified: new Date().toISOString()
        };
        setSiteData(updated);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        syncToServer(updated);
    };

    return (
        <WebsiteDataContext.Provider value={{
            siteData,
            isServerConnected,
            isLoading,
            lastRefreshedAt,
            isLiveRefreshing,
            forceLiveRefresh: () => fetchFromDatabase(false),
            fetchFromDatabase,
            syncToServer,
            updateHero,
            updateStory,
            updateContact,
            updateSubsystem,
            addTeamMember,
            updateTeamMember,
            deleteTeamMember,
            moveTeamMember,
            addGalleryItem,
            updateGalleryItem,
            deleteGalleryItem,
            addUpdate,
            updateUpdate,
            deleteUpdate,
            addAccount,
            updateAccount,
            deleteAccount,
            updateSponsorship,
            updateRecruitment,
            updateWorkshop,
            syncState,
            syncError,
            resetToDefaults,
            loadFromBackup,
            AUTH_SESSION_KEY,
            AUTH_TOKEN_KEY
        }}>
            {children}
        </WebsiteDataContext.Provider>
    );
}

const fallbackWebsiteData = {
    siteData: {
        hero: initialHeroData,
        story: initialStoryText,
        subsystems: initialSubsystems,
        gallery: initialGalleryItems,
        updates: initialUpdates,
        contact: initialContactInfo,
        accounts: initialAccounts,
        sponsorship: initialSponsorshipData,
        recruitment: initialRecruitment,
        workshop: normalizeWorkshop(initialWorkshopData),
        lastModified: '1970-01-01T00:00:00.000Z'
    },
    isServerConnected: false,
    isLoading: false,
    lastRefreshedAt: new Date(),
    isLiveRefreshing: false,
    forceLiveRefresh: () => {},
    fetchFromDatabase: async () => {},
    syncToServer: async () => {},
    updateHero: () => {},
    updateStory: () => {},
    updateContact: () => {},
    updateSubsystem: () => {},
    addTeamMember: () => {},
    updateTeamMember: () => {},
    deleteTeamMember: () => {},
    moveTeamMember: () => {},
    addGalleryItem: () => {},
    updateGalleryItem: () => {},
    deleteGalleryItem: () => {},
    addUpdate: () => {},
    updateUpdate: () => {},
    deleteUpdate: () => {},
    addAccount: () => {},
    updateAccount: () => {},
    deleteAccount: () => {},
    updateSponsorship: () => {},
    updateRecruitment: () => {},
    updateWorkshop: () => {},
    syncState: 'idle',
    syncError: null,
    resetToDefaults: () => {},
    loadFromBackup: () => {},
    AUTH_SESSION_KEY,
    AUTH_TOKEN_KEY
};

export function useWebsiteData() {
    const ctx = useContext(WebsiteDataContext);
    if (!ctx) {
        return fallbackWebsiteData;
    }
    return ctx;
}

