/**
 * Draws a crew member's badge to a PNG and hands it to them as a download.
 *
 * This replaces a hosted credential page. A page needs a route, an API, a
 * verification story and somewhere to explain what "verified" means; a PNG
 * needs none of that, and it is what someone actually wants when they are
 * putting a line on a CV or a post. There is no server involvement at all --
 * the badge is drawn in the member's own browser from the roster the page is
 * already showing.
 *
 * Everything is drawn in the site's own language: white card, hard black
 * border, offset shadow, colour strip for the subsystem.
 */

import { apiUrl } from './api';
import { normalizeFit, parsePosition } from './imageFraming';

/* Tailwind class -> the colour it paints. Canvas cannot read a class name, and
   the strip is the one place the badge has to match the subsystem card exactly. */
const SUBSYSTEM_COLORS = {
    'bg-sky-400': '#38bdf8',
    'bg-amber-300': '#fcd34d',
    'bg-emerald-400': '#34d399',
    'bg-rose-400': '#fb7185',
    'bg-violet-400': '#a78bfa',
    'bg-slate-900': '#0f172a'
};

const INK = '#0f172a';
const PAPER = '#ffffff';
const SKY = '#0284c7';
const MUTED = '#64748b';

const SANS = "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";
const MONO = "'Space Grotesk', ui-monospace, SFMono-Regular, Menlo, monospace";

/* Laid out at this size, then scaled by the device pixel ratio so the file is
   crisp when someone drops it into a slide or a PDF. */
const W = 900;
const PAD = 36;
const PHOTO = 260;
const STRIP = 20;
const FOOTER = 44;
/* Derived rather than picked, so the card is exactly as tall as its contents.
   A fixed 480 left a band of empty white under the portrait. */
const H = 34 + STRIP + PAD + PHOTO + PAD + FOOTER;

/**
 * Loads an image for canvas use.
 *
 * `crossOrigin` has to be set before `src`, and it has to be set at all: without
 * it a CDN photo taints the canvas and `toBlob` throws a security error at the
 * very end, after everything has been drawn. Resolves to null instead of
 * rejecting, because a badge without a photograph is still a usable badge and
 * the caller falls back to initials.
 */
function loadImage(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/** First letters of the first two words, matching the roster's own convention. */
const initialsFor = (name) =>
    String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'TM';

/**
 * The largest size at or below `startSize` at which `text` fits `maxWidth`,
 * leaving `ctx.font` set to it.
 *
 * Separate from drawing because the name's size decides how tall the text block
 * is, and the block has to be positioned before its first line is drawn.
 *
 * The decrement precedes the re-measure. A do/while that set the font and then
 * decremented reported a size one smaller than the one on the canvas.
 */
function fitSize(ctx, text, maxWidth, startSize, weight, font) {
    let size = startSize;
    ctx.font = `${weight} ${size}px ${font}`;
    while (ctx.measureText(text).width > maxWidth && size > 10) {
        size -= 1;
        ctx.font = `${weight} ${size}px ${font}`;
    }
    return size;
}

/** Shrinks `text` to fit and draws it, returning the size used. */
function drawFit(ctx, text, x, y, maxWidth, startSize, { weight = '900', font = SANS, color = INK }) {
    const size = fitSize(ctx, text, maxWidth, startSize, weight, font);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    return size;
}

/** A pill with a black border, returning the x it ended at so chips can queue up. */
function chip(ctx, text, x, y, { bg, fg = INK, size = 13 }) {
    ctx.font = `700 ${size}px ${MONO}`;
    const padX = 10;
    const w = ctx.measureText(text).width + padX * 2;
    const h = size + 12;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = fg;
    // Restored to whatever the caller had, not assumed to be the default.
    const previousBaseline = ctx.textBaseline;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + h / 2 + 1);
    ctx.textBaseline = previousBaseline;
    return x + w + 8;
}

/**
 * `object-fit` / `object-position` as canvas source-rectangle maths, so the
 * badge crops a photo exactly the way the website does. Without this the badge
 * would centre-crop a portrait whose focal point was deliberately moved.
 */
function drawFramed(ctx, img, dx, dy, dw, dh, fit, position) {
    const { x: px, y: py } = parsePosition(position);

    if (normalizeFit(fit) === 'contain') {
        const scale = Math.min(dw / img.width, dh / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(dx, dy, dw, dh);
        ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
        return;
    }

    const scale = Math.max(dw / img.width, dh / img.height);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (img.width - sw) * (px / 100);
    const sy = (img.height - sh) * (py / 100);
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Renders the badge and returns it as a blob.
 *
 * Exported separately from the download so a caller can preview it, and so a
 * failure to produce the image is distinguishable from a failure to save it.
 */
export async function renderBadge(member, subsystem) {
    const isAlumni = member?.status === 'Alumni';
    const accent = SUBSYSTEM_COLORS[subsystem?.color] || SUBSYSTEM_COLORS['bg-sky-400'];
    const statusColor = isAlumni ? '#fcd34d' : '#38bdf8';

    /* Webfonts load asynchronously, and a canvas drawn before they arrive
       silently falls back to the system stack -- which is exactly the bug the
       site's own font tokens exist to avoid. */
    if (document.fonts?.ready) {
        try { await document.fonts.ready; } catch { /* older browser; the stack still resolves */ }
    }

    const photo = await loadImage(apiUrl(member?.photo));

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const canvas = document.createElement('canvas');
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser would not give us a canvas to draw the badge on.');
    ctx.scale(dpr, dpr);

    // Ground, so the offset shadow has something to sit against.
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, W, H);

    // Card, with the site's hard offset shadow.
    const cx = 18;
    const cy = 14;
    const cw = W - 36;
    const ch = H - 34;
    ctx.fillStyle = INK;
    ctx.fillRect(cx + 10, cy + 10, cw, ch);
    ctx.fillStyle = PAPER;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.strokeRect(cx, cy, cw, ch);

    // Subsystem colour strip.
    ctx.fillStyle = accent;
    ctx.fillRect(cx, cy, cw, 16);
    ctx.fillStyle = INK;
    ctx.fillRect(cx, cy + 16, cw, 4);

    // Portrait.
    const photoX = cx + PAD;
    const photoY = cy + 20 + PAD;
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, PHOTO, PHOTO);
    ctx.clip();
    if (photo) {
        drawFramed(ctx, photo, photoX, photoY, PHOTO, PHOTO, member.photoFit, member.photoPosition);
    } else {
        ctx.fillStyle = INK;
        ctx.fillRect(photoX, photoY, PHOTO, PHOTO);
        ctx.fillStyle = statusColor;
        ctx.font = `900 96px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.fillText(initialsFor(member?.name), photoX + PHOTO / 2, photoY + PHOTO / 2 + 34);
        ctx.textAlign = 'left';
    }
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeRect(photoX, photoY, PHOTO, PHOTO);

    /* Text column.
       Every line is placed by its TOP edge. With the default alphabetic
       baseline the y handed to fillText is the bottom of the glyphs, so the
       name -- drawn 58px below the chips at up to 54px tall -- reached back up
       into them and collided. Aligning to the top removes that class of bug
       entirely, and makes each advance simply "height plus a gap". */
    const tx = photoX + PHOTO + PAD;
    const tw = cx + cw - PAD - tx;

    const nameText = String(member?.name || 'Team Asterix Crew').toUpperCase();
    const roleText = member?.role || '';
    const subText = String(subsystem?.name || '').toUpperCase();

    const CHIP_SIZE = 13;
    const CHIP_H = CHIP_SIZE + 12;
    const ROLE_SIZE = 22;
    const SUB_SIZE = 16;
    const GAP = 18;
    const TIGHT = 12;

    /* Measured before anything is drawn: the name's size decides the block's
       height, and the height decides where the first chip goes. */
    const nameSize = fitSize(ctx, nameText, tw, 54, '900', SANS);

    let blockH = CHIP_H + GAP + nameSize;
    if (roleText) blockH += GAP + ROLE_SIZE;
    if (subText) blockH += TIGHT + SUB_SIZE;

    // Centred against the portrait, so the two columns balance.
    let ty = photoY + Math.max(0, (PHOTO - blockH) / 2);

    ctx.textBaseline = 'top';

    const chipX = chip(ctx, isAlumni ? '★ ALUMNI' : '● ACTIVE CREW', tx, ty, {
        bg: statusColor,
        fg: INK,
        size: CHIP_SIZE
    });
    if (member?.badge) {
        chip(ctx, String(member.badge).toUpperCase(), chipX, ty, {
            bg: INK,
            fg: PAPER,
            size: CHIP_SIZE
        });
    }
    ty += CHIP_H + GAP;

    drawFit(ctx, nameText, tx, ty, tw, nameSize, {});
    ty += nameSize + GAP;

    if (roleText) {
        drawFit(ctx, roleText, tx, ty, tw, ROLE_SIZE, { weight: '700', font: MONO, color: SKY });
        ty += ROLE_SIZE + TIGHT;
    }
    if (subText) {
        drawFit(ctx, subText, tx, ty, tw, SUB_SIZE, { weight: '700', font: MONO, color: MUTED });
    }

    ctx.textBaseline = 'alphabetic';

    // Footer bar.
    const barH = 44;
    const barY = cy + ch - barH;
    ctx.fillStyle = INK;
    ctx.fillRect(cx, barY, cw, barH);
    ctx.fillStyle = PAPER;
    ctx.font = `700 14px ${MONO}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('TEAM ASTERIX · AUTONOMOUS MOBILITY', cx + PAD, barY + barH / 2);
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'right';
    ctx.fillText('ENGINEERING BADGE', cx + cw - PAD, barY + barH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    return new Promise((resolve, reject) => {
        /* A photo served without permissive CORS headers taints the canvas, and
           the error surfaces only here. Saying so plainly beats a bare
           "SecurityError" in the console. */
        try {
            canvas.toBlob(
                (blob) => (blob
                    ? resolve(blob)
                    : reject(new Error('The badge image could not be encoded.'))),
                'image/png'
            );
        } catch {
            reject(new Error(
                'The badge could not be saved because the photo is served without cross-origin permission. '
                + 'Re-upload it through the admin so it lands on the CDN.'
            ));
        }
    });
}

/** File-safe name, e.g. `asterix-badge-ratheeswar.png`. */
const fileNameFor = (member) =>
    `asterix-badge-${String(member?.name || 'crew')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'crew'}.png`;

/** Renders the badge and saves it to the visitor's downloads. */
export async function downloadBadge(member, subsystem) {
    const blob = await renderBadge(member, subsystem);
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = fileNameFor(member);
    document.body.append(a);
    a.click();
    a.remove();
    /* Revoked on a later tick rather than immediately. Chrome and Firefox start
       the download synchronously inside the click, but Safari does not always,
       and revoking first leaves the member with nothing and no error. The URL
       is released either way; only the timing differs. */
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
