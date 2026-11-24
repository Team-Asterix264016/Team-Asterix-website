import test from 'node:test';
import assert from 'node:assert/strict';
import { isSuperAdminAdmin1 } from './workshopProjects.js';

test('isSuperAdminAdmin1 identifies admin1 case-insensitively', () => {
    assert.equal(isSuperAdminAdmin1({ username: 'admin1' }), true);
    assert.equal(isSuperAdminAdmin1({ username: 'Admin1' }), true);
    assert.equal(isSuperAdminAdmin1({ username: 'ADMIN1' }), true);
    assert.equal(isSuperAdminAdmin1({ username: ' admin1 ' }), true);

    assert.equal(isSuperAdminAdmin1({ username: 'admin2' }), false);
    assert.equal(isSuperAdminAdmin1({ username: 'lead_perception' }), false);
    assert.equal(isSuperAdminAdmin1({ username: 'superadmin' }), false);
    assert.equal(isSuperAdminAdmin1(null), false);
    assert.equal(isSuperAdminAdmin1({}), false);
});

test('link open logging records admin account and timestamp', () => {
    const submission = {
        driveLink: 'https://drive.google.com/test',
        openCount: 0,
        linkOpens: []
    };

    const adminUser = { username: 'admin1', name: 'Super Admin' };
    const now = new Date();

    const openEntry = {
        adminUsername: adminUser.username,
        adminName: adminUser.name,
        openedAt: now
    };

    submission.openCount += 1;
    submission.linkOpens.push(openEntry);

    assert.equal(submission.openCount, 1);
    assert.equal(submission.linkOpens.length, 1);
    assert.equal(submission.linkOpens[0].adminUsername, 'admin1');
    assert.equal(submission.linkOpens[0].adminName, 'Super Admin');
    assert.equal(submission.linkOpens[0].openedAt, now);
});

test('non-admin1 accounts are stripped of openCount and linkOpens audit data', () => {
    const rawSubmission = {
        _id: 'sub123',
        registrationId: 'reg123',
        name: 'Student Name',
        driveLink: 'https://drive.google.com/test',
        openCount: 3,
        linkOpens: [
            { adminUsername: 'lead1', adminName: 'Lead 1', openedAt: new Date() },
            { adminUsername: 'admin1', adminName: 'Super Admin', openedAt: new Date() }
        ]
    };

    // For admin1:
    const admin1User = { username: 'admin1' };
    const isSuper1 = isSuperAdminAdmin1(admin1User);
    const superPayload = isSuper1 ? rawSubmission : (({ openCount: _oc, linkOpens: _lo, ...rest }) => rest)(rawSubmission);
    assert.equal(superPayload.openCount, 3);
    assert.equal(superPayload.linkOpens.length, 2);

    // For another admin (e.g. admin2):
    const otherAdmin = { username: 'admin2' };
    const isSuper2 = isSuperAdminAdmin1(otherAdmin);
    const nonSuperPayload = isSuper2 ? rawSubmission : (({ openCount: _oc, linkOpens: _lo, ...rest }) => rest)(rawSubmission);
    assert.equal(nonSuperPayload.openCount, undefined);
    assert.equal(nonSuperPayload.linkOpens, undefined);
    assert.equal(nonSuperPayload.driveLink, 'https://drive.google.com/test');
    assert.equal(nonSuperPayload.name, 'Student Name');
});
