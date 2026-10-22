import test from 'node:test';
import assert from 'node:assert/strict';
import { pruneMissing } from './siteData.js';

/* Minimal stand-in for a Mongoose model. Only the reads the refusal paths
   need are implemented; deleteMany records the call so a test can assert that
   nothing was deleted. */
function fakeModel(docs) {
    const calls = [];
    return {
        calls,
        async countDocuments() { return docs.length; },
        find() {
            return { async lean() { return docs; } };
        },
        async deleteMany(filter) {
            calls.push(filter);
            return { deletedCount: docs.length };
        }
    };
}

const stored = Array.from({ length: 10 }, (_, i) => ({ _id: `oid${i}`, id: `gal-${i}` }));

test('a save carrying no items deletes nothing', async () => {
    // The wipe that started this: GET answers with empty arrays while Mongo is
    // disconnected, the dashboard saves that copy back, and every row that was
    // not in it used to be deleted.
    const Model = fakeModel(stored);
    const result = await pruneMissing(Model, 'GalleryItem', {}, [], { actor: 'test', label: 'gallery items' });

    assert.equal(result.pruned, 0);
    assert.equal(result.refused, true);
    assert.equal(result.stored, 10);
    assert.deepEqual(Model.calls, []);
});

test('a save that would remove most of the collection deletes nothing', async () => {
    const Model = fakeModel(stored);
    // Keeps 2 of 10, so 8 would go: far over the allowed share.
    const result = await pruneMissing(Model, 'GalleryItem', {}, ['gal-0', 'gal-1'], { actor: 'test', label: 'gallery items' });

    assert.equal(result.pruned, 0);
    assert.equal(result.refused, true);
    assert.equal(result.wouldDelete, 10);
    assert.deepEqual(Model.calls, []);
});

test('an empty collection is a no-op rather than an error', async () => {
    const Model = fakeModel([]);
    const result = await pruneMissing(Model, 'GalleryItem', {}, [], { actor: 'test', label: 'gallery items' });

    assert.equal(result.pruned, 0);
    assert.deepEqual(Model.calls, []);
});

test('a save matching everything stored deletes nothing', async () => {
    const Model = {
        ...fakeModel(stored),
        find() { return { async lean() { return []; } } }
    };
    const result = await pruneMissing(Model, 'GalleryItem', {}, stored.map(d => d.id), { actor: 'test', label: 'gallery items' });

    assert.equal(result.pruned, 0);
    assert.equal(result.refused, undefined);
});
