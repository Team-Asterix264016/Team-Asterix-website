import { useState } from 'react';
import { useWebsiteData } from '../../context/WebsiteDataContext';
import { WORKSHOP_TRACKS } from '../../../server/src/config/workshopPackages.js';
import WorkshopRegistrationsAdmin from './WorkshopRegistrationsAdmin';

const btn =
    'press font-mono font-black text-[11px] uppercase border border-slate-900 cursor-pointer px-3 py-1.5 transition-all';
const btnPrimary = `${btn} bg-sky-500 hover:bg-sky-400 text-white`;
const btnQuiet = `${btn} bg-white hover:bg-slate-100 text-slate-900`;
const input =
    'w-full px-2.5 py-1.5 border border-slate-900 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-sky-500';
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
        const defaultPdf =
            WORKSHOP_TRACKS[selectedTrackId]?.syllabus || `/workshop/${selectedTrackId}-syllabus.pdf`;
        patchTrack({ syllabus: defaultPdf });
        showStatus?.('Syllabus reset to default PDF.');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b-2 border-slate-200 pb-4">
                <h2 className="text-2xl font-black text-slate-900 uppercase">Workshop Management</h2>
                <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                    Manage workshop curriculum PDFs, batch timings, schedule days, and registration details.
                </p>
            </div>

            {/* Section Switcher Tabs */}
            <div className="flex flex-wrap gap-2 border-b-2 border-slate-900 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveSection('registrations')}
                    className={`press cursor-pointer border-2 border-slate-900 px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                        activeSection === 'registrations'
                            ? 'shadow-brutal-3 bg-sky-500 text-slate-950'
                            : 'bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                >
                    💳 Registered Candidates & Payments
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('schedule')}
                    className={`press cursor-pointer border-2 border-slate-900 px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                        activeSection === 'schedule'
                            ? 'shadow-brutal-3 bg-sky-500 text-slate-950'
                            : 'bg-white text-slate-900 hover:bg-slate-100'
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
                                        className={`cursor-pointer border border-slate-900 px-4 py-2 font-mono text-xs font-black uppercase transition-all ${
                                            active
                                                ? 'shadow-brutal-2-brand bg-slate-900 text-white'
                                                : 'bg-white text-slate-800 hover:bg-slate-50'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="hidden font-mono text-[10px] font-bold text-slate-500 sm:inline">
                                {syncState === 'saving'
                                    ? '⟳ Syncing...'
                                    : syncState === 'synced'
                                      ? '● Synced to Database'
                                      : ''}
                            </span>
                            <button
                                type="button"
                                onClick={handleSaveWorkshop}
                                disabled={isSaving}
                                className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-emerald-400 px-4 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-emerald-500 disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : '💾 Save Workshop Changes'}
                            </button>
                        </div>
                    </div>

                    {/* SECTION 1: SYLLABUS DOCUMENT MANAGEMENT */}
                    <div className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900 uppercase">
                                    Syllabus Document (PDF)
                                </h3>
                                {currentTrack.syllabus?.includes('ik.imagekit.io') ? (
                                    <span className="border border-emerald-500 bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-800 uppercase">
                                        🍃 ImageKit Cloud CDN
                                    </span>
                                ) : currentTrack.syllabus?.startsWith('http') ? (
                                    <span className="border border-sky-500 bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-black text-sky-800 uppercase">
                                        🌐 External URL
                                    </span>
                                ) : (
                                    <span className="border border-slate-400 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black text-slate-700 uppercase">
                                        📁 Local Default
                                    </span>
                                )}
                            </div>
                            {currentTrack.syllabus && (
                                <a
                                    href={currentTrack.syllabus}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="press flex items-center gap-1 font-mono text-xs font-bold text-sky-700 underline hover:text-sky-800"
                                >
                                    View Active PDF &rarr;
                                </a>
                            )}
                        </div>

                        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
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
                                <label className={`${btnPrimary} flex-1 cursor-pointer truncate text-center`}>
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
                    <div className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-white p-5">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-lg font-black text-slate-900 uppercase">
                                Track Timings, Dates &amp; Audience
                            </h3>
                            <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                These details are displayed directly in the track overview cards on the public
                                workshop page.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                    {/* SECTION 3: TRACK LEAD CONTACT DETAILS */}
                    <div className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-white p-5">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-lg font-black text-slate-900 uppercase">
                                👤 Track Lead &amp; Default Contact Details
                            </h3>
                            <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                Set contact details for candidates requesting support or accessing details for this track.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className={labelClass}>Subsystem Lead Name(s)</label>
                                <input
                                    type="text"
                                    value={currentTrack.leadName || ''}
                                    onChange={(e) => patchTrack({ leadName: e.target.value })}
                                    placeholder="e.g. Ratheeswar, Preethika"
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Lead Designation / Role</label>
                                <input
                                    type="text"
                                    value={currentTrack.leadRole || ''}
                                    onChange={(e) => patchTrack({ leadRole: e.target.value })}
                                    placeholder="e.g. Team Lead & Autonomous Perception Lead"
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Official Lead Email ID</label>
                                <input
                                    type="email"
                                    value={currentTrack.leadEmail || ''}
                                    onChange={(e) => patchTrack({ leadEmail: e.target.value })}
                                    placeholder="e.g. software.asterix@psgitech.ac.in"
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Official Lead Phone Number</label>
                                <input
                                    type="text"
                                    value={currentTrack.leadPhone || ''}
                                    onChange={(e) => patchTrack({ leadPhone: e.target.value })}
                                    placeholder="e.g. +91 86089 44644"
                                    className={input}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: SESSIONS & INSTRUCTORS DIRECTORY */}
                    <div className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-white p-5">
                        <div className="border-b border-slate-200 pb-3">
                            <h3 className="text-lg font-black text-slate-900 uppercase">
                                📚 Session Schedule &amp; Instructor Directory ({currentTrack.schedule?.length || 0} Sessions)
                            </h3>
                            <p className="mt-1 font-mono text-xs font-bold text-slate-500">
                                Edit individual session titles, venues, instructor names, roles, emails, and phone numbers shown in student session modals.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {currentTrack.schedule?.map((sess, idx) => (
                                <div key={sess.id || idx} className="border-2 border-slate-900 bg-slate-50 p-4 shadow-brutal-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-2">
                                        <span className="font-mono text-xs font-black uppercase text-slate-900">
                                            {sess.label} ({sess.date} - {sess.days})
                                        </span>
                                        <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-950">
                                            {sess.type || 'lecture'}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        <div className="lg:col-span-2">
                                            <label className={labelClass}>Session Title</label>
                                            <input
                                                type="text"
                                                value={sess.title || ''}
                                                onChange={(e) => {
                                                    const newSch = [...(currentTrack.schedule || [])];
                                                    newSch[idx] = { ...newSch[idx], title: e.target.value };
                                                    patchTrack({ schedule: newSch });
                                                }}
                                                className={input}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Venue Location</label>
                                            <input
                                                type="text"
                                                value={sess.venue || ''}
                                                onChange={(e) => {
                                                    const newSch = [...(currentTrack.schedule || [])];
                                                    newSch[idx] = { ...newSch[idx], venue: e.target.value };
                                                    patchTrack({ schedule: newSch });
                                                }}
                                                placeholder="e.g. Autonomous Systems Lab"
                                                className={input}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Instructor Name(s)</label>
                                            <input
                                                type="text"
                                                value={sess.instructor || ''}
                                                onChange={(e) => {
                                                    const newSch = [...(currentTrack.schedule || [])];
                                                    newSch[idx] = { ...newSch[idx], instructor: e.target.value };
                                                    patchTrack({ schedule: newSch });
                                                }}
                                                placeholder="e.g. Ratheeswar, Preethika"
                                                className={input}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Instructor Role / Designation</label>
                                            <input
                                                type="text"
                                                value={sess.instructorRole || ''}
                                                onChange={(e) => {
                                                    const newSch = [...(currentTrack.schedule || [])];
                                                    newSch[idx] = { ...newSch[idx], instructorRole: e.target.value };
                                                    patchTrack({ schedule: newSch });
                                                }}
                                                placeholder="e.g. Autonomous Perception Lead"
                                                className={input}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Instructor Email ID</label>
                                            <input
                                                type="email"
                                                value={sess.instructorEmail || ''}
                                                onChange={(e) => {
                                                    const newSch = [...(currentTrack.schedule || [])];
                                                    newSch[idx] = { ...newSch[idx], instructorEmail: e.target.value };
                                                    patchTrack({ schedule: newSch });
                                                }}
                                                placeholder="e.g. software.asterix@psgitech.ac.in"
                                                className={input}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Instructor Phone Number</label>
                                            <input
                                                type="text"
                                                value={sess.instructorPhone || ''}
                                                onChange={(e) => {
                                                    const newSch = [...(currentTrack.schedule || [])];
                                                    newSch[idx] = { ...newSch[idx], instructorPhone: e.target.value };
                                                    patchTrack({ schedule: newSch });
                                                }}
                                                placeholder="e.g. +91 86089 44644"
                                                className={input}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
