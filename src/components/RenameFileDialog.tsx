import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

interface RenameFileDialogProps {
    isOpen: boolean;
    currentName: string;
    currentPath: string;
    suggestedName: string;
    onConfirm: (nextName: string) => void;
    onCancel: () => void;
}

/** 拡張子を分離する。拡張子がない場合は ext を空文字で返す */
function splitNameAndExt(fileName: string): { baseName: string; ext: string } {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
        return { baseName: fileName, ext: '' };
    }
    return {
        baseName: fileName.slice(0, lastDotIndex),
        ext: fileName.slice(lastDotIndex),
    };
}

export const RenameFileDialog: React.FC<RenameFileDialogProps> = ({
    isOpen,
    currentName,
    currentPath,
    suggestedName,
    onConfirm,
    onCancel,
}) => {
    const { baseName: currentBaseName, ext: currentExt } = splitNameAndExt(currentName);
    const [nextBaseName, setNextBaseName] = useState(currentBaseName);
    const [nextExt, setNextExt] = useState(currentExt);
    const baseNameInputRef = useRef<HTMLInputElement>(null);
    const renameQuickTexts = useSettingsStore((s) => s.renameQuickTexts);

    useEffect(() => {
        if (!isOpen) return;
        const { baseName, ext } = splitNameAndExt(currentName);
        setNextBaseName(baseName);
        setNextExt(ext);
    }, [currentName, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const input = baseNameInputRef.current;
        if (!input) return;

        const rafId = window.requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(0, input.value.length);
        });

        return () => window.cancelAnimationFrame(rafId);
    }, [currentName, isOpen]);

    const fullNextName = nextBaseName + nextExt;
    const normalizedCurrentPath = currentPath.replace(/\\/g, '/');
    const parentPath = normalizedCurrentPath.includes('/')
        ? normalizedCurrentPath.slice(0, normalizedCurrentPath.lastIndexOf('/'))
        : '';
    const nextPathPreview = parentPath ? `${parentPath}/${fullNextName}` : fullNextName;

    const suggestedBaseName = suggestedName
        ? splitNameAndExt(suggestedName).baseName
        : '';

    const handleConfirm = useCallback(() => onConfirm(fullNextName), [onConfirm, fullNextName]);

    /** カーソル位置にテキストを挿入する */
    const insertTextAtCursor = (text: string) => {
        const input = baseNameInputRef.current;
        if (!input) {
            setNextBaseName((prev) => prev + text);
            return;
        }
        const start = input.selectionStart ?? nextBaseName.length;
        const end = input.selectionEnd ?? nextBaseName.length;
        const newValue = nextBaseName.slice(0, start) + text + nextBaseName.slice(end);
        setNextBaseName(newValue);
        const newCursorPos = start + text.length;
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(newCursorPos, newCursorPos);
        });
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel, handleConfirm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-surface-700 bg-surface-800 p-6 shadow-xl">
                <h2 className="mb-4 text-lg font-semibold text-surface-100">ファイル名を変更</h2>
                {suggestedBaseName && suggestedBaseName !== currentBaseName && (
                    <button
                        type="button"
                        onClick={() => setNextBaseName(suggestedBaseName)}
                        className="mb-3 rounded border border-surface-600 bg-surface-900 px-3 py-2 text-left text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                        候補を使う: {suggestedBaseName}{currentExt}
                    </button>
                )}
                {/* ファイル名入力 + 拡張子入力 */}
                <div className="flex items-center gap-0">
                    <input
                        ref={baseNameInputRef}
                        type="text"
                        value={nextBaseName}
                        onChange={(e) => setNextBaseName(e.target.value)}
                        className={`min-w-0 flex-1 border border-surface-600 bg-surface-900 px-3 py-2 text-surface-100 outline-none transition focus:border-primary-500 ${
                            nextExt ? 'rounded-l border-r-0' : 'rounded'
                        }`}
                    />
                    {nextExt !== undefined && currentExt && (
                        <input
                            type="text"
                            value={nextExt}
                            onChange={(e) => setNextExt(e.target.value)}
                            className="w-24 shrink-0 rounded-r border border-surface-600 bg-surface-950 px-2 py-2 text-sm text-surface-400 outline-none transition focus:border-primary-500 focus:text-surface-100"
                        />
                    )}
                </div>
                {/* クイック挿入ボタン */}
                {renameQuickTexts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {renameQuickTexts.map((text) => (
                            <button
                                key={text}
                                type="button"
                                onClick={() => insertTextAtCursor(text)}
                                className="rounded border border-surface-600 bg-surface-900 px-2 py-0.5 text-xs text-surface-300 transition-colors hover:bg-surface-700 hover:text-surface-100"
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                )}
                <div className="mt-3 space-y-1 rounded border border-surface-700 bg-surface-900/60 p-3 text-xs text-surface-400">
                    <p>現在の名前: {currentName}</p>
                    <p>拡張子: {currentExt || 'なし'}</p>
                    <p className="break-all">変更後パス: {nextPathPreview}</p>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="rounded bg-surface-700 px-4 py-2 text-surface-100 transition-colors hover:bg-surface-600"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="rounded bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-500"
                    >
                        変更
                    </button>
                </div>
            </div>
        </div>
    );
};
