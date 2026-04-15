import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    filePaths: string[];
    onConfirm: (permanentDelete: boolean) => void;
    onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    isOpen,
    filePaths,
    onConfirm,
    onCancel
}) => {
    const [isPermanentDelete, setIsPermanentDelete] = useState(false);
    const fileCount = filePaths.length;
    const previewPaths = filePaths.slice(0, 3);
    const remainingCount = Math.max(0, fileCount - previewPaths.length);

    // ダイアログが閉じたらチェックボックスをリセット
    useEffect(() => {
        if (!isOpen) {
            setIsPermanentDelete(false);
        }
    }, [isOpen]);

    // Enter キーで確定
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm(isPermanentDelete);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isPermanentDelete, onConfirm]);

    return (
        <Dialog isOpen={isOpen} onClose={onCancel} maxWidth="md">
            <Dialog.Header>
                <h2 className="text-lg font-semibold text-surface-100">ファイルの削除</h2>
            </Dialog.Header>

            <Dialog.Body>
                <p className="text-surface-200 mb-2">
                    {fileCount > 1 ? `選択した ${fileCount} 件のファイルを削除しますか？` : 'このファイルを削除しますか？'}
                </p>

                <div className="text-sm text-surface-400 mb-4 break-all bg-surface-900 p-2 rounded border border-surface-700 space-y-2">
                    {previewPaths.map((filePath) => (
                        <p key={filePath}>{filePath}</p>
                    ))}
                    {remainingCount > 0 && (
                        <p className="text-surface-500">...ほか {remainingCount} 件</p>
                    )}
                </div>

                <Checkbox
                    checked={isPermanentDelete}
                    onChange={(e) => setIsPermanentDelete(e.target.checked)}
                    label="完全に削除する（ゴミ箱を経由しない）"
                    className="hover:bg-surface-700/30 p-2 rounded transition-colors"
                />
            </Dialog.Body>

            <Dialog.Footer>
                <Button variant="secondary" size="lg" onClick={onCancel}>
                    キャンセル
                </Button>
                <Button variant="danger" size="lg" onClick={() => onConfirm(isPermanentDelete)}>
                    削除
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
};
