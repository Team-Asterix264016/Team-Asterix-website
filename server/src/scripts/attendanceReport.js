import dotenv from 'dotenv'; import path from 'path'; import { fileURLToPath } from 'url'; import mongoose from 'mongoose';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import WorkshopAttendance from '../models/WorkshopAttendance.js';
import WorkshopSession from '../models/WorkshopSession.js';
import { resolveMongoDbName } from '../db/mongodb.js';
import { summarizeAttendance, CERTIFICATE_THRESHOLD } from '../lib/workshopSessions.js';
/*
 * Read-only. Reports every paid candidate's attendance against the sessions
 * marked "conducted" in WorkshopSession, per track, at the certificate
 * threshold. Run it before and after changing session statuses to see who the
 * change moves.
 *
 * Usage: node src/scripts/attendanceReport.js
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url)); dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const uri = process.env.MONGODB_URI; await mongoose.connect(uri, { dbName: resolveMongoDbName(uri), serverSelectionTimeoutMS: 15000, tlsAllowInvalidCertificates: true });

const sessions = await WorkshopSession.find({}).lean();
const regs = await WorkshopRegistration.find({ status: 'paid' }).lean();
const atts = await WorkshopAttendance.find({}).lean();
const byReg = new Map();
for (const a of atts) {
  for (const k of [String(a.registrationId), String(a.rollNo).toUpperCase(), String(a.email).toLowerCase()]) {
    if (!byReg.has(k)) byReg.set(k, []); byReg.get(k).push(a);
  }
}
const conducted = sessions.filter(s=>s.status==='conducted'&&s.countsForAttendance);
console.log(`conducted+counted sessions: software=${conducted.filter(s=>s.track==='software').length} powertrain=${conducted.filter(s=>s.track==='powertrain').length}`);
const buckets = { pass:0, fail:0 };
const dist = {};
const perTrackFail = { software:0, powertrain:0 };
const rows=[];
for (const r of regs) {
  const tracks = (r.tracksEnrolled?.length ? r.tracksEnrolled : (r.package==='combo'?['software','powertrain']:[r.package]));
  const seen = new Map();
  for (const k of [String(r._id), String(r.rollNo).toUpperCase(), String(r.email).toLowerCase()]) for (const a of (byReg.get(k)||[])) seen.set(String(a._id),a);
  const { perTrack } = summarizeAttendance({ sessions, attendanceRecords:[...seen.values()], tracksEnrolled: tracks });
  const all = Object.values(perTrack);
  const allPass = all.every(t=>t.isEligibleForCertificate);
  if (allPass) {
    buckets.pass++;
  } else {
    buckets.fail++;
  }
  for (const t of all) { if(!t.isEligibleForCertificate) perTrackFail[t.track]++; const b=Math.floor(t.attendancePercentage/10)*10; dist[b]=(dist[b]||0)+1; }
  if (!allPass) rows.push(`${r.rollNo} ${r.name.slice(0,22).padEnd(22)} ${all.map(t=>`${t.track}:${t.totalPresent}/${t.totalConducted}=${t.attendancePercentage}%`).join('  ')}`);
}
console.log(`\nthreshold=${CERTIFICATE_THRESHOLD}%  paid=${regs.length}`);
console.log(`eligible (all enrolled tracks pass): ${buckets.pass}`);
console.log(`NOT eligible in >=1 track:           ${buckets.fail}`);
console.log(`per-track failures: software=${perTrackFail.software} powertrain=${perTrackFail.powertrain}`);
console.log(`\npercentage distribution (per track-enrolment):`);
for (const b of Object.keys(dist).map(Number).sort((a,b)=>a-b)) console.log(`  ${String(b).padStart(3)}-${b+9}%: ${dist[b]}`);
console.log(`\n--- failing (first 30) ---`);
rows.slice(0,30).forEach(r=>console.log('  '+r));
console.log(`  ...and ${Math.max(0,rows.length-30)} more`);
await mongoose.disconnect();
