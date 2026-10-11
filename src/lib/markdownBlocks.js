/* Parses the Markdown subset Horizon posts are written in into a flat list of
   typed blocks. The article, its table of contents, listen mode and the admin
   preview all read this one list, so they always agree on what a post holds.

   Blocks:
     { type: 'heading', level: 2 | 3 | 4, text, id }
     { type: 'paragraph', text }
     { type: 'list', ordered, items: [text] }
     { type: 'quote', text }
     { type: 'code', text }
     { type: 'figure', alt, url }
     { type: 'rule' }
     { type: 'callout', variant: 'note' | 'tip' | 'warning', title, blocks }
     { type: 'poll', key, question, options }
     { type: 'poll-error', question, reason }   (shown only in the editor preview)

   Written as
     :::poll Which sensor should we add next?     :::tip Optional title
     - LiDAR                                      Callout text, any Markdown.
     - Radar                                      :::
     :::
   Poll rules mirror parsePolls in server/src/lib/engagement.js, which decides
   which polls accept votes; markdownBlocks.test.js checks the two agree. */

export const CALLOUT_VARIANTS = ['note', 'tip', 'warning'];

const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const LONE_IMAGE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const POLL_OPEN = /^:::poll\s+(.+?)\s*$/;
const POLL_OPTION = /^\s*[-*]\s+(.+?)\s*$/;
const CALLOUT_OPEN = new RegExp(`^:::(${CALLOUT_VARIANTS.join('|')})(?:\\s+(.*?))?\\s*$`);
const DIRECTIVE = /^:::(poll|note|tip|warning)\b/;
const MAX_POLL_OPTIONS = 8;

export function pollKey(question) {
    return String(question || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

// Heading text without its inline Markdown, for anchors and listen mode.
export function plainText(text) {
    return String(text || '')
        .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
        .replace(/[`*_]/g, '')
        .trim();
}

function anchorFor(text, used) {
    const base =
        plainText(text)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'section';
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
}

const isClose = (line) => line.trim() === ':::';

function parseLines(lines, ctx) {
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            i += 1;
            continue;
        }

        if (line.trim().startsWith('```')) {
            const code = [];
            i += 1;
            while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
            i += 1;
            blocks.push({ type: 'code', text: code.join('\n') });
            continue;
        }

        const poll = line.match(POLL_OPEN);
        if (poll) {
            const options = [];
            i += 1;
            for (; i < lines.length && !isClose(lines[i]); i += 1) {
                const option = lines[i].match(POLL_OPTION);
                if (option) options.push(option[1].slice(0, 120));
            }
            i += 1;
            const question = poll[1];
            const key = pollKey(question);
            if (!key)
                blocks.push({
                    type: 'poll-error',
                    question,
                    reason: 'The question needs letters or digits.'
                });
            else if (options.length < 2) {
                blocks.push({
                    type: 'poll-error',
                    question,
                    reason: 'A poll needs at least two "- option" lines.'
                });
            } else if (ctx.pollKeys.has(key)) {
                blocks.push({
                    type: 'poll-error',
                    question,
                    reason: 'Another poll in this post asks the same question.'
                });
            } else {
                ctx.pollKeys.add(key);
                blocks.push({ type: 'poll', key, question, options: options.slice(0, MAX_POLL_OPTIONS) });
            }
            continue;
        }

        const callout = line.match(CALLOUT_OPEN);
        if (callout) {
            const inner = [];
            i += 1;
            while (i < lines.length && !isClose(lines[i])) inner.push(lines[i++]);
            i += 1;
            blocks.push({
                type: 'callout',
                variant: callout[1],
                title: (callout[2] || '').trim(),
                blocks: parseLines(inner, ctx)
            });
            continue;
        }

        const heading = line.match(HEADING);
        if (heading) {
            const level = Math.max(2, heading[1].length);
            blocks.push({ type: 'heading', level, text: heading[2], id: anchorFor(heading[2], ctx.anchors) });
            i += 1;
            continue;
        }

        if (RULE.test(line)) {
            blocks.push({ type: 'rule' });
            i += 1;
            continue;
        }

        const image = line.match(LONE_IMAGE);
        if (image) {
            blocks.push({ type: 'figure', alt: image[1], url: image[2] });
            i += 1;
            continue;
        }

        if (line.trimStart().startsWith('>')) {
            const quote = [];
            while (i < lines.length && lines[i].trimStart().startsWith('>')) {
                quote.push(lines[i].trimStart().replace(/^>\s?/, ''));
                i += 1;
            }
            blocks.push({ type: 'quote', text: quote.join(' ') });
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
            blocks.push({ type: 'list', ordered, items });
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
            !RULE.test(lines[i]) &&
            !DIRECTIVE.test(lines[i])
        ) {
            para.push(lines[i].trim());
            i += 1;
        }
        if (para.length === 0) {
            // A line no block claims, such as a stray ":::"; keep it as text.
            para.push(lines[i].trim());
            i += 1;
        }
        blocks.push({ type: 'paragraph', text: para.join(' ') });
    }

    return blocks;
}

export function parseBlocks(markdown) {
    const lines = String(markdown || '')
        .replace(/\r\n/g, '\n')
        .split('\n');
    return parseLines(lines, { anchors: new Map(), pollKeys: new Set() });
}

// The section headings a table of contents lists.
export const outline = (blocks) => blocks.filter((b) => b.type === 'heading' && b.level === 2);

// What listen mode reads aloud, one entry per spoken chunk.
export function spokenText(blocks) {
    const out = [];
    for (const block of blocks) {
        if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote') {
            out.push(plainText(block.text));
        } else if (block.type === 'list') {
            out.push(...block.items.map(plainText));
        } else if (block.type === 'callout') {
            if (block.title) out.push(plainText(block.title));
            out.push(...spokenText(block.blocks));
        } else if (block.type === 'poll') {
            out.push(`Poll: ${plainText(block.question)}`);
        }
    }
    return out.filter(Boolean);
}
