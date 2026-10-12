import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/* The retired community mock-up kept its state in localStorage and planted a
   placeholder `workshop_jwt` that the API cannot verify. Clear what it left
   behind on returning visitors' devices. */
try {
    ['session_v2', 'messages_v1', 'endorsements_v1', 'pins_v1', 'praise_v1'].forEach((key) =>
        localStorage.removeItem(`asterix_community_${key}`)
    );
    if (localStorage.getItem('workshop_jwt') === 'community_synced_token') {
        localStorage.removeItem('workshop_jwt');
    }
} catch {
    /* Storage blocked (private mode); nothing to clear. */
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);
