export function formatPostDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "just now", "5 min ago", "3 h ago", "2 d ago", then the date.
export function timeAgo(value, now = Date.now()) {
    const seconds = Math.round((now - new Date(value).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return '';
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
    if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`;
    return formatPostDate(value);
}
