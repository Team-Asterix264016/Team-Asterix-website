function envValue(name) {
    const value = String(process.env[name] || '').trim();
    if (!value || value.startsWith('your_') || /x{6,}/i.test(value)) return '';
    return value;
}

function getWhatsAppConfig() {
    const accessToken = envValue('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = envValue('WHATSAPP_PHONE_NUMBER_ID');
    const recipient = envValue('WHATSAPP_ALERT_TO').replace(/\D/g, '');
    const templateName = envValue('WHATSAPP_TEMPLATE_NAME');
    const apiVersion = envValue('WHATSAPP_GRAPH_API_VERSION');
    const language = envValue('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';

    if (!accessToken || !phoneNumberId || recipient.length < 8 || recipient.length > 15
        || !templateName || !/^v\d+(\.\d+)?$/.test(apiVersion)) {
        return null;
    }

    return { accessToken, phoneNumberId, recipient, templateName, apiVersion, language };
}

export function isWhatsAppConfigured() {
    return Boolean(getWhatsAppConfig());
}

export function describeWhatsAppStatus() {
    return isWhatsAppConfigured()
        ? 'WhatsApp activity alerts: configured.'
        : 'WhatsApp activity alerts: not configured; add the WHATSAPP_* environment variables.';
}

export async function sendWhatsAppAlert(message) {
    const config = getWhatsAppConfig();
    if (!config) return false;

    const response = await fetch(
        `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: config.recipient,
                type: 'template',
                template: {
                    name: config.templateName,
                    language: { code: config.language },
                    components: [{
                        type: 'body',
                        parameters: [{ type: 'text', text: String(message).slice(0, 1024) }]
                    }]
                }
            }),
            signal: AbortSignal.timeout(10000)
        }
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error?.message || `Meta Graph API returned HTTP ${response.status}.`);
    }
    return true;
}