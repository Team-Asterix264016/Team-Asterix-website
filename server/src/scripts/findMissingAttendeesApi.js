/*
 * Read-only audit over the live API, for when the MongoDB connection string is
 * not at hand. The deployed backend already holds it, so an admin login is
 * enough.
 *
 * Attendance comes from GET /api/workshop/attendance/export-csv, which iterates
 * the raw WorkshopAttendance rows and falls back to each row's own snapshot of
 * the participant when no registration matches. That is what makes the lost
 * people visible: /records and /export build their roster from paid
 * registrations instead, so anyone whose registration is gone silently
 * disappears from those two.
 *
 * Usage:
 *   ASTERIX_ADMIN_USER=... ASTERIX_ADMIN_PASS=... node src/scripts/findMissingAttendeesApi.js [maxSession]
 *
 * Optional: API_URL to point at a different backend (default is production).
 */

const API = (process.env.API_URL || 'https://asterix-backend.onrender.com').replace(/\/$/, '');
const maxSession = parseInt(process.argv[2], 10) || 5;
const TRACKS = ['software', 'powertrain'];

const key = (value) => String(value || '').trim().toUpperCase();

// Render's free tier sleeps, so the first call can take ~60s to wake the host.
async function call(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        signal: AbortSignal.timeout(120000)
    });
    if (!res.ok) {
        throw new Error(`${options.method || 'GET'} ${path} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    return res;
}

/* Minimal parser for the quoted CSV these endpoints emit. Names contain commas,
   so splitting on commas alone mangles rows. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') quoted = false;
            else field += ch;
            continue;
        }
        if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (ch !== '\r') field += ch;
    }
    if (field || row.length > 0) { row.push(field); rows.push(row); }

    const header = rows.shift() || [];
    return rows
        .filter(r => r.some(cell => cell.trim() !== ''))
        .map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

async function main() {
    const username = process.env.ASTERIX_ADMIN_USER;
    const password = process.env.ASTERIX_ADMIN_PASS;
    if (!username || !password) {
        console.error('Set ASTERIX_ADMIN_USER and ASTERIX_ADMIN_PASS, then run again.');
        process.exit(1);
    }

    console.log(`Backend: ${API}`);
    const health = await (await call('/api/health')).json();
    console.log(`Health:  ${health.status}, database connected: ${health.database?.connected}\n`);

    const login = await (await call('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })).json();
    const auth = { Authorization: `Bearer ${login.token}` };
    console.log(`Signed in as ${login.user?.username} (${login.user?.accessLevel})\n`);

    // Attendance rows, per track and session, keyed by roll number.
    const attendees = new Map();
    for (const track of TRACKS) {
        for (let session = 1; session <= maxSession; session++) {
            const csv = await (await call(
                `/api/workshop/attendance/export-csv?track=${track}&sessionNumber=${session}`,
                { headers: auth }
            )).text();
            const rows = parseCsv(csv);
            console.log(`${track} session ${session}: ${rows.length} check-in(s)`);

            for (const row of rows) {
                const id = key(row['Roll No']);
                if (!id) continue;
                if (!attendees.has(id)) {
                    attendees.set(id, {
                        rollNo: row['Roll No'],
                        name: row['Name'],
                        department: row['Department'],
                        year: row['Year'],
                        track: row['Track'],
                        sessions: new Set()
                    });
                }
                attendees.get(id).sessions.add(Number(row['Session Number']) || session);
            }
        }
    }

    const { registrations = [] } = await (await call('/api/workshop/registrations?status=all', { headers: auth })).json();
    const registered = new Set(registrations.map(r => key(r.rollNo)));

    const missing = [...attendees.values()].filter(p => !registered.has(key(p.rollNo)));

    console.log(`\nSessions audited:        1 to ${maxSession}`);
    console.log(`Distinct attendees:      ${attendees.size}`);
    console.log(`Registrations on file:   ${registrations.length}`);
    console.log(`Attendees with no registration: ${missing.length}\n`);

    if (missing.length === 0) {
        console.log('Every attendee of these sessions still has a registration document.');
    }

    for (const person of missing) {
        const sessions = [...person.sessions].sort((a, b) => a - b).join(', ');
        console.log('----------------------------------------');
        console.log(`Roll No:     ${person.rollNo}`);
        console.log(`Name:        ${person.name || '(attendance row carried no name)'}`);
        console.log(`Dept / Year: ${person.department || '?'} (${person.year || '?'})`);
        console.log(`Track:       ${person.track}`);
        console.log(`Sessions:    ${sessions}`);
    }

    /* The recycle bin (DeletedRecord) has no HTTP route, so whether a lost
       registration is restorable can only be answered with a direct database
       connection and src/scripts/findMissingAttendees.js. */
    console.log('\nNothing was written. Recycle-bin recoverability needs MONGODB_URI.');
}

main().catch(err => {
    console.error(`Audit failed: ${err.message}`);
    process.exit(1);
});
