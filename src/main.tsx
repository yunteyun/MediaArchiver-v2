import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
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
