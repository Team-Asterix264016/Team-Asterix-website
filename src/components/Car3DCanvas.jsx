import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { introHandoff } from '../lib/introHandoff';

export default function Car3DCanvas() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // --- SCENE, CAMERA, RENDERER ---
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xf8fafc, 0.012);

        const BASE_FOV = 34;
        // The framing was authored for a landscape viewport.
        const BASE_ASPECT = 16 / 9;
        // Beyond this the compensation starts pushing the vehicle too far away
        // to read, so the widening is capped.
        const MAX_FOV = 66;

        const camera = new THREE.PerspectiveCamera(
            BASE_FOV,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 1.6, 7.8);

        // A PerspectiveCamera's fov is *vertical*, so a tall phone viewport
        // narrows the horizontal field and the buggy blows up until it swamps
        // the hero copy. Widening the fov as the viewport gets narrower keeps
        // roughly the horizontal framing the scene was composed for.
        const applyFraming = () => {
            const aspect = camera.aspect;
            if (aspect < BASE_ASPECT) {
                const halfBase = Math.tan((BASE_FOV * Math.PI) / 360);
                const widened = (2 * Math.atan(halfBase * (BASE_ASPECT / aspect)) * 180) / Math.PI;
                camera.fov = Math.min(MAX_FOV, widened);
            } else {
                camera.fov = BASE_FOV;
            }
            camera.updateProjectionMatrix();
        };

        applyFraming();

        /* Phone-class viewport. This canvas is full-screen and sits behind the
           whole site, so every per-fragment cost here is paid across the entire
           page on the weakest GPU that will load it. The reductions below are
           all fill-rate and shader cost -- the car's framing, pose and
           choreography are untouched, so the intro handoff still lands. */
        const isNarrowViewport = window.innerWidth < 768;

        // Phones pay for every extra device pixel across a full-screen canvas,
        // and this one sits behind the entire site. Cap them lower.
        const pixelRatio = () => {
            const cap = window.innerWidth < 768 ? 1.5 : 2;
            return Math.min(window.devicePixelRatio || 1, cap);
        };

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !isNarrowViewport,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(pixelRatio());
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = isNarrowViewport ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;

        container.appendChild(renderer.domElement);

        // --- PHOTOREALISTIC HDR ENVIRONMENT MAP (RoomEnvironment) ---
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
        scene.environment = envTexture;
        roomEnv.dispose();

        // --- LIGHTING (Studio Photoreal Lighting) ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        // Key Light with soft realistic shadows
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
        keyLight.position.set(6, 12, 8);
        keyLight.castShadow = true;
        // A 2048 shadow map is more than this background element needs on a
        // phone, where it is the single largest per-frame cost here.
        const shadowMapSize = isNarrowViewport ? 512 : 2048;
        keyLight.shadow.mapSize.width = shadowMapSize;
        keyLight.shadow.mapSize.height = shadowMapSize;
        keyLight.shadow.bias = -0.0001;
        keyLight.shadow.normalBias = 0.02;
        scene.add(keyLight);

        // Sky Blue Metallic Edge Rim Light
        const skyBlueLight = new THREE.DirectionalLight(0x0ea5e9, 3.6);
        skyBlueLight.position.set(-8, 7, -6);
        scene.add(skyBlueLight);

        // Front-Left Soft Cool Fill Light and the ground bounce. Dropped on phones:
        // five lights means five loop iterations per fragment of every PBR material,
        // and the RoomEnvironment map already supplies most of this bounce.
        if (!isNarrowViewport) {
            const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
            fillLight.position.set(-6, 3, 6);
            scene.add(fillLight);

            const bounceLight = new THREE.DirectionalLight(0xf1f5f9, 1.0);
            bounceLight.position.set(0, -5, 0);
            scene.add(bounceLight);
        }

        // --- PHOTOREALISTIC PBR MATERIALS ---

        /* Clearcoat is a second specular lobe and a second normal evaluated per
           fragment, and the three materials using it cover most of the car's
           screen area. On a phone they fall back to MeshStandardMaterial without
           it, with roughness nudged down to stand in for the lost sheen.
           MeshStandardMaterial already backs nine other materials here, so this
           is a constructor swap, not new machinery. */
        const coatedMaterial = (base, coat, mobileRoughness) =>
            isNarrowViewport
                ? new THREE.MeshStandardMaterial({
                      ...base,
                      roughness: mobileRoughness ?? base.roughness
                  })
                : new THREE.MeshPhysicalMaterial({ ...base, ...coat });

        const skyBluePowderCoat = coatedMaterial(
            { color: 0x0284c7, roughness: 0.15, metalness: 0.35 }, // Vibrant Sky Blue
            { clearcoat: 0.9, clearcoatRoughness: 0.06, reflectivity: 0.95 },
            0.13
        );

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
            color: 0x6e4a2c,
            roughness: 0.22,
            metalness: 0.9
        });

        const foxBlueMaterial = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.18,
            metalness: 0.92
        });

        const whiteRimMaterial = coatedMaterial(
            { color: 0xffffff, roughness: 0.16, metalness: 0.15 },
            { clearcoat: 0.8, clearcoatRoughness: 0.08 },
            0.14
        );

        const rubberTireMaterial = new THREE.MeshStandardMaterial({
            color: 0x14181c,
            roughness: 0.88,
            metalness: 0.04
        });

        const whiteCompositeMaterial = coatedMaterial(
            { color: 0xf8fafc, roughness: 0.32, metalness: 0.05 },
            { clearcoat: 0.45 },
            0.3
        );

        const rubberTrimMaterial = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.75,
            metalness: 0.05
        });

        const darkHardwareMaterial = new THREE.MeshStandardMaterial({
            color: 0x24272c,
            roughness: 0.45,
            metalness: 0.75
        });

        const brakeCaliperRedMaterial = coatedMaterial(
            { color: 0xdc2626, roughness: 0.18, metalness: 0.35 },
            { clearcoat: 0.8, clearcoatRoughness: 0.08 },
            0.15
        );

        // --- 3D VEHICLE ASSEMBLY (REAL GLB CAD MODEL) ---
        const carRoot = new THREE.Group();
        scene.add(carRoot);

        const proceduralModel = new THREE.Group();
        carRoot.add(proceduralModel);

        const gltfLoader = new GLTFLoader();

        const applyCADMaterials = (model) => {
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    const origMats = Array.isArray(child.material) ? child.material : [child.material];
                    const meshName = (child.name || '').toLowerCase();

                    const newMats = origMats.map((mat) => {
                        if (!mat) return mat;
                        const matName = (mat.name || '').toLowerCase();

                        if (meshName.includes('tire') || matName.includes('rubber')) {
                            return rubberTireMaterial;
                        } else if (
                            meshName.includes('chassis') ||
                            meshName.includes('frame') ||
                            meshName.includes('baja05') ||
                            meshName.includes('spona') ||
                            matName.includes('blue') ||
                            matName.includes('color-') ||
                            matName.includes('unnamed') ||
                            matName.includes('test')
                        ) {
                            return skyBluePowderCoat;
                        } else if (meshName.includes('caliper')) {
                            return brakeCaliperRedMaterial;
                        } else if (
                            meshName.includes('disc') ||
                            meshName.includes('rotor') ||
                            matName.includes('steel') ||
                            matName.includes('chrome')
                        ) {
                            return chromeMaterial;
                        } else if (matName.includes('bronze') || matName.includes('gold')) {
                            return foxBronzeMaterial;
                        } else if (matName.includes('aluminum') || meshName.includes('fork') || meshName.includes('hub')) {
                            return brushedSteelMaterial;
                        }
                        try {
                            mat.envMapIntensity = 1.8;
                            mat.needsUpdate = true;
                        } catch (e) {
                            // ignore property set on uncustomized material
                        }
                        return mat;
                    });

                    child.material = Array.isArray(child.material) ? newMats : newMats[0];
                }
            });
        };

        const onGLBLoaded = (gltf) => {
            const model = gltf.scene;

            // Auto-center and normalize scale for the CAD assembly
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            model.position.sub(center);

            // CAD assembly dimensions scaling
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetScale = maxDim > 0 ? 2.85 / maxDim : 1;

            const glbWrapper = new THREE.Group();
            glbWrapper.add(model);
            glbWrapper.scale.setScalar(targetScale);
            glbWrapper.position.y = 0.12;

            // Apply realistic PBR materials & shadow casting
            applyCADMaterials(model);

            // Swap out procedural fallback with real CAD GLB assembly!
            carRoot.remove(proceduralModel);
            carRoot.add(glbWrapper);
        };

        gltfLoader.load(
            '/assembly_file_for_abaja.glb',
            onGLBLoaded,
            undefined,
            (err) => {
                console.warn('Primary GLB path notice, trying fallback name:', err);
                gltfLoader.load(
                    '/assembly_file_for_abaja (1).glb',
                    onGLBLoaded,
                    undefined,
                    (err2) => {
                        console.warn('GLB load error, keeping procedural model:', err2);
                    }
                );
            }
        );

        const frameGroup = new THREE.Group();
        proceduralModel.add(frameGroup);

        const addTube = (start, end, radius = 0.032, mat = skyBluePowderCoat) => {
            const vStart = new THREE.Vector3(...start);
            const vEnd = new THREE.Vector3(...end);
            const dist = vStart.distanceTo(vEnd);
            const geom = new THREE.CylinderGeometry(radius, radius, dist, 16);
            const mesh = new THREE.Mesh(geom, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const midpoint = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
            mesh.position.copy(midpoint);
            mesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                vEnd.clone().sub(vStart).normalize()
            );
            frameGroup.add(mesh);
            return mesh;
        };

        // ==========================================
        // 1. SKY-BLUE TUBULAR ROLL CAGE & CHASSIS
        // ==========================================
        const hoopTopY = 1.38;
        const hoopWidth = 0.46;
        addTube([-hoopWidth, hoopTopY, -0.25], [hoopWidth, hoopTopY, -0.25], 0.034);
        addTube([-hoopWidth, hoopTopY, -0.25], [-0.58, 0.0, -0.25], 0.034);
        addTube([hoopWidth, hoopTopY, -0.25], [0.58, 0.0, -0.25], 0.034);

        // Top Square Loop
        const loopH = 0.22;
        const loopW = 0.2;
        addTube([-loopW, hoopTopY, -0.25], [-loopW, hoopTopY + loopH, -0.25], 0.022);
        addTube([loopW, hoopTopY, -0.25], [loopW, hoopTopY + loopH, -0.25], 0.022);
        addTube([-loopW, hoopTopY + loopH, -0.25], [loopW, hoopTopY + loopH, -0.25], 0.022);

        // Front Windshield Upper Bar
        const frontTopY = 1.26;
        const frontTopZ = 0.45;
        const frontTopW = 0.4;
        addTube([-frontTopW, frontTopY, frontTopZ], [frontTopW, frontTopY, frontTopZ], 0.032);

        // Roof Bars
        addTube([-frontTopW, frontTopY, frontTopZ], [-hoopWidth, hoopTopY, -0.25], 0.032);
        addTube([frontTopW, frontTopY, frontTopZ], [hoopWidth, hoopTopY, -0.25], 0.032);

        // A-Pillars
        const dashY = 0.48;
        const dashZ = 0.85;
        const dashW = 0.52;
        addTube([-frontTopW, frontTopY, frontTopZ], [-dashW, dashY, dashZ], 0.034);
        addTube([frontTopW, frontTopY, frontTopZ], [dashW, dashY, dashZ], 0.034);
        addTube([-dashW, dashY, dashZ], [dashW, dashY, dashZ], 0.032);

        // Front Crash Box
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

        // Lower Frame Rails
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

        // Steering Console & Wheel
        const dashPlateGeom = new THREE.BoxGeometry(0.38, 0.22, 0.015);
        const dashPlate = new THREE.Mesh(dashPlateGeom, skyBluePowderCoat);
        dashPlate.position.set(0, 0.58, 0.72);
        dashPlate.rotation.x = -0.55;
        dashPlate.castShadow = true;
        proceduralModel.add(dashPlate);

        const steerCol = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.35, 12),
            darkHardwareMaterial
        );
        steerCol.position.set(0, 0.65, 0.58);
        steerCol.rotation.x = 0.6;
        proceduralModel.add(steerCol);

        const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 10, 24), darkHardwareMaterial);
        steerWheel.position.set(0, 0.74, 0.44);
        steerWheel.rotation.x = -0.6;
        proceduralModel.add(steerWheel);

        // ==========================================
        // 2. WHITE COMPOSITE FIREWALL / SEATBACK PANEL
        // ==========================================
        const seatGroup = new THREE.Group();
        seatGroup.position.set(0, 0.66, -0.22);
        seatGroup.rotation.x = -0.18;

        const panelShape = new THREE.Shape();
        const pW = 0.44;
        const pH = 1.04;
        const rad = 0.12;
        panelShape.moveTo(-pW + rad, 0);
        panelShape.lineTo(pW - rad, 0);
        panelShape.quadraticCurveTo(pW, 0, pW, rad);
        panelShape.lineTo(pW * 0.76, pH - rad);
        panelShape.quadraticCurveTo(pW * 0.76, pH, pW * 0.76 - rad, pH);
        panelShape.lineTo(-pW * 0.76 + rad, pH);
        panelShape.quadraticCurveTo(-pW * 0.76, pH, -pW * 0.76, pH - rad);
        panelShape.lineTo(-pW, rad);
        panelShape.quadraticCurveTo(-pW, 0, -pW + rad, 0);

        const extrudeSettings = {
            depth: 0.018,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 0.008,
            bevelThickness: 0.008
        };
        const firewallGeom = new THREE.ExtrudeGeometry(panelShape, extrudeSettings);
        firewallGeom.center();
        const firewallMesh = new THREE.Mesh(firewallGeom, whiteCompositeMaterial);
        firewallMesh.castShadow = true;
        firewallMesh.receiveShadow = true;
        seatGroup.add(firewallMesh);

        const trimMesh = new THREE.Mesh(firewallGeom, rubberTrimMaterial);
        trimMesh.scale.set(1.025, 1.025, 0.85);
        trimMesh.position.z = -0.004;
        seatGroup.add(trimMesh);

        const createHarnessSlot = (x) => {
            const slotGeom = new THREE.BoxGeometry(0.09, 0.035, 0.03);
            const slotMesh = new THREE.Mesh(slotGeom, rubberTrimMaterial);
            slotMesh.position.set(x, 0.14, 0.01);
            return slotMesh;
        };
        seatGroup.add(createHarnessSlot(-0.11));
        seatGroup.add(createHarnessSlot(0.11));
        proceduralModel.add(seatGroup);

        // Battery Box & Floor Pan
        const batteryBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.42), darkHardwareMaterial);
        batteryBox.position.set(0, 0.14, 0.12);
        batteryBox.castShadow = true;
        proceduralModel.add(batteryBox);

        const floorPan = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.015, 1.35), brushedSteelMaterial);
        floorPan.position.set(0, 0.05, 0.25);
        floorPan.receiveShadow = true;
        proceduralModel.add(floorPan);

        // ==========================================
        // 3. SUSPENSION A-ARMS & FOX AIR SHOCKS
        // ==========================================
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
        proceduralModel.add(flShock);

        const frShock = createFoxAirShock(false);
        frShock.position.set(0.68, 0.36, 1.12);
        frShock.rotation.z = 0.42;
        frShock.rotation.x = 0.18;
        proceduralModel.add(frShock);

        const rearHubLeft = [-0.98, 0.12, -0.95];
        const rearHubRight = [0.98, 0.12, -0.95];
        addTube([-0.55, 0.08, -0.3], rearHubLeft, 0.026, brushedSteelMaterial);
        addTube([0.55, 0.08, -0.3], rearHubRight, 0.026, brushedSteelMaterial);

        const rlShock = createFoxAirShock(true);
        rlShock.position.set(-0.72, 0.42, -0.85);
        rlShock.rotation.z = -0.32;
        rlShock.rotation.x = -0.15;
        proceduralModel.add(rlShock);

        const rrShock = createFoxAirShock(false);
        rrShock.position.set(0.72, 0.42, -0.85);
        rrShock.rotation.z = 0.32;
        rrShock.rotation.x = -0.15;
        proceduralModel.add(rrShock);

        // ==========================================
        // 4. 4 KNOBBY ATV TIRES & WHITE STEEL RIMS
        // ==========================================
        const wheels = [];

        const createBajaWheel = (isFront = true) => {
            const wheelUnit = new THREE.Group();

            const tireRadius = isFront ? 0.42 : 0.46;
            const tireWidth = isFront ? 0.28 : 0.34;
            const rimRadius = tireRadius * 0.58;

            const tireGeom = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 32);
            const tireMesh = new THREE.Mesh(tireGeom, rubberTireMaterial);
            tireMesh.rotation.z = Math.PI / 2;
            tireMesh.castShadow = true;
            tireMesh.receiveShadow = true;
            wheelUnit.add(tireMesh);

            const treadCount = 16;
            const treadGroup = new THREE.Group();
            for (let i = 0; i < treadCount; i++) {
                const angle = (i / treadCount) * Math.PI * 2;
                const lugGeom = new THREE.BoxGeometry(tireWidth * 0.44, 0.045, 0.068);
                const lugLeft = new THREE.Mesh(lugGeom, rubberTireMaterial);
                lugLeft.position.set(
                    -tireWidth * 0.22,
                    Math.sin(angle) * (tireRadius + 0.016),
                    Math.cos(angle) * (tireRadius + 0.016)
                );
                lugLeft.rotation.x = angle;
                lugLeft.rotation.y = 0.26;
                lugLeft.castShadow = true;
                treadGroup.add(lugLeft);

                const lugRight = new THREE.Mesh(lugGeom, rubberTireMaterial);
                lugRight.position.set(
                    tireWidth * 0.22,
                    Math.sin(angle + 0.1) * (tireRadius + 0.016),
                    Math.cos(angle + 0.1) * (tireRadius + 0.016)
                );
                lugRight.rotation.x = angle + 0.1;
                lugRight.rotation.y = -0.26;
                lugRight.castShadow = true;
                treadGroup.add(lugRight);
            }
            wheelUnit.add(treadGroup);

            const rimGeom = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.86, tireWidth + 0.02, 24);
            const rimMesh = new THREE.Mesh(rimGeom, whiteRimMaterial);
            rimMesh.rotation.z = Math.PI / 2;
            rimMesh.castShadow = true;
            wheelUnit.add(rimMesh);

            const rotorGeom = new THREE.CylinderGeometry(rimRadius * 0.72, rimRadius * 0.72, 0.015, 24);
            const brakeRotor = new THREE.Mesh(rotorGeom, brakeRotorMaterial);
            brakeRotor.position.set(-0.06, 0, 0);
            brakeRotor.rotation.z = Math.PI / 2;
            wheelUnit.add(brakeRotor);

            const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.1), skyBluePowderCoat);
            caliper.position.set(-0.06, rimRadius * 0.5, 0.02);
            wheelUnit.add(caliper);

            const hubGeom = new THREE.CylinderGeometry(0.08, 0.08, tireWidth + 0.038, 16);
            const hubMesh = new THREE.Mesh(hubGeom, darkHardwareMaterial);
            hubMesh.rotation.z = Math.PI / 2;
            wheelUnit.add(hubMesh);

            for (let b = 0; b < 4; b++) {
                const bAngle = (b / 4) * Math.PI * 2;
                const bolt = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.016, 0.016, tireWidth + 0.044, 6),
                    chromeMaterial
                );
                bolt.position.set(
                    0,
                    Math.sin(bAngle) * (rimRadius * 0.52),
                    Math.cos(bAngle) * (rimRadius * 0.52)
                );
                bolt.rotation.z = Math.PI / 2;
                wheelUnit.add(bolt);
            }

            return { group: wheelUnit, tireMesh, treadGroup };
        };

        const wheelPositions = [
            { pos: [-0.94, 0.08, 1.15], isFront: true, isLeft: true },
            { pos: [0.94, 0.08, 1.15], isFront: true, isLeft: false },
            { pos: [-1.02, 0.12, -0.95], isFront: false, isLeft: true },
            { pos: [1.02, 0.12, -0.95], isFront: false, isLeft: false }
        ];

        wheelPositions.forEach(({ pos, isFront, isLeft }) => {
            const wheelObj = createBajaWheel(isFront);
            wheelObj.group.position.set(...pos);
            if (!isLeft) {
                wheelObj.group.rotation.y = Math.PI;
            }
            // Right-hand wheels are yawed 180 degrees so their tread faces
            // outward, which also reverses their local X axis. Spinning every
            // wheel by the same local delta therefore rotated the two sides in
            // opposite world directions. Record the sign and apply it.
            wheelObj.spinSign = isLeft ? 1 : -1;
            proceduralModel.add(wheelObj.group);
            wheels.push(wheelObj);
        });

        // Soft Ground Contact Shadow
        const createShadowCanvas = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
            grad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
            grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.18)');
            grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 256, 256);
            return canvas;
        };

        const shadowTex = new THREE.CanvasTexture(createShadowCanvas());
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(4.0, 4.6),
            new THREE.MeshBasicMaterial({
                map: shadowTex,
                transparent: true,
                opacity: 0.7,
                depthWrite: false
            })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.52;

        // The contact shadow used to be a child of carRoot, so it inherited the
        // car's yaw, pitch and scale. Once the car turned to its side profile
        // the "ground" shadow stood up on edge with it. It now lives in a
        // separate group that only ever follows the car's horizontal position.
        const shadowRoot = new THREE.Group();
        shadowRoot.add(shadowPlane);
        scene.add(shadowRoot);

        // --- PARALLAX INTERACTION STATE ---
        let mouseX = 0;
        let mouseY = 0;
        let targetMouseX = 0;
        let targetMouseY = 0;
        let scrollRatio = 0;
        let scrollVelocity = 0;
        let lastScrollY = window.scrollY || 0;

        // Cursor influence is now a slow drift, not a control.
        //
        // Letting the mouse drive yaw and pitch meant the reader could rotate
        // the vehicle into orientations the scroll choreography was never posed
        // for -- looking up at its underside, or catching it edge-on -- which is
        // what made it read as broken at certain angles. Rotation no longer
        // responds to the cursor at all. A small positional drift remains so the
        // scene is not completely inert.
        const MOUSE_X_RANGE = 0.22;
        const MOUSE_Y_RANGE = 0.16;

        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            targetMouseX = x * MOUSE_X_RANGE;
            targetMouseY = y * MOUSE_Y_RANGE;
        };

        const handleScroll = () => {
            const currentY = window.scrollY || window.pageYOffset;

            // The intro sequence occupies several viewports of scroll before any
            // real content, and it covers this canvas completely while it runs.
            // Measuring progress across it would spend the whole choreography
            // on a section nobody can see it through, so the staging starts
            // where the intro ends.
            const introEl = document.getElementById('intro');
            const introHeight = introEl ? introEl.offsetHeight : 0;

            // Gradually reveal the 3D buggy canvas ONLY AFTER the small box
            // has completely scrolled out of the top of the viewport.
            if (introHandoff.active && introHeight > 0) {
                const boxExitThreshold = introHeight - window.innerHeight * 0.25;
                const fadeDuration = window.innerHeight * 0.45;
                const carAlpha = Math.min(1, Math.max(0, (currentY - boxExitThreshold) / fadeDuration));
                container.style.opacity = carAlpha.toFixed(3);
                container.style.visibility = carAlpha > 0.001 ? 'visible' : 'hidden';
            } else {
                container.style.opacity = '1';
                container.style.visibility = 'visible';
            }

            const contentY = currentY - introHeight;
            const maxScroll = Math.max(
                1,
                document.documentElement.scrollHeight - window.innerHeight - introHeight
            );
            scrollRatio = Math.min(1, Math.max(0, contentY / maxScroll));

            scrollVelocity += currentY - lastScrollY;
            lastScrollY = currentY;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        // --- SCROLL STAGING ---
        // Previously five if/else bands each computed their own absolute pose.
        // Neighbouring bands did not agree at their shared boundary, so scale,
        // depth and yaw all jumped every time the reader crossed one.
        //
        // The pose is now a single keyframe track sampled by scroll position.
        // Adjacent keyframes share their endpoint by construction, so there is
        // no boundary left to pop at. Yaw increases monotonically across the
        // page: the buggy turns through one full revolution as you read, and
        // dwells on the side profile where the suspension is worth looking at.
        const buildKeyframes = (isMobile, aspect) => {
            const heroX = isMobile ? 0.32 : Math.min(2.1, Math.max(1.55, aspect * 0.96));
            const px = (desktop) => (isMobile ? 0 : desktop);
            const sc = (desktop, mobile) => (isMobile ? mobile : desktop);

            return [
                // Portrait drops the vehicle toward the lower half of the
                // screen. Landscape can sit it beside the copy; a phone cannot,
                // and centred it sat straight on top of the hero wordmark.
                {
                    at: 0.0,
                    x: heroX,
                    y: sc(0.02, -2.6),
                    z: 0.28,
                    rotY: -0.48,
                    rotX: 0.12,
                    rotZ: -0.02,
                    scale: sc(1.48, 0.88)
                },
                {
                    at: 0.12,
                    x: heroX - 0.25,
                    y: sc(0.02, -2.3),
                    z: 0.22,
                    rotY: -0.26,
                    rotX: 0.12,
                    rotZ: -0.02,
                    scale: sc(1.44, 0.9)
                },
                {
                    at: 0.32,
                    x: px(0.85),
                    y: sc(0.02, -0.8),
                    z: -0.1,
                    rotY: 0.85,
                    rotX: 0.1,
                    rotZ: 0.03,
                    scale: sc(1.36, 0.95)
                },
                {
                    at: 0.45,
                    x: px(1.5),
                    y: sc(0.06, -0.06),
                    z: 0.15,
                    rotY: Math.PI * 0.5,
                    rotX: 0.08,
                    rotZ: -0.03,
                    scale: sc(1.38, 0.96)
                },
                {
                    at: 0.58,
                    x: px(1.35),
                    y: sc(0.06, -0.06),
                    z: 0.15,
                    rotY: 1.95,
                    rotX: 0.08,
                    rotZ: -0.03,
                    scale: sc(1.38, 0.96)
                },
                {
                    at: 0.7,
                    x: px(0.75),
                    y: sc(-0.06, -0.04),
                    z: 0.1,
                    rotY: 3.05,
                    rotX: 0.16,
                    rotZ: 0.02,
                    scale: sc(1.32, 0.95)
                },
                {
                    at: 0.82,
                    x: px(1.15),
                    y: sc(-0.06, -0.04),
                    z: 0.1,
                    rotY: 4.2,
                    rotX: 0.16,
                    rotZ: 0.02,
                    scale: sc(1.32, 0.95)
                },
                {
                    at: 1.0,
                    x: px(0.0),
                    y: sc(0.05, 0.0),
                    z: 0.25,
                    rotY: 5.8,
                    rotX: 0.12,
                    rotZ: 0.0,
                    scale: sc(1.42, 1.0)
                }
            ];
        };

        // Where the buggy sits at the instant the intro footage starts fading:
        // centred and large, framed like the closing turntable frame rather
        // than parked on its hero mark off to one side. Yaw matches the hero
        // keyframe so the handoff is pure translation and scale.
        // Portrait cover-crops the footage into a close-up, so the model has to
        // be scaled up to match it. The handoff then reads as the camera
        // pulling back off the vehicle rather than the vehicle shrinking.
        const matchPose = (isMobileNow) =>
            isMobileNow
                ? { x: 0, y: -0.2, z: 0.3, rotY: -0.48, rotX: 0.04, rotZ: -0.02, scale: 2.1 }
                : { x: 0, y: -0.34, z: 0.3, rotY: -0.48, rotX: 0.04, rotZ: -0.02, scale: 0.96 };

        // Smoothstep between keyframes so the track has no velocity
        // discontinuity where two segments meet.
        const smoothstep = (t) => t * t * (3 - 2 * t);

        const POSE_KEYS = ['x', 'y', 'z', 'rotY', 'rotX', 'rotZ', 'scale'];

        const samplePose = (frames, ratio, out) => {
            let i = 0;
            while (i < frames.length - 2 && ratio > frames[i + 1].at) i++;

            const a = frames[i];
            const b = frames[i + 1];
            const span = b.at - a.at;
            const t = span <= 0 ? 0 : smoothstep(Math.min(1, Math.max(0, (ratio - a.at) / span)));

            for (const key of POSE_KEYS) {
                out[key] = a[key] + (b[key] - a[key]) * t;
            }
            return out;
        };

        const targetPose = { x: 0, y: 0, z: 0, rotY: 0, rotX: 0, rotZ: 0, scale: 1 };
        // Populated from the first sampled pose so the buggy does not fly in
        // from the origin on load.
        let currentPose = null;

        let animationFrameId = null;
        const clock = new THREE.Clock();

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Keyframes depend on viewport shape, so they are rebuilt only when
        // that actually changes rather than once per frame.
        let isMobile = window.innerWidth < 768;
        let keyframes = buildKeyframes(isMobile, container.clientWidth / (container.clientHeight || 1));

        // Frame-rate independent damping: the same visual settling time
        // whether the display runs at 60Hz or 144Hz.
        const damp = (dt, tau) => 1 - Math.exp(-dt / tau);

        const renderFrame = (dt, elapsedTime, animated) => {
            const mouseK = damp(dt, 0.2);
            mouseX += (targetMouseX - mouseX) * mouseK;
            mouseY += (targetMouseY - mouseY) * mouseK;

            samplePose(keyframes, scrollRatio, targetPose);

            // While the intro is dissolving, blend from the pose that matches
            // its closing frame to the normal scroll-driven track. Yaw is held
            // identical across the blend on purpose: the vehicle translates and
            // scales into its hero mark but never spins, so the cross-dissolve
            // has no rotation for the eye to catch mid-fade.
            if (introHandoff.active && introHandoff.progress < 1) {
                const h = introHandoff.progress;
                const match = matchPose(isMobile);
                for (const key of POSE_KEYS) {
                    targetPose[key] = match[key] + (targetPose[key] - match[key]) * h;
                }
            }

            if (!currentPose) {
                currentPose = { ...targetPose };
            } else {
                // Easing the sampled pose on top of the smoothstep track
                // absorbs the abrupt scroll deltas a mouse wheel produces.
                const poseK = damp(dt, 0.16);
                for (const key of POSE_KEYS) {
                    currentPose[key] += (targetPose[key] - currentPose[key]) * poseK;
                }
            }

            // Natural micro-hover floating
            const floatY = animated
                ? Math.sin(elapsedTime * 1.3) * 0.045 + Math.cos(elapsedTime * 0.8) * 0.02
                : 0;
            const floatRotZ = animated ? Math.sin(elapsedTime * 1.0) * 0.012 : 0;

            // Cursor drift is suppressed while the dissolve runs, so where the
            // pointer happens to be resting cannot pull the vehicle off the
            // mark the footage is fading into.
            const mouseGain = introHandoff.active ? introHandoff.progress : 1;

            carRoot.scale.setScalar(currentPose.scale);
            carRoot.position.x = currentPose.x + mouseX * 0.18 * mouseGain;
            carRoot.position.y = currentPose.y + floatY + mouseY * 0.1 * mouseGain;
            carRoot.position.z = currentPose.z;

            // Orientation comes from the scroll track and the idle float only.
            carRoot.rotation.y = currentPose.rotY;
            carRoot.rotation.x = currentPose.rotX;
            carRoot.rotation.z = currentPose.rotZ + floatRotZ;

            // The contact shadow tracks the buggy's staged position but never
            // inherits its yaw or pitch. Vertical tracking was missing: the
            // shadow stayed at world y while the portrait keyframes drop the
            // vehicle well below it, which left the ellipse hanging in the air
            // above the car on phones.
            shadowRoot.position.x = carRoot.position.x;
            shadowRoot.position.y = currentPose.y;
            shadowRoot.position.z = currentPose.z;
            shadowRoot.scale.setScalar(currentPose.scale);

            // Wheels are driven by how fast the page is actually moving, with a
            // slow idle underneath, instead of a fixed rate that ran whether or
            // not the vehicle appeared to be travelling.
            if (animated) {
                const spin = 0.0025 + Math.abs(scrollVelocity) * 0.0016;
                for (const wheel of wheels) {
                    wheel.group.rotation.x += spin * wheel.spinSign;
                    // Keep the accumulated angle bounded; left to run for hours
                    // it loses float precision and the wheels visibly stutter.
                    if (wheel.group.rotation.x > Math.PI * 2) wheel.group.rotation.x -= Math.PI * 2;
                    else if (wheel.group.rotation.x < -Math.PI * 2) wheel.group.rotation.x += Math.PI * 2;
                }
            }

            scrollVelocity *= 1 - damp(dt, 0.18);
            if (Math.abs(scrollVelocity) < 0.01) scrollVelocity = 0;

            // The camera tracks the vehicle's staged position only. Aiming it
            // at the cursor-drifted position meant the frame itself swayed
            // under the pointer on top of the vehicle already drifting.
            camera.lookAt(currentPose.x * 0.1, currentPose.y * 0.1, 0);

            renderer.render(scene, camera);
        };

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const dt = Math.min(0.05, clock.getDelta());
            renderFrame(dt, clock.getElapsedTime(), true);
        };

        const stopLoop = () => {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        };

        const startLoop = () => {
            if (animationFrameId !== null) return;
            clock.getDelta(); // discard the gap accumulated while stopped
            animate();
        };

        // Reduced motion keeps the buggy, drops the idle float and the wheel
        // spin, and repaints only when the reader scrolls.
        let staticRepaintQueued = false;
        const requestStaticRepaint = () => {
            if (staticRepaintQueued) return;
            staticRepaintQueued = true;
            requestAnimationFrame(() => {
                staticRepaintQueued = false;
                renderFrame(1 / 60, 0, false);
            });
        };

        const applyMotionPreference = () => {
            if (reduceMotion.matches) {
                stopLoop();
                window.addEventListener('scroll', requestStaticRepaint, { passive: true });
                requestStaticRepaint();
            } else {
                window.removeEventListener('scroll', requestStaticRepaint);
                startLoop();
            }
        };

        applyMotionPreference();
        reduceMotion.addEventListener('change', applyMotionPreference);

        // A hidden tab should not be running a WebGL loop.
        const handleVisibility = () => {
            if (document.hidden) stopLoop();
            else if (!reduceMotion.matches) startLoop();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        /* The container is `fixed inset-0`, so on mobile every URL-bar show/hide
           fires a resize -- and `setSize` reallocates the drawing buffer. Running
           that on every frame of the browser's own toolbar animation is the most
           expensive thing this component can do. Debounced, and a no-op when the
           dimensions have not actually changed, which is the common case when
           only the toolbar moved. */
        let resizeTimer = null;
        let lastWidth = container.clientWidth;
        let lastHeight = container.clientHeight;

        const applyResize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (!width || !height) return;
            if (width === lastWidth && height === lastHeight) return;
            lastWidth = width;
            lastHeight = height;

            camera.aspect = width / height;
            applyFraming();

            renderer.setPixelRatio(pixelRatio());
            renderer.setSize(width, height);

            isMobile = window.innerWidth < 768;
            keyframes = buildKeyframes(isMobile, width / height);

            if (reduceMotion.matches) requestStaticRepaint();
        };

        const handleResize = () => {
            if (resizeTimer !== null) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resizeTimer = null;
                applyResize();
            }, 150);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            stopLoop();
            if (resizeTimer !== null) clearTimeout(resizeTimer);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', requestStaticRepaint);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibility);
            reduceMotion.removeEventListener('change', applyMotionPreference);

            // Everything allocated above has to be released explicitly. The
            // previous teardown called renderer.dispose() only, leaking every
            // geometry, material and render target -- twice per mount under
            // StrictMode, which is enough to exhaust WebGL contexts in dev.
            scene.traverse((object) => {
                if (!object.isMesh) return;
                object.geometry?.dispose();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const material of materials) {
                    if (!material) continue;
                    for (const value of Object.values(material)) {
                        if (value && value.isTexture) value.dispose();
                    }
                    material.dispose();
                }
            });

            shadowTex.dispose();
            envTexture.dispose();
            pmremGenerator.dispose();

            if (renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
            renderer.forceContextLoss();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="pointer-events-none fixed inset-0 h-full w-full"
            style={{ zIndex: 1 }}
        />
    );
}
