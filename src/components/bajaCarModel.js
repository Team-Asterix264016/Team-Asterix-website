import * as THREE from 'three';

export function buildBajaCarGroup() {
    const skyBluePowderCoat = new THREE.MeshPhysicalMaterial({
        color: 0x0284c7, // Asterix Electric Sky Blue
        roughness: 0.15,
        metalness: 0.35,
        clearcoat: 0.9,
        clearcoatRoughness: 0.06,
        reflectivity: 0.95
    });

    const brushedSteelMaterial = new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        roughness: 0.26,
        metalness: 0.88
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.03,
        metalness: 1.0
    });

    const foxBronzeMaterial = new THREE.MeshStandardMaterial({
        color: 0x854d0e, // Fox bronze anodized
        roughness: 0.22,
        metalness: 0.9
    });

    const foxBlueMaterial = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.18,
        metalness: 0.92
    });

    const whiteRimMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.16,
        metalness: 0.15,
        clearcoat: 0.8,
        clearcoatRoughness: 0.08
    });

    const rubberTireMaterial = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.92,
        metalness: 0.02
    });

    const whiteCompositeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.32,
        metalness: 0.05,
        clearcoat: 0.5
    });

    const rubberTrimMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.85,
        metalness: 0.05
    });

    const darkHardwareMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.45,
        metalness: 0.85
    });

    const brakeRotorMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        roughness: 0.18,
        metalness: 0.95
    });

    const carRoot = new THREE.Group();
    carRoot.name = 'Asterix_eBaja_2026';

    const frameGroup = new THREE.Group();
    carRoot.add(frameGroup);

    const addTube = (start, end, radius = 0.032, mat = skyBluePowderCoat) => {
        const vStart = new THREE.Vector3(...start);
        const vEnd = new THREE.Vector3(...end);
        const dist = vStart.distanceTo(vEnd);
        const geom = new THREE.CylinderGeometry(radius, radius, dist, 14);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const midpoint = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
        mesh.position.copy(midpoint);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vEnd.clone().sub(vStart).normalize());
        frameGroup.add(mesh);
        return mesh;
    };

    // 1. SKY-BLUE TUBULAR ROLL CAGE & SPACEFRAME (Asterix Autonomous Spec)
    const hoopTopY = 1.38;
    const hoopWidth = 0.46;
    addTube([-hoopWidth, hoopTopY, -0.25], [hoopWidth, hoopTopY, -0.25], 0.034);
    addTube([-hoopWidth, hoopTopY, -0.25], [-0.58, 0.0, -0.25], 0.034);
    addTube([hoopWidth, hoopTopY, -0.25], [0.58, 0.0, -0.25], 0.034);

    // Top loop for Autonomous sensor canopy
    const loopH = 0.22;
    const loopW = 0.2;
    addTube([-loopW, hoopTopY, -0.25], [-loopW, hoopTopY + loopH, -0.25], 0.022);
    addTube([loopW, hoopTopY, -0.25], [loopW, hoopTopY + loopH, -0.25], 0.022);
    addTube([-loopW, hoopTopY + loopH, -0.25], [loopW, hoopTopY + loopH, -0.25], 0.022);

    // Windshield Upper Bar
    const frontTopY = 1.26;
    const frontTopZ = 0.45;
    const frontTopW = 0.4;
    addTube([-frontTopW, frontTopY, frontTopZ], [frontTopW, frontTopY, frontTopZ], 0.032);
    addTube([-frontTopW, frontTopY, frontTopZ], [-hoopWidth, hoopTopY, -0.25], 0.032);
    addTube([frontTopW, frontTopY, frontTopZ], [hoopWidth, hoopTopY, -0.25], 0.032);

    // A-Pillars
    const dashY = 0.48;
    const dashZ = 0.85;
    const dashW = 0.52;
    addTube([-frontTopW, frontTopY, frontTopZ], [-dashW, dashY, dashZ], 0.034);
    addTube([frontTopW, frontTopY, frontTopZ], [dashW, dashY, dashZ], 0.034);
    addTube([-dashW, dashY, dashZ], [dashW, dashY, dashZ], 0.032);

    // Front Crash Box & Nose
    const noseY = 0.35;
    const noseZ = 1.65;
    const noseW = 0.42;
    addTube([-noseW, noseY, noseZ], [noseW, noseY, noseZ], 0.034);
    addTube([-noseW, 0.05, noseZ], [noseW, 0.05, noseZ], 0.034);
    addTube([-noseW, 0.05, noseZ], [-noseW, noseY, noseZ], 0.032);
    addTube([noseW, 0.05, noseZ], [noseW, noseY, noseZ], 0.032);

    addTube([-dashW, dashY, dashZ], [-noseW, noseY, noseZ], 0.032);
    addTube([dashW, dashY, dashZ], [noseW, noseY, noseZ], 0.032);
    addTube([-0.58, 0.05, dashZ], [-noseW, 0.05, noseZ], 0.034);
    addTube([0.58, 0.05, dashZ], [noseW, 0.05, noseZ], 0.034);

    addTube([0, noseY, noseZ], [0, dashY, dashZ], 0.026);
    addTube([-dashW, dashY, dashZ], [0.58, 0.05, dashZ], 0.024);
    addTube([dashW, dashY, dashZ], [-0.58, 0.05, dashZ], 0.024);

    // Lower Frame Rails & Rear Bay
    const rearRailZ = -1.15;
    addTube([-0.58, 0.05, dashZ], [-0.58, 0.05, rearRailZ], 0.034);
    addTube([0.58, 0.05, dashZ], [0.58, 0.05, rearRailZ], 0.034);
    addTube([-0.58, 0.05, rearRailZ], [0.58, 0.05, rearRailZ], 0.034);
    addTube([-0.58, 0.05, 0.0], [0.58, 0.05, 0.0], 0.03);

    const waistY = 0.42;
    addTube([-0.58, waistY, dashZ], [-0.58, waistY, -0.25], 0.03);
    addTube([0.58, waistY, dashZ], [0.58, waistY, -0.25], 0.03);
    addTube([-0.58, waistY, dashZ], [-0.58, 0.05, -0.25], 0.026);
    addTube([0.58, waistY, dashZ], [0.58, 0.05, -0.25], 0.026);

    addTube([-hoopWidth, hoopTopY, -0.25], [-0.48, 0.45, rearRailZ], 0.032);
    addTube([hoopWidth, hoopTopY, -0.25], [0.48, 0.45, rearRailZ], 0.032);
    addTube([-0.48, 0.45, rearRailZ], [0.48, 0.45, rearRailZ], 0.03);
    addTube([-0.48, 0.45, rearRailZ], [-0.58, 0.05, rearRailZ], 0.03);
    addTube([0.48, 0.45, rearRailZ], [0.58, 0.05, rearRailZ], 0.03);

    // 2. COCKPIT, STEERING & DASHBOARD
    const dashPlateGeom = new THREE.BoxGeometry(0.38, 0.22, 0.015);
    const dashPlate = new THREE.Mesh(dashPlateGeom, skyBluePowderCoat);
    dashPlate.position.set(0, 0.58, 0.72);
    dashPlate.rotation.x = -0.55;
    dashPlate.castShadow = true;
    carRoot.add(dashPlate);

    const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 12), darkHardwareMaterial);
    steerCol.position.set(0, 0.65, 0.58);
    steerCol.rotation.x = 0.6;
    carRoot.add(steerCol);

    const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 10, 24), darkHardwareMaterial);
    steerWheel.position.set(0, 0.74, 0.44);
    steerWheel.rotation.x = -0.6;
    carRoot.add(steerWheel);

    // White composite driver firewall & seat
    const seatGroup = new THREE.Group();
    seatGroup.position.set(0, 0.66, -0.22);
    seatGroup.rotation.x = -0.18;
    const firewallGeom = new THREE.BoxGeometry(0.7, 0.98, 0.024);
    const firewallMesh = new THREE.Mesh(firewallGeom, whiteCompositeMaterial);
    firewallMesh.castShadow = true;
    seatGroup.add(firewallMesh);

    const trimMesh = new THREE.Mesh(firewallGeom, rubberTrimMaterial);
    trimMesh.scale.set(1.025, 1.025, 0.85);
    trimMesh.position.z = -0.004;
    seatGroup.add(trimMesh);
    carRoot.add(seatGroup);

    // Battery Box & Brushed Floor Pan
    const batteryBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.42), darkHardwareMaterial);
    batteryBox.position.set(0, 0.14, 0.12);
    batteryBox.castShadow = true;
    carRoot.add(batteryBox);

    const floorPan = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.015, 1.35), brushedSteelMaterial);
    floorPan.position.set(0, 0.05, 0.25);
    floorPan.receiveShadow = true;
    carRoot.add(floorPan);

    // 3. SUSPENSION A-ARMS & FOX RACING AIR SHOCKS
    const frontHubLeft = [-0.94, 0.08, 1.15];
    const frontHubRight = [0.94, 0.08, 1.15];
    addTube([-0.45, 0.06, 1.35], frontHubLeft, 0.022, brushedSteelMaterial);
    addTube([-0.45, 0.06, 0.95], frontHubLeft, 0.022, brushedSteelMaterial);
    addTube([0.45, 0.06, 1.35], frontHubRight, 0.022, brushedSteelMaterial);
    addTube([0.45, 0.06, 0.95], frontHubRight, 0.022, brushedSteelMaterial);

    const upperHubLeft = [-0.9, 0.28, 1.15];
    const upperHubRight = [0.9, 0.28, 1.15];
    addTube([-0.42, 0.32, 1.25], upperHubLeft, 0.02, brushedSteelMaterial);
    addTube([-0.42, 0.32, 0.95], upperHubLeft, 0.02, brushedSteelMaterial);
    addTube([0.42, 0.32, 1.25], upperHubRight, 0.02, brushedSteelMaterial);
    addTube([0.42, 0.32, 0.95], upperHubRight, 0.02, brushedSteelMaterial);

    const createFoxAirShock = (isLeft = true) => {
        const shockGroup = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        const bodyGeom = new THREE.CylinderGeometry(0.034, 0.034, 0.36, 16);
        const shockBody = new THREE.Mesh(bodyGeom, foxBronzeMaterial);
        shockBody.position.y = 0.16;
        shockBody.castShadow = true;
        shockGroup.add(shockBody);

        const capGeom = new THREE.CylinderGeometry(0.038, 0.038, 0.04, 16);
        const topCap = new THREE.Mesh(capGeom, foxBlueMaterial);
        topCap.position.y = 0.34;
        const bottomCap = new THREE.Mesh(capGeom, foxBlueMaterial);
        bottomCap.position.y = -0.02;
        shockGroup.add(topCap);
        shockGroup.add(bottomCap);

        const shaftGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.32, 16);
        const shockShaft = new THREE.Mesh(shaftGeom, chromeMaterial);
        shockShaft.position.y = -0.14;
        shockGroup.add(shockShaft);

        const canGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.18, 14);
        const shockCan = new THREE.Mesh(canGeom, darkHardwareMaterial);
        shockCan.position.set(0.046 * sign, 0.2, 0.02);
        shockCan.castShadow = true;
        shockGroup.add(shockCan);

        return shockGroup;
    };

    const flShock = createFoxAirShock(true);
    flShock.position.set(-0.68, 0.36, 1.12);
    flShock.rotation.z = -0.42;
    flShock.rotation.x = 0.18;
    carRoot.add(flShock);

    const frShock = createFoxAirShock(false);
    frShock.position.set(0.68, 0.36, 1.12);
    frShock.rotation.z = 0.42;
    frShock.rotation.x = 0.18;
    carRoot.add(frShock);

    const rearHubLeft = [-0.98, 0.12, -0.95];
    const rearHubRight = [0.98, 0.12, -0.95];
    addTube([-0.55, 0.08, -0.3], rearHubLeft, 0.026, brushedSteelMaterial);
    addTube([0.55, 0.08, -0.3], rearHubRight, 0.026, brushedSteelMaterial);

    const rlShock = createFoxAirShock(true);
    rlShock.position.set(-0.72, 0.42, -0.85);
    rlShock.rotation.z = -0.32;
    rlShock.rotation.x = -0.15;
    carRoot.add(rlShock);

    const rrShock = createFoxAirShock(false);
    rrShock.position.set(0.72, 0.42, -0.85);
    rrShock.rotation.z = 0.32;
    rrShock.rotation.x = -0.15;
    carRoot.add(rrShock);

    // 4. KNOBBY ATV TIRES & WHITE STEEL RIMS
    const createBajaWheel = (isFront = true) => {
        const wheelUnit = new THREE.Group();
        const tireRadius = isFront ? 0.42 : 0.46;
        const tireWidth = isFront ? 0.28 : 0.34;
        const rimRadius = tireRadius * 0.58;

        const tireGeom = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 28);
        const tireMesh = new THREE.Mesh(tireGeom, rubberTireMaterial);
        tireMesh.rotation.z = Math.PI / 2;
        tireMesh.castShadow = true;
        tireMesh.receiveShadow = true;
        wheelUnit.add(tireMesh);

        // Tread lugs
        const treadCount = 14;
        const treadGroup = new THREE.Group();
        for (let i = 0; i < treadCount; i++) {
            const angle = (i / treadCount) * Math.PI * 2;
            const lugGeom = new THREE.BoxGeometry(tireWidth * 0.44, 0.045, 0.068);
            const lug = new THREE.Mesh(lugGeom, rubberTireMaterial);
            lug.position.set(
                0,
                Math.sin(angle) * (tireRadius + 0.016),
                Math.cos(angle) * (tireRadius + 0.016)
            );
            lug.rotation.x = angle;
            lug.castShadow = true;
            treadGroup.add(lug);
        }
        wheelUnit.add(treadGroup);

        const rimGeom = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.86, tireWidth + 0.02, 20);
        const rimMesh = new THREE.Mesh(rimGeom, whiteRimMaterial);
        rimMesh.rotation.z = Math.PI / 2;
        rimMesh.castShadow = true;
        wheelUnit.add(rimMesh);

        const rotorGeom = new THREE.CylinderGeometry(rimRadius * 0.72, rimRadius * 0.72, 0.015, 20);
        const brakeRotor = new THREE.Mesh(rotorGeom, brakeRotorMaterial);
        brakeRotor.position.set(-0.06, 0, 0);
        brakeRotor.rotation.z = Math.PI / 2;
        wheelUnit.add(brakeRotor);

        const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.1), skyBluePowderCoat);
        caliper.position.set(-0.06, rimRadius * 0.5, 0.02);
        wheelUnit.add(caliper);

        const hubGeom = new THREE.CylinderGeometry(0.08, 0.08, tireWidth + 0.038, 14);
        const hubMesh = new THREE.Mesh(hubGeom, darkHardwareMaterial);
        hubMesh.rotation.z = Math.PI / 2;
        wheelUnit.add(hubMesh);

        return wheelUnit;
    };

    const wheelPositions = [
        { pos: [-0.94, 0.08, 1.15], isFront: true, isLeft: true },
        { pos: [0.94, 0.08, 1.15], isFront: true, isLeft: false },
        { pos: [-1.02, 0.12, -0.95], isFront: false, isLeft: true },
        { pos: [1.02, 0.12, -0.95], isFront: false, isLeft: false }
    ];

    wheelPositions.forEach(({ pos, isFront, isLeft }) => {
        const wheel = createBajaWheel(isFront);
        wheel.position.set(...pos);
        if (!isLeft) {
            wheel.rotation.y = Math.PI;
        }
        carRoot.add(wheel);
    });

    // 5. AUTONOMOUS SENSOR POD (LiDAR & STEREO CAMERAS)
    const sensorPod = new THREE.Group();
    sensorPod.position.set(0, hoopTopY + loopH + 0.08, -0.25);
    const podBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.04, 16), darkHardwareMaterial);
    const lidarPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.065, 16), skyBluePowderCoat);
    lidarPuck.position.y = 0.05;
    sensorPod.add(podBase);
    sensorPod.add(lidarPuck);
    carRoot.add(sensorPod);

    return carRoot;
}
