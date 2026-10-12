import { safeHref } from './safeHref';
import { CodeBlock, ZoomFigure, StaticPoll } from '../components/community/ArticleBlocks';

/* Renders the blocks from markdownBlocks.js to React elements. Nothing is ever
   passed through innerHTML, so post text cannot inject markup, and every link
   and image URL goes through safeHref.

   Inline: `code`, **bold**, *italic* / _italic_, [text](url), ![alt](url). */

const INLINE =
    /(`[^`]+`)|(\*\*[^*]+?\*\*)|(\*[^*\s][^*]*?\*)|(\b_[^_\s][^_]*?_\b)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\([^)\s]+\))/g;

const isExternal = (href) => /^https?:\/\//i.test(href);

function renderLink(text, url, key) {
    const href = safeHref(url);
    if (!href) return <span key={key}>{renderInline(text)}</span>;
    return (
        <a
            key={key}
            href={href}
            {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="font-semibold text-sky-700 underline decoration-2 underline-offset-2 hover:text-sky-900"
        >
            {renderInline(text)}
        </a>
    );
}

function renderImage(alt, url, key) {
    const src = safeHref(url);
    if (!src) return null;
    return <img key={key} src={src} alt={alt} loading="lazy" decoding="async" className="my-2 inline-block max-w-full" />;
}

export function renderInline(text) {
    const out = [];
    let last = 0;
    let match;
    // A fresh regex per call: bold and link text recurse, and a shared global
    // regex's lastIndex would be reset under the outer loop.
    const inline = new RegExp(INLINE.source, 'g');
    const source = String(text);
    while ((match = inline.exec(source)) !== null) {
        if (match.index > last) out.push(source.slice(last, match.index));
        const [token] = match;
        const key = `${match.index}-${token.length}`;
        if (match[1]) {
            out.push(
                <code key={key} className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] text-slate-900">
                    {token.slice(1, -1)}
                </code>
            );
        } else if (match[2]) {
            out.push(
                <strong key={key} className="font-bold text-slate-900">
                    {renderInline(token.slice(2, -2))}
                </strong>
            );
        } else if (match[3] || match[4]) {
            out.push(<em key={key}>{renderInline(token.slice(1, -1))}</em>);
        } else if (match[5]) {
            const [, alt, url] = token.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
            out.push(renderImage(alt, url, key));
        } else if (match[6]) {
            const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
            out.push(renderLink(label, url, key));
        }
        last = match.index + token.length;
    }
    if (last < source.length) out.push(source.slice(last));
    return out;
}

const CALLOUT_STYLE = {
    note: { icon: 'ℹ️', label: 'Note', box: 'border-sky-600 bg-sky-50' },
    tip: { icon: '💡', label: 'Tip', box: 'border-emerald-600 bg-emerald-50' },
    warning: { icon: '⚠️', label: 'Heads up', box: 'border-amber-500 bg-amber-50' }
};

const HEADING_TAG = { 2: 'h2', 3: 'h3', 4: 'h4' };
const HEADING_CLASS = {
    h2: 'mt-12 mb-4 scroll-mt-24 font-display text-2xl leading-tight font-bold text-slate-900 sm:text-[1.75rem]',
    h3: 'mt-9 mb-3 scroll-mt-24 font-display text-xl leading-snug font-bold text-slate-900',
    h4: 'mt-7 mb-2 scroll-mt-24 text-lg font-bold text-slate-900'
};

/**
 * options.renderPoll(poll) draws a live poll; without it polls render as a static preview.
 * options.showProblems shows poll mistakes inline, for the editor preview.
 */
export function renderBlocks(blocks, options = {}) {
    const { renderPoll, showProblems = false } = options;
    return blocks.map((block, n) => {
        const key = `${block.type}-${n}`;
        switch (block.type) {
            case 'heading': {
                const Tag = HEADING_TAG[block.level];
                return (
                    <Tag key={key} id={block.id} className={HEADING_CLASS[Tag]}>
                        {renderInline(block.text)}
                    </Tag>
                );
            }
            case 'paragraph':
                return (
                    <p key={key} className="my-5">
                        {renderInline(block.text)}
                    </p>
                );
            case 'list': {
                const ListTag = block.ordered ? 'ol' : 'ul';
                return (
                    <ListTag
                        key={key}
                        className={`my-5 space-y-2 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-slate-500`}
                    >
                        {block.items.map((item, i) => (
                            <li key={i} className="pl-1">
                                {renderInline(item)}
                            </li>
                        ))}
                    </ListTag>
                );
            }
            case 'quote':
                return (
                    <blockquote
                        key={key}
                        className="my-7 border-l-4 border-sky-500 bg-sky-50 py-3 pr-4 pl-5 text-slate-700 italic"
                    >
                        {renderInline(block.text)}
                    </blockquote>
                );
            case 'code':
                return <CodeBlock key={key} text={block.text} />;
            case 'figure': {
                const src = safeHref(block.url);
                return src ? <ZoomFigure key={key} alt={block.alt} src={src} /> : null;
            }
            case 'rule':
                return <hr key={key} className="my-10 border-t-2 border-slate-200" />;
            case 'callout': {
                const style = CALLOUT_STYLE[block.variant];
                return (
                    <aside key={key} className={`my-7 border-l-4 px-5 py-4 ${style.box}`}>
                        <p className="font-bold text-slate-900">
                            <span aria-hidden="true">{style.icon} </span>
                            {block.title ? renderInline(block.title) : style.label}
                        </p>
                        <div className="text-[0.95em] [&>*:first-child]:mt-2 [&>*:last-child]:mb-0">
                            {renderBlocks(block.blocks, options)}
                        </div>
                    </aside>
                );
            }
            case 'poll':
                return renderPoll ? <div key={key}>{renderPoll(block)}</div> : <StaticPoll key={key} poll={block} />;
            case 'poll-error':
                return showProblems ? (
                    <p
                        key={key}
                        role="note"
                        className="my-6 border-2 border-dashed border-rose-600 bg-rose-50 p-3 font-mono text-xs font-bold text-rose-800"
                    >
                        ⚠️ Poll “{block.question}” will not be shown. {block.reason}
                    </p>
                ) : null;
            default:
                return null;
        }
    });
}
