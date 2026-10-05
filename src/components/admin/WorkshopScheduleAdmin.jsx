import { useState } from 'react';
import { useWebsiteData } from '../../context/WebsiteDataContext';
import { WORKSHOP_TRACKS } from '../../../server/src/config/workshopPackages.js';
import WorkshopRegistrationsAdmin from './WorkshopRegistrationsAdmin';

const btn = 'press font-mono font-black text-[11px] uppercase border border-slate-900 cursor-pointer px-3 py-1.5 transition-all';
const btnPrimary = `${btn} bg-sky-500 hover:bg-sky-400 text-white`;
const btnQuiet = `${btn} bg-white hover:bg-slate-100 text-slate-900`;
const input = 'w-full px-2.5 py-1.5 border border-slate-900 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-sky-500';
const labelClass = 'block text-[10px] font-mono font-black uppercase text-slate-700 mb-1';

export default function WorkshopScheduleAdmin({ showStatus, onImageUpload }) {
    const { siteData, updateWorkshop, syncToServer, syncState } = useWebsiteData();
    const workshop = siteData.workshop || { tracks: WORKSHOP_TRACKS };
    const tracks = workshop.tracks || WORKSHOP_TRACKS;

    const [activeSection, setActiveSection] = useState('registrations'); // 'registrations' or 'schedule'
    const trackKeys = Object.keys(WORKSHOP_TRACKS);
    const [selectedTrackId, setSelectedTrackId] = useState(trackKeys[0] || 'software');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Active track data with fallback to canonical defaults
    const currentTrack = {
        ...WORKSHOP_TRACKS[selectedTrackId],
        ...tracks[selectedTrackId]
    };

    const handleSaveWorkshop = async () => {
        setIsSaving(true);
        showStatus?.('Saving workshop details to Cloud...');
        try {
            const ok = await syncToServer(siteData);
            if (ok) {
                showStatus?.('✓ Workshop changes synced to cloud successfully!');
            } else {
                showStatus?.('Saved locally. Connect to network to sync.');
            }
        } catch {
            showStatus?.('Failed to sync. Saved locally.');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to update current track's fields
    const patchTrack = (fields) => {
        updateWorkshop({
            tracks: {
                ...tracks,
                [selectedTrackId]: {
                    ...currentTrack,
                    ...fields
                }
            }
        });
    };

    // PDF Upload Handler
    const handlePdfFileSelect = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        try {
            await onImageUpload(
                e,
                (url) => {
                    patchTrack({ syllabus: url });
                    showStatus?.('Syllabus PDF uploaded and updated successfully.');
                },
                '/asterix/workshop',
                `${selectedTrackId}_syllabus`
            );
        } catch (err) {
            console.error('PDF upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const resetToDefaultPdf = () => {
        const defaultPdf = WORKSHOP_TRACKS[selectedTrackId]?.syllabus || `/workshop/${selectedTrackId}-syllabus.pdf`;
        patchTrack({ syllabus: defaultPdf });
        showStatus?.('Syllabus reset to default PDF.');
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b-2 border-slate-200 pb-4">
                <h2 className="text-2xl font-black uppercase text-slate-900">Workshop Management</h2>
                <p className="text-xs font-bold text-slate-500 font-mono mt-1">
                    Manage workshop curriculum PDFs, batch timings, schedule days, and registration details.
                </p>
            </div>

            {/* Section Switcher Tabs */}
            <div className="flex flex-wrap gap-2 border-b-2 border-slate-900 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveSection('registrations')}
                    className={`press px-4 py-2 border-2 border-slate-900 font-mono text-xs font-black uppercase cursor-pointer transition-all ${
                        activeSection === 'registrations'
                            ? 'bg-sky-500 text-slate-950 shadow-brutal-3'
                            : 'bg-white hover:bg-slate-100 text-slate-900'
                    }`}
                >
                    💳 Registered Candidates & Payments
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('schedule')}
                    className={`press px-4 py-2 border-2 border-slate-900 font-mono text-xs font-black uppercase cursor-pointer transition-all ${
                        activeSection === 'schedule'
                            ? 'bg-sky-500 text-slate-950 shadow-brutal-3'
                            : 'bg-white hover:bg-slate-100 text-slate-900'
                    }`}
                >
                    📅 Curriculum & Batch Timings
                </button>
            </div>

            {activeSection === 'registrations' ? (
                <WorkshopRegistrationsAdmin showStatus={showStatus} />
            ) : (
                <>
                    {/* Track Switcher Tabs & Cloud Save Action */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-900 pb-3">
                        <div className="flex flex-wrap gap-2">
                            {trackKeys.map((key) => {
                                const t = WORKSHOP_TRACKS[key];
                                const active = selectedTrackId === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelectedTrackId(key)}
                                        className={`px-4 py-2 border border-slate-900 font-mono text-xs font-black uppercase cursor-pointer transition-all ${
                                            active
                                                ? 'bg-slate-900 text-white shadow-brutal-2-brand'
                                                : 'bg-white hover:bg-slate-50 text-slate-800'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-500 hidden sm:inline">
                                {syncState === 'saving' ? '⟳ Syncing...' : syncState === 'synced' ? '● Synced to Database' : ''}
                            </span>
                            <button
                                type="button"
                                onClick={handleSaveWorkshop}
                                disabled={isSaving}
                                className="press px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-mono font-black text-xs uppercase border-2 border-slate-900 shadow-brutal-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : '💾 Save Workshop Changes'}
                            </button>
                        </div>
                    </div>

            {/* SECTION 1: SYLLABUS DOCUMENT MANAGEMENT */}
            <div className="p-5 bg-white border-2 border-slate-900 shadow-brutal-3 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black uppercase text-slate-900">
                            Syllabus Document (PDF)
                        </h3>
                        {currentTrack.syllabus?.includes('ik.imagekit.io') ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-500">
                                🍃 ImageKit Cloud CDN
                            </span>
                        ) : currentTrack.syllabus?.startsWith('http') ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-sky-100 text-sky-800 border border-sky-500">
                                🌐 External URL
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-slate-100 text-slate-700 border border-slate-400">
                                📁 Local Default
                            </span>
                        )}
                    </div>
                    {currentTrack.syllabus && (
                        <a
                            href={currentTrack.syllabus}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="press text-xs font-mono font-bold text-sky-700 hover:text-sky-800 underline flex items-center gap-1"
                        >
                            View Active PDF &rarr;
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Active Syllabus File URL / Path</label>
                        <input
                            type="text"
                            value={currentTrack.syllabus || ''}
                            onChange={(e) => patchTrack({ syllabus: e.target.value })}
                            placeholder="e.g. /workshop/software-perception-syllabus.pdf or https://..."
                            className={input}
                        />
                    </div>

                    <div className="flex gap-2">
                        <label className={`${btnPrimary} flex-1 text-center truncate cursor-pointer`}>
                            <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfFileSelect}
                                disabled={isUploading}
                                className="hidden"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={resetToDefaultPdf}
                            className={btnQuiet}
                            title="Reset to default local syllabus PDF"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* SECTION 2: TIMINGS, DATES & AUDIENCE */}
            <div className="p-5 bg-white border-2 border-slate-900 shadow-brutal-3 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-lg font-black uppercase text-slate-900">
                        Track Timings, Dates &amp; Audience
                    </h3>
                    <p className="text-xs font-mono font-bold text-slate-500 mt-1">
                        These details are displayed directly in the track overview cards on the public workshop page.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className={labelClass}>Daily Session Timing</label>
                        <input
                            type="text"
                            value={currentTrack.timing || ''}
                            onChange={(e) => patchTrack({ timing: e.target.value })}
                            placeholder="e.g. 5:10 PM – 6:50 PM"
                            className={input}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Schedule Days</label>
                        <input
                            type="text"
                            value={currentTrack.days || ''}
                            onChange={(e) => patchTrack({ days: e.target.value })}
                            placeholder="e.g. Tuesday & Thursday"
                            className={input}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Overall Dates &amp; Duration</label>
                        <input
                            type="text"
                            value={currentTrack.dates || ''}
                            onChange={(e) => patchTrack({ dates: e.target.value })}
                            placeholder="e.g. 29 Sep – 7 Nov 2026"
                            className={input}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Target Audience</label>
                        <input
                            type="text"
                            value={currentTrack.audience || ''}
                            onChange={(e) => patchTrack({ audience: e.target.value })}
                            placeholder="e.g. Beginners welcome. No prior knowledge needed."
                            className={input}
                        />
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
    );
}
