// Returns the URL only if it is http(s) or a same-site path, mirroring the server's check on workshop
// notes, so a stored javascript:/data: link can never become a clickable href.
export function safeHref(url) {
    const value = String(url || '').trim();
    if (value.startsWith('/')) return value.startsWith('//') ? undefined : value;
    try {
        const { protocol } = new URL(value);
        return protocol === 'https:' || protocol === 'http:' ? value : undefined;
    } catch {
        return undefined;
    }
}
