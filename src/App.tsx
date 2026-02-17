import { useEffect, useState, useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { LightBox } from './components/lightbox/LightBox';
import { SettingsModal } from './components/SettingsModal';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { ProfileModal } from './components/ProfileModal';
import { ScanProgressBar } from './components/ScanProgressBar';
import { ToastContainer } from './components/Toast';
import { DuplicateView } from './components/DuplicateView';
import { StatisticsView } from './components/StatisticsView';
import { useProfileStore } from './stores/useProfileStore';
import { useFileStore } from './stores/useFileStore';
import { useTagStore } from './stores/useTagStore';
import { useUIStore } from './stores/useUIStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useToastStore } from './stores/useToastStore';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

function App() {
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const loadProfiles = useProfileStore((s) => s.loadProfiles);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);
    const clearTagFilter = useTagStore((s) => s.clearTagFilter);
    const setScanProgress = useUIStore((s) => s.setScanProgress);
    const toasts = useToastStore((s) => s.toasts);
    const removeToast = useToastStore((s) => s.removeToast);
    const duplicateViewOpen = useUIStore((s) => s.duplicateViewOpen);
    const mainView = useUIStore((s) => s.mainView);
    const externalApps = useSettingsStore((s) => s.externalApps);
    const deleteDialogOpen = useUIStore((s) => s.deleteDialogOpen);
    const deleteDialogFilePath = useUIStore((s) => s.deleteDialogFilePath);
    const deleteDialogFileId = useUIStore((s) => s.deleteDialogFileId);
    const openDeleteDialog = useUIStore((s) => s.openDeleteDialog);
    const closeDeleteDialog = useUIStore((s) => s.closeDeleteDialog);

    // autoScanOnStartup は起動後1回だけ評価するため、初期値を取得
    const autoScanOnStartupRef = useRef(false);
    useEffect(() => {
        // 設定は永続化されているので、初回マウント時にstoreから読み取り
        const settings = useSettingsStore.getState();
        autoScanOnStartupRef.current = settings.autoScanOnStartup;
        // プレビューフレーム数をメインプロセスに同期
        window.electronAPI.setPreviewFrameCount(settings.previewFrameCount);
        // スキャン速度抑制をメインプロセスに同期
        window.electronAPI.setScanThrottleMs(settings.scanThrottleMs);
        // サムネイル解像度をメインプロセスに同期
        window.electronAPI.setThumbnailResolution(settings.thumbnailResolution);
    }, []);

    // 外部アプリ設定を Electron 側に同期（起動時および変更時）
    useEffect(() => {
        window.electronAPI.setExternalApps(externalApps);
    }, [externalApps]);

    // 初回ロード：プロファイル一覧を取得
    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    // 起動時自動スキャン（初回マウント時のみ）
    useEffect(() => {
        if (autoScanOnStartupRef.current) {
            // 少し遅延を入れてUIが準備できてから実行
            const timer = setTimeout(() => {
                window.electronAPI.autoScan().catch(console.error);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    // スキャン進捗イベントを監視
    useEffect(() => {
        const success = useToastStore.getState().success;
        const error = useToastStore.getState().error;
        const cleanup = window.electronAPI.onScanProgress((progress) => {
            setScanProgress(progress);
            // スキャン完了時（progress === null）にトースト表示
            if (progress === null) {
                const fileCount = useFileStore.getState().files.length;
                success(`スキャンが完了しました (${fileCount}件)`);
            }
            // サムネイル再生成完了時にトースト表示
            else if (progress.phase === 'complete' && progress.message === 'サムネイル再生成完了') {
                success('サムネイルを再生成しました');
            }
            // エラー時にトースト表示
            else if (progress.phase === 'error' && progress.message?.includes('サムネイル再生成')) {
                error('サムネイルの再生成に失敗しました');
            }
        });
        return cleanup;
    }, [setScanProgress]);

    // プロファイル切替イベントを監視
    useEffect(() => {
        const cleanup = window.electronAPI.onProfileSwitched((_profileId) => {
            // プロファイルが切り替わったらファイル表示をクリア
            setFiles([]);
            setCurrentFolderId(null);
            clearTagFilter();
            // コンポーネントを再マウント
            setRefreshKey((k) => k + 1);
        });
        return cleanup;
    }, [setFiles, setCurrentFolderId, clearTagFilter]);

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

    return (
        <div className="flex h-screen w-screen bg-surface-950 text-white overflow-hidden">
            <Sidebar key={`sidebar-${refreshKey}`} />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header with Profile Switcher */}
                <header className="h-12 flex items-center justify-between px-4 border-b border-surface-800 bg-surface-900 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold text-surface-100">MediaArchiver</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ProfileSwitcher onOpenManageModal={() => setProfileModalOpen(true)} />
                    </div>
                </header>
                {/* メインコンテンツ: 統計 / 重複ビュー / ファイルグリッド */}
                {mainView === 'statistics' ? (
                    <StatisticsView />
                ) : duplicateViewOpen ? (
                    <DuplicateView />
                ) : (
                    <FileGrid key={`grid-${refreshKey}`} />
                )}
            </main>
            <LightBox />
            <SettingsModal />
            <ProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
            />
            <ScanProgressBar onCancel={handleCancelScan} />
            <ToastContainer toasts={toasts} onClose={removeToast} />
            <Toaster position="bottom-right" richColors />
            <DeleteConfirmDialog
                isOpen={deleteDialogOpen}
                filePath={deleteDialogFilePath || ''}
                onConfirm={handleDeleteConfirm}
                onCancel={closeDeleteDialog}
            />
        </div>
    );
}

export default App;
