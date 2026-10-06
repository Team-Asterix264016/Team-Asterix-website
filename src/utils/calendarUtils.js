/**
 * Builds one combined .ics calendar file for Team Asterix workshop sessions.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const IST_OFFSET_MINUTES = 5 * 60 + 30;

/* Session dates are written like "13 Oct" with the year implied by the track's startDate;
   ISO "2026-10-13" is accepted too. Returns null when the date can't be read. */
function parseSessionDate(dateStr, fallbackYear) {
    const text = String(dateStr || '').trim();
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return { year: +iso[1], month: +iso[2] - 1, day: +iso[3] };

    const short = text.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/i);
    if (!short) return null;
    const month = MONTHS.indexOf(short[2].toLowerCase());
    if (month === -1) return null;
    return { year: short[3] ? +short[3] : fallbackYear, month, day: +short[1] };
}

function extractClockTimes(text) {
    return [...String(text || '').matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)].slice(0, 2).map((m) => {
        let hours = +m[1] % 12;
        if (m[3].toUpperCase() === 'PM') hours += 12;
        return hours * 60 + +m[2];
    });
}

const SEGMENT_FOR_TYPE = { catchup: /catch/, expert: /expert|industry/, online: /online|pre/ };

/* Start/end minutes-after-midnight (IST) for a session, from its own `time` ("5:10 PM – 6:50 PM") or the
   matching part of the track timing ("Core: 5:10 PM – 6:50 PM · Sun Catch-up: 6:00 PM"). Returns null
   when no time is published for that kind of session, so it becomes an all-day event, not a guess. */
function resolveSessionMinutes(item, track) {
    let times = extractClockTimes(item.time);
    if (!times.length) {
        const segments = String(track?.timing || '')
            .split('·')
            .map((part) => ({ label: (part.match(/^\s*([^\d:]+):/)?.[1] || '').toLowerCase(), times: extractClockTimes(part) }))
            .filter((seg) => seg.times.length);
        const wanted = SEGMENT_FOR_TYPE[item.type];
        const segment = wanted
            ? segments.find((seg) => wanted.test(seg.label))
            : segments.find((seg) => /core/.test(seg.label)) || segments.find((seg) => !seg.label) || segments[0];
        times = segment?.times || [];
    }
    if (!times.length) return null;
    // Catch-ups only publish a start time; block an hour so the slot is visible.
    return { start: times[0], end: times[1] > times[0] ? times[1] : times[0] + 60 };
}

const pad = (n) => String(n).padStart(2, '0');

function utcStamp(date) {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
}

function istToUtcStamp({ year, month, day }, minutes) {
    return utcStamp(new Date(Date.UTC(year, month, day, 0, minutes - IST_OFFSET_MINUTES)));
}

function dateStamp({ year, month, day }, addDays = 0) {
    const d = new Date(Date.UTC(year, month, day + addDays));
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

const escapeText = (value) =>
    String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');

const utf8 = new TextEncoder();

// RFC 5545 caps content lines at 75 octets (UTF-8 bytes, not characters); continuation lines start with
// a space, which counts toward that limit. Splits on code points so multi-byte characters stay whole.
function foldLine(line) {
    const parts = [];
    let current = '';
    let bytes = 0;
    for (const char of line) {
        const size = utf8.encode(char).length;
        const limit = parts.length ? 74 : 75;
        if (bytes + size > limit) {
            parts.push(current);
            current = '';
            bytes = 0;
        }
        current += char;
        bytes += size;
    }
    parts.push(current);
    return parts.join('\r\n ');
}

/**
 * Downloads a single .ics with every non-holiday session.
 * @param items sessions: { id, track, date, type, title, instructor, venue, project, time? }
 * @param calendarName shown as the calendar name and used for the file name
 * @param tracksById track configs keyed by id, read for `timing` and `startDate`
 */
export function downloadAllIcsFile(items, calendarName = 'Team Asterix Workshop', tracksById = {}) {
    const stamp = utcStamp(new Date());
    const events = [];

    (items || []).forEach((item, index) => {
        if (item.type === 'holiday') return;
        const track = tracksById[item.track] || {};
        const fallbackYear = parseInt(String(track.startDate || '').slice(0, 4), 10) || new Date().getFullYear();
        const date = parseSessionDate(item.date, fallbackYear);
        if (!date) return;

        const minutes = resolveSessionMinutes(item, track);
        const when = minutes
            ? [`DTSTART:${istToUtcStamp(date, minutes.start)}`, `DTEND:${istToUtcStamp(date, minutes.end)}`]
            : [`DTSTART;VALUE=DATE:${dateStamp(date)}`, `DTEND;VALUE=DATE:${dateStamp(date, 1)}`];
        const description = [item.instructor && item.instructor !== '-' ? `Handled by: ${item.instructor}` : '', item.project ? `Milestone: ${item.project}` : '']
            .filter(Boolean)
            .join('\n');

        events.push(
            'BEGIN:VEVENT',
            `UID:${item.track || 'workshop'}-${item.id || index}@team-asterix-workshop`,
            `DTSTAMP:${stamp}`,
            ...when,
            `SUMMARY:${escapeText(`Team Asterix ${track.name || 'Workshop'}: ${item.title}`)}`,
            ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
            ...(item.venue && item.venue !== '-' ? [`LOCATION:${escapeText(item.venue)}`] : []),
            'STATUS:CONFIRMED',
            'END:VEVENT'
        );
    });

    if (!events.length) return;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Team Asterix//Workshop Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(calendarName)}`,
        'X-WR-TIMEZONE:Asia/Kolkata',
        ...events,
        'END:VCALENDAR'
    ]
        .map(foldLine)
        .join('\r\n');

    const blob = new Blob([icsContent + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${calendarName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_schedule.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
