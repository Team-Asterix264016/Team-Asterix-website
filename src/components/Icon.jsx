/**
 * Icon
 * A small set of monochrome line icons, replacing the colour emoji that were
 * scattered through the UI.
 *
 * Colour emoji rendered as full-colour OS glyphs inside a hard-edged
 * monochrome palette, looked different on every platform, and were read aloud
 * by screen readers as their Unicode names. These inherit `currentColor` and
 * are hidden from assistive technology, so the adjacent text label is what
 * gets announced.
 */

const PATHS = {
    // Navigation / dashboard
    overview: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    book: 'M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V4zm2 0v12.17c.32-.11.65-.17 1-.17h10V4H6z',
    vehicle:
        'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM3 13l1.5-5A2 2 0 0 1 6.4 6.5h11.2A2 2 0 0 1 19.5 8L21 13v4h-2a3 3 0 0 0-6 0h-2a3 3 0 0 0-6 0H3v-4zm2.2-1h13.6l-1.1-3.7a1 1 0 0 0-.95-.8H7.25a1 1 0 0 0-.95.8L5.2 12z',
    camera: 'M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    megaphone:
        'M18 3v18l-9-4.5V17a3 3 0 0 1-6 0v-3H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h6L18 3zm-9 11v3a1 1 0 0 0 2 0v-2l-2-1z',
    inbox: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v7h4l1 3h6l1-3h4V6H4z',
    users: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.6-7 4v2h14v-2c0-2.4-3.7-4-7-4zm8.5-2a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm.5 2c-.7 0-1.4.1-2 .3 1.5 1 2.5 2.3 2.5 3.7v2h5v-2c0-2.2-3-4-5.5-4z',
    settings:
        'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4a7.5 7.5 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L16 3H8l-.5 2.6c-.7.3-1.4.7-2 1.2l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L8 21h8l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z',
    folder: 'M3 5a2 2 0 0 1 2-2h4.6l2 2H19a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z',
    calendar:
        'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z',
    clipboard:
        'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',

    // Contact / footer
    pin: 'M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 7L4.5 6.5h15L12 11zm0 2.3L4 8.4V18h16V8.4l-8 4.9z',
    phone: 'M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z'
};

export default function Icon({ name, className = 'w-4 h-4' }) {
    const d = PATHS[name];
    if (!d) return null;

    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`inline-block flex-shrink-0 ${className}`}
            aria-hidden="true"
            focusable="false"
        >
            <path d={d} />
        </svg>
    );
}
