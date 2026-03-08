import { Suspense, lazy, useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { ScanProgressBar } from './components/ScanProgressBar';
import { ToastContainer } from './components/Toast';
import { useProfileStore } from './stores/useProfileStore';
import { useFileStore } from './stores/useFileStore';
import { useTagStore } from './stores/useTagStore';
import { useUIStore } from './stores/useUIStore';
import { DEFAULT_PROFILE_FILE_TYPE_FILTERS, useSettingsStore } from './stores/useSettingsStore';
import { useToastStore } from './stores/useToastStore';
import { useRatingStore } from './stores/useRatingStore';
import { useDuplicateStore } from './stores/useDuplicateStore';
import { useDisplayPresetStore } from './stores/useDisplayPresetStore';
import {
    loadAndApplyProfileScopedSettings,
    resetStateForProfileSwitch,
    PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE,
} from './utils/profileLifecycle';

const StatisticsView = lazy(() => import('./components/StatisticsView').then((module) => ({ default: module.StatisticsView })));
const DuplicateView = lazy(() => import('./components/DuplicateView').then((module) => ({ default: module.DuplicateView })));
const RightPanel = lazy(() => import('./components/RightPanel').then((module) => ({ default: module.RightPanel })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then((module) => ({ default: module.ProfileModal })));
const DeleteConfirmDialog = lazy(() => import('./components/DeleteConfirmDialog').then((module) => ({ default: module.DeleteConfirmDialog })));
const RenameFileDialog = lazy(() => import('./components/RenameFileDialog').then((module) => ({ default: module.RenameFileDialog })));
const MoveFolderDialog = lazy(() => import('./components/MoveFolderDialog').then((module) => ({ default: module.MoveFolderDialog })));
const CenterViewerRoot = lazy(() => import('./features/center-viewer/CenterViewerRoot').then((module) => ({ default: module.CenterViewerRoot })));

function MainViewLoading({ label }: { label: string }) {
    return (
        <div className="flex h-full items-center justify-center bg-surface-950 text-surface-400">
            <p className="text-sm">{label}</p>
        </div>
    );
}

function OverlayLoading({ label }: { label: string }) {
    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 text-surface-200">
            <p className="rounded-md border border-surface-600 bg-surface-900/85 px-4 py-2 text-sm shadow-lg">
                {label}
            </p>
        </div>
    );
}

function App() {
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [renameDialogFileId, setRenameDialogFileId] = useState<string | null>(null);
    const [renameDialogCurrentName, setRenameDialogCurrentName] = useState('');
    const [renameDialogCurrentPath, setRenameDialogCurrentPath] = useState('');
    const [renameDialogSuggestedName, setRenameDialogSuggestedName] = useState('');
    const loadProfiles = useProfileStore((s) => s.loadProfiles);
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);
    const clearTagFilter = useTagStore((s) => s.clearTagFilter);
    const setScanProgress = useUIStore((s) => s.setScanProgress);
    const closeLightbox = useUIStore((s) => s.closeLightbox);
    const toasts = useToastStore((s) => s.toasts);
    const removeToast = useToastStore((s) => s.removeToast);
    const duplicateViewOpen = useUIStore((s) => s.duplicateViewOpen);
    const mainView = useUIStore((s) => s.mainView);
    const settingsModalOpen = useUIStore((s) => s.settingsModalOpen);
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const externalApps = useSettingsStore((s) => s.externalApps);
    const deleteDialogOpen = useUIStore((s) => s.deleteDialogOpen);
    const deleteDialogFilePath = useUIStore((s) => s.deleteDialogFilePath);
    const deleteDialogFileId = useUIStore((s) => s.deleteDialogFileId);
    const openDeleteDialog = useUIStore((s) => s.openDeleteDialog);
    const closeDeleteDialog = useUIStore((s) => s.closeDeleteDialog);
    // Phase 22-C-2
    const moveDialogOpen = useUIStore((s) => s.moveDialogOpen);
    const moveFileIds = useUIStore((s) => s.moveFileIds);
    const moveCurrentFolderId = useUIStore((s) => s.moveCurrentFolderId);
    const closeMoveDialog = useUIStore((s) => s.closeMoveDialog);
    // Phase 23: 右サイドパネル
    const isRightPanelOpen = useUIStore((s) => s.isRightPanelOpen);
    const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
    const applyListDisplayDefaults = useUIStore((s) => s.applyListDisplayDefaults);
    const clearSearchConditions = useUIStore((s) => s.clearSearchConditions);
    const loadDisplayPresets = useDisplayPresetStore((s) => s.loadDisplayPresets);
    const profileSettingsLoadSeqRef = useRef(0);

    useEffect(() => {
        // 設定は永続化されているので、初回マウント時にstoreから読み取り
        const settings = useSettingsStore.getState();
        // プレビューフレーム数をメインプロセスに同期
        window.electronAPI.setPreviewFrameCount(settings.previewFrameCount);
        // スキャン速度抑制をメインプロセスに同期
        window.electronAPI.setScanThrottleMs(settings.scanThrottleMs);
        // サムネイル解像度をメインプロセスに同期
        window.electronAPI.setThumbnailResolution(settings.thumbnailResolution);
        window.electronAPI.setScanFileTypeCategories(settings.profileFileTypeFilters).catch(console.error);
        window.electronAPI.setScanExclusionRules(settings.scanExclusionRules).catch(console.error);
        applyListDisplayDefaults({
            sortBy: settings.sortBy,
            sortOrder: settings.sortOrder,
            groupBy: settings.groupBy,
            displayMode: settings.displayMode,
            activeDisplayPresetId: settings.activeDisplayPresetId,
            thumbnailPresentation: settings.thumbnailPresentation,
        });
        clearSearchConditions(settings.defaultSearchTarget);
        void loadDisplayPresets();
    }, [applyListDisplayDefaults, clearSearchConditions, loadDisplayPresets]);

    const syncProfileScopedSettingsToScanner = useCallback(async (settings: {
        previewFrameCount: number;
        fileTypeFilters: { video: boolean; image: boolean; archive: boolean; audio: boolean };
        scanThrottleMs: number;
        thumbnailResolution: number;
    }) => {
        await Promise.all([
            window.electronAPI.setPreviewFrameCount(settings.previewFrameCount),
            window.electronAPI.setScanFileTypeCategories(settings.fileTypeFilters),
            window.electronAPI.setScanThrottleMs(settings.scanThrottleMs),
            window.electronAPI.setThumbnailResolution(settings.thumbnailResolution),
        ]);
    }, []);

    const loadAndApplyActiveProfileScopedSettings = useCallback(async () => {
        await loadAndApplyProfileScopedSettings({
            activeProfileId,
            profilesLength: profiles.length,
            nextSequence: () => ++profileSettingsLoadSeqRef.current,
            isCurrentSequence: (sequence) => sequence === profileSettingsLoadSeqRef.current,
            getSettingsSnapshot: () => {
                const settings = useSettingsStore.getState();
                return {
                    profileSettingsMigrationV1Done: settings.profileSettingsMigrationV1Done,
                    previewFrameCount: settings.previewFrameCount,
                    scanThrottleMs: settings.scanThrottleMs,
                    thumbnailResolution: settings.thumbnailResolution,
                };
            },
            fetchSettings: () => window.electronAPI.getProfileScopedSettings(),
            replaceSettings: (settings) => window.electronAPI.replaceProfileScopedSettings(settings),
            markMigrationDone: (done) => useSettingsStore.getState().setProfileSettingsMigrationV1Done(done),
            confirmMigration: (message) => window.confirm(message || PROFILE_SETTINGS_MIGRATION_CONFIRM_MESSAGE),
            applySettings: (settings) => useSettingsStore.getState().applyProfileScopedSettings(settings),
            syncSettings: syncProfileScopedSettingsToScanner,
            onError: (error) => {
                console.error('Failed to load/apply profile scoped settings:', error);
            },
        });
    }, [activeProfileId, profiles.length, syncProfileScopedSettingsToScanner]);

    // 外部アプリ設定を Electron 側に同期（起動時および変更時）
    useEffect(() => {
        window.electronAPI.setExternalApps(externalApps);
    }, [externalApps]);

    // 初回ロード：プロファイル一覧を取得
    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    useEffect(() => {
        void loadAndApplyActiveProfileScopedSettings();
    }, [loadAndApplyActiveProfileScopedSettings]);

    // 評価フィルター用キャッシュを起動時に一括ロード
    useEffect(() => {
        useRatingStore.getState().loadAllFileRatings().catch((e) => {
            console.error('Failed to preload rating cache:', e);
        });
    }, []);

    // 起動時自動スキャン（初回マウント時のみ）
    // 実際の対象は「フォルダ別設定で起動時スキャンONのフォルダ」のみ。
    useEffect(() => {
        // 少し遅延を入れてUIが準備できてから実行
        const timer = setTimeout(() => {
            window.electronAPI.autoScan().catch(console.error);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const settings = useSettingsStore.getState().storageMaintenanceSettings;
        if (!settings.autoCleanupOrphanedThumbnailsOnStartup) {
            return;
        }

        let cancelled = false;
        const thresholdBytes = settings.autoCleanupThresholdMb * 1024 * 1024;

        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const diagnostic = await window.electronAPI.diagnoseThumbnails();
                    if (cancelled || diagnostic.orphanedCount === 0) return;
                    if (diagnostic.totalOrphanedSize < thresholdBytes) return;

                    const cleanup = await window.electronAPI.cleanupOrphanedThumbnails();
                    if (cancelled || cleanup.deletedCount === 0) return;

                    const freedMb = (cleanup.freedBytes / 1024 / 1024).toFixed(2);
                    if (cleanup.success) {
                        useToastStore.getState().info(`起動時に孤立サムネイルを整理しました（${cleanup.deletedCount}件 / ${freedMb} MB）`, 5000);
                    } else {
                        useToastStore.getState().error('起動時のサムネイル自動整理で一部エラーが発生しました', 5000);
                    }
                } catch (error) {
                    console.error('Startup thumbnail cleanup failed:', error);
                }
            })();
        }, 1200);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    // スキャン進捗イベントを監視
    useEffect(() => {
        const success = useToastStore.getState().success;
        const error = useToastStore.getState().error;
        const cleanup = window.electronAPI.onScanProgress((progress) => {
            setScanProgress(progress);
            if (progress?.phase === 'complete' && progress.message === 'サムネイル再生成完了') {
                success('サムネイルを再生成しました');
            }
            else if (progress?.phase === 'complete') {
                success('スキャンが完了しました');
            }
            else if (progress?.phase === 'error' && progress.message?.includes('サムネイル再生成')) {
                error('サムネイルの再生成に失敗しました');
            }
            else if (progress?.phase === 'error') {
                error('スキャン中にエラーが発生しました');
            }
        });
        return cleanup;
    }, [setScanProgress]);

    // プロファイル切替イベントを監視
    useEffect(() => {
        const cleanup = window.electronAPI.onProfileSwitched((_profileId) => {
            // === プロファイル切替時の論理的アプリリセット ===
            // プロファイル切替は「DBの切替」ではなく「アプリ状態の完全分離境界」として扱う。
            // Zustand の state はメモリに残るため、明示的にリセットが必要。
            // 将来ストアが増えた場合はここに追加する。
            resetStateForProfileSwitch({
                setFiles,
                setCurrentFolderId,
                closeLightbox,
                clearTagFilter,
                clearRatingFilters: () => useRatingStore.getState().clearRatingFilters(),
                resetDuplicates: () => useDuplicateStore.getState().reset(),
                bumpRefreshKey: () => setRefreshKey((k) => k + 1),
                reloadRatings: () => useRatingStore.getState().loadAllFileRatings(),
                onReloadRatingsError: (error) => {
                    console.error('Failed to reload rating cache after profile switch:', error);
                },
            });
        });
        return cleanup;
    }, [setFiles, setCurrentFolderId, closeLightbox, clearTagFilter]);

    // Phase 22-C-2: ファイル移動ダイアログ開くイベント
    useEffect(() => {
        const cleanup = window.electronAPI.onOpenMoveDialog((data) => {
            const { openMoveDialog } = useUIStore.getState();
            openMoveDialog(data.fileIds, data.currentFolderId);
        });
        return cleanup;
    }, []);

    useEffect(() => {
        const cleanup = window.electronAPI.onRequestRename(({ fileId, currentName, currentPath, suggestedName }) => {
            setRenameDialogFileId(fileId);
            setRenameDialogCurrentName(currentName);
            setRenameDialogCurrentPath(currentPath ?? '');
            setRenameDialogSuggestedName(suggestedName ?? currentName);
        });
        return cleanup;
    }, []);

    useEffect(() => {
        const cleanup = window.electronAPI.onShowToast(({ message, type = 'info', duration }) => {
            useToastStore.getState().addToast(message, type, duration);
        });
        return cleanup;
    }, []);

    const handleRenameCancel = useCallback(() => {
        setRenameDialogFileId(null);
        setRenameDialogCurrentName('');
        setRenameDialogCurrentPath('');
        setRenameDialogSuggestedName('');
    }, []);

    const handleRenameConfirm = useCallback(async (nextName: string) => {
        if (!renameDialogFileId) return;

        try {
            const result = await window.electronAPI.renameFile(renameDialogFileId, nextName);
            if (!result.success) {
                useToastStore.getState().error(result.error || 'ファイル名の変更に失敗しました');
                return;
            }

            await useFileStore.getState().refreshFile(renameDialogFileId);
            handleRenameCancel();
            useToastStore.getState().success('ファイル名を変更しました');
        } catch (error) {
            console.error('Rename file error:', error);
            useToastStore.getState().error('ファイル名の変更に失敗しました');
        }
    }, [handleRenameCancel, renameDialogFileId]);

    // 別モードで開く（コンテキストメニュー）
    useEffect(() => {
        const cleanup = window.electronAPI.onOpenFileAsMode(async (data) => {
            try {
                const localFile = useFileStore.getState().files.find((f) => f.id === data.fileId);
                const targetFile = localFile ?? await window.electronAPI.getFileById(data.fileId);
                if (!targetFile) return;
                useUIStore.getState().openLightbox(targetFile, data.mode);
            } catch (e) {
                console.error('Failed to open file as mode:', e);
            }
        });
        return cleanup;
    }, []);

    // スキャンキャンセル
    const handleCancelScan = useCallback(async () => {
        try {
            await window.electronAPI.cancelScan();
        } catch (e) {
            console.error('Failed to cancel scan:', e);
        }
    }, []);

    // 削除ダイアログイベントリスナー（Phase 12-17B）
    useEffect(() => {
        const cleanup = window.electronAPI.onShowDeleteDialog((data) => {
            openDeleteDialog(data.fileId, data.filePath);
        });
        return cleanup;
    }, [openDeleteDialog]);

    // 削除確認ハンドラー（Phase 12-17B）
    const handleDeleteConfirm = useCallback(async (permanentDelete: boolean) => {
        if (!deleteDialogFileId || !deleteDialogFilePath) return;

        try {
            const result = await window.electronAPI.confirmDelete(
                deleteDialogFileId,
                deleteDialogFilePath,
                permanentDelete
            );

            if (result.success) {
                closeDeleteDialog();
                useToastStore.getState().success('ファイルを削除しました');
            } else if (!result.cancelled) {
                useToastStore.getState().error(`削除に失敗しました: ${result.error}`);
            }
        } catch (e) {
            console.error('Delete failed:', e);
            useToastStore.getState().error('削除に失敗しました');
        }
    }, [deleteDialogFileId, deleteDialogFilePath, closeDeleteDialog]);

    // Phase 26: ヘッダーバージョン表記
    const [appVersion, setAppVersion] = useState('');
    useEffect(() => {
        window.electronAPI.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => { });
    }, []);


    return (
        <div className="flex h-screen w-screen bg-surface-950 text-white overflow-hidden">
            <Sidebar key={`sidebar-${refreshKey}`} />
            <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
                {/* Header with Profile Switcher */}
                <header className="h-12 flex items-center justify-between px-4 border-b border-surface-800 bg-surface-900 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold text-surface-100">MediaArchiver</h1>
                        {/* Phase 26: バージョン表記 */}
                        {appVersion && (
                            <span className="text-xs text-surface-500 font-mono">v{appVersion}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <ProfileSwitcher onOpenManageModal={() => setProfileModalOpen(true)} />
                        {/* Phase 23: 右パネルトグル */}
                        <button
                            onClick={toggleRightPanel}
                            className={`p-1.5 rounded transition-colors ${isRightPanelOpen
                                ? 'text-primary-400 bg-primary-900/30 hover:bg-primary-900/50'
                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'
                                }`}
                            title={isRightPanelOpen ? '右パネルを閉じる' : '右パネルを開く'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3v18M9 3h10a2 2 0 012 2v14a2 2 0 01-2 2H9" />
                            </svg>
                        </button>
                    </div>
                </header>
                {/* メインコンテンツ: 統計 / 重複ビュー / ファイルグリッド */}
                <div className="relative flex-1 min-h-0">
                    {mainView === 'statistics' ? (
                        <Suspense fallback={<MainViewLoading label="統計を読み込み中..." />}>
                            <StatisticsView />
                        </Suspense>
                    ) : duplicateViewOpen ? (
                        <Suspense fallback={<MainViewLoading label="重複チェックを読み込み中..." />}>
                            <DuplicateView />
                        </Suspense>
                    ) : (
                        <FileGrid key={`grid-${refreshKey}`} />
                    )}
                    {lightboxFile && (
                        <Suspense fallback={<OverlayLoading label="ビューアを読み込み中..." />}>
                            <CenterViewerRoot />
                        </Suspense>
                    )}
                </div>
            </main>
            {/* Phase 23: 右サイドパネル（transform で開閉、レイアウトシフト回避） */}
            {isRightPanelOpen && (
                <Suspense fallback={null}>
                    <RightPanel />
                </Suspense>
            )}
            {settingsModalOpen && (
                <Suspense fallback={null}>
                    <SettingsModal />
                </Suspense>
            )}
            {profileModalOpen && (
                <Suspense fallback={null}>
                    <ProfileModal
                        isOpen={profileModalOpen}
                        onClose={() => setProfileModalOpen(false)}
                    />
                </Suspense>
            )}
            <ScanProgressBar onCancel={handleCancelScan} />
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <Toaster position="bottom-right" richColors />
            {deleteDialogOpen && (
                <Suspense fallback={null}>
                    <DeleteConfirmDialog
                        isOpen={deleteDialogOpen}
                        filePath={deleteDialogFilePath || ''}
                        onConfirm={handleDeleteConfirm}
                        onCancel={closeDeleteDialog}
                    />
                </Suspense>
            )}
            {renameDialogFileId !== null && (
                <Suspense fallback={null}>
                    <RenameFileDialog
                        isOpen={renameDialogFileId !== null}
                        currentName={renameDialogCurrentName}
                        currentPath={renameDialogCurrentPath}
                        suggestedName={renameDialogSuggestedName}
                        onConfirm={handleRenameConfirm}
                        onCancel={handleRenameCancel}
                    />
                </Suspense>
            )}
            {/* Phase 22-C-2: ファイル移動ダイアログ */}
            {moveDialogOpen && (
                <Suspense fallback={null}>
                    <MoveFolderDialog
                        isOpen={moveDialogOpen}
                        onClose={closeMoveDialog}
                        onMove={async (targetFolderId) => {
                            if (moveFileIds.length === 0) return;

                            try {
                                // 現在は単一ファイルのみ対応
                                const fileId = moveFileIds[0];
                                const result = await window.electronAPI.moveFileToFolder(fileId, targetFolderId);

                                if (result.success) {
                                    // Bug 3修正: 移動したファイルを即座にstoreから削除
                                    const { removeFile } = useFileStore.getState();
                                    removeFile(fileId);

                                    useToastStore.getState().success('ファイルを移動しました');
                                } else {
                                    useToastStore.getState().error(result.error || 'ファイル移動に失敗しました');
                                }
                            } catch (error) {
                                console.error('Move file error:', error);
                                useToastStore.getState().error('ファイル移動に失敗しました');
                            }
                        }}
                        currentFolderId={moveCurrentFolderId || undefined}
                    />
                </Suspense>
            )}
        </div>
    );
}

export default App;
