export default async function handler(req, res) {
    const slug = req.query.slug || '';
    const siteUrl = 'https://asterix-website.vercel.app';
    const apiBase = (process.env.VITE_API_URL || 'https://asterix-backend.onrender.com').replace(/\/+$/, '');

    if (!slug) {
        return res.redirect(302, '/#community');
    }

    try {
        const response = await fetch(`${apiBase}/api/blog/${encodeURIComponent(slug)}`, {
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            return res.redirect(302, `/#community/blog/${encodeURIComponent(slug)}`);
        }

        const data = await response.json();
        const post = data.post || {};
        const title = post.title ? `${post.title} | Team Asterix Horizon` : 'Team Asterix Horizon Blog';
        const description =
            post.excerpt ||
            'Latest technologies, automotive trends, electric vehicles, and much more directly from the Team Asterix community.';

        let coverImage = post.coverImage || `${siteUrl}/og-image.png`;
        if (coverImage.startsWith('/uploads/')) {
            coverImage = `${apiBase}${coverImage}`;
        } else if (coverImage.startsWith('/')) {
            coverImage = `${siteUrl}${coverImage}`;
        }

        const canonicalUrl = `${siteUrl}/blog/${encodeURIComponent(slug)}`;
        const destinationUrl = `/#community/blog/${encodeURIComponent(slug)}`;

        const escapeHtml = (str) =>
            String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

        const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Open Graph / WhatsApp / Facebook / LinkedIn -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Team Asterix">
    <meta property="og:title" content="${escapeHtml(post.title || title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(coverImage)}">
    <meta property="og:image:secure_url" content="${escapeHtml(coverImage)}">
    <meta property="og:image:alt" content="${escapeHtml(post.title || 'Team Asterix Blog')}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@team_asterix">
    <meta name="twitter:title" content="${escapeHtml(post.title || title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(coverImage)}">

    <!-- Instant redirect for real human visits -->
    <meta http-equiv="refresh" content="0;url=${destinationUrl}">
</head>
<body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:80vh;">
    <script>
        window.location.replace('${destinationUrl}');
    </script>
    <div style="text-align:center;">
        <h1 style="font-size:1.5rem;margin-bottom:0.5rem;">${escapeHtml(post.title || title)}</h1>
        <p style="color:#94a3b8;margin-bottom:1rem;">Redirecting to article...</p>
        <a href="${destinationUrl}" style="color:#38bdf8;text-decoration:underline;">Click here if not redirected automatically</a>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).send(html);
    } catch {
        return res.redirect(302, `/#community/blog/${encodeURIComponent(slug)}`);
    }
}
