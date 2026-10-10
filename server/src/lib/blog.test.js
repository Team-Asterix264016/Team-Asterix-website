import test from 'node:test';
import assert from 'node:assert/strict';
import { readMinutes, slugify, parsePostFile, toListItem } from './blog.js';

test('readMinutes rounds up at 200 words and never drops below one', () => {
    assert.equal(readMinutes(''), 1);
    assert.equal(readMinutes('word '.repeat(200)), 1);
    assert.equal(readMinutes('word '.repeat(201)), 2);
});

test('readMinutes ignores fenced code and Markdown punctuation', () => {
    const code = '```\n' + 'token '.repeat(1000) + '\n```';
    assert.equal(readMinutes(`## Title\n\n${code}\n\n**bold** text`), 1);
});

test('slugify keeps a-z0-9 runs joined by single hyphens', () => {
    assert.equal(slugify('  Building India’s First Autonomous Buggy! '), 'building-india-s-first-autonomous-buggy');
    assert.equal(slugify('Café --- Déjà vu'), 'cafe-deja-vu');
    assert.equal(slugify('***'), '');
});

test('parsePostFile reads front matter and body', () => {
    const post = parsePostFile(
        '---\r\ntitle: Drive-by-wire: the rig\r\ntags: autonomy, hardware ,\r\ncover: https://x.test/c.jpg\r\n---\r\n## Hello\r\nBody.\r\n'
    );
    assert.equal(post.title, 'Drive-by-wire: the rig');
    assert.equal(post.slug, 'drive-by-wire-the-rig');
    assert.deepEqual(post.tags, ['autonomy', 'hardware']);
    assert.equal(post.coverImage, 'https://x.test/c.jpg');
    assert.equal(post.author, 'Team Asterix');
    assert.equal(post.body, '## Hello\nBody.');
});

test('parsePostFile rejects files without front matter or title', () => {
    assert.throws(() => parsePostFile('## No front matter'), /front matter/);
    assert.throws(() => parsePostFile('---\nslug: x\n---\nbody'), /title/);
});

test('toListItem leaves the body out', () => {
    const item = toListItem({ slug: 's', title: 'T', body: 'word '.repeat(450), status: 'published' });
    assert.equal(item.body, undefined);
    assert.equal(item.readMinutes, 3);
});
