/**
 * SettingsModal - アプリケーション設定モーダル（タブ式）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings } from 'lucide-react';
import { useUIStore, type SettingsModalTab } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useTagStore } from '../stores/useTagStore';
import { useProfileStore } from '../stores/useProfileStore';
import { ExternalAppsTab } from './ExternalAppsTab';
import { RatingAxesManager } from './settings/RatingAxesManager';
import { SettingsTabNav } from './settings/SettingsTabNav';
import { GeneralSettingsTab } from './settings/GeneralSettingsTab';
import { ScanSettingsTab } from './settings/ScanSettingsTab';
import { ThumbnailsSettingsTab } from './settings/ThumbnailsSettingsTab';
import { LogsSettingsTab } from './settings/LogsSettingsTab';
import { BackupSettingsTab } from './settings/BackupSettingsTab';
import { StorageSettingsTab } from './settings/StorageSettingsTab';
import { useSettingsMaintenance } from './settings/useSettingsMaintenance';
import { FolderScanSettingsManagerDialog } from './FolderScanSettingsManagerDialog';
import { useDisplayPresetStore } from '../stores/useDisplayPresetStore';

type TabType = SettingsModalTab;

export const SettingsModal = React.memo(() => {
    const isOpen = useUIStore((s) => s.settingsModalOpen);
    const requestedTab = useUIStore((s) => s.settingsModalRequestedTab);
    const closeModal = useUIStore((s) => s.closeSettingsModal);

    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);
    const audioVolume = useSettingsStore((s) => s.audioVolume);
    const setAudioVolume = useSettingsStore((s) => s.setAudioVolume);
    const lightboxOverlayOpacity = useSettingsStore((s) => s.lightboxOverlayOpacity);
    const setLightboxOverlayOpacity = useSettingsStore((s) => s.setLightboxOverlayOpacity);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const setThumbnailAction = useSettingsStore((s) => s.setThumbnailAction);
    const flipbookSpeed = useSettingsStore((s) => s.flipbookSpeed);
    const setFlipbookSpeed = useSettingsStore((s) => s.setFlipbookSpeed);
    const animatedImagePreviewMode = useSettingsStore((s) => s.animatedImagePreviewMode);
    const setAnimatedImagePreviewMode = useSettingsStore((s) => s.setAnimatedImagePreviewMode);
    const rightPanelVideoPreviewMode = useSettingsStore((s) => s.rightPanelVideoPreviewMode);
    const setRightPanelVideoPreviewMode = useSettingsStore((s) => s.setRightPanelVideoPreviewMode);
    const rightPanelVideoJumpInterval = useSettingsStore((s) => s.rightPanelVideoJumpInterval);
    const setRightPanelVideoJumpInterval = useSettingsStore((s) => s.setRightPanelVideoJumpInterval);
    const performanceMode = useSettingsStore((s) => s.performanceMode);
    const setPerformanceMode = useSettingsStore((s) => s.setPerformanceMode);
    const previewFrameCount = useSettingsStore((s) => s.previewFrameCount);
    const setProfilePreviewFrameCount = useSettingsStore((s) => s.setProfilePreviewFrameCount);
    const scanThrottleMs = useSettingsStore((s) => s.scanThrottleMs);
    const setProfileScanThrottleMs = useSettingsStore((s) => s.setProfileScanThrottleMs);
    const thumbnailResolution = useSettingsStore((s) => s.thumbnailResolution);
    const setProfileThumbnailResolution = useSettingsStore((s) => s.setProfileThumbnailResolution);
    const profileFileTypeFilters = useSettingsStore((s) => s.profileFileTypeFilters);
    const setProfileFileTypeFilters = useSettingsStore((s) => s.setProfileFileTypeFilters);


    const showFileName = useSettingsStore((s) => s.showFileName);
    const setShowFileName = useSettingsStore((s) => s.setShowFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const setShowDuration = useSettingsStore((s) => s.setShowDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const setShowTags = useSettingsStore((s) => s.setShowTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);
    const setShowFileSize = useSettingsStore((s) => s.setShowFileSize);
    // Phase 14-8: タグポップオーバートリガー設定
    const tagPopoverTrigger = useSettingsStore((s) => s.tagPopoverTrigger);
    const setTagPopoverTrigger = useSettingsStore((s) => s.setTagPopoverTrigger);
    // タグ表示スタイル設定
    const tagDisplayStyle = useSettingsStore((s) => s.tagDisplayStyle);
    const setTagDisplayStyle = useSettingsStore((s) => s.setTagDisplayStyle);
    const fileCardTagOrderMode = useSettingsStore((s) => s.fileCardTagOrderMode);
    const setFileCardTagOrderMode = useSettingsStore((s) => s.setFileCardTagOrderMode);
    // Phase 17-3: playモード詳細設定
    const playMode = useSettingsStore((s) => s.playMode);
    const setPlayModeJumpType = useSettingsStore((s) => s.setPlayModeJumpType);
    const setPlayModeJumpInterval = useSettingsStore((s) => s.setPlayModeJumpInterval);
    const displayPresetDirectory = useDisplayPresetStore((s) => s.directory);
    const displayPresetCount = useDisplayPresetStore((s) => s.presets.length);
    const displayPresetWarnings = useDisplayPresetStore((s) => s.warnings);
    const loadDisplayPresets = useDisplayPresetStore((s) => s.loadDisplayPresets);
    const isReloadingDisplayPresets = useDisplayPresetStore((s) => s.isLoading);

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [logs, setLogs] = useState<string[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logLoadError, setLogLoadError] = useState<string>('');
    const [logActionMessage, setLogActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [folderScanSettingsManagerOpen, setFolderScanSettingsManagerOpen] = useState(false);

    // Export context (current visible list basis)
    const rawFiles = useFileStore((s) => s.files);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const allTags = useTagStore((s) => s.tags);
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);

    const activeProfileLabel = React.useMemo(() => {
        const profile = profiles.find((p) => p.id === activeProfileId);
        return profile ? `${profile.name} (${profile.id})` : activeProfileId;
    }, [profiles, activeProfileId]);
    const {
        appVersion,
        currentLoadedExportRows,
        exportScopeLabel,
        exportScope,
        setExportScope,
        canExportCurrentFolderScope,
        isExporting,
        handleExport,
        isImportingCsv,
        handleSelectImportCsv,
        handleSelectLegacyImportCsv,
        handleApplyCsvImport,
        parsedImportRows,
        selectedImportCsvPath,
        importSourceLabel,
        importDryRun,
        importWarnings,
        isCheckingForUpdates,
        updateCheckState,
        handleCheckForUpdates,
        isDownloadingUpdateZip,
        updateDownloadState,
        handleDownloadLatestUpdateZip,
        isApplyingUpdate,
        handleApplyUpdateFromZip,
        handleApplyUpdateViaZipDialog,
        handleCreateBackup,
        storageConfig,
        selectedMode,
        setSelectedMode,
        customPath,
        setCustomPath,
        handleBrowseStorageFolder,
        isMigrating,
        handleMigrate,
        migrationMsg,
        handleDeleteOldData,
    } = useSettingsMaintenance({
        isOpen,
        activeTab,
        rawFiles,
        fileTagsCache,
        currentFolderId,
        allTags,
        activeProfileLabel,
    });

    const handleProfileFileTypeToggle = useCallback(async (
        category: 'video' | 'image' | 'archive' | 'audio',
        checked: boolean
    ) => {
        const next = { ...profileFileTypeFilters, [category]: checked };
        setProfileFileTypeFilters(next);
        try {
            await Promise.all([
                window.electronAPI.setProfileScopedSettings({ fileTypeFilters: next }),
                window.electronAPI.setScanFileTypeCategories(next),
            ]);
        } catch (error) {
            console.error('Failed to update profile file type filters:', error);
            useUIStore.getState().showToast('対応形式設定の保存に失敗しました', 'error');
        }
    }, [profileFileTypeFilters, setProfileFileTypeFilters]);

    const handleProfilePreviewFrameCountChange = useCallback(async (count: number) => {
        setProfilePreviewFrameCount(count);
        try {
            await Promise.all([
                window.electronAPI.setProfileScopedSettings({ previewFrameCount: count }),
                window.electronAPI.setPreviewFrameCount(count),
            ]);
        } catch (error) {
            console.error('Failed to update profile preview frame count:', error);
            useUIStore.getState().showToast('プレビューフレーム数の保存に失敗しました', 'error');
        }
    }, [setProfilePreviewFrameCount]);

    const handleProfileScanThrottleMsChange = useCallback(async (ms: number) => {
        setProfileScanThrottleMs(ms);
        try {
            await Promise.all([
                window.electronAPI.setProfileScopedSettings({ scanThrottleMs: ms }),
                window.electronAPI.setScanThrottleMs(ms),
            ]);
        } catch (error) {
            console.error('Failed to update profile scan throttle:', error);
            useUIStore.getState().showToast('スキャン速度設定の保存に失敗しました', 'error');
        }
    }, [setProfileScanThrottleMs]);

    const handleProfileThumbnailResolutionChange = useCallback(async (resolution: number) => {
        setProfileThumbnailResolution(resolution);
        try {
            await Promise.all([
                window.electronAPI.setProfileScopedSettings({ thumbnailResolution: resolution }),
                window.electronAPI.setThumbnailResolution(resolution),
            ]);
        } catch (error) {
            console.error('Failed to update profile thumbnail resolution:', error);
            useUIStore.getState().showToast('サムネイル解像度の保存に失敗しました', 'error');
        }
    }, [setProfileThumbnailResolution]);


    const loadLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        setLogLoadError('');
        try {
            const logLines = await window.electronAPI.getLogs(300);
            setLogs(logLines || []);
        } catch (e) {
            console.error('Failed to load logs:', e);
            setLogs([]);
            setLogLoadError('ログの読み込みに失敗しました。再読み込みで改善しない場合は「フォルダを開く」からログを確認してください。');
        }
        setIsLoadingLogs(false);
    }, []);

    useEffect(() => {
        if (isOpen && requestedTab) {
            setActiveTab(requestedTab);
        }
    }, [isOpen, requestedTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'logs') {
            loadLogs();
        }
    }, [isOpen, activeTab, loadLogs]);

    const filteredLogs = logs.filter(line => {
        if (logFilter === 'all') return true;
        if (logFilter === 'error') return line.includes('[error]');
        if (logFilter === 'warn') return line.includes('[warn]');
        if (logFilter === 'info') return line.includes('[info]');
        return true;
    });

    const handleCopyVisibleLogs = useCallback(async () => {
        if (filteredLogs.length === 0) {
            setLogActionMessage({ type: 'info', text: 'コピー対象のログがありません（現在のフィルター結果は0件です）。' });
            return;
        }
        try {
            await navigator.clipboard.writeText(filteredLogs.join('\n'));
            setLogActionMessage({ type: 'success', text: `表示中のログ ${filteredLogs.length} 行をコピーしました。` });
        } catch (e) {
            console.error('Failed to copy logs:', e);
            setLogActionMessage({ type: 'error', text: 'ログのコピーに失敗しました。必要なら「フォルダを開く」から直接共有してください。' });
        }
    }, [filteredLogs]);

    const handleOpenLogFolder = useCallback(async () => {
        try {
            await window.electronAPI.openLogFolder();
            setLogActionMessage({ type: 'info', text: 'ログフォルダを開きました。問題報告時は該当日のログを共有してください。' });
        } catch (e) {
            console.error('Failed to open log folder:', e);
            setLogActionMessage({ type: 'error', text: 'ログフォルダを開けませんでした。保存先設定や権限を確認してください。' });
        }
    }, []);

    const handleOpenDisplayPresetFolder = useCallback(async () => {
        try {
            const result = await window.electronAPI.openDisplayPresetFolder();
            if (!result.success) {
                throw new Error(result.error || 'unknown error');
            }
            setLogActionMessage({ type: 'info', text: '表示プリセットフォルダを開きました。JSON を追加したら「再読込」で一覧へ反映できます。' });
        } catch (e) {
            console.error('Failed to open display preset folder:', e);
            setLogActionMessage({ type: 'error', text: '表示プリセットフォルダを開けませんでした。' });
        }
    }, []);

    const handleReloadDisplayPresets = useCallback(async () => {
        try {
            await loadDisplayPresets({ force: true });
            setLogActionMessage({ type: 'info', text: '表示プリセットを再読込しました。' });
        } catch (e) {
            console.error('Failed to reload display presets:', e);
            setLogActionMessage({ type: 'error', text: '表示プリセットの再読込に失敗しました。' });
        }
    }, [loadDisplayPresets]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60" style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="bg-surface-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 h-[80vh] max-h-[80vh] min-h-[560px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                    <div className="flex items-center gap-2">
                        <Settings size={20} className="text-primary-400" />
                        <h2 className="text-lg font-semibold text-white">設定</h2>
                    </div>
                    <button
                        onClick={closeModal}
                        className="p-1 hover:bg-surface-700 rounded transition-colors"
                    >
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                <SettingsTabNav activeTab={activeTab} onSelectTab={setActiveTab} />

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'general' && (
                        <GeneralSettingsTab
                            videoVolume={videoVolume}
                            onVideoVolumeChange={setVideoVolume}
                            audioVolume={audioVolume}
                            onAudioVolumeChange={setAudioVolume}
                            lightboxOverlayOpacity={lightboxOverlayOpacity}
                            onLightboxOverlayOpacityChange={setLightboxOverlayOpacity}
                            performanceMode={performanceMode}
                            onPerformanceModeChange={setPerformanceMode}
                            isCheckingForUpdates={isCheckingForUpdates}
                            updateCheckState={updateCheckState}
                            onCheckForUpdates={() => { void handleCheckForUpdates(); }}
                            isDownloadingUpdateZip={isDownloadingUpdateZip}
                            updateDownloadState={updateDownloadState}
                            onDownloadLatestUpdateZip={() => { void handleDownloadLatestUpdateZip(); }}
                            isApplyingUpdate={isApplyingUpdate}
                            onApplyUpdateFromZip={() => { void handleApplyUpdateFromZip(); }}
                            onApplyUpdateViaZipDialog={() => { void handleApplyUpdateViaZipDialog(); }}
                            showFileName={showFileName}
                            onShowFileNameChange={setShowFileName}
                            showDuration={showDuration}
                            onShowDurationChange={setShowDuration}
                            showTags={showTags}
                            onShowTagsChange={setShowTags}
                            tagPopoverTrigger={tagPopoverTrigger}
                            onTagPopoverTriggerChange={setTagPopoverTrigger}
                            tagDisplayStyle={tagDisplayStyle}
                            onTagDisplayStyleChange={setTagDisplayStyle}
                            fileCardTagOrderMode={fileCardTagOrderMode}
                            onFileCardTagOrderModeChange={setFileCardTagOrderMode}
                            showFileSize={showFileSize}
                            onShowFileSizeChange={setShowFileSize}
                            displayPresetDirectory={displayPresetDirectory}
                            displayPresetCount={displayPresetCount}
                            displayPresetWarnings={displayPresetWarnings}
                            onOpenDisplayPresetFolder={handleOpenDisplayPresetFolder}
                            isReloadingDisplayPresets={isReloadingDisplayPresets}
                            onReloadDisplayPresets={handleReloadDisplayPresets}
                        />
                    )}

                    {activeTab === 'scan' && (
                        <ScanSettingsTab
                            activeProfileLabel={activeProfileLabel}
                            profileFileTypeFilters={profileFileTypeFilters}
                            onProfileFileTypeToggle={(category, checked) => { void handleProfileFileTypeToggle(category, checked); }}
                            onOpenFolderScanSettingsManager={() => setFolderScanSettingsManagerOpen(true)}
                            scanThrottleMs={scanThrottleMs}
                            onProfileScanThrottleMsChange={(ms) => { void handleProfileScanThrottleMsChange(ms); }}
                        />
                    )}

                    {activeTab === 'thumbnails' && (
                        <ThumbnailsSettingsTab
                            previewFrameCount={previewFrameCount}
                            onProfilePreviewFrameCountChange={(count) => { void handleProfilePreviewFrameCountChange(count); }}
                            thumbnailResolution={thumbnailResolution}
                            onProfileThumbnailResolutionChange={(resolution) => { void handleProfileThumbnailResolutionChange(resolution); }}
                            thumbnailAction={thumbnailAction}
                            onThumbnailActionChange={setThumbnailAction}
                            flipbookSpeed={flipbookSpeed}
                            onFlipbookSpeedChange={setFlipbookSpeed}
                            animatedImagePreviewMode={animatedImagePreviewMode}
                            onAnimatedImagePreviewModeChange={setAnimatedImagePreviewMode}
                            playMode={playMode}
                            onPlayModeJumpTypeChange={setPlayModeJumpType}
                            onPlayModeJumpIntervalChange={setPlayModeJumpInterval}
                            rightPanelVideoPreviewMode={rightPanelVideoPreviewMode}
                            onRightPanelVideoPreviewModeChange={setRightPanelVideoPreviewMode}
                            rightPanelVideoJumpInterval={rightPanelVideoJumpInterval}
                            onRightPanelVideoJumpIntervalChange={setRightPanelVideoJumpInterval}
                        />
                    )}

                    {activeTab === 'storage' && (
                        <StorageSettingsTab
                            storageConfig={storageConfig}
                            selectedMode={selectedMode}
                            onSelectedModeChange={setSelectedMode}
                            customPath={customPath}
                            onCustomPathChange={setCustomPath}
                            onBrowseCustomPath={() => { void handleBrowseStorageFolder(); }}
                            migrationMsg={migrationMsg}
                            onDeleteOldData={() => { void handleDeleteOldData(); }}
                            isMigrating={isMigrating}
                            onMigrate={() => { void handleMigrate(); }}
                        />
                    )}

                    {activeTab === 'apps' && (
                        <ExternalAppsTab />
                    )}

                    {activeTab === 'logs' && (
                        <LogsSettingsTab
                            logFilter={logFilter}
                            onLogFilterChange={setLogFilter}
                            isLoadingLogs={isLoadingLogs}
                            onReloadLogs={loadLogs}
                            onCopyVisibleLogs={() => { void handleCopyVisibleLogs(); }}
                            onOpenLogFolder={() => { void handleOpenLogFolder(); }}
                            filteredLogs={filteredLogs}
                            logs={logs}
                            logLoadError={logLoadError}
                            logActionMessage={logActionMessage}
                        />
                    )}

                    {activeTab === 'backup' && (
                        <BackupSettingsTab
                            currentLoadedExportRowsCount={currentLoadedExportRows.length}
                            activeProfileLabel={activeProfileLabel}
                            exportScopeLabel={exportScopeLabel}
                            exportScope={exportScope}
                            canExportCurrentFolderScope={canExportCurrentFolderScope}
                            onExportScopeChange={setExportScope}
                            isExporting={isExporting}
                            onExport={(format) => { void handleExport(format); }}
                            isImportingCsv={isImportingCsv}
                            onSelectImportCsv={() => { void handleSelectImportCsv(); }}
                            onSelectLegacyImportCsv={() => { void handleSelectLegacyImportCsv(); }}
                            onApplyCsvImport={() => { void handleApplyCsvImport(); }}
                            parsedImportRows={parsedImportRows}
                            selectedImportCsvPath={selectedImportCsvPath}
                            importSourceLabel={importSourceLabel}
                            importDryRun={importDryRun}
                            importWarnings={importWarnings}
                            onCreateBackup={() => { void handleCreateBackup(); }}
                        />
                    )}

                    {activeTab === 'ratings' && (
                        <RatingAxesManager />
                    )}
                </div>

                <FolderScanSettingsManagerDialog
                    isOpen={folderScanSettingsManagerOpen}
                    onClose={() => setFolderScanSettingsManagerOpen(false)}
                />

                {/* Footer */}
                <div className="px-4 py-3 border-t border-surface-700 flex items-center justify-between">
                    {/* Phase 26: バージョン表記 */}
                    <span className="text-xs text-surface-500">
                        {appVersion ? `v${appVersion}` : ''}
                    </span>
                    <button
                        onClick={closeModal}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
});

SettingsModal.displayName = 'SettingsModal';
