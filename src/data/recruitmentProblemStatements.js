/**
 * Recruitment challenge data for Team Asterix induction.
 *
 * Subsystems:
 * 1. Software & Perception: Two distinct problem statements (Vision-Based Object Detection
 *    and Sensor Fusion & Track Reconstruction), each split into Phase 1 (due 8th night 11:59 PM)
 *    and Phase 2 (due 14th night 11:59 PM).
 * 2. Powertrain: Offline written recruitment test (11 September 2026, 5:30 PM - 6:30 PM,
 *    45 questions, 60 minutes, 1 handwritten A4 cheat sheet allowed).
 */

export const RECRUITMENT_RELEASE_DATE_STR = '2026-09-03T18:30:00+05:30';
export const RECRUITMENT_RELEASE_MS = new Date(RECRUITMENT_RELEASE_DATE_STR).getTime();

export const HARDWARE_RELEASE_DATE_STR = '2026-09-03T19:00:00+05:30';
export const HARDWARE_RELEASE_MS = new Date(HARDWARE_RELEASE_DATE_STR).getTime();

export const SUBSYSTEM_LEADS = {
    'software-perception': {
        name: 'Ratheeswar',
        role: 'Software & Perception Lead',
        phone: '+91 86089 44644',
    },
    'software': {
        name: 'Ratheeswar',
        role: 'Software & Perception Lead',
        phone: '+91 86089 44644',
    },
    'powertrain': {
        name: 'Joel Anto Edwin',
        role: 'Powertrain Subsystem Lead',
        phone: '+91 72079 60077',
    },
    'mechanical': {
        name: 'Soorya Ramprakash',
        role: 'Mechanical Subsystem Lead',
        phone: '+91 89394 52244',
    }
};

export const SOFTWARE_PERCEPTION_DATA = {
    id: 'software-perception',
    name: 'Software & Perception',
    headline: 'AUTONOMOUS PERCEPTION & STATE ESTIMATION',
    blurb: 'Two comprehensive recruitment challenges. Choose your domain, design your pipeline in Phase 1, and implement your solution in Phase 2.',
    lead: SUBSYSTEM_LEADS['software-perception'],
    teamFormat: {
        title: 'Team Formation: Teams of 2',
        badge: 'DUO TEAMS ALLOCATED',
        desc: 'Candidates will be working in allocated teams of two to design the architecture, complete deliverables, and submit solutions.',
        pdfUrl: 'https://ik.imagekit.io/kitzwb4be/asterix/recruitment/software_perception_teams.pdf?v=2',
        pdfLocalUrl: '/recruitment/software_perception_teams.pdf?v=2',
        teamsIIYear: [
            { group: 'Group 1', members: [{ name: 'Dharanish V', dept: 'AIDS', phone: '9361365173' }, { name: 'Udhayanthi S', dept: 'AIDS', phone: '9443477014' }] },
            { group: 'Group 2', members: [{ name: 'Aravinth G V', dept: 'CSE', phone: '9080158763' }, { name: 'Rithanya M', dept: 'AIDS', phone: '9865976546' }] },
            { group: 'Group 3', members: [{ name: 'Samritha M', dept: 'CSE', phone: '9500324772' }, { name: 'Kanishka S', dept: 'AIDS', phone: '8072999845' }] },
            { group: 'Group 4', members: [{ name: 'Sruthi S', dept: 'CSE', phone: '8438702606' }, { name: 'Sakarnika J', dept: 'AIDS', phone: '8807958435' }] },
            { group: 'Group 5', members: [{ name: 'Jayashree Saravanakumar', dept: 'AIDS', phone: '9500876355' }, { name: 'M. Samvida', dept: 'VLSI', phone: '9500654772' }] },
            { group: 'Group 6', members: [{ name: 'Abhishek Karuppusamy', dept: 'CSE', phone: '8807003699' }, { name: 'Angannan A N', dept: 'ECE', phone: '9566691403' }] },
            { group: 'Group 7', members: [{ name: 'Vishnuram A G', dept: 'AIDS', phone: '9245805745' }, { name: 'Akash S M', dept: 'CSE', phone: '7339265715' }] },
            { group: 'Group 8', members: [{ name: 'Kanishka Devarajan', dept: 'CSE', phone: '8870167781' }, { name: 'Nandhitha', dept: 'VLSI', phone: '8248916170' }] },
            { group: 'Group 9', members: [{ name: 'Sathvika D V', dept: 'CSE', phone: '7010466966' }, { name: 'Darshan S', dept: 'CSE', phone: '9600688397' }] },
            { group: 'Group 10', members: [{ name: 'Subanandhini', dept: 'CSE', phone: '9159677776' }, { name: 'Rhythami Raja', dept: 'AIDS', phone: '8015790344' }] },
            { group: 'Group 11', members: [{ name: 'Deeshitha G J', dept: 'VLSI', phone: '9965195322' }, { name: 'V. Anushka', dept: 'ECE', phone: '9363479841' }] },
            { group: 'Group 12', members: [{ name: 'M. Sivaprakash', dept: 'CSE', phone: '8056847102' }, { name: 'Vijay Adithiya E', dept: 'CSE', phone: '9488412780' }] },
            { group: 'Group 13', members: [{ name: 'Shreeshanth S', dept: 'CSE', phone: '9787501016' }, { name: 'Devadharsa B', dept: 'ECE', phone: '6385431538' }] },
            { group: 'Group 14', members: [{ name: 'S. Shreeshaa', dept: 'AIDS', phone: '6383111845' }, { name: 'Dhiya D', dept: 'VLSI', phone: '9566334833' }] }
        ],
        teamsIIIYear: [
            { group: 'Group 1', members: [{ name: 'Bharath V', dept: 'ICE', phone: '9342953944' }, { name: 'Vishal S', dept: 'AIDS', phone: '8248897569' }] },
            { group: 'Group 2', members: [{ name: 'Manikandan D', dept: 'AIDS', phone: '7305315144' }, { name: 'Swaraj Rs', dept: 'ECE', phone: '9790299906' }] },
            { group: 'Group 3', members: [{ name: 'Arun Madav R', dept: 'CSE', phone: '6374704044' }, { name: 'Sivasree', dept: 'CSE', phone: '72002 16339' }] }
        ]
    },
    timeline: [
        {
            id: 'sp-release',
            label: 'Problem Statements Release',
            detail: 'Vision & sensor fusion challenge briefs and duo teams released',
            date: '2026-09-03T18:30:00+05:30',
            opensAt: '2026-09-02T18:00:00+05:30',
        },
        {
            id: 'sp-p1',
            label: 'Phase 01 Submission Deadline',
            detail: 'Research, Architecture, System Design & Proposal due at 11:59 PM IST',
            date: '2026-09-08T23:59:00+05:30',
            opensAt: '2026-09-03T18:30:00+05:30',
        },
        {
            id: 'sp-p2',
            label: 'Phase 02 Submission Deadline',
            detail: 'Implementation, Codebase, Model Weights & Final Evaluation due on 15 September at 11:59 PM IST',
            date: '2026-09-15T23:59:00+05:30',
            opensAt: '2026-09-08T23:59:00+05:30',
        },
        {
            id: 'sp-results',
            label: 'Final Results Announcement',
            detail: 'Final selected crew roster published on 20 September night',
            date: '2026-09-20T23:59:00+05:30',
            opensAt: '2026-09-15T23:59:00+05:30',
        }
    ],
    challenges: [
        {
            id: 'ps-vision',
            number: '01',
            title: 'Vision-Based Object Detection',
            tagline: 'Design and implement a practical 2D multi-class object detection system for our autonomous vehicle using a ZED 2i camera and NVIDIA Jetson Orin NX.',
            domain: 'Computer Vision & Edge AI',
            badge: 'VISION & DEEP LEARNING',
            targetHardware: {
                compute: 'NVIDIA Jetson Orin NX',
                sensor: 'StereoLabs ZED 2i Camera',
                mode: '2D Object Detection (Depth / 3D not required)'
            },
            classes: [
                { name: 'Cone', icon: 'cone', color: 'border-amber-400 bg-amber-50 text-amber-900', note: 'Track boundary marker' },
                { name: 'Traffic barrier', icon: 'barrier', color: 'border-orange-400 bg-orange-50 text-orange-900', note: 'Road obstruction / barrier' },
                { name: 'Cow', icon: 'cow', color: 'border-stone-400 bg-stone-50 text-stone-900', note: 'Unpredictable livestock' },
                { name: 'Pedestrian', icon: 'pedestrian', color: 'border-blue-400 bg-blue-50 text-blue-900', note: 'Pedestrian on or near track' },
                { name: 'Bicyclist', icon: 'bicyclist', color: 'border-emerald-400 bg-emerald-50 text-emerald-900', note: 'Cyclist or just a Cycle as well' },
                { name: 'Red traffic light', icon: 'red-light', color: 'border-rose-500 bg-rose-50 text-rose-900', note: 'Color treated as separate class' },
                { name: 'Green traffic light', icon: 'green-light', color: 'border-green-500 bg-green-50 text-green-900', note: 'Color treated as separate class' },
                { name: 'Orange / amber light', icon: 'amber-light', color: 'border-amber-500 bg-amber-50 text-amber-900', note: 'Color treated as separate class' },
                { name: 'Two-wheeler', icon: 'bike', color: 'border-cyan-400 bg-cyan-50 text-cyan-900', note: 'Motorcycles / scooters' },
                { name: 'Speed limit sign 10', icon: 'speed-10', color: 'border-red-500 bg-red-50 text-red-900', note: '10 km/h speed limit sign' },
                { name: 'Speed limit sign 15', icon: 'speed-15', color: 'border-red-500 bg-red-50 text-red-900', note: '15 km/h speed limit sign' },
                { name: 'Speed limit sign 30', icon: 'speed-30', color: 'border-red-500 bg-red-50 text-red-900', note: '30 km/h speed limit sign' },
                { name: 'Cars', icon: 'car', color: 'border-indigo-400 bg-indigo-50 text-indigo-900', note: 'Passenger cars / 4-wheelers' }
            ],
            phases: {
                phase1: {
                    phaseNumber: '01',
                    title: 'Research, Architecture & System Proposal',
                    deadline: '8 September 2026 • 11:59 PM IST',
                    deadlineDate: '2026-09-08T23:59:00+05:30',
                    tagline: 'In this phase, we want to understand how you think, research, compare options and make sound engineering decisions.',
                    overview: 'Autonomous vehicles need to understand their surroundings in order to make informed decisions. A key part of this is the ability to identify and locate objects from camera data. Your task is to propose a vision-based object detection system for an autonomous vehicle using a ZED 2i camera and Jetson Orin NX.',
                    coreTask: [
                        'Detect and distinguish all 13 specified classes with 2D bounding boxes, class labels, and confidence scores.',
                        'Traffic lights (Red, Green, Amber) and Speed limit signs (10, 15, 30) must treat color and speed value as distinct individual classes.',
                        'Target computing platform is NVIDIA Jetson Orin NX with a ZED 2i camera. You are not restricted to any particular model, framework, dataset, or training approach.',
                        'The goal of Phase 1 is to design and justify an approach: investigate the problem, identify challenges, explore alternatives (YOLO, SSD, EfficientDet, RT-DETR, etc.), and develop a technically reasoned proposal.'
                    ],
                    keyQuestions: [
                        'What questions did you ask when you first saw the problem?',
                        'What did you research and why?',
                        'What alternatives did you consider and how did you compare them?',
                        'What assumptions did you make about hardware constraints and real-world environments?',
                        'What trade-offs influenced your final choice of model and dataset strategy?',
                        'What risks or failure cases do you anticipate (small traffic lights, occlusions, motion blur)?',
                        'What would you investigate next if your proposed approach did not work?'
                    ],
                    deliverables: [
                        {
                            name: '1. Technical Presentation',
                            format: 'PPT / PDF',
                            description: 'Concise presentation covering the **problem statement, research, model comparison, key trade-offs, proposed solution, and final decision**. Should communicate the technical reasoning clearly without going into excessive implementation detail.'
                        },
                        {
                            name: '2. Technical Design & Research Report',
                            format: 'PDF',
                            description: 'Detailed technical document covering **model comparison, dataset strategy, training & evaluation plan, deployment considerations for NVIDIA Jetson Orin NX, and engineering decision-making process** from Problem → Questions → Research → Alternatives → Decision. **References/bibliography** should be included at the end.'
                        },
                        {
                            name: '3. System / Workflow Diagram',
                            format: 'PNG / PDF / SVG',
                            description: 'Clear end-to-end system architecture showing the **camera input, preprocessing, object detection/inference, post-processing, and final output**, including relevant deployment components such as TensorRT, FP16/INT8, and Jetson Orin NX where applicable.'
                        }
                    ],
                    suggestedStructure: [
                        '1. Problem Understanding',
                        '2. Your Proposed Approach',
                        '3. Research & Findings',
                        '4. Model Comparison',
                        '5. Selected Model & Justification',
                        '6. Dataset Strategy',
                        '7. Training Strategy',
                        '8. Proposed System Architecture',
                        '9. Deployment Considerations (Jetson Orin NX)',
                        '10. Expected Challenges & Failure Cases',
                        '11. Evaluation Plan',
                        '12. References'
                    ],
                    evaluationFocus: [
                        'How clearly you break down an unfamiliar engineering problem.',
                        'Quality and depth of technical research and alternative comparisons.',
                        'Awareness of hardware constraints (Jetson Orin NX inference budget) and trade-offs.',
                        'Realism and defensibility of the proposed approach.',
                        'Identification of edge cases (motion blur, lighting, small traffic lights).'
                    ]
                },
                phase2: {
                    phaseNumber: '02',
                    title: 'Implementation, Training & Evaluation',
                    deadline: '15 September 2026 • 11:59 PM IST',
                    deadlineDate: '2026-09-15T23:59:00+05:30',
                    tagline: 'Take the approach you developed in Phase 1 and turn it into a working 2D object-detection system. Build, test, evaluate and improve your solution.',
                    overview: 'In Phase 2, you will implement, train, and benchmark the detector proposed in Phase 1. You are not required to follow your Phase 1 proposal blindly — if experiments show a different architecture or training regime is superior, document what changed and why.',
                    environmentNote: 'You do NOT need physical access to an NVIDIA Jetson Orin NX or ZED 2i camera. You may develop and test your detector on whatever hardware is available to you (laptop, Google Colab, GPU workstation). Jetson is the target deployment platform, not a requirement for personal setup.',
                    coreTask: [
                        'Implement, fine-tune, or train your 2D object detector to distinguish all 13 required classes.',
                        'Prepare a dataset by combining public datasets, annotating custom samples, or synthetic augmentation.',
                        'Produce bounding boxes, class labels, and confidence scores for every detection.',
                        'Evaluate using quantitative detection metrics (Precision, Recall, mAP@50, mAP@50:95) and efficiency metrics (FPS, inference latency in ms, model weight size in MB).'
                    ],
                    metricsTable: [
                        { area: 'Detection Quality', whatToReport: 'Precision, Recall, mAP (50 & 50-95), IoU thresholds across test sets' },
                        { area: 'Inference Performance', whatToReport: 'FPS, per-frame inference latency (ms), model parameter count, and weight file size (MB)' },
                        { area: 'Per-Class Performance', whatToReport: 'Breakdown of performance per class — identify which classes succeed and which struggle' },
                        { area: 'Failure Analysis', whatToReport: 'False positives, false negatives, small traffic light detection issues, and environmental edge cases' }
                    ],
                    jetsonConsiderations: [
                        'Expected computational cost and memory footprint on Jetson Orin NX (1024-core NVIDIA Ampere GPU).',
                        'Expected inference FPS at target input resolution.',
                        'Potential optimization through ONNX runtime, TensorRT FP16 / INT8 quantization.',
                        'Pipeline changes needed when migrating from development environment to the autonomous vehicle stack.'
                    ],
                    deliverables: [
                        { name: 'Source Code', format: 'Git Repository / ZIP', description: 'Complete, organized, runnable code with clean structure.' },
                        { name: 'Trained Model', format: 'Model Weights (.pt, .onnx, .engine)', description: 'Final trained weights with instructions to load and test.' },
                        { name: 'README', format: 'Markdown File', description: 'Setup, dependencies, environment, dataset preparation, training, and inference commands.' },
                        { name: 'Dataset Information', format: 'Documentation', description: 'Sources, classes, annotation approach, splits, and known limitations.' },
                        { name: 'Results & Visuals', format: 'Plots & Sample Detections', description: 'Quantitative evaluation charts and annotated detection sample images/videos.' },
                        { name: 'Technical Report', format: '3–5 Page PDF', description: 'Covers implementation, experimental results, challenges encountered, modifications from Phase 1, and limitations.' },
                        { name: 'Final Demonstration', format: 'Video Recording / Playback', description: 'Short screen recording demonstrating working detector with bounding boxes, labels, and confidence scores.' }
                    ],
                    evaluationFocus: [
                        'A working and reproducible object-detection system.',
                        'Thoughtful dataset choices, quality annotation, and imbalance mitigation.',
                        'Evidence-based quantitative evaluation rather than cherry-picked screenshots.',
                        'Real-world awareness of edge deployment constraints and latency targets.',
                        'Ability to iterate and adapt when original Phase 1 assumptions met practical constraints.'
                    ]
                }
            }
        },
        {
            id: 'ps-fusion',
            number: '02',
            title: 'Sensor Fusion & Track Reconstruction',
            tagline: 'Take noisy, backward-mounted perception data from our autonomous buggy and reconstruct a clean 2D map of the cone-marked track in global coordinates.',
            domain: 'State Estimation & Autonomous Mapping',
            badge: 'SENSOR FUSION & SLAM',
            targetHardware: {
                vehicle: 'Team Asterix Autonomous Buggy Platform',
                sensor: 'Range & Bearing Perception Sensor (e.g. LiDAR / Depth Camera)',
                mounting: 'Rotated 180° facing backward due to roll-cage constraints'
            },
            complications: [
                {
                    title: '180° Backward-Mounted Sensor',
                    desc: 'Due to roll-cage constraints, the perception sensor is mounted facing completely backward (180° rotated relative to vehicle front). Every observation is reported in a flipped sensor frame.'
                },
                {
                    title: 'Measurement Noise & Ghost Hallucinations',
                    desc: 'Range and bearing measurements carry stochastic noise. In addition, the sensor occasionally hallucinates "ghost cones" that appear transiently for a few frames and disappear.'
                }
            ],
            phases: {
                phase1: {
                    phaseNumber: '01',
                    title: 'Coordinate Transforms, Noise Filtering & Offline Map Reconstruction',
                    deadline: '8 September 2026 • 11:59 PM IST',
                    deadlineDate: '2026-09-08T23:59:00+05:30',
                    tagline: 'Build an offline pipeline to ingest raw vehicle telemetry and backward sensor logs, reconcile frames, filter ghost cones, and output a clean 2D track map.',
                    overview: 'Our autonomous buggy is navigating a track marked by traffic cones. It is equipped with a perception sensor reporting range and bearing to observed cones. You are given a vehicle telemetry log (global pose over time) and a sensor log of cone observations. Your task is to compute the true global position of every real cone, reject ghost detections, and produce a clean 2D map.',
                    givenInputs: [
                        'Telemetry log: Vehicle pose (x, y position and heading θ) in the global frame over time.',
                        'Sensor log: Cone detections (range r, bearing φ, timestamp t) in the backward-facing sensor frame.'
                    ],
                    coreTask: [
                        'Parse and time-align telemetry and sensor logs (handling differing sampling rates and clock offsets).',
                        'Transform each detection from backward-facing sensor frame into vehicle body frame (180° rigid transform), then into the global frame using vehicle pose.',
                        'Model measurement noise and reduce its effect (simple averaging, range-weighted averaging, Kalman filtering, or robust estimators).',
                        'Filter ghost cones using spatial consistency, observation persistence across frames, and cluster support in the global frame.',
                        'Perform data association and clustering (e.g. DBSCAN, nearest-neighbor, gating) to group multiple observations of the same cone into a single high-confidence point.',
                        'Validate the final map: check track plausibility, cone pairing along track boundaries, ablations (without 180° correction or ghost filter), and parameter sensitivity.'
                    ],
                    keyQuestions: [
                        'What questions did you ask when you first examined the telemetry and sensor logs?',
                        'How did you mathematically derive and verify that the 180° sensor mounting was handled correctly?',
                        'What alternatives did you consider for ghost-cone filtering and why did you choose your method?',
                        'What assumptions did you make about sensor noise covariance or track geometry (e.g. track width)?',
                        'What trade-offs influenced your choice of clustering radius and persistence thresholds?',
                        'What would happen if the vehicle reversed or stood still for several seconds?'
                    ],
                    deliverables: [
                        { name: 'Source Code', format: 'Complete Runnable Script/Package', description: 'Clean, runnable implementation ingesting telemetry and sensor logs and producing the cone map.' },
                        { name: 'Cleaned Cone Map', format: '2D Plot (PNG/PDF)', description: 'Plot of reconstructed track in global coordinates, with accepted cones marked and vehicle trajectory overlaid.' },
                        { name: 'Cone List Output', format: 'Structured File (CSV/JSON)', description: 'Listing of every accepted cone with its estimated global (x, y) coordinates.' },
                        { name: 'Pipeline Diagram', format: 'Diagram (PNG/SVG)', description: 'Clear visualization showing data flow from raw logs → transformed detections → filtered → clustered → final map.' },
                        { name: 'Comparative Analysis, Validation & References Report', format: 'Technical Report (PDF)', description: 'Comprehensive report covering: (1) Method Comparison — comparison of association and clustering methods considered (DBSCAN vs Nearest Neighbor vs Gating); (2) Validation & Ablations — proof of correctness, sanity checks, sensitivity to thresholds, and ablations (e.g. filter disabled); and (3) References — citations of robotics papers, SLAM textbooks, sensor fusion tutorials, and libraries used.' }
                    ],
                    suggestedStructure: [
                        '1. Problem Understanding',
                        '2. Data Inspection & Assumptions',
                        '3. Coordinate Frames & Transforms (Sensor → Body → Global)',
                        '4. Time Alignment Strategy',
                        '5. Noise Handling Approach',
                        '6. Ghost-Cone Filtering Approach',
                        '7. Data Association & Clustering',
                        '8. Final Pipeline Diagram',
                        '9. Validation & Sensitivity Analysis',
                        '10. Expected Failure Cases',
                        '11. Results — Final Cone Map',
                        '12. References'
                    ],
                    evaluationFocus: [
                        'Correctness and mathematical clarity of coordinate frame transformations.',
                        'Quality and elegance of ghost-cone rejection and noise filtering.',
                        'Justification of clustering and association parameters without overfitting.',
                        'Evidence-based validation (ablations, sanity checks, sensitivity curves).',
                        'Clear technical explanation of assumptions and failure modes.'
                    ]
                },
                phase2: {
                    phaseNumber: '02',
                    title: 'Online Streaming, Uncertainty & Jetson Deployment',
                    deadline: '15 September 2026 • 11:59 PM IST',
                    deadlineDate: '2026-09-15T23:59:00+05:30',
                    tagline: 'Take your offline pipeline and turn it into a robust, real-time online cone-mapping system fit for deployment on a moving autonomous buggy.',
                    overview: 'In Phase 1, you built an offline batch pipeline. In Phase 2, you will extend that pipeline into a streaming system that processes detections incrementally as they arrive, maintains a live cone map, reports per-cone uncertainty, and remains robust across multiple challenging test logs.',
                    environmentNote: 'Physical Jetson Orin NX is NOT required for development. You can evaluate by replaying logs in real time, generating synthetic stress-test logs, and injecting synthetic faults (dropped packets, out-of-order timestamps).',
                    coreTask: [
                        'Incremental Fusion: Process detections and telemetry as they arrive in real-time, fusing observations without recomputing the entire map from scratch.',
                        'Live Cone Map: Maintain a dynamic state where real cones gain confidence and lock in while ghost detections decay and get rejected.',
                        'Uncertainty Tracking: Represent per-cone uncertainty explicitly (e.g. 2D covariance matrix, observation count, existence probability) rather than plain points.',
                        'Robustness & Adversarial Testing: Test across multiple logs with varying noise levels, high ghost rates, dense cone clusters, and telemetry dropouts.',
                        'Resource Boundedness: Ensure memory usage does not grow indefinitely as the vehicle drives, and maintain a strict latency budget per incoming update.'
                    ],
                    metricsTable: [
                        { area: 'Map Accuracy', whatToReport: 'Position error vs ground truth/reference (RMSE, median error), internal consistency, drift over time' },
                        { area: 'Recall & Precision', whatToReport: 'Fraction of real cones mapped (recall), precision of mapped cones, and ghost-cone leak rate (%)' },
                        { area: 'Streaming Robustness', whatToReport: 'Performance across logs with varying noise/ghost density, sensitivity to filter parameters' },
                        { area: 'Latency & Memory', whatToReport: 'Per-update latency (ms), end-to-end processing delay, peak memory footprint vs number of cones' },
                        { area: 'Failure Analysis', whatToReport: 'Pipeline behavior under sparse observations, dense hairpin turns, sudden pose jumps, or sensor dropouts' }
                    ],
                    jetsonConsiderations: [
                        'Expected computational cost per update and scaling behavior as the map grows.',
                        'Memory footprint management over prolonged operation.',
                        'Language choice & runtime efficiency (Python prototyping vs C++ / ROS 2 Jazzy node deployment).',
                        'Integration surface: consuming ROS 2 sensor topics / shared memory and publishing map markers downstream to lateral controllers.',
                        'Real-time scheduling and determinism on NVIDIA Jetson Orin NX.'
                    ],
                    deliverables: [
                        { name: 'Online Source Code', format: 'Modular Codebase', description: 'Clean, runnable online pipeline with distinct modules for I/O, transforms, filtering, mapping, and benchmarking.' },
                        { name: 'Configuration File', format: 'YAML / JSON / Python Config', description: 'Tuned parameters (gating distances, filter variances, promotion thresholds) with explanatory comments.' },
                        { name: 'README & Replay Guide', format: 'Markdown File', description: 'Instructions on setting up dependencies, replaying streaming logs, running tests, and reproducing results.' },
                        { name: 'Evaluation Results', format: 'Metrics Report & Tables', description: 'Quantitative benchmarks across multiple logs, including ablation runs (filter disabled, transform disabled).' },
                        { name: 'Final Map(s)', format: 'Plots (PNG/PDF)', description: 'Reconstructed 2D maps for all evaluated logs with cones, covariance uncertainty ellipses, and vehicle path.' },
                        { name: 'Live Demonstration', format: 'Screen Recording Video', description: 'Playback showing incremental map building in real time as detections arrive, cones lock in, and ghosts decay.' },
                        { name: 'Technical Report', format: '3–5 Page PDF', description: 'Deep-dive covering online architecture, uncertainty formulation, stress-test results, Jetson deployment, and limitations.' },
                        { name: 'Phase 1 → Phase 2 Diff', format: 'Comparison Section', description: 'Explicit list of design changes from your Phase 1 proposal and the reasoning behind each adaptation.' }
                    ],
                    evaluationFocus: [
                        'A reproducible, real-time online cone-mapping pipeline.',
                        'Principled formulation of uncertainty and candidate promotion/demotion.',
                        'Rigorous multi-log testing, synthetic fault injection, and evidence-based metrics.',
                        'Awareness of edge compute constraints (bounded memory, CPU/GPU utilization, real-time deadlines).',
                        'Clear documentation of how your approach adapted between Phase 1 and Phase 2.'
                    ]
                }
            }
        }
    ],
    generalGuidance: {
        toolsAndAssistance: {
            title: 'Tools & AI Assistance Policy',
            subtitle: 'You are evaluated on your engineering thought process, not on artificial constraints.',
            content: 'You are completely free to use any tools, technologies and resources available to you. AI assistants (such as ChatGPT, Claude, Gemini, GitHub Copilot), research papers, open-source libraries, online tutorials, and documentation are all encouraged. You may also discuss concepts with peers and mentors. What matters is your ability to understand the problem, make sound engineering decisions, defend your choices, and explain what you have built.'
        }
    }
};

export const POWERTRAIN_CHALLENGE_DATA = {
    id: 'powertrain',
    name: 'Powertrain',
    headline: 'POWERTRAIN SUBSYSTEM RECRUITMENT CHALLENGE',
    badge: 'ROUND 2 • DESIGN & IMPLEMENTATION',
    blurb: 'Choose one of three electrical engineering problem statements inspired by an autonomous off-road vehicle. Research the problem, compare approaches, design a practical solution, and prove it with a working prototype or simulation.',
    lead: SUBSYSTEM_LEADS['powertrain'],
    coordinators: [
        { name: 'Joel Anto Edwin', role: 'Powertrain Subsystem Lead', phone: '+91 72079 60077' },
        { name: 'Shriniyathi S', role: 'Recruitment Coordinator', phone: '+91 99429 12792' },
        { name: 'Kathin Sankar', role: 'Recruitment Coordinator', phone: '+91 97909 55695' }
    ],
    rulebook: {
        title: 'Asterix Autonomous Vehicle Standards 2026',
        url: '#',
        note: 'Teams attempting Problem Statement 03 should refer to Section C (Base Vehicle Electrical Technical Requirements) for clarification on electrical starting interlocks and safety standards. Where this challenge document states a requirement, this challenge document takes precedence.'
    },
    teamFormat: {
        title: 'Team Formation: Teams of 2',
        badge: 'DUO TEAMS ALLOCATED',
        desc: 'In this recruitment challenge, you will work in an allocated team of two to solve one electrical engineering problem inspired by the architecture and requirements of an autonomous vehicle. Each team must choose exactly ONE problem statement and register their selection in the portal.',
        pdfUrl: 'https://ik.imagekit.io/kitzwb4be/asterix/recruitment/powertrain_teams.pdf?v=2',
        pdfLocalUrl: '/recruitment/powertrain_teams.pdf',
        teams: [
            {
                group: 'Group 01',
                members: [
                    { name: 'Raghav GS', dept: 'ECE', year: 'II YEAR', rollNo: '25L189', regNo: '715525106091', email: '25l189@psgitech.ac.in', phone: '9962479975' },
                    { name: 'Raghauv N D', dept: 'EEE', year: 'II YEAR', rollNo: '25E176', regNo: '715525105076', email: '25e176@psgitech.ac.in', phone: '9787229518' }
                ]
            },
            {
                group: 'Group 02',
                members: [
                    { name: 'Ben Jounes B', dept: 'VLSI', year: 'II YEAR', rollNo: '25V107', regNo: '715525249007', email: '25v107@psgitech.ac.in', phone: '6369209286' },
                    { name: 'Sankaranarayanan L', dept: 'EEE', year: 'II YEAR', rollNo: '25E152', regNo: '715525105063', email: '25e152@psgitech.ac.in', phone: '9791407050' }
                ]
            },
            {
                group: 'Group 03',
                members: [
                    { name: 'Annapoorni S', dept: 'ICE', year: 'III YEAR', rollNo: '24U104', regNo: '715524112004', email: '24u104@psgitech.ac.in', phone: '9344417101' },
                    { name: 'Deeksha Balaji', dept: 'EEE', year: 'II YEAR', rollNo: '25E116', regNo: '715525105016', email: '25e116@psgitech.ac.in', phone: '9942245925' }
                ]
            },
            {
                group: 'Group 04',
                members: [
                    { name: 'Vibash Duraimurugan R', dept: 'ECE', year: 'II YEAR', rollNo: '25L221', regNo: '715525106123', email: '25l221@psgitech.ac.in', phone: '8015131854' },
                    { name: 'Kirthick S', dept: 'EEE', year: 'II YEAR', rollNo: '25E150', regNo: '715525105050', email: '25e150@psgitech.ac.in', phone: '6385832167' }
                ]
            },
            {
                group: 'Group 05',
                members: [
                    { name: 'Tarun. I', dept: 'VLSI', year: 'II YEAR', rollNo: '25V154', regNo: '715525249054', email: '25v154@psgitech.ac.in', phone: '6385691678' },
                    { name: 'K.Thulasi Madhavaa', dept: 'ECE', year: 'II YEAR', rollNo: '25L218', regNo: '715525106120', email: '25l218@psgitech.ac.in', phone: '6385105559' }
                ]
            },
            {
                group: 'Group 06',
                members: [
                    { name: 'J.kaviya', dept: 'ICE', year: 'II YEAR', rollNo: '25U133', regNo: '715525112034', email: '25u133@psgitech.ac.in', phone: '8807030548' },
                    { name: 'Saisith.N', dept: 'EEE', year: 'II YEAR', rollNo: '25E190', regNo: '715525105090', email: '25e190@psgitech.ac.in', phone: '9940674168' }
                ]
            },
            {
                group: 'Group 07',
                members: [
                    { name: 'Karthi W R', dept: 'VLSI', year: 'II YEAR', rollNo: '25V119', regNo: '715525249020', email: '25v119@psgitech.ac.in', phone: '6383799699' },
                    { name: 'Sanjeev S', dept: 'EEE', year: 'II YEAR', rollNo: '25E194', regNo: '715525105094', email: '25e194@psgitech.ac.in', phone: '9363535132' }
                ]
            },
            {
                group: 'Group 08',
                members: [
                    { name: 'Preethy.S', dept: 'ICE', year: 'II YEAR', rollNo: '25U142', regNo: '715525112044', email: '25u142@psgitech.ac.in', phone: '8438062906' },
                    { name: 'Naveen Kumar Raja S', dept: 'EEE', year: 'II YEAR', rollNo: '25E163', regNo: '715525105062', email: '25e163@psgitech.ac.in', phone: '7305932998' }
                ]
            },
            {
                group: 'Group 09',
                members: [
                    { name: 'Rubesh SK', dept: 'VLSI', year: 'II YEAR', rollNo: '25V142', regNo: '715525249042', email: '25v142@psgitech.ac.in', phone: '6369926295' },
                    { name: 'Thanuja J', dept: 'EEE', year: 'II YEAR', rollNo: '25E210', regNo: '715525105110', email: '25e210@psgitech.ac.in', phone: '9159107747' }
                ]
            },
            {
                group: 'Group 10',
                members: [
                    { name: 'Jeevitha. V', dept: 'ICE', year: 'II YEAR', rollNo: '25U125', regNo: '715525112026', email: '25u125@psgitech.ac.in', phone: '8870846986' },
                    { name: 'Harsith V', dept: 'EEE', year: 'II YEAR', rollNo: '25E133', regNo: '715525105033', email: '25e133@psgitech.ac.in', phone: '7373069780' }
                ]
            },
            {
                group: 'Group 11',
                members: [
                    { name: 'Swetha S L', dept: 'VLSI', year: 'II YEAR', rollNo: '25V153', regNo: '715525249053', email: '25v153@psgitech.ac.in', phone: '9487951222' },
                    { name: 'Sugankumar.V.S', dept: 'EEE', year: 'II YEAR', rollNo: '25E207', regNo: '715525105107', email: '25e207@psgitech.ac.in', phone: '9994977234' }
                ]
            },
            {
                group: 'Group 12',
                members: [
                    { name: 'K K KIRUBHA HARNI', dept: 'EEE', year: 'II YEAR', rollNo: '25E151', regNo: '715525105051', email: '25e151@psgitech.ac.in', phone: '7530018683' },
                    { name: 'G Vigneshwaran', dept: 'EEE', year: 'II YEAR', rollNo: '25E218', regNo: '715525105118', email: '25e218@psgitech.ac.in', phone: '9976313553' }
                ]
            },
            {
                group: 'Group 13',
                members: [
                    { name: 'Lakkshon K S', dept: 'EEE', year: 'II YEAR', rollNo: '25E153', regNo: '715525105052', email: '25e153@psgitech.ac.in', phone: '9944020111' },
                    { name: 'Theniniyazh C', dept: 'EEE', year: 'II YEAR', rollNo: '25E211', regNo: '715525105111', email: '25e211@psgitech.ac.in', phone: '6383983836' }
                ]
            },
            {
                group: 'Group 14',
                members: [
                    { name: 'Manish Aravind S', dept: 'EEE', year: 'II YEAR', rollNo: '25E156', regNo: '715525105055', email: '25e156@psgitech.ac.in', phone: '9894585679' },
                    { name: 'Sudhan Babu B', dept: 'EEE', year: 'II YEAR', rollNo: '25E206', regNo: '715525105106', email: '25e206@psgitech.ac.in', phone: '7397319583' }
                ]
            },
            {
                group: 'Group 15',
                members: [
                    { name: 'Muhamed Mufaries A', dept: 'EEE', year: 'II YEAR', rollNo: '25E160', regNo: '715525105059', email: '25e160@psgitech.ac.in', phone: '9566689667' },
                    { name: 'Sri Varshan V R', dept: 'EEE', year: 'II YEAR', rollNo: '25E202', regNo: '715525105105', email: '25e202@psgitech.ac.in', phone: '9345677590' }
                ]
            },
            {
                group: 'Group 16',
                members: [
                    { name: 'M.Mukesh', dept: 'EEE', year: 'II YEAR', rollNo: '25E161', regNo: '715525105060', email: '25e161@psgitech.ac.in', phone: '6379502894' },
                    { name: 'Sowjanya S', dept: 'EEE', year: 'II YEAR', rollNo: '25E200', regNo: '715525105100', email: '25e200@psgitech.ac.in', phone: '6374462136' }
                ]
            }
        ]
    },
    timeline: [
        {
            id: 'pt-release',
            label: 'Challenge Brief & Duo Allocations Release',
            detail: '3 electrical problem statements, deliverables rulebook and duo teams released',
            date: '2026-09-12T10:00:00+05:30',
            opensAt: '2026-09-12T00:00:00+05:30',
        },
        {
            id: 'pt-tue-deadline',
            label: 'PS 02 & PS 03 Presentation Deadline',
            detail: 'Technical Presentation slides (PPT/PDF) for PS2 & PS3 due on Tuesday 15 September at 11:59 PM IST',
            date: '2026-09-15T23:59:00+05:30',
            opensAt: '2026-09-12T10:00:00+05:30',
        },
        {
            id: 'pt-wed-deadline',
            label: 'PS 01 Hardware Prototype Deadline',
            detail: 'Breadboard CAN Prototype & Technical Presentation (PPT/PDF) for PS1 due on Wednesday 16 September at 11:59 PM IST',
            date: '2026-09-16T23:59:00+05:30',
            opensAt: '2026-09-12T10:00:00+05:30',
        },
        {
            id: 'pt-demos',
            label: 'Live Demonstrations & Technical Defense',
            detail: 'Live hardware testing, simulation demonstrations and technical presentation reviews',
            date: '2026-09-17T17:30:00+05:30',
            opensAt: '2026-09-16T23:59:00+05:30',
        },
        {
            id: 'pt-results',
            label: 'Final Results Announcement',
            detail: 'Final selected crew roster published on 20 September night',
            date: '2026-09-20T23:59:00+05:30',
            opensAt: '2026-09-17T18:00:00+05:30',
        }
    ],
    deliverablesTable: [
        {
            no: '01',
            deliverable: 'Technical Presentation',
            whatItShouldContain: 'A concise slide deck explaining the problem, your research, chosen approach, results and conclusions. This is the document you submit.',
            weightage: '20%',
            submissionMode: 'Uploaded on Website (PPT/PDF)'
        },
        {
            no: '02',
            deliverable: 'System Architecture',
            whatItShouldContain: 'A block diagram showing all inputs, controllers/processing, communication, outputs and feedback, and how they connect.',
            weightage: '10%',
            submissionMode: 'Included inside Technical Presentation'
        },
        {
            no: '03',
            deliverable: 'Circuit Diagram',
            whatItShouldContain: 'A complete schematic of your system, including power and current distribution (supply rails, load currents, component ratings) where relevant.',
            weightage: '10%',
            submissionMode: 'Included inside Technical Presentation'
        },
        {
            no: '04',
            deliverable: 'Approach Comparison & Alternatives Considered',
            whatItShouldContain: 'The alternative approaches you evaluated, the criteria used to compare them, and why you selected your final approach.',
            weightage: '8%',
            submissionMode: 'Included inside Technical Presentation'
        },
        {
            no: '05',
            deliverable: 'Testing / Evaluation Plan',
            whatItShouldContain: 'The tests you performed, what was measured or observed, and the criteria used to decide whether the system works.',
            weightage: '7%',
            submissionMode: 'Included inside Technical Presentation'
        },
        {
            no: '06',
            deliverable: 'Failsafe & Failsafe Test Points',
            whatItShouldContain: 'The failure cases you identified, how the system detects and responds to each, and how each failsafe is verified.',
            weightage: '15%',
            submissionMode: 'Included inside Technical Presentation'
        },
        {
            no: '07',
            deliverable: 'Prototype / Simulation Demonstration',
            whatItShouldContain: 'A live, working demonstration that meets the mandatory prototype or simulation requirement of your chosen problem statement.',
            weightage: '30%',
            submissionMode: 'Demonstrated LIVE during the evaluation round'
        }
    ],
    challenges: [
        {
            id: 'ps1',
            number: '01',
            title: 'CAN-Based Autonomous Vehicle Sensor Network',
            tagline: 'Design and build a CAN-based distributed sensing system using three ESP32 nodes, each connected to an autonomous-vehicle sensor of your choice.',
            domain: 'Distributed Embedded Systems & CAN Bus',
            badge: 'HARDWARE PROTOTYPE MANDATORY',
            deadlineLabel: 'Due Wednesday, 16 September • 11:59 PM IST',
            deadlineDate: '2026-09-16T23:59:00+05:30',
            deadlineDay: 'Wednesday',
            mandatoryDemo: 'Breadboard hardware prototype: three ESP32 nodes, three sensors, communicating over CAN.',
            context: 'Autonomous vehicles rely on multiple sensors to understand their surroundings and their own state. When these sensors are distributed across the vehicle, a reliable way to move information between processing nodes is needed. The Controller Area Network (CAN) bus is widely used for this purpose in vehicles.',
            task: 'Choose any three sensors that you believe are relevant to an autonomous/off-road vehicle. Connect each sensor to its own ESP32 node and link all three nodes over a CAN bus. Decide what each sensor contributes, where its data is processed, what information is transmitted over CAN, and how the three nodes work together to enable a useful vehicle function.',
            questionsToInvestigate: [
                'Which three sensors provide useful information for an autonomous vehicle, and why?',
                'What vehicle problem or function does your combination of sensors address?',
                'What is each ESP32 node responsible for?',
                'Should the transmitted data be raw, filtered, processed, or converted into a higher-level message?',
                'How should CAN message identifiers, priorities and update rates be chosen?',
                'Can the three sensor values be combined (fused) to produce a better or more useful output?',
                'How will sensor faults, stale data or loss of communication be detected and handled?',
                'How could a higher-level controller (such as a Jetson) use the information from your network?'
            ],
            innovation: 'The innovation is yours. You may use the three-sensor network to enable a perception, safety, navigation, diagnostics or vehicle-control concept. The three sensors do not need to be of the same type, and no combination is prescribed. Examples are intentionally not given: we want to see which sensors you choose, what problem you identify, and what system you design around them.',
            prototypeRequirement: 'A breadboard hardware prototype is mandatory. It must consist of three ESP32 nodes, each interfaced with one real sensor, communicating with each other over a CAN bus. Simulated or potentiometer-based substitutes for the three sensors are not accepted for this problem statement.',
            hardwareComponents: [
                { component: 'ESP32 development board', qty: '3', notes: 'One per sensor node.' },
                { component: 'CAN transceiver module', qty: '3', notes: 'One per node. The ESP32 has a built-in CAN controller (TWAI) but requires an external transceiver to connect to the bus. If you use a 5 V transceiver with the 3.3 V ESP32, explain how you handle the logic-level difference.' },
                { component: 'Sensors', qty: '3', notes: 'Your choice. Must be relevant to an autonomous/off-road vehicle.' },
                { component: '120 Ω termination resistor', qty: '2', notes: 'One at each end of the CAN bus. Check whether your transceiver modules already include one.' },
                { component: 'Breadboards and jumper wires', qty: 'As required', notes: 'For assembling the nodes and the bus wiring (CAN_H / CAN_L).' },
                { component: 'Power supply / USB cables', qty: 'As required', notes: 'To power all three nodes. Consider grounding between nodes.' },
                { component: 'Output devices', qty: 'Optional', notes: 'LEDs, buzzer, display, servo or similar, to show the vehicle response.' },
                { component: 'Laptop (serial monitor)', qty: 'Optional', notes: 'May act as the higher-level controller or data logger in place of a Jetson.' }
            ],
            borrowNotice: 'You do not need to buy everything. Components may be borrowed from classmates in your department for the duration of this project. Purchase only the items you are unable to borrow.',
            demonstrationMustShow: [
                'All three nodes communicating over the CAN bus.',
                'How sensor data is acquired, processed and transmitted by each node.',
                'How information from multiple nodes is combined to produce your chosen vehicle function.',
                'How the system behaves when a sensor gives invalid data, a node stops transmitting, or the bus is disconnected.',
                'Supporting evidence such as serial logs or printed CAN messages.'
            ],
            failsafeVerification: 'Identify test (probe) points on your circuit where each failsafe can be verified with a multimeter or oscilloscope, and state the expected reading in normal and fault conditions.'
        },
        {
            id: 'ps2',
            number: '02',
            title: 'Automatic Temperature Control of a Heating System',
            tagline: 'Design and simulate a control system that keeps a heating chamber at a specified temperature despite changing operating conditions.',
            domain: 'Control Systems & Thermal Dynamics',
            badge: 'SIMULATION IN MATLAB / PYTHON MANDATORY',
            deadlineLabel: 'Due Tuesday, 15 September • 11:59 PM IST',
            deadlineDate: '2026-09-15T23:59:00+05:30',
            deadlineDay: 'Tuesday',
            mandatoryDemo: 'Simulation in MATLAB/Simulink (or accepted alternatives: Python NumPy/SciPy/python-control or Scilab Xcos).',
            context: 'A heating chamber loses heat to its surroundings, and the rate of heat loss can change while the system is running. A good controller should bring the chamber to the target temperature in a reasonable time, without excessive overshoot or oscillation, and should recover on its own when operating conditions change.',
            task: 'Design a controller that decides the heater power based on the target temperature and the measured temperature. You are free to choose the control method, but your choice must be justified using the simulated response. You must also build a simulation of the heating chamber to test your controller.',
            systemFlow: 'Target Temperature → Error → Controller → Heater Power → Chamber Temperature → Temperature Sensor → Feedback',
            keyConditions: [
                'You must model the heating chamber yourself. No model is provided. State the assumptions, equations and parameter values you use, and justify why they are reasonable.',
                'The heater can only add heat. It cannot cool the chamber, and its power is limited between zero and a maximum value. Consider how this limit affects your controller (for example, saturation and integral windup).',
                'The controller is not informed of changes. When heat loss changes during operation, the controller must respond using temperature feedback alone.'
            ],
            testScenarios: [
                {
                    scenario: 'Scenario A: Setpoint change',
                    action: 'Change the target temperature during a run.',
                    observe: 'How quickly and accurately the chamber reaches the new target.'
                },
                {
                    scenario: 'Scenario B: Different heat-loss levels',
                    action: 'Run the system under at least two levels of heat loss.',
                    observe: 'Whether performance remains acceptable across conditions.'
                },
                {
                    scenario: 'Scenario C: Sudden heat-loss change',
                    action: 'Step-change the heat loss in the middle of a run without informing the controller.',
                    observe: 'Temperature dip or rise, and time taken to recover.'
                },
                {
                    scenario: 'Scenario D: Different initial temperatures',
                    action: 'Start from at least two different initial temperatures.',
                    observe: 'Whether the response remains stable and well-behaved.'
                }
            ],
            performanceMetrics: [
                { metric: 'Steady-state error', desc: 'How close the final temperature is to the target.' },
                { metric: 'Rise time and settling time', desc: 'How quickly the target is reached and held.' },
                { metric: 'Overshoot', desc: 'How far the temperature exceeds the target.' },
                { metric: 'Disturbance recovery', desc: 'How the system responds to a sudden change in heat loss.' },
                { metric: 'Stability', desc: 'Whether the response settles or oscillates.' }
            ],
            baselineComparison: 'Implement a simple on/off (bang-bang) controller with hysteresis as a baseline. Run it through the same test scenarios as your chosen controller and compare the results using the metrics above. This comparison forms part of your Approach Comparison deliverable.',
            pidExplanation: 'PID is NOT required. PID is one possible solution, not a requirement. Investigate the available control approaches and decide what is appropriate. If you choose PID (or P, PI, PD), explain why. If you choose another method, explain why it suits this problem better. If you use automatic tuning tools (such as the MATLAB PID Tuner), you must be able to explain what the resulting gains do and how they affect the response.',
            simulationSpecs: {
                recommended: 'MATLAB/Simulink',
                alternatives: 'Python (NumPy/SciPy or python-control) or Scilab Xcos, if MATLAB access is not available',
                mustInclude: 'Heating-chamber model, controller, baseline on/off controller, all four test scenarios, and plots of chamber temperature vs time & heater power vs time.'
            },
            failsafeConsiderations: 'Think about what can go wrong in a real heating system and how your design would detect and respond to it (e.g. disconnected or faulty temperature sensor, unrealistic sensor readings, or a heater that keeps heating when it should not). Each failsafe you propose must be demonstrated with a simulation test case.'
        },
        {
            id: 'ps3',
            number: '03',
            title: 'Starting Conditions & Ready-to-Drive System',
            tagline: "Design the electrical and embedded system that safely activates the vehicle's tractive system, following the starting sequence defined in the rulebook.",
            domain: 'Vehicle Electrical Architecture & Interlock Safety',
            badge: 'CIRCUIT + MICROCONTROLLER SIMULATION MANDATORY',
            deadlineLabel: 'Due Tuesday, 15 September • 11:59 PM IST',
            deadlineDate: '2026-09-15T23:59:00+05:30',
            deadlineDay: 'Tuesday',
            mandatoryDemo: 'Circuit simulation in PSpice/LTspice + microcontroller simulation in Proteus/Wokwi. Physical low-voltage hardware setup is optional.',
            context: 'Before an electric vehicle can be driven, it must verify that a set of safety conditions is satisfied and that the driver has performed a deliberate start action. Only then is the tractive system activated. Your task is to design the electrical and embedded system that implements this starting sequence reliably and safely.',
            startingSequence: [
                '1. Ignition Key & HV rated cut-off switch (if applicable) are ON',
                '2. Charging is not in progress.',
                '3. Gear is in neutral position',
                '4. Accelerator is not in pressed condition',
                '5. Kill switch(s) are not pressed (engaged/energized).',
                '6. Brake Pedal is pressed along with a dedicated start/stop (push) button when all the above conditions are satisfied.'
            ],
            activatedActions: [
                'i) AIR should be energized (Accumulator Isolation Relay)',
                'ii) TSAL & TSAL indicator should glow as mentioned in their sections in the rulebook (Tractive System Active Light)',
                'iii) Ready to drive sound (RTDS) should start buzzing as mentioned in its section in the rulebook'
            ],
            terminology: 'AIR = Accumulator Isolation Relay, TSAL = Tractive System Active Light, RTDS = Ready-to-Drive Sound, HV = High Voltage. For any clarification on these terms or their requirements, refer to Part C (Base Vehicle Electrical Technical Requirements) of the official rulebook.',
            task: 'Design and simulate a system that implements the starting sequence. Your design must define: (1) Inputs: how each of the six conditions is sensed by the controller (switches, buttons, sensors); (2) Logic: the interlocks, state transitions and order of checks needed to activate the tractive system only when every condition is met; (3) Outputs: how the controller energises the AIR, lights the TSAL and TSAL indicator, and sounds the RTDS; (4) Abnormal behaviour: what the system does if a condition is not met, is met in the wrong order, or changes after the tractive system is already active (for example, a kill switch pressed while driving).',
            electricalInterface: {
                title: 'Electrical Interface Requirement: 3.3 V / 5 V to 12 V',
                desc: 'The outputs (AIR, TSAL, TSAL indicator, RTDS) operate at 12 V DC. The controller\'s inputs and outputs operate at 3.3 V or 5 V. A microcontroller pin cannot drive a 12 V load directly, so your design must include a switching circuit that allows a 3.3 V / 5 V logic signal to safely control each 12 V output.',
                addressPoints: [
                    'Which switching device or driver you use, and why it is suitable for your controller\'s logic voltage.',
                    'The voltage and current ratings of the load and of the switching components.',
                    'What protection your circuit needs for the type of load being switched (e.g. flyback diode for inductive relay coil).',
                    'What state each output takes if the controller resets, loses power or its output pin is disconnected (fail-safe default).',
                    'If any of your input signals come from the 12 V side, how they are safely brought down to the controller\'s logic level (e.g. optocouplers, resistive dividers, Zener clamps).'
                ]
            },
            supplyRequirement: {
                title: 'The 12 V Supply Architecture',
                desc: 'In the vehicle, the 12 V outputs are powered by the low-voltage (LV) system, while the controller runs from its own 3.3 V / 5 V supply.',
                simDetails: 'In simulation: model the 12 V supply as a separate DC voltage source, distinct from the 3.3 V / 5 V logic supply. Show how the two supplies are referenced to each other (common ground, or intentional isolation), and show the current drawn by each 12 V load.',
                hardwareDetails: 'In hardware (if you choose to build it): use only a 12 V bench power supply or a 12 V DC adapter. Represent the AIR with a relay, the TSAL and indicator with 12 V lamps or LEDs, and the RTDS with a 12 V buzzer. NEVER use a vehicle battery or tractive-system components.'
            },
            simulationParts: [
                {
                    part: 'Part A. Switching / Interface Circuit',
                    tool: 'PSpice or LTspice',
                    whatItMustShow: 'A 3.3 V / 5 V control signal switching each 12 V output, with voltages and currents shown at key points of the circuit.'
                },
                {
                    part: 'Part B. Controller Logic',
                    tool: 'Proteus or Wokwi',
                    whatItMustShow: 'A microcontroller of your choice with simulated inputs (for the six conditions) and outputs (AIR, TSAL, TSAL indicator, RTDS). Demonstrate the correct starting sequence as well as sequences that must be rejected.'
                },
                {
                    part: 'Hardware Setup',
                    tool: 'Physical Bench Setup (Optional)',
                    whatItMustShow: 'Teams may additionally bring a physical low-voltage hardware setup. This is not mandatory.'
                }
            ],
            failsafeVerification: 'Provide test cases that deliberately create each fault condition (wrong start sequence, sensor dropout, kill switch actuation during drive) and show, through simulation results, that the failsafe responds correctly.'
        }
    ],
    generalRules: [
        'Each team consists of exactly two members. Both members must understand the complete submission, and either member may be questioned on any part of it.',
        'Each team must choose exactly one problem statement and treat it as the primary design objective. Do not replace it with an unrelated project.',
        'The prototype/simulation specified for the chosen problem statement is mandatory.',
        'Register your chosen problem statement on the portal.',
        'Alternative approaches are welcome, provided they are technically justified.',
        'Any AI tool (ChatGPT, Claude, Gemini, GitHub Copilot), online resource, simulator or person may be used for assistance. AI is explicitly allowed to learn concepts, generate or review code, troubleshoot errors, and explore alternatives.',
        'Do not treat external or AI-generated material as automatically correct. Verify important technical information, and be ready to explain every decision in your own words.',
        'Do not claim results you have not obtained. Clearly distinguish between researched facts, assumptions, simulated results and measured results.',
        'Physical setups must be low-voltage and bench-scale only. Do not connect any work to a full-scale vehicle, traction battery, high-power actuator or vehicle-critical hardware.',
        'Evaluation is based on engineering reasoning, technical understanding and working results, not on presentation aesthetics or the amount of equipment used.'
    ],
    whatWeLookFor: [
        'Starts with a clear understanding of the problem instead of jumping straight to a component or technology.',
        'Considers multiple approaches and explains, with evidence, why one was chosen.',
        'Has an architecture, circuit, and implementation that agree with one another.',
        'Anticipates what can go wrong and proves that the failsafes work.',
        'States assumptions and limitations openly.',
        'Is fully understood and explained by both team members.'
    ],
    whatWeDoNotReward: [
        'Complexity for its own sake, or large component counts without clear purpose.',
        'Copying a tutorial or reference project without understanding it.',
        'Unverified claims generated by AI or online sources.',
        'A polished presentation that hides weak engineering reasoning.',
        'A prototype or simulation that works once but cannot be explained or tested.'
    ]
};

// Retain alias for backwards compatibility
export const POWERTRAIN_TEST_DATA = POWERTRAIN_CHALLENGE_DATA;

export const MECHANICAL_MYSTERY_DATA = {
    id: 'mechanical',
    name: 'Mechanical',
    headline: 'MECHANICAL PRESENTATION GUIDELINES & PROBLEM STATEMENTS',
    badge: 'ROUND 1: PRESENTATION',
    blurb: 'Evaluate technical understanding, research capability, and design approach towards converting our existing electric buggy into a fully autonomous vehicle platform.',
    lead: SUBSYSTEM_LEADS['mechanical'],
    timeline: [
        {
            id: 'mech-release',
            label: 'Presentation Guidelines & Problem Statements Release',
            detail: 'Round 1 presentation guidelines, BBW & SBW problem statements & duo teams unlock today at 7:00 PM IST',
            date: '2026-09-03T19:00:00+05:30',
            opensAt: '2026-09-02T18:00:00+05:30',
        },
        {
            id: 'mech-deadline',
            label: 'Mechanical Submission Deadline',
            detail: 'Duo solution proposals & presentations due on 17 September at 11:59 PM IST',
            date: '2026-09-17T23:59:00+05:30',
            opensAt: '2026-09-03T19:00:00+05:30',
        },
        {
            id: 'mech-results',
            label: 'Final Results Announcement',
            detail: 'Final selected crew roster published on 20 September night',
            date: '2026-09-20T23:59:00+05:30',
            opensAt: '2026-09-17T23:59:00+05:30',
        }
    ],
    teamFormat: {
        title: 'Team Formation: Teams of 2',
        badge: 'DUO TEAMS ALLOCATED',
        desc: 'All participants will be collaborating in allocated teams of two to research, engineer, and present their proposed conversion systems. For both problem statements, the final submission is a Technical Presentation (PPT / PDF).',
        finalSubmissionFormat: 'Technical Presentation (PPT / PDF)',
        pdfUrl: 'https://ik.imagekit.io/kitzwb4be/asterix/recruitment/mechanical_teams.pdf',
        pdfLocalUrl: '/recruitment/mechanical_teams.pdf',
        guidelinesPdfUrl: 'https://ik.imagekit.io/kitzwb4be/asterix/recruitment/mechanical_presentation_guidelines.pdf',
        guidelinesPdfLocalUrl: '/recruitment/mechanical_presentation_guidelines.pdf',
        teams: [
            {
                group: 'Group 01',
                members: [
                    { name: 'Priyan Lm', dept: 'MECH', phone: '6382905788' },
                    { name: 'Bharath Sri Ram', dept: 'MECH', phone: '9080440516' }
                ]
            },
            {
                group: 'Group 02',
                members: [
                    { name: 'Dharshan', dept: 'MECH', phone: '7904984217' },
                    { name: 'Y Sanjay', dept: 'MECH', phone: '7708243787' }
                ]
            },
            {
                group: 'Group 03',
                members: [
                    { name: 'Ramesh', dept: 'MECH', phone: '8925587202' },
                    { name: 'Subhashri', dept: 'MECH', phone: '9342696680' }
                ]
            },
            {
                group: 'Group 04',
                members: [
                    { name: 'Thamarikannan', dept: 'MECH', phone: '8248015187' },
                    { name: 'Nivasini', dept: 'MECH', phone: '6381907192' }
                ]
            },
            {
                group: 'Group 05',
                members: [
                    { name: 'Sudharsan M', dept: 'MECH', phone: '8072228334' },
                    { name: 'Sairam', dept: 'MECH', phone: '8760512744' }
                ]
            },
            {
                group: 'Group 06',
                members: [
                    { name: 'Dhivagar', dept: 'MECH', phone: '6280999274' },
                    { name: 'Ram Nivash', dept: 'MECH', phone: '8608031977' }
                ]
            },
            {
                group: 'Group 07',
                members: [
                    { name: 'Priteesh C', dept: 'MECH', phone: '6381017604' },
                    { name: 'M. Kowshika', dept: 'ICE', phone: '9025084072' }
                ]
            },
            {
                group: 'Group 08',
                members: [
                    { name: 'Kavin V', dept: 'MECH', phone: '9942312488' },
                    { name: 'Vishvan', dept: 'MECH', phone: '9994847863' }
                ]
            },
            {
                group: 'Group 09',
                members: [
                    { name: 'D. Raghul', dept: 'MECH', phone: '8438569107' },
                    { name: 'Gokul Prashath', dept: 'MECH', phone: '8870922180' }
                ]
            },
            {
                group: 'Group 10',
                members: [
                    { name: 'Raghavan', dept: 'MECH', phone: '9843539393' },
                    { name: 'Muhammad Shakkeel', dept: 'ICE', phone: '9353018039' }
                ]
            },
            {
                group: 'Group 11',
                members: [
                    { name: 'Paul Sibi', dept: 'MECH', phone: '8015912680' },
                    { name: 'R K Trilokeshvar', dept: 'VLSI', phone: '8695755665' }
                ]
            }
        ]
    },
    generalInstructions: [
        {
            num: '01',
            title: 'Understand the Existing Vehicle Systems',
            points: [
                'Study our electric vehicle platform architecture.',
                'Gain a clear understanding of the hydraulic braking system and throttle control design implemented in the vehicle.'
            ]
        },
        {
            num: '02',
            title: 'Incorporate Safety and Reliability Principles',
            points: [
                'Always incorporate how manual override works for your proposed design.',
                'Design your proposed subsystem with redundant sensors and fail-safe mechanisms to ensure reliable operation.',
                'Refer to relevant safety standards and guidelines (ISO, IATF, Automotive Standards, etc.) applicable to your subsystem.'
            ]
        },
        {
            num: '03',
            title: 'Consider Environmental and Protection Factors',
            points: [
                'Ensure proper IP (Ingress Protection) rating when selecting electronic components.',
                'Include failsafe measures to handle system or power failures safely.'
            ]
        },
        {
            num: '04',
            title: 'Demonstrate Research and Design Thinking',
            points: [
                'Show evidence of independent research, design reasoning, and practical feasibility.',
                'Use sketches, simulations, or block diagrams to support your concept.',
                'BONUS: Show your interest by doing research on new developments like Regenerative braking, Adaptive Cruise Control, ADAS.'
            ]
        },
        {
            num: '05',
            title: 'Simulation & Design Evaluation Criteria',
            points: [
                'The simulation and design wherever applicable on top of critical thinking and logical reasoning will be considered as an important criterion for evaluation.'
            ]
        },
        {
            num: '06',
            title: 'Final Submission Format: Technical Presentation (PPT / PDF)',
            points: [
                'For both Problem Statement 1 (Actuator Selection) and Problem Statement 2 (Manual Override & Sensors Integration), the primary final deliverable is a Technical Presentation (PPT / PDF).',
                'Ensure your presentation includes your team members, problem formulation, calculations, selection trade-offs, CAD/mounting renders, and safety fail-safes.'
            ]
        }
    ],
    challenges: [
        {
            id: 'ps1',
            number: '01',
            title: 'PS1: Actuator Selection',
            finalSubmissionFormat: 'Technical Presentation (PPT / PDF)',
            tagline: 'Actuator sizing, response time analysis, circular trajectory accommodation, and mounting architecture.',
            parts: [
                {
                    partLabel: 'Part A — Brake-by-Wire (BBW)',
                    target: 'Design a simple actuator system to generate 2000 N force at the brake master cylinder with a bore diameter (19.05mm)',
                    checklist: [
                        'Explain how you will control the actuator.',
                        'Show how and where you will mount the actuator on the vehicle.',
                        'Required braking force and actuator torque/speed calculations, response time analysis',
                        'Comparison of different mechanisms (including the different types of motors, actuator drive mechanism, and feedback control)',
                        'The pedal travels in circular trajectory, how will you accommodate design if you choose linear actuator.'
                    ]
                },
                {
                    partLabel: 'Part B — Steer-by-Wire (SBW)',
                    target: 'Design a motorized steering system capable of providing 12 Nm torque at the steering column.',
                    checklist: [
                        'Select a suitable motor and reduction mechanism.',
                        'Explain how you will control left/right steering.',
                        'Add a method to limit steering angle.',
                        'Show how and where you will mount the system on the vehicle.'
                    ]
                }
            ]
        },
        {
            id: 'ps2',
            number: '02',
            title: 'PS2: Manual Override And Sensors integration',
            finalSubmissionFormat: 'Technical Presentation (PPT / PDF)',
            tagline: 'Autonomous takeover override, motor isolation, steering turning angle adaptation, and sensor integration.',
            parts: [
                {
                    partLabel: 'Part A — BBW',
                    target: 'Design a BBW system that allows the driver to brake normally if the actuator fails and a basic sensor system for autonomous braking.',
                    checklist: [
                        'Explain how the autonomous braking will override.',
                        'Explain how manual braking is restored.',
                        'Show where the mechanism will be mounted on the vehicle.',
                        'Select suitable sensors for brake pressure, wheel speed and vehicle deceleration.'
                    ]
                },
                {
                    partLabel: 'Part B — SBW',
                    target: 'Design an SBW system that allows the driver to take manual control immediately when autonomous steering is switched off.',
                    checklist: [
                        'Explain how the autonomous control will get overrided',
                        'Explain how the motor will be isolated.',
                        'Show how the mechanism will be mounted to the steering column/chassis.',
                        'Current steering turning angle is 30 degree, how will you change to 35 degree',
                        'Explain how will you engage the motor and steering column',
                        'Select a suitable steering-angle sensor/encoder.'
                    ]
                }
            ]
        }
    ]
};


