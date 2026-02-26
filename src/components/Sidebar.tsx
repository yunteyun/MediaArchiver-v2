import React, { useEffect, useState, useCallback } from 'react';
import { Folder, Plus, ChevronLeft, ChevronRight, Library, Copy, BarChart3, Settings, Loader2, SlidersHorizontal } from 'lucide-react';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { TagFilterPanel, TagManagerModal } from './tags';
import { FolderTree } from './FolderTree';
import { RatingFilterPanel } from './ratings/RatingFilterPanel';
import { FolderAutoScanSettingsDialog } from './FolderAutoScanSettingsDialog';
import { FolderScanSettingsManagerDialog } from './FolderScanSettingsManagerDialog';
import { AddFolderScanSettingsDialog, type AddFolderScanSettingsSubmit } from './AddFolderScanSettingsDialog';
import type { MediaFolder } from '../types/file';

// 特殊なフォルダID
const ALL_FILES_ID = '__all__';
export const DRIVE_PREFIX = '__drive:';
export const FOLDER_PREFIX = '__folder:';

export const Sidebar = React.memo(() => {
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const files = useFileStore((s) => s.files);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);

    const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const scanProgress = useUIStore((s) => s.scanProgress);
    const isScanProgressVisible = useUIStore((s) => s.isScanProgressVisible);
    const duplicateViewOpen = useUIStore((s) => s.duplicateViewOpen);
    const mainView = useUIStore((s) => s.mainView);

    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [tagManagerOpen, setTagManagerOpen] = useState(false);
    const [folderSettingsOpen, setFolderSettingsOpen] = useState(false);
    const [folderSettingsTarget, setFolderSettingsTarget] = useState<MediaFolder | null>(null);
    const [folderScanSettingsManagerOpen, setFolderScanSettingsManagerOpen] = useState(false);
    const [addFolderSettingsOpen, setAddFolderSettingsOpen] = useState(false);
    const [pendingAddFolderPath, setPendingAddFolderPath] = useState<string | null>(null);

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
                setPendingAddFolderPath(path);
                setAddFolderSettingsOpen(true);
            }
        } catch (e) {
            console.error('Error adding folder:', e);
        }
    }, [loadFolders]);

    const handleConfirmAddFolderSettings = useCallback(async (settings: AddFolderScanSettingsSubmit) => {
        if (!pendingAddFolderPath) return;

        try {
            const folder = await window.electronAPI.addFolder(pendingAddFolderPath);

            await Promise.all([
                window.electronAPI.setFolderAutoScan(folder.id, settings.autoScan),
                window.electronAPI.setFolderWatchNewFiles(folder.id, settings.watchNewFiles),
                window.electronAPI.setFolderScanFileTypeOverrides(folder.id, {
                    video: settings.fileTypeFilters.video,
                    image: settings.fileTypeFilters.image,
                    archive: settings.fileTypeFilters.archive,
                    audio: settings.fileTypeFilters.audio,
                }),
            ]);

            if (settings.startScanNow) {
                await window.electronAPI.scanFolder(pendingAddFolderPath);
            }

            setAddFolderSettingsOpen(false);
            setPendingAddFolderPath(null);
            void loadFolders();
        } catch (e) {
            console.error('Error applying add-folder scan settings:', e);
        }
    }, [pendingAddFolderPath, loadFolders]);

    const handleSelectFolder = useCallback(async (folderId: string | null) => {
        setCurrentFolderId(folderId);
        useUIStore.getState().closeDuplicateView(); // 重複ビューを閉じる
        useUIStore.getState().setMainView('grid');  // 統計ビューを閉じる
        try {
            let files;

            if (!folderId || folderId === ALL_FILES_ID) {
                // 全ファイル
                files = await window.electronAPI.getFiles();
            }
            else if (folderId.startsWith(DRIVE_PREFIX)) {
                // Phase 22-C: ドライブ配下の全ファイル
                const drive = folderId.slice(DRIVE_PREFIX.length);
                files = await window.electronAPI.getFilesByDrive(drive);
            }
            else if (folderId.startsWith(FOLDER_PREFIX)) {
                // Phase 22-C: フォルダ配下の全ファイル（再帰）
                const actualId = folderId.slice(FOLDER_PREFIX.length);
                files = await window.electronAPI.getFilesByFolderRecursive(actualId);
            }
            else {
                // 通常のフォルダ（直下のみ）
                files = await window.electronAPI.getFiles(folderId);
            }

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

        // 起動直後/プロファイル切替直後:
        // 見た目上は「すべてのファイル」選択状態（currentFolderId=null）なので、
        // 実データも全件ロードしてフィルター対象を一致させる。
        if (currentFolderId === null && files.length === 0) {
            void handleSelectFolder(ALL_FILES_ID);
        }

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
    }, [loadFolders, currentFolderId, files.length, setCurrentFolderId, setFiles, handleSelectFolder]);


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
                {!sidebarCollapsed && <h2 className="text-sm font-semibold text-white truncate tracking-wide">ライブラリ</h2>}

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
                        ${(currentFolderId === ALL_FILES_ID || currentFolderId === null)
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-surface-800 text-surface-300'}
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="すべてのファイル"
                >
                    <Library size={18} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                        <>
                            <span className="truncate text-sm font-medium">
                                すべてのファイル
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFolderScanSettingsManagerOpen(true);
                                }}
                                className={`ml-auto rounded p-1 transition-colors ${(currentFolderId === ALL_FILES_ID || currentFolderId === null)
                                    ? 'hover:bg-blue-500/40'
                                    : 'hover:bg-surface-700'}`}
                                title="フォルダ別スキャン設定（一覧管理）"
                                aria-label="フォルダ別スキャン設定（一覧管理）"
                            >
                                <SlidersHorizontal size={14} className={(currentFolderId === ALL_FILES_ID || currentFolderId === null) ? 'text-blue-100' : 'text-surface-400'} />
                            </button>
                        </>
                    )}
                </div>

                {/* セパレーター */}
                {folders.length > 0 && (
                    <div className="border-t border-surface-700 my-2" />
                )}

                {/* フォルダツリー（Phase 22） */}
                {folders.length === 0 ? (
                    !sidebarCollapsed && (
                        <p className="text-surface-500 text-sm text-center py-4">
                            フォルダがありません
                        </p>
                    )
                ) : (
                    <FolderTree
                        folders={folders}
                        currentFolderId={currentFolderId}
                        onSelectFolder={handleSelectFolder}
                        collapsed={sidebarCollapsed}
                        onOpenFolderSettings={(folder) => {
                            setFolderSettingsTarget(folder);
                            setFolderSettingsOpen(true);
                        }}
                    />
                )}

                {/* Tag Filter Panel */}
                {!sidebarCollapsed && (
                    <>
                        <TagFilterPanel onOpenManager={() => setTagManagerOpen(true)} />
                        <RatingFilterPanel />
                    </>
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
                        ${duplicateViewOpen
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-surface-800 text-surface-300'}
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="重複ファイルを検出"
                >
                    <Copy size={18} className="flex-shrink-0 text-current" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm font-medium">重複チェック</span>
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
                        ${mainView === 'statistics'
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-surface-800 text-surface-300'}
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="ライブラリ統計"
                >
                    <BarChart3 size={18} className="flex-shrink-0 text-current" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm font-medium">統計</span>
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
                    <Settings size={18} className="flex-shrink-0 text-current" />
                    {!sidebarCollapsed && (
                        <span className="truncate text-sm font-medium">設定</span>
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
                        <Loader2 size={18} className="flex-shrink-0 animate-spin" />
                        {!sidebarCollapsed && (
                            <span className="truncate text-sm font-medium">スキャン中...</span>
                        )}
                    </div>
                )}
            </div>

            {/* Tag Manager Modal */}
            <TagManagerModal isOpen={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />
            <FolderAutoScanSettingsDialog
                isOpen={folderSettingsOpen}
                folder={folderSettingsTarget}
                onClose={() => setFolderSettingsOpen(false)}
                onSaved={() => {
                    void loadFolders();
                }}
            />
            <FolderScanSettingsManagerDialog
                isOpen={folderScanSettingsManagerOpen}
                onClose={() => setFolderScanSettingsManagerOpen(false)}
            />
            <AddFolderScanSettingsDialog
                isOpen={addFolderSettingsOpen}
                folderPath={pendingAddFolderPath}
                onClose={() => {
                    setAddFolderSettingsOpen(false);
                    setPendingAddFolderPath(null);
                }}
                onSubmit={(settings) => { void handleConfirmAddFolderSettings(settings); }}
            />
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

