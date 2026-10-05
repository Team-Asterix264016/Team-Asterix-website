import { sendWhatsAppAlert } from '../lib/whatsapp.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const READ_ONLY_POSTS = new Set([
    '/api/auth/login',
    '/api/workshop/receipt-lookup',
    '/api/workshop/projects/lookup'
]);

const RESOURCE_LABELS = {
    'site-data': 'website content',
    members: 'team member records',
    gallery: 'gallery content',
    updates: 'team updates',
    subsystems: 'subsystem content',
    subscribers: 'newsletter subscriptions',
    'sponsor-inquiries': 'sponsor inquiries',
    submissions: 'student submissions',
    upload: 'website media',
    workshop: 'workshop records',
    quiz: 'quiz activity',
    auth: 'team account settings'
};

export function describeWebsiteChange(method, pathname) {
    if (/^\/api\/workshop\/register\/?$/.test(pathname)) {
        return 'A new workshop student registered';
    }
    if (/^\/api\/workshop\/attendance\/(checkin|manual-mark)\/?$/.test(pathname)) {
        return 'Workshop attendance was marked';
    }
    if (/^\/api\/workshop\/projects\/?$/.test(pathname)) {
        return 'A workshop project submission was added or updated';
    }
    if (pathname.startsWith('/api/workshop/projects/admin/')) {
        return 'Workshop project submission settings were updated';
    }
    if (pathname.startsWith('/api/workshop/registrations/')) {
        return 'A workshop registration was updated';
    }
    if (/^\/api\/quiz\/[^/]+\/submit\/?$/.test(pathname)) {
        return 'A quiz response was submitted';
    }

    const resource = pathname.split('/').filter(Boolean)[1] || 'website';
    const label = RESOURCE_LABELS[resource] || 'website data';
    const action = method === 'POST' ? 'was added or changed'
        : method === 'DELETE' ? 'was removed'
            : 'was updated';
    return `${label[0].toUpperCase()}${label.slice(1)} ${action}`;
}

export function whatsappActivityMiddleware(req, res, next) {
    const method = String(req.method || '').toUpperCase();
    const pathname = String(req.originalUrl || req.url || '').split('?')[0];

    if (!WRITE_METHODS.has(method)
        || (method === 'POST' && (READ_ONLY_POSTS.has(pathname) || /^\/api\/quiz\/[^/]+\/lookup-result\/?$/.test(pathname)))) {
        return next();
    }

    res.once('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        const timestamp = new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'UTC'
        }).format(new Date());
        const message = `${describeWebsiteChange(method, pathname)}. Time: ${timestamp} UTC.`;

        sendWhatsAppAlert(message).catch(error => {
            console.error('[WhatsApp alerts] Delivery failed:', error.message);
        });
    });

    next();
}