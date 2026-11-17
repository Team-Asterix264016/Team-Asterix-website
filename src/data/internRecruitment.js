/**
 * First year intern recruitment content.
 *
 * Only Round 1 (quiz) and Round 2 (Expo) are announced. Leave a field as
 * null to show "will be updated soon" on the page. Add portions for a track
 * as an array of { title, topics: [] } sections.
 */

export const INTERN_RECRUITMENT = {
    title: 'Intern Recruitment',
    tagline: 'Your first lap with Team Asterix starts here.',
    eligibilityNote: 'Only for first years',
    registerUrl: 'https://rb.gy/j9mhx9',
    registerQr: '/recruitment/register-qr.png'
};

export const INTERN_TRACKS = [
    {
        id: 'software-perception',
        label: 'Software & Perception',
        quiz: {
            date: null,
            portions: null
        }
    },
    {
        id: 'powertrain',
        label: 'Powertrain',
        quiz: {
            date: null,
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
