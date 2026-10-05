import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

const FIELD_CLASS = 'w-full min-h-10 border-2 border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-600 focus:outline-none';
const SUBMISSION_TIME_CLASS = 'font-mono text-[11px] font-bold text-slate-600 whitespace-nowrap';

function formatSubmissionTime(submission) {
    if (!submission) return '—';
    const date = new Date(submission.submittedAt || submission.createdAt);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function adminHeaders(json = false) {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
    return {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`
    };
}

async function request(path, options = {}) {
    const response = await fetch(apiUrl(path), {
        ...options,
        headers: { ...adminHeaders(Boolean(options.body)), ...options.headers }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
}

const POSITIVE_FEEDBACK_TERMS = new Set(['amazing', 'clear', 'enjoyed', 'excellent', 'good', 'great', 'helpful', 'informative', 'interesting', 'learned', 'useful', 'well']);
const NEGATIVE_FEEDBACK_TERMS = new Set(['bad', 'boring', 'confusing', 'difficult', 'hard', 'improve', 'issue', 'lack', 'poor', 'problem', 'slow', 'unclear']);
const FEEDBACK_STOP_WORDS = new Set(['about', 'after', 'also', 'and', 'are', 'because', 'been', 'but', 'can', 'could', 'did', 'for', 'from', 'have', 'how', 'into', 'just', 'like', 'more', 'much', 'not', 'our', 'really', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'was', 'were', 'what', 'when', 'with', 'would', 'you', 'your']);

function getFeedbackAnalytics(registrations) {
    const submissions = registrations.map(registration => registration.projectSubmission).filter(Boolean);
    const feedbackItems = submissions
        .map(submission => ({
            name: submission.name || 'Workshop student',
            text: String(submission.feedback || '').trim(),
            updatedAt: submission.updatedAt
        }))
        .filter(item => item.text);
    const sentiment = { positive: 0, mixed: 0, neutral: 0, critical: 0 };
    const termCounts = new Map();
    let totalWords = 0;

    for (const item of feedbackItems) {
        const words = item.text.toLowerCase().match(/[a-z']+/g) || [];
        const positiveCount = words.filter(word => POSITIVE_FEEDBACK_TERMS.has(word)).length;
        const criticalCount = words.filter(word => NEGATIVE_FEEDBACK_TERMS.has(word)).length;
        if (positiveCount && criticalCount) sentiment.mixed += 1;
        else if (positiveCount) sentiment.positive += 1;
        else if (criticalCount) sentiment.critical += 1;
        else sentiment.neutral += 1;

        totalWords += words.length;
        for (const word of words) {
            if (word.length < 4 || FEEDBACK_STOP_WORDS.has(word)) continue;
            termCounts.set(word, (termCounts.get(word) || 0) + 1);
        }
    }

    return {
        projectCount: submissions.length,
        feedbackCount: feedbackItems.length,
        feedbackRate: submissions.length ? Math.round(feedbackItems.length / submissions.length * 100) : 0,
        averageWords: feedbackItems.length ? Math.round(totalWords / feedbackItems.length) : 0,
        sentiment,
        topTerms: [...termCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 10),
        feedbackItems
    };
}

function FeedbackAnalytics({ registrations }) {
    const analytics = getFeedbackAnalytics(registrations);
    const toneRows = [
        ['Positive signals', analytics.sentiment.positive, 'bg-emerald-500'],
        ['Mixed comments', analytics.sentiment.mixed, 'bg-amber-400'],
        ['Improvement signals', analytics.sentiment.critical, 'bg-rose-500'],
        ['Neutral / unclassified', analytics.sentiment.neutral, 'bg-sky-500']
    ];
    const maxTermCount = Math.max(1, ...analytics.topTerms.map(([, count]) => count));

    return (
        <section className="space-y-6">
            <div>
                <h3 className="text-lg font-black uppercase">Feedback overview</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">Tone labels are keyword-based estimates. Read the original comments for context.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    ['Projects submitted', analytics.projectCount],
                    ['Feedback received', analytics.feedbackCount],
                    ['Feedback coverage', `${analytics.feedbackRate}%`],
                    ['Average comment', `${analytics.averageWords} words`]
                ].map(([label, value]) => (
                    <div key={label} className="border-2 border-slate-900 bg-white p-4 shadow-brutal-3">
                        <p className="font-mono text-[10px] font-black uppercase text-slate-500">{label}</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="border-t-4 border-sky-600 bg-white p-4">
                    <h4 className="text-sm font-black uppercase">Estimated feedback tone</h4>
                    <div className="mt-4 space-y-3">
                        {toneRows.map(([label, count, color]) => {
                            const percent = analytics.feedbackCount ? Math.round(count / analytics.feedbackCount * 100) : 0;
                            return <div key={label}>
                                <div className="mb-1 flex justify-between gap-3 text-xs font-bold"><span>{label}</span><span>{count} · {percent}%</span></div>
                                <div className="h-2 bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${percent}%` }} /></div>
                            </div>;
                        })}
                    </div>
                </section>

                <section className="border-t-4 border-amber-400 bg-white p-4">
                    <h4 className="text-sm font-black uppercase">Frequently mentioned terms</h4>
                    {analytics.topTerms.length ? <div className="mt-4 space-y-2.5">
                        {analytics.topTerms.map(([term, count]) => <div key={term} className="grid grid-cols-[100px_1fr_28px] items-center gap-2 text-xs">
                            <span className="truncate font-bold capitalize" title={term}>{term}</span>
                            <div className="h-2 bg-slate-100"><div className="h-full bg-amber-400" style={{ width: `${Math.round(count / maxTermCount * 100)}%` }} /></div>
                            <span className="text-right font-black">{count}</span>
                        </div>)}
                    </div> : <p className="mt-4 text-xs font-bold text-slate-500">Not enough written feedback to surface common terms.</p>}
                </section>
            </div>

            <details className="border-y-2 border-slate-200 py-3">
                <summary className="cursor-pointer text-xs font-black uppercase">Read written feedback ({analytics.feedbackCount})</summary>
                <div className="mt-3 max-h-96 divide-y divide-slate-200 overflow-y-auto">
                    {analytics.feedbackItems.map((item, index) => <blockquote key={`${item.name}-${index}`} className="py-3">
                        <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">{item.text}</p>
                        <footer className="mt-1 font-mono text-[10px] font-black uppercase text-slate-500">{item.name}</footer>
                    </blockquote>)}
                    {!analytics.feedbackItems.length && <p className="py-3 text-xs font-bold text-slate-500">No written feedback has been submitted yet.</p>}
                </div>
            </details>
        </section>
    );
}

export default function WorkshopProjectSubmissionsAdmin({ showStatus }) {
    const [view, setView] = useState('students');
    const [config, setConfig] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [query, setQuery] = useState('');
    const [submissionFilter, setSubmissionFilter] = useState('all');
    const [submissionSort, setSubmissionSort] = useState('desc');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [configData, rosterData] = await Promise.all([
                request('/api/workshop/projects/admin/config'),
                request('/api/workshop/projects/admin/registrations')
            ]);
            setConfig(configData.config);
            setRegistrations(rosterData.registrations || []);
        } catch (loadError) {
            setError(loadError.message || 'Could not load workshop project records.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        Promise.all([
            request('/api/workshop/projects/admin/config'),
            request('/api/workshop/projects/admin/registrations')
        ])
            .then(([configData, rosterData]) => {
                if (!active) return;
                setConfig(configData.config);
                setRegistrations(rosterData.registrations || []);
            })
            .catch(loadError => {
                if (active) setError(loadError.message || 'Could not load workshop project records.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => { active = false; };
    }, []);

    const filteredRegistrations = registrations
        .filter(registration => {
            const hasSubmission = Boolean(registration.projectSubmission);
            if (submissionFilter === 'submitted' && !hasSubmission) return false;
            if (submissionFilter === 'not-submitted' && hasSubmission) return false;

            const needle = query.trim().toLowerCase();
            if (!needle) return true;
            return [registration.name, registration.email, registration.rollNo, registration.department, registration.phone]
                .some(value => String(value || '').toLowerCase().includes(needle));
        })
        .sort((left, right) => {
            const leftTime = left.projectSubmission
                ? new Date(left.projectSubmission.submittedAt || left.projectSubmission.createdAt).getTime()
                : Number.NaN;
            const rightTime = right.projectSubmission
                ? new Date(right.projectSubmission.submittedAt || right.projectSubmission.createdAt).getTime()
                : Number.NaN;
            const leftMissing = !Number.isFinite(leftTime);
            const rightMissing = !Number.isFinite(rightTime);
            if (leftMissing || rightMissing) return Number(leftMissing) - Number(rightMissing);
            return submissionSort === 'desc' ? rightTime - leftTime : leftTime - rightTime;
        });

    const handleSaveConfig = async event => {
        event.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const data = await request('/api/workshop/projects/admin/config', {
                method: 'PUT',
                body: JSON.stringify(config)
            });
            setConfig(data.config);
            showStatus?.('Project submission form settings saved.');
        } catch (saveError) {
            setError(saveError.message || 'Could not save form settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateQuestion = (index, values) => {
        setConfig(current => ({
            ...current,
            questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...values } : question)
        }));
    };

    const addQuestion = () => setConfig(current => ({
        ...current,
        questions: [...(current.questions || []), { label: '', type: 'text', required: true, options: [] }]
    }));

    return (
        <div className="space-y-6 font-mono text-slate-900">
            <div className="flex flex-col gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-sky-700">Workshop operations</p>
                    <h2 className="mt-1 text-xl font-black uppercase sm:text-2xl">Project submissions</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">{registrations.length} registrations · {registrations.filter(registration => registration.projectSubmission).length} project submissions</p>
                </div>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Project submission admin sections">
                    <button type="button" role="tab" aria-selected={view === 'students'} onClick={() => setView('students')} className={`border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase ${view === 'students' ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-sky-50'}`}>Submission review</button>
                    <button type="button" role="tab" aria-selected={view === 'analytics'} onClick={() => setView('analytics')} className={`border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase ${view === 'analytics' ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-sky-50'}`}>Feedback analytics</button>
                    <button type="button" role="tab" aria-selected={view === 'form'} onClick={() => setView('form')} className={`border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase ${view === 'form' ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-sky-50'}`}>Form settings</button>
                    <button type="button" onClick={loadData} disabled={isLoading} aria-label="Refresh project submissions" title="Refresh project submissions and feedback" className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black uppercase hover:bg-emerald-100 disabled:opacity-50">↻ Refresh</button>
                </div>
            </div>

            {error && <p role="alert" className="border-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p>}
            {isLoading ? <p className="border-2 border-slate-200 bg-white p-6 text-sm font-bold">Loading workshop records...</p> : view === 'form' ? (
                config && <form onSubmit={handleSaveConfig} className="space-y-5">
                    <section className="space-y-4 border-b-2 border-slate-200 pb-5">
                        <label className="block text-xs font-black uppercase">Form title<input className={`${FIELD_CLASS} mt-1.5`} maxLength={120} value={config.title || ''} onChange={event => setConfig({ ...config, title: event.target.value })} required /></label>
                        <label className="block text-xs font-black uppercase">Description<textarea className={`${FIELD_CLASS} mt-1.5 min-h-24 resize-y`} maxLength={1000} value={config.description || ''} onChange={event => setConfig({ ...config, description: event.target.value })} /></label>
                        <label className="inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase"><input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={config.isOpen !== false} onChange={event => setConfig({ ...config, isOpen: event.target.checked })} /> Accept project submissions</label>
                    </section>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><h3 className="text-base font-black uppercase">Student questions</h3><p className="mt-1 text-[11px] font-bold text-slate-500">Add up to 20 questions. Required fields are enforced on the student form.</p></div>
                        <button type="button" disabled={(config.questions || []).length >= 20} onClick={addQuestion} className="border-2 border-slate-900 bg-amber-300 px-3 py-2 text-xs font-black uppercase hover:bg-amber-400 disabled:opacity-50">+ Add question</button>
                    </div>
                    <div className="space-y-3">
                        {(config.questions || []).map((question, index) => (
                            <div key={question._id || `new-${index}`} className="grid gap-3 border-2 border-slate-300 bg-white p-4 md:grid-cols-[1fr_160px_auto] md:items-start">
                                <label className="block text-[10px] font-black uppercase">Question {index + 1}<input className={`${FIELD_CLASS} mt-1.5`} maxLength={160} value={question.label || ''} onChange={event => updateQuestion(index, { label: event.target.value })} required /></label>
                                <label className="block text-[10px] font-black uppercase">Answer type<select className={`${FIELD_CLASS} mt-1.5`} value={question.type || 'text'} onChange={event => updateQuestion(index, { type: event.target.value, options: event.target.value === 'select' ? (question.options || []) : [] })}><option value="text">Short text</option><option value="textarea">Long text</option><option value="select">Choose an option</option></select></label>
                                <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                                    <label className="inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase"><input type="checkbox" className="h-4 w-4 accent-sky-600" checked={question.required !== false} onChange={event => updateQuestion(index, { required: event.target.checked })} /> Required</label>
                                    <button type="button" onClick={() => setConfig(current => ({ ...current, questions: current.questions.filter((_, questionIndex) => questionIndex !== index) }))} className="text-xs font-black uppercase text-rose-700 underline">Remove</button>
                                </div>
                                {question.type === 'select' && <label className="block text-[10px] font-black uppercase md:col-span-2">Options, comma separated<input className={`${FIELD_CLASS} mt-1.5`} value={(question.options || []).join(', ')} onChange={event => updateQuestion(index, { options: event.target.value.split(',').map(option => option.trim()).filter(Boolean) })} placeholder="Option one, Option two" required /></label>}
                            </div>
                        ))}
                        {!config.questions?.length && <p className="border-2 border-dashed border-slate-300 bg-white p-5 text-sm font-bold text-slate-500">No custom questions have been added.</p>}
                    </div>
                    <button type="submit" disabled={isSaving} className="border-2 border-slate-900 bg-emerald-400 px-5 py-3 text-xs font-black uppercase shadow-brutal-3 hover:bg-emerald-300 disabled:opacity-60">{isSaving ? 'Saving...' : 'Save form settings'}</button>
                </form>
            ) : view === 'analytics' ? (
                <FeedbackAnalytics registrations={registrations} />
            ) : (
                <section>
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:items-end">
                            <label className="block w-full min-w-52 text-[10px] font-black uppercase">Search registered students<input className={`${FIELD_CLASS} mt-1.5`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, registered number..." /></label>
                            <label className="block text-[10px] font-black uppercase">Submission status<select className={`${FIELD_CLASS} mt-1.5`} value={submissionFilter} onChange={event => setSubmissionFilter(event.target.value)}><option value="all">All students</option><option value="submitted">Submitted</option><option value="not-submitted">Not submitted</option></select></label>
                            <button type="button" onClick={() => setSubmissionSort(current => current === 'desc' ? 'asc' : 'desc')} aria-label={`Sort submissions ${submissionSort === 'desc' ? 'oldest first' : 'newest first'}`} className="min-h-10 border-2 border-slate-900 bg-amber-300 px-3 py-2 text-[10px] font-black uppercase shadow-brutal-2 hover:bg-amber-200">
                                Submission time: {submissionSort === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
                            </button>
                        </div>
                        <span className="text-xs font-bold text-slate-500">Showing {filteredRegistrations.length} / {registrations.length}</span>
                    </div>
                    {!filteredRegistrations.length ? <p className="border-2 border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-500">No registrations match this search.</p> : (
                        <div className="overflow-x-auto border-2 border-slate-900 bg-white">
                            <table className="w-full min-w-[760px] text-left text-xs">
                                <thead className="bg-slate-900 text-[10px] font-black uppercase text-white"><tr><th className="p-3">Student</th><th className="p-3">Registration</th><th className="p-3">Submitted at</th><th className="p-3">Project</th></tr></thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredRegistrations.map(registration => (
                                        <tr key={registration._id} className="align-top hover:bg-slate-50">
                                            <td className="p-3"><div className="font-black">{registration.name}</div><div className="mt-1 text-[11px] text-slate-500">{registration.email}</div><div className="text-[11px] text-slate-500">{registration.department} · Year {registration.year}</div></td>
                                            <td className="p-3"><div className="font-bold">{registration.rollNo}</div><div className="mt-1 text-[10px] font-black uppercase text-slate-500">{registration.status} · {registration.package}</div><div className="text-[11px] text-slate-500">{registration.phone}</div></td>
                                            <td className={`p-3 ${SUBMISSION_TIME_CLASS}`}>{formatSubmissionTime(registration.projectSubmission)}</td>
                                            <td className="p-3">
                                                {registration.projectSubmission ? <div className="space-y-1.5"><a href={registration.projectSubmission.driveLink} target="_blank" rel="noreferrer" className="font-black text-sky-700 underline">Open project link ↗</a><details className="max-w-sm"><summary className="cursor-pointer text-[10px] font-black uppercase text-slate-600">Feedback &amp; answers</summary><p className="mt-1 whitespace-pre-wrap text-[11px]">{registration.projectSubmission.feedback || 'No feedback provided.'}</p>{(registration.projectSubmission.answers || []).map(answer => <p key={answer.questionId} className="mt-2 text-[11px]"><strong>{answer.label}:</strong> {answer.answer || '—'}</p>)}</details></div> : <span className="text-[10px] font-black uppercase text-slate-500">Not submitted</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

        </div>
    );
}