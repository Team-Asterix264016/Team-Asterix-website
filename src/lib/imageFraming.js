/**
 * How an uploaded picture is placed inside the frame that displays it.
 *
 * Every photo on the site lands in a fixed-ratio box: a portrait tile on the
 * subsystem page, a 4:3 tile in the gallery grid, a tall column in the drift
 * wall. `object-fit: cover` fills those boxes by cropping, and the crop is
 * always taken from the centre -- which is why a phone-shot portrait uploaded
 * through the admin routinely lost the head on a narrow viewport. Nobody could
 * see that happen either, because the admin previewed the file in a 56px
 * square rather than in the shape the site actually uses.
 *
 * So framing is stored with the picture: which way it fills its box, and where
 * the interesting part of it is. The admin sets both against a real preview of
 * every frame the picture will appear in, and every consumer reads the same two
 * values through the helpers here, so a photo cannot look right in the console
 * and wrong on the page.
 */

/** `object-fit` values the admin can choose between. */
export const FIT_MODES = ['cover', 'contain'];

export const DEFAULT_FIT = 'cover';
export const DEFAULT_POSITION = '50% 50%';

const PERCENT_PAIR = /^\s*(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%\s*$/;

const clampPercent = (n) => Math.min(100, Math.max(0, n));

/**
 * A stored position string as `{ x, y }` percentages.
 * Anything unparseable becomes dead centre rather than throwing, because these
 * values round-trip through a hand-editable JSON backup.
 */
export function parsePosition(position) {
    const match = PERCENT_PAIR.exec(String(position ?? ''));
    if (!match) return { x: 50, y: 50 };
    return { x: clampPercent(Number(match[1])), y: clampPercent(Number(match[2])) };
}

/** `{ x, y }` percentages back to the string stored on the record. */
export function formatPosition(x, y) {
    return `${Math.round(clampPercent(x))}% ${Math.round(clampPercent(y))}%`;
}

/** Normalises whatever is on the record into a usable `object-position`. */
export const normalizePosition = (position) => {
    const { x, y } = parsePosition(position);
    return formatPosition(x, y);
};

/** Normalises whatever is on the record into a usable `object-fit`. */
export const normalizeFit = (fit) => (fit === 'contain' ? 'contain' : DEFAULT_FIT);

/**
 * Inline style for an `<img>` that should honour a record's framing.
 *
 * Returned as a style object rather than Tailwind classes on purpose: the
 * position is a continuous pair of percentages chosen by dragging, and Tailwind
 * can only see class names that exist literally in the source.
 */
export function framingStyle(fit, position) {
    return {
        objectFit: normalizeFit(fit),
        objectPosition: normalizePosition(position)
    };
}

/**
 * Framing for a squad member, whose fields are prefixed to keep them clear of
 * the gallery's own `fit` / `position`.
 */
export const memberFramingStyle = (member) => framingStyle(member?.photoFit, member?.photoPosition);

/**
 * The frames a picture of each kind actually appears in, narrowest first.
 *
 * The admin renders one live preview per entry, so the person choosing the crop
 * sees the phone result next to the desktop result instead of discovering the
 * difference after publishing. Only the ratio is given: the previews are all
 * rendered to one height and take their width from it, which keeps the strip
 * even however many frames a kind has.
 */
export const FRAME_PRESETS = {
    member: [
        { id: 'mobile', label: 'Phone card', ratio: '3 / 4' },
        { id: 'desktop', label: 'Desktop card', ratio: '4 / 5' },
        { id: 'badge', label: 'Downloadable badge', ratio: '1 / 1' }
    ],
    gallery: [
        { id: 'grid', label: 'Grid tile', ratio: '4 / 3' },
        { id: 'wall', label: 'Drift wall tile', ratio: '11 / 7' },
        { id: 'lightbox', label: 'Lightbox', ratio: '16 / 9' }
    ],
    update: [
        { id: 'panel', label: 'Accordion panel', ratio: '2 / 3' },
        { id: 'expanded', label: 'Expanded panel', ratio: '16 / 10' }
    ]
};
