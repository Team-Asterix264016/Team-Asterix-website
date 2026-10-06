import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';

export default function SessionDetailModal({ session, trackName, student, isOpen, onClose, onTakeQuiz }) {
    const [attendanceStatus, setAttendanceStatus] = useState(null); // 'present' | 'absent' | 'upcoming' | null
    const [checkInTime, setCheckInTime] = useState(null);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    const isSoftwareTrack = String(trackName || '').toLowerCase().includes('software');
    const sessionTrackId = isSoftwareTrack ? 'software' : 'powertrain';

    // Track entitlement check: Combo students access both!
    const isCombo = student?.package === 'combo';
    const isEnrolledInTrack =
        !student ||
        isCombo ||
        student.package === sessionTrackId ||
        (Array.isArray(student.tracksEnrolled) && student.tracksEnrolled.includes(sessionTrackId));

    useEffect(() => {
        if (!isOpen || !session || !student) {
            setAttendanceStatus(null);
            setCheckInTime(null);
            return;
        }

        const fetchStudentAttendance = async () => {
            setLoadingAttendance(true);
            try {
                const token = localStorage.getItem('workshop_jwt');
                const res = await fetch(
                    apiUrl(`/api/workshop/student-status?rollNo=${encodeURIComponent(
                        student.rollNo || ''
                    )}&email=${encodeURIComponent(student.email || '')}`),
                    {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    }
                );
                const data = await res.json();
                if (data.success && Array.isArray(data.attendance)) {
                    // Check if candidate checked in for this session ID or session date
                    const matched = data.attendance.find(
                        (att) =>
                            att.sessionId === session.id ||
                            (att.sessionNumber && session.id && session.id.includes(`s${att.sessionNumber}`)) ||
                            (att.sessionDate && session.date && session.date.includes(att.sessionDate))
                    );

                    if (matched) {
                        setAttendanceStatus('present');
                        setCheckInTime(matched.checkedInAt);
                    } else {
                        setAttendanceStatus('absent');
                    }
                }
            } catch (err) {
                console.error('Error fetching attendance status:', err);
            } finally {
                setLoadingAttendance(false);
            }
        };

        fetchStudentAttendance();
    }, [isOpen, session, student]);

    if (!isOpen || !session) return null;

    // Instructor contact lookup using legitimate subsystem lead details
    const getInstructorContacts = (instructorName) => {
        const name = String(instructorName || '').toLowerCase();
        if (name.includes('joel') || name.includes('powertrain')) {
            return {
                role: 'Powertrain Subsystem Lead',
                email: 'powertrain.asterix@psgitech.ac.in',
                phone: '+91 72079 60077',
                whatsapp: 'https://wa.me/917207960077'
            };
        }
        if (name.includes('preethika')) {
            return {
                role: 'Autonomous Perception & Software Co-Lead',
                email: 'software.asterix@psgitech.ac.in',
                phone: '+91 86089 44644',
                whatsapp: 'https://wa.me/918608944644'
            };
        }
        if (name.includes('mahavishnu')) {
            return {
                role: 'Computer Vision Specialist & AI Mentor',
                email: 'software.asterix@psgitech.ac.in',
                phone: '+91 86089 44644',
                whatsapp: 'https://wa.me/918608944644'
            };
        }
        if (name.includes('rithvin') || name.includes('ratheeswar')) {
            return {
                role: 'Team Lead & Autonomous Perception Lead',
                email: 'software.asterix@psgitech.ac.in',
                phone: '+91 86089 44644',
                whatsapp: 'https://wa.me/918608944644'
            };
        }
        return {
            role: isSoftwareTrack ? 'Software & Perception Subsystem Lead' : 'Powertrain Subsystem Lead',
            email: isSoftwareTrack ? 'software.asterix@psgitech.ac.in' : 'powertrain.asterix@psgitech.ac.in',
            phone: isSoftwareTrack ? '+91 86089 44644' : '+91 72079 60077',
            whatsapp: isSoftwareTrack ? 'https://wa.me/918608944644' : 'https://wa.me/917207960077'
        };
    };

    const contactInfo = getInstructorContacts(session.instructor);

    // Track-Specific Notes & Resources
    const notes = isSoftwareTrack
        ? [
              {
                  title: `Software: ${session.title} - Lecture Slides & System Specs`,
                  type: 'PDF / Slides',
                  size: '2.8 MB',
                  link: '/workshop/software-perception-syllabus.pdf'
              },
              {
                  title: `ROS 2 Humble & OpenCV Jupyter Code Repository`,
                  type: 'GitHub Repo',
                  size: 'Python / C++',
                  link: 'https://github.com/Team-Asterix264016/'
              }
          ]
        : [
              {
                  title: `Powertrain: ${session.title} - LTspice Schematics & BMS Specs`,
                  type: 'PDF Schematics',
                  size: '3.4 MB',
                  link: '/ASTERIX_Powertrain_Workshop_Syllabus.pdf'
              },
              {
                  title: `ESP32 CAN-Bus Motor Controller Firmware Code`,
                  type: 'GitHub Repo',
                  size: 'Arduino / C++',
                  link: 'https://github.com/Team-Asterix264016/'
              }
          ];

    const hasQuiz = session.type !== 'holiday' && session.type !== 'catchup';
    const quizTitle = `${session.title} - Knowledge Quiz`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="shadow-brutal-6 relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-slate-900 bg-white p-6">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="press absolute top-4 right-4 flex h-8 w-8 items-center justify-center border-2 border-slate-900 bg-amber-300 font-mono text-sm font-black text-slate-900 hover:bg-amber-400"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="space-y-2 border-b-4 border-slate-900 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-slate-900 bg-slate-900 px-2 py-0.5 font-mono text-xs font-black text-amber-300 uppercase">
                            {session.label}
                        </span>
                        <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-xs font-black text-slate-900 uppercase">
                            {session.days} ({session.date})
                        </span>
                        <span className="border border-slate-900 bg-sky-100 px-2 py-0.5 font-mono text-xs font-black text-sky-900 uppercase">
                            {trackName}
                        </span>
                    </div>
                    <h3 className="text-xl font-black uppercase text-slate-900 sm:text-2xl">
                        {session.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 font-mono text-xs font-bold text-slate-700">
                        <span>📍 Venue: <strong>{session.venue || 'Autonomous Systems Lab'}</strong></span>
                        <span>⏰ Time: <strong>5:10 PM – 6:50 PM</strong></span>
                    </div>
                </div>

                {/* Lock Alert for single track student attempting to access other track */}
                {student && !isEnrolledInTrack && (
                    <div className="mt-4 border-3 border-amber-600 bg-amber-50 p-4 text-amber-950 shadow-brutal-2">
                        <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-amber-900">
                            <span>🔒 TRACK RESTRICTED MATERIAL</span>
                        </div>
                        <p className="mt-1 text-xs font-bold leading-relaxed">
                            Your account (<strong>{student.name}</strong>) is enrolled in the{' '}
                            <strong className="uppercase text-amber-900">{student.package}</strong> track.
                            Only participants who paid for the <strong>Dual-Track Combo</strong> can download notes and access both Software and Powertrain materials!
                        </p>
                    </div>
                )}

                {/* Body Content Sections */}
                <div className="mt-5 space-y-6">
                    {/* 1. Instructor & Contact Info */}
                    <div className="border-3 border-slate-900 bg-sky-50/70 p-4 shadow-brutal-2">
                        <span className="font-mono text-xs font-black tracking-widest text-sky-800 uppercase">
                            👤 INSTRUCTOR &amp; CONTACT DETAILS
                        </span>
                        <div className="mt-2 space-y-1">
                            <h4 className="text-base font-black text-slate-900">
                                {session.instructor && session.instructor !== '-'
                                    ? session.instructor
                                    : 'Team Asterix Lead Instructors'}
                            </h4>
                            <p className="text-xs font-bold text-sky-900">{contactInfo.role}</p>
                            <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs font-bold">
                                <a
                                    href={`mailto:${contactInfo.email}`}
                                    className="press flex items-center gap-1 border border-slate-900 bg-white px-2.5 py-1 text-slate-900 no-underline hover:bg-amber-300"
                                >
                                    <span>✉️ {contactInfo.email}</span>
                                </a>
                                <a
                                    href={`tel:${contactInfo.phone}`}
                                    className="press flex items-center gap-1 border border-slate-900 bg-white px-2.5 py-1 text-slate-900 no-underline hover:bg-amber-300"
                                >
                                    <span>📞 {contactInfo.phone}</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* 2. Attendance Status */}
                    <div className="border-3 border-slate-900 bg-slate-50 p-4 shadow-brutal-2">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black tracking-widest text-slate-700 uppercase">
                                📊 STUDENT ATTENDANCE STATUS
                            </span>
                            {student && (
                                <span className="font-mono text-xs font-bold text-slate-600">
                                    {student.name} ({student.rollNo})
                                </span>
                            )}
                        </div>

                        <div className="mt-3">
                            {!student ? (
                                <div className="flex items-center justify-between border-2 border-amber-500 bg-amber-50 p-3 font-mono text-xs font-bold text-amber-900">
                                    <span>🔒 Login with Mobile/Email to view your live attendance.</span>
                                </div>
                            ) : loadingAttendance ? (
                                <div className="font-mono text-xs font-bold text-slate-600">
                                    Checking attendance records...
                                </div>
                            ) : attendanceStatus === 'present' ? (
                                <div className="flex items-center gap-3 border-2 border-emerald-600 bg-emerald-50 p-3 text-emerald-900">
                                    <span className="text-xl">✅</span>
                                    <div>
                                        <div className="font-mono text-sm font-black uppercase">
                                            Status: PRESENT
                                        </div>
                                        <div className="font-mono text-xs font-bold text-emerald-800">
                                            Verified attendance record
                                            {checkInTime ? ` on ${new Date(checkInTime).toLocaleString('en-IN')}` : ''}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 border-2 border-rose-600 bg-rose-50 p-3 text-rose-900">
                                    <span className="text-xl">❌</span>
                                    <div>
                                        <div className="font-mono text-sm font-black uppercase">
                                            Status: ABSENT / NOT CHECKED IN
                                        </div>
                                        <div className="font-mono text-xs font-bold text-rose-800">
                                            No attendance scan recorded yet for this session.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Track-Specific Notes & Resources */}
                    <div className="border-3 border-slate-900 bg-amber-50/70 p-4 shadow-brutal-2">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black tracking-widest text-amber-900 uppercase">
                                📚 SHARED NOTES ({isSoftwareTrack ? 'SOFTWARE TRACK' : 'POWERTRAIN TRACK'})
                            </span>
                            {isCombo && (
                                <span className="border border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-900">
                                    ✦ COMBO FULL ACCESS
                                </span>
                            )}
                        </div>

                        <div className="mt-3 space-y-2">
                            {notes.map((note, idx) => (
                                <div
                                    key={idx}
                                    className="flex flex-col justify-between gap-2 border-2 border-slate-900 bg-white p-3 sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <h5 className="font-mono text-xs font-black text-slate-900">
                                            {note.title}
                                        </h5>
                                        <span className="font-mono text-[10px] font-bold text-slate-500">
                                            Format: {note.type} · {note.size}
                                        </span>
                                    </div>
                                    {isEnrolledInTrack ? (
                                        <a
                                            href={note.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="press shadow-brutal-2 inline-flex items-center gap-1 border border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-900 no-underline hover:bg-amber-400"
                                        >
                                            <span>Download Notes</span>
                                            <span>📥</span>
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 border border-slate-400 bg-slate-200 px-3 py-1 font-mono text-xs font-black text-slate-600 uppercase">
                                            <span>🔒 Locked (Combo Only)</span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Session Quiz */}
                    {hasQuiz && (
                        <div className="border-3 border-slate-900 bg-purple-50 p-4 shadow-brutal-2">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <span className="font-mono text-xs font-black tracking-widest text-purple-900 uppercase">
                                        ⚡ SESSION KNOWLEDGE QUIZ
                                    </span>
                                    <h5 className="text-base font-black text-slate-900">
                                        {quizTitle}
                                    </h5>
                                    <p className="text-xs font-bold text-slate-600">
                                        Test your understanding of the concepts covered in this class.
                                    </p>
                                </div>
                                {isEnrolledInTrack ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            if (onTakeQuiz) onTakeQuiz(session);
                                        }}
                                        className="press shadow-brutal-4-brand shrink-0 border-2 border-slate-900 bg-purple-600 px-4 py-2 font-mono text-xs font-black uppercase text-white hover:bg-purple-700"
                                    >
                                        <span>✍️ Take Quiz Now</span>
                                    </button>
                                ) : (
                                    <span className="shrink-0 border-2 border-slate-400 bg-slate-200 px-4 py-2 font-mono text-xs font-black uppercase text-slate-600">
                                        🔒 Quiz Locked
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
