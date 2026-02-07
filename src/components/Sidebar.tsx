import React, { useEffect, useState, useCallback } from 'react';
import { Folder, Plus, ChevronLeft, ChevronRight, Library, Copy, BarChart3, Settings, Loader2 } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { TagFilterPanel, TagManagerModal } from './tags';
import type { MediaFolder } from '../types/file';

// 特殊なフォルダID
const ALL_FILES_ID = '__all__';

export const Sidebar = React.memo(() => {
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);

    const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const scanProgress = useUIStore((s) => s.scanProgress);
    const isScanProgressVisible = useUIStore((s) => s.isScanProgressVisible);

    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [tagManagerOpen, setTagManagerOpen] = useState(false);

    const loadFolders = useCallback(async () => {
        try {
            const list = await window.electronAPI.getFolders();
            setFolders(list);
        } catch (e) {
            console.error('Failed to load folders:', e);
        }
    }, []);



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

    const handleSelectFolder = useCallback(async (folderId: string | null) => {
        setCurrentFolderId(folderId);
        useUIStore.getState().closeDuplicateView(); // 重複ビューを閉じる
        useUIStore.getState().setMainView('grid');  // 統計ビューを閉じる
        try {
            // folderId が null または ALL_FILES_ID の場合は全ファイル取得
            const queryFolderId = folderId === ALL_FILES_ID ? undefined : folderId ?? undefined;
            console.log('Frontend: Requesting files for', queryFolderId ?? 'all');
            const files = await window.electronAPI.getFiles(queryFolderId);
            console.log('Frontend: Received files:', files.length);
            setFiles(files);
        } catch (e) {
            console.error('Error loading files:', e);
        }
    }, [setCurrentFolderId, setFiles]);

    // 「すべてのファイル」を選択
    const handleSelectAllFiles = useCallback(() => {
        handleSelectFolder(ALL_FILES_ID);
    }, [handleSelectFolder]);

    useEffect(() => {
        loadFolders();

        const cleanupDelete = window.electronAPI.onFolderDeleted((folderId) => {
            console.log('Folder deleted:', folderId);
            loadFolders();
            if (currentFolderId === folderId) {
                setCurrentFolderId(null);
                setFiles([]);
            }
        });

        const cleanupRescan = window.electronAPI.onFolderRescanComplete((folderId) => {
            console.log('Folder rescan complete:', folderId);
            // 現在のフォルダまたは「すべて」表示中ならリロード
            if (currentFolderId === folderId || currentFolderId === ALL_FILES_ID) {
                handleSelectFolder(currentFolderId);
            }
        });

        return () => {
            cleanupDelete();
            cleanupRescan();
        };
    }, [loadFolders, currentFolderId, setCurrentFolderId, setFiles, handleSelectFolder]);


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
                {/* すべてのファイル */}
                <div
                    onClick={handleSelectAllFiles}
                    className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer mb-2 transition-colors
                        ${currentFolderId === ALL_FILES_ID
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-surface-800 text-surface-300'}
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="すべてのファイル"
                >
                    <Library size={20} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm font-medium">
                            すべてのファイル
                        </span>
                    )}
                </div>

                {/* セパレーター */}
                {folders.length > 0 && (
                    <div className="border-t border-surface-700 my-2" />
                )}

                {/* フォルダリスト */}
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
                            onContextMenu={(e) => {
                                e.preventDefault();
                                window.electronAPI.showFolderContextMenu(folder.id, folder.path);
                            }}
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

                {/* Tag Filter Panel */}
                {!sidebarCollapsed && (
                    <TagFilterPanel onOpenManager={() => setTagManagerOpen(true)} />
                )}

                {/* 重複ファイルチェック */}
                <div className="border-t border-surface-700 my-2" />
                <div
                    onClick={() => {
                        setCurrentFolderId(null);
                        useUIStore.getState().openDuplicateView();
                        useUIStore.getState().setMainView('grid');
                    }}
                    className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                        hover:bg-surface-800 text-surface-300
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="重複ファイルを検出"
                >
                    <Copy size={20} className="flex-shrink-0 text-primary-400" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm">重複チェック</span>
                    )}
                </div>

                {/* 統計 */}
                <div
                    onClick={() => {
                        useUIStore.getState().closeDuplicateView();
                        useUIStore.getState().setMainView('statistics');
                    }}
                    className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                        ${useUIStore.getState().mainView === 'statistics'
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-surface-800 text-surface-300'}
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="ライブラリ統計"
                >
                    <BarChart3 size={20} className="flex-shrink-0 text-primary-400" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm">統計</span>
                    )}
                </div>

                {/* 設定 */}
                <div
                    onClick={() => useUIStore.getState().openSettingsModal()}
                    className={`
                        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                        hover:bg-surface-800 text-surface-300
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="設定"
                >
                    <Settings size={20} className="flex-shrink-0 text-primary-400" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm">設定</span>
                    )}
                </div>

                {/* スキャンインジケーター（スキャン中 & 非表示の場合のみ） */}
                {scanProgress && scanProgress.phase !== 'complete' && scanProgress.phase !== 'error' && !isScanProgressVisible && (
                    <div
                        onClick={() => useUIStore.getState().setScanProgressVisible(true)}
                        className={`
                            flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                            hover:bg-surface-800 text-blue-400
                            ${sidebarCollapsed ? 'justify-center' : ''}
                        `}
                        title="スキャン中 - クリックで表示"
                    >
                        <Loader2 size={20} className="flex-shrink-0 animate-spin" />
                        {!sidebarCollapsed && (
                            <span className="truncate text-sm">スキャン中...</span>
                        )}
                    </div>
                )}
            </div>

            {/* Tag Manager Modal */}
            <TagManagerModal isOpen={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

