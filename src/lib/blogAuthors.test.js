import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuthors, formatAuthorNames, formatAuthorRoles } from './blogAuthors.js';

test('normalizeAuthors defaults to Team Asterix when empty', () => {
    assert.deepEqual(normalizeAuthors(null), [{ name: 'Team Asterix', role: '' }]);
    assert.deepEqual(normalizeAuthors({}), [{ name: 'Team Asterix', role: '' }]);
});

test('normalizeAuthors falls back to legacy author and authorRole', () => {
    assert.deepEqual(normalizeAuthors({ author: 'Ratheeswar S', authorRole: 'Lead' }), [
        { name: 'Ratheeswar S', role: 'Lead' }
    ]);
});

test('normalizeAuthors handles authors array', () => {
    const post = {
        authors: [
            { name: 'Arya', role: 'Telemetry' },
            { name: 'Ratheeswar', role: 'Perception' }
        ]
    };
    assert.deepEqual(normalizeAuthors(post), [
        { name: 'Arya', role: 'Telemetry' },
        { name: 'Ratheeswar', role: 'Perception' }
    ]);
});

test('formatAuthorNames formats single, pair, and multiple authors', () => {
    assert.equal(formatAuthorNames({ author: 'Alice' }), 'Alice');
    assert.equal(
        formatAuthorNames({
            authors: [{ name: 'Alice' }, { name: 'Bob' }]
        }),
        'Alice & Bob'
    );
    assert.equal(
        formatAuthorNames({
            authors: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]
        }),
        'Alice, Bob & Charlie'
    );
});

test('formatAuthorRoles joins roles with bullet separator', () => {
    assert.equal(
        formatAuthorRoles({
            authors: [
                { name: 'Alice', role: 'Lead' },
                { name: 'Bob', role: 'Chassis' }
            ]
        }),
        'Lead · Chassis'
    );
});
