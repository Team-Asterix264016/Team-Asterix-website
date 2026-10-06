/**
 * Calendar utilities to generate Google Calendar URLs and downloadable .ics files
 * for Team Asterix Workshop sessions.
 */

/**
 * Format a JavaScript Date or date string to ISO string formatted for ICS (YYYYMMDDTHHmmssZ)
 */
function formatICSDatetime(dateStr, timeStr) {
    try {
        if (!dateStr) dateStr = '2026-10-06';
        const parts = dateStr.split('-');
        const year = parts[0] ? parseInt(parts[0], 10) : 2026;
        const month = parts[1] ? parseInt(parts[1], 10) : 10;
        const day = parts[2] ? parseInt(parts[2], 10) : 6;

        let hours = 17;
        let minutes = 10;

        if (timeStr) {
            const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
                let h = parseInt(timeMatch[1], 10);
                const m = parseInt(timeMatch[2], 10);
                const ampm = timeMatch[3].toUpperCase();
                if (ampm === 'PM' && h < 12) h += 12;
                if (ampm === 'AM' && h === 12) h = 0;
                hours = h;
                minutes = m;
            }
        }

        // IST is UTC+5:30
        const localDate = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30));

        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = localDate.getUTCFullYear();
        const mm = pad(localDate.getUTCMonth() + 1);
        const dd = pad(localDate.getUTCDate());
        const hh = pad(localDate.getUTCHours());
        const min = pad(localDate.getUTCMinutes());

        return `${yyyy}${mm}${dd}T${hh}${min}00Z`;
    } catch {
        return '20261006T114000Z';
    }
}

/**
 * Creates a Google Calendar event URL
 */
export function getGoogleCalendarUrl({ title, description, location, date, timing }) {
    const startIso = formatICSDatetime(date, timing?.split('–')[0] || '5:10 PM');
    const endIso = formatICSDatetime(date, timing?.split('–')[1] || '6:50 PM');

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Team Asterix Workshop: ${title}`,
        details: description || 'Team Asterix Official Subsystem Workshop Session',
        location: location || 'PSG iTech Labs',
        dates: `${startIso}/${endIso}`
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and triggers download of an .ics file for Apple / Outlook Calendar
 */
export function downloadIcsFile({ title, description, location, date, timing }) {
    const startIso = formatICSDatetime(date, timing?.split('–')[0] || '5:10 PM');
    const endIso = formatICSDatetime(date, timing?.split('–')[1] || '6:50 PM');

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Team Asterix//Workshop Calendar//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `SUMMARY:Team Asterix Workshop: ${title}`,
        `DESCRIPTION:${(description || 'Team Asterix Official Workshop Session').replace(/\n/g, '\\n')}`,
        `LOCATION:${location || 'PSG iTech Labs'}`,
        `DTSTART:${startIso}`,
        `DTEND:${endIso}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_session.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generates and triggers download of a single combined .ics file for ALL workshop sessions
 */
export function downloadAllIcsFile(scheduleItems, trackName = 'Team Asterix Workshop') {
    const validItems = (scheduleItems || []).filter((item) => item.type !== 'holiday');
    if (validItems.length === 0) return;

    const events = validItems.map((item) => {
        const startIso = formatICSDatetime(item.date, '5:10 PM');
        const endIso = formatICSDatetime(item.date, '6:50 PM');
        const desc = `Handled by: ${item.instructor || 'Team Asterix'}. ${item.project ? 'Milestone: ' + item.project : ''}`.trim();
        const loc = item.venue || 'Autonomous Systems & Robotics Lab, PSG iTech';

        return [
            'BEGIN:VEVENT',
            `SUMMARY:Team Asterix ${trackName}: ${item.title}`,
            `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`,
            `LOCATION:${loc}`,
            `DTSTART:${startIso}`,
            `DTEND:${endIso}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
        ].join('\r\n');
    });

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Team Asterix//Workshop Schedule//EN',
        'CALSCALE:GREGORIAN',
        'X-WR-CALNAME:Team Asterix Workshop Master Schedule',
        ...events,
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    const fileName = `${trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_full_schedule.ics`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

