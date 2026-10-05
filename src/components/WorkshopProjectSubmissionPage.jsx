import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

const EMPTY_LOOKUP = { email: '', rollNo: '', phone: '' };
const INPUT_CLASS = 'w-full min-h-12 border-2 border-slate-900 bg-white px-3 py-2.5 text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

export default function WorkshopProjectSubmissionPage({ onBack }) {
    const [config, setConfig] = useState(null);
    const [lookup, setLookup] = useState(EMPTY_LOOKUP);
    const [student, setStudent] = useState(null);
    const [driveLink, setDriveLink] = useState('');
    const [feedback, setFeedback] = useState('');
    const [answers, setAnswers] = useState({});
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        let active = true;
        fetch(apiUrl('/api/workshop/projects/form'))
            .then(async response => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not load the form.');
                if (active) setConfig(data);
            })
            .catch(fetchError => { if (active) setError(fetchError.message); })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, []);

    const handleLookup = async event => {
        event.preventDefault();
        setError('');
        setNotice('');
        setIsBusy(true);
        try {
            const response = await fetch(apiUrl('/api/workshop/projects/lookup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lookup)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not verify your registration.');
            setStudent(data.student);
            setDriveLink(data.submission?.driveLink || '');
            setFeedback(data.submission?.feedback || '');
            setAnswers(Object.fromEntries((data.submission?.answers || []).map(answer => [answer.questionId, answer.answer])));
        } catch (lookupError) {
            setError(lookupError.message);
        } finally {
            setIsBusy(false);
        }
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (!student) return;
        setError('');
        setNotice('');
        setIsBusy(true);
        try {
            const response = await fetch(apiUrl('/api/workshop/projects'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...lookup,
                    driveLink,
                    feedback,
                    answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not submit your project.');
            setNotice(data.message || 'Project submission saved.');
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-100 font-sans text-slate-950 selection:bg-amber-300">
            <header className="border-b-4 border-slate-950 bg-white px-4 py-4 sm:px-8">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                    <div>
                        <p className="font-mono text-xs font-black uppercase tracking-widest text-sky-700">Team Asterix / Workshop</p>
                        <h1 className="mt-1 text-xl font-black uppercase sm:text-2xl">Project Submission</h1>
                    </div>
                    <button type="button" onClick={onBack} className="press border-2 border-slate-950 bg-amber-300 px-3 py-2 font-mono text-xs font-black uppercase shadow-brutal-3 hover:bg-amber-400">Back to site</button>
                </div>
            </header>

            <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[0.8fr_1.2fr]">
                <section className="self-start border-2 border-sky-600 bg-slate-950 p-6 text-white sm:p-8">
                    <p className="font-mono text-xs font-black uppercase tracking-widest text-amber-300">Workshop 2026</p>
                    <h2 className="mt-3 text-3xl font-black uppercase leading-tight">{config?.title || 'Submit your project'}</h2>
                    <p className="mt-4 text-sm font-bold leading-relaxed text-slate-200">{config?.description || 'Verify your paid workshop registration to attach your project to the student record we already have on file.'}</p>
                    <ol className="mt-7 space-y-3 font-mono text-xs font-bold uppercase text-slate-300">
                        <li className="flex gap-3"><span className="text-amber-300">01</span> Verify your registration details</li>
                        <li className="flex gap-3"><span className="text-amber-300">02</span> Add your project Drive link</li>
                        <li className="flex gap-3"><span className="text-amber-300">03</span> Answer the project questions</li>
                    </ol>
                </section>

                <section className="min-w-0">
                    {isLoading ? (
                        <p className="border-2 border-slate-300 bg-white p-6 font-mono text-sm font-bold">Loading submission form...</p>
                    ) : !student ? (
                        <form onSubmit={handleLookup} className="border-2 border-slate-950 bg-white p-5 shadow-brutal-5 sm:p-7">
                            <div className="border-b-2 border-slate-200 pb-4">
                                <p className="font-mono text-xs font-black uppercase text-sky-700">Registration verification</p>
                                <h3 className="mt-1 text-xl font-black uppercase">Find your student record</h3>
                                <p className="mt-2 text-sm font-medium text-slate-600">Enter the same email, registered number, and phone used at workshop registration. Student details are filled from that record.</p>
                            </div>
                            <div className="mt-5 space-y-4">
                                <label className="block text-xs font-black uppercase">Registered email<input className={`${INPUT_CLASS} mt-1.5`} type="email" autoComplete="email" value={lookup.email} onChange={event => setLookup({ ...lookup, email: event.target.value })} required /></label>
                                <label className="block text-xs font-black uppercase">Registered number<input className={`${INPUT_CLASS} mt-1.5`} value={lookup.rollNo} onChange={event => setLookup({ ...lookup, rollNo: event.target.value })} required /></label>
                                <label className="block text-xs font-black uppercase">Phone used at registration<input className={`${INPUT_CLASS} mt-1.5`} type="tel" autoComplete="tel" value={lookup.phone} onChange={event => setLookup({ ...lookup, phone: event.target.value })} required /></label>
                            </div>
                            {error && <p role="alert" className="mt-4 border-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p>}
                            <button type="submit" disabled={isBusy} className="press mt-5 min-h-12 w-full border-2 border-slate-950 bg-sky-500 px-4 py-3 font-mono text-xs font-black uppercase text-slate-950 shadow-brutal-3 hover:bg-sky-600 disabled:cursor-wait disabled:opacity-60">{isBusy ? 'Checking registration...' : 'Verify and continue'}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="border-2 border-slate-950 bg-white p-5 shadow-brutal-5 sm:p-7">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-200 pb-4">
                                <div><p className="font-mono text-xs font-black uppercase text-emerald-700">Registration verified</p><h3 className="mt-1 text-xl font-black uppercase">{student.name}</h3></div>
                                <button type="button" onClick={() => { setStudent(null); setError(''); setNotice(''); }} className="font-mono text-xs font-black uppercase text-sky-700 underline">Change student</button>
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-b-2 border-slate-200 pb-5 text-sm">
                                {[
                                    ['Registered number', student.rollNo], ['Email', student.email], ['Phone', student.phone],
                                    ['Department', student.department], ['Year', student.year], ['College', student.college || 'Not provided'],
                                    ['Workshop track', (student.tracksEnrolled || []).join(' + ') || student.package]
                                ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="font-mono text-[10px] font-black uppercase text-slate-500">{label}</dt><dd className="mt-0.5 break-words font-bold">{value}</dd></div>)}
                            </dl>
                            {config?.isOpen ? (
                                <>
                                    <div className="mt-5 space-y-4">
                                        <label className="block text-xs font-black uppercase">Google Drive project link<input className={`${INPUT_CLASS} mt-1.5`} type="url" inputMode="url" placeholder="https://drive.google.com/..." value={driveLink} onChange={event => setDriveLink(event.target.value)} required /></label>
                                        <label className="block text-xs font-black uppercase">Feedback<textarea className={`${INPUT_CLASS} mt-1.5 min-h-28 resize-y`} maxLength={3000} value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Share feedback about the workshop or project." /></label>
                                        {(config.questions || []).map((question, index) => (
                                            <label key={question._id} className="block text-xs font-black uppercase">
                                                {index + 1}. {question.label}{question.required && <span className="text-rose-700"> *</span>}
                                                {question.type === 'select' ? (
                                                    <select className={`${INPUT_CLASS} mt-1.5`} required={question.required} value={answers[question._id] || ''} onChange={event => setAnswers({ ...answers, [question._id]: event.target.value })}>
                                                        <option value="">Choose an answer</option>{(question.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                                                    </select>
                                                ) : question.type === 'textarea' ? (
                                                    <textarea className={`${INPUT_CLASS} mt-1.5 min-h-28 resize-y`} required={question.required} value={answers[question._id] || ''} onChange={event => setAnswers({ ...answers, [question._id]: event.target.value })} />
                                                ) : (
                                                    <input className={`${INPUT_CLASS} mt-1.5`} required={question.required} value={answers[question._id] || ''} onChange={event => setAnswers({ ...answers, [question._id]: event.target.value })} />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                    {error && <p role="alert" className="mt-4 border-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p>}
                                    {notice && <p role="status" className="mt-4 border-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{notice}</p>}
                                    <button type="submit" disabled={isBusy} className="press mt-5 min-h-12 w-full border-2 border-slate-950 bg-amber-300 px-4 py-3 font-mono text-xs font-black uppercase shadow-brutal-3 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{isBusy ? 'Saving project...' : 'Submit project'}</button>
                                </>
                            ) : <p className="mt-5 border-2 border-amber-500 bg-amber-50 p-4 font-mono text-sm font-bold">Project submissions are currently closed.</p>}
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}