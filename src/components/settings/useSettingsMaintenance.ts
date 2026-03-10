import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFileStore } from '../../stores/useFileStore';
import { useRatingStore } from '../../stores/useRatingStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUIStore, type SettingsModalTab } from '../../stores/useUIStore';
import { buildCsvContent, buildFileExportRows, buildHtmlContent } from '../../utils/fileExport';
import {
    parseLegacyAppCsvFromBytes,
    parseMediaArchiverExportCsvFromBytes,
    type CsvImportDryRunSummary,
    type MediaArchiverCsvImportRow,
} from '../../utils/fileImport';
import { buildSettingsExportPayload, parseSettingsImportPayload } from '../../utils/settingsTransfer';

type StorageMode = 'appdata' | 'install' | 'custom';

interface StorageConfig {
    mode: StorageMode;
    customPath?: string;
    resolvedPath: string;
}

export interface UpdateCheckUiState {
    checkedAt: number;
    result: AppUpdateCheckResult;
}

interface UseSettingsMaintenanceParams {
    isOpen: boolean;
    activeTab: SettingsModalTab;
    rawFiles: ReturnType<typeof useFileStore.getState>['files'];
    fileTagsCache: ReturnType<typeof useFileStore.getState>['fileTagsCache'];
    currentFolderId: string | null;
    allTags: ReturnType<typeof useTagStore.getState>['tags'];
    activeProfileId: string;
    activeProfileLabel: string;
}

const ALL_FILES_ID = '__all__';
const DRIVE_PREFIX = '__drive:';
const FOLDER_PREFIX = '__folder:';

export function useSettingsMaintenance({
    isOpen,
    activeTab,
    rawFiles,
    fileTagsCache,
    currentFolderId,
    allTags,
    activeProfileId,
    activeProfileLabel,
}: UseSettingsMaintenanceParams) {
    const [appVersion, setAppVersion] = useState('');
    const [isLoadingBundledReleaseNotes, setIsLoadingBundledReleaseNotes] = useState(false);
    const [bundledReleaseNotesState, setBundledReleaseNotesState] = useState<AppBundledReleaseNotesResult | null>(null);
    const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
    const [updateCheckState, setUpdateCheckState] = useState<UpdateCheckUiState | null>(null);
    const [isDownloadingUpdateZip, setIsDownloadingUpdateZip] = useState(false);
    const [updateDownloadState, setUpdateDownloadState] = useState<AppUpdateDownloadResult | null>(null);
    const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
    const [isExporting, setIsExporting] = useState<'csv' | 'html' | null>(null);
    const [exportScope, setExportScope] = useState<'profile' | 'folder'>('profile');
    const [isImportingCsv, setIsImportingCsv] = useState(false);
    const [isExportingSettings, setIsExportingSettings] = useState(false);
    const [isImportingSettings, setIsImportingSettings] = useState(false);
    const [selectedImportCsvPath, setSelectedImportCsvPath] = useState('');
    const [parsedImportRows, setParsedImportRows] = useState<MediaArchiverCsvImportRow[] | null>(null);
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [importDryRun, setImportDryRun] = useState<CsvImportDryRunSummary | null>(null);
    const [importSourceLabel, setImportSourceLabel] = useState('');
    const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
    const [selectedMode, setSelectedMode] = useState<StorageMode>('appdata');
    const [customPath, setCustomPath] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationMsg, setMigrationMsg] = useState<{ type: 'success' | 'error'; text: string; oldBase?: string } | null>(null);
    const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
    const [backupHistory, setBackupHistory] = useState<BackupInfo[]>([]);
    const [isLoadingBackupSettings, setIsLoadingBackupSettings] = useState(false);
    const [isSavingBackupSettings, setIsSavingBackupSettings] = useState(false);
    const [isLoadingBackupHistory, setIsLoadingBackupHistory] = useState(false);
    const [isRestoringBackup, setIsRestoringBackup] = useState(false);

    const currentLoadedExportRows = useMemo(() => {
        return buildFileExportRows(rawFiles, fileTagsCache, allTags);
    }, [allTags, fileTagsCache, rawFiles]);

    const exportScopeLabel = useMemo(() => {
        if (!currentFolderId || currentFolderId === ALL_FILES_ID) return 'すべてのファイル';
        if (currentFolderId.startsWith(DRIVE_PREFIX)) {
            return `ドライブ: ${currentFolderId.slice(DRIVE_PREFIX.length)}`;
        }
        if (currentFolderId.startsWith(FOLDER_PREFIX)) {
            return 'フォルダ（再帰）';
        }
        return 'フォルダ（直下）';
    }, [currentFolderId]);

    const canExportCurrentFolderScope = useMemo(() => {
        if (!currentFolderId || currentFolderId === ALL_FILES_ID) return false;
        if (currentFolderId.startsWith(DRIVE_PREFIX)) return false;
        return true;
    }, [currentFolderId]);

    const runCsvImportDryRun = useCallback(async (rows: MediaArchiverCsvImportRow[]) => {
        const profileFiles = await window.electronAPI.getFiles();
        const fileByPath = new Map(profileFiles.map((file) => [file.path, file]));
        const existingTags = await window.electronAPI.getAllTags();
        const existingTagByName = new Map(existingTags.map((tag) => [tag.name, tag]));
        const fileTagIdsMap = await window.electronAPI.getAllFileTagIds();
        const ratingAxes = await window.electronAPI.getRatingAxes();
        const overallAxis = ratingAxes.find((axis) => axis.isSystem) ?? ratingAxes[0] ?? null;

        let matchedRows = 0;
        let unmatchedRows = 0;
        let rowsWithTags = 0;
        let tagLinksToAdd = 0;
        let rowsWithRating = 0;
        let ratingUpdates = 0;
        let rowsWithMemo = 0;
        let memoUpdates = 0;
        const unmatchedPaths: string[] = [];
        const missingTagNames = new Set<string>();

        for (const row of rows) {
            const file = fileByPath.get(row.path);
            if (!file) {
                unmatchedRows += 1;
                unmatchedPaths.push(row.path);
                continue;
            }

            matchedRows += 1;
            if (row.tags.length > 0) rowsWithTags += 1;
            if (typeof row.ratingValue === 'number') {
                rowsWithRating += 1;
                if (overallAxis) ratingUpdates += 1;
            }
            if (row.memoText?.trim()) {
                rowsWithMemo += 1;
                memoUpdates += 1;
            }

            const currentTagIds = new Set(fileTagIdsMap[file.id] ?? []);
            for (const tagName of row.tags) {
                const existing = existingTagByName.get(tagName);
                if (!existing) {
                    missingTagNames.add(tagName);
                    tagLinksToAdd += 1;
                    continue;
                }
                if (!currentTagIds.has(existing.id)) {
                    tagLinksToAdd += 1;
                }
            }
        }

        const summary: CsvImportDryRunSummary = {
            totalRows: rows.length,
            matchedRows,
            unmatchedRows,
            rowsWithTags,
            tagLinksToAdd,
            newTagsToCreate: missingTagNames.size,
            rowsWithRating,
            ratingUpdates,
            rowsWithMemo,
            memoUpdates,
            unmatchedPaths: unmatchedPaths.slice(0, 20),
            missingTagNames: Array.from(missingTagNames).sort().slice(0, 30),
        };
        setImportDryRun(summary);
        return summary;
    }, []);

    const handleExport = useCallback(async (format: 'csv' | 'html') => {
        setIsExporting(format);
        try {
            let targetFiles = rawFiles;
            let scopeLabel = exportScopeLabel;

            if (exportScope === 'profile') {
                targetFiles = await window.electronAPI.getFiles();
                scopeLabel = 'プロファイル全体';
            } else {
                if (!canExportCurrentFolderScope || !currentFolderId) {
                    useUIStore.getState().showToast('フォルダ全体エクスポートにはフォルダを選択してください', 'info');
                    return;
                }
                if (currentFolderId.startsWith(FOLDER_PREFIX)) {
                    targetFiles = await window.electronAPI.getFilesByFolderRecursive(currentFolderId.slice(FOLDER_PREFIX.length));
                    scopeLabel = '現在選択フォルダ全体（再帰）';
                } else {
                    targetFiles = await window.electronAPI.getFilesByFolderRecursive(currentFolderId);
                    scopeLabel = '現在選択フォルダ全体';
                }
            }

            const exportRows = buildFileExportRows(targetFiles, fileTagsCache, allTags);
            if (exportRows.length === 0) {
                useUIStore.getState().showToast('エクスポート対象のファイルがありません', 'info');
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const ext = format === 'csv' ? 'csv' : 'html';
            const content = format === 'csv'
                ? buildCsvContent(exportRows)
                : buildHtmlContent(exportRows, {
                    profileLabel: activeProfileLabel,
                    scopeLabel,
                });

            const result = await window.electronAPI.saveTextFile({
                title: format === 'csv' ? 'CSVエクスポート' : 'HTMLエクスポート',
                defaultPath: `mediaarchiver-export-${timestamp}.${ext}`,
                filters: [
                    format === 'csv'
                        ? { name: 'CSV Files', extensions: ['csv'] }
                        : { name: 'HTML Files', extensions: ['html', 'htm'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
                content,
            });

            if (!result.canceled) {
                useUIStore.getState().showToast(`${exportRows.length}件を${format.toUpperCase()}出力しました`, 'success');
            }
        } catch (error) {
            console.error('Export failed:', error);
            useUIStore.getState().showToast(`${format.toUpperCase()}出力に失敗しました`, 'error');
        } finally {
            setIsExporting(null);
        }
    }, [activeProfileLabel, allTags, canExportCurrentFolderScope, currentFolderId, exportScope, exportScopeLabel, fileTagsCache, rawFiles]);

    const resetImportState = useCallback(() => {
        setParsedImportRows(null);
        setImportDryRun(null);
        setImportWarnings([]);
        setImportSourceLabel('');
    }, []);

    const handleSelectImportCsv = useCallback(async () => {
        try {
            const result = await window.electronAPI.openBinaryFile({
                title: 'このアプリのエクスポートCSVを選択',
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.filePath || !result.bytes) return;

            const parsed = parseMediaArchiverExportCsvFromBytes(result.bytes);
            setSelectedImportCsvPath(result.filePath);
            setParsedImportRows(parsed.rows);
            setImportWarnings(parsed.warnings);
            setImportSourceLabel('このアプリ形式CSV');
            await runCsvImportDryRun(parsed.rows);
            useUIStore.getState().showToast(`CSVを解析しました（${parsed.rows.length}行）`, 'success');
        } catch (error) {
            console.error('CSV parse failed:', error);
            resetImportState();
            useUIStore.getState().showToast(`CSV解析に失敗しました: ${(error as Error).message}`, 'error', 5000);
        }
    }, [resetImportState, runCsvImportDryRun]);

    const handleSelectLegacyImportCsv = useCallback(async () => {
        try {
            const result = await window.electronAPI.openBinaryFile({
                title: '旧アプリのCSVを選択（互換インポート）',
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.filePath || !result.bytes) return;

            const parsed = parseLegacyAppCsvFromBytes(result.bytes);
            setSelectedImportCsvPath(result.filePath);
            setParsedImportRows(parsed.rows);
            setImportWarnings(parsed.warnings);
            setImportSourceLabel('旧アプリCSV（互換）');
            await runCsvImportDryRun(parsed.rows);
            useUIStore.getState().showToast(`旧CSVを解析しました（${parsed.rows.length}行）`, 'success');
        } catch (error) {
            console.error('Legacy CSV parse failed:', error);
            resetImportState();
            useUIStore.getState().showToast(`旧CSV解析に失敗しました: ${(error as Error).message}`, 'error', 5000);
        }
    }, [resetImportState, runCsvImportDryRun]);

    const handleApplyCsvImport = useCallback(async () => {
        if (!parsedImportRows || parsedImportRows.length === 0) {
            useUIStore.getState().showToast('先にCSVを選択して解析してください', 'info');
            return;
        }

        setIsImportingCsv(true);
        try {
            const profileFiles = await window.electronAPI.getFiles();
            const fileByPath = new Map(profileFiles.map((file) => [file.path, file]));
            const allTagsLatest = await window.electronAPI.getAllTags();
            const tagByName = new Map(allTagsLatest.map((tag) => [tag.name, tag]));
            const allFileTagIds = await window.electronAPI.getAllFileTagIds();
            const ratingAxes = await window.electronAPI.getRatingAxes();
            const overallAxis = ratingAxes.find((axis) => axis.isSystem) ?? ratingAxes[0] ?? null;

            let createdTags = 0;
            let addedLinks = 0;
            let skippedRows = 0;
            let updatedRatings = 0;
            let updatedMemos = 0;

            for (const row of parsedImportRows) {
                const targetFile = fileByPath.get(row.path);
                if (!targetFile) {
                    skippedRows += 1;
                    continue;
                }

                const currentTagIds = new Set(allFileTagIds[targetFile.id] ?? []);

                for (const tagName of row.tags) {
                    if (!tagName) continue;

                    let tag = tagByName.get(tagName);
                    if (!tag) {
                        const color = row.tagColorByName.get(tagName) || 'gray';
                        tag = await window.electronAPI.createTag(tagName, color);
                        tagByName.set(tagName, tag);
                        createdTags += 1;
                    }

                    if (!currentTagIds.has(tag.id)) {
                        await window.electronAPI.addTagToFile(targetFile.id, tag.id);
                        currentTagIds.add(tag.id);
                        addedLinks += 1;
                    }
                }

                if (overallAxis && typeof row.ratingValue === 'number') {
                    await window.electronAPI.setFileRating(targetFile.id, overallAxis.id, row.ratingValue);
                    updatedRatings += 1;
                }

                if (row.memoText?.trim()) {
                    const nextMemo = targetFile.notes?.trim()
                        ? `${targetFile.notes}\n\n[旧CSVコメント]\n${row.memoText}`
                        : row.memoText;
                    await window.electronAPI.updateFileNotes(targetFile.id, nextMemo);
                    targetFile.notes = nextMemo;
                    updatedMemos += 1;
                }
            }

            await useTagStore.getState().loadTags();
            await useFileStore.getState().loadFileTagsCache();
            await useRatingStore.getState().loadAllFileRatings();

            useUIStore.getState().showToast(
                `CSVインポート完了: タグ作成 ${createdTags}件 / タグ付与 ${addedLinks}件 / 未一致 ${skippedRows}行`,
                'success',
                5000
            );
            if (updatedRatings > 0) {
                useUIStore.getState().showToast(`評価を ${updatedRatings} 件更新しました`, 'info', 4000);
            }
            if (updatedMemos > 0) {
                useUIStore.getState().showToast(`メモを ${updatedMemos} 件追記しました`, 'info', 4000);
            }

            await runCsvImportDryRun(parsedImportRows);
        } catch (error) {
            console.error('CSV import failed:', error);
            useUIStore.getState().showToast(`CSVインポートに失敗しました: ${(error as Error).message}`, 'error', 5000);
        } finally {
            setIsImportingCsv(false);
        }
    }, [parsedImportRows, runCsvImportDryRun]);

    const handleExportSettings = useCallback(async () => {
        if (isExportingSettings) return;
        setIsExportingSettings(true);
        try {
            const settings = useSettingsStore.getState();
            const profileResponse = await window.electronAPI.getProfileScopedSettings();
            const payload = buildSettingsExportPayload(
                {
                    thumbnailAction: settings.thumbnailAction,
                    flipbookSpeed: settings.flipbookSpeed,
                    animatedImagePreviewMode: settings.animatedImagePreviewMode,
                    rightPanelVideoPreviewMode: settings.rightPanelVideoPreviewMode,
                    rightPanelVideoJumpInterval: settings.rightPanelVideoJumpInterval,
                    sortBy: settings.sortBy,
                    sortOrder: settings.sortOrder,
                    defaultSearchTarget: settings.defaultSearchTarget,
                    videoVolume: settings.videoVolume,
                    audioVolume: settings.audioVolume,
                    lightboxOverlayOpacity: settings.lightboxOverlayOpacity,
                    performanceMode: settings.performanceMode,
                    scanExclusionRules: settings.scanExclusionRules,
                    storageMaintenanceSettings: settings.storageMaintenanceSettings,
                    showFileName: settings.showFileName,
                    showDuration: settings.showDuration,
                    showTags: settings.showTags,
                    showFileSize: settings.showFileSize,
                    activeDisplayPresetId: settings.activeDisplayPresetId,
                    displayMode: settings.displayMode,
                    layoutPreset: settings.layoutPreset,
                    thumbnailPresentation: settings.thumbnailPresentation,
                    externalApps: settings.externalApps,
                    groupBy: settings.groupBy,
                    tagPopoverTrigger: settings.tagPopoverTrigger,
                    tagDisplayStyle: settings.tagDisplayStyle,
                    fileCardTagOrderMode: settings.fileCardTagOrderMode,
                    playMode: settings.playMode,
                },
                profileResponse.settings
            );

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const result = await window.electronAPI.saveTextFile({
                title: '設定を書き出し',
                defaultPath: `mediaarchiver-settings-${timestamp}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
                content: JSON.stringify(payload, null, 2),
            });

            if (!result.canceled) {
                useUIStore.getState().showToast('設定を書き出しました', 'success');
            }
        } catch (error) {
            console.error('Settings export failed:', error);
            useUIStore.getState().showToast('設定の書き出しに失敗しました', 'error');
        } finally {
            setIsExportingSettings(false);
        }
    }, [isExportingSettings]);

    const handleImportSettings = useCallback(async () => {
        if (isImportingSettings) return;

        const confirmed = window.confirm(
            '設定ファイルを読み込むと、全体設定と現在のプロファイル設定を上書きします。続行しますか？'
        );
        if (!confirmed) return;

        setIsImportingSettings(true);
        try {
            const result = await window.electronAPI.openTextFile({
                title: '設定を読み込む',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            });

            if (result.canceled || !result.content) return;

            const payload = parseSettingsImportPayload(result.content);
            const importedGlobalSettings = payload.globalSettings as typeof payload.globalSettings & {
                rightPanelVideoMuted?: boolean;
                cardLayout?: string;
            };
            const {
                scanExclusionRules,
                storageMaintenanceSettings,
                rightPanelVideoMuted: _legacyRightPanelVideoMuted,
                cardLayout: _legacyCardLayout,
                ...globalSettings
            } = importedGlobalSettings;

            useSettingsStore.setState((state) => ({
                ...state,
                ...globalSettings,
            }));
            useSettingsStore.getState().setScanExclusionRules(scanExclusionRules);
            useSettingsStore.getState().setStorageMaintenanceSettings(storageMaintenanceSettings);

            useUIStore.getState().applyProfileScopedUiDefaults({
                defaultSearchTarget: payload.globalSettings.defaultSearchTarget,
                listDisplayDefaults: {
                    sortBy: payload.globalSettings.sortBy,
                    sortOrder: payload.globalSettings.sortOrder,
                    groupBy: payload.globalSettings.groupBy,
                    displayMode: payload.globalSettings.displayMode,
                    activeDisplayPresetId: payload.globalSettings.activeDisplayPresetId,
                    thumbnailPresentation: payload.globalSettings.thumbnailPresentation,
                },
            });

            await window.electronAPI.setScanExclusionRules(scanExclusionRules);
            await window.electronAPI.replaceProfileScopedSettings(payload.profileSettings);
            useSettingsStore.getState().applyProfileScopedSettings(payload.profileSettings);
            useUIStore.getState().applyProfileScopedUiDefaults({
                defaultSearchTarget: payload.profileSettings.listDisplayDefaults.defaultSearchTarget,
                listDisplayDefaults: {
                    sortBy: payload.profileSettings.listDisplayDefaults.sortBy,
                    sortOrder: payload.profileSettings.listDisplayDefaults.sortOrder,
                    groupBy: payload.profileSettings.listDisplayDefaults.groupBy,
                    displayMode: payload.profileSettings.listDisplayDefaults.displayMode,
                    activeDisplayPresetId: payload.profileSettings.listDisplayDefaults.activeDisplayPresetId,
                    thumbnailPresentation: payload.profileSettings.listDisplayDefaults.thumbnailPresentation,
                },
            });
            await Promise.all([
                window.electronAPI.setPreviewFrameCount(payload.profileSettings.previewFrameCount),
                window.electronAPI.setScanFileTypeCategories(payload.profileSettings.fileTypeFilters),
                window.electronAPI.setScanThrottleMs(payload.profileSettings.scanThrottleMs),
                window.electronAPI.setThumbnailResolution(payload.profileSettings.thumbnailResolution),
            ]);

            useUIStore.getState().showToast('設定を読み込みました', 'success');
        } catch (error) {
            console.error('Settings import failed:', error);
            useUIStore.getState().showToast(`設定の読み込みに失敗しました: ${(error as Error).message}`, 'error', 5000);
        } finally {
            setIsImportingSettings(false);
        }
    }, [isImportingSettings]);

    const loadStorageConfig = useCallback(async () => {
        try {
            const config = await window.electronAPI.getStorageConfig();
            setStorageConfig(config);
            setSelectedMode(config.mode);
            setCustomPath(config.customPath ?? '');
        } catch (error) {
            console.error('Failed to load storage config:', error);
        }
    }, []);

    const handleBrowseStorageFolder = useCallback(async () => {
        const path = await window.electronAPI.browseStorageFolder();
        if (path) setCustomPath(path);
    }, []);

    const loadBackupSettingsState = useCallback(async () => {
        setIsLoadingBackupSettings(true);
        try {
            const settings = await window.electronAPI.getBackupSettings();
            setBackupSettings(settings);
        } catch (error) {
            console.error('Failed to load backup settings:', error);
            useUIStore.getState().showToast('バックアップ設定の読み込みに失敗しました', 'error');
        } finally {
            setIsLoadingBackupSettings(false);
        }
    }, []);

    const loadBackupHistory = useCallback(async () => {
        if (!activeProfileId) return;
        setIsLoadingBackupHistory(true);
        try {
            const history = await window.electronAPI.getBackupHistory(activeProfileId);
            setBackupHistory(history);
        } catch (error) {
            console.error('Failed to load backup history:', error);
            useUIStore.getState().showToast('バックアップ履歴の読み込みに失敗しました', 'error');
        } finally {
            setIsLoadingBackupHistory(false);
        }
    }, [activeProfileId]);

    const handleBackupSettingsChange = useCallback(async (patch: Partial<BackupSettings>) => {
        if (!backupSettings) return;

        const nextSettings: BackupSettings = {
            ...backupSettings,
            ...patch,
        };

        setBackupSettings(nextSettings);
        setIsSavingBackupSettings(true);
        try {
            await window.electronAPI.setBackupSettings(nextSettings);
            setBackupSettings(await window.electronAPI.getBackupSettings());
        } catch (error) {
            console.error('Failed to save backup settings:', error);
            useUIStore.getState().showToast('バックアップ設定の保存に失敗しました', 'error');
            await loadBackupSettingsState();
        } finally {
            setIsSavingBackupSettings(false);
        }
    }, [backupSettings, loadBackupSettingsState]);

    const handleBrowseBackupPath = useCallback(async () => {
        const selectedPath = await window.electronAPI.selectFolder();
        if (!selectedPath) return;
        await handleBackupSettingsChange({ backupPath: selectedPath });
    }, [handleBackupSettingsChange]);

    const handleRestoreBackup = useCallback(async (backupPath: string) => {
        if (isRestoringBackup) return;
        setIsRestoringBackup(true);
        try {
            const result = await window.electronAPI.restoreBackup(backupPath);
            if (!result.success && !result.cancelled) {
                useUIStore.getState().showToast(`バックアップの復元に失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
            }
        } catch (error) {
            console.error('Restore backup failed:', error);
            useUIStore.getState().showToast(`バックアップの復元に失敗しました: ${(error as Error).message}`, 'error', 5000);
        } finally {
            setIsRestoringBackup(false);
        }
    }, [isRestoringBackup]);

    const handleMigrate = useCallback(async () => {
        if (isMigrating) return;
        setIsMigrating(true);
        setMigrationMsg(null);
        try {
            const result = await window.electronAPI.setStorageConfig(
                selectedMode,
                selectedMode === 'custom' ? customPath : undefined
            );
            if (result.success) {
                setMigrationMsg({ type: 'success', text: `移行完了: ${result.newBase}`, oldBase: result.oldBase });
                await loadStorageConfig();
            } else {
                setMigrationMsg({ type: 'error', text: result.error ?? '移行に失敗しました' });
            }
        } catch (error) {
            setMigrationMsg({ type: 'error', text: error instanceof Error ? error.message : String(error) });
        } finally {
            setIsMigrating(false);
        }
    }, [customPath, isMigrating, loadStorageConfig, selectedMode]);

    const handleDeleteOldData = useCallback(async () => {
        if (!migrationMsg?.oldBase) return;
        if (!window.confirm(`旧データを削除しますか？\n${migrationMsg.oldBase}\n\nこの操作は元に戻せません。`)) return;
        const result = await window.electronAPI.deleteOldStorageData(migrationMsg.oldBase);
        if (result.success) {
            setMigrationMsg(null);
            window.alert('旧データを削除しました');
        } else {
            window.alert(`削除失敗: ${result.error}`);
        }
    }, [migrationMsg?.oldBase]);

    const handleCheckForUpdates = useCallback(async () => {
        if (isCheckingForUpdates) return;
        setIsCheckingForUpdates(true);
        try {
            const result = await window.electronAPI.checkForAppUpdate();
            setUpdateCheckState({ checkedAt: Date.now(), result });
            if (!result.success) {
                useUIStore.getState().showToast(`更新確認に失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
                return;
            }
            if (result.hasUpdate) {
                useUIStore.getState().showToast(`更新があります（最新: v${result.latestVersion}）`, 'info', 5000);
            } else {
                useUIStore.getState().showToast('最新バージョンです', 'success', 3000);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setUpdateCheckState({
                checkedAt: Date.now(),
                result: {
                    success: false,
                    currentVersion: appVersion || 'unknown',
                    sourceUrl: 'unknown',
                    error: message,
                },
            });
            useUIStore.getState().showToast(`更新確認に失敗しました: ${message}`, 'error', 5000);
        } finally {
            setIsCheckingForUpdates(false);
        }
    }, [appVersion, isCheckingForUpdates]);

    const loadBundledReleaseNotes = useCallback(async () => {
        if (isLoadingBundledReleaseNotes) return;
        setIsLoadingBundledReleaseNotes(true);
        try {
            const result = await window.electronAPI.getBundledReleaseNotes();
            setBundledReleaseNotesState(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setBundledReleaseNotesState({
                success: false,
                version: appVersion || 'unknown',
                error: message,
            });
        } finally {
            setIsLoadingBundledReleaseNotes(false);
        }
    }, [appVersion, isLoadingBundledReleaseNotes]);

    const handleDownloadLatestUpdateZip = useCallback(async () => {
        if (isDownloadingUpdateZip) return;
        setIsDownloadingUpdateZip(true);
        try {
            const result = await window.electronAPI.downloadLatestUpdateZip();
            setUpdateDownloadState(result);
            if (!result.success) {
                useUIStore.getState().showToast(`更新ZIPの取得に失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
                return;
            }
            useUIStore.getState().showToast('更新ZIPをダウンロードし、ハッシュ検証が完了しました。', 'success', 5000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setUpdateDownloadState({
                success: false,
                sourceUrl: updateCheckState?.result.sourceUrl ?? 'unknown',
                error: message,
            });
            useUIStore.getState().showToast(`更新ZIPの取得に失敗しました: ${message}`, 'error', 5000);
        } finally {
            setIsDownloadingUpdateZip(false);
        }
    }, [isDownloadingUpdateZip, updateCheckState?.result.sourceUrl]);

    const handleOpenReleasePage = useCallback(async () => {
        const releaseUrl = updateCheckState?.result.releaseUrl;
        if (!releaseUrl) {
            useUIStore.getState().showToast('リリースページ URL が取得できていません', 'info');
            return;
        }

        try {
            await window.electronAPI.openUrl(releaseUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            useUIStore.getState().showToast(`リリースページを開けませんでした: ${message}`, 'error', 5000);
        }
    }, [updateCheckState?.result.releaseUrl]);

    const handleRevealDownloadedZip = useCallback(async () => {
        const downloadedZipPath = updateDownloadState?.filePath;
        if (!downloadedZipPath) {
            useUIStore.getState().showToast('取得済みの更新ZIPがありません', 'info');
            return;
        }

        try {
            await window.electronAPI.showInExplorer(downloadedZipPath);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            useUIStore.getState().showToast(`更新ZIPの場所を開けませんでした: ${message}`, 'error', 5000);
        }
    }, [updateDownloadState?.filePath]);

    const handleApplyUpdateFromZip = useCallback(async () => {
        if (
            isApplyingUpdate
            || !updateDownloadState?.success
            || !updateDownloadState.filePath
            || updateDownloadState.verified !== true
        ) {
            return;
        }
        const confirmed = window.confirm(
            '検証済みの更新ZIPで update.bat を起動します。実行するとアプリは終了されます。続行しますか？'
        );
        if (!confirmed) return;

        setIsApplyingUpdate(true);
        try {
            const result = await window.electronAPI.applyUpdateFromZip(updateDownloadState.filePath);
            if (!result.success) {
                useUIStore.getState().showToast(`更新適用の起動に失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
                return;
            }
            useUIStore.getState().showToast('update.bat を起動しました。更新処理を開始します。', 'info', 5000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            useUIStore.getState().showToast(`更新適用の起動に失敗しました: ${message}`, 'error', 5000);
        } finally {
            setIsApplyingUpdate(false);
        }
    }, [isApplyingUpdate, updateDownloadState]);

    const handleApplyUpdateViaZipDialog = useCallback(async () => {
        if (isApplyingUpdate) return;
        const confirmed = window.confirm(
            '手元の ZIP を指定して update.bat を起動します。ZIP選択後に更新が始まり、アプリは終了されます。続行しますか？'
        );
        if (!confirmed) return;

        setIsApplyingUpdate(true);
        try {
            const result = await window.electronAPI.applyUpdateFromZip();
            if (!result.success) {
                useUIStore.getState().showToast(`update.bat の起動に失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
                return;
            }
            useUIStore.getState().showToast('update.bat を起動しました。ZIP選択ダイアログで更新ファイルを指定してください。', 'info', 5000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            useUIStore.getState().showToast(`update.bat の起動に失敗しました: ${message}`, 'error', 5000);
        } finally {
            setIsApplyingUpdate(false);
        }
    }, [isApplyingUpdate]);

    const handleCreateBackup = useCallback(async () => {
        try {
            const profileId = await window.electronAPI.getActiveProfileId();
            const result = await window.electronAPI.createBackup(profileId);
            if (result.success) {
                useUIStore.getState().showToast('バックアップを作成しました', 'success');
                await loadBackupHistory();
            } else {
                useUIStore.getState().showToast(`バックアップに失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
            }
        } catch (error) {
            useUIStore.getState().showToast(`バックアップに失敗しました: ${(error as Error).message}`, 'error', 5000);
        }
    }, [loadBackupHistory]);

    useEffect(() => {
        if (isOpen && activeTab === 'storage') {
            void loadStorageConfig();
        }
    }, [activeTab, isOpen, loadStorageConfig]);

    useEffect(() => {
        if (isOpen && activeTab === 'backup') {
            void loadBackupSettingsState();
            void loadBackupHistory();
        }
    }, [activeProfileId, activeTab, isOpen, loadBackupHistory, loadBackupSettingsState]);

    useEffect(() => {
        if (isOpen && !appVersion) {
            window.electronAPI.getAppVersion().then((version: string) => setAppVersion(version)).catch(() => { });
        }
    }, [appVersion, isOpen]);

    useEffect(() => {
        const shouldLoad = isOpen
            && activeTab === 'maintenance'
            && !isLoadingBundledReleaseNotes
            && (
                !bundledReleaseNotesState
                || (appVersion ? bundledReleaseNotesState.version !== appVersion : false)
            );

        if (shouldLoad) {
            void loadBundledReleaseNotes();
        }
    }, [
        activeTab,
        appVersion,
        bundledReleaseNotesState,
        isLoadingBundledReleaseNotes,
        isOpen,
        loadBundledReleaseNotes,
    ]);

    return {
        appVersion,
        isLoadingBundledReleaseNotes,
        bundledReleaseNotesState,
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
        handleOpenReleasePage,
        handleRevealDownloadedZip,
        isApplyingUpdate,
        handleApplyUpdateFromZip,
        handleApplyUpdateViaZipDialog,
        handleCreateBackup,
        backupSettings,
        backupHistory,
        isLoadingBackupSettings,
        isSavingBackupSettings,
        isLoadingBackupHistory,
        isRestoringBackup,
        handleBackupSettingsChange,
        handleBrowseBackupPath,
        handleRestoreBackup,
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
    };
}
