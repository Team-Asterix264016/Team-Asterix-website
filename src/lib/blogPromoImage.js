/**
 * Draws an Instagram Promotion Card for a blog post to HTML5 canvas and exports it.
 *
 * Formats:
 * - 'story': 1080 x 1920 (9:16 Instagram Story / Reel Cover / Status)
 * - 'square': 1080 x 1080 (1:1 Feed Post)
 * - 'portrait': 1080 x 1350 (4:5 Feed Portrait)
 *
 * Visual Theme: Asterix Retro-Brutalist Motorsport
 * - Ink (#0f172a), Sky Blue (#0284c7 / #38bdf8), Paper (#ffffff), Amber (#fcd34d)
 * - Space Grotesk / Plus Jakarta Sans / JetBrains Mono
 * - Hard borders, brutalist badge tags, telemetry stamps, clean CTA pill/box
 */

import { apiUrl } from './api';

const INK = '#0f172a';
const SKY = '#0284c7';
const SKY_LIGHT = '#38bdf8';
const SKY_BG = '#f0f9ff';
const AMBER = '#fcd34d';

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
 * Draws a rounded or sharp rectangle with border and optional brutalist offset shadow.
 */
function drawBrutalCard(ctx, x, y, width, height, bgColor = '#ffffff', shadowOffset = 8, shadowColor = INK, borderColor = INK, borderWidth = 4) {
    if (shadowOffset > 0) {
        ctx.fillStyle = shadowColor;
        ctx.fillRect(x + shadowOffset, y + shadowOffset, width, height);
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);
    if (borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(x, y, width, height);
    }
}

/**
 * Renders the promo graphic onto a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} post - Blog post object (title, excerpt, author, category, readMinutes, cover, tags, slug)
 * @param {'story'|'square'|'portrait'} format
 * @param {Object} options - Customization toggles
 */
export async function renderBlogPromo(canvas, post, format = 'story', options = {}) {
    const {
        theme = 'sky', // 'sky' | 'dark' | 'minimal'
        showQr = true,
        callToAction = 'LINK IN BIO TO READ',
        siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://asterix.psgitech.ac.in',
        logoUrl = '/Screenshot%202026-08-26%20232320.png'
    } = options;

    let width = 1080;
    let height = 1920;
    if (format === 'square') {
        height = 1080;
    } else if (format === 'portrait') {
        height = 1350;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load assets in parallel
    const postCoverUrl = post.cover ? apiUrl(post.cover) : '/gallery/04_track_dirt_action.jpg';
    const [coverImg, logoImg] = await Promise.all([
        loadImage(postCoverUrl),
        loadImage(logoUrl)
    ]);

    // 1. Base Background
    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#090d16' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Subtle background motorsport grid lines
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.05)';
    ctx.lineWidth = 2;
    const gridSize = 40;
    for (let gx = 0; gx < width; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
    }
    for (let gy = 0; gy < height; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
    }

    // Outer framing border (Cyber/Brutalist poster frame)
    const margin = 48;
    ctx.strokeStyle = isDark ? '#38bdf8' : INK;
    ctx.lineWidth = 8;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    // Inner subtle border
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin + 12, margin + 12, width - margin * 2 - 24, height - margin * 2 - 24);

    // Top Header Row
    const headerY = margin + 36;
    const headerLeft = margin + 32;

    // Draw Asterix Logo or Fallback typography
    if (logoImg) {
        const logoHeight = 44;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        ctx.drawImage(logoImg, headerLeft, headerY, logoWidth, logoHeight);
    } else {
        ctx.fillStyle = isDark ? '#ffffff' : INK;
        ctx.font = `900 32px ${DISPLAY}`;
        ctx.fillText('TEAM ASTERIX', headerLeft, headerY + 34);
    }

    // Top Right: "HORIZON // EDITORIAL"
    ctx.textAlign = 'right';
    ctx.font = `800 18px ${MONO}`;
    ctx.fillStyle = isDark ? SKY_LIGHT : SKY;
    ctx.fillText('HORIZON // BLOG DISPATCH', width - margin - 32, headerY + 28);
    ctx.textAlign = 'left';

    // Format specific content layout
    if (format === 'story') {
        // --- 9:16 STORY FORMAT (1080 x 1920) ---
        // Header Divider
        const dividerY = headerY + 68;
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(margin + 28, dividerY);
        ctx.lineTo(width - margin - 28, dividerY);
        ctx.stroke();

        // Category & Tagline Badge
        const badgeY = dividerY + 36;
        const catText = (post.category || 'TECHNICAL WRITE-UP').toUpperCase();
        ctx.font = `800 20px ${MONO}`;
        const catWidth = ctx.measureText(catText).width + 32;
        drawBrutalCard(ctx, headerLeft, badgeY, catWidth, 42, AMBER, 4, INK, INK, 3);
        ctx.fillStyle = '#000000';
        ctx.fillText(catText, headerLeft + 16, badgeY + 28);

        // Read time chip
        const readTime = `${post.readMinutes || 3} MIN READ`;
        ctx.font = `700 18px ${MONO}`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
        ctx.fillText(`// ${readTime}`, headerLeft + catWidth + 18, badgeY + 28);

        // Hero Image Card (Center area)
        const photoY = badgeY + 68;
        const photoWidth = width - (margin + 32) * 2;
        const photoHeight = 640;

        drawBrutalCard(ctx, headerLeft, photoY, photoWidth, photoHeight, '#000000', 12, isDark ? '#0284c7' : INK, isDark ? '#ffffff' : INK, 6);

        if (coverImg) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(headerLeft, photoY, photoWidth, photoHeight);
            ctx.clip();
            // Cover scaling
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
            ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, headerLeft, photoY, photoWidth, photoHeight);
            ctx.restore();
        }

        // Overlay sticker / Decal on Photo
        const stickerX = headerLeft + 24;
        const stickerY = photoY + photoHeight - 64;
        drawBrutalCard(ctx, stickerX, stickerY, 210, 40, isDark ? '#0f172a' : '#ffffff', 4, INK, INK, 3);
        ctx.font = `900 16px ${MONO}`;
        ctx.fillStyle = isDark ? SKY_LIGHT : SKY;
        ctx.fillText('✦ NEW DISPATCH', stickerX + 16, stickerY + 26);

        // Title and Excerpt
        let textY = photoY + photoHeight + 68;
        ctx.fillStyle = isDark ? '#ffffff' : INK;
        ctx.font = `900 48px ${DISPLAY}`;
        const titleLines = wrapText(ctx, post.title || 'Untitled Post', photoWidth);
        const maxTitleLines = titleLines.slice(0, 4);
        maxTitleLines.forEach((line) => {
            ctx.fillText(line, headerLeft, textY);
            textY += 58;
        });

        // Excerpt
        if (post.excerpt) {
            textY += 12;
            ctx.font = `500 24px ${SANS}`;
            ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
            const excerptLines = wrapText(ctx, post.excerpt, photoWidth).slice(0, 3);
            excerptLines.forEach((line) => {
                ctx.fillText(line, headerLeft, textY);
                textY += 36;
            });
        }

        // Author & Origin Footer Box
        const bottomBoxY = height - margin - 220;
        const bottomBoxHeight = 180;
        drawBrutalCard(ctx, headerLeft, bottomBoxY, photoWidth, bottomBoxHeight, isDark ? '#1e293b' : SKY_BG, 8, isDark ? '#38bdf8' : INK, isDark ? '#94a3b8' : INK, 4);

        // Author Details
        ctx.font = `800 20px ${MONO}`;
        ctx.fillStyle = isDark ? '#ffffff' : INK;
        ctx.fillText(`WRITTEN BY: ${(post.author || 'Asterix Racing Crew').toUpperCase()}`, headerLeft + 28, bottomBoxY + 50);

        ctx.font = `600 16px ${SANS}`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('PSG Institute of Technology and Applied Research', headerLeft + 28, bottomBoxY + 80);

        // CTA Banner Button
        const ctaY = bottomBoxY + 104;
        const ctaWidth = photoWidth - 56;
        drawBrutalCard(ctx, headerLeft + 28, ctaY, ctaWidth, 54, isDark ? SKY : SKY_LIGHT, 0, INK, INK, 3);
        ctx.fillStyle = INK;
        ctx.font = `900 20px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.fillText(`👉  ${callToAction}  →`, headerLeft + 28 + ctaWidth / 2, ctaY + 35);
        ctx.textAlign = 'left';

    } else if (format === 'portrait') {
        // --- 4:5 PORTRAIT FEED FORMAT (1080 x 1350) ---
        const photoY = headerY + 70;
        const photoWidth = width - (margin + 32) * 2;
        const photoHeight = 480;

        drawBrutalCard(ctx, headerLeft, photoY, photoWidth, photoHeight, '#000000', 10, isDark ? '#0284c7' : INK, isDark ? '#ffffff' : INK, 5);

        if (coverImg) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(headerLeft, photoY, photoWidth, photoHeight);
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
            ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, headerLeft, photoY, photoWidth, photoHeight);
            ctx.restore();
        }

        // Category Tag
        const badgeY = photoY + photoHeight + 36;
        const catText = (post.category || 'TECHNICAL WRITE-UP').toUpperCase();
        ctx.font = `800 18px ${MONO}`;
        const catWidth = ctx.measureText(catText).width + 28;
        drawBrutalCard(ctx, headerLeft, badgeY, catWidth, 38, AMBER, 4, INK, INK, 3);
        ctx.fillStyle = '#000000';
        ctx.fillText(catText, headerLeft + 14, badgeY + 25);

        // Read time
        ctx.font = `700 16px ${MONO}`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
        ctx.fillText(`// ${post.readMinutes || 3} MIN READ`, headerLeft + catWidth + 16, badgeY + 25);

        // Title
        let textY = badgeY + 80;
        ctx.fillStyle = isDark ? '#ffffff' : INK;
        ctx.font = `900 44px ${DISPLAY}`;
        const titleLines = wrapText(ctx, post.title || 'Untitled Post', photoWidth).slice(0, 3);
        titleLines.forEach((line) => {
            ctx.fillText(line, headerLeft, textY);
            textY += 52;
        });

        // Excerpt
        if (post.excerpt) {
            textY += 12;
            ctx.font = `500 22px ${SANS}`;
            ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
            const excerptLines = wrapText(ctx, post.excerpt, photoWidth).slice(0, 2);
            excerptLines.forEach((line) => {
                ctx.fillText(line, headerLeft, textY);
                textY += 32;
            });
        }

        // Bottom Bar
        const barY = height - margin - 120;
        drawBrutalCard(ctx, headerLeft, barY, photoWidth, 88, isDark ? '#1e293b' : SKY_BG, 6, isDark ? '#38bdf8' : INK, INK, 4);

        ctx.font = `800 16px ${MONO}`;
        ctx.fillStyle = isDark ? '#ffffff' : INK;
        ctx.fillText(`BY: ${(post.author || 'Asterix Racing Crew').toUpperCase()}`, headerLeft + 24, barY + 36);

        ctx.font = `600 14px ${SANS}`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText('PSG iTech · Team Asterix Horizon', headerLeft + 24, barY + 62);

        // CTA
        ctx.textAlign = 'right';
        ctx.font = `900 18px ${MONO}`;
        ctx.fillStyle = isDark ? SKY_LIGHT : SKY;
        ctx.fillText(`${callToAction}  →`, headerLeft + photoWidth - 24, barY + 50);
        ctx.textAlign = 'left';

    } else {
        // --- 1:1 SQUARE FEED FORMAT (1080 x 1080) ---
        const contentWidth = width - (margin + 32) * 2;
        const photoY = headerY + 64;
        const photoHeight = 420;

        drawBrutalCard(ctx, headerLeft, photoY, contentWidth, photoHeight, '#000000', 8, isDark ? '#0284c7' : INK, isDark ? '#ffffff' : INK, 5);

        if (coverImg) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(headerLeft, photoY, contentWidth, photoHeight);
            ctx.clip();
            const imgRatio = coverImg.width / coverImg.height;
            const targetRatio = contentWidth / photoHeight;
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
            ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, headerLeft, photoY, contentWidth, photoHeight);
            ctx.restore();
        }

        // Badge
        const badgeY = photoY + photoHeight + 30;
        const catText = (post.category || 'TECHNICAL WRITE-UP').toUpperCase();
        ctx.font = `800 16px ${MONO}`;
        const catWidth = ctx.measureText(catText).width + 24;
        drawBrutalCard(ctx, headerLeft, badgeY, catWidth, 34, AMBER, 4, INK, INK, 3);
        ctx.fillStyle = '#000000';
        ctx.fillText(catText, headerLeft + 12, badgeY + 23);

        ctx.font = `700 15px ${MONO}`;
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
        ctx.fillText(`// ${post.readMinutes || 3} MIN READ`, headerLeft + catWidth + 14, badgeY + 23);

        // Title
        let textY = badgeY + 70;
        ctx.fillStyle = isDark ? '#ffffff' : INK;
        ctx.font = `900 40px ${DISPLAY}`;
        const titleLines = wrapText(ctx, post.title || 'Untitled Post', contentWidth).slice(0, 2);
        titleLines.forEach((line) => {
            ctx.fillText(line, headerLeft, textY);
            textY += 46;
        });

        // Bottom CTA strip
        const barY = height - margin - 100;
        drawBrutalCard(ctx, headerLeft, barY, contentWidth, 76, isDark ? SKY : SKY_BG, 4, INK, INK, 3);

        ctx.font = `800 18px ${MONO}`;
        ctx.fillStyle = isDark ? INK : INK;
        ctx.fillText(`READ ON HORIZON: ${callToAction} →`, headerLeft + 24, barY + 46);
    }
}

/**
 * Generates ready-to-copy social media advertising captions and hashtags.
 */
export function generateSocialAdCopy(post, siteOrigin = 'https://asterix.psgitech.ac.in') {
    const postUrl = `${siteOrigin}/blog/${encodeURIComponent(post.slug || '')}`;
    const author = post.author || 'Team Asterix';
    const category = post.category || 'Engineering';

    const shortAd = `🏁 NEW ON HORIZON: ${post.title}\n\n${post.excerpt || 'Deep dive into motorsport engineering, telemetry, and electric mobility.'}\n\n👉 Link in bio to read the full breakdown.\n\n#TeamAsterix #BajaSAE #MotorsportEngineering #${category.replace(/\s+/g, '')} #StudentEngineers`;

    const detailedAd = `🚀 [NEW DISPATCH] ${post.title.toUpperCase()}\n\n` +
        `Written by student engineer ${author} directly from the Team Asterix garage.\n\n` +
        `🔍 What's inside:\n` +
        (post.takeaways && post.takeaways.length > 0
            ? post.takeaways.slice(0, 3).map((t) => `• ${t}`).join('\n') + '\n\n'
            : `• ${post.excerpt || 'Technical analysis, telemetry insights, and real-world racecraft.'}\n\n`) +
        `⏱️ Read time: ${post.readMinutes || 4} mins\n` +
        `🔗 Read the full post on Asterix Horizon: ${postUrl}\n\n` +
        `Tap the link in our bio or visit asterix.psgitech.ac.in/blog/${post.slug}\n\n` +
        `#TeamAsterix #Horizon #AutomotiveEngineering #ElectricVehicles #PSGITech #Motorsport #BajaSAE #FormulaStudent #STEM`;

    const storyPrompt = `NEW ARTICLE DROPPED 🔥\n\n"${post.title}"\n\nTap the link sticker to read on Horizon! ↗️`;

    return {
        shortAd,
        detailedAd,
        storyPrompt,
        postUrl
    };
}
