import test from 'node:test';
import assert from 'node:assert/strict';
import { readMinutes, slugify, parsePostFile, toListItem, parseBlogBody } from './blog.js';

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

test('parseBlogBody builds a document and derives the slug from the title', () => {
    const { doc, error } = parseBlogBody({
        title: '  Our First Race  ',
        body: 'Line one\r\nLine two',
        tags: '#Autonomy, hardware, autonomy',
        coverImage: 'https://ik.imagekit.io/x/cover.jpg',
        coverPosition: '40% 20%',
        featured: true
    });
    assert.equal(error, undefined);
    assert.equal(doc.title, 'Our First Race');
    assert.equal(doc.slug, 'our-first-race');
    assert.equal(doc.body, 'Line one\nLine two');
    assert.deepEqual(doc.tags, ['Autonomy', 'hardware']);
    assert.equal(doc.author, 'Team Asterix');
    assert.equal(doc.coverPosition, '40% 20%');
    assert.equal(doc.featured, true);
});

test('parseBlogBody rejects missing titles, unsafe covers and oversize fields', () => {
    assert.equal(parseBlogBody({ title: '   ' }).field, 'title');
    assert.equal(parseBlogBody({ title: 'T', coverImage: 'javascript:alert(1)' }).field, 'coverImage');
    assert.equal(parseBlogBody({ title: 'T', coverImage: '//evil.test/x.png' }).field, 'coverImage');
    assert.equal(parseBlogBody({ title: 'x'.repeat(201) }).field, 'title');
    assert.equal(parseBlogBody({ title: 'T', tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }).field, 'tags');
    assert.equal(parseBlogBody({ title: '!!!', slug: '***' }).field, 'slug');
});

test('parseBlogBody keeps an explicit slug, defaults bad cover positions, and only takes boolean true for featured', () => {
    const { doc } = parseBlogBody({ title: 'T', slug: 'My Custom Slug', coverPosition: 'center; x', featured: 'true' });
    assert.equal(doc.slug, 'my-custom-slug');
    assert.equal(doc.coverPosition, '50% 50%');
    assert.equal(doc.featured, false);
});
