import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { FolderTree } from './FolderTree';
import { buildParentMap, getDescendantFolderIds } from '../utils/buildFolderTree';

interface MoveFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (targetFolderId: string) => void;
    currentFolderId?: string;  // 除外用
}

export const MoveFolderDialog = React.memo(({
    isOpen,
    onClose,
    onMove,
    currentFolderId
}: MoveFolderDialogProps) => {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadFolders();
        }
    }, [isOpen, currentFolderId]);

    const loadFolders = useCallback(async () => {
        const list = await window.electronAPI.getFolders();

        if (currentFolderId) {
            // 🔒 自分自身と子孫を除外
            const parentMap = buildParentMap(list);
            const descendants = getDescendantFolderIds(currentFolderId, parentMap);
            const excludeIds = new Set([currentFolderId, ...descendants]);

            const filtered = list.filter(f => !excludeIds.has(f.id));
            setFolders(filtered);
        } else {
            setFolders(list);
        }
    }, [currentFolderId]);

    const handleMove = useCallback(() => {
        if (selectedFolderId) {
            onMove(selectedFolderId);
            onClose();
        }
    }, [selectedFolderId, onMove, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface-900 rounded-lg shadow-xl w-[500px] max-h-[600px] flex flex-col">
                {/* ヘッダー */}
                <div className="flex items-center justify-between p-4 border-b border-surface-700">
                    <h2 className="text-lg font-bold text-white">移動先フォルダを選択</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-surface-700 rounded transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="flex-1 overflow-y-auto p-4">
                    <FolderTree
                        folders={folders}
                        currentFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        collapsed={false}
                    />
                </div>

                {/* フッター */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-surface-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-surface-700 hover:bg-surface-600 transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleMove}
                        disabled={!selectedFolderId}
                        className="px-4 py-2 rounded bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        移動
                    </button>
                </div>
            </div>
        </div>
    );
});

MoveFolderDialog.displayName = 'MoveFolderDialog';
