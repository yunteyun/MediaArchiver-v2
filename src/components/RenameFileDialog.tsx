import React, { useEffect, useRef, useState } from 'react';
import { getEditableNameSelectionRange } from '../utils/fileNameSelection';

interface RenameFileDialogProps {
    isOpen: boolean;
    currentName: string;
    currentPath: string;
    suggestedName: string;
    onConfirm: (nextName: string) => void;
    onCancel: () => void;
}

export const RenameFileDialog: React.FC<RenameFileDialogProps> = ({
    isOpen,
    currentName,
    currentPath,
    suggestedName,
    onConfirm,
    onCancel,
}) => {
    const [nextName, setNextName] = useState(currentName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setNextName(currentName);
    }, [currentName, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const input = inputRef.current;
        if (!input) return;

        const selection = getEditableNameSelectionRange(currentName);
        const rafId = window.requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(selection.start, selection.end);
        });

        return () => window.cancelAnimationFrame(rafId);
    }, [currentName, isOpen]);

    const normalizedCurrentPath = currentPath.replace(/\\/g, '/');
    const parentPath = normalizedCurrentPath.includes('/')
        ? normalizedCurrentPath.slice(0, normalizedCurrentPath.lastIndexOf('/'))
        : '';
    const currentExt = currentName.includes('.') ? currentName.slice(currentName.lastIndexOf('.')) : '';
    const nextPathPreview = parentPath ? `${parentPath}/${nextName}` : nextName;

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm(nextName);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, nextName, onCancel, onConfirm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg border border-surface-700 bg-surface-800 p-6 shadow-xl">
                <h2 className="mb-4 text-lg font-semibold text-surface-100">ファイル名を変更</h2>
                {suggestedName && suggestedName !== currentName && (
                    <button
                        type="button"
                        onClick={() => setNextName(suggestedName)}
                        className="mb-3 rounded border border-surface-600 bg-surface-900 px-3 py-2 text-left text-sm text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
                    >
                        候補を使う: {suggestedName}
                    </button>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={nextName}
                    onChange={(e) => setNextName(e.target.value)}
                    className="w-full rounded border border-surface-600 bg-surface-900 px-3 py-2 text-surface-100 outline-none transition focus:border-primary-500"
                />
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
                        onClick={() => onConfirm(nextName)}
                        className="rounded bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-500"
                    >
                        変更
                    </button>
                </div>
            </div>
        </div>
    );
};
