export const subsystems = [
    {
        id: "software-perception",
        name: "Software & Perception",
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
                status: "Active Member",
                bio: "Architects the ROS 2 Jazzy node graph, colcon workspace build pipeline, and end-to-end autonomous architecture.",
                badge: "SUBSYSTEM LEAD"
            },
            {
                name: "Autonomous Perception Engineer",
                role: "Computer Vision & Pipeline Architect",
                initials: "CV",
                status: "Active Member",
                bio: "Develops the C++ OpenCV sliding-window detector, BEV perspective transform, and 1D Kalman filter state estimators.",
                badge: "PERCEPTION"
            },
            {
                name: "Controls & Dynamics Specialist",
                role: "Lateral & Longitudinal Control",
                initials: "CD",
                status: "Active Member",
                bio: "Tunes the Advanced Stanley controller, curvature feedforward gains, and 300ms safety watchdog fail-safe routines.",
                badge: "CONTROLS"
            },
            {
                name: "Embedded Systems Engineer",
                role: "Serial Bridge & Hardware Interface",
                initials: "ES",
                status: "Alumni",
                bio: "Implements the high-reliability Arduino serial communication bridge for steering actuator drive and telemetry feedback.",
                badge: "ALUMNI LEAD"
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
                status: "Active Member",
                bio: "Calibrates transmission shift points, dyno-tunes engine curves, and leads drivetrain architecture.",
                badge: "LEAD"
            },
            {
                name: "Gearbox Designer",
                role: "Transmission CAD & Machining",
                initials: "GD",
                status: "Active Member",
                bio: "Designs structural casing tolerances, bearing journals, and gear tooth profiles.",
                badge: "MECHANICAL"
            },
            {
                name: "Dyno Calibration Tech",
                role: "Thermodynamics & Fuel Mapping",
                initials: "DC",
                status: "Alumni",
                bio: "Monitors exhaust gas temperatures, AFR ratios, and governor performance.",
                badge: "ALUMNI"
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
        fullDesc: "The Mechanical subsystem forms the structural backbone and dynamic handling soul of the Asterix autonomous vehicle. The unit designs and fabricates the high-rigidity AISI 4130 tubular roll cage, calculates suspension roll center migration, manufactures custom uprights and A-arms, optimizes steering Ackermann geometry, and integrates the high-pressure 4-wheel lockup braking system.",
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
                name: "FEA Simulation Analyst",
                role: "Structural Stress & Topology Optimization",
                initials: "FA",
                status: "Alumni",
                bio: "Performs nonlinear impact FEA and topology optimization on custom aluminum bellcranks.",
                badge: "ALUMNI"
            }
        ]
    },
    {
        id: "leads",
        name: "Leads",
        tagline: "Project Management, Technical Architecture & Operations Direction",
        badge: "EXECUTIVE & DIRECTORS",
        color: "bg-indigo-500",
        stat: "CHIEF ENGINEERING & OPS",
        shortDesc: "Executive team directing vehicle architecture, inter-subsystem integration, financial sponsorships, and field testing strategy.",
        fullDesc: "The Leads subsystem represents the technical and executive leadership driving Team Asterix. From overarching vehicle design architecture and cross-subsystem integration to project timelines, budget management, safety compliance, and field testing strategy, the leadership team ensures Asterix performs at peak engineering excellence.",
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
                status: "Alumni",
                bio: "Manages fabrication budgets, sponsor deliverables, and pit equipment logistics.",
                badge: "ALUMNI LEAD"
            }
        ]
    }
];
