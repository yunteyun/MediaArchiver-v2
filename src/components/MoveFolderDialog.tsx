import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { FolderTree } from './FolderTree';
import {
    FOLDER_PREFIX,
    VIRTUAL_FOLDER_PREFIX,
    VIRTUAL_FOLDER_RECURSIVE_PREFIX,
} from './sidebar/sidebarShared';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

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
    const [folderRecursiveCountsByPath, setFolderRecursiveCountsByPath] = useState<Record<string, number>>({});
    const [selectedFolderSelection, setSelectedFolderSelection] = useState<string | null>(null);

    const loadFolders = useCallback(async () => {
        const [registeredFolders, treeStats] = await Promise.all([
            window.electronAPI.getFolders(),
            window.electronAPI.getFolderTreeStats({ includeDiskPaths: true }),
        ]);
        const folderPaths = treeStats?.paths ?? [];

        setFolders(buildMoveDialogFolders(registeredFolders, folderPaths));
        setFolderRecursiveCountsByPath(treeStats?.recursiveCountsByPath ?? {});
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

    return (
        <Dialog isOpen={isOpen} onClose={onClose} maxWidth="lg">
            <Dialog.Header>
                <h2 className="text-lg font-bold text-white">移動先フォルダを選択</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X size={20} />
                </Button>
            </Dialog.Header>

            <Dialog.Body className="max-h-[400px]">
                <FolderTree
                    folders={folders}
                    folderRecursiveCountsByPath={folderRecursiveCountsByPath}
                    currentFolderId={selectedFolderSelection}
                    onSelectFolder={setSelectedFolderSelection}
                    collapsed={false}
                />
            </Dialog.Body>

            <Dialog.Footer>
                <Button variant="secondary" size="lg" onClick={onClose}>
                    キャンセル
                </Button>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleMove}
                    disabled={!selectedFolderSelection}
                >
                    移動
                </Button>
            </Dialog.Footer>
        </Dialog>
    );
});

MoveFolderDialog.displayName = 'MoveFolderDialog';
