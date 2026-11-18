import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopSession from '../models/WorkshopSession.js';
import SiteConfig from '../models/SiteConfig.js';
import { WORKSHOP_TRACKS } from '../config/workshopPackages.js';
import { resolveMongoDbName } from '../db/mongodb.js';
import { sessionIsoDate } from '../config/sessionDates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
}

const dbName = resolveMongoDbName(uri);

async function run() {
    try {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });
    } catch {
        await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });
    }

    console.log(`Connected to MongoDB (database: "${mongoose.connection.name}").`);

    const swTrack = WORKSHOP_TRACKS.software;
    const scheduleItems = swTrack.schedule;

    console.log('\n--- 1. Synchronizing WorkshopSession Collection for Software Track ---');
    // Ensure all catchups, holidays and removed complimentary sessions are cleaned from WorkshopSession
    const catchupKeys = [
        'software|sch-sw-cu1',
        'software|sch-sw-cu2',
        'software|sch-sw-cu3',
        'software|sch-sw-cu4',
        'software|sch-sw-cu5',
        'software|sch-sw-h1',
        'software|sch-sw-h2',
        'powertrain|sch-pt-c1',
        'powertrain|sch-pt-c2'
    ];
    const removedSessions = await WorkshopSession.deleteMany({
        $or: [
            { sessionKey: { $in: catchupKeys } },
            { track: { $in: ['software', 'powertrain'] }, type: { $in: ['catchup', 'complimentary'] } }
        ]
    });
    console.log(`Removed ${removedSessions.deletedCount} catchup/complimentary session rows from WorkshopSession across all tracks.`);

    // Upsert all official software sessions
    for (let idx = 0; idx < scheduleItems.length; idx++) {
        const item = scheduleItems[idx];
        const sessionKey = `software|${item.id}`;
        const isoDate = sessionIsoDate(item.date, swTrack);
        const sessionNumMatch = item.id.match(/-(\d+)$/);
        const sessionNumber = sessionNumMatch ? parseInt(sessionNumMatch[1], 10) : idx;

        const doc = {
            sessionKey,
            track: 'software',
            scheduleId: item.id,
            sessionNumber,
            label: item.label,
            title: item.title,
            date: isoDate,
            type: item.type || 'lecture',
            countsForAttendance: true,
            status: 'conducted'
        };

        await WorkshopSession.findOneAndUpdate(
            { sessionKey },
            { $set: doc },
            { upsert: true, new: true }
        );
        console.log(`  ✓ Synced session: ${sessionKey} (${item.date}) -> "${item.title}"`);
    }

    console.log('\n--- 2. Synchronizing SiteConfig (workshop.tracks.software) ---');
    const siteConfig = await SiteConfig.findOne({ key: 'main' });
    if (siteConfig) {
        if (!siteConfig.workshop) siteConfig.workshop = {};
        if (!siteConfig.workshop.tracks) siteConfig.workshop.tracks = {};
        
        const existingSw = siteConfig.workshop.tracks.software || {};
        siteConfig.workshop.tracks.software = {
            ...existingSw,
            ...swTrack,
            schedule: scheduleItems
        };
        siteConfig.markModified('workshop.tracks.software');
        await siteConfig.save();
        console.log('  ✓ SiteConfig software schedule successfully updated.');
    } else {
        console.log('  ℹ No existing SiteConfig found with key="main". Will be initialized on startup.');
    }

    console.log('\n--- 3. Marking Pre-Workshop Session (sch-sw-0) Present for All Paid Candidates ---');
    const preWorkshopKey = 'software|sch-sw-0';
    const preWorkshopSessionId = 'software-s00-2026-10-06';
    const preWorkshopDate = '2026-10-06';
    const preWorkshopTopic = 'Pre-Workshop Session: Set Up Once, Build All Month';

    // Query paid registrations eligible for software
    const eligiblePaidCandidates = await WorkshopRegistration.find({
        status: 'paid',
        $or: [
            { tracksEnrolled: 'software' },
            { package: 'combo' },
            { package: 'software' }
        ]
    }).lean();

    console.log(`Found ${eligiblePaidCandidates.length} paid candidates eligible for Software Track.`);

    let creditedCount = 0;
    let alreadyPresentCount = 0;

    for (const cand of eligiblePaidCandidates) {
        // Check if attendance already recorded for this candidate for pre-workshop
        const existing = await WorkshopAttendance.findOne({
            track: 'software',
            $or: [
                { sessionKey: preWorkshopKey, registrationId: cand._id },
                { sessionKey: preWorkshopKey, rollNo: cand.rollNo },
                { sessionId: preWorkshopSessionId, rollNo: cand.rollNo }
            ]
        });

        if (existing) {
            alreadyPresentCount++;
            continue;
        }

        const deviceId = `preworkshop_credit_${cand.rollNo}_${cand._id.toString().slice(-6)}`;
        await WorkshopAttendance.create({
            registrationId: cand._id,
            rollNo: cand.rollNo,
            email: cand.email,
            name: cand.name,
            department: cand.department,
            year: cand.year,
            package: cand.package,
            track: 'software',
            sessionId: preWorkshopSessionId,
            sessionKey: preWorkshopKey,
            sessionNumber: 0,
            sessionDate: preWorkshopDate,
            sessionTopic: preWorkshopTopic,
            deviceId,
            ipAddress: '127.0.0.1',
            userAgent: 'Admin Pre-Workshop Auto Credit',
            verifiedBy: 'manual-admin',
            markedBy: 'admin',
            markedReason: 'All participants credited for online pre-workshop setup session',
            checkedInAt: new Date('2026-10-06T18:00:00.000+05:30')
        });
        creditedCount++;
    }

    console.log(`  ✓ Credited ${creditedCount} candidate(s) as PRESENT.`);
    console.log(`  ✓ ${alreadyPresentCount} candidate(s) were already marked present.`);

    console.log('\n--- 4. Verification of Denominator and Weighted Total ---');
    const softwareConducted = await WorkshopSession.find({
        track: 'software',
        status: 'conducted',
        countsForAttendance: true
    }).lean();

    console.log(`Total conducted & counted sessions in DB: ${softwareConducted.length}`);
    const weightsByDate = { '2026-11-14': 0.5, '2026-11-15': 0.5 };
    const totalWeight = softwareConducted.reduce((sum, s) => {
        const w = weightsByDate[s.date] || 1;
        return sum + w;
    }, 0);
    console.log(`Total weighted credits: ${totalWeight.toFixed(1)} / 12.0 expected`);

    await mongoose.disconnect();
    console.log('\n✅ Software workshop schedule update & attendance crediting complete!');
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
