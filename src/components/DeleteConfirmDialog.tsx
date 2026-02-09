import React, { useState, useEffect } from 'react';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    filePath: string;
    onConfirm: (permanentDelete: boolean) => void;
    onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    isOpen,
    filePath,
    onConfirm,
    onCancel
}) => {
    const [isPermanentDelete, setIsPermanentDelete] = useState(false);

    // ダイアログが閉じたらチェックボックスをリセット
    useEffect(() => {
        if (!isOpen) {
            setIsPermanentDelete(false);
        }
    }, [isOpen]);

    // キーボード操作
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm(isPermanentDelete);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isPermanentDelete, onConfirm, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50">
            <div className="bg-surface-800 rounded-lg p-6 max-w-md w-full mx-4 border border-surface-700 shadow-xl">
                {/* タイトル */}
                <h2 className="text-lg font-semibold mb-4 text-surface-100">ファイルの削除</h2>

                {/* メッセージ */}
                <p className="text-surface-200 mb-2">このファイルを削除しますか？</p>

                {/* ファイルパス */}
                <p className="text-sm text-surface-400 mb-4 break-all bg-surface-900 p-2 rounded border border-surface-700">
                    {filePath}
                </p>

                {/* チェックボックス */}
                <label className="flex items-center gap-2 mb-6 cursor-pointer hover:bg-surface-700/30 p-2 rounded transition-colors">
                    <input
                        type="checkbox"
                        checked={isPermanentDelete}
                        onChange={(e) => setIsPermanentDelete(e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-surface-200">
                        完全に削除する（ゴミ箱を経由しない）
                    </span>
                </label>

                {/* ボタン */}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded bg-surface-700 hover:bg-surface-600 transition-colors text-surface-100"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onConfirm(isPermanentDelete)}
                        className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors text-white font-medium"
                    >
                        削除
                    </button>
                </div>
            </div>
        </div>
    );
};
