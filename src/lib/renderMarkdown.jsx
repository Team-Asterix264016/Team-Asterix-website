import { safeHref } from './safeHref';

/* A deliberately small Markdown subset for Horizon blog posts, rendered to React
   elements. Nothing is ever passed through innerHTML, so post text cannot inject
   markup, and every link and image URL goes through safeHref.

   Blocks: # / ## (h2), ### (h3), #### (h4), paragraphs, - * + lists, 1. lists,
   > quotes, ``` fenced code, --- rules, and an image alone on its line (figure).
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

function renderImage(alt, url, key, className = 'my-2 inline-block max-w-full') {
    const src = safeHref(url);
    if (!src) return null;
    return <img key={key} src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
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

const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const LONE_IMAGE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;

const HEADING_TAG = { 1: 'h2', 2: 'h2', 3: 'h3', 4: 'h4' };
const HEADING_CLASS = {
    h2: 'mt-12 mb-4 font-display text-2xl leading-tight font-bold text-slate-900 sm:text-[1.75rem]',
    h3: 'mt-9 mb-3 font-display text-xl leading-snug font-bold text-slate-900',
    h4: 'mt-7 mb-2 text-lg font-bold text-slate-900'
};

export function renderMarkdown(markdown) {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const key = `b${i}`;

        if (!line.trim()) {
            i += 1;
            continue;
        }

        if (line.trim().startsWith('```')) {
            const code = [];
            i += 1;
            while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
            i += 1; // closing fence
            blocks.push(
                <pre
                    key={key}
                    className="my-6 overflow-x-auto border-2 border-slate-900 bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-slate-100"
                >
                    <code>{code.join('\n')}</code>
                </pre>
            );
            continue;
        }

        const heading = line.match(HEADING);
        if (heading) {
            const Tag = HEADING_TAG[heading[1].length];
            blocks.push(
                <Tag key={key} className={HEADING_CLASS[Tag]}>
                    {renderInline(heading[2])}
                </Tag>
            );
            i += 1;
            continue;
        }

        if (RULE.test(line)) {
            blocks.push(<hr key={key} className="my-10 border-t-2 border-slate-200" />);
            i += 1;
            continue;
        }

        const image = line.match(LONE_IMAGE);
        if (image) {
            const img = renderImage(image[1], image[2], `${key}-img`, 'w-full border-2 border-slate-900');
            if (img) {
                blocks.push(
                    <figure key={key} className="my-8">
                        {img}
                        {image[1] && (
                            <figcaption className="mt-2 text-center text-sm text-slate-500">{image[1]}</figcaption>
                        )}
                    </figure>
                );
            }
            i += 1;
            continue;
        }

        if (line.trimStart().startsWith('>')) {
            const quote = [];
            while (i < lines.length && lines[i].trimStart().startsWith('>')) {
                quote.push(lines[i].trimStart().replace(/^>\s?/, ''));
                i += 1;
            }
            blocks.push(
                <blockquote
                    key={key}
                    className="my-7 border-l-4 border-sky-500 bg-sky-50 py-3 pr-4 pl-5 text-slate-700 italic"
                >
                    {renderInline(quote.join(' '))}
                </blockquote>
            );
            continue;
        }

        if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
            const ordered = OL_ITEM.test(line) && !UL_ITEM.test(line);
            const pattern = ordered ? OL_ITEM : UL_ITEM;
            const items = [];
            while (i < lines.length && pattern.test(lines[i])) {
                items.push(lines[i].match(pattern)[1]);
                i += 1;
            }
            const ListTag = ordered ? 'ol' : 'ul';
            blocks.push(
                <ListTag
                    key={key}
                    className={`my-5 space-y-2 pl-6 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-slate-500`}
                >
                    {items.map((item, n) => (
                        <li key={n} className="pl-1">
                            {renderInline(item)}
                        </li>
                    ))}
                </ListTag>
            );
            continue;
        }

        const para = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !HEADING.test(lines[i]) &&
            !lines[i].trim().startsWith('```') &&
            !lines[i].trimStart().startsWith('>') &&
            !UL_ITEM.test(lines[i]) &&
            !OL_ITEM.test(lines[i]) &&
            !RULE.test(lines[i])
        ) {
            para.push(lines[i].trim());
            i += 1;
        }
        blocks.push(
            <p key={key} className="my-5">
                {renderInline(para.join(' '))}
            </p>
        );
    }

    return blocks;
}
