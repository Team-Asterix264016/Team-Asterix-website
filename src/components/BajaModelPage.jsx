import { useState, useEffect } from 'react';
import ModelViewer from './ModelViewer';

export default function BajaModelPage() {
    useEffect(() => {
        window.scrollTo(0, 0);
        if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
        }
    }, []);

    const [environmentPreset, setEnvironmentPreset] = useState('city');
    const [autoRotate, setAutoRotate] = useState(false);

    const presets = [
        { id: 'city', label: 'City Lighting' },
        { id: 'sunset', label: 'Sunset Glow' },
        { id: 'forest', label: 'Forest Paddock' },
        { id: 'warehouse', label: 'Shop Floor' },
        { id: 'none', label: 'Pure Studio' }
    ];

    const carSpecs = [
        { label: 'CHASSIS', val: 'AISI 4130 Chromoly Spaceframe' },
        { label: 'SUSPENSION', val: 'Double A-Arm + FOX Air Shocks' },
        { label: 'POWERTRAIN', val: '48V High-Torque eBaja Drive' },
        { label: 'STEERING', val: 'Custom Steer-by-Wire with Stanley Loop' },
        { label: 'AUTONOMOUS', val: 'ROS 2 Jazzy + LiDAR & Stereo Perception' }
    ];

    return (
        <div className="flex min-h-screen flex-col justify-between bg-slate-100 pt-16 text-slate-900 select-none selection:bg-sky-500 selection:text-white sm:pt-20">
            {/* Main Interactive Stage */}
            <main className="relative flex min-h-[calc(100vh-140px)] w-full flex-1 flex-col items-center justify-center overflow-hidden p-2 sm:p-6">
                {/* 3D ModelViewer Canvas */}
                <div className="shadow-brutal-10 relative h-[65vh] w-full max-w-6xl overflow-hidden border-4 border-slate-900 bg-white sm:h-[72vh]">
                    <ModelViewer
                        url="/assembly_file_for_abaja.glb"
                        width="100%"
                        height="100%"
                        defaultRotationX={-35}
                        defaultRotationY={18}
                        defaultZoom={1.25}
                        minZoomDistance={0.5}
                        maxZoomDistance={7}
                        enableMouseParallax={true}
                        enableManualRotation={true}
                        enableHoverRotation={true}
                        enableManualZoom={true}
                        ambientIntensity={1.0}
                        keyLightIntensity={2.0}
                        fillLightIntensity={0.9}
                        rimLightIntensity={1.4}
                        environmentPreset={environmentPreset}
                        showScreenshotButton={true}
                        autoRotate={autoRotate}
                        autoRotateSpeed={0.5}
                    />

                    {/* Bottom Left Control Pills */}
                    <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
                        {/* Auto-Rotation Toggle */}
                        <button
                            onClick={() => setAutoRotate((prev) => !prev)}
                            className={`press shadow-brutal-2 cursor-pointer border-2 border-slate-900 px-3 py-1.5 font-mono text-[11px] font-black uppercase ${
                                autoRotate
                                    ? 'bg-sky-500 text-slate-950'
                                    : 'bg-white text-slate-900 hover:bg-sky-100'
                            }`}
                        >
                            <span>Auto-Rotate: {autoRotate ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Environment Preset Picker */}
                        <div className="shadow-brutal-2 hidden items-center gap-1 border-2 border-slate-900 bg-white p-1 sm:flex">
                            <span className="px-1.5 font-mono text-[10px] font-black text-slate-500 uppercase">
                                LIGHTING:
                            </span>
                            {presets.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setEnvironmentPreset(p.id)}
                                    className={`press press-flat cursor-pointer px-2 py-1 font-mono text-[10px] font-bold uppercase ${
                                        environmentPreset === p.id
                                            ? 'bg-slate-900 text-white'
                                            : 'text-slate-700 hover:bg-sky-100'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Top Left Interaction Helper */}
                    <div className="shadow-brutal-3 absolute top-4 left-4 z-20 hidden border-2 border-slate-900 bg-white/90 p-2.5 backdrop-blur-sm sm:block">
                        <span className="mb-1 block font-mono text-[10px] font-black text-sky-700 uppercase">
                            // CONTROLS
                        </span>
                        <div className="space-y-0.5 font-mono text-[11px] font-bold text-slate-700">
                            <div>
                                • <span className="font-black text-slate-950">DRAG</span>: Rotate 360°
                            </div>
                            <div>
                                • <span className="font-black text-slate-950">SCROLL / PINCH</span>: Zoom in /
                                out
                            </div>
                            <div>
                                • <span className="font-black text-slate-950">MOVE</span>: Parallax tilt
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subsystem Specifications Drawer / Card */}
                <div className="mt-6 grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {carSpecs.map((spec, i) => (
                        <div
                            key={i}
                            className="shadow-brutal-3 flex flex-col justify-between border-2 border-slate-900 bg-white p-3"
                        >
                            <span className="block font-mono text-[9px] font-black tracking-wider text-sky-700 uppercase">
                                {spec.label}
                            </span>
                            <span className="mt-1 text-xs leading-snug font-bold text-slate-800">
                                {spec.val}
                            </span>
                        </div>
                    ))}
                </div>
            </main>

            {/* Bottom Footer Attribution */}
            <footer className="border-t-3 border-slate-900 bg-white px-4 py-3 text-center font-mono text-xs font-bold text-slate-600 sm:px-8">
                TEAM ASTERIX • AUTONOMOUS VEHICLE VIRTUAL PROTOTYPE
            </footer>
        </div>
    );
}
