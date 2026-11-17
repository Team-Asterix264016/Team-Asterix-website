/**
 * First year intern recruitment content.
 *
 * These are the defaults. Admins edit the live copy from the admin portal
 * (Intern Recruitment tab); it is stored as `internRecruitment` in the site
 * config and always passed through normalizeInternRecruitment, so a missing
 * or partial copy falls back to what is here. An empty date shows "will be
 * updated soon"; portions are an array of { title, topics: [] } sections.
 */

const INTERN_RECRUITMENT = {
    title: 'Intern Recruitment',
    tagline: 'Your first lap with Team Asterix starts here.',
    eligibilityNote: 'Only for first years',
    quizFormatNote:
        'Along with the track-specific questions below, the quiz will also have logical reasoning and aptitude questions.',
    registerUrl: 'https://rb.gy/j9mhx9',
    registerQr: '/recruitment/register-qr.png',
    bannerCatchline: "Don't just watch the race. Build the machine that wins it."
};

const INTERN_ROUNDS = [
    { id: 'round-expo', title: 'Expo', date: '', details: 'Further details will be updated soon.' }
];

const INTERN_TRACKS = [
    {
        id: 'software-perception',
        label: 'Software & Perception',
        quiz: {
            date: '',
            portions: [
                {
                    title: 'Development Tools',
                    topics: [
                        'Git/GitHub: Clone, add, commit, push, pull, branches, reading a merge conflict',
                        'VS Code: Workspace structure, file extensions, extensions panel, basic debugging UI',
                        'Google Colab: Code vs. Markdown cells, runtimes (CPU/GPU), order of execution, installing packages'
                    ]
                },
                {
                    title: 'Machine Learning',
                    topics: [
                        'Supervised & Unsupervised learning',
                        'Data Preprocessing',
                        'Algorithms',
                        'Evaluation Metrics'
                    ]
                },
                {
                    title: 'System Design',
                    topics: ['High-Level Design & Low-Level Design']
                },
                { title: 'Basics of C', topics: [] },
                { title: 'Logic Building on any given scenario', topics: [] },
                { title: 'Coordinate Geometry and Probabilities', topics: [] }
            ]
        }
    },
    {
        id: 'powertrain',
        label: 'Powertrain',
        quiz: {
            date: '',
            portions: [
                {
                    title: 'Network Analysis',
                    topics: [
                        "Kirchhoff's Voltage Law (KVL)",
                        "Kirchhoff's Current Law (KCL)",
                        'Mesh Analysis',
                        'Nodal Analysis',
                        'Voltage, Current and Resistance',
                        "Ohm's Law",
                        'Electrical Power and Energy',
                        'Series and Parallel Circuits',
                        'Voltage Divider Rule',
                        'Current Divider Rule',
                        'Active and Passive Elements',
                        'Independent and Dependent Sources',
                        'Ideal and Practical Voltage and Current Sources',
                        'Open Circuit and Short Circuit'
                    ]
                },
                {
                    title: 'Electronic Devices',
                    topics: [
                        'Conductors, Insulators and Semiconductors',
                        'Energy Band Theory',
                        'Intrinsic and Extrinsic Semiconductors',
                        'P-type and N-type Semiconductors',
                        'Majority and Minority Charge Carriers',
                        'Drift Current and Diffusion Current',
                        'PN Junction Formation',
                        'Depletion Region',
                        'Barrier Potential',
                        'Forward Bias and Reverse Bias',
                        'PN Junction Diode',
                        'V-I Characteristics',
                        'Forward and Reverse Breakdown',
                        'Knee Voltage',
                        'Static and Dynamic Resistance',
                        'Zener Diode and Its Characteristics',
                        'Zener Diode as a Voltage Regulator',
                        'LED (Light Emitting Diode)',
                        'Photodiode',
                        'Bipolar Junction Transistor',
                        'MOSFET'
                    ]
                }
            ]
        }
    }
];

export const INTERN_RECRUITMENT_DEFAULTS = {
    ...INTERN_RECRUITMENT,
    tracks: INTERN_TRACKS,
    rounds: INTERN_ROUNDS
};

const text = (value, fallback) => (typeof value === 'string' ? value : fallback);

const cleanPortions = (portions) =>
    portions
        .filter((section) => section && typeof section === 'object')
        .map((section) => ({
            title: text(section.title, ''),
            topics: Array.isArray(section.topics)
                ? section.topics.filter((topic) => typeof topic === 'string')
                : []
        }));

/* Always returns a complete object. The two tracks are fixed (the page and
   the admin key off their ids); everything inside them is editable. */
export function normalizeInternRecruitment(source) {
    const src = source && typeof source === 'object' ? source : {};
    const defaults = INTERN_RECRUITMENT_DEFAULTS;
    const storedTracks = Array.isArray(src.tracks) ? src.tracks : [];

    const result = {};
    for (const key of Object.keys(INTERN_RECRUITMENT)) {
        result[key] = text(src[key], defaults[key]);
    }

    result.tracks = defaults.tracks.map((base) => {
        const stored = storedTracks.find((track) => track && track.id === base.id) || {};
        const quiz = stored.quiz && typeof stored.quiz === 'object' ? stored.quiz : {};
        return {
            id: base.id,
            label: text(stored.label, base.label),
            quiz: {
                date: text(quiz.date, base.quiz.date),
                portions: Array.isArray(quiz.portions) ? cleanPortions(quiz.portions) : base.quiz.portions
            }
        };
    });

    result.rounds = Array.isArray(src.rounds)
        ? src.rounds
              .filter((round) => round && typeof round === 'object')
              .map((round, index) => ({
                  id: text(round.id, `round-${index}`),
                  title: text(round.title, ''),
                  date: text(round.date, ''),
                  details: text(round.details, '')
              }))
        : defaults.rounds;

    return result;
}
