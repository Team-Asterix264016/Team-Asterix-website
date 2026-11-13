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
                'A hands-on workshop covering System Design, Computer Vision, Machine Learning, ROS 2 and Agentic AI, with 7 mini-projects and an additional project assignment.',
        dates: '6 Oct – 15 Nov 2026',
        startLabel: 'Pre-workshop session Tue 6 Oct 2026 · First core session Thu 8 Oct 2026',
        startDate: '2026-10-06',
        days: 'Tuesday, Thursday & Friday (Core) · Saturday & Sunday (Industry Expert)',
        timing: 'Core: 5:10 PM – 6:50 PM',
        format: '8 core sessions + 1 pre-workshop session + 3 industry expert sessions',
        syllabus: '/workshop/software-perception-syllabus.pdf',
        venue: 'E6 Mechanical Seminar Hall',
        reportingInstructions: 'Bring laptops with chargers. Ubuntu 24.04 / WSL2 & Python ready. Arrive 10 minutes prior to session timing.',
        ongoingWeek: 'Week 1',
        topics: [
    {
        title: 'System Design',
        points: [
            'Decomposing an ATV into inputs, processing and outputs',
            'Sense -> Plan -> Act loop & loop timing',
            'Block diagramming conventions & interface contracts',
            'Mini Project 1 – System Design',
            'Mini Project 2 – System Design'
        ]
    },
    {
        title: 'Computer Vision',
        points: [
            'Pixels, resolution, channels (NumPy arrays)',
            'OpenCV image manipulation, Gaussian blur',
            'HSV thresholding, contours & object tracking',
            'Mini Project 3 – Computer Vision',
            'Project 1 Assigned'
        ]
    },
    {
        title: 'Machine Learning',
        points: [
            'Supervised vs unsupervised learning paradigms',
            'Working with vehicle CSV logs in pandas & matplotlib',
            'K-Means clustering & elbow method',
            'Linear regression, loss & evaluation (MAE, R²)',
            'Mini Project 4 – Machine Learning'
        ]
    },
    {
        title: 'Agentic AI',
        points: [
            'Generative AI, LLMs and fundamentals of AI agents',
            'Agent loop: perceive, reason, plan and act',
            'Tools, guardrails and decision making',
            'Applying agentic AI concepts to vehicle automation',
            'Mini Project 5 – Agentic AI',
            'Mini Project 6 – Agentic AI'
        ]
    },
    {
        title: 'ROS 2 & Software Engineering',
        points: [
            'ROS 2 nodes, topics and publisher-subscriber model',
            'ROS 2 command-line tools and fundamentals',
            'Software engineering fundamentals',
            'Mini Project 7 – ROS'
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
        project: 'Prerequisites & Setup Checklist',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture'
    },
    {
        id: 'sch-sw-1',
        label: 'Session 1',
        days: 'Thursday',
        date: '8 Oct',
        title: 'System Design I: Subsystem Thinking',
        instructor: 'Rithvin, Preethika',
        project: 'Mini Project 1 – System Design',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture'
    },
    {
        id: 'sch-sw-2',
        label: 'Session 2',
        days: 'Tuesday',
        date: '13 Oct',
        title: 'System Design II: Block Diagramming',
        instructor: 'Rithvin, Preethika',
        project: 'Mini Project 2 – System Design',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture'
    },
    {
        id: 'sch-sw-3',
        label: 'Session 3',
        days: 'Thursday',
        date: '15 Oct',
        title: 'Computer Vision: Teaching the Car to See',
        instructor: 'Mr. Mahavishnu V C',
        project: 'Mini Project 3 – Computer Vision; Project 1 assigned',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'hands-on'
    },
    {
        id: 'sch-sw-4',
        label: 'Session 4',
        days: 'Thursday',
        date: '22 Oct',
        title: 'Introduction to ML and Unsupervised Training',
        instructor: 'Ms. Bavana, Ms. Swethaswini, Ms. Lakshana',
        project: 'Mini Project 4 – Machine Learning',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture'
    },
    {
        id: 'sch-sw-ind2',
        label: 'Industry Expert Session',
        days: 'Saturday',
        date: '24 Oct',
        title: 'Automotive Functional Safety',
        instructor: 'Mrs. Sasikala, Robert Bosch',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'expert'
    },
    {
        id: 'sch-sw-5',
        label: 'Session 5',
        days: 'Tuesday',
        date: '27 Oct',
        title: 'Agentic AI I: Generative AI and Agents-I',
        instructor: 'Rithvin, Arya',
        project: 'Mini Project 5 – Agentic AI',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture'
    },
    {
        id: 'sch-sw-7',
        label: 'Session 6',
        days: 'Tuesday',
        date: '3 Nov',
        title: 'Agentic AI II: Generative AI and Agents-II',
        instructor: 'Josna',
        project: 'Mini Project 6 – Agentic AI',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'hands-on'
    },
    {
        id: 'sch-sw-nov10',
        label: 'Session 7',
        days: 'Tuesday',
        date: '10 Nov',
        title: 'Machine Learning – Supervised Learning: From the Basics',
        instructor: 'Ratheeswar',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'hands-on'
    },
    {
        id: 'sch-sw-nov11',
        label: 'Session 8',
        days: 'Friday',
        date: '13 Nov',
        title: 'ROS 2 and Software Engineering Fundamentals',
        instructor: 'Sandeep',
        project: 'Mini Project 7 – ROS',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'hands-on'
    },
    {
        id: 'sch-sw-nov14',
        label: 'Industry Expert Session',
        days: 'Saturday',
        date: '14 Nov',
        title: 'Fundamentals of Automobiles and EVs',
        instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'expert'
    },
    {
        id: 'sch-sw-nov15',
        label: 'Industry Expert Session',
        days: 'Sunday',
        date: '15 Nov',
        title: 'Fundamentals of Autonomous Vehicles',
        instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'expert'
    }
],

        bonus: '3 Industry Expert Sessions covering automotive functional safety, automobiles & EVs, and autonomous vehicles.'
    },
    
powertrain: {
    id: 'powertrain',
    name: 'Electronics & Powertrain',
    tagline: 'Circuits, microcontrollers, motors and PCB design, from first principles.',

    overview:
        'Build a strong foundation in electrical and electronic systems used in autonomous vehicles. ' +
        'Explore network analysis, electronic devices, ESP32 microcontrollers, analog circuits, electric motors and PCB design through 7 lecture sessions and 5 hands-on sessions.',

    dates: '7 Oct – 12 Nov 2026',
    startLabel: 'First session Wed 7 Oct 2026',
    startDate: '2026-10-07',
    days: 'Monday, Wednesday, Thursday, Friday & Saturday',
    timing: '5:15 PM – 6:45 PM (1.5 hours per session)',
    format: '7 lecture sessions + 5 hands-on sessions (18 hours total)',
    highlight: '12 sessions combining electronics fundamentals with practical implementation.',
    audience: 'First-year students welcome. No prior knowledge needed, we start from scratch!',
    syllabus: '/workshop/powertrain-syllabus.pdf',
    venue: 'E6 Mechanical Seminar Hall (Online sessions: 17 & 28 Oct)',
    reportingInstructions: 'Bring your laptop. Keep Tinkercad, ESP32 tools and KiCAD ready for the relevant hands-on sessions.',
    ongoingWeek: 'Week 1',

    bonus: '5 hands-on sessions covering transistor simulation, buggy start-up circuits, electric motors and PCB design.',

    topics: [
        {
            title: 'Network Analysis',
            points: [
                'Circuit basics: How electricity flows',
                'Voltage, current, resistance and fundamental circuit concepts'
            ]
        },
        {
            title: 'Electronic Devices',
            points: [
                'Diodes and transistors: Understanding the tiny switches',
                'Hands-on 1: Simulating a transistor switch'
            ]
        },
        {
            title: 'Microcontrollers',
            points: [
                'Meet the Microcontroller: ESP32 Basics'
            ]
        },
        {
            title: 'Analog Circuits & Buggy Start-up',
            points: [
                'How Our Buggy Starts Up',
                'Hands-on 2: Day 1 – Build the Buggy’s Start-Up in Tinkercad and using ESP32',
                'Hands-on 3: Day 2 – Build the Buggy’s Start-Up in Tinkercad and using ESP32',
                'Power Up & Clean Up: Buck-Boost Converters, Op-Amps & Filters'
            ]
        },
        {
            title: 'Electric Machines & Motors',
            points: [
                'How Electric Motors Work',
                'Hands-on 4: Simulating Electric Motors in MATLAB'
            ]
        },
        {
            title: 'PCB Design',
            points: [
                'What Is a PCB and How Is It Made?',
                'Hands-on 5: Laying Out a Board and Designing Your First PCB using KiCAD'
            ]
        }
    ],

    // Keep the existing schedule array here, replacing it
    // with the updated 12-session schedule.
},

        
schedule: [
    {
        id: 'sch-pt-1',
        label: 'Session 1',
        days: 'Wednesday',
        date: '7 Oct',
        title: 'Network Analysis: Circuit Basics: How Electricity Flows',
        instructor: 'Kamaleshvar (Alumnus) & Akshayaa',
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
        instructor: 'Dillimaran (Alumnus) & Kathin',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture',
        subject: 'Electronic Devices'
    },
    {
        id: 'sch-pt-new-3',
        label: 'Session 3',
        days: 'Monday',
        date: '12 Oct',
        title: 'Microcontrollers: Meet the Microcontroller: ESP32 Basics',
        instructor: 'Dr. Sujin (Dept of ECE)',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture',
        subject: 'Microcontrollers'
    },
    {
        id: 'sch-pt-new-4',
        label: 'Session 4',
        days: 'Wednesday',
        date: '14 Oct',
        title: 'Electronic Devices: Hands-on 1: Simulating a Transistor Switch',
        instructor: 'Handled jointly by the team',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'handson',
        subject: 'Electronic Devices'
    },
    {
        id: 'sch-pt-new-5',
        label: 'Session 5',
        days: 'Saturday',
        date: '17 Oct',
        title: 'Analog Circuits: How Our Buggy Starts Up',
        instructor: 'Allwin (Alumnus) & Akshayaa',
        venue: 'Online',
        type: 'lecture',
        subject: 'Analog Circuits'
    },
    {
        id: 'sch-pt-new-6',
        label: 'Session 6',
        days: 'Wednesday',
        date: '21 Oct',
        title: 'Analog Circuits / Microcontrollers: Hands-on 2: Day 1 – Build the Buggy’s Start-Up in Tinkercad and using ESP32',
        instructor: 'Handled jointly by the team',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'handson',
        subject: 'Analog Circuits / Microcontrollers'
    },
    {
        id: 'sch-pt-new-7',
        label: 'Session 7',
        days: 'Friday',
        date: '23 Oct',
        title: 'Analog Circuits / Microcontrollers: Hands-on 3: Day 2 – Build the Buggy’s Start-Up in Tinkercad and using ESP32',
        instructor: 'Handled jointly by the team',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'handson',
        subject: 'Analog Circuits / Microcontrollers'
    },
    {
        id: 'sch-pt-new-8',
        label: 'Session 8',
        days: 'Monday',
        date: '26 Oct',
        title: 'Electric Machines & Motors: How Electric Motors Work',
        instructor: 'Aravind',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture',
        subject: 'Electric Machines & Motors'
    },
    {
        id: 'sch-pt-new-9',
        label: 'Session 9',
        days: 'Wednesday',
        date: '28 Oct',
        title: 'Analog Circuits: Power Up & Clean Up: Buck-Boost Converters, Op-Amps & Filters',
        instructor: 'Priyanka',
        venue: 'Online',
        type: 'lecture',
        subject: 'Analog Circuits'
    },
    {
        id: 'sch-pt-new-10',
        label: 'Session 10',
        days: 'Wednesday',
        date: '4 Nov',
        title: 'PCB Design: What Is a PCB and How Is It Made?',
        instructor: 'Nanthavikraman (Alumnus)',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'lecture',
        subject: 'PCB Design'
    },
    {
        id: 'sch-pt-new-11',
        label: 'Session 11',
        days: 'Wednesday',
        date: '11 Nov',
        title: 'Electric Machines & Motors: Hands-on 4: Simulating Electric Motors in MATLAB',
        instructor: 'Dr. Ravikrishna (Dept of EEE)',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'handson',
        subject: 'Electric Machines & Motors'
    },
    {
        id: 'sch-pt-new-12',
        label: 'Session 12',
        days: 'Thursday',
        date: '12 Nov',
        title: 'PCB Design: Hands-on 5: Laying Out a Board and Design Your First PCB using KiCAD',
        instructor: 'Saswin (Alumnus) & Nanthavikraman (Alumnus)',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'handson',
        subject: 'PCB Design'
    },
    {
        id: 'sch-pt-new-nov14',
        label: 'Industry Expert Session',
        days: 'Saturday',
        date: '14 Nov',
        title: 'Fundamentals of Automobiles and EVs',
        instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'expert'
    },
    {
        id: 'sch-pt-new-nov15',
        label: 'Industry Expert Session',
        days: 'Sunday',
        date: '15 Nov',
        title: 'Fundamentals of Autonomous Vehicles',
        instructor: 'Dr. M. Senthilvel, Dr. A. R. Vimal Kumar',
        venue: 'E6 Mechanical Seminar Hall',
        type: 'expert'
    }
],

        bonus: '5 hands-on sessions covering transistor simulation, buggy start-up circuits, electric motors and PCB design.'
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

