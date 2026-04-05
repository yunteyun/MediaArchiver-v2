import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
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
import { useSettingsStore } from './stores/useSettingsStore';
import type { ProfileScopedSettingsV1 } from './stores/useSettingsStore';
import { useToastStore } from './stores/useToastStore';
import { useRatingStore } from './stores/useRatingStore';
import { useDuplicateStore } from './stores/useDuplicateStore';
import { useDisplayPresetStore } from './stores/useDisplayPresetStore';
import {
    loadAndApplyProfileScopedSettings,
    resetStateForProfileSwitch,
} from './utils/profileLifecycle';
import { lazyWithPerf } from './utils/lazyWithPerf';
import { completeUiPerfTrace, initializePerfDebugFlags, syncPerfDebugToMain } from './utils/perfDebug';

function areSavedFilterStatesEqual(
    left: ProfileScopedSettingsV1['savedFilterState'],
    right: ProfileScopedSettingsV1['savedFilterState']
): boolean {
    const leftTypes = left?.selectedFileTypes ?? [];
    const rightTypes = right?.selectedFileTypes ?? [];
    return (left?.searchQuery ?? '') === (right?.searchQuery ?? '')
        && (left?.searchTarget ?? 'fileName') === (right?.searchTarget ?? 'fileName')
        && (left?.ratingQuickFilter ?? 'none') === (right?.ratingQuickFilter ?? 'none')
        && leftTypes.length === rightTypes.length
        && leftTypes.every((type, index) => type === rightTypes[index]);
}

const ProfileHomeView = lazyWithPerf('profile-home', () => import('./components/ProfileHomeView').then((module) => ({ default: module.ProfileHomeView })));
const DuplicateView = lazyWithPerf('duplicate-view', () => import('./components/DuplicateView').then((module) => ({ default: module.DuplicateView })));
const RightPanel = lazyWithPerf('right-panel', () => import('./components/RightPanel').then((module) => ({ default: module.RightPanel })));
const SettingsModal = lazyWithPerf('settings-modal', () => import('./components/SettingsModal').then((module) => ({ default: module.SettingsModal })));
const ProfileModal = lazyWithPerf('profile-modal', () => import('./components/ProfileModal').then((module) => ({ default: module.ProfileModal })));
const DeleteConfirmDialog = lazyWithPerf('delete-confirm-dialog', () => import('./components/DeleteConfirmDialog').then((module) => ({ default: module.DeleteConfirmDialog })));
const RenameFileDialog = lazyWithPerf('rename-file-dialog', () => import('./components/RenameFileDialog').then((module) => ({ default: module.RenameFileDialog })));
const MoveFolderDialog = lazyWithPerf('move-folder-dialog', () => import('./components/MoveFolderDialog').then((module) => ({ default: module.MoveFolderDialog })));
const CenterViewerRoot = lazyWithPerf('center-viewer', () => import('./features/center-viewer/CenterViewerRoot').then((module) => ({ default: module.CenterViewerRoot })));

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
    const [profileSettingsRuntimeReady, setProfileSettingsRuntimeReady] = useState(false);
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
    const toasts = useToastStore((s) => s.toasts);
    const removeToast = useToastStore((s) => s.removeToast);
    const duplicateViewOpen = useUIStore((s) => s.duplicateViewOpen);
    const mainView = useUIStore((s) => s.mainView);
    const settingsModalOpen = useUIStore((s) => s.settingsModalOpen);
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const externalApps = useSettingsStore((s) => s.externalApps);
    const deleteDialogOpen = useUIStore((s) => s.deleteDialogOpen);
    const deleteDialogFilePaths = useUIStore((s) => s.deleteDialogFilePaths);
    const deleteDialogFileIds = useUIStore((s) => s.deleteDialogFileIds);
    const openDeleteDialog = useUIStore((s) => s.openDeleteDialog);
    const closeDeleteDialog = useUIStore((s) => s.closeDeleteDialog);
    // Phase 22-C-2
    const moveDialogOpen = useUIStore((s) => s.moveDialogOpen);
    const moveFileIds = useUIStore((s) => s.moveFileIds);
    const closeMoveDialog = useUIStore((s) => s.closeMoveDialog);
    // Phase 23: 右サイドパネル
    const isRightPanelOpen = useUIStore((s) => s.isRightPanelOpen);
    const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
    const applyProfileScopedUiDefaults = useUIStore((s) => s.applyProfileScopedUiDefaults);
    const searchQuery = useUIStore((s) => s.searchQuery);
    const searchTarget = useUIStore((s) => s.searchTarget);
    const ratingQuickFilter = useUIStore((s) => s.ratingQuickFilter);
    const selectedFileTypes = useUIStore((s) => s.selectedFileTypes);
    const loadDisplayPresets = useDisplayPresetStore((s) => s.loadDisplayPresets);
    const savedFilterState = useSettingsStore((s) => s.savedFilterState);
    const profileSettingsLoadSeqRef = useRef(0);
    const startupAutoScanStartedRef = useRef(false);
    const autoBackupProfileCheckRef = useRef<string | null>(null);

    useEffect(() => {
        const flags = initializePerfDebugFlags();
        void syncPerfDebugToMain(flags.enabled);
    }, []);

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
        applyProfileScopedUiDefaults({
            defaultSearchTarget: settings.defaultSearchTarget,
            listDisplayDefaults: {
                sortBy: settings.sortBy,
                sortOrder: settings.sortOrder,
                groupBy: settings.groupBy,
                dateGroupingMode: settings.dateGroupingMode,
                displayMode: settings.displayMode,
                activeDisplayPresetId: settings.activeDisplayPresetId,
                thumbnailPresentation: settings.thumbnailPresentation,
            },
            savedFilterState: settings.savedFilterState,
        });
        void loadDisplayPresets();
    }, [applyProfileScopedUiDefaults, loadDisplayPresets]);

    const syncProfileScopedSettingsToRuntime = useCallback(async (settings: ProfileScopedSettingsV1) => {
        applyProfileScopedUiDefaults({
            defaultSearchTarget: settings.listDisplayDefaults.defaultSearchTarget,
            listDisplayDefaults: {
                sortBy: settings.listDisplayDefaults.sortBy,
                sortOrder: settings.listDisplayDefaults.sortOrder,
                groupBy: settings.listDisplayDefaults.groupBy,
                dateGroupingMode: settings.listDisplayDefaults.dateGroupingMode,
                displayMode: settings.listDisplayDefaults.displayMode,
                activeDisplayPresetId: settings.listDisplayDefaults.activeDisplayPresetId,
                thumbnailPresentation: settings.listDisplayDefaults.thumbnailPresentation,
            },
            savedFilterState: settings.savedFilterState,
        });
        await Promise.all([
            window.electronAPI.setPreviewFrameCount(settings.previewFrameCount),
            window.electronAPI.setScanFileTypeCategories(settings.fileTypeFilters),
            window.electronAPI.setScanThrottleMs(settings.scanThrottleMs),
            window.electronAPI.setThumbnailResolution(settings.thumbnailResolution),
        ]);
    }, [applyProfileScopedUiDefaults]);

    const loadAndApplyActiveProfileScopedSettings = useCallback(async () => {
        await loadAndApplyProfileScopedSettings({
            activeProfileId,
            profilesLength: profiles.length,
            nextSequence: () => ++profileSettingsLoadSeqRef.current,
            isCurrentSequence: (sequence) => sequence === profileSettingsLoadSeqRef.current,
            getSettingsSnapshot: () => {
                const settings = useSettingsStore.getState();
                return {
                    previewFrameCount: settings.previewFrameCount,
                    scanThrottleMs: settings.scanThrottleMs,
                    thumbnailResolution: settings.thumbnailResolution,
                    ratingDisplayThresholds: settings.ratingDisplayThresholds,
                    sortBy: settings.sortBy,
                    sortOrder: settings.sortOrder,
                    groupBy: settings.groupBy,
                    dateGroupingMode: settings.dateGroupingMode,
                    defaultSearchTarget: settings.defaultSearchTarget,
                    activeDisplayPresetId: settings.activeDisplayPresetId,
                    displayMode: settings.displayMode,
                    thumbnailPresentation: settings.thumbnailPresentation,
                    showFileName: settings.showFileName,
                    showDuration: settings.showDuration,
                    showTags: settings.showTags,
                    showFileSize: settings.showFileSize,
                    tagPopoverTrigger: settings.tagPopoverTrigger,
                    tagDisplayStyle: settings.tagDisplayStyle,
                    fileCardTagOrderMode: settings.fileCardTagOrderMode,
                    defaultExternalApps: settings.defaultExternalApps,
                    renameQuickTexts: settings.renameQuickTexts,
                    searchDestinations: settings.searchDestinations,
                    savedFilterState: settings.savedFilterState,
                };
            },
            fetchSettings: () => window.electronAPI.getProfileScopedSettings(),
            replaceSettings: (settings) => window.electronAPI.replaceProfileScopedSettings(settings),
            applySettings: (settings) => useSettingsStore.getState().applyProfileScopedSettings(settings),
            syncSettings: syncProfileScopedSettingsToRuntime,
            onError: (error) => {
                console.error('Failed to load/apply profile scoped settings:', error);
            },
        });
    }, [activeProfileId, profiles.length, syncProfileScopedSettingsToRuntime]);

    // 外部アプリ設定を Electron 側に同期（起動時および変更時）
    useEffect(() => {
        window.electronAPI.setExternalApps(externalApps);
    }, [externalApps]);

    // 初回ロード：プロファイル一覧を取得
    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    useEffect(() => {
        if (!activeProfileId || profiles.length === 0) {
            setProfileSettingsRuntimeReady(false);
            return;
        }

        let cancelled = false;
        setProfileSettingsRuntimeReady(false);

        void (async () => {
            try {
                await loadAndApplyActiveProfileScopedSettings();
            } finally {
                if (!cancelled) {
                    setProfileSettingsRuntimeReady(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeProfileId, loadAndApplyActiveProfileScopedSettings, profiles.length]);

    useEffect(() => {
        if (!profileSettingsRuntimeReady || !activeProfileId) {
            return;
        }

        const nextSavedFilterState: NonNullable<ProfileScopedSettingsV1['savedFilterState']> = {
            searchQuery,
            searchTarget,
            ratingQuickFilter,
            selectedFileTypes: [...selectedFileTypes],
        };

        if (areSavedFilterStatesEqual(nextSavedFilterState, savedFilterState)) {
            return;
        }

        useSettingsStore.getState().setSavedFilterState(nextSavedFilterState);

        const timer = setTimeout(() => {
            void window.electronAPI.setProfileScopedSettings({
                savedFilterState: nextSavedFilterState,
            }).catch((error) => {
                console.error('Failed to persist saved filter state:', error);
            });
        }, 250);

        return () => clearTimeout(timer);
    }, [
        activeProfileId,
        profileSettingsRuntimeReady,
        ratingQuickFilter,
        savedFilterState,
        searchQuery,
        searchTarget,
        selectedFileTypes,
    ]);

    // 評価フィルター用キャッシュを起動時に一括ロード
    useEffect(() => {
        useRatingStore.getState().loadAllFileRatings().catch((e) => {
            console.error('Failed to preload rating cache:', e);
        });
        useRatingStore.getState().loadAxes().catch((e) => {
            console.error('Failed to preload rating axes:', e);
        });
    }, []);

    // 起動時自動スキャン（初回マウント時のみ）
    // 実際の対象は「フォルダ別設定で起動時スキャンONのフォルダ」のみ。
    useEffect(() => {
        if (startupAutoScanStartedRef.current || !profileSettingsRuntimeReady || !activeProfileId || profiles.length === 0) {
            return;
        }

        startupAutoScanStartedRef.current = true;

        // 少し遅延を入れてUIが準備できてから実行
        const timer = setTimeout(() => {
            window.electronAPI.autoScan().catch(console.error);
        }, 500);
        return () => clearTimeout(timer);
    }, [activeProfileId, profileSettingsRuntimeReady, profiles.length]);

    useEffect(() => {
        if (!profileSettingsRuntimeReady || !activeProfileId) {
            return;
        }

        if (autoBackupProfileCheckRef.current === activeProfileId) {
            return;
        }
        autoBackupProfileCheckRef.current = activeProfileId;

        let cancelled = false;

        void (async () => {
            try {
                const backupSettings = await window.electronAPI.getBackupSettings();
                if (cancelled || !backupSettings.enabled) {
                    return;
                }

                const shouldRun = await window.electronAPI.shouldAutoBackup(activeProfileId);
                if (cancelled || !shouldRun) {
                    return;
                }

                const result = await window.electronAPI.createBackup(activeProfileId);
                if (cancelled) {
                    return;
                }

                if (result.success) {
                    useToastStore.getState().success('自動バックアップを作成しました', 4000);
                } else {
                    useToastStore.getState().error(`自動バックアップに失敗しました: ${result.error ?? 'unknown error'}`, 5000);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Auto backup failed:', error);
                    useToastStore.getState().error('自動バックアップに失敗しました', 5000);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeProfileId, profileSettingsRuntimeReady]);

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
        const info = useToastStore.getState().info;
        const error = useToastStore.getState().error;
        const cleanup = window.electronAPI.onScanProgress((progress) => {
            setScanProgress(progress);
            const folderPrefix = progress.folderName ? `${progress.folderName}: ` : '';
            const statsSummary = progress.stats
                ? `${progress.stats.newCount}件新規 / ${progress.stats.updateCount}件更新 / ${progress.stats.skipCount}件スキップ${typeof progress.stats.removedCount === 'number' ? ` / ${progress.stats.removedCount}件削除` : ''}`
                : '';
            if (progress?.phase === 'complete' && progress.message === 'サムネイル再生成完了') {
                success('サムネイルを再生成しました');
            }
            else if (progress?.phase === 'complete' && progress.message?.startsWith('キャンセル')) {
                info(`${folderPrefix}スキャンをキャンセルしました${statsSummary ? `（${statsSummary}）` : ''}`, 3500);
            }
            else if (progress?.phase === 'complete') {
                success(`${folderPrefix}スキャン完了${statsSummary ? `（${statsSummary}）` : ''}`, 4500);
            }
            else if (progress?.phase === 'error' && progress.message?.includes('サムネイル再生成')) {
                error('サムネイルの再生成に失敗しました');
            }
            else if (progress?.phase === 'error') {
                error(`${folderPrefix}スキャン中にエラーが発生しました`, 4500);
            }
        });
        return cleanup;
    }, [setScanProgress]);

    useEffect(() => {
        if (!isRightPanelOpen) {
            completeUiPerfTrace('right-panel-toggle', { open: false });
        }
    }, [isRightPanelOpen]);

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
                clearTagFilter,
                clearRatingFilters: () => useRatingStore.getState().clearRatingFilters(),
                resetTransientUiState: () => useUIStore.getState().resetTransientStateForProfileSwitch(),
                resetDuplicates: () => useDuplicateStore.getState().reset(),
                bumpRefreshKey: () => setRefreshKey((k) => k + 1),
                reloadRatings: () => useRatingStore.getState().loadAllFileRatings(),
                onReloadRatingsError: (error) => {
                    console.error('Failed to reload rating cache after profile switch:', error);
                },
            });
        });
        return cleanup;
    }, [setFiles, setCurrentFolderId, clearTagFilter]);

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
            openDeleteDialog(data.fileIds, data.filePaths);
        });
        return cleanup;
    }, [openDeleteDialog]);

    // 削除確認ハンドラー（Phase 12-17B）
    const handleDeleteConfirm = useCallback(async (permanentDelete: boolean) => {
        if (deleteDialogFileIds.length === 0 || deleteDialogFilePaths.length === 0) return;

        try {
            if (deleteDialogFileIds.length === 1) {
                const result = await window.electronAPI.confirmDelete(
                    deleteDialogFileIds[0]!,
                    deleteDialogFilePaths[0]!,
                    permanentDelete
                );

                if (result.success) {
                    closeDeleteDialog();
                    useToastStore.getState().success('ファイルを削除しました');
                } else if (!result.cancelled) {
                    useToastStore.getState().error(`削除に失敗しました: ${result.error}`);
                }
                return;
            }

            const result = await window.electronAPI.confirmDeleteBatch(
                deleteDialogFileIds,
                deleteDialogFilePaths,
                permanentDelete
            );

            if (result.success) {
                closeDeleteDialog();
                useToastStore.getState().success(`${result.deletedCount} 件のファイルを削除しました`);
            } else if (!result.cancelled) {
                const baseMessage = result.failedCount > 0
                    ? `${result.deletedCount} 件削除 / ${result.failedCount} 件失敗`
                    : (result.error ?? '削除に失敗しました');
                useToastStore.getState().error(baseMessage);
            }
        } catch (e) {
            console.error('Delete failed:', e);
            useToastStore.getState().error('削除に失敗しました');
        }
    }, [closeDeleteDialog, deleteDialogFileIds, deleteDialogFilePaths]);

    // Phase 26: ヘッダーバージョン表記
    const [appVersion, setAppVersion] = useState('');
    useEffect(() => {
        window.electronAPI.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => { });
    }, []);

    const handleToggleRightPanel = useCallback(() => {
        toggleRightPanel();
    }, [toggleRightPanel]);

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
                            onClick={handleToggleRightPanel}
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
                    {mainView === 'profile' ? (
                        <Suspense fallback={<MainViewLoading label="プロファイルトップを読み込み中..." />}>
                            <ProfileHomeView />
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
            <Toaster position="bottom-left" richColors />
            {deleteDialogOpen && (
                <Suspense fallback={null}>
                    <DeleteConfirmDialog
                        isOpen={deleteDialogOpen}
                        filePaths={deleteDialogFilePaths}
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
                        onMove={async ({ targetFolderId, targetFolderPath }) => {
                            if (moveFileIds.length === 0) return;

                            try {
                                // 現在は単一ファイルのみ対応
                                const fileId = moveFileIds[0];
                                const result = await window.electronAPI.moveFileToFolder(fileId, targetFolderId, targetFolderPath);

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
                    />
                </Suspense>
            )}
        </div>
    );
}

export default App;
