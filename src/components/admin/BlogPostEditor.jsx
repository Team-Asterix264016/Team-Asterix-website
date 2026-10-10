import { useEffect, useId, useRef, useState } from 'react';
import ImageField from './ImageField';
import { adminGet, adminSend } from './adminRequest';
import ArticleBody from '../community/ArticleBody';
import { slugify, countWords, readMinutes } from '../../lib/blogText';
import { safeHref } from '../../lib/safeHref';

const EMPTY = {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    coverImage: '',
    coverAlt: '',
    coverPosition: '50% 50%',
    author: '',
    authorRole: '',
    category: '',
    tags: '',
    featured: false
};

// The two places a cover is cropped on the public site.
const COVER_FRAMES = [
    { id: 'card', label: 'Blog card', ratio: '16 / 9' },
    { id: 'featured', label: 'Featured card', ratio: '16 / 10' }
];

function toForm(post) {
    return {
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        body: post.body || '',
        coverImage: post.coverImage || '',
        coverAlt: post.coverAlt || '',
        coverPosition: post.coverPosition || '50% 50%',
        author: post.author || '',
        authorRole: post.authorRole || '',
        category: post.category || '',
        tags: (post.tags || []).join(', '),
        featured: Boolean(post.featured)
    };
}

const TOOLS = [
    { id: 'h2', label: 'H2', title: 'Section heading' },
    { id: 'h3', label: 'H3', title: 'Sub-heading' },
    { id: 'bold', label: 'B', title: 'Bold', className: 'font-black' },
    { id: 'italic', label: 'I', title: 'Italic', className: 'italic' },
    { id: 'link', label: 'Link', title: 'Link' },
    { id: 'ul', label: '• List', title: 'Bulleted list' },
    { id: 'ol', label: '1. List', title: 'Numbered list' },
    { id: 'quote', label: '❝ Quote', title: 'Quote' },
    { id: 'code', label: '</> Code', title: 'Code block' },
    { id: 'image', label: '🖼 Image', title: 'Image' },
    { id: 'rule', label: '—', title: 'Divider' }
];

const inputClass = (invalid) =>
    `w-full border-2 bg-white px-3 py-2 text-base sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
        invalid ? 'border-rose-600' : 'border-slate-900'
    }`;

function Field({ label, hint, htmlFor, children }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="mb-1 block font-mono text-[10px] font-black text-slate-700 uppercase">
                {label}
            </label>
            {children}
            {hint && <p className="mt-1 font-mono text-[10px] text-slate-500">{hint}</p>}
        </div>
    );
}

export default function BlogPostEditor({ postId, defaultAuthor, onUploadImage, onClose, showStatus }) {
    const uid = useId();
    const ids = (name) => `${uid}-${name}`;
    const [id, setId] = useState(postId || null);
    const [savedStatus, setSavedStatus] = useState('draft');
    const [form, setForm] = useState(() => ({ ...EMPTY, author: defaultAuthor || '' }));
    const [slugTouched, setSlugTouched] = useState(Boolean(postId));
    const [loadState, setLoadState] = useState(postId ? 'loading' : 'ready');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState({ message: '', field: '' });
    const [tab, setTab] = useState('write');
    const [dirty, setDirty] = useState(false);
    const bodyRef = useRef(null);

    useEffect(() => {
        if (!postId) return undefined;
        let cancelled = false;
        adminGet(`/api/blog/admin/${postId}`)
            .then(({ post }) => {
                if (cancelled) return;
                setForm(toForm(post));
                setSavedStatus(post.status);
                setLoadState('ready');
            })
            .catch((err) => {
                if (cancelled) return;
                setError({ message: err.message, field: '' });
                setLoadState('error');
            });
        return () => {
            cancelled = true;
        };
    }, [postId]);

    const update = (field, value) => {
        setDirty(true);
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            // The slug follows the title until someone edits it by hand.
            if (field === 'title' && !slugTouched) next.slug = slugify(value);
            return next;
        });
    };

    const save = async (targetStatus) => {
        if (!form.title.trim()) {
            setError({ message: 'Give the post a title.', field: 'title' });
            return;
        }
        setSaving(true);
        setError({ message: '', field: '' });
        try {
            const payload = { ...form, status: targetStatus };
            const { post } = id
                ? await adminSend(`/api/blog/admin/${id}`, 'PUT', payload)
                : await adminSend('/api/blog/admin', 'POST', payload);
            const wasPublished = savedStatus === 'published';
            setId(post.id);
            setSavedStatus(post.status);
            setForm(toForm(post));
            setSlugTouched(true);
            setDirty(false);
            showStatus?.(
                targetStatus === 'published'
                    ? wasPublished
                        ? 'Post updated.'
                        : 'Post published. It is live on the community page.'
                    : wasPublished
                      ? 'Post unpublished and kept as a draft.'
                      : 'Draft saved.'
            );
        } catch (err) {
            setError({ message: err.message, field: err.field || '' });
        } finally {
            setSaving(false);
        }
    };

    const close = () => {
        if (dirty && !window.confirm('Discard the unsaved changes to this post?')) return;
        onClose();
    };

    /* Toolbar edits work on the textarea's selection and put the cursor back,
       so writers can keep typing without reaching for the mouse. */
    const applyEdit = (edit) => {
        const ta = bodyRef.current;
        if (!ta) return;
        const { text, selStart, selEnd } = edit(ta.value, ta.selectionStart, ta.selectionEnd);
        update('body', text);
        requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(selStart, selEnd);
        });
    };

    const wrap = (before, after, placeholder) =>
        applyEdit((v, s, e) => {
            const selected = v.slice(s, e) || placeholder;
            return {
                text: v.slice(0, s) + before + selected + after + v.slice(e),
                selStart: s + before.length,
                selEnd: s + before.length + selected.length
            };
        });

    const prefixLines = (prefix) =>
        applyEdit((v, s, e) => {
            const start = v.lastIndexOf('\n', s - 1) + 1;
            const endIdx = v.indexOf('\n', e);
            const end = endIdx === -1 ? v.length : endIdx;
            const block = v
                .slice(start, end)
                .split('\n')
                .map((line, i) => prefix(i) + line.replace(/^(#{1,4}\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/, ''))
                .join('\n');
            return { text: v.slice(0, start) + block + v.slice(end), selStart: start, selEnd: start + block.length };
        });

    // Block snippets get a blank line on both sides, which Markdown needs to see them as blocks.
    const insertBlock = (block, selectText) =>
        applyEdit((v, s, e) => {
            const before = v.slice(0, s);
            const lead = s === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
            const pos = s + lead.length + block.indexOf(selectText);
            return {
                text: before + lead + block + '\n\n' + v.slice(e),
                selStart: pos,
                selEnd: pos + selectText.length
            };
        });

    const insertLink = () =>
        applyEdit((v, s, e) => {
            const label = v.slice(s, e) || 'link text';
            const snippet = `[${label}](https://)`;
            const urlAt = s + label.length + 3;
            return {
                text: v.slice(0, s) + snippet + v.slice(e),
                selStart: v.slice(s, e) ? urlAt : s + 1,
                selEnd: v.slice(s, e) ? urlAt + 8 : s + 1 + label.length
            };
        });

    const runTool = (id) => {
        if (id === 'h2') prefixLines(() => '## ');
        else if (id === 'h3') prefixLines(() => '### ');
        else if (id === 'bold') wrap('**', '**', 'bold text');
        else if (id === 'italic') wrap('*', '*', 'italic text');
        else if (id === 'link') insertLink();
        else if (id === 'ul') prefixLines(() => '- ');
        else if (id === 'ol') prefixLines((i) => `${i + 1}. `);
        else if (id === 'quote') prefixLines(() => '> ');
        else if (id === 'code') insertBlock('```\ncode\n```', 'code');
        else if (id === 'image') insertBlock('![Describe the image](https://)', 'https://');
        else if (id === 'rule') insertBlock('---', '---');
    };

    if (loadState === 'loading') {
        return <div className="p-8 text-center font-mono text-sm text-slate-500">Loading post…</div>;
    }

    if (loadState === 'error') {
        return (
            <div className="space-y-3">
                <div className="border-2 border-rose-600 bg-rose-50 p-4 font-mono text-xs font-bold text-rose-800">
                    ⚠️ {error.message}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="press press-flat cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black uppercase"
                >
                    ← All posts
                </button>
            </div>
        );
    }

    const isPublished = savedStatus === 'published';
    const words = countWords(form.body);
    const coverPreview = safeHref(form.coverImage);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={close}
                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-white px-3 py-1.5 font-mono text-xs font-black uppercase hover:bg-slate-100"
                    >
                        ← All posts
                    </button>
                    <h2 className="text-xl font-black text-slate-900 uppercase sm:text-2xl">
                        {id ? 'Edit post' : 'New post'}
                    </h2>
                    <span
                        className={`border px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                            isPublished
                                ? 'border-emerald-700 bg-emerald-100 text-emerald-900'
                                : 'border-slate-400 bg-slate-100 text-slate-700'
                        }`}
                    >
                        {isPublished ? 'Published' : 'Draft'}
                    </span>
                    {dirty && <span className="font-mono text-[10px] font-bold text-amber-700">● Unsaved changes</span>}
                </div>
                {isPublished && form.slug && (
                    <a
                        href={`/#community/blog/${form.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-black text-sky-700 hover:text-slate-900"
                    >
                        View live ↗
                    </a>
                )}
            </div>

            {error.message && (
                <div
                    role="alert"
                    className="border-2 border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-800"
                >
                    ⚠️ {error.message}
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <Field label="Title" htmlFor={ids('title')}>
                        <input
                            id={ids('title')}
                            type="text"
                            value={form.title}
                            maxLength={200}
                            onChange={(e) => update('title', e.target.value)}
                            aria-invalid={error.field === 'title' || undefined}
                            placeholder="What is this post about?"
                            className={`${inputClass(error.field === 'title')} font-display text-lg font-bold`}
                        />
                    </Field>

                    <Field
                        label={`Summary (${form.excerpt.length}/600)`}
                        hint="Shown on the post card and under the title. One or two sentences."
                        htmlFor={ids('excerpt')}
                    >
                        <textarea
                            id={ids('excerpt')}
                            value={form.excerpt}
                            maxLength={600}
                            rows={3}
                            onChange={(e) => update('excerpt', e.target.value)}
                            data-lenis-prevent
                            className={inputClass(error.field === 'excerpt')}
                        />
                    </Field>

                    <div>
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <span className="font-mono text-[10px] font-black text-slate-700 uppercase">Post body</span>
                            <div className="flex border-2 border-slate-900" role="tablist" aria-label="Editor mode">
                                {['write', 'preview'].map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === mode}
                                        onClick={() => setTab(mode)}
                                        className={`cursor-pointer px-3 py-1 font-mono text-[11px] font-black uppercase ${
                                            tab === mode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab === 'write' ? (
                            <div className="mt-2 border-2 border-slate-900 bg-white">
                                <div
                                    className="flex flex-wrap gap-1 border-b-2 border-slate-900 bg-slate-50 p-1.5"
                                    role="toolbar"
                                    aria-label="Formatting"
                                >
                                    {TOOLS.map((tool) => (
                                        <button
                                            key={tool.id}
                                            type="button"
                                            title={tool.title}
                                            aria-label={tool.title}
                                            onClick={() => runTool(tool.id)}
                                            className={`cursor-pointer border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] text-slate-800 hover:border-slate-900 ${
                                                tool.className || ''
                                            }`}
                                        >
                                            {tool.label}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    ref={bodyRef}
                                    id={ids('body')}
                                    aria-label="Post body in Markdown"
                                    value={form.body}
                                    onChange={(e) => update('body', e.target.value)}
                                    data-lenis-prevent
                                    placeholder={'Write the post here.\n\n## A section heading\n\nParagraphs are separated by a blank line.'}
                                    className="block h-[28rem] w-full resize-y p-3 font-mono text-base leading-relaxed focus:outline-none sm:text-sm"
                                />
                            </div>
                        ) : (
                            <div className="mt-2 border-2 border-slate-900 bg-slate-50 px-4 py-6">
                                {coverPreview && (
                                    <img
                                        src={coverPreview}
                                        alt={form.coverAlt}
                                        style={{ objectPosition: form.coverPosition }}
                                        className="mx-auto mb-6 aspect-[16/9] w-full max-w-[38rem] border-4 border-slate-900 object-cover"
                                    />
                                )}
                                <h1 className="mx-auto max-w-[38rem] font-display text-3xl leading-tight font-bold text-slate-900">
                                    {form.title || 'Untitled post'}
                                </h1>
                                {form.excerpt && (
                                    <p className="mx-auto mt-3 max-w-[38rem] text-lg text-slate-600">{form.excerpt}</p>
                                )}
                                {form.body.trim() ? (
                                    <ArticleBody markdown={form.body} className="mt-6" />
                                ) : (
                                    <p className="mx-auto mt-6 max-w-[38rem] font-mono text-xs text-slate-500">
                                        Nothing written yet.
                                    </p>
                                )}
                            </div>
                        )}
                        <p className="mt-1 font-mono text-[10px] text-slate-500">
                            {words} words · {readMinutes(form.body)} min read · Markdown: ## heading, **bold**,
                            *italic*, - list, [text](url), ![alt](image url)
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-3 border-2 border-slate-900 bg-violet-50 p-4">
                        <span className="block font-mono text-[10px] font-black text-slate-700 uppercase">Placement</span>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.featured}
                                onChange={(e) => update('featured', e.target.checked)}
                                className="mt-1 h-4 w-4 accent-violet-600"
                            />
                            <span>
                                <span className="font-bold">Feature this post</span>
                                <span className="block text-xs text-slate-600">
                                    Pins it to the large card at the top of the blog and first on the home page.
                                    Featuring it unfeatures any other post.
                                </span>
                            </span>
                        </label>
                    </div>

                    <Field
                        label="URL slug"
                        hint={`Link: /#community/blog/${form.slug || '…'}${isPublished ? ' — changing it breaks links already shared.' : ''}`}
                        htmlFor={ids('slug')}
                    >
                        <input
                            id={ids('slug')}
                            type="text"
                            value={form.slug}
                            onChange={(e) => {
                                setSlugTouched(true);
                                update('slug', e.target.value);
                            }}
                            onBlur={() => setForm((prev) => ({ ...prev, slug: slugify(prev.slug || prev.title) }))}
                            aria-invalid={error.field === 'slug' || undefined}
                            className={`${inputClass(error.field === 'slug')} font-mono`}
                        />
                    </Field>

                    <div className={error.field === 'coverImage' ? 'border-2 border-rose-600 p-1' : ''}>
                        <ImageField
                            label="Cover image"
                            value={form.coverImage}
                            fit="cover"
                            position={form.coverPosition}
                            frames={COVER_FRAMES}
                            folder="/asterix/blog"
                            onUpload={(e, cb, folder) => onUploadImage?.(e, cb, folder, form.slug || 'blog_cover')}
                            onChange={(fields) => {
                                if (fields.url !== undefined) update('coverImage', fields.url);
                                if (fields.position !== undefined) update('coverPosition', fields.position);
                            }}
                        />
                    </div>

                    <Field
                        label="Cover description"
                        hint="Describes the image for people using screen readers."
                        htmlFor={ids('coverAlt')}
                    >
                        <input
                            id={ids('coverAlt')}
                            type="text"
                            value={form.coverAlt}
                            maxLength={300}
                            onChange={(e) => update('coverAlt', e.target.value)}
                            className={inputClass(false)}
                        />
                    </Field>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <Field label="Category" htmlFor={ids('category')}>
                            <input
                                id={ids('category')}
                                type="text"
                                value={form.category}
                                maxLength={60}
                                placeholder="e.g. Race Report"
                                onChange={(e) => update('category', e.target.value)}
                                className={inputClass(error.field === 'category')}
                            />
                        </Field>
                        <Field label="Tags" hint="Comma separated, up to 10." htmlFor={ids('tags')}>
                            <input
                                id={ids('tags')}
                                type="text"
                                value={form.tags}
                                onChange={(e) => update('tags', e.target.value)}
                                aria-invalid={error.field === 'tags' || undefined}
                                className={inputClass(error.field === 'tags')}
                            />
                        </Field>
                        <Field label="Author" htmlFor={ids('author')}>
                            <input
                                id={ids('author')}
                                type="text"
                                value={form.author}
                                maxLength={120}
                                placeholder="Team Asterix"
                                onChange={(e) => update('author', e.target.value)}
                                className={inputClass(error.field === 'author')}
                            />
                        </Field>
                        <Field label="Author role" htmlFor={ids('authorRole')}>
                            <input
                                id={ids('authorRole')}
                                type="text"
                                value={form.authorRole}
                                maxLength={120}
                                onChange={(e) => update('authorRole', e.target.value)}
                                className={inputClass(error.field === 'authorRole')}
                            />
                        </Field>
                    </div>
                </div>
            </div>

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t-4 border-slate-900 bg-white/95 px-1 py-3 backdrop-blur-sm">
                {isPublished && (
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => save('draft')}
                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100 disabled:opacity-50"
                    >
                        Unpublish
                    </button>
                )}
                {!isPublished && (
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => save('draft')}
                        className="press press-flat cursor-pointer border-2 border-slate-900 bg-white px-3 py-2 font-mono text-xs font-black text-slate-900 uppercase hover:bg-slate-100 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save draft'}
                    </button>
                )}
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => save('published')}
                    className="press shadow-brutal-2 cursor-pointer border-2 border-slate-900 bg-violet-400 px-4 py-2 font-mono text-xs font-black text-slate-950 uppercase hover:bg-violet-300 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : isPublished ? 'Save changes' : 'Publish'}
                </button>
            </div>
        </div>
    );
}
