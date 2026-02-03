import { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { LightBox } from './components/LightBox';
import { SettingsModal } from './components/SettingsModal';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { ProfileModal } from './components/ProfileModal';
import { ScanProgressBar } from './components/ScanProgressBar';
import { ToastContainer } from './components/Toast';
import { useProfileStore } from './stores/useProfileStore';
import { useFileStore } from './stores/useFileStore';
import { useTagStore } from './stores/useTagStore';
import { useUIStore } from './stores/useUIStore';
import { useSettingsStore } from './stores/useSettingsStore';

function App() {
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const loadProfiles = useProfileStore((s) => s.loadProfiles);
    const setFiles = useFileStore((s) => s.setFiles);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);
    const clearTagFilter = useTagStore((s) => s.clearTagFilter);
    const setScanProgress = useUIStore((s) => s.setScanProgress);
    const toasts = useUIStore((s) => s.toasts);
    const removeToast = useUIStore((s) => s.removeToast);

    // autoScanOnStartup は起動後1回だけ評価するため、初期値を取得
    const autoScanOnStartupRef = useRef(false);
    useEffect(() => {
        // 設定は永続化されているので、初回マウント時にstoreから読み取り
        const settings = useSettingsStore.getState();
        autoScanOnStartupRef.current = settings.autoScanOnStartup;
        // プレビューフレーム数をメインプロセスに同期
        window.electronAPI.setPreviewFrameCount(settings.previewFrameCount);
    }, []);

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
        const cleanup = window.electronAPI.onScanProgress((progress) => {
            setScanProgress(progress);
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
                <FileGrid key={`grid-${refreshKey}`} />
            </main>
            <LightBox />
            <SettingsModal />
            <ProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
            />
            <ScanProgressBar onCancel={handleCancelScan} />
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}

export default App;
