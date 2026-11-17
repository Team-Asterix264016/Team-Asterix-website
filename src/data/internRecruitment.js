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
    eligibilityNote: 'Only for first years'
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
                    title: 'Electrical Fundamentals',
                    topics: [
                        'Voltage, current, resistance and power',
                        "Ohm's Law",
                        'AC and DC',
                        'Series and parallel circuits',
                        'KCL and KVL',
                        'Electrical energy and power calculations',
                        'Conductors and insulators'
                    ]
                },
                {
                    title: 'Basic Electronic Components',
                    topics: [
                        'Resistors, capacitors and inductors',
                        'Diodes and LEDs',
                        'Transistors (BJT and MOSFET)',
                        'Relays, switches and fuses',
                        'Batteries and power supplies',
                        'Basic circuit symbols'
                    ]
                },
                {
                    title: 'Sensors & Actuators',
                    topics: [
                        'What are sensors and actuators?',
                        'Analog and digital sensors',
                        'IR and ultrasonic sensors',
                        'Temperature and pressure sensors',
                        'Proximity sensors',
                        'DC motors and servo motors'
                    ]
                },
                {
                    title: 'Digital Electronics & Microcontrollers',
                    topics: [
                        'Analog vs digital signals',
                        'Basic logic gates',
                        'Binary number system',
                        'Microcontroller basics',
                        'Arduino and ESP32 basics',
                        'GPIO and PWM'
                    ]
                },
                {
                    title: 'Communication Systems',
                    topics: [
                        'Basic communication system block diagram',
                        'Types of communication: Wired and wireless',
                        'Analog and digital communication',
                        'Serial and parallel communication',
                        'UART, SPI and I2C',
                        'Bluetooth, Wi-Fi and CAN',
                        'Transmitter, receiver and communication channels'
                    ]
                }
            ]
        }
    }
];
