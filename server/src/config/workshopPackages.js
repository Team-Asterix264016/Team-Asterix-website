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
            'A five-week hands-on workshop covering System Design, Computer Vision, Machine Learning, ROS 2 and Agentic AI, with mini-projects for every session and two larger capstone projects.',
        dates: '6 Oct – 15 Nov 2026',
        startLabel: 'Pre-workshop session Tue 6 Oct 2026 · First core session Thu 8 Oct 2026',
        startDate: '2026-10-06',
        days: 'Tue & Thu (Core) · Sat & Sun (Industry Sessions)',
        timing: 'Core: 5:10 PM – 6:50 PM · Weekend Sessions: Morning & Afternoon slots',
        format: '8 core sessions + 1 online pre-workshop + 2 major projects + 3 industry expert sessions (5 slots)',
        audience: 'First-year & second-year students welcome. No prior knowledge needed.',
        syllabus: '/workshop/software-perception-syllabus.pdf',
        venue: 'Mechanical Seminar Hall / Robotics Lab',
        reportingInstructions: 'Bring laptops with chargers. Ubuntu 24.04 / WSL2 & Python ready. Arrive 10 minutes prior to session timing.',
        ongoingWeek: 'Completed',
        topics: [
            {
                title: 'System Design',
                points: [
                    'Decomposing an ATV into inputs, processing and outputs',
                    'Sense -> Plan -> Act loop & loop timing',
                    'Block diagramming conventions & interface contracts',
                    'Mini Projects 1 & 2'
                ]
            },
            {
                title: 'Computer Vision',
                points: [
                    'Pixels, resolution, channels (NumPy arrays)',
                    'OpenCV image manipulation, Gaussian blur',
                    'HSV thresholding, contours & object tracking',
                    'Mini Project 3 + Project 1 Assigned'
                ]
            },
            {
                title: 'Machine Learning',
                points: [
                    'Supervised vs unsupervised learning paradigms',
                    'Working with vehicle CSV logs in pandas & matplotlib',
                    'K-Means clustering & elbow method',
                    'Linear regression, loss & evaluation (MAE, R²)',
                    'Mini Projects 4 & 5'
                ]
            },
            {
                title: 'ROS 2 & Agentic AI',
                points: [
                    'ROS 2 nodes, topics, pub-sub model & CLI',
                    'Agentic AI: LLMs, agent loop (perceive-reason-plan-act)',
                    'Tools, guardrails, decision making & vehicle automation',
                    'Mini Projects 6, 7 & 8 + Project 2 Assigned'
                ]
            }
        ],
        schedule: [
            {
                id: 'sch-sw-0',
                label: 'Pre-Workshop',
                days: 'Tuesday',
                date: '6 Oct',
                title: 'Pre-Workshop Session: Set Up Once, Build All Month',
                instructor: 'All Team Members',
                venue: 'Online Session',
                type: 'online',
                project: 'Prerequisites & Setup checklist'
            },
            {
                id: 'sch-sw-1',
                label: 'Session 1',
                days: 'Thursday',
                date: '8 Oct',
                title: 'System Design I: Subsystem Thinking',
                instructor: 'Rithvin, Preethika',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 1 (System Design)'
            },
            {
                id: 'sch-sw-2',
                label: 'Session 2',
                days: 'Tuesday',
                date: '13 Oct',
                title: 'System Design II: Block Diagramming',
                instructor: 'Rithvin, Preethika',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 2 (System Design)'
            },
            {
                id: 'sch-sw-3',
                label: 'Session 3',
                days: 'Thursday',
                date: '15 Oct',
                title: 'Computer Vision: Teaching the Car to See',
                instructor: 'Mr. Mahavishnu V C',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 3 (CV) + Project 1 assigned'
            },
            {
                id: 'sch-sw-4',
                label: 'Session 4',
                days: 'Thursday',
                date: '22 Oct',
                title: 'ML I: Core Paradigms & Unsupervised Learning',
                instructor: 'Ms. Bavana, Ms. Swethaswini, Ms. Lakshana',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 4 (ML)'
            },
            {
                id: 'sch-sw-ind2',
                label: 'Industry Session',
                days: 'Saturday',
                date: '24 Oct',
                title: 'Automotive Functional Safety',
                instructor: 'Mrs. Sasikala (Robert Bosch)',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Functional Safety in ADAS & EVs'
            },
            {
                id: 'sch-sw-5',
                label: 'Session 5',
                days: 'Tuesday',
                date: '27 Oct',
                title: 'Agentic AI I: Generative AI and Autonomous Agents',
                instructor: 'Rithvin, Arya',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 5 (Agentic AI)'
            },
            {
                id: 'sch-sw-7',
                label: 'Session 6',
                days: 'Tuesday',
                date: '3 Nov',
                title: 'Agentic AI II: Tools, Guardrails and Decisions',
                instructor: 'Josna',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 6 (Agentic AI)'
            },
            {
                id: 'sch-sw-8',
                label: 'Session 7',
                days: 'Tuesday',
                date: '10 Nov',
                title: 'Machine Learning: Supervised Learning from Basics',
                instructor: 'Ratheeswar',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Mini Project 7 (Supervised Learning)'
            },
            {
                id: 'sch-sw-6',
                label: 'Session 8',
                days: 'Friday',
                date: '13 Nov',
                title: 'Basic Dev Tools & Environment Workflows',
                instructor: 'Tanishka, Kanishka',
                venue: 'Mechanical Seminar Hall',
                type: 'lecture',
                project: 'Toolchains, CLI, Linux & Git'
            },
            {
                id: 'sch-sw-ind5a',
                label: 'Industry Session (Slot 1)',
                days: 'Saturday',
                date: '14 Nov',
                title: 'Fundamentals of Automobiles & EVs (Morning Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Automobiles & EV Architectures (0.5 credit)'
            },
            {
                id: 'sch-sw-ind5b',
                label: 'Industry Session (Slot 2)',
                days: 'Saturday',
                date: '14 Nov',
                title: 'Fundamentals of Automobiles & EVs (Afternoon Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Automobiles & EV Subsystems (0.5 credit)'
            },
            {
                id: 'sch-sw-ind6a',
                label: 'Industry Session (Slot 1)',
                days: 'Sunday',
                date: '15 Nov',
                title: 'Fundamentals of Autonomous Vehicles (Morning Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Autonomous Vehicle Dynamics (0.5 credit)'
            },
            {
                id: 'sch-sw-ind6b',
                label: 'Industry Session (Slot 2)',
                days: 'Sunday',
                date: '15 Nov',
                title: 'Fundamentals of Autonomous Vehicles (Afternoon Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Sensors, Safety & Drive-by-wire (0.5 credit)'
            }
        ],
        bonus: 'Saturday & Sunday Industry Expert sessions, plus Senior/Alumni Guest Sessions on Powertrain & Mechanical Fundamentals.'
    },
    powertrain: {
        id: 'powertrain',
        name: 'Electronics & Powertrain',
        tagline: 'Circuits, microcontrollers, motors and PCB design, from first principles.',
        overview:
            'Build a solid foundation in circuits, electronic components, microcontrollers and motors, ' +
            'and see how they come together in the electrical system of an autonomous vehicle. Includes ' +
            '4 hands-on lab sessions with circuit simulators, MATLAB and PCB design tools.',
        dates: '7 Oct – 15 Nov 2026',
        startLabel: 'First session Wed 7 Oct 2026',
        startDate: '2026-10-07',
        days: 'Mon, Wed & Fri · Saturdays & Sundays (Industry Sessions)',
        timing: 'Core: 5:15 PM – 6:45 PM · Weekend Sessions: Morning & Afternoon slots',
        format: '8 talks + 4 hands-on lab sessions + 4 college-hour expert sessions + 4 weekend expert slots',
        highlight: '20.0 hours of learning · less than ₹50 an hour',
        audience: 'First-year students welcome. No prior knowledge needed, we start from scratch!',
        syllabus: '/workshop/powertrain-syllabus.pdf',
        venue: 'E6 Mechanical Seminar Hall / E6 CAD Lab / E3 207 EDA Centre & Power Systems Lab',
        reportingInstructions: 'Bring laptop with LTspice, Tinkercad account, Arduino IDE & MATLAB ready for hands-on labs.',
        ongoingWeek: 'Completed',
        topics: [
            {
                title: 'Network Analysis & Devices',
                points: [
                    'Voltage, current, resistance & power, Ohm\'s & Kirchhoff\'s laws, RC circuits',
                    'Diodes & Transistors: BJT and MOSFET switches',
                    'Hands-on 1: Simulating a Transistor Switch in PSpice / LTspice'
                ]
            },
            {
                title: 'Microcontrollers & Buggy Start-up',
                points: [
                    'ESP32 basics: Arduino IDE setup, GPIO, blinking LED & dimming',
                    'How Our Buggy Starts Up: safety interlocks & kill switches',
                    'Hands-on 2: Build the Buggy\'s Start-Up in Tinkercad'
                ]
            },
            {
                title: 'Analog Circuits & Electric Motors',
                points: [
                    'Buck-Boost converters vs linear regulators',
                    'Op-Amps & filters for noisy sensor signals',
                    'How Electric Motors Work: DC, BLDC, stepper, servo motors',
                    'Hands-on 3: Simulating Electric Motors in MATLAB'
                ]
            },
            {
                title: 'PCB Design & Hardware Architecture',
                points: [
                    'PCB Design I: Anatomy, through-hole vs surface mount, design journey',
                    'PCB Design II: Laying out a board, design rule checks & vehicle PCB tour',
                    'Hands-on 4: Design Your First PCB'
                ]
            }
        ],
        schedule: [
            {
                id: 'sch-pt-1',
                label: 'Session 1',
                days: 'Wednesday',
                date: '7 Oct',
                title: 'Network Analysis: Circuit Basics: How Electricity Flows',
                instructor: 'Kamaleshvar & Akshayaa',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'Network Analysis'
            },
            {
                id: 'sch-pt-2',
                label: 'Session 2',
                days: 'Friday',
                date: '9 Oct',
                title: 'Electronic Devices: Diodes & Transistors: The Tiny Switches',
                instructor: 'Dillimaran & Kathin',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'Electronic Devices'
            },
            {
                id: 'sch-pt-3',
                label: 'Session 3',
                days: 'Monday',
                date: '12 Oct',
                title: 'Hands-on 1: Simulating a Transistor Switch (PSpice / LTspice)',
                instructor: 'Handled jointly by the team',
                venue: 'E6 Mechanical Seminar Hall & E6 CAD Lab',
                type: 'handson',
                subject: 'Electronic Devices'
            },
            {
                id: 'sch-pt-4',
                label: 'Session 4',
                days: 'Wednesday',
                date: '14 Oct',
                title: 'Microcontrollers: Meet the Microcontroller: ESP32 Basics',
                instructor: 'Dr. Sujin (Dept of ECE)',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'Microcontrollers'
            },
            {
                id: 'sch-pt-5',
                label: 'Session 5',
                days: 'Friday',
                date: '16 Oct',
                title: 'Analog Circuits: How Our Buggy Starts Up',
                instructor: 'Allwin & Akshayaa',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'Analog Circuits'
            },
            {
                id: 'sch-pt-h1',
                label: 'Holiday',
                days: 'Monday',
                date: '19 Oct',
                title: 'Pooja Holidays: Students work on assigned mini projects',
                instructor: 'Self-guided',
                venue: 'Home / Online',
                type: 'holiday'
            },
            {
                id: 'sch-pt-6',
                label: 'Session 6',
                days: 'Wednesday',
                date: '21 Oct',
                title: 'Hands-on 2: Build the Buggy\'s Start-Up in Tinkercad',
                instructor: 'Handled jointly by the team',
                venue: 'E6 Mechanical Seminar Hall & E6 CAD Lab',
                type: 'handson',
                subject: 'Analog Circuits / Microcontrollers'
            },
            {
                id: 'sch-pt-7',
                label: 'Session 7',
                days: 'Friday',
                date: '23 Oct',
                title: 'Analog Circuits: Power Up & Clean Up: Buck-Boost Converters, Op-Amps & Filters',
                instructor: 'Dr. Sathiyanathan (Dept of Robotics and Autonomous Systems)',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'Analog Circuits'
            },
            {
                id: 'sch-pt-ind2',
                label: 'Industry Session',
                days: 'Saturday',
                date: '24 Oct',
                title: 'Automotive Functional Safety',
                instructor: 'Mrs. Sasikala (Robert Bosch)',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Functional Safety in ADAS & EVs'
            },
            {
                id: 'sch-pt-8',
                label: 'Session 8',
                days: 'Monday',
                date: '26 Oct',
                title: 'Electric Machines & Motors: How Electric Motors Work',
                instructor: 'Aravind & Vishal',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'Electric Machines & Motors'
            },
            {
                id: 'sch-pt-9',
                label: 'Session 9',
                days: 'Wednesday',
                date: '28 Oct',
                title: 'Hands-on 3: Simulating Electric Motors in MATLAB',
                instructor: 'Dr. Ravikrishna (Dept of EEE)',
                venue: 'E3 207 EDA Centre & Power Systems Lab',
                type: 'handson',
                subject: 'Electric Machines & Motors'
            },
            {
                id: 'sch-pt-10',
                label: 'Session 10',
                days: 'Friday',
                date: '30 Oct',
                title: 'PCB Design I: What Is a PCB and How Is It Made?',
                instructor: 'Saswin & Nanthavikraman',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'PCB Design'
            },
            {
                id: 'sch-pt-11',
                label: 'Session 11',
                days: 'Monday',
                date: '2 Nov',
                title: 'PCB Design II: Laying Out a Board',
                instructor: 'Saswin & Nanthavikraman',
                venue: 'E6 Mechanical Seminar Hall',
                type: 'lecture',
                subject: 'PCB Design'
            },
            {
                id: 'sch-pt-12',
                label: 'Session 12',
                days: 'Wednesday',
                date: '4 Nov',
                title: 'Hands-on 4: Design Your First PCB',
                instructor: 'Saswin & Nanthavikraman',
                venue: 'E6 Mechanical Seminar Hall & E6 CAD Lab',
                type: 'handson',
                subject: 'PCB Design'
            },
            {
                id: 'sch-pt-ind5a',
                label: 'Industry Session (Slot 1)',
                days: 'Saturday',
                date: '14 Nov',
                title: 'Fundamentals of Automobiles & EVs (Morning Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Automobiles & EV Architectures (0.5 credit)'
            },
            {
                id: 'sch-pt-ind5b',
                label: 'Industry Session (Slot 2)',
                days: 'Saturday',
                date: '14 Nov',
                title: 'Fundamentals of Automobiles & EVs (Afternoon Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Automobiles & EV Subsystems (0.5 credit)'
            },
            {
                id: 'sch-pt-ind6a',
                label: 'Industry Session (Slot 1)',
                days: 'Sunday',
                date: '15 Nov',
                title: 'Fundamentals of Autonomous Vehicles (Morning Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Autonomous Vehicle Dynamics (0.5 credit)'
            },
            {
                id: 'sch-pt-ind6b',
                label: 'Industry Session (Slot 2)',
                days: 'Sunday',
                date: '15 Nov',
                title: 'Fundamentals of Autonomous Vehicles (Afternoon Slot)',
                instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
                venue: 'Mechanical Seminar Hall',
                type: 'expert',
                project: 'Sensors, Safety & Drive-by-wire (0.5 credit)'
            }
        ],
        bonus: 'Saturday & Sunday Industry Expert sessions, including Automotive Functional Safety (Robert Bosch) and Autonomous Vehicles.'
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

