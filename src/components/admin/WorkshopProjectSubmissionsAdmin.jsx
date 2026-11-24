import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY, AUTH_SESSION_KEY } from '../../context/WebsiteDataContext';

const FIELD_CLASS =
    'w-full min-h-10 border-2 border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-600 focus:outline-none';
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

function formatOpenTime(timestamp) {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function resolveIsSuperAdmin(currentUser) {
    const username = currentUser?.username || (() => {
        try {
            const session = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY));
            if (session?.username) return session.username;
        } catch {}
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
            if (token) {
                const parts = token.split('.');
                if (parts[1]) {
                    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                    return payload.username;
                }
            }
        } catch {}
        return null;
    })();

    return String(username || '').trim().toLowerCase() === 'admin1';
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

const POSITIVE_FEEDBACK_TERMS = new Set([
    'amazing',
    'clear',
    'enjoyed',
    'excellent',
    'good',
    'great',
    'helpful',
    'informative',
    'interesting',
    'learned',
    'useful',
    'well'
]);
const NEGATIVE_FEEDBACK_TERMS = new Set([
    'bad',
    'boring',
    'confusing',
    'difficult',
    'hard',
    'improve',
    'issue',
    'lack',
    'poor',
    'problem',
    'slow',
    'unclear'
]);
const FEEDBACK_STOP_WORDS = new Set([
    'about',
    'after',
    'also',
    'and',
    'are',
    'because',
    'been',
    'but',
    'can',
    'could',
    'did',
    'for',
    'from',
    'have',
    'how',
    'into',
    'just',
    'like',
    'more',
    'much',
    'not',
    'our',
    'really',
    'that',
    'the',
    'their',
    'them',
    'there',
    'they',
    'this',
    'was',
    'were',
    'what',
    'when',
    'with',
    'would',
    'you',
    'your'
]);

function getFeedbackAnalytics(registrations, isSuperAdmin = false) {
    const submissions = registrations.map((registration) => registration.projectSubmission).filter(Boolean);
    const feedbackItems = submissions
        .map((submission) => ({
            name: submission.name || 'Workshop student',
            text: String(submission.feedback || '').trim(),
            updatedAt: submission.updatedAt
        }))
        .filter((item) => item.text);
    const sentiment = { positive: 0, mixed: 0, neutral: 0, critical: 0 };
    const termCounts = new Map();
    let totalWords = 0;

    for (const item of feedbackItems) {
        const words = item.text.toLowerCase().match(/[a-z']+/g) || [];
        const positiveCount = words.filter((word) => POSITIVE_FEEDBACK_TERMS.has(word)).length;
        const criticalCount = words.filter((word) => NEGATIVE_FEEDBACK_TERMS.has(word)).length;
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

    const adminStats = [];
    let totalOpens = 0;
    let openedProjectsCount = 0;

    if (isSuperAdmin) {
        const adminMap = new Map();
        for (const sub of submissions) {
            const count = sub.openCount || sub.linkOpens?.length || 0;
            if (count > 0) openedProjectsCount += 1;
            totalOpens += count;

            for (const log of (sub.linkOpens || [])) {
                const uname = log.adminUsername || 'unknown';
                const cur = adminMap.get(uname) || {
                    username: uname,
                    name: log.adminName || uname,
                    opens: 0,
                    latestAt: log.openedAt
                };
                cur.opens += 1;
                if (new Date(log.openedAt) > new Date(cur.latestAt)) {
                    cur.latestAt = log.openedAt;
                }
                adminMap.set(uname, cur);
            }
        }
        adminStats.push(...adminMap.values());
        adminStats.sort((a, b) => b.opens - a.opens);
    }

    return {
        projectCount: submissions.length,
        feedbackCount: feedbackItems.length,
        feedbackRate: submissions.length ? Math.round((feedbackItems.length / submissions.length) * 100) : 0,
        averageWords: feedbackItems.length ? Math.round(totalWords / feedbackItems.length) : 0,
        sentiment,
        topTerms: [...termCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 10),
        feedbackItems,
        totalOpens,
        openedProjectsCount,
        adminStats
    };
}

function FeedbackAnalytics({ registrations, isSuperAdmin = false }) {
    const analytics = getFeedbackAnalytics(registrations, isSuperAdmin);
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
                <p className="mt-1 text-xs font-bold text-slate-500">
                    Tone labels are keyword-based estimates. Read the original comments for context.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    ['Projects submitted', analytics.projectCount],
                    ['Feedback received', analytics.feedbackCount],
                    ['Feedback coverage', `${analytics.feedbackRate}%`],
                    ['Average comment', `${analytics.averageWords} words`]
                ].map(([label, value]) => (
                    <div key={label} className="shadow-brutal-3 border-2 border-slate-900 bg-white p-4">
                        <p className="font-mono text-[10px] font-black text-slate-500 uppercase">{label}</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                    </div>
                ))}
            </div>

            {isSuperAdmin && (
                <section className="border-t-4 border-amber-500 bg-white p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 className="text-sm font-black uppercase text-slate-900">
                                🔒 Superadmin Drive Link Access Audit
                            </h4>
                            <p className="mt-0.5 text-xs font-bold text-slate-500">
                                Project links opened {analytics.totalOpens} times across {analytics.openedProjectsCount} of {analytics.projectCount} submitted projects.
                            </p>
                        </div>
                        <span className="inline-block border border-slate-900 bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">
                            admin1 only
                        </span>
                    </div>

                    {analytics.adminStats.length > 0 ? (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase">
                                    <tr>
                                        <th className="p-2">Admin Account</th>
                                        <th className="p-2">Username</th>
                                        <th className="p-2">Drive Links Opened</th>
                                        <th className="p-2">Most Recent Access</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {analytics.adminStats.map((admin) => (
                                        <tr key={admin.username} className="hover:bg-slate-50">
                                            <td className="p-2 font-black">{admin.name}</td>
                                            <td className="p-2 font-mono text-[11px] text-slate-600">
                                                @{admin.username}
                                            </td>
                                            <td className="p-2">
                                                <span className="rounded bg-sky-100 px-2 py-0.5 font-bold text-sky-800">
                                                    {admin.opens} times
                                                </span>
                                            </td>
                                            <td className="p-2 font-mono text-[10px] text-slate-500">
                                                {formatOpenTime(admin.latestAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="mt-4 text-xs font-bold text-slate-500">
                            No project links have been opened by any admin yet.
                        </p>
                    )}
                </section>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="border-t-4 border-sky-600 bg-white p-4">
                    <h4 className="text-sm font-black uppercase">Estimated feedback tone</h4>
                    <div className="mt-4 space-y-3">
                        {toneRows.map(([label, count, color]) => {
                            const percent = analytics.feedbackCount
                                ? Math.round((count / analytics.feedbackCount) * 100)
                                : 0;
                            return (
                                <div key={label}>
                                    <div className="mb-1 flex justify-between gap-3 text-xs font-bold">
                                        <span>{label}</span>
                                        <span>
                                            {count} · {percent}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100">
                                        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="border-t-4 border-amber-400 bg-white p-4">
                    <h4 className="text-sm font-black uppercase">Frequently mentioned terms</h4>
                    {analytics.topTerms.length ? (
                        <div className="mt-4 space-y-2.5">
                            {analytics.topTerms.map(([term, count]) => (
                                <div
                                    key={term}
                                    className="grid grid-cols-[100px_1fr_28px] items-center gap-2 text-xs"
                                >
                                    <span className="truncate font-bold capitalize" title={term}>
                                        {term}
                                    </span>
                                    <div className="h-2 bg-slate-100">
                                        <div
                                            className="h-full bg-amber-400"
                                            style={{ width: `${Math.round((count / maxTermCount) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-right font-black">{count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-xs font-bold text-slate-500">
                            Not enough written feedback to surface common terms.
                        </p>
                    )}
                </section>
            </div>

            <details className="border-y-2 border-slate-200 py-3">
                <summary className="cursor-pointer text-xs font-black uppercase">
                    Read written feedback ({analytics.feedbackCount})
                </summary>
                <div className="mt-3 max-h-96 divide-y divide-slate-200 overflow-y-auto">
                    {analytics.feedbackItems.map((item, index) => (
                        <blockquote key={`${item.name}-${index}`} className="py-3">
                            <p className="text-sm font-medium whitespace-pre-wrap text-slate-800">
                                {item.text}
                            </p>
                            <footer className="mt-1 font-mono text-[10px] font-black text-slate-500 uppercase">
                                {item.name}
                            </footer>
                        </blockquote>
                    ))}
                    {!analytics.feedbackItems.length && (
                        <p className="py-3 text-xs font-bold text-slate-500">
                            No written feedback has been submitted yet.
                        </p>
                    )}
                </div>
            </details>
        </section>
    );
}

export default function WorkshopProjectSubmissionsAdmin({ showStatus, currentUser }) {
    const isSuperAdmin = resolveIsSuperAdmin(currentUser);
    const [view, setView] = useState('students');
    const [config, setConfig] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [query, setQuery] = useState('');
    const [submissionFilter, setSubmissionFilter] = useState('all');
    const [submissionSort, setSubmissionSort] = useState('desc');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleTrackLinkOpen = (registration) => {
        const submission = registration.projectSubmission;
        if (!submission?._id) return;

        request(`/api/workshop/projects/admin/submissions/${submission._id}/open`, {
            method: 'POST'
        })
            .then((data) => {
                if (data?.success && data?.submission && isSuperAdmin) {
                    setRegistrations((prev) =>
                        prev.map((reg) =>
                            reg._id === registration._id
                                ? {
                                      ...reg,
                                      projectSubmission: {
                                          ...reg.projectSubmission,
                                          openCount: data.submission.openCount,
                                          linkOpens: data.submission.linkOpens
                                      }
                                  }
                                : reg
                        )
                    );
                }
            })
            .catch((trackErr) => {
                console.error('Failed to log drive link open:', trackErr);
            });
    };

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
            .catch((loadError) => {
                if (active) setError(loadError.message || 'Could not load workshop project records.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const filteredRegistrations = registrations
        .filter((registration) => {
            const hasSubmission = Boolean(registration.projectSubmission);
            if (submissionFilter === 'submitted' && !hasSubmission) return false;
            if (submissionFilter === 'not-submitted' && hasSubmission) return false;

            const needle = query.trim().toLowerCase();
            if (!needle) return true;
            return [
                registration.name,
                registration.email,
                registration.rollNo,
                registration.department,
                registration.phone
            ].some((value) =>
                String(value || '')
                    .toLowerCase()
                    .includes(needle)
            );
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

    const handleSaveConfig = async (event) => {
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
        setConfig((current) => ({
            ...current,
            questions: current.questions.map((question, questionIndex) =>
                questionIndex === index ? { ...question, ...values } : question
            )
        }));
    };

    const addQuestion = () =>
        setConfig((current) => ({
            ...current,
            questions: [
                ...(current.questions || []),
                { label: '', type: 'text', required: true, options: [] }
            ]
        }));

    return (
        <div className="space-y-6 font-mono text-slate-900">
            <div className="flex flex-col gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black tracking-widest text-sky-700 uppercase">
                        Workshop operations
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase sm:text-2xl">Project submissions</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                        {registrations.length} registrations ·{' '}
                        {registrations.filter((registration) => registration.projectSubmission).length}{' '}
                        project submissions
                    </p>
                </div>
                <div
                    className="flex flex-wrap gap-2"
                    role="tablist"
                    aria-label="Project submission admin sections"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === 'students'}
                        onClick={() => setView('students')}
                        className={`border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase ${view === 'students' ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-sky-50'}`}
                    >
                        Submission review
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === 'analytics'}
                        onClick={() => setView('analytics')}
                        className={`border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase ${view === 'analytics' ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-sky-50'}`}
                    >
                        Feedback analytics
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === 'form'}
                        onClick={() => setView('form')}
                        className={`border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase ${view === 'form' ? 'bg-sky-500 text-slate-950' : 'bg-white hover:bg-sky-50'}`}
                    >
                        Form settings
                    </button>
                    <button
                        type="button"
                        onClick={loadData}
                        disabled={isLoading}
                        aria-label="Refresh project submissions"
                        title="Refresh project submissions and feedback"
                        className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black uppercase hover:bg-emerald-100 disabled:opacity-50"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {error && (
                <p
                    role="alert"
                    className="border-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800"
                >
                    {error}
                </p>
            )}
            {isLoading ? (
                <p className="border-2 border-slate-200 bg-white p-6 text-sm font-bold">
                    Loading workshop records...
                </p>
            ) : view === 'form' ? (
                config && (
                    <form onSubmit={handleSaveConfig} className="space-y-5">
                        <section className="space-y-4 border-b-2 border-slate-200 pb-5">
                            <label className="block text-xs font-black uppercase">
                                Form title
                                <input
                                    className={`${FIELD_CLASS} mt-1.5`}
                                    maxLength={120}
                                    value={config.title || ''}
                                    onChange={(event) => setConfig({ ...config, title: event.target.value })}
                                    required
                                />
                            </label>
                            <label className="block text-xs font-black uppercase">
                                Description
                                <textarea
                                    className={`${FIELD_CLASS} mt-1.5 min-h-24 resize-y`}
                                    maxLength={1000}
                                    value={config.description || ''}
                                    onChange={(event) =>
                                        setConfig({ ...config, description: event.target.value })
                                    }
                                />
                            </label>
                            <label className="inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-emerald-600"
                                    checked={config.isOpen !== false}
                                    onChange={(event) =>
                                        setConfig({ ...config, isOpen: event.target.checked })
                                    }
                                />{' '}
                                Accept project submissions
                            </label>
                        </section>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-black uppercase">Student questions</h3>
                                <p className="mt-1 text-[11px] font-bold text-slate-500">
                                    Add up to 20 questions. Required fields are enforced on the student form.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={(config.questions || []).length >= 20}
                                onClick={addQuestion}
                                className="border-2 border-slate-900 bg-amber-300 px-3 py-2 text-xs font-black uppercase hover:bg-amber-400 disabled:opacity-50"
                            >
                                + Add question
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(config.questions || []).map((question, index) => (
                                <div
                                    key={question._id || `new-${index}`}
                                    className="grid gap-3 border-2 border-slate-300 bg-white p-4 md:grid-cols-[1fr_160px_auto] md:items-start"
                                >
                                    <label className="block text-[10px] font-black uppercase">
                                        Question {index + 1}
                                        <input
                                            className={`${FIELD_CLASS} mt-1.5`}
                                            maxLength={160}
                                            value={question.label || ''}
                                            onChange={(event) =>
                                                updateQuestion(index, { label: event.target.value })
                                            }
                                            required
                                        />
                                    </label>
                                    <label className="block text-[10px] font-black uppercase">
                                        Answer type
                                        <select
                                            className={`${FIELD_CLASS} mt-1.5`}
                                            value={question.type || 'text'}
                                            onChange={(event) =>
                                                updateQuestion(index, {
                                                    type: event.target.value,
                                                    options:
                                                        event.target.value === 'select'
                                                            ? question.options || []
                                                            : []
                                                })
                                            }
                                        >
                                            <option value="text">Short text</option>
                                            <option value="textarea">Long text</option>
                                            <option value="select">Choose an option</option>
                                        </select>
                                    </label>
                                    <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                                        <label className="inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 accent-sky-600"
                                                checked={question.required !== false}
                                                onChange={(event) =>
                                                    updateQuestion(index, { required: event.target.checked })
                                                }
                                            />{' '}
                                            Required
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfig((current) => ({
                                                    ...current,
                                                    questions: current.questions.filter(
                                                        (_, questionIndex) => questionIndex !== index
                                                    )
                                                }))
                                            }
                                            className="text-xs font-black text-rose-700 uppercase underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    {question.type === 'select' && (
                                        <label className="block text-[10px] font-black uppercase md:col-span-2">
                                            Options, comma separated
                                            <input
                                                className={`${FIELD_CLASS} mt-1.5`}
                                                value={(question.options || []).join(', ')}
                                                onChange={(event) =>
                                                    updateQuestion(index, {
                                                        options: event.target.value
                                                            .split(',')
                                                            .map((option) => option.trim())
                                                            .filter(Boolean)
                                                    })
                                                }
                                                placeholder="Option one, Option two"
                                                required
                                            />
                                        </label>
                                    )}
                                </div>
                            ))}
                            {!config.questions?.length && (
                                <p className="border-2 border-dashed border-slate-300 bg-white p-5 text-sm font-bold text-slate-500">
                                    No custom questions have been added.
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="shadow-brutal-3 border-2 border-slate-900 bg-emerald-400 px-5 py-3 text-xs font-black uppercase hover:bg-emerald-300 disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : 'Save form settings'}
                        </button>
                    </form>
                )
            ) : view === 'analytics' ? (
                <FeedbackAnalytics registrations={registrations} isSuperAdmin={isSuperAdmin} />
            ) : (
                <section>
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:items-end">
                            <label className="block w-full min-w-52 text-[10px] font-black uppercase">
                                Search registered students
                                <input
                                    className={`${FIELD_CLASS} mt-1.5`}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Name, email, registered number..."
                                />
                            </label>
                            <label className="block text-[10px] font-black uppercase">
                                Submission status
                                <select
                                    className={`${FIELD_CLASS} mt-1.5`}
                                    value={submissionFilter}
                                    onChange={(event) => setSubmissionFilter(event.target.value)}
                                >
                                    <option value="all">All students</option>
                                    <option value="submitted">Submitted</option>
                                    <option value="not-submitted">Not submitted</option>
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    setSubmissionSort((current) => (current === 'desc' ? 'asc' : 'desc'))
                                }
                                aria-label={`Sort submissions ${submissionSort === 'desc' ? 'oldest first' : 'newest first'}`}
                                className="shadow-brutal-2 min-h-10 border-2 border-slate-900 bg-amber-300 px-3 py-2 text-[10px] font-black uppercase hover:bg-amber-200"
                            >
                                Submission time:{' '}
                                {submissionSort === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
                            </button>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                            Showing {filteredRegistrations.length} / {registrations.length}
                        </span>
                    </div>
                    {!filteredRegistrations.length ? (
                        <p className="border-2 border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-500">
                            No registrations match this search.
                        </p>
                    ) : (
                        <div className="overflow-x-auto border-2 border-slate-900 bg-white">
                            <table className="w-full min-w-[760px] text-left text-xs">
                                <thead className="bg-slate-900 text-[10px] font-black text-white uppercase">
                                    <tr>
                                        <th className="p-3">Student</th>
                                        <th className="p-3">Registration</th>
                                        <th className="p-3">Submitted at</th>
                                        <th className="p-3">Project</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredRegistrations.map((registration) => (
                                        <tr key={registration._id} className="align-top hover:bg-slate-50">
                                            <td className="p-3">
                                                <div className="font-black">{registration.name}</div>
                                                <div className="mt-1 text-[11px] text-slate-500">
                                                    {registration.email}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {registration.department} · Year {registration.year}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold">{registration.rollNo}</div>
                                                <div className="mt-1 text-[10px] font-black text-slate-500 uppercase">
                                                    {registration.status} · {registration.package}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {registration.phone}
                                                </div>
                                            </td>
                                            <td className={`p-3 ${SUBMISSION_TIME_CLASS}`}>
                                                {formatSubmissionTime(registration.projectSubmission)}
                                            </td>
                                            <td className="p-3">
                                                {registration.projectSubmission ? (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <a
                                                                href={registration.projectSubmission.driveLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={() => handleTrackLinkOpen(registration)}
                                                                className="inline-flex items-center gap-1 font-black text-sky-700 underline hover:text-sky-900"
                                                            >
                                                                Open project link ↗
                                                            </a>
                                                        </div>

                                                        {isSuperAdmin && (
                                                            <div className="border border-amber-300 bg-amber-50/90 p-2 text-[11px] text-slate-800">
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="font-black text-amber-950 uppercase">
                                                                        👁️ Opened:{' '}
                                                                        <span className="text-sky-800 font-extrabold">
                                                                            {registration.projectSubmission.openCount ||
                                                                                registration.projectSubmission.linkOpens?.length ||
                                                                                0}{' '}
                                                                            {(registration.projectSubmission.openCount ||
                                                                                registration.projectSubmission.linkOpens?.length ||
                                                                                0) === 1
                                                                                ? 'time'
                                                                                : 'times'}
                                                                        </span>
                                                                    </span>
                                                                    {registration.projectSubmission.linkOpens?.length > 0 && (
                                                                        <span className="font-mono text-[9px] font-bold text-amber-800">
                                                                            Latest:{' '}
                                                                            {formatOpenTime(
                                                                                registration.projectSubmission.linkOpens[
                                                                                    registration.projectSubmission.linkOpens.length - 1
                                                                                ]?.openedAt
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {registration.projectSubmission.linkOpens?.length > 0 ? (
                                                                    <details className="mt-1.5">
                                                                        <summary className="cursor-pointer text-[10px] font-black text-amber-900 uppercase hover:underline">
                                                                            View open logs ({registration.projectSubmission.linkOpens.length})
                                                                        </summary>
                                                                        <div className="mt-1.5 max-h-36 space-y-1 overflow-y-auto border-t border-amber-200 pt-1 text-[10px]">
                                                                            {registration.projectSubmission.linkOpens
                                                                                .slice()
                                                                                .reverse()
                                                                                .map((openLog, logIdx) => (
                                                                                    <div
                                                                                        key={logIdx}
                                                                                        className="flex items-center justify-between gap-2 border-b border-amber-100 pb-0.5 text-slate-700 last:border-0"
                                                                                    >
                                                                                        <span className="font-bold text-slate-900">
                                                                                            👤 {openLog.adminName || openLog.adminUsername}{' '}
                                                                                            <span className="text-slate-500 font-normal">
                                                                                                (@{openLog.adminUsername})
                                                                                            </span>
                                                                                        </span>
                                                                                        <span className="font-mono text-[9px] text-slate-500 whitespace-nowrap">
                                                                                            {formatOpenTime(openLog.openedAt)}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    </details>
                                                                ) : (
                                                                    <p className="mt-0.5 text-[10px] italic text-amber-700/70">
                                                                        Never opened by any admin yet
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        <details className="max-w-sm">
                                                            <summary className="cursor-pointer text-[10px] font-black text-slate-600 uppercase">
                                                                Feedback &amp; answers
                                                            </summary>
                                                            <p className="mt-1 text-[11px] whitespace-pre-wrap">
                                                                {registration.projectSubmission.feedback ||
                                                                    'No feedback provided.'}
                                                            </p>
                                                            {(
                                                                registration.projectSubmission.answers || []
                                                            ).map((answer) => (
                                                                <p
                                                                    key={answer.questionId}
                                                                    className="mt-2 text-[11px]"
                                                                >
                                                                    <strong>{answer.label}:</strong>{' '}
                                                                    {answer.answer || '—'}
                                                                </p>
                                                            ))}
                                                        </details>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">
                                                        Not submitted
                                                    </span>
                                                )}
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
