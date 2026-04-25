import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { MpvWindow } from './features/mpv-window/MpvWindow';

const isMpvWindow = window.location.hash === '#mpv-window';

if (isMpvWindow) {
    document.documentElement.classList.add('mpv-window');
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {isMpvWindow ? <MpvWindow /> : <App />}
    </StrictMode>,
);

const bootSplash = document.getElementById('boot-splash');
if (bootSplash) {
    window.requestAnimationFrame(() => {
        bootSplash.hidden = true;
        window.setTimeout(() => {
            bootSplash.remove();
        }, 180);
    });
}
