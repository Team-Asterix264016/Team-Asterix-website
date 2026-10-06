import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { safeHref } from '../../lib/safeHref';
import { AUTH_TOKEN_KEY, useWebsiteData } from '../../context/WebsiteDataContext';
import { WORKSHOP_TRACKS } from '../../../server/src/config/workshopPackages.js';

const FIELD_CLASS =
    'w-full min-h-10 border-2 border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-600 focus:outline-none';
const LABEL_CLASS = 'mb-1 block font-mono text-[10px] font-black text-slate-700 uppercase';

const TRACKS = [
    { id: 'software', label: 'Software & Perception' },
    { id: 'powertrain', label: 'Powertrain' },
    { id: 'common', label: 'Both tracks' }
];
const LINK_TYPES = [
    { value: 'pdf', label: 'PDF' },
    { value: 'slides', label: 'Slides' },
    { value: 'notebook', label: 'Notebook (Colab / Jupyter)' },
    { value: 'github', label: 'GitHub repo' },
    { value: 'code', label: 'Code file' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'doc', label: 'Document' },
    { value: 'dataset', label: 'Dataset' },
    { value: 'video', label: 'Video' },
    { value: 'drive', label: 'Drive folder' },
    { value: 'link', label: 'Web link' }
];
const KNOWN_TYPES = new Set(LINK_TYPES.map((t) => t.value));
// Mirrors NOTE_FILE_EXTENSIONS in server/src/middleware/upload.js.
const NOTE_FILE_ACCEPT =
    '.pdf,.md,.markdown,.txt,.ipynb,.py,.c,.cpp,.h,.hpp,.ino,.m,.java,.json,.csv,.yaml,.yml,.zip,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif';

// Best guess from a URL or file name, so pasting a link or uploading a file fills the type in.
function detectLinkType(urlOrName) {
    const value = String(urlOrName || '').toLowerCase();
    const path = value.split(/[?#]/)[0];
    if (/github\.com|gitlab\.com/.test(value)) return 'github';
    if (/colab\.research\.google\.com/.test(value) || path.endsWith('.ipynb')) return 'notebook';
    if (/\.(md|markdown)$/.test(path)) return 'markdown';
    if (path.endsWith('.pdf')) return 'pdf';
    if (/docs\.google\.com\/presentation/.test(value) || /\.(pptx?|key)$/.test(path)) return 'slides';
    if (/docs\.google\.com\/document/.test(value) || /\.(docx?|txt)$/.test(path)) return 'doc';
    if (/docs\.google\.com\/spreadsheets/.test(value) || /\.(csv|xlsx?|json|ya?ml)$/.test(path)) return 'dataset';
    if (/\.(py|c|cpp|h|hpp|ino|m|java|zip)$/.test(path)) return 'code';
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(value)) return 'video';
    if (/drive\.google\.com/.test(value)) return 'drive';
    return null;
}

// typeTouched stops auto-detection from overriding a type the admin picked; the API ignores it.
const emptyLink = () => ({ label: '', url: '', type: 'link', typeTouched: false });
// takeaways is edited as one-per-line text; the API splits it into a list.
const emptyNote = () => ({
    track: 'software',
    sessionId: '',
    module: '',
    sessionNumber: 1,
    title: '',
    description: '',
    takeaways: '',
    resources: [emptyLink()]
});

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

export default function WorkshopNotesAdmin({ showStatus }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [trackFilter, setTrackFilter] = useState('all');
    const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating, otherwise the note _id
    const [draft, setDraft] = useState(emptyNote);
    const [saving, setSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState(null);

    const loadNotes = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const data = await request('/api/workshop/attendance/resources');
            setNotes(data.resources || []);
        } catch (err) {
            setLoadError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotes();
    }, []);

    const knownModules = useMemo(() => [...new Set(notes.map((n) => n.module).filter(Boolean))], [notes]);
    const visibleNotes = trackFilter === 'all' ? notes : notes.filter((n) => n.track === trackFilter);

    // Same source the participant timetable uses: the admin-edited schedule over the config defaults.
    const { siteData } = useWebsiteData();
    const sessionsById = useMemo(() => {
        const map = new Map();
        ['software', 'powertrain'].forEach((trackId) => {
            const track = { ...WORKSHOP_TRACKS[trackId], ...siteData?.workshop?.tracks?.[trackId] };
            (track.schedule || [])
                .filter((s) => s.type !== 'holiday')
                .forEach((s) => map.set(s.id, { ...s, trackId, option: `${s.date} · ${s.label} · ${s.title}` }));
        });
        return map;
    }, [siteData]);
    const sessionOptions = (track) =>
        [...sessionsById.values()].filter((s) => track === 'common' || s.trackId === track);

    const openCreate = () => {
        setDraft(emptyNote());
        setEditingId('new');
    };

    const openEdit = (note) => {
        setDraft({
            track: note.track,
            sessionId: note.sessionId || '',
            module: note.module || '',
            sessionNumber: note.sessionNumber ?? 1,
            title: note.title,
            description: note.description || '',
            takeaways: (note.takeaways || []).join('\n'),
            resources: note.resources?.length
                ? note.resources.map(({ label, url, type }) => ({ label, url, type, typeTouched: true }))
                : [emptyLink()]
        });
        setEditingId(note._id);
    };

    const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
    const patchLink = (index, patch) =>
        setDraft((prev) => ({ ...prev, resources: prev.resources.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
    const removeLink = (index) => setDraft((prev) => ({ ...prev, resources: prev.resources.filter((_, i) => i !== index) }));

    // Sets the URL and, unless the admin chose a type themselves, the type detected from it.
    const setLinkUrl = (index, url, nameHint = url) =>
        setDraft((prev) => ({
            ...prev,
            resources: prev.resources.map((l, i) => {
                if (i !== index) return l;
                const detected = l.typeTouched ? null : detectLinkType(nameHint);
                return { ...l, url, ...(detected ? { type: detected } : {}) };
            })
        }));

    const handleUpload = async (e, index) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setUploadingIndex(index);
        try {
            const body = new FormData();
            body.append('file', file);
            const response = await fetch(apiUrl('/api/upload/note-file'), { method: 'POST', headers: adminHeaders(), body });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `Upload failed (${response.status}).`);
            setLinkUrl(index, data.url, file.name);
            if (!draft.resources[index]?.label) patchLink(index, { label: file.name.replace(/\.[^.]+$/, '') });
            showStatus?.(`Uploaded ${file.name}.`);
        } catch (err) {
            showStatus?.(`⚠️ ${err.message}`);
        } finally {
            setUploadingIndex(null);
        }
    };

    const saveNote = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = JSON.stringify(draft);
            if (editingId === 'new') {
                await request('/api/workshop/attendance/resources', { method: 'POST', body });
                showStatus?.('Note published to participants.');
            } else {
                await request(`/api/workshop/attendance/resources/${editingId}`, { method: 'PUT', body });
                showStatus?.('Note updated.');
            }
            setEditingId(null);
            await loadNotes();
        } catch (err) {
            showStatus?.(`⚠️ ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async (note) => {
        if (!window.confirm(`Delete "${note.title}"? Participants will no longer see it.`)) return;
        try {
            await request(`/api/workshop/attendance/resources/${note._id}`, { method: 'DELETE' });
            showStatus?.('Note deleted.');
            if (editingId === note._id) setEditingId(null);
            await loadNotes();
        } catch (err) {
            showStatus?.(`⚠️ ${err.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-slate-900 pb-4">
                <div>
                    <h2 className="text-2xl font-black uppercase">Workshop Notes</h2>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                        Notes, slides and links shown on each participant&apos;s profile under the Notes tab. Only what you publish
                        here is shown.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="press shadow-brutal-3 border-2 border-slate-900 bg-emerald-400 px-4 py-2 font-mono text-xs font-black uppercase hover:bg-emerald-300"
                >
                    + New note
                </button>
            </div>

            {editingId && (
                <form onSubmit={saveNote} className="shadow-brutal-3 space-y-4 border-2 border-slate-900 bg-white p-5">
                    <h3 className="font-mono text-sm font-black uppercase">{editingId === 'new' ? 'New note' : 'Edit note'}</h3>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <label>
                            <span className={LABEL_CLASS}>Track</span>
                            <select
                                className={FIELD_CLASS}
                                value={draft.track}
                                onChange={(e) => {
                                    const track = e.target.value;
                                    const keepSession = sessionOptions(track).some((s) => s.id === draft.sessionId);
                                    patchDraft({ track, ...(keepSession ? {} : { sessionId: '' }) });
                                }}
                            >
                                {TRACKS.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className={LABEL_CLASS}>Module (optional, used as a filter)</span>
                            <input
                                className={FIELD_CLASS}
                                list="workshop-note-modules"
                                value={draft.module}
                                onChange={(e) => patchDraft({ module: e.target.value })}
                                placeholder="e.g. Computer Vision"
                            />
                            <datalist id="workshop-note-modules">
                                {knownModules.map((m) => (
                                    <option key={m} value={m} />
                                ))}
                            </datalist>
                        </label>
                        <label>
                            <span className={LABEL_CLASS}>Display order</span>
                            <input
                                type="number"
                                className={FIELD_CLASS}
                                value={draft.sessionNumber}
                                onChange={(e) => patchDraft({ sessionNumber: e.target.value })}
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className={LABEL_CLASS}>Session (participants see this note when they open the class in Timetable)</span>
                        <select className={FIELD_CLASS} value={draft.sessionId} onChange={(e) => patchDraft({ sessionId: e.target.value })}>
                            <option value="">Not tied to a session (Notes tab only)</option>
                            {sessionOptions(draft.track).map((s) => (
                                <option key={s.id} value={s.id}>
                                    {draft.track === 'common' ? `${s.trackId === 'software' ? 'Software' : 'Powertrain'} · ` : ''}
                                    {s.option}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className={LABEL_CLASS}>Title</span>
                        <input required className={FIELD_CLASS} value={draft.title} onChange={(e) => patchDraft({ title: e.target.value })} />
                    </label>

                    <label className="block">
                        <span className={LABEL_CLASS}>Description (optional)</span>
                        <textarea
                            rows={3}
                            className={FIELD_CLASS}
                            value={draft.description}
                            onChange={(e) => patchDraft({ description: e.target.value })}
                        />
                    </label>

                    <label className="block">
                        <span className={LABEL_CLASS}>Key takeaways (optional, one per line)</span>
                        <textarea
                            rows={4}
                            className={FIELD_CLASS}
                            value={draft.takeaways}
                            onChange={(e) => patchDraft({ takeaways: e.target.value })}
                            placeholder={'e.g. Sense → Plan → Act loop\nWhy loop timing matters'}
                        />
                    </label>

                    <div className="space-y-3">
                        <span className={LABEL_CLASS}>Links &amp; files</span>
                        {draft.resources.map((link, index) => (
                            <div key={index} className="grid grid-cols-1 gap-2 border-2 border-slate-200 bg-slate-50 p-3 sm:grid-cols-12">
                                <input
                                    className={`${FIELD_CLASS} sm:col-span-3`}
                                    placeholder="Label, e.g. Session 2 slides"
                                    value={link.label}
                                    onChange={(e) => patchLink(index, { label: e.target.value })}
                                />
                                <input
                                    className={`${FIELD_CLASS} sm:col-span-4`}
                                    placeholder="https://… (GitHub, Colab, Drive…) or upload a file"
                                    value={link.url}
                                    onChange={(e) => setLinkUrl(index, e.target.value)}
                                />
                                <div className="flex flex-col gap-1 sm:col-span-3">
                                    <select
                                        className={FIELD_CLASS}
                                        aria-label="Link type"
                                        value={KNOWN_TYPES.has(link.type) ? link.type : 'custom'}
                                        onChange={(e) =>
                                            patchLink(index, {
                                                type: e.target.value === 'custom' ? '' : e.target.value,
                                                typeTouched: true
                                            })
                                        }
                                    >
                                        {LINK_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                        <option value="custom">Custom…</option>
                                    </select>
                                    {!KNOWN_TYPES.has(link.type) && (
                                        <input
                                            className={FIELD_CLASS}
                                            placeholder="Custom type, e.g. lab manual"
                                            value={link.type}
                                            onChange={(e) => patchLink(index, { type: e.target.value, typeTouched: true })}
                                        />
                                    )}
                                </div>
                                <div className="flex gap-2 sm:col-span-2">
                                    <label className="press flex flex-1 cursor-pointer items-center justify-center border-2 border-slate-900 bg-white px-2 font-mono text-[10px] font-black uppercase hover:bg-amber-200">
                                        {uploadingIndex === index ? '…' : 'Upload'}
                                        <input
                                            type="file"
                                            accept={NOTE_FILE_ACCEPT}
                                            className="hidden"
                                            disabled={uploadingIndex !== null}
                                            onChange={(e) => handleUpload(e, index)}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => removeLink(index)}
                                        className="press border-2 border-slate-900 bg-rose-100 px-2 font-mono text-[10px] font-black uppercase hover:bg-rose-200"
                                        aria-label="Remove link"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => patchDraft({ resources: [...draft.resources, emptyLink()] })}
                            className="press border-2 border-slate-900 bg-slate-100 px-3 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-200"
                        >
                            + Add link
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t-2 border-slate-200 pt-4">
                        <button
                            type="submit"
                            disabled={saving || uploadingIndex !== null}
                            className="press shadow-brutal-2 border-2 border-slate-900 bg-sky-500 px-4 py-2 font-mono text-xs font-black text-white uppercase hover:bg-sky-600 disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : editingId === 'new' ? 'Publish note' : 'Save changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="press border-2 border-slate-900 bg-white px-4 py-2 font-mono text-xs font-black uppercase hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-wrap gap-1.5 font-mono text-xs font-black uppercase">
                {[{ id: 'all', label: 'All' }, ...TRACKS].map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTrackFilter(t.id)}
                        className={`border-2 border-slate-900 px-3 py-1.5 ${trackFilter === t.id ? 'bg-amber-300' : 'bg-white hover:bg-slate-100'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="font-mono text-xs font-bold text-slate-500">Loading notes…</p>
            ) : loadError ? (
                <div className="border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-black text-rose-800">
                    Could not load notes: {loadError}{' '}
                    <button type="button" onClick={loadNotes} className="underline">
                        Retry
                    </button>
                </div>
            ) : visibleNotes.length === 0 ? (
                <div className="border-2 border-dashed border-slate-400 bg-white p-6 text-center font-mono text-xs font-bold text-slate-600">
                    No notes published{trackFilter === 'all' ? '' : ' for this track'} yet. Use “+ New note” to add one.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {visibleNotes.map((note) => (
                        <div key={note._id} className="shadow-brutal-2 border-2 border-slate-900 bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-black uppercase">
                                <span className="bg-slate-900 px-2 py-0.5 text-amber-300">
                                    {TRACKS.find((t) => t.id === note.track)?.label || note.track}
                                </span>
                                {note.module && <span className="border border-slate-900 bg-amber-200 px-2 py-0.5">{note.module}</span>}
                                <span className="text-slate-500">Order {note.sessionNumber ?? 1}</span>
                            </div>
                            {note.sessionId && (
                                <p className="mt-2 font-mono text-[10px] font-black text-sky-800 uppercase">
                                    🗓 {sessionsById.get(note.sessionId)?.option || `Session ${note.sessionId} (no longer in schedule)`}
                                </p>
                            )}
                            <h4 className="mt-2 text-base font-black uppercase">{note.title}</h4>
                            {note.description && <p className="mt-1 text-xs font-bold text-slate-600">{note.description}</p>}
                            <ul className="mt-3 space-y-1 font-mono text-[11px] font-bold">
                                {(note.resources || []).map((link, i) => (
                                    <li key={i} className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                                        <a href={safeHref(link.url)} target="_blank" rel="noopener noreferrer" className="truncate text-sky-800 underline">
                                            {link.label}
                                        </a>
                                        <span className="shrink-0 border border-slate-400 px-1.5 text-[10px] uppercase">{link.type || 'link'}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => openEdit(note)}
                                    className="press border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-[10px] font-black uppercase hover:bg-amber-400"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteNote(note)}
                                    className="press border-2 border-slate-900 bg-rose-500 px-3 py-1 font-mono text-[10px] font-black text-white uppercase hover:bg-rose-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
