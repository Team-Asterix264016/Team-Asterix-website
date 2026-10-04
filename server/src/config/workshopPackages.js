/**
 * Workshop tracks and packages -- the single source of truth for what the
 * workshop page shows and what the server charges.
 *
 * This file is imported by both the backend and the front end
 * (src/components/WorkshopPage.jsx), so keep it dependency-free plain data.
 *
 * `price` is in whole rupees; `null` means "not announced yet" -- the page shows
 * TBD and the server refuses to take payment for that package. The
 * registration route reads the price from here and nowhere else: the client
 * sends a package id, never an amount, so a tampered request cannot change
 * what gets charged.
 *
 * `syllabus` is a path under the front end's public/ directory (or a full
 * Drive URL).
 */

export const WORKSHOP_CURRENCY = 'INR';

export const WORKSHOP_TRACKS = {
    software: {
        id: 'software',
        name: 'Software & Perception',
        tagline: 'Learn the software behind an autonomous vehicle.',
        overview:
            'A four-week hands-on workshop covering System Design, Computer Vision, ML, ROS and Agentic AI, with mini-projects and guided resources.',
        dates: '29 Sep – 7 Nov 2026',
        startLabel: 'Pre-session talk 29 Sep 2026 · first session Tue 6 Oct 2026',
        // startDate: ISO date (YYYY-MM-DD) of the first session in IST — used by the
        // WorkshopPage to auto-detect which schedule row is currently ongoing.
        startDate: '2026-09-29',
        days: 'Tuesday & Thursday',
        timing: '5:10 PM – 6:50 PM',
        format: '8 core sessions over 4 weeks + 2 bonus sessions',
        audience: 'Beginners welcome. No prior knowledge needed.',
        syllabus: '/workshop/software-perception-syllabus.pdf',
        venue: 'Autonomous Systems & Robotics Lab (Room 302, PSG iTech)',
        reportingInstructions: 'Bring laptops with chargers. Ubuntu 22.04 LTS or dual boot recommended. Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.',
        ongoingWeek: 'Week 0',
        topics: [
            {
                title: 'ROS',
                points: [
                    'Nodes, topics and messages; basic ROS commands',
                    'The publisher–subscriber model, with an on-vehicle example',
                    'Mini project'
                ]
            },
            {
                title: 'System Design',
                points: [
                    'Breaking an ATV into inputs, processing and outputs',
                    'Block diagrams for data flow, power and linkages',
                    'Mini project'
                ]
            },
            {
                title: 'ML & Computer Vision',
                points: [
                    'Pixels, resolutions, channels; resizing, cropping, Gaussian blur',
                    'Colour and contour tracking',
                    'Supervised vs unsupervised learning; linear regression',
                    'Mini project'
                ]
            },
            {
                title: 'Agentic AI',
                points: [
                    'Generative AI, agents and agentic systems',
                    'Prompting, tools and decision making',
                    'Engineering applications; mini project'
                ]
            }
        ],
        schedule: [
            {
                id: 'sch-sw-0',
                label: 'Week 0',
                days: 'Tuesday',
                date: '29 Sep',
                title: 'Pre-workshop online beginner session',
                venue: 'Online (Meeting link will be shared)',
                reportingInstructions: 'Online pre-session talk covering prerequisites, requirements, and necessary setup for Ubuntu 22.04 LTS / ROS.'
            },
            {
                id: 'sch-sw-1',
                label: 'Week 1',
                days: 'Tue & Thu',
                date: '6 & 8 Oct',
                title: 'System Design',
                venue: 'Autonomous Systems & Robotics Lab (Room 302, PSG iTech)',
                reportingInstructions: 'Bring laptops with chargers. Ubuntu 22.04 LTS or dual boot recommended. Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-sw-2',
                label: 'Week 2',
                days: 'Tue & Thu',
                date: '13 & 15 Oct',
                title: 'Computer Vision · ML',
                venue: 'Autonomous Systems & Robotics Lab (Room 302, PSG iTech)',
                reportingInstructions: 'Bring laptops with chargers and Python 3 / OpenCV environment ready. Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-sw-b1',
                label: 'Bonus I',
                days: 'Saturday',
                date: '17 Oct',
                title: 'Powertrain & Embedded / Electrical',
                venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
                reportingInstructions: 'Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-sw-3',
                label: 'Week 3',
                days: 'Tue & Thu',
                date: '20 & 22 Oct',
                title: 'ML · ROS',
                venue: 'Autonomous Systems & Robotics Lab (Room 302, PSG iTech)',
                reportingInstructions: 'Bring laptops with ROS 2 / ROS packages installed. Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-sw-b2',
                label: 'Bonus II',
                days: 'Saturday',
                date: '24 Oct',
                title: 'Mechanical Fundamentals',
                venue: 'BAJA Workshop / Mechanical Bay (PSG iTech)',
                reportingInstructions: 'Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-sw-4',
                label: 'Week 4',
                days: 'Tue & Thu',
                date: '27 & 29 Oct',
                title: 'Agentic AI I · Agentic AI II',
                venue: 'Autonomous Systems & Robotics Lab (Room 302, PSG iTech)',
                reportingInstructions: 'Bring laptops with chargers for interactive AI agent development and mini projects. Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            }
        ],
        bonus: 'Three complimentary sessions: Powertrain & Embedded/Electrical, Mechanical Fundamentals, and Cross-track Masterclasses.'
    },
    powertrain: {
        id: 'powertrain',
        name: 'Electronics & Powertrain',
        tagline: 'Circuits, microcontrollers, motors and PCB design, from first principles.',
        overview:
            'Build a solid foundation in circuits, electronic components, microcontrollers and motors, ' +
            'and see how they come together in the electrical system of an autonomous vehicle. Includes ' +
            'hands-on sessions with circuit simulation and PCB design tools.',
        dates: '29 Sep – 2 Nov 2026',
        startLabel: 'Pre-session talk 29 Sep 2026 · first session Wed 7 Oct 2026',
        // startDate: ISO date (YYYY-MM-DD) of the first session in IST.
        startDate: '2026-09-29',
        days: 'Monday, Wednesday & Friday',
        timing: '5:15 PM – 6:45 PM',
        format: '9 talks + 3 hands-on sessions + 3 complimentary sessions (21+ hours)',
        // Optional value callout shown on the track card.
        highlight: '21+ hours of learning · less than 50 an hour',
        audience: 'Beginners welcome. No prior knowledge needed.',
        syllabus: '/workshop/powertrain-syllabus.pdf',
        venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
        reportingInstructions: 'Basic stationery and laptop with LTspice installed required. Safety shoes required inside the lab.',
        ongoingWeek: 'Week 0',
        topics: [
            {
                title: 'Circuits & Devices',
                points: [
                    'Voltage, current, Ohm’s and Kirchhoff’s laws, RC circuits',
                    'Diodes, BJTs and MOSFETs as switches',
                    'Hands-on: simulating a transistor switch (LTspice)'
                ]
            },
            {
                title: 'Microcontrollers',
                points: [
                    'ESP32 basics and your first Arduino IDE program',
                    'Vehicle start-up sequence: safety interlocks and kill switches',
                    'Hands-on: build the start-up sequence in Tinkercad'
                ]
            },
            {
                title: 'Analog & Power',
                points: [
                    'Buck and boost converters vs linear regulators',
                    'Op-amps and filters for noisy sensor signals',
                    'How electric motors work: DC, BLDC, stepper, servo'
                ]
            },
            {
                title: 'PCB Design',
                points: [
                    'What a PCB is and how it is made',
                    'Laying out a board and checking the design',
                    'Hands-on: design your first PCB'
                ]
            }
        ],
        schedule: [
            {
                id: 'sch-pt-0',
                label: 'Week 0',
                days: 'Tuesday',
                date: '29 Sep',
                title: 'Pre-workshop online beginner session',
                venue: 'Online (Meeting link will be shared)',
                reportingInstructions: 'Online pre-session talk covering prerequisites, software requirements, and overview.'
            },
            {
                id: 'sch-pt-1',
                label: 'Week 1',
                days: 'Wed & Fri',
                date: '7 & 9 Oct',
                title: 'Circuit Basics · Diodes & Transistors',
                venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
                reportingInstructions: 'Basic stationery required. Arrive 10 minutes prior to session timing. Safety shoes required inside the lab.'
            },
            {
                id: 'sch-pt-2',
                label: 'Week 2',
                days: 'Mon, Wed & Fri',
                date: '12, 14 & 16 Oct',
                title: 'Hands-on 1 · ESP32 Basics · Vehicle Start-up Sequence',
                venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
                reportingInstructions: 'Bring laptop with LTspice / PSpice and Arduino IDE installed. Safety shoes required inside the lab. Arrive 10 minutes prior to session timing.'
            },
            {
                id: 'sch-pt-b1',
                label: 'Bonus I',
                days: 'Saturday',
                date: '17 Oct',
                title: 'Autonomous Perception',
                venue: 'Autonomous Systems & Robotics Lab (Room 302, PSG iTech)',
                reportingInstructions: 'Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-pt-3',
                label: 'Week 3',
                days: 'Mon, Wed & Fri',
                date: '19, 21 & 23 Oct',
                title: 'Hands-on 2 · Buck & Boost · Op-Amps & Filters',
                venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
                reportingInstructions: 'Bring laptop with free Tinkercad account created and Arduino IDE ready. Safety shoes required inside the lab. Arrive 10 minutes prior to session timing.'
            },
            {
                id: 'sch-pt-b2',
                label: 'Bonus II',
                days: 'Saturday',
                date: '24 Oct',
                title: 'Mechanical Fundamentals',
                venue: 'BAJA Workshop / Mechanical Bay (PSG iTech)',
                reportingInstructions: 'Arrive 10 minutes prior to session timing. Closed-toe shoes mandatory.'
            },
            {
                id: 'sch-pt-4',
                label: 'Week 4',
                days: 'Mon, Wed & Fri',
                date: '26, 28 & 30 Oct',
                title: 'Electric Motors · PCB Design I · PCB Design II',
                venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
                reportingInstructions: 'Bring laptop for PCB layout demonstration. Safety shoes required inside the lab. Arrive 10 minutes prior to session timing.'
            },
            {
                id: 'sch-pt-5',
                label: 'Week 5',
                days: 'Monday',
                date: '2 Nov',
                title: 'Hands-on 3',
                venue: 'Electrical Machines & Power Electronics Lab (Ground Floor, PSG iTech)',
                reportingInstructions: 'Bring laptop with PCB design software (EasyEDA / KiCad) installed. Safety shoes required inside the lab. Arrive 10 minutes prior to session timing.'
            }
        ],
        bonus: 'Three complimentary sessions: Autonomous Perception, Mechanical Fundamentals, and Cross-track Masterclasses.'
    }
};

export const WORKSHOP_PACKAGES = [
    {
        id: 'software',
        name: 'Software & Perception',
        price: 1000,
        tracksIncluded: ['software'],
        open: true
    },
    {
        id: 'powertrain',
        name: 'Electronics & Powertrain',
        price: 1000,
        tracksIncluded: ['powertrain'],
        open: false
    },
    {
        id: 'combo',
        name: 'Combo: both tracks',
        price: 1750,
        tracksIncluded: ['software', 'powertrain'],
        open: false
    }
];

// Maximum seats cap for tracks
export const POWERTRAIN_MAX_SEATS = 160;
export const SOFTWARE_MAX_SEATS = 161;

// Reopening & Closing window for Software track in IST
export const SOFTWARE_REOPEN_TIME = '2026-10-05T06:00:00+05:30'; // Monday morning 6:00 AM IST
export const SOFTWARE_CLOSE_DEADLINE = '2026-10-06T23:59:59+05:30'; // Tuesday night 11:59:59 PM IST

export const SOFTWARE_PAUSE_REASON = 
    "Software track registrations are temporarily paused while our team resolves a technical issue on the banking partner's side. Registrations will reopen tomorrow (Monday) morning at 6:00 AM.";

export const SOFTWARE_SCHEDULE_SUMMARY = 
    "Registrations reopen Monday morning (6:00 AM) and end Tuesday, 6 October at 11:59 PM or when remaining seats are filled (whichever comes first).";

/**
 * Calculates current status of Software track registration based on time and paid count.
 */
export function getSoftwareRegistrationState(nowMs = Date.now(), totalPaid = 0) {
    const reopenMs = new Date(SOFTWARE_REOPEN_TIME).getTime();
    const deadlineMs = new Date(SOFTWARE_CLOSE_DEADLINE).getTime();

    const isPaused = nowMs < reopenMs;
    const isPastDeadline = nowMs > deadlineMs;
    const isCapacityFull = totalPaid >= SOFTWARE_MAX_SEATS;
    const seatsLeft = Math.max(0, SOFTWARE_MAX_SEATS - totalPaid);

    const isClosed = isPastDeadline || isCapacityFull;
    const isOpen = !isPaused && !isClosed;

    return {
        isPaused,
        isPastDeadline,
        isCapacityFull,
        isClosed,
        isOpen,
        seatsLeft,
        maxSeats: SOFTWARE_MAX_SEATS,
        reopenTime: SOFTWARE_REOPEN_TIME,
        deadline: SOFTWARE_CLOSE_DEADLINE,
        pauseReason: SOFTWARE_PAUSE_REASON,
        scheduleSummary: SOFTWARE_SCHEDULE_SUMMARY
    };
}

// Options for the Department dropdown, kept in alphabetical order. The server
// only accepts these exact values.
export const WORKSHOP_DEPARTMENTS = [
    'Artificial Intelligence and Data Science',
    'Civil Engineering',
    'Computer Science and Engineering',
    'Electrical and Electronics Engineering',
    'Electronics and Communication Engineering',
    'Electronics Engineering (VLSI Design and Technology)',
    'Instrumentation and Control Engineering',
    'Mechanical Engineering',
    'Robotics and Artificial Intelligence'
].sort((a, b) => a.localeCompare(b));

export function getWorkshopPackage(id) {
    const key = String(id || '').toLowerCase().trim();
    return WORKSHOP_PACKAGES.find(p => p.id === key) || null;
}

export function isPriced(pkg) {
    return Boolean(pkg) && Number.isFinite(pkg.price) && pkg.price > 0;
}

