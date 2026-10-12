import { apiUrl } from '../../lib/api';
import { AUTH_TOKEN_KEY } from '../../context/WebsiteDataContext';

// Authenticated JSON requests for the admin views; failures throw the server's message.
async function adminRequest(path, { method = 'GET', body } = {}) {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('admin_token');
    const response = await fetch(apiUrl(path), {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || `Request failed (${response.status}).`);
        error.field = data.field;
        throw error;
    }
    return data;
}

export const adminGet = (path) => adminRequest(path);
export const adminSend = (path, method, body) => adminRequest(path, { method, body });
