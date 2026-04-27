import { useEffect, useRef } from 'react';

export interface MpvKeyboardActions {
    togglePause: () => void;
    seek: (sec: number) => void;
    currentTime: number;
    volume: number;
    onVolumeChange: (v: number) => void;
    onToggleMute: () => void;
    onToggleFullscreen: () => void;
    onClose?: () => void;
}

export function useMpvKeyboard(actions: MpvKeyboardActions): void {
    // ref でキャプチャすることで、リスナーの再登録なしに最新の actions を参照できる
    const actionsRef = useRef(actions);
    actionsRef.current = actions;

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const a = actionsRef.current;
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    a.togglePause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    a.seek(Math.max(0, a.currentTime - 10));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    a.seek(a.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    a.onVolumeChange(Math.min(1, a.volume + 0.05));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    a.onVolumeChange(Math.max(0, a.volume - 0.05));
                    break;
                case 'm':
                case 'M':
                    a.onToggleMute();
                    break;
                case 'f':
                case 'F':
                    a.onToggleFullscreen();
                    break;
                case 'Escape':
                    if (a.onClose) a.onClose();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []); // actionsRef は stable なので deps 不要
}
