import React, { useEffect, useState, useCallback } from 'react';
import { Folder, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import type { MediaFolder } from '../types/file';

export const Sidebar = React.memo(() => {
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);

    const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);

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
            console.log('Frontend: Requesting files for', folderId);
            const files = await window.electronAPI.getFiles(folderId);
            console.log('Frontend: Received files:', files.length);
            setFiles(files);
        } catch (e) {
            console.error('Error loading files:', e);
        }
    }, [setCurrentFolderId, setFiles]);

    return (
        <aside
            className={`
                bg-surface-900 border-r border-surface-700 flex flex-col h-full relative group/sidebar
                transition-all duration-300 ease-in-out
                ${sidebarCollapsed ? 'w-16' : 'w-64'}
            `}
        >
            {/* Toggle Button on the border */}
            <button
                onClick={toggleSidebar}
                className={`
                    absolute top-8 -right-3 z-20
                    p-1 rounded-full border border-surface-600
                    bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700
                    transition-colors shadow-md
                `}
                title={sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            >
                {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={`
                p-4 border-b border-surface-700 flex items-center
                ${sidebarCollapsed ? 'justify-center' : 'justify-between'}
            `}>
                {!sidebarCollapsed && <h2 className="font-bold text-white truncate">Library</h2>}

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
                    !sidebarCollapsed && (
                        <p className="text-surface-500 text-sm text-center py-4">
                            フォルダがありません
                        </p>
                    )
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
                                ${sidebarCollapsed ? 'justify-center' : ''}
                            `}
                            title={folder.path}
                        >
                            <Folder size={20} className="flex-shrink-0" />
                            {!sidebarCollapsed && (
                                <span className="truncate text-sm">
                                    {folder.name}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';
