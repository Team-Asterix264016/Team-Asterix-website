/**
 * Initial mock data for Team Asterix Community & Horizon Tech Hub
 */

export const COMMUNITY_CATEGORIES = [
    { id: 'all', label: 'All Topics', icon: '⚡' },
    { id: 'ros', label: 'ROS2 & Autonomy', icon: '🤖' },
    { id: 'cad', label: 'CAD & Chassis', icon: '⚙️' },
    { id: 'embedded', label: 'Embedded & CAN', icon: '⚡' },
    { id: 'workshop', label: 'Workshop Q&A', icon: '🛠️' },
    { id: 'general', label: 'General Discussion', icon: '💬' }
];

export const INITIAL_DISCUSSIONS = [
    {
        id: 'disc-1',
        title: 'Optimizing Real-time Point Cloud Registration for Velodyne LiDAR on Jetson Orin',
        author: 'Ratheeswar S',
        authorRole: 'Subsystem Lead • Perception',
        avatar: 'R',
        badge: 'TEAM LEAD',
        category: 'ros',
        categoryLabel: 'ROS2 & Autonomy',
        timestamp: '2 hours ago',
        upvotes: 24,
        repliesCount: 8,
        isSolved: true,
        summary:
            'We noticed point cloud latency when running PCL filtering alongside YOLOv8 depth estimation. Here is how we lowered latency from 85ms to 18ms using CUDA zero-copy memory.',
        content: `When integrating our 32-beam LiDAR node with stereoscopic depth cameras on our SAE BAJA autonomous prototype, processing latency jumped to 85ms per frame on the NVIDIA Jetson AGX Orin.

### Root Cause
1. CPU-side point cloud transformation before pushing to GPU memory.
2. Unnecessary serialization of \`sensor_msgs/msg/PointCloud2\` across nodelets.

### Fix Implemented
- Converted PCL filtering pipeline to CUDA zero-copy memory using Unified Memory pointers.
- Replaced intra-process ROS2 messaging with zero-copy transport via CycloneDDS.

Current latency is down to **18.4ms**, enabling high-speed obstacle detection at up to 45 km/h off-road! Has anyone benchmarked ROS2 Humble against Jazzy for zero-copy pointclouds?`,
        replies: [
            {
                id: 'rep-1',
                author: 'Kavya V',
                authorRole: 'Member • Software Squad',
                timestamp: '1 hour ago',
                upvotes: 6,
                content:
                    'Awesome write-up! We tested CycloneDDS vs FastDDS on ROS2 Jazzy last week and saw another ~8% latency drop with shared memory (shm) enabled.'
            },
            {
                id: 'rep-2',
                author: 'Arun Kumar',
                authorRole: 'Workshop Alumnus 2025',
                timestamp: '45 mins ago',
                upvotes: 3,
                content:
                    'Will this CUDA zero-copy pipeline work on Jetson Orin Nano (8GB) as well? We are running into memory bandwidth bottlenecks.'
            }
        ]
    },
    {
        id: 'disc-2',
        title: 'AISI 4130 Chromoly Roll Cage TIG Welding Specs & Heat Treatment Guidelines',
        author: 'Dharun M',
        authorRole: 'Subsystem Lead • Chassis & Mechanical',
        avatar: 'D',
        badge: 'MECHANICAL LEAD',
        category: 'cad',
        categoryLabel: 'CAD & Chassis',
        timestamp: '5 hours ago',
        upvotes: 19,
        repliesCount: 5,
        isSolved: true,
        summary:
            'Detailed welding voltage, ER70S-6 filler rod selection, and pre-heat recommendations for SAE BAJA chromoly spaceframe joints.',
        content: `Welding 4130 chromoly tubing requires strict thermal control to prevent brittle martensite formation in the Heat Affected Zone (HAZ).

**Key Parameters for TIG Welding:**
- **Filler Rod:** ER70S-6 (allows weld ductility without post-weld stress relief)
- **Shielding Gas:** 100% Argon at 15-20 CFH
- **Preheat:** 150°C for tube wall thickness > 2.0mm
- **Tack Method:** Symmetric tacks at 90° intervals to minimize frame warping.

Check out our CAD weld joint stress analysis report attached in the Resource Vault!`,
        replies: [
            {
                id: 'rep-3',
                author: 'Sanjay R',
                authorRole: 'Mechanical Specialist',
                timestamp: '3 hours ago',
                upvotes: 4,
                content:
                    'Thanks for sharing! Did you use a fixture table with modular toggle clamps during main loop welding?'
            }
        ]
    },
    {
        id: 'disc-3',
        title: 'How to fix CAN Bus Bit Stuffing Errors on STM32F4 Dual CAN Tranceivers?',
        author: 'Priya Sharma',
        authorRole: 'Community Developer',
        avatar: 'P',
        badge: 'COMMUNITY',
        category: 'embedded',
        categoryLabel: 'Embedded & CAN',
        timestamp: '1 day ago',
        upvotes: 14,
        repliesCount: 6,
        isSolved: false,
        summary:
            'Getting sporadic CAN bus error frames (ECR = 0x80) when streaming steer-by-wire telemetry at 500 kbps.',
        content: `Hey everyone! We are configuring STM32F407 CAN1 & CAN2 nodes connected to SN65HVD230 transceivers. At 250 kbps telemetry works fine, but boosting to 500 kbps causes periodic passive error states on the bus.

- Termination resistors: 120Ω installed on both far ends.
- Cable length: 1.8 meters twisted pair.

Any suggestions on baud rate prescaler timing or sampling point configuration?`,
        replies: [
            {
                id: 'rep-4',
                author: 'Vishnu Prasad',
                authorRole: 'Embedded Specialist',
                timestamp: '18 hours ago',
                upvotes: 9,
                content:
                    'Set your CAN sampling point to exactly 87.5%. For STM32F4 at 42MHz APB1 clock: Prescaler = 6, BS1 = 11, BS2 = 2. Also ensure transceiver VCC is a clean 3.3V without ground ripple.'
            }
        ]
    }
];

export const INITIAL_PROJECTS = [
    {
        id: 'proj-1',
        title: 'Autonomous Off-Road Rover with ROS2 & Stereo Vision',
        author: 'Team Asterix Autonomous Division',
        authorBadge: 'TEAM ASTERIX FEATURED',
        category: 'Autonomous Systems',
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        description:
            'Complete 4WD drive-by-wire robotic vehicle platform equipped with LiDAR obstacle detection, stereoscopic depth mapping, and TEB local path planner.',
        tags: ['ROS2 Humble', 'NVIDIA Jetson', 'YOLOv8', 'SolidWorks', 'C++'],
        stars: 48,
        githubUrl: 'https://github.com/Team-Asterix264016',
        demoUrl: 'https://asterix-website.vercel.app/#model'
    },
    {
        id: 'proj-2',
        title: 'Real-time Telemetry Dashboard & CAN Analyzer',
        author: 'Rithvik & Perception Squad',
        authorBadge: 'COMMUNITY BUILD',
        category: 'Telemetry & Cloud',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        description:
            'High-speed browser telemetry console visualizing RPM, battery cell voltages, steering angle encoder streams, and GPS track logs over WebSockets.',
        tags: ['React', 'Node.js', 'WebSocket', 'Tailwind', 'Chart.js'],
        stars: 32,
        githubUrl: 'https://github.com/Team-Asterix264016',
        demoUrl: '#'
    },
    {
        id: 'proj-3',
        title: 'Pneumatic Brake Actuator & Custom Brake Pedal Box',
        author: 'Subsystem Squad • Mechanical',
        authorBadge: 'FAVORITE',
        category: 'Mechanical Engineering',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        description:
            'CNC machined 7075-T6 aluminum brake pedal assembly with dual master cylinder bias bar and pneumatic fail-safe emergency actuation.',
        tags: ['SolidWorks', 'ANSYS FEA', 'CNC Machining', 'Pneumatics'],
        stars: 29,
        githubUrl: '#',
        demoUrl: '#'
    }
];

export const INITIAL_RESOURCES = [
    {
        id: 'res-1',
        title: 'ROS2 Autonomous Navigation & Point Cloud Cheatsheet',
        category: 'Software & Autonomy',
        type: 'PDF',
        size: '2.4 MB',
        downloads: 340,
        description:
            'Quick reference guide covering sensor_msgs topics, PCL filters, costmap2d parameters, and CycloneDDS tuning for robotics competitions.',
        link: '/workshop/software-perception-syllabus.pdf'
    },
    {
        id: 'res-2',
        title: 'SAE BAJA Spaceframe Roll Cage Weld & FEA Template',
        category: 'CAD & Mechanical',
        type: 'ZIP / STEP',
        size: '14.8 MB',
        downloads: 512,
        description:
            'Complete SolidWorks 3D CAD weldment package for AISI 4130 spaceframe cage along with ANSYS static structural stress simulation setups.',
        link: '#'
    },
    {
        id: 'res-3',
        title: 'STM32 Dual CAN Bus Communications & Firmware Library',
        category: 'Embedded Systems',
        type: 'C++ / C',
        size: '850 KB',
        downloads: 289,
        description:
            'Production-ready STM32 HAL C++ wrapper for 500kbps CAN frame transmission, FIFO message filtering, and error handler interrupts.',
        link: '#'
    },
    {
        id: 'res-4',
        title: 'Autonomous Vehicle Electronics Isolation & EMI Shielding Guide',
        category: 'Hardware & Power',
        type: 'PDF',
        size: '1.9 MB',
        downloads: 198,
        description:
            'Design rules for isolating high-current motor drivers from 5V/3.3V logic boards, star grounding techniques, and ferrite bead selection.',
        link: '#'
    }
];

export const HORIZON_BLOGS = [
    {
        id: 'blog-1',
        title: 'Building India’s First Student Autonomous Off-Road Vehicle: From Simulation to Dirt Proving Grounds',
        subtitle:
            'How Team Asterix engineered drive-by-wire actuators, stereo neural vision, and sensor fusion for SAE BAJA 2026.',
        author: 'Ratheeswar S & Team Asterix Leads',
        authorRole: 'Team Asterix Core R&D',
        avatar: 'A',
        date: 'October 2, 2026',
        readTime: '6 min read',
        category: 'AUTONOMOUS ENGINEERING',
        image: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=1200&q=80',
        excerpt:
            'When we set out to turn our BAJA vehicle into a fully autonomous off-road platform, simulation gave us hope, but the dirt track gave us reality. Here is an inside look at how we tackled sensor noise, steering lag, and harsh terrain.',
        content: `### The Journey from Paper to Dirt
Building an autonomous off-road vehicle is fundamentally different from building an indoor AMR or highway self-driving car. There are no lane markings, weather conditions change instantly, and ground vibrations can break sensor mounts in minutes.

In late 2025, Team Asterix embarked on transforming our student racing vehicle into a fully autonomous mobilty platform for SAE BAJA 2026.

### Architectural Breakthroughs
1. **Drive-By-Wire Actuation:** Custom high-torque stepper actuators mated with zero-backlash planetary gearboxes for steering control.
2. **LiDAR + Neural Stereo Fusion:** Combining 3D point clouds with YOLOv8 depth estimation to detect mud mounds, rocks, and track boundary cones in under 20ms.
3. **Fail-Safe Pneumatic Braking:** Emergency stop system triggered via radio telemetry or software heartbeat loss, venting high-pressure air to actuate dual master cylinders instantly.

### Lessons Learned on the Proving Grounds
Vibration isolation was our biggest challenge. Early test runs shook camera lenses out of focus and caused CAN bus wiring drops. We resolved this using 3D-printed TPU dampeners and industrial M12 aviation connectors.

Stay tuned for our upcoming open-source release of the Asterix ROS2 Navigation stack!`
    },
    {
        id: 'blog-2',
        title: 'Deep Dive: Real-time Perception Pipelines on NVIDIA Jetson Orin for Off-Road Terrain',
        subtitle:
            'Optimizing tensor precision, zero-copy memory allocation, and CUDA kernels for low-latency obstacle tracking.',
        author: 'Kavya V',
        authorRole: 'Software & Perception Squad',
        avatar: 'K',
        date: 'September 24, 2026',
        readTime: '8 min read',
        category: 'AI & VISION',
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        excerpt:
            'Processing high-resolution stereo camera streams and 3D LiDAR point clouds concurrently on embedded hardware requires extreme memory optimization. Here is how we achieved 60 FPS perception.',
        content: `### Why FPS Matters in Off-Road Autonomy
At speeds above 35 km/h over rough terrain, a 50ms perception delay equates to moving over half a meter blind. To ensure instant path re-planning, our perception stack must execute within 15-20ms.

### Key Optimization Steps
- **INT8 TensorRT Quantization:** We calibrated our custom YOLOv8 model using TensorRT INT8 precision, boosting inference speed by 2.8x with under 0.6% mAP accuracy loss.
- **Unified Memory Pointers:** Eliminating host-to-device memory copies between OpenCV ROS nodes and CUDA kernels.
- **Dynamic Costmap Generation:** Projecting 3D point cloud obstacles directly into a 2D occupancy grid map via custom GPU kernels.

Through these optimizations, our perception latency dropped from 82ms to **16.5ms**, allowing smooth navigation at maximum throttle!`
    },
    {
        id: 'blog-3',
        title: 'Designing Chromoly Spaceframes for Extreme Impact & Torsional Rigidity',
        subtitle:
            'Finite Element Analysis (FEA), triangulation strategies, and hands-on TIG fabrication tips.',
        author: 'Dharun M',
        authorRole: 'Chassis & Mechanical Lead',
        avatar: 'D',
        date: 'September 12, 2026',
        readTime: '5 min read',
        category: 'MECHANICAL & FEA',
        image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80',
        excerpt:
            'A spaceframe must withstand 20G front impact loads while keeping overall weight under 45kg. Here is how we optimized node triangulation and weld joint geometry.',
        content: `### Structural Objectives
The roll cage is the structural backbone of our vehicle. It protects the driver, mounts suspension control arms, and houses heavy sensor payloads without flexing under cornering loads.

### Finite Element Analysis (FEA)
Using ANSYS Workbench, we simulated:
- **Front Impact (20G):** Ensuring peak von Mises stress remains well below the 4130 chromoly yield strength (460 MPa).
- **Torsional Stiffness:** Achieved 1,450 Nm/degree torsional rigidity across the wheelbase.

### Fabrication Execution
TIG welding with ER70S-6 filler wire ensured maximum joint ductility. Precise tube coping and symmetrical tacking prevented frame deformation during final seam welds.`
    }
];
