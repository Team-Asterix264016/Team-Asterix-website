import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateSearchConditions, normalizeRollNo, normalizePhone, formatReceiptNo } from './participantIdentity.js';

/* Stands in for Mongo's $or: true when any condition matches the document.
   Conditions are either an exact value or a RegExp, which is how they reach
   the driver. */
function matches(conditions, doc) {
    return conditions.some(cond =>
        Object.entries(cond).every(([field, expected]) => {
            const actual = doc[field];
            if (actual === undefined || actual === null) return false;
            if (expected instanceof RegExp) return expected.test(String(actual));
            if (expected && typeof expected === 'object' && '$nin' in expected) {
                return !expected.$nin.includes(actual);
            }
            return String(actual) === String(expected);
        })
    );
}

const candidate = {
    name: 'Asha R',
    rollNo: '26M125',
    email: '26m125@psgitech.ac.in',
    phone: '9876543210',
    receiptNo: 'AST-WS-0028'
};

test('roll number matches in any case, with stray spaces', () => {
    for (const term of ['26M125', '26m125', ' 26m125 ', '26 M 125']) {
        assert.ok(matches(buildCandidateSearchConditions(term), candidate), `failed for "${term}"`);
    }
});

test('email matches exactly, in any case, and by roll-number prefix', () => {
    for (const term of ['26m125@psgitech.ac.in', '26M125@PSGItech.ac.in', '26m125']) {
        assert.ok(matches(buildCandidateSearchConditions(term), candidate), `failed for "${term}"`);
    }
});

test('receipt number matches in full form and as a bare sequence number', () => {
    // Regressed once: the regex literals held \\d, which matches a literal
    // backslash, so no receipt number was ever recognised.
    for (const term of ['AST-WS-0028', 'ast-ws-0028', '0028', '28']) {
        assert.ok(matches(buildCandidateSearchConditions(term), candidate), `failed for "${term}"`);
    }
});

test('phone matches however it is typed or stored', () => {
    for (const term of ['9876543210', '+91 98765 43210', '+919876543210', '098765-43210']) {
        assert.ok(matches(buildCandidateSearchConditions(term), candidate), `failed for "${term}"`);
    }
    const spacedInDb = { ...candidate, phone: '+91 98765 43210' };
    assert.ok(matches(buildCandidateSearchConditions('9876543210'), spacedInDb));
});

test('a term belonging to nobody matches nobody', () => {
    for (const term of ['27X999', 'someone@else.com', '9999999999', 'AST-WS-9999']) {
        assert.ok(!matches(buildCandidateSearchConditions(term), candidate), `wrongly matched "${term}"`);
    }
});

test('an empty term produces no conditions, so it can never match everyone', () => {
    assert.deepEqual(buildCandidateSearchConditions(''), []);
    assert.deepEqual(buildCandidateSearchConditions('   '), []);
    assert.deepEqual(buildCandidateSearchConditions(null), []);
});

test('regex metacharacters in a term are escaped, not interpreted', () => {
    assert.ok(!matches(buildCandidateSearchConditions('.*'), candidate));
    assert.ok(!matches(buildCandidateSearchConditions('26M12.'), candidate));
});

test('normalizers keep their shape', () => {
    assert.equal(normalizeRollNo(' 26 m 125 '), '26M125');
    assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
    assert.equal(formatReceiptNo(28), 'AST-WS-0028');
});
