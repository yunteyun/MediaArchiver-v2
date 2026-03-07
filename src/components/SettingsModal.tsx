/**
 * SettingsModal - アプリケーション設定モーダル（タブ式）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, RefreshCw, FolderOpen, HardDrive } from 'lucide-react';
import { useUIStore, type SettingsModalTab } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useTagStore } from '../stores/useTagStore';
import { useRatingStore } from '../stores/useRatingStore';
import { useProfileStore } from '../stores/useProfileStore';
import { ExternalAppsTab } from './ExternalAppsTab';
import { StorageCleanupSection } from './settings/StorageCleanupSection';
import { RatingAxesManager } from './settings/RatingAxesManager';
import { SettingsTabNav } from './settings/SettingsTabNav';
import { GeneralSettingsTab } from './settings/GeneralSettingsTab';
import { ScanSettingsTab } from './settings/ScanSettingsTab';
import { ThumbnailsSettingsTab } from './settings/ThumbnailsSettingsTab';
import { LogsSettingsTab } from './settings/LogsSettingsTab';
import { BackupSettingsTab } from './settings/BackupSettingsTab';
import { FolderScanSettingsManagerDialog } from './FolderScanSettingsManagerDialog';
import { buildCsvContent, buildFileExportRows, buildHtmlContent } from '../utils/fileExport';
import {
    parseLegacyAppCsvFromBytes,
    parseMediaArchiverExportCsvFromBytes,
    type CsvImportDryRunSummary,
    type MediaArchiverCsvImportRow
} from '../utils/fileImport';

// Phase 25: ローカル型定義
type StorageMode = 'appdata' | 'install' | 'custom';
interface StorageConfig { mode: StorageMode; customPath?: string; resolvedPath: string; }
interface UpdateCheckUiState {
    checkedAt: number;
    result: AppUpdateCheckResult;
}

const ALL_FILES_ID = '__all__';
const DRIVE_PREFIX = '__drive:';
const FOLDER_PREFIX = '__folder:';

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

    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [logs, setLogs] = useState<string[]>([]);
    const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logLoadError, setLogLoadError] = useState<string>('');
    const [logActionMessage, setLogActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    // Phase 26: バージョン表記
    const [appVersion, setAppVersion] = useState<string>('');
    const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
    const [updateCheckState, setUpdateCheckState] = useState<UpdateCheckUiState | null>(null);
    const [isDownloadingUpdateZip, setIsDownloadingUpdateZip] = useState(false);
    const [updateDownloadState, setUpdateDownloadState] = useState<AppUpdateDownloadResult | null>(null);
    const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
    const [folderScanSettingsManagerOpen, setFolderScanSettingsManagerOpen] = useState(false);

    // Export context (current visible list basis)
    const rawFiles = useFileStore((s) => s.files);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const allTags = useTagStore((s) => s.tags);
    const profiles = useProfileStore((s) => s.profiles);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const [isExporting, setIsExporting] = useState<'csv' | 'html' | null>(null);
    const [exportScope, setExportScope] = useState<'profile' | 'folder'>('profile');
    const [isImportingCsv, setIsImportingCsv] = useState(false);
    const [selectedImportCsvPath, setSelectedImportCsvPath] = useState<string>('');
    const [parsedImportRows, setParsedImportRows] = useState<MediaArchiverCsvImportRow[] | null>(null);
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [importDryRun, setImportDryRun] = useState<CsvImportDryRunSummary | null>(null);
    const [importSourceLabel, setImportSourceLabel] = useState<string>('');

    // Phase 25: ストレージ設定
    const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
    const [selectedMode, setSelectedMode] = useState<StorageMode>('appdata');
    const [customPath, setCustomPath] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationMsg, setMigrationMsg] = useState<{ type: 'success' | 'error'; text: string; oldBase?: string } | null>(null);

    const currentLoadedExportRows = React.useMemo(() => {
        return buildFileExportRows(rawFiles, fileTagsCache, allTags);
    }, [rawFiles, fileTagsCache, allTags]);

    const activeProfileLabel = React.useMemo(() => {
        const profile = profiles.find((p) => p.id === activeProfileId);
        return profile ? `${profile.name} (${profile.id})` : activeProfileId;
    }, [profiles, activeProfileId]);

    const exportScopeLabel = React.useMemo(() => {
        if (!currentFolderId || currentFolderId === ALL_FILES_ID) return 'すべてのファイル';
        if (currentFolderId.startsWith(DRIVE_PREFIX)) {
            return `ドライブ: ${currentFolderId.slice(DRIVE_PREFIX.length)}`;
        }
        if (currentFolderId.startsWith(FOLDER_PREFIX)) {
            return 'フォルダ（再帰）';
        }
        return 'フォルダ（直下）';
    }, [currentFolderId]);

    const canExportCurrentFolderScope = React.useMemo(() => {
        if (!currentFolderId || currentFolderId === ALL_FILES_ID) return false;
        if (currentFolderId.startsWith(DRIVE_PREFIX)) return false;
        return true;
    }, [currentFolderId]);

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

    const handleExportFromSettings = useCallback(async (format: 'csv' | 'html') => {
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
                    { name: 'All Files', extensions: ['*'] }
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
    }, [rawFiles, exportScope, exportScopeLabel, canExportCurrentFolderScope, currentFolderId, fileTagsCache, allTags, activeProfileLabel]);

    const runCsvImportDryRun = useCallback(async (rows: MediaArchiverCsvImportRow[]) => {
        const profileFiles = await window.electronAPI.getFiles();
        const fileByPath = new Map(profileFiles.map((f) => [f.path, f]));
        const existingTags = await window.electronAPI.getAllTags();
        const existingTagByName = new Map(existingTags.map((t) => [t.name, t]));
        const fileTagIdsMap = await window.electronAPI.getAllFileTagIds();
        const ratingAxes = await window.electronAPI.getRatingAxes();
        const overallAxis = ratingAxes.find((a) => a.isSystem) ?? ratingAxes[0] ?? null;

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
            setParsedImportRows(null);
            setImportDryRun(null);
            setImportWarnings([]);
            setImportSourceLabel('');
            useUIStore.getState().showToast(`CSV解析に失敗しました: ${(error as Error).message}`, 'error', 5000);
        }
    }, [runCsvImportDryRun]);

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
            setParsedImportRows(null);
            setImportDryRun(null);
            setImportWarnings([]);
            setImportSourceLabel('');
            useUIStore.getState().showToast(`旧CSV解析に失敗しました: ${(error as Error).message}`, 'error', 5000);
        }
    }, [runCsvImportDryRun]);

    const handleApplyCsvImport = useCallback(async () => {
        if (!parsedImportRows || parsedImportRows.length === 0) {
            useUIStore.getState().showToast('先にCSVを選択して解析してください', 'info');
            return;
        }

        setIsImportingCsv(true);
        try {
            const profileFiles = await window.electronAPI.getFiles();
            const fileByPath = new Map(profileFiles.map((f) => [f.path, f]));

            const allTagsLatest = await window.electronAPI.getAllTags();
            const tagByName = new Map(allTagsLatest.map((t) => [t.name, t]));
            const allFileTagIds = await window.electronAPI.getAllFileTagIds();
            const ratingAxes = await window.electronAPI.getRatingAxes();
            const overallAxis = ratingAxes.find((a) => a.isSystem) ?? ratingAxes[0] ?? null;

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

            // Store cache refresh (tag filter / list consistency)
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

    const loadStorageConfig = useCallback(async () => {
        try {
            const cfg = await window.electronAPI.getStorageConfig();
            setStorageConfig(cfg);
            setSelectedMode(cfg.mode);
            setCustomPath(cfg.customPath ?? '');
        } catch (e) {
            console.error('Failed to load storage config:', e);
        }
    }, []);

    const handleMigrate = async () => {
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
        }
        setIsMigrating(false);
    };

    const handleDeleteOldData = async () => {
        if (!migrationMsg?.oldBase) return;
        if (!confirm(`旧データを削除しますか？\n${migrationMsg.oldBase}\n\nこの操作は元に戻せません。`)) return;
        const result = await window.electronAPI.deleteOldStorageData(migrationMsg.oldBase);
        if (result.success) {
            setMigrationMsg(null);
            alert('旧データを削除しました');
        } else {
            alert(`削除失敗: ${result.error}`);
        }
    };


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
        if (isOpen && activeTab === 'storage') {
            loadStorageConfig();
        }
    }, [isOpen, activeTab, loadLogs, loadStorageConfig]);

    // Phase 26: バージョン取得
    useEffect(() => {
        if (isOpen && !appVersion) {
            window.electronAPI.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => { });
        }
    }, [isOpen, appVersion]);

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

    const handleApplyUpdateFromZip = useCallback(async () => {
        if (
            isApplyingUpdate
            || !updateDownloadState?.success
            || !updateDownloadState.filePath
            || updateDownloadState.verified !== true
        ) return;
        const confirmed = window.confirm(
            'update.bat を起動して更新を適用します。実行するとアプリは終了されます。続行しますか？'
        );
        if (!confirmed) return;

        setIsApplyingUpdate(true);
        try {
            const result = await window.electronAPI.applyUpdateFromZip(updateDownloadState.filePath);
            if (!result.success) {
                useUIStore.getState().showToast(`更新適用の起動に失敗しました: ${result.error ?? 'unknown error'}`, 'error', 5000);
                return;
            }
            useUIStore.getState().showToast('update.bat を起動しました。更新処理を実行します。', 'info', 5000);
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
            '従来方式で update.bat を起動します。ZIP選択後に更新が始まり、アプリは終了されます。続行しますか？'
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
                alert('バックアップが作成されました');
            } else {
                alert(`バックアップ失敗: ${result.error}`);
            }
        } catch (error) {
            alert(`エラー: ${(error as Error).message}`);
        }
    }, []);

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
                        <div className="px-4 py-4 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2 flex items-center gap-2">
                                    <HardDrive size={15} />
                                    保存場所
                                </h3>
                                <p className="text-xs text-surface-500">
                                    データベース、サムネイル、プレビューキャッシュ、ログなどの保存先をまとめて切り替えます。
                                </p>

                                {storageConfig && (
                                    <p className="text-xs text-surface-400">
                                        現在: <span className="text-surface-200 font-mono">{storageConfig.resolvedPath}</span>
                                    </p>
                                )}

                                <div className="space-y-2">
                                    {([
                                        { value: 'appdata', label: 'AppData（デフォルト）', desc: '%APPDATA%\\media-archiver-v2\\' },
                                        { value: 'install', label: 'インストールフォルダ', desc: 'exe と同じフォルダ内の data\\（ポータブル運用）' },
                                        { value: 'custom', label: '任意の場所', desc: 'フォルダを選択して指定' },
                                    ] as { value: StorageMode; label: string; desc: string }[]).map(opt => (
                                        <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-surface-800">
                                            <input
                                                type="radio"
                                                name="storageMode"
                                                value={opt.value}
                                                checked={selectedMode === opt.value}
                                                onChange={() => setSelectedMode(opt.value)}
                                                className="mt-0.5 w-4 h-4 accent-primary-500"
                                            />
                                            <div>
                                                <span className="text-sm text-surface-200">{opt.label}</span>
                                                <span className="block text-xs text-surface-500">{opt.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {selectedMode === 'custom' && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customPath}
                                            onChange={(e) => setCustomPath(e.target.value)}
                                            placeholder="フォルダパスを入力"
                                            className="flex-1 px-3 py-1.5 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                        />
                                        <button
                                            onClick={async () => {
                                                const p = await window.electronAPI.browseStorageFolder();
                                                if (p) setCustomPath(p);
                                            }}
                                            className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors flex items-center gap-1"
                                        >
                                            <FolderOpen size={14} />
                                            参照
                                        </button>
                                    </div>
                                )}

                                {migrationMsg && (
                                    <div className={`p-3 rounded text-sm ${migrationMsg.type === 'success' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                                        <p>{migrationMsg.text}</p>
                                        {migrationMsg.type === 'success' && migrationMsg.oldBase && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-surface-400">再起動後に有効になります。旧データ:</span>
                                                <button
                                                    onClick={handleDeleteOldData}
                                                    className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors"
                                                >
                                                    旧データを削除
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleMigrate}
                                    disabled={isMigrating || (selectedMode === 'custom' && !customPath)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                                >
                                    {isMigrating ? <RefreshCw size={14} className="animate-spin" /> : <HardDrive size={14} />}
                                    {isMigrating ? '移行中...' : '変更して移行'}
                                </button>
                                <p className="text-xs text-surface-500">
                                    移行後はアプリの再起動が必要です。旧データは自動削除されません。
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                                    サムネイル管理
                                </h3>
                                <StorageCleanupSection />
                            </div>
                        </div>
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
                            onExport={(format) => { void handleExportFromSettings(format); }}
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
