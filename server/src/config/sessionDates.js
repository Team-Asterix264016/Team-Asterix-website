/* Workshop schedules write session dates like "13 Oct" and leave the year to the track's
   startDate ("2026-10-06"). Shared by the API and the browser so both read dates the same way. */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Returns { year, month (0-based), day } or null. Accepts "13 Oct", "13 October 2026" and "2026-10-13".
export function parseSessionDate(dateStr, fallbackYear) {
    const text = String(dateStr || '').trim();
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) return { year: +iso[1], month: +iso[2] - 1, day: +iso[3] };

    const short = text.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/i);
    if (!short) return null;
    const month = MONTHS.indexOf(short[2].toLowerCase());
    if (month === -1) return null;
    return { year: short[3] ? +short[3] : fallbackYear, month, day: +short[1] };
}

export function trackYear(track) {
    return parseInt(String(track?.startDate || '').slice(0, 4), 10) || new Date().getFullYear();
}

// "13 Oct" on a track starting 2026-10-06 -> "2026-10-13", matching WorkshopAttendance.sessionDate.
export function sessionIsoDate(dateStr, track) {
    const d = parseSessionDate(dateStr, trackYear(track));
    if (!d) return null;
    return `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}
