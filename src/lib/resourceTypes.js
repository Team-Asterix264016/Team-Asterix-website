// Badges for workshop note link types; admins can also type custom types.
const RESOURCE_TYPE_BADGES = {
    pdf: '📄 PDF',
    slides: '📊 Slides',
    colab: '🌐 Colab',
    notebook: '📓 Notebook',
    github: '🐙 GitHub',
    code: '💻 Code',
    markdown: '📝 Markdown',
    drive: '📁 Drive',
    video: '🎬 Video',
    link: '↗ Link',
    doc: '📝 Doc',
    dataset: '🗂️ Dataset'
};

export function resourceBadge(type) {
    const t = String(type || '').trim().toLowerCase();
    if (Object.hasOwn(RESOURCE_TYPE_BADGES, t)) return RESOURCE_TYPE_BADGES[t];
    if (t) return `↗ ${t.toUpperCase()}`;
    return '↗ Open';
}
