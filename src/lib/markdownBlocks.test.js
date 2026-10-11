import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBlocks, outline, spokenText } from './markdownBlocks.js';
import { parsePolls } from '../../server/src/lib/engagement.js';

const pollsOf = (blocks) =>
    blocks.flatMap((b) => (b.type === 'poll' ? [b] : b.type === 'callout' ? pollsOf(b.blocks) : []));

test('the reader shows exactly the polls the server accepts votes for', () => {
    const bodies = [
        ':::poll Which sensor next?\n- LiDAR\n- Radar\n:::',
        ':::poll  Spaces  around \n* One\n* Two\n* Three\n:::\n\nText',
        ':::poll Only one option\n- Lonely\n:::',
        ':::poll Same?\n- a\n- b\n:::\n\n:::poll same\n- c\n- d\n:::',
        ':::poll Unclosed\n- a\n- b\n\nmore text',
        `:::poll Many\n${Array.from({ length: 10 }, (_, n) => `- option ${n}`).join('\n')}\n:::`,
        `:::poll Long\n- ${'x'.repeat(200)}\n- y\n:::`,
        ':::poll ???\n- a\n- b\n:::',
        ':::tip Inside a callout\n:::poll Nested?\n- yes\n- no\n:::',
        '```\n:::poll In code\n- a\n- b\n:::\n```\n\n:::poll After code\n- a\n- b\n:::'
    ];
    for (const body of bodies) {
        const reader = pollsOf(parseBlocks(body)).map(({ key, question, options }) => ({
            key,
            question,
            options
        }));
        assert.deepEqual(reader, parsePolls(body), body);
    }
});

test('broken polls become editor warnings, not polls', () => {
    const blocks = parseBlocks(
        ':::poll Only one\n- a\n:::\n\n:::poll Ok?\n- a\n- b\n:::\n\n:::poll ok\n- c\n- d\n:::'
    );
    assert.deepEqual(
        blocks.map((b) => b.type),
        ['poll-error', 'poll', 'poll-error']
    );
});

test('callouts hold their own blocks and default to no title', () => {
    const [callout, after] = parseBlocks(':::warning Mind the voltage\nUse **gloves**.\n\n- one\n:::\nAfter');
    assert.equal(callout.type, 'callout');
    assert.equal(callout.variant, 'warning');
    assert.equal(callout.title, 'Mind the voltage');
    assert.deepEqual(
        callout.blocks.map((b) => b.type),
        ['paragraph', 'list']
    );
    assert.deepEqual(after, { type: 'paragraph', text: 'After' });
    assert.equal(parseBlocks(':::note\nx\n:::')[0].title, '');
});

test('headings get unique anchors and the outline lists the sections', () => {
    const blocks = parseBlocks(
        '# Intro\n\n## The **rig**\n\n### Detail\n\n## The rig\n\n## [Link](https://a.test) here'
    );
    assert.deepEqual(
        outline(blocks).map((h) => h.id),
        ['intro', 'the-rig', 'the-rig-2', 'link-here']
    );
});

test('a paragraph stops at a directive and a stray ::: stays as text', () => {
    assert.deepEqual(
        parseBlocks('Line one\n:::note\nboxed\n:::\n:::').map((b) => b.type),
        ['paragraph', 'callout', 'paragraph']
    );
    assert.deepEqual(parseBlocks(':::')[0], { type: 'paragraph', text: ':::' });
});

test('code fences keep their text untouched', () => {
    const [code] = parseBlocks('```\n:::poll Not a poll\n- a\n- b\n```');
    assert.deepEqual(code, { type: 'code', text: ':::poll Not a poll\n- a\n- b' });
});

test('listen mode reads prose and skips code and images', () => {
    const blocks = parseBlocks(
        '## Hello *world*\n\nSee [docs](https://a.test).\n\n```\nx = 1\n```\n\n![alt](https://a.test/i.png)\n\n- a\n- b'
    );
    assert.deepEqual(spokenText(blocks), ['Hello world', 'See docs.', 'a', 'b']);
});
