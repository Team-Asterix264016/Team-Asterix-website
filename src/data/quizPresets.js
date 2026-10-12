/**
 * Ready-made quiz papers, kept in code so an organiser never has to retype a
 * question set into the admin form. QuizAdmin's editor offers each preset
 * below under "Load a ready paper"; picking one fills in the title, slug,
 * description, duration, scoring options and the full MCQ list with its
 * answer key.
 *
 * Schedule fields (exam start, exam end, results release) are deliberately
 * absent — those stay whatever the organiser sets by hand in the editor, so
 * loading a paper never moves a date.
 *
 * `correctOptionIndex` is zero-based: 0 = A, 1 = B, 2 = C, 3 = D.
 */

export const QUIZ_PRESETS = [
    {
        presetId: 'week-1-networks-electronic-devices',
        label: 'Week 1 — Network Analysis & Electronic Devices (10 MCQs)',
        summary: 'Ohm’s law, KVL mesh analysis, nodal analysis, RC steady state, diodes, BJTs and MOSFETs.',
        title: 'Week 1 Quiz: Network Analysis & Electronic Devices',
        slug: 'week-1-networks-devices',
        description:
            'Ten MCQs on network analysis and electronic devices: Ohm’s law, KVL mesh analysis, nodal analysis, RC steady state, diode conduction, BJT regions and MOSFET terminals. One mark per question, no negative marking. Plain calculators are allowed; notes are not.',
        durationMinutes: 20,
        passingPercentage: 50,
        instantFeedback: true,
        showExplanations: true,
        shuffleQuestions: false,
        questions: [
            {
                questionText:
                    'A 12 V ideal voltage source is connected in series with a 4 Ω resistor. What is the current through the resistor?',
                options: ['2 A', '3 A', '4 A', '48 A'],
                correctOptionIndex: 1,
                points: 1,
                explanation:
                    'Ohm’s law: I = V / R = 12 V / 4 Ω = 3 A. The 48 A option comes from multiplying instead of dividing.'
            },
            {
                questionText:
                    'A two-mesh circuit has clockwise mesh currents I1 and I2. The left mesh contains a 12 V source (in its left branch) and a 4 Ω resistor. The right mesh contains a 6 V source (in its right branch) and a 2 Ω resistor. The meshes share a 2 Ω resistor in the middle branch. Both voltage sources have their positive terminals at the top. Using KVL, what is the current through the shared resistor?',
                options: [
                    '0.6 A, flowing upward',
                    '1.8 A, flowing downward',
                    '2.4 A, flowing downward',
                    '1.2 A, flowing upward'
                ],
                correctOptionIndex: 2,
                points: 1,
                explanation:
                    'KVL on the left mesh gives 6·I1 − 2·I2 = 12; on the right mesh, I1 − 2·I2 = 3. Solving: I1 = 1.8 A and I2 = −0.6 A. The shared branch carries I1 − I2 = 2.4 A, flowing downward.'
            },
            {
                questionText:
                    'In a circuit, the negative terminal of a 10 V DC source is connected to ground (0 V). Its positive terminal is connected through a 2 Ω resistor to node A. Node A is connected to ground through a 4 Ω resistor. An ideal 1 A current source is also connected between ground and node A, pushing 1 A into node A. Using nodal analysis, what is the voltage at node A?',
                options: ['4 V', '5 V', '6.67 V', '8 V'],
                correctOptionIndex: 3,
                points: 1,
                explanation:
                    'KCL at node A: (Vᴀ − 10)/2 + Vᴀ/4 = 1. Multiplying through by 4 gives 2Vᴀ − 20 + Vᴀ = 4, so 3Vᴀ = 24 and Vᴀ = 8 V. Without the current source the node would sit at 6.67 V.'
            },
            {
                questionText:
                    'An initially uncharged capacitor of 100 μF is connected in series with a 10 kΩ resistor and an ideal 10 V DC supply at t = 0. Assume the circuit has been connected for a sufficiently long time. What is the voltage across the capacitor and the current through the circuit at steady state?',
                options: [
                    'VC = 0 V, I = 1 A',
                    'VC = 10 V, I = 0 A',
                    'VC = 10 V, I = 1 A',
                    'VC = 0 V, I = 0 A'
                ],
                correctOptionIndex: 1,
                points: 1,
                explanation:
                    'The time constant is τ = RC = 10 kΩ × 100 μF = 1 s. After several time constants the capacitor is fully charged: it holds the full supply voltage (VC = 10 V) and, because a charged capacitor passes no DC, the current falls to 0 A.'
            },
            {
                questionText:
                    'Two identical bulbs, treated as fixed resistors, are connected in series across an ideal battery. A thick copper wire is then connected directly across one of the bulbs, short-circuiting it. Which statement is correct?',
                options: [
                    'The shorted bulb goes out, the other bulb becomes brighter, and the battery current increases.',
                    'Both bulbs go out because the circuit is broken.',
                    'The shorted bulb goes out, the other bulb becomes dimmer, and the battery current decreases.',
                    'Both bulbs stay equally bright because the battery voltage is unchanged.'
                ],
                correctOptionIndex: 0,
                points: 1,
                explanation:
                    'The copper wire carries the current around the shorted bulb, so no voltage appears across it and it goes dark. The remaining bulb now has the whole battery voltage across it, and total resistance has halved, so the battery current rises and that bulb burns brighter.'
            },
            {
                questionText: 'When is a silicon diode ON (conducting)?',
                options: [
                    'When the anode is negative with respect to the cathode.',
                    'When both terminals are at the same voltage.',
                    'When the anode is positive with respect to the cathode by about 0.7 V.',
                    'When a reverse voltage is applied.'
                ],
                correctOptionIndex: 2,
                points: 1,
                explanation:
                    'A silicon diode conducts when forward biased — anode positive with respect to the cathode — once the drop reaches its cut-in voltage of roughly 0.7 V (about 0.3 V for germanium). Reverse bias leaves only a tiny leakage current.'
            },
            {
                questionText: 'What are the three terminals of a BJT?',
                options: [
                    'Emitter, Base, Collector',
                    'Gate, Drain, Source',
                    'Anode, Cathode, Gate',
                    'Source, Base, Drain'
                ],
                correctOptionIndex: 0,
                points: 1,
                explanation:
                    'A bipolar junction transistor has an emitter, a base and a collector. Gate / drain / source belong to a field-effect transistor, and anode / cathode / gate to a thyristor.'
            },
            {
                questionText:
                    'A BJT used as a switch is OFF in the ______ region and fully ON in the ______ region.',
                options: [
                    'saturation, cut-off',
                    'active, cut-off',
                    'active, saturation',
                    'cut-off, saturation'
                ],
                correctOptionIndex: 3,
                points: 1,
                explanation:
                    'As a switch the transistor sits at the two extremes: cut-off, where no base drive means no collector current (OFF), and saturation, where heavy base drive collapses VCE to a few tenths of a volt (fully ON). The active region in between is for linear amplification.'
            },
            {
                questionText: 'What are the three main terminals of a MOSFET?',
                options: [
                    'Emitter, Base, Collector',
                    'Gate, Drain, Source',
                    'Anode, Cathode, Gate',
                    'Base, Drain, Emitter'
                ],
                correctOptionIndex: 1,
                points: 1,
                explanation:
                    'A MOSFET’s three working terminals are the gate, the drain and the source. (A fourth body or substrate terminal is usually tied to the source inside the package.)'
            },
            {
                questionText: 'Which terminal of a MOSFET controls whether it is ON or OFF?',
                options: ['Source', 'Drain', 'Gate', 'Body'],
                correctOptionIndex: 2,
                points: 1,
                explanation:
                    'The gate controls the device. It is insulated from the channel by a thin oxide layer, so the gate-to-source voltage switches the MOSFET by building a channel rather than by drawing current — unlike a BJT, which needs base current.'
            }
        ]
    }
];

export default QUIZ_PRESETS;
