import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutHandlers {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onCtrlA?: () => void;
    onCtrlF?: () => void;
    onCtrlComma?: () => void;
    onDigit?: (digit: number) => void;
}

/**
 * グローバルキーボードショートカットを管理するフック
 * 入力フォーム（INPUT/TEXTAREA）でのガード処理を含む
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputElement = ['INPUT', 'TEXTAREA'].includes(target.tagName);

        // 入力フォームでは Escape と Ctrl+系以外は無視
        if (isInputElement && e.key !== 'Escape' && !e.ctrlKey && !e.metaKey) {
            return;
        }

        // Ctrl+F: 検索フォーカス（常時有効）
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            handlers.onCtrlF?.();
            return;
        }

        // Ctrl+,: 設定モーダル（常時有効）
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            handlers.onCtrlComma?.();
            return;
        }

        // Ctrl+A: 全選択
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInputElement) {
            e.preventDefault();
            handlers.onCtrlA?.();
            return;
        }

        // 入力フォームでは以下のショートカットを無視
        if (isInputElement) {
            if (e.key === 'Escape') {
                handlers.onEscape?.();
                (target as HTMLInputElement).blur();
            }
            return;
        }

        // 矢印キー
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                handlers.onArrowUp?.();
                break;
            case 'ArrowDown':
                e.preventDefault();
                handlers.onArrowDown?.();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                handlers.onArrowLeft?.();
                break;
            case 'ArrowRight':
                e.preventDefault();
                handlers.onArrowRight?.();
                break;
            case 'Enter':
                e.preventDefault();
                handlers.onEnter?.();
                break;
            case ' ':
                e.preventDefault();
                handlers.onSpace?.();
                break;
            case 'Escape':
                handlers.onEscape?.();
                break;
        }

        // 数字キー（1-9）
        if (e.key >= '1' && e.key <= '9') {
            handlers.onDigit?.(parseInt(e.key, 10));
        }
    }, [handlers]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
