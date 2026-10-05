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
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between selection:bg-sky-500 selection:text-white select-none pt-16 sm:pt-20">
            {/* Main Interactive Stage */}
            <main className="relative flex-1 w-full min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden">

                {/* 3D ModelViewer Canvas */}
                <div className="relative w-full max-w-6xl h-[65vh] sm:h-[72vh] bg-white border-4 border-slate-900 shadow-brutal-10 overflow-hidden">

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
                            onClick={() => setAutoRotate(prev => !prev)}
                            className={`press px-3 py-1.5 border-2 border-slate-900 font-mono font-black text-[11px] uppercase shadow-brutal-2 cursor-pointer ${autoRotate ? 'bg-sky-500 text-slate-950' : 'bg-white text-slate-900 hover:bg-sky-100'
                                }`}
                        >
                            <span>Auto-Rotate: {autoRotate ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Environment Preset Picker */}
                        <div className="hidden sm:flex items-center gap-1 bg-white border-2 border-slate-900 shadow-brutal-2 p-1">
                            <span className="text-[10px] font-mono font-black text-slate-500 px-1.5 uppercase">LIGHTING:</span>
                            {presets.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setEnvironmentPreset(p.id)}
                                    className={`press press-flat px-2 py-1 text-[10px] font-mono font-bold uppercase cursor-pointer ${environmentPreset === p.id
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
                    <div className="absolute top-4 left-4 z-20 hidden sm:block bg-white/90 backdrop-blur-sm border-2 border-slate-900 p-2.5 shadow-brutal-3">
                        <span className="text-[10px] font-mono font-black text-sky-700 block mb-1 uppercase">
                            // CONTROLS
                        </span>
                        <div className="text-[11px] font-mono font-bold text-slate-700 space-y-0.5">
                            <div>• <span className="text-slate-950 font-black">DRAG</span>: Rotate 360°</div>
                            <div>• <span className="text-slate-950 font-black">SCROLL / PINCH</span>: Zoom in / out</div>
                            <div>• <span className="text-slate-950 font-black">MOVE</span>: Parallax tilt</div>
                        </div>
                    </div>

                </div>

                {/* Subsystem Specifications Drawer / Card */}
                <div className="w-full max-w-6xl mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {carSpecs.map((spec, i) => (
                        <div
                            key={i}
                            className="p-3 bg-white border-2 border-slate-900 shadow-brutal-3 flex flex-col justify-between"
                        >
                            <span className="text-[9px] font-mono font-black text-sky-700 uppercase tracking-wider block">
                                {spec.label}
                            </span>
                            <span className="text-xs font-bold text-slate-800 mt-1 leading-snug">
                                {spec.val}
                            </span>
                        </div>
                    ))}
                </div>

            </main>

            {/* Bottom Footer Attribution */}
            <footer className="bg-white border-t-3 border-slate-900 py-3 px-4 sm:px-8 text-center text-xs font-mono font-bold text-slate-600">
                TEAM ASTERIX • AUTONOMOUS VEHICLE VIRTUAL PROTOTYPE
            </footer>

        </div>
    );
}
