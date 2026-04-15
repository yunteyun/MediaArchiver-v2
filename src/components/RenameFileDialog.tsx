import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

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

    // Enter キーで確定
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleConfirm]);

    return (
        <Dialog isOpen={isOpen} onClose={onCancel} maxWidth="md">
            <Dialog.Header>
                <h2 className="text-lg font-semibold text-surface-100">ファイル名を変更</h2>
            </Dialog.Header>

            <Dialog.Body>
                {suggestedBaseName && suggestedBaseName !== currentBaseName && (
                    <button
                        type="button"
                        onClick={() => setNextBaseName(suggestedBaseName)}
                        className="mb-3 rounded border border-surface-600 bg-surface-900 px-3 py-2 text-left text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                        候補を使う: {suggestedBaseName}{currentExt}
                    </button>
                )}
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
                {renameQuickTexts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {renameQuickTexts.map((text) => (
                            <Button
                                key={text}
                                variant="secondary"
                                size="xs"
                                onClick={() => insertTextAtCursor(text)}
                            >
                                {text}
                            </Button>
                        ))}
                    </div>
                )}
                <div className="mt-3 space-y-1 rounded border border-surface-700 bg-surface-900/60 p-3 text-xs text-surface-400">
                    <p>現在の名前: {currentName}</p>
                    <p>拡張子: {currentExt || 'なし'}</p>
                    <p className="break-all">変更後パス: {nextPathPreview}</p>
                </div>
            </Dialog.Body>

            <Dialog.Footer>
                <Button variant="secondary" size="lg" onClick={onCancel}>
                    キャンセル
                </Button>
                <Button variant="primary" size="lg" onClick={handleConfirm}>
                    変更
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
};
