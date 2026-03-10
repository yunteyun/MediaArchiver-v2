import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { FolderTree } from './FolderTree';
import {
    FOLDER_PREFIX,
    VIRTUAL_FOLDER_PREFIX,
    VIRTUAL_FOLDER_RECURSIVE_PREFIX,
} from './sidebar/sidebarShared';

interface MoveTargetSelection {
    targetFolderId?: string;
    targetFolderPath?: string;
}

interface MoveFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (selection: MoveTargetSelection) => void;
}

function buildMoveDialogFolders(registeredFolders: MediaFolder[], folderPaths: string[]): MediaFolder[] {
    const byPath = new Map<string, MediaFolder>();
    const normalizedRegistered = registeredFolders.map((folder) => {
        const normalized: MediaFolder = {
            ...folder,
            createdAt: folder.createdAt ?? 0,
            parentId: folder.parentId ?? null,
        };
        byPath.set(normalized.path.toLowerCase(), normalized);
        return normalized;
    });

    const virtualFolders: MediaFolder[] = [];
    const sortedPaths = [...folderPaths]
        .filter((folderPath) => typeof folderPath === 'string' && folderPath.trim().length > 0)
        .sort((a, b) => {
            const depthDiff = a.split(/[\\/]/).length - b.split(/[\\/]/).length;
            if (depthDiff !== 0) return depthDiff;
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });

    sortedPaths.forEach((folderPath) => {
        const key = folderPath.toLowerCase();
        if (byPath.has(key)) {
            return;
        }

        const parentPath = folderPath.replace(/[\\/]+$/, '').split(/[\\/]/).slice(0, -1).join('\\');
        const parent = parentPath ? byPath.get(parentPath.toLowerCase()) : undefined;
        const driveMatch = folderPath.match(/^[A-Z]:/i);
        const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
        const virtualFolder: MediaFolder = {
            id: `virtual:${folderPath}`,
            name,
            path: folderPath,
            createdAt: 0,
            parentId: parent?.id ?? null,
            drive: driveMatch ? driveMatch[0].toUpperCase() : '/',
            isVirtualFolder: true,
        };
        byPath.set(key, virtualFolder);
        virtualFolders.push(virtualFolder);
    });

    return [...normalizedRegistered, ...virtualFolders];
}

function parseMoveTargetSelection(selection: string | null): MoveTargetSelection | null {
    if (!selection) return null;
    if (selection.startsWith(VIRTUAL_FOLDER_PREFIX)) {
        return { targetFolderPath: selection.slice(VIRTUAL_FOLDER_PREFIX.length) };
    }
    if (selection.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX)) {
        return { targetFolderPath: selection.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length) };
    }
    if (selection.startsWith(FOLDER_PREFIX)) {
        return { targetFolderId: selection.slice(FOLDER_PREFIX.length) };
    }
    return { targetFolderId: selection };
}

export const MoveFolderDialog = React.memo(({
    isOpen,
    onClose,
    onMove,
}: MoveFolderDialogProps) => {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [selectedFolderSelection, setSelectedFolderSelection] = useState<string | null>(null);

    const loadFolders = useCallback(async () => {
        const [registeredFolders, folderPaths] = await Promise.all([
            window.electronAPI.getFolders(),
            window.electronAPI.getFolderTreePaths(),
        ]);

        setFolders(buildMoveDialogFolders(registeredFolders, folderPaths));
        setSelectedFolderSelection(null);
    }, []);

    useEffect(() => {
        if (isOpen) {
            void loadFolders();
        }
    }, [isOpen, loadFolders]);

    const handleMove = useCallback(() => {
        const selection = parseMoveTargetSelection(selectedFolderSelection);
        if (selection) {
            onMove(selection);
            onClose();
        }
    }, [selectedFolderSelection, onMove, onClose]);

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
                        currentFolderId={selectedFolderSelection}
                        onSelectFolder={setSelectedFolderSelection}
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
                        disabled={!selectedFolderSelection}
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
