/**
 * SettingsModal - アプリケーション設定モーダル（タブ式）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings } from 'lucide-react';
import { useUIStore, type SettingsModalTab } from '../stores/useUIStore';
import {
    DEFAULT_FILE_CARD_SETTINGS,
    DEFAULT_LIST_DISPLAY_SETTINGS,
    DEFAULT_MEDIA_PLAYBACK_SETTINGS,
    DEFAULT_PROFILE_SCOPED_SETTINGS,
    DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS,
    DEFAULT_SCAN_EXCLUSION_RULES,
    DEFAULT_STORAGE_MAINTENANCE_SETTINGS,
    DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS,
    useSettingsStore,
} from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useTagStore } from '../stores/useTagStore';
import { useProfileStore } from '../stores/useProfileStore';
import { ExternalAppsTab } from './ExternalAppsTab';
import { RatingAxesManager } from './settings/RatingAxesManager';
import { getSettingsTabMeta, SettingsTabNav } from './settings/SettingsTabNav';
import { GeneralSettingsTab } from './settings/GeneralSettingsTab';
import { ScanSettingsTab } from './settings/ScanSettingsTab';
import { ThumbnailsSettingsTab } from './settings/ThumbnailsSettingsTab';
import { LogsSettingsTab } from './settings/LogsSettingsTab';
import { BackupSettingsTab } from './settings/BackupSettingsTab';
import { StorageSettingsTab } from './settings/StorageSettingsTab';
import { MaintenanceSettingsTab } from './settings/MaintenanceSettingsTab';
import { useSettingsMaintenance } from './settings/useSettingsMaintenance';
import { FolderScanSettingsManagerDialog } from './FolderScanSettingsManagerDialog';
import { useDisplayPresetStore } from '../stores/useDisplayPresetStore';
import { getDisplayPresetMenuOptions } from './fileCard/displayModes';
import { completeUiPerfTrace, getPerfDebugFlags, setPerfDebugFlags, syncPerfDebugToMain, type PerfDebugFlags } from '../utils/perfDebug';

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
    const scanExclusionRules = useSettingsStore((s) => s.scanExclusionRules);
    const setScanExclusionRules = useSettingsStore((s) => s.setScanExclusionRules);
    const storageMaintenanceSettings = useSettingsStore((s) => s.storageMaintenanceSettings);
    const setStorageMaintenanceSettings = useSettingsStore((s) => s.setStorageMaintenanceSettings);


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
    const sortBy = useSettingsStore((s) => s.sortBy);
    const setSortBy = useSettingsStore((s) => s.setSortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    const setSortOrder = useSettingsStore((s) => s.setSortOrder);
    const defaultSearchTarget = useSettingsStore((s) => s.defaultSearchTarget);
    const setDefaultSearchTarget = useSettingsStore((s) => s.setDefaultSearchTarget);
    const groupBy = useSettingsStore((s) => s.groupBy);
    const setGroupBy = useSettingsStore((s) => s.setGroupBy);
    const displayMode = useSettingsStore((s) => s.displayMode);
    const activeDisplayPresetId = useSettingsStore((s) => s.activeDisplayPresetId);
    const setActiveDisplayPreset = useSettingsStore((s) => s.setActiveDisplayPreset);
    const thumbnailPresentation = useSettingsStore((s) => s.thumbnailPresentation);
    const setThumbnailPresentation = useSettingsStore((s) => s.setThumbnailPresentation);
    const displayPresetDirectory = useDisplayPresetStore((s) => s.directory);
    const displayPresetCount = useDisplayPresetStore((s) => s.presets.length);
    const displayPresetWarnings = useDisplayPresetStore((s) => s.warnings);
    const loadDisplayPresets = useDisplayPresetStore((s) => s.loadDisplayPresets);
    const isReloadingDisplayPresets = useDisplayPresetStore((s) => s.isLoading);
    const externalDisplayPresets = useDisplayPresetStore((s) => s.presets);

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [logs, setLogs] = useState<string[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logLoadError, setLogLoadError] = useState<string>('');
    const [logActionMessage, setLogActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [folderScanSettingsManagerOpen, setFolderScanSettingsManagerOpen] = useState(false);
    const [perfDebugFlags, setPerfDebugFlagsState] = useState<PerfDebugFlags>(() => getPerfDebugFlags());

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
    const activeTabMeta = React.useMemo(() => getSettingsTabMeta(activeTab), [activeTab]);
    const displayPresetMenuOptions = React.useMemo(
        () => getDisplayPresetMenuOptions(externalDisplayPresets),
        [externalDisplayPresets]
    );
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
        isExportingSettings,
        isImportingSettings,
        handleSelectImportCsv,
        handleSelectLegacyImportCsv,
        handleApplyCsvImport,
        handleExportSettings,
        handleImportSettings,
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

    const handleScanExclusionRulesChange = useCallback(async (rules: typeof scanExclusionRules) => {
        setScanExclusionRules(rules);
        try {
            await window.electronAPI.setScanExclusionRules(rules);
        } catch (error) {
            console.error('Failed to update scan exclusion rules:', error);
            useUIStore.getState().showToast('スキャン除外ルールの保存に失敗しました', 'error');
        }
    }, [setScanExclusionRules]);

    const handleStorageMaintenanceSettingsChange = useCallback((settings: typeof storageMaintenanceSettings) => {
        setStorageMaintenanceSettings(settings);
    }, [setStorageMaintenanceSettings]);


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
        if (!isOpen) return;
        setPerfDebugFlagsState(getPerfDebugFlags());
        completeUiPerfTrace('settings-modal-open', { activeTab: requestedTab ?? activeTab });
    }, [activeTab, isOpen, requestedTab]);

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

    const handleResetListDisplayDefaults = useCallback(() => {
        setActiveDisplayPreset({
            id: DEFAULT_LIST_DISPLAY_SETTINGS.activeDisplayPresetId,
            baseDisplayMode: DEFAULT_LIST_DISPLAY_SETTINGS.displayMode,
            thumbnailPresentation: DEFAULT_LIST_DISPLAY_SETTINGS.thumbnailPresentation,
        });
        setThumbnailPresentation(DEFAULT_LIST_DISPLAY_SETTINGS.thumbnailPresentation);
        setSortBy(DEFAULT_LIST_DISPLAY_SETTINGS.sortBy);
        setSortOrder(DEFAULT_LIST_DISPLAY_SETTINGS.sortOrder);
        setGroupBy(DEFAULT_LIST_DISPLAY_SETTINGS.groupBy);
        setDefaultSearchTarget(DEFAULT_LIST_DISPLAY_SETTINGS.defaultSearchTarget);
    }, [setActiveDisplayPreset, setDefaultSearchTarget, setGroupBy, setSortBy, setSortOrder, setThumbnailPresentation]);

    const handleResetPlaybackSettings = useCallback(() => {
        setVideoVolume(DEFAULT_MEDIA_PLAYBACK_SETTINGS.videoVolume);
        setAudioVolume(DEFAULT_MEDIA_PLAYBACK_SETTINGS.audioVolume);
        setLightboxOverlayOpacity(DEFAULT_MEDIA_PLAYBACK_SETTINGS.lightboxOverlayOpacity);
        setPerformanceMode(DEFAULT_MEDIA_PLAYBACK_SETTINGS.performanceMode);
    }, [setAudioVolume, setLightboxOverlayOpacity, setPerformanceMode, setVideoVolume]);

    const handleResetFileCardSettings = useCallback(() => {
        setShowFileName(DEFAULT_FILE_CARD_SETTINGS.showFileName);
        setShowDuration(DEFAULT_FILE_CARD_SETTINGS.showDuration);
        setShowTags(DEFAULT_FILE_CARD_SETTINGS.showTags);
        setShowFileSize(DEFAULT_FILE_CARD_SETTINGS.showFileSize);
        setTagPopoverTrigger(DEFAULT_FILE_CARD_SETTINGS.tagPopoverTrigger);
        setTagDisplayStyle(DEFAULT_FILE_CARD_SETTINGS.tagDisplayStyle);
        setFileCardTagOrderMode(DEFAULT_FILE_CARD_SETTINGS.fileCardTagOrderMode);
    }, [
        setFileCardTagOrderMode,
        setShowDuration,
        setShowFileName,
        setShowFileSize,
        setShowTags,
        setTagDisplayStyle,
        setTagPopoverTrigger,
    ]);

    const handleResetScanExclusionRules = useCallback(() => {
        void handleScanExclusionRulesChange({ ...DEFAULT_SCAN_EXCLUSION_RULES });
    }, [handleScanExclusionRulesChange]);

    const handleResetProfileScanSettings = useCallback(async () => {
        const defaults = DEFAULT_PROFILE_SCOPED_SETTINGS;
        setProfileFileTypeFilters({ ...defaults.fileTypeFilters });
        setProfileScanThrottleMs(defaults.scanThrottleMs);

        try {
            await Promise.all([
                window.electronAPI.setProfileScopedSettings({
                    fileTypeFilters: defaults.fileTypeFilters,
                    scanThrottleMs: defaults.scanThrottleMs,
                }),
                window.electronAPI.setScanFileTypeCategories(defaults.fileTypeFilters),
                window.electronAPI.setScanThrottleMs(defaults.scanThrottleMs),
            ]);
        } catch (error) {
            console.error('Failed to reset profile scan settings:', error);
            useUIStore.getState().showToast('プロファイル別スキャン設定の初期化に失敗しました', 'error');
        }
    }, [setProfileFileTypeFilters, setProfileScanThrottleMs]);

    const handleResetProfileThumbnailSettings = useCallback(async () => {
        const defaults = DEFAULT_PROFILE_SCOPED_SETTINGS;
        setProfilePreviewFrameCount(defaults.previewFrameCount);
        setProfileThumbnailResolution(defaults.thumbnailResolution);

        try {
            await Promise.all([
                window.electronAPI.setProfileScopedSettings({
                    previewFrameCount: defaults.previewFrameCount,
                    thumbnailResolution: defaults.thumbnailResolution,
                }),
                window.electronAPI.setPreviewFrameCount(defaults.previewFrameCount),
                window.electronAPI.setThumbnailResolution(defaults.thumbnailResolution),
            ]);
        } catch (error) {
            console.error('Failed to reset profile thumbnail settings:', error);
            useUIStore.getState().showToast('プロファイル別サムネイル設定の初期化に失敗しました', 'error');
        }
    }, [setProfilePreviewFrameCount, setProfileThumbnailResolution]);

    const handleResetThumbnailBehaviorSettings = useCallback(() => {
        setThumbnailAction(DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.thumbnailAction);
        setFlipbookSpeed(DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.flipbookSpeed);
        setAnimatedImagePreviewMode(DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.animatedImagePreviewMode);
        setPlayModeJumpType(DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.playMode.jumpType);
        setPlayModeJumpInterval(DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.playMode.jumpInterval);
    }, [
        setAnimatedImagePreviewMode,
        setFlipbookSpeed,
        setPlayModeJumpInterval,
        setPlayModeJumpType,
        setThumbnailAction,
    ]);

    const handleResetRightPanelPreviewSettings = useCallback(() => {
        setRightPanelVideoPreviewMode(DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS.rightPanelVideoPreviewMode);
        setRightPanelVideoJumpInterval(DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS.rightPanelVideoJumpInterval);
    }, [setRightPanelVideoJumpInterval, setRightPanelVideoPreviewMode]);

    const handleResetStorageMaintenanceSettings = useCallback(() => {
        handleStorageMaintenanceSettingsChange({ ...DEFAULT_STORAGE_MAINTENANCE_SETTINGS });
    }, [handleStorageMaintenanceSettingsChange]);

    const handlePerfDebugFlagsChange = useCallback(async (patch: Partial<PerfDebugFlags>) => {
        const nextFlags = setPerfDebugFlags(patch);
        setPerfDebugFlagsState(nextFlags);
        await syncPerfDebugToMain(nextFlags.enabled);
        setLogActionMessage({
            type: 'info',
            text: `開発用 perf 計測を${nextFlags.enabled ? '有効化' : '無効化'}しました。詳細ログは DevTools の console と main log を確認してください。`,
        });
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60" style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="mx-4 flex h-[82vh] min-h-[620px] max-h-[82vh] w-full max-w-5xl flex-col rounded-lg bg-surface-900 shadow-xl"
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

                {/* Content */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <SettingsTabNav activeTab={activeTab} onSelectTab={setActiveTab} />

                    <div className="min-w-0 flex-1 overflow-y-auto">
                        <div className="border-b border-surface-800 bg-surface-900/95 px-5 py-4 backdrop-blur-sm">
                            <h3 className="text-base font-semibold text-surface-100">
                                {activeTabMeta.label}
                            </h3>
                            <p className="mt-1 text-sm text-surface-400">
                                {activeTabMeta.description}
                            </p>
                        </div>

                        {activeTab === 'general' && (
                            <GeneralSettingsTab
                                defaultDisplayPresetId={activeDisplayPresetId}
                                defaultThumbnailPresentation={thumbnailPresentation}
                                defaultSortBy={sortBy}
                                defaultSortOrder={sortOrder}
                                defaultGroupBy={groupBy}
                                defaultSearchTarget={defaultSearchTarget}
                                displayPresetOptions={displayPresetMenuOptions.map((option) => ({
                                    id: option.id,
                                    label: option.definition.label,
                                    baseDisplayMode: option.baseDisplayMode,
                                    thumbnailPresentation: option.thumbnailPresentation,
                                }))}
                                onDefaultDisplayPresetChange={setActiveDisplayPreset}
                                onDefaultThumbnailPresentationChange={setThumbnailPresentation}
                                onDefaultSortByChange={setSortBy}
                                onDefaultSortOrderChange={setSortOrder}
                                onDefaultGroupByChange={setGroupBy}
                                onDefaultSearchTargetChange={setDefaultSearchTarget}
                                videoVolume={videoVolume}
                                onVideoVolumeChange={setVideoVolume}
                                audioVolume={audioVolume}
                                onAudioVolumeChange={setAudioVolume}
                                lightboxOverlayOpacity={lightboxOverlayOpacity}
                                onLightboxOverlayOpacityChange={setLightboxOverlayOpacity}
                                performanceMode={performanceMode}
                                onPerformanceModeChange={setPerformanceMode}
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
                                onResetListDisplayDefaults={handleResetListDisplayDefaults}
                                onResetPlaybackSettings={handleResetPlaybackSettings}
                                onResetFileCardSettings={handleResetFileCardSettings}
                            />
                        )}

                        {activeTab === 'scan' && (
                            <ScanSettingsTab
                                activeProfileLabel={activeProfileLabel}
                                scanExclusionRules={scanExclusionRules}
                                onScanExclusionRulesChange={(rules) => { void handleScanExclusionRulesChange(rules); }}
                                profileFileTypeFilters={profileFileTypeFilters}
                                onProfileFileTypeToggle={(category, checked) => { void handleProfileFileTypeToggle(category, checked); }}
                                onOpenFolderScanSettingsManager={() => setFolderScanSettingsManagerOpen(true)}
                                scanThrottleMs={scanThrottleMs}
                                onProfileScanThrottleMsChange={(ms) => { void handleProfileScanThrottleMsChange(ms); }}
                                onResetScanExclusionRules={handleResetScanExclusionRules}
                                onResetProfileScanSettings={() => { void handleResetProfileScanSettings(); }}
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
                                onResetProfileThumbnailSettings={() => { void handleResetProfileThumbnailSettings(); }}
                                onResetThumbnailBehaviorSettings={handleResetThumbnailBehaviorSettings}
                                onResetRightPanelPreviewSettings={handleResetRightPanelPreviewSettings}
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
                                storageMaintenanceSettings={storageMaintenanceSettings}
                                onStorageMaintenanceSettingsChange={handleStorageMaintenanceSettingsChange}
                                onResetStorageMaintenanceSettings={handleResetStorageMaintenanceSettings}
                            />
                        )}

                        {activeTab === 'apps' && (
                            <ExternalAppsTab />
                        )}

                        {activeTab === 'maintenance' && (
                            <MaintenanceSettingsTab
                                isCheckingForUpdates={isCheckingForUpdates}
                                updateCheckState={updateCheckState}
                                onCheckForUpdates={() => { void handleCheckForUpdates(); }}
                                isDownloadingUpdateZip={isDownloadingUpdateZip}
                                updateDownloadState={updateDownloadState}
                                onDownloadLatestUpdateZip={() => { void handleDownloadLatestUpdateZip(); }}
                                isApplyingUpdate={isApplyingUpdate}
                                onApplyUpdateFromZip={() => { void handleApplyUpdateFromZip(); }}
                                onApplyUpdateViaZipDialog={() => { void handleApplyUpdateViaZipDialog(); }}
                            />
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
                                perfDebugAvailable={import.meta.env.DEV}
                                perfDebugFlags={perfDebugFlags}
                                onPerfDebugFlagsChange={(patch) => { void handlePerfDebugFlagsChange(patch); }}
                            />
                        )}

                        {activeTab === 'backup' && (
                            <BackupSettingsTab
                                currentLoadedExportRowsCount={currentLoadedExportRows.length}
                                activeProfileLabel={activeProfileLabel}
                                isExportingSettings={isExportingSettings}
                                isImportingSettings={isImportingSettings}
                                onExportSettings={() => { void handleExportSettings(); }}
                                onImportSettings={() => { void handleImportSettings(); }}
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
