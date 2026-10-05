import mongoose from 'mongoose';
import SiteConfig from '../models/SiteConfig.js';
import Subsystem from '../models/Subsystem.js';
import TeamMember from '../models/TeamMember.js';
import GalleryItem from '../models/GalleryItem.js';
import TeamUpdate from '../models/TeamUpdate.js';
import User from '../models/User.js';

let isConnected = false;

export function isMongoConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

export async function connectMongoDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.warn('⚠️ MONGODB_URI is not set in environment variables. Database requests will return 503 or offline defaults.');
        mongoose.set('bufferCommands', false);
        return false;
    }

    // MONGODB_DB_NAME overrides the database; unset keeps the historical 'asterix'.
    const dbName = process.env.MONGODB_DB_NAME?.trim() || 'asterix';

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 8000,
            dbName
        });
        isConnected = true;
        console.log(`🍃 Successfully connected to MongoDB Atlas (database: ${dbName})!`);
        await seedDatabaseIfNeeded();
        return true;
    } catch (err) {
        // Fallback for environments with custom or system-managed certificates (e.g. Windows Node 24)
        try {
            console.log('🍃 Retrying MongoDB Atlas connection with system TLS fallback...');
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 8000,
                tlsAllowInvalidCertificates: true,
                dbName
            });
            isConnected = true;
            console.log(`🍃 Successfully connected to MongoDB Atlas (TLS fallback enabled, database: ${dbName})!`);
            await seedDatabaseIfNeeded();
            return true;
        } catch (retryErr) {
            console.error('❌ Failed to connect to MongoDB Atlas:', retryErr.message);
            mongoose.set('bufferCommands', false);
            isConnected = false;
            return false;
        }
    }
}

export async function seedDatabaseIfNeeded() {
    try {
        const count = await SiteConfig.countDocuments();
        if (count === 0) {
            console.log('⚡ Seeding initial SiteData into MongoDB Atlas...');
            
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

            const initialStoryText = `It started as a training program.

In the first year, there was no Team Asterix, no prototype vehicle, and no clear idea where the journey would lead. It was simply a group of passionate students learning how complex autonomous vehicles worked. Months were spent understanding vehicle dynamics, embedded control systems, drive-by-wire mechanics, and vision technologies.

About a year later, the group decided to take the program to the next level and established Team Asterix. Somewhere along that journey, the training program evolved into an advanced engineering initiative with a much bigger ambition: pioneering high-performance autonomous off-road mobility platforms from the ground up.

That was where the real engineering began.

The project was divided into four core engineering pillars: Software & Perception, Powertrain & Energy Systems, Mechanical & Chassis Engineering, and Team Leadership. Each subsystem presented immense technical challenges, but the vehicle platform could only perform when all four synced seamlessly.

The team started with raw architecture. Technical specifications were drawn, control loops designed, CAD schematics finalized, and component pipelines established. But this was the first full-scale autonomous vehicle ever built by this team. When work moved from simulation to the workshop floor, engineering reality hit hard.

Parts faced supply chain delays. Custom sensors required bespoke mounting hardware. Fabrication tolerances needed tight control, and field test schedules had to be rewritten repeatedly. Every week brought a new technical obstacle, requiring constant iteration and resilience.

Then came physical integration.

System mounting on the spaceframe was complex. High-voltage wiring harnesses had to be isolated, CAN bus topologies routed, custom sensor brackets CNC-machined, and mechanical drive-by-wire linkages calibrated directly on the vehicle frame. Endless hours were spent eliminating EMI noise, stabilizing sensor communication nodes, and perfecting steering actuation algorithms. The workshop became a 24/7 hub of innovation, telemetry analysis, and hands-on assembly.

Field testing pushed the systems further.

Components that ran flawlessly on bench testing faced real-world environmental noise. LiDAR and vision models required dynamic filtering on rough terrain. Steering and braking actuators needed microsecond control loop tuning for precise responsiveness. Every field test revealed new insights, driving continuous refinement of control parameters and structural reliability.

What kept Team Asterix charging forward was an unwavering commitment to engineering excellence and autonomous mobility innovation.

Bit by bit, technical breakthroughs mounted. Perception pipelines achieved ultra-fast tracking, drive-by-wire controllers executed with high precision, and the tubular chassis demonstrated unmatched structural integrity. What began as conceptual schematics grew into a state-of-the-art autonomous all-terrain vehicle platform.

Team Asterix is not defined by simple competitions. It is an engineering powerhouse forged through hands-on innovation, technical mastery, and the relentless drive to push the boundaries of next-generation mobility.

Building autonomous vehicle technology is a mission for Team Asterix—turning ambitious engineering concepts into real-world technological impact.`;

            const initialSubsystems = [
                {
                    id: "software-perception",
                    name: "Software and Perception",
                    tagline: "ROS 2 Jazzy, Classical OpenCV Vision & Advanced Stanley Lateral Control",
                    badge: "AUTONOMOUS STACK",
                    color: "bg-sky-400",
                    stat: "ROS 2 JAZZY & STANLEY CONTROL",
                    shortDesc: "Production-grade C++ autonomous pipeline featuring real-time OpenCV lane extraction, 1D Kalman tracking, single-camera perspective warping, and Stanley steering control.",
                    fullDesc: "Built on ROS 2 Jazzy within our custom colcon workspace (abja_ws), the Software and Perception subsystem is engineered in pure, optimized C++ for maximum determinism and zero GPU/ML overhead. The perception node processes single-lens cropped stereo feeds through custom pinhole calibration, 1.5x buffer-expanded Bird's-Eye View perspective warping, and sliding-window polynomial fitting. To overcome low camera mounting angles, our single-lane fallback projects the virtual centerline across the fixed 3.0m track width, stabilized by 3 independent 1D Kalman filters. Lateral steering commands are generated via an Advanced Stanley Controller featuring curvature feedforward, slew-rate limiting, track-side dynamic parameter tuning (k = 1.0 to 15.0), and a 300ms fail-safe safety watchdog transmitting directly to Arduino hardware via serial bridge.",
                    specifications: [
                        { label: "Core Framework", value: "ROS 2 Jazzy (Ubuntu / Linux)" },
                        { label: "Build System", value: "colcon (abja_ws Workspace)" },
                        { label: "Perception Engine", value: "C++ OpenCV (baja_perception)" },
                        { label: "Lateral Controller", value: "Advanced Stanley Node (baja_lane_control)" },
                        { label: "Mathematical Model", value: "2nd-Order Polynomial (x = ay² + by + c)" },
                        { label: "State Filtering", value: "Three Independent 1D Kalman Filters" },
                        { label: "Track Geometry", value: "Fixed 3.0m Width Polynomial Shifting" },
                        { label: "Actuation Interface", value: "Arduino Serial Bridge (/lka/steering_angle)" }
                    ],
                    highlights: [
                        "Hardware Perspective Correction: Automatically crops side-by-side stereo streams in half to extract the clean left lens with 1.5x buffer-expanded Bird's-Eye View warp for sharp turns.",
                        "Single-Lane Fallback Projection: Employs polynomial gap shifting based on the fixed 3.0m eBaja track width when the low camera angle loses outer boundary visibility.",
                        "Advanced Stanley Lateral Control: Combines velocity-normalized Cross Track Error (k * cte / v) with Curvature Feedforward to eliminate lag on technical hairpin corners.",
                        "Safety Watchdog System: Dedicated 300ms timer monitors perception confidence and sensor silence, executing smooth automatic return-to-center (0°) fail-safe steering.",
                        "Dynamic Parameter Tuning: Full ROS 2 parameter support for track-side on-the-fly adjustment of Stanley gain (k = 1.0 - 15.0) and fallback velocity."
                    ],
                    teamMembers: [
                        {
                            name: "Ratheeswar",
                            role: "Software & Perception Lead",
                            initials: "RW",
                            bio: "Architects the ROS 2 Jazzy node graph, colcon workspace build pipeline, and end-to-end autonomous architecture.",
                            badge: "SUBSYSTEM LEAD"
                        },
                        {
                            name: "Autonomous Perception Engineer",
                            role: "Computer Vision & Pipeline Architect",
                            initials: "CV",
                            bio: "Develops the C++ OpenCV sliding-window detector, BEV perspective transform, and 1D Kalman filter state estimators.",
                            badge: "PERCEPTION"
                        },
                        {
                            name: "Controls & Vehicle Dynamics Engineer",
                            role: "Lateral & Longitudinal Control",
                            initials: "LC",
                            bio: "Tunes the Advanced Stanley controller, curvature feedforward gains, and 300ms safety watchdog fail-safe routines.",
                            badge: "CONTROLS"
                        },
                        {
                            name: "Embedded Systems Engineer",
                            role: "Serial Bridge & Hardware Interface",
                            initials: "ES",
                            bio: "Implements the high-reliability Arduino serial communication bridge for steering actuator drive and telemetry feedback.",
                            badge: "FIRMWARE"
                        }
                    ]
                },
                {
                    id: "powertrain",
                    name: "Powertrain",
                    tagline: "Power in. Torque out. Control at every stage.",
                    badge: "PROPULSION & CONTROL",
                    color: "bg-emerald-400",
                    stat: "48V 2000W PMSM DRIVE",
                    shortDesc: "Our Powertrain subsystem combines motor control with autonomous braking, steering, and throttle circuits for precise real-time vehicle actuation.",
                    fullDesc: "Our Powertrain subsystem combines motor control with autonomous braking, steering, and throttle circuits for precise real-time vehicle actuation. Built to turn electrical energy into controlled, responsive motion.",
                    specifications: [
                        { label: "Motor / Powerplant", value: "Datai 2000W PMSM Motor Kit" },
                        { label: "Maximum RPM", value: "4000 RPM" },
                        { label: "Supply Voltage", value: "48V" },
                        { label: "Gearbox Ratio", value: "9:1" },
                        { label: "Axle Shafts", value: "4340 Induction-Hardened Chromoly" },
                        { label: "Thermal Dissipation", value: "Forced Air Cooling & IR Monitoring" }
                    ],
                    highlights: [
                        "Datai 2000W PMSM electric motor kit with 48V power architecture for instant torque delivery.",
                        "Integrated drive-by-wire autonomous actuation for braking, steering, and throttle circuits.",
                        "Custom 9:1 single/two-stage reduction with induction-hardened 4340 chromoly axle shafts."
                    ],
                    teamMembers: [
                        {
                            name: "Powertrain Specialist",
                            role: "Transmission & Drivetrain Lead",
                            initials: "PS",
                            bio: "Calibrates transmission shift points, dyno-tunes engine curves, and leads drivetrain architecture.",
                            badge: "LEAD"
                        },
                        {
                            name: "Gearbox Designer",
                            role: "Transmission CAD & Machining",
                            initials: "GD",
                            bio: "Designs structural casing tolerances, bearing journals, and gear tooth profiles.",
                            badge: "MECHANICAL"
                        },
                        {
                            name: "Dyno Calibration Tech",
                            role: "Thermodynamics & Fuel Mapping",
                            initials: "DC",
                            bio: "Monitors exhaust gas temperatures, AFR ratios, and governor performance.",
                            badge: "TESTING"
                        }
                    ]
                },
                {
                    id: "mechanical",
                    name: "Mechanical",
                    tagline: "Chassis Spaceframe, Suspension Kinematics, Brakes & FEA Rigidity",
                    badge: "STRUCTURAL & DYNAMICS",
                    color: "bg-amber-400",
                    stat: "100% CAD / FEA VALIDATED",
                    shortDesc: "Custom AISI 4130 chromoly roll cage, long-travel double wishbone suspension, precision Ackermann steering, and electro-hydraulic brake systems.",
                    fullDesc: "The Mechanical subsystem forms the structural backbone and dynamic handling soul of the Asterix BAJA vehicle. The unit designs and fabricates the rule-compliant AISI 4130 tubular roll cage, calculates suspension roll center migration, manufactures custom uprights and A-arms, optimizes steering Ackermann geometry, and integrates the high-pressure 4-wheel lockup braking system.",
                    specifications: [
                        { label: "Chassis Material", value: "AISI 4130 Chromoly (Seamless Tubular)" },
                        { label: "Front Suspension", value: "Double A-Arm with FOX Float Air Shocks" },
                        { label: "Rear Suspension", value: "Multi-Link Semi-Trailing Arm Assembly" },
                        { label: "Suspension Travel", value: "10.5 Inches Front / 9.8 Inches Rear" },
                        { label: "Steering Geometry", value: "Rack & Pinion with 100% Ackermann" },
                        { label: "Braking System", value: "Dual Tandem Hydraulic Disc (All 4 Lockup)" }
                    ],
                    highlights: [
                        "Torsional rigidity optimized using ANSYS FEA structural crash simulations for maximum driver safety.",
                        "Custom CNC-machined 6061-T6 aluminum uprights engineered for minimum unsprung mass.",
                        "Long-travel progressive shock damping tuned for brutal rock crawl obstacles and high jumps.",
                        "Integrated high-pressure brake proportioning valve enabling instant 4-wheel dynamic lockup."
                    ],
                    teamMembers: [
                        {
                            name: "Mechanical Lead",
                            role: "Chassis & Suspension Architect",
                            initials: "ML",
                            status: "Active Member",
                            bio: "Oversees chassis roll cage fabrication, suspension kinematics, and vehicle weight distribution.",
                            badge: "LEAD"
                        },
                        {
                            name: "Suspension Specialist",
                            role: "Geometry & Damper Dynamics",
                            initials: "SS",
                            status: "Active Member",
                            bio: "Calculates camber curves, roll centers, and tunes FOX air shock nitrogen pressures.",
                            badge: "DYNAMICS"
                        },
                        {
                            name: "Brake & Steering Engineer",
                            role: "Hydraulics & Actuation",
                            initials: "BS",
                            status: "Active Member",
                            bio: "Designs dual-circuit hydraulic brake calipers, pedal ratio linkages, and Ackermann geometry.",
                            badge: "BRAKES"
                        },
                        {
                            name: "Chassis Fabrication Tech",
                            role: "Tubing Notch & TIG Specialist",
                            initials: "CF",
                            status: "Alumni",
                            bio: "Former master welder and tube notch fabricator for our Gen-1 spaceframe chassis.",
                            badge: "ALUMNI"
                        }
                    ]
                },
                {
                    id: "leads",
                    name: "Leads",
                    tagline: "Project Management, Technical Architecture & Race Direction",
                    badge: "EXECUTIVE & DIRECTORS",
                    color: "bg-indigo-500",
                    stat: "CHIEF ENGINEERING & OPS",
                    shortDesc: "Executive team directing vehicle architecture, inter-subsystem integration, financial sponsorships, and competition race strategy.",
                    fullDesc: "The Leads subsystem represents the technical and executive leadership driving Team Asterix. From overarching vehicle design architecture and cross-subsystem integration to project timelines, budget management, safety compliance, and race day pit-lane strategy, the leadership team ensures Asterix performs at peak engineering excellence.",
                    specifications: [
                        { label: "Leadership Scope", value: "Overall Technical & Operational Command" },
                        { label: "Mobility Division", value: "Asterix Autonomous Mobility Division" },
                        { label: "Integration Cadence", value: "Weekly Sprint Milestones & Design Reviews" },
                        { label: "Safety Compliance", value: "100% ISO & Automotive Tech Inspection Standards" },
                        { label: "Budget & Sponsorship", value: "Full Proving Ground Logistics & Sponsor Relations" },
                        { label: "Field Strategy", value: "Real-Time Telemetry & Operator Coaching" }
                    ],
                    highlights: [
                        "Holistic cross-subsystem systems engineering ensuring seamless mechanical-electronic synergy.",
                        "Rigorous design reviews, FMEA risk assessments, and technical compliance audits.",
                        "Paddock logistics, telemetry strategy, and operator training execution during field trials."
                    ],
                    teamMembers: [
                        {
                            name: "Team Captain",
                            role: "Overall Project & Team Direction",
                            initials: "TC",
                            status: "Active Member",
                            bio: "Directs team operations, sponsor relations, competition logistics, and cross-team execution.",
                            badge: "CAPTAIN"
                        },
                        {
                            name: "Technical Director",
                            role: "Chief Vehicle Architect",
                            initials: "TD",
                            status: "Active Member",
                            bio: "Oversees mechanical, electrical, and autonomous subsystem integration and design reviews.",
                            badge: "DIRECTOR"
                        },
                        {
                            name: "Ratheeswar",
                            role: "Technical Co-Lead & Software Architect",
                            initials: "RW",
                            status: "Active Member",
                            bio: "Leads autonomous computing, electronics architecture, and data-driven race strategy.",
                            badge: "LEAD"
                        },
                        {
                            name: "Operations & Finance Lead",
                            role: "Sponsorship & Logistics Head",
                            initials: "OF",
                            status: "Active Member",
                            bio: "Manages fabrication budgets, sponsor deliverables, and pit equipment logistics.",
                            badge: "OPERATIONS"
                        }
                    ]
                }
            ];

            const initialGalleryItems = [
                {
                    id: "gal-1",
                    title: "Paddock Dawn Inspection",
                    category: "FIELD TESTING • SCRUTINEERING",
                    year: "2026",
                    src: "/uploads/gallery/01_team_paddock.jpg",
                    desc: "Complete pre-test technical inspection and telemetry calibration under paddock sunrise."
                },
                {
                    id: "gal-2",
                    title: "Spaceframe Chassis TIG Welding",
                    category: "WORKSHOP • CHASSIS FAB",
                    year: "2025",
                    src: "/uploads/gallery/02_workshop_welding.jpg",
                    desc: "Precision TIG welding of AISI 4130 chromoly roll cage joints with zero dimensional distortion."
                },
                {
                    id: "gal-3",
                    title: "LiDAR & Neural Vision Tuning",
                    category: "AI LAB • PERCEPTION",
                    year: "2026",
                    src: "/uploads/gallery/03_lidar_sensor_tuning.jpg",
                    desc: "Real-time point-cloud registration and stereo camera depth calibration on the test bench."
                },
                {
                    id: "gal-4",
                    title: "High-Speed Dirt Proving Grounds",
                    category: "DYNAMIC TESTING • TERRAIN",
                    year: "2026",
                    src: "/uploads/gallery/04_track_dirt_action.jpg",
                    desc: "Full-throttle endurance run across punishing washboard ruts and loose red dirt trails."
                },
                {
                    id: "gal-5",
                    title: "Suspension & Brake Tuning",
                    category: "PIT BAY • QUICK SERVICE",
                    year: "2026",
                    src: "/uploads/gallery/05_pitlane_mechanics.jpg",
                    desc: "Trackside damper valving adjustments and hydraulic line bleeding between endurance testing runs."
                },
                {
                    id: "gal-6",
                    title: "Platform Milestone & Victory",
                    category: "PROVING GROUNDS • MILESTONE",
                    year: "2026",
                    src: "/uploads/gallery/06_team_celebration.jpg",
                    desc: "Team Asterix celebrating major technical milestones and successful autonomous field trials."
                }
            ];

            const initialUpdates = [
                {
                    id: "upd-1",
                    label: "Paddock Lineup & Shakedown",
                    tag: "FEB 2026 • PIT LANE",
                    image: "/uploads/gallery/01_team_paddock.jpg",
                    link: "#"
                },
                {
                    id: "upd-2",
                    label: "Spaceframe TIG Welding",
                    tag: "NOV 2025 • CHASSIS BAY",
                    image: "/uploads/gallery/02_workshop_welding.jpg",
                    link: "#"
                },
                {
                    id: "upd-3",
                    label: "LiDAR & Neural Perception",
                    tag: "JAN 2026 • AI LAB",
                    image: "/uploads/gallery/03_lidar_sensor_tuning.jpg",
                    link: "#"
                },
                {
                    id: "upd-4",
                    label: "High-Speed Dirt Testing",
                    tag: "JAN 2026 • PROVING GROUNDS",
                    image: "/uploads/gallery/04_track_dirt_action.jpg",
                    link: "#"
                },
                {
                    id: "upd-5",
                    label: "Endurance Podium Victory",
                    tag: "FEB 2026 • NATIONAL FINALS",
                    image: "/uploads/gallery/06_team_celebration.jpg",
                    link: "#"
                }
            ];

            const initialContactInfo = {
                email: "asterix.psgitech@gmail.com",
                address: "PSG iTech, Neelambur, Coimbatore, Tamil Nadu",
                category: "Autonomous All-Terrain Vehicle Development",
                instagramUrl: "https://www.instagram.com/asterix_itech/",
                linkedinUrl: "https://www.linkedin.com/company/teamasterix/",
                githubUrl: "https://github.com/Team-Asterix264016/"
            };

            const initialSponsorshipData = {
                brochureUrl: '',
                deckUrl: '',
                contactPerson: 'Ratheeswar & Team Leads',
                contactEmail: 'asterix.psgitech@gmail.com',
                contactPhone: '+91 98765 43210'
            };


            await SiteConfig.findOneAndUpdate(
                { key: 'main' },
                {
                    $set: {
                        hero: initialHeroData,
                        story: initialStoryText,
                        contact: initialContactInfo,
                        sponsorship: initialSponsorshipData,
                        lastModified: new Date().toISOString()
                    }
                },
                { upsert: true }
            );

            for (let subIdx = 0; subIdx < initialSubsystems.length; subIdx++) {
                const sub = initialSubsystems[subIdx];
                await Subsystem.findOneAndUpdate(
                    { id: sub.id },
                    {
                        $set: {
                            name: sub.name,
                            badge: sub.badge,
                            tagline: sub.tagline,
                            fullDesc: sub.fullDesc,
                            order: subIdx
                        }
                    },
                    { upsert: true }
                );

                if (Array.isArray(sub.teamMembers)) {
                    for (let memIdx = 0; memIdx < sub.teamMembers.length; memIdx++) {
                        const m = sub.teamMembers[memIdx];
                        const memId = `mem-${sub.id}-${memIdx}`;
                        await TeamMember.findOneAndUpdate(
                            { id: memId },
                            {
                                $set: {
                                    id: memId,
                                    subsystemId: sub.id,
                                    name: m.name,
                                    role: m.role,
                                    phone: m.phone || '',
                                    initials: m.initials,
                                    badge: m.badge || 'SPECIALIST',
                                    status: m.status || 'Active Member',
                                    bio: m.bio || '',
                                    photo: m.photo || '',
                                    order: memIdx
                                }
                            },
                            { upsert: true }
                        );
                    }
                }
            }

            for (let galIdx = 0; galIdx < initialGalleryItems.length; galIdx++) {
                const item = initialGalleryItems[galIdx];
                await GalleryItem.findOneAndUpdate(
                    { id: item.id },
                    { $set: { ...item, order: galIdx } },
                    { upsert: true }
                );
            }

            for (let updIdx = 0; updIdx < initialUpdates.length; updIdx++) {
                const upd = initialUpdates[updIdx];
                await TeamUpdate.findOneAndUpdate(
                    { id: upd.id },
                    { $set: { ...upd, order: updIdx } },
                    { upsert: true }
                );
            }

            console.log('✓ Seeding complete: 5 separate collections populated in MongoDB database "asterix".');
        }

        // Administrator accounts are deliberately NOT seeded here any more.
        //
        // This block used to create `admin`, `powertrain_lead` and `chassis_lead`
        // with passwords written in this file. Anyone who read the repository
        // could sign in as a subsystem lead, which is not a footing to run a
        // recruitment cycle on.
        //
        // Create the first administrator instead by either setting
        // ADMIN_BOOTSTRAP_PASSWORD in the host environment (see routes/auth.js)
        // or running `node src/scripts/setAdminPassword.js '<password>'`.
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.warn(
                'No administrator accounts exist. Set ADMIN_BOOTSTRAP_PASSWORD and sign in once, ' +
                'or run: node src/scripts/setAdminPassword.js \'<password>\''
            );
        }
    } catch (seedErr) {
        console.error('Database seeding error:', seedErr);
    }
}
