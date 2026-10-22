/**
 * Draws an Instagram & Social Media Promotion Flyer for a blog post to HTML5 canvas and exports it.
 *
 * Visual Theme: Asterix Horizon Editorial Flyer
 * - Warm textured cream newsprint paper (#f5f2eb / #f4efe6).
 * - Stately serif masthead ("HORIZON // A VIEW BEYOND").
 * - Multi-section ticker ("BUILD LOGS / TECHNICAL WRITE-UPS / RACE DEBRIEFS / AND MORE").
 * - High-contrast editorial serif headline + yellow accent dash (#ffe500).
 * - Author byline with circular avatar.
 * - Bold yellow CTA button ("READ ON ASTERIX BLOGS — HORIZON →").
 * - Right-hand column: Editorial community teaser + tall portrait racecar/project cover photograph.
 * - Bottom footer: "SEASON 2026 —————— //".
 *
 * Formats:
 * - 'portrait': 1080 x 1350 (4:5 Feed Post / Flyer - matches exact reference)
 * - 'story': 1080 x 1920 (9:16 Instagram Story / Reel Cover / Status)
 * - 'square': 1080 x 1080 (1:1 Feed Post)
 */

import { apiUrl } from './api';
import { normalizeAuthors, formatAuthorNames, formatAuthorRoles } from './blogAuthors';

const PAPER_BG = '#f5f2eb';
const INK_PRIMARY = '#111827';
const INK_SECONDARY = '#475569';
const INK_MUTED = '#94a3b8';
const ACCENT_YELLOW = '#ffe500';
const BORDER_COLOR = 'rgba(17, 24, 39, 0.25)';

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";
const DISPLAY = "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

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

function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).trim().split(/\s+/);
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

/**
 * Renders the editorial flyer graphic onto a canvas matching the reference design.
 */
export async function renderBlogPromo(canvas, post, format = 'portrait', options = {}) {
    const {
        callToAction = 'READ ON ASTERIX BLOGS — HORIZON →',
        siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://asterix-website.vercel.app',
        logoUrl = '/Screenshot%202026-08-26%20232320.png'
    } = options;

    let width = 1080;
    let height = 1350; // default 4:5 portrait flyer
    if (format === 'story') {
        height = 1920; // 9:16 story
    } else if (format === 'square') {
        height = 1080; // 1:1 square
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load post cover image and team logo
    const postCoverUrl = post.cover ? apiUrl(post.cover) : post.coverImage || '/gallery/04_track_dirt_action.jpg';
    const [coverImg, logoImg] = await Promise.all([
        loadImage(postCoverUrl),
        loadImage(logoUrl)
    ]);

    // 1. PAPER BACKGROUND
    ctx.fillStyle = PAPER_BG;
    ctx.fillRect(0, 0, width, height);

    // Subtle newsprint / paper texture feel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    for (let px = 0; px < width; px += 8) {
        for (let py = 0; py < height; py += 8) {
            if ((px + py) % 16 === 0) {
                ctx.fillRect(px, py, 1.5, 1.5);
            }
        }
    }

    const margin = 48;
    const innerWidth = width - margin * 2;

    // Outer subtle card frame
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin - 12, margin - 12, innerWidth + 24, height - (margin - 12) * 2);

    // =========================================================
    // 2. TOP MASTHEAD BAR
    // =========================================================
    const topBarY = margin + 8;
    const mastheadHeight = 76;

    // Left Section: Stylized Logo & "ASTERIX BLOGS"
    const logoSize = 44;
    if (logoImg) {
        const aspect = logoImg.width / logoImg.height;
        ctx.drawImage(logoImg, margin, topBarY + 12, logoSize * aspect, logoSize);
    } else {
        // Draw stylized Asterix "A" glyph
        ctx.fillStyle = INK_PRIMARY;
        ctx.font = `900 36px ${DISPLAY}`;
        ctx.fillText('A/', margin, topBarY + 44);
    }

    const brandTextX = margin + 56;
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `900 15px ${DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0.08em';
    ctx.fillText('ASTERIX', brandTextX, topBarY + 28);
    ctx.fillText('BLOGS', brandTextX, topBarY + 48);
    ctx.letterSpacing = '0px';

    // Vertical separator rule
    const sepX = brandTextX + 90;
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sepX, topBarY + 14);
    ctx.lineTo(sepX, topBarY + 58);
    ctx.stroke();

    // Center Section: "HORIZON // A VIEW BEYOND"
    const centerX = width / 2 + 10;
    ctx.textAlign = 'center';
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `700 38px ${SERIF}`;
    ctx.fillText('HORIZON', centerX, topBarY + 36);

    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `800 11px ${MONO}`;
    ctx.fillText('A   V I E W   B E Y O N D', centerX, topBarY + 54);

    // Right Section: "SEASON 2026"
    ctx.textAlign = 'right';
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `800 13px ${MONO}`;
    ctx.fillText('SEASON', width - margin, topBarY + 28);
    ctx.fillText('2026', width - margin, topBarY + 46);

    ctx.strokeStyle = INK_PRIMARY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width - margin - 32, topBarY + 56);
    ctx.lineTo(width - margin, topBarY + 56);
    ctx.stroke();

    ctx.textAlign = 'left';

    // =========================================================
    // 3. HORIZONTAL DIVIDERS & TOPICS RIBBON
    // =========================================================
    const line1Y = topBarY + mastheadHeight + 8;
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, line1Y);
    ctx.lineTo(width - margin, line1Y);
    ctx.stroke();

    const tickerY = line1Y + 26;
    ctx.textAlign = 'center';
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `800 13px ${MONO}`;
    const categoriesText = 'BUILD LOGS   /   TECHNICAL WRITE-UPS   /   RACE DEBRIEFS   /   AND MORE';
    ctx.fillText(categoriesText, width / 2, tickerY);
    ctx.textAlign = 'left';

    const line2Y = line1Y + 42;
    ctx.beginPath();
    ctx.moveTo(margin, line2Y);
    ctx.lineTo(width - margin, line2Y);
    ctx.stroke();

    // =========================================================
    // 4. MAIN EDITORIAL BODY (2 COLUMNS)
    // =========================================================
    const bodyTopY = line2Y + 40;
    const bodyBottomY = height - margin - 54;
    const totalBodyHeight = bodyBottomY - bodyTopY;

    // Split proportions: Left ~53%, Right ~47%
    const colGap = 42;
    const leftWidth = Math.floor(innerWidth * 0.52);
    const rightLeft = margin + leftWidth + colGap;
    const rightWidth = innerWidth - leftWidth - colGap;

    // ---------------------------------------------------------
    // LEFT COLUMN: Headline, Yellow Dash, Excerpt, Author, CTA
    // ---------------------------------------------------------
    let currentY = bodyTopY + 24;

    // Headline in high-impact serif
    ctx.fillStyle = INK_PRIMARY;
    const headlineFontSize = format === 'story' ? 64 : format === 'portrait' ? 56 : 48;
    const headlineLineHeight = format === 'story' ? 70 : format === 'portrait' ? 62 : 54;
    ctx.font = `700 ${headlineFontSize}px ${SERIF}`;

    const rawTitle = post.title || 'More EVs on the Road. But Are We Ready to Charge Them?';
    const titleLines = wrapText(ctx, rawTitle, leftWidth);
    const maxTitleLines = format === 'story' ? 5 : 4;
    titleLines.slice(0, maxTitleLines).forEach((line) => {
        ctx.fillText(line, margin, currentY);
        currentY += headlineLineHeight;
    });

    // Yellow accent dash
    currentY += 14;
    ctx.fillStyle = ACCENT_YELLOW;
    ctx.fillRect(margin, currentY, 52, 6);
    currentY += 26;

    // Excerpt / Hook in clean readable sans
    const excerptText =
        post.excerpt ||
        "More EVs are hitting the road, but are charging stations keeping up? Let's explore what it takes to power India's electric future.";
    const excerptFontSize = format === 'story' ? 24 : 21;
    const excerptLineHeight = format === 'story' ? 36 : 32;
    ctx.fillStyle = '#334155';
    ctx.font = `500 ${excerptFontSize}px ${SANS}`;

    const excerptLines = wrapText(ctx, excerptText, leftWidth);
    const maxExcerptLines = format === 'story' ? 5 : format === 'portrait' ? 4 : 3;
    excerptLines.slice(0, maxExcerptLines).forEach((line) => {
        ctx.fillText(line, margin, currentY);
        currentY += excerptLineHeight;
    });

    // Author Byline Block
    const authors = normalizeAuthors(post);
    const authorName = formatAuthorNames(authors);
    const authorRoleText = formatAuthorRoles(authors, post.authorRole || 'PSG iTech Motorsport');

    const authorY = Math.min(currentY + 36, bodyBottomY - 140);
    const avatarRadius = 28;
    const avatarCenterX = margin + avatarRadius;
    const avatarCenterY = authorY + avatarRadius;

    // Circular Avatar (Clean portrait or monogram badge)
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(margin, authorY, avatarRadius * 2, avatarRadius * 2);

    const authorInitial = authorName.charAt(0).toUpperCase();

    // Initials background or subtle avatar drawing
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `800 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(authorInitial, avatarCenterX, avatarCenterY + 8);
    ctx.restore();

    // Avatar border
    ctx.strokeStyle = INK_PRIMARY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Author Text
    const authorTextX = margin + avatarRadius * 2 + 16;
    ctx.textAlign = 'left';
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `800 19px ${SANS}`;
    ctx.fillText(`By ${authorName}`, authorTextX, authorCenterY - 4);

    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `600 14px ${SANS}`;
    ctx.fillText(authorRoleText, authorTextX, authorCenterY + 18);

    // Call To Action Yellow Button
    const btnY = bodyBottomY - (format === 'story' ? 84 : 70);
    const btnHeight = format === 'story' ? 76 : 64;
    const btnWidth = leftWidth;

    ctx.fillStyle = ACCENT_YELLOW;
    ctx.fillRect(margin, btnY, btnWidth, btnHeight);
    ctx.strokeStyle = INK_PRIMARY;
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, btnY, btnWidth, btnHeight);

    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `900 ${format === 'story' ? 17 : 15}px ${MONO}`;
    ctx.textAlign = 'center';
    const finalCta = callToAction || 'READ ON ASTERIX BLOGS — HORIZON →';
    ctx.fillText(finalCta, margin + btnWidth / 2, btnY + btnHeight / 2 + 6);
    ctx.textAlign = 'left';

    // ---------------------------------------------------------
    // RIGHT COLUMN: Community Tagline + Tall Portrait Photograph
    // ---------------------------------------------------------
    let rightY = bodyTopY + 12;

    // Top mini editorial block
    ctx.fillStyle = '#64748b';
    ctx.font = `800 13px ${MONO}`;
    const miniCopyLines = ['STORIES', 'IDEAS', 'TECHNOLOGY', 'FROM THE', 'ASTERIX', 'COMMUNITY.'];
    miniCopyLines.forEach((m) => {
        ctx.fillText(m, rightLeft, rightY);
        rightY += 18;
    });

    // Small dash line under mini-copy
    rightY += 4;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rightLeft, rightY);
    ctx.lineTo(rightLeft + 22, rightY);
    ctx.stroke();

    rightY += 22;

    // Tall portrait photograph
    const photoWidth = rightWidth;
    const photoHeight = bodyBottomY - rightY;

    if (photoHeight > 100) {
        // Photo outline border
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(rightLeft, rightY, photoWidth, photoHeight);

        if (coverImg) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(rightLeft, rightY, photoWidth, photoHeight);
            ctx.clip();

            const imgRatio = coverImg.width / coverImg.height;
            const targetRatio = photoWidth / photoHeight;
            let sx, sy, sWidth, sHeight;

            if (imgRatio > targetRatio) {
                sHeight = coverImg.height;
                sWidth = coverImg.height * targetRatio;
                sx = (coverImg.width - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = coverImg.width;
                sHeight = coverImg.width / targetRatio;
                sx = 0;
                sy = (coverImg.height - sHeight) / 2;
            }

            ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, rightLeft, rightY, photoWidth, photoHeight);
            ctx.restore();
        } else {
            // High-contrast motorsport placeholder
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rightLeft, rightY, photoWidth, photoHeight);
            ctx.fillStyle = ACCENT_YELLOW;
            ctx.font = `900 24px ${MONO}`;
            ctx.textAlign = 'center';
            ctx.fillText('ASTERIX // 026', rightLeft + photoWidth / 2, rightY + photoHeight / 2);
            ctx.textAlign = 'left';
        }
    }

    // =========================================================
    // 5. BOTTOM FOOTER
    // =========================================================
    const footerY = height - margin + 12;
    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `800 12px ${MONO}`;
    ctx.fillText('SEASON 2026', margin, footerY);

    // Connecting horizontal rule to the hash marks
    const lineStartX = margin + 110;
    const lineEndX = width - margin - 44;
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lineStartX, footerY - 4);
    ctx.lineTo(lineEndX, footerY - 4);
    ctx.stroke();

    ctx.fillStyle = INK_PRIMARY;
    ctx.font = `900 15px ${MONO}`;
    ctx.fillText('//', width - margin - 24, footerY);
}

/**
 * Generates ready-to-copy social media advertising captions and hashtags.
 */
export function generateSocialAdCopy(post, siteOrigin = 'https://asterix-website.vercel.app') {
    const postUrl = `${siteOrigin}/blog/${encodeURIComponent(post.slug || '')}`;
    const authors = normalizeAuthors(post);
    const author = formatAuthorNames(authors);
    const category = post.category || 'Engineering';

    const shortAd = `🏁 NEW ON HORIZON: ${post.title}\n\n${post.excerpt || 'Deep dive into motorsport engineering, telemetry, and electric mobility.'}\n\n👉 Read the breakdown on Asterix Blogs: ${postUrl}\n\n#TeamAsterix #BajaSAE #MotorsportEngineering #${category.replace(/\s+/g, '')} #StudentEngineers`;

    const detailedAd =
        `🚀 [NEW DISPATCH] ${post.title.toUpperCase()}\n\n` +
        `Written by student ${authors.length > 1 ? 'engineers' : 'engineer'} ${author} directly from the Team Asterix garage.\n\n` +
        `🔍 What's inside:\n` +
        (post.takeaways && post.takeaways.length > 0
            ? post.takeaways.slice(0, 3).map((t) => `• ${t}`).join('\n') + '\n\n'
            : `• ${post.excerpt || 'Technical analysis, telemetry insights, and real-world racecraft.'}\n\n`) +
        `⏱️ Read time: ${post.readMinutes || 4} mins\n` +
        `🔗 Read the full post on Asterix Horizon: ${postUrl}\n\n` +
        `Tap the link in our bio or visit ${postUrl}\n\n` +
        `#TeamAsterix #Horizon #AutomotiveEngineering #ElectricVehicles #PSGITech #Motorsport #BajaSAE #FormulaStudent #STEM`;

    const storyPrompt = `NEW ARTICLE DROPPED 🔥\n\n"${post.title}"\n\nTap the link sticker to read on Horizon! ↗️`;

    return {
        shortAd,
        detailedAd,
        storyPrompt,
        postUrl
    };
}
