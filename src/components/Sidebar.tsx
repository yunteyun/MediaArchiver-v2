import React, { useEffect, useState, useCallback } from 'react';
import { Folder, Plus } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import type { MediaFolder } from '../types/file';

export const Sidebar = React.memo(() => {
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);
    const [folders, setFolders] = useState<MediaFolder[]>([]);

    const loadFolders = useCallback(async () => {
        try {
            const list = await window.electronAPI.getFolders();
            setFolders(list);
        } catch (e) {
            console.error('Failed to load folders:', e);
        }
    }, []);

    useEffect(() => {
        loadFolders();
    }, [loadFolders]);

    const handleAddFolder = useCallback(async () => {
        try {
            const path = await window.electronAPI.selectFolder();
            if (path) {
                await window.electronAPI.addFolder(path);
                await window.electronAPI.scanFolder(path);
                loadFolders();
            }
        } catch (e) {
            console.error('Error adding folder:', e);
        }
    }, [loadFolders]);

    const handleSelectFolder = useCallback(async (folderId: string) => {
        setCurrentFolderId(folderId);
        try {
            const files = await window.electronAPI.getFiles(folderId);
            setFiles(files);
        } catch (e) {
            console.error('Error loading files:', e);
        }
    }, [setCurrentFolderId, setFiles]);

    return (
        <aside className="w-64 bg-surface-900 border-r border-surface-700 flex flex-col h-full">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center">
                <h2 className="font-bold text-white">Library</h2>
                <button
                    onClick={handleAddFolder}
                    className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                    title="フォルダを追加"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {folders.length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-4">
                        フォルダがありません
                    </p>
                ) : (
                    folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => handleSelectFolder(folder.id)}
                            className={`
                                flex items-center gap-2 p-2 rounded cursor-pointer mb-1 transition-colors
                                ${currentFolderId === folder.id
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-surface-800 text-surface-300'}
                            `}
                        >
                            <Folder size={16} className="flex-shrink-0" />
                            <span className="truncate text-sm" title={folder.path}>
                                {folder.name}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';
