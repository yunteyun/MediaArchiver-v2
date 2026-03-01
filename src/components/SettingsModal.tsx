/**
 * SettingsModal - アプリケーション設定モーダル（タブ式）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, FileText, RefreshCw, FolderOpen, Copy, AlertCircle, AlertTriangle, Info, Database, AppWindow, Image, HardDrive, Star, FileSpreadsheet, FileCode2 } from 'lucide-react';
import { useUIStore, type SettingsModalTab } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFileStore } from '../stores/useFileStore';
import { useTagStore } from '../stores/useTagStore';
import { useRatingStore } from '../stores/useRatingStore';
import { useProfileStore } from '../stores/useProfileStore';
import { ExternalAppsTab } from './ExternalAppsTab';
import { StorageCleanupSection } from './settings/StorageCleanupSection';
import { RatingAxesManager } from './settings/RatingAxesManager';
import { FolderScanSettingsManagerDialog } from './FolderScanSettingsManagerDialog';
import { buildCsvContent, buildFileExportRows, buildHtmlContent } from '../utils/fileExport';
import {
    parseLegacyAppCsvFromBytes,
    parseMediaArchiverExportCsvFromBytes,
    type CsvImportDryRunSummary,
    type MediaArchiverCsvImportRow
} from '../utils/fileImport';
import {
    LIGHTBOX_OVERLAY_OPACITY_MAX,
    LIGHTBOX_OVERLAY_OPACITY_MIN,
    LIGHTBOX_OVERLAY_OPACITY_STEP,
} from '../features/lightbox-clean/constants';

// Phase 25: ローカル型定義
type StorageMode = 'appdata' | 'install' | 'custom';
interface StorageConfig { mode: StorageMode; customPath?: string; resolvedPath: string; }

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
        } catch (e: any) {
            setMigrationMsg({ type: 'error', text: e.message });
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

    const getLogLevelIcon = (line: string) => {
        if (line.includes('[error]')) return <AlertCircle size={14} className="text-red-400 flex-shrink-0" />;
        if (line.includes('[warn]')) return <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />;
        if (line.includes('[info]')) return <Info size={14} className="text-blue-400 flex-shrink-0" />;
        return <Info size={14} className="text-surface-500 flex-shrink-0" />;
    };

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

                {/* Tabs */}
                <div className="flex flex-nowrap overflow-x-auto border-b border-surface-700">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'general'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Settings size={16} />
                            一般
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('thumbnails')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'thumbnails'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Image size={16} />
                            サムネイル
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'scan'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <RefreshCw size={16} />
                            スキャン
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'storage'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <HardDrive size={16} />
                            ストレージ
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('apps')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'apps'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <AppWindow size={16} />
                            外部アプリ
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'logs'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <FileText size={16} />
                            ログ
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'backup'
                            ? 'text-primary-400 border-b-2 border-primary-400'
                            : 'text-surface-400 hover:text-surface-200'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Database size={16} />
                            バックアップ
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'general' && (
                        <div className="px-4 py-4 space-y-6">

                            {/* Video Volume */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    動画再生時の音量: {Math.round(videoVolume * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(videoVolume * 100)}
                                    onChange={(e) => setVideoVolume(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-surface-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* Audio Volume */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    音声ファイル再生時の音量: {Math.round(audioVolume * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(audioVolume * 100)}
                                    onChange={(e) => setAudioVolume(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-surface-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            {/* Lightbox Overlay Opacity */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    ライトボックス背景濃度: {lightboxOverlayOpacity}%
                                </label>
                                <input
                                    type="range"
                                    min={LIGHTBOX_OVERLAY_OPACITY_MIN}
                                    max={LIGHTBOX_OVERLAY_OPACITY_MAX}
                                    step={LIGHTBOX_OVERLAY_OPACITY_STEP}
                                    value={lightboxOverlayOpacity}
                                    onChange={(e) => setLightboxOverlayOpacity(Number(e.target.value))}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-surface-500 mt-1">
                                    <span>{LIGHTBOX_OVERLAY_OPACITY_MIN}%</span>
                                    <span>{LIGHTBOX_OVERLAY_OPACITY_MAX}%</span>
                                </div>
                                <p className="mt-1 text-xs text-surface-500">
                                    画像ライトボックスの背景オーバーレイ濃度を調整します。
                                </p>
                            </div>


                            {/* Performance Mode */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="block text-sm font-medium text-surface-300">
                                            パフォーマンスモード
                                        </span>
                                        <span className="block text-xs text-surface-500 mt-0.5">
                                            ホバーアニメーションを無効化して軽くする
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={performanceMode}
                                        onChange={(e) => setPerformanceMode(e.target.checked)}
                                        className="w-5 h-5 accent-primary-500 rounded"
                                    />
                                </label>
                            </div>



                            {/* Display Options */}
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">
                                    表示項目
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showFileName}
                                            onChange={(e) => setShowFileName(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">ファイル名</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showDuration}
                                            onChange={(e) => setShowDuration(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">再生時間</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showTags}
                                            onChange={(e) => setShowTags(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">タグ</span>
                                    </label>
                                    {/* Phase 14-8: タグポップオーバートリガー設定 */}
                                    {showTags && (
                                        <div className="ml-6 mt-1">
                                            <label className="block text-xs text-surface-400 mb-1">タグポップオーバー表示</label>
                                            <select
                                                value={tagPopoverTrigger}
                                                onChange={(e) => setTagPopoverTrigger(e.target.value as 'click' | 'hover')}
                                                className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="click">クリック</option>
                                                <option value="hover">ホバー</option>
                                            </select>
                                        </div>
                                    )}
                                    {/* タグ表示スタイル設定 */}
                                    {showTags && (
                                        <div className="ml-6 mt-1">
                                            <label className="block text-xs text-surface-400 mb-1">タグ表示スタイル</label>
                                            <select
                                                value={tagDisplayStyle}
                                                onChange={(e) => setTagDisplayStyle(e.target.value as 'filled' | 'border')}
                                                className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="filled">塗りつぶし（フル背景色）</option>
                                                <option value="border">左端ライン（ダーク背景）</option>
                                            </select>
                                        </div>
                                    )}
                                    {showTags && (
                                        <div className="ml-6 mt-1">
                                            <label className="block text-xs text-surface-400 mb-1">ファイルカード要約タグの並び</label>
                                            <select
                                                value={fileCardTagOrderMode}
                                                onChange={(e) => setFileCardTagOrderMode(e.target.value as 'balanced' | 'strict')}
                                                className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="balanced">カテゴリ分散（カテゴリ偏りを抑える）</option>
                                                <option value="strict">厳密順（カテゴリ順→タグ順）</option>
                                            </select>
                                            <p className="mt-1 text-[11px] text-surface-500">
                                                ファイルカードの省略タグ表示（3件表示など）にのみ適用されます。
                                            </p>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showFileSize}
                                            onChange={(e) => setShowFileSize(e.target.checked)}
                                            className="w-4 h-4 accent-primary-500 rounded"
                                        />
                                        <span className="text-surface-200 text-sm">ファイルサイズ</span>
                                    </label>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'scan' && (
                        <div className="px-4 py-4 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                                    スキャン設定
                                </h3>

                                <div className="space-y-4 rounded-lg border border-primary-900/40 bg-primary-950/10 p-3">
                                    <div>
                                        <h4 className="text-sm font-medium text-primary-200">
                                            プロファイル別スキャン設定
                                        </h4>
                                        <p className="text-xs text-surface-400 mt-1">
                                            この設定は現在のプロファイルにのみ適用されます。
                                        </p>
                                        <p className="text-xs text-surface-500 mt-1">
                                            対象: <span className="text-surface-300">{activeProfileLabel}</span>
                                        </p>
                                    </div>

                                    <div className="rounded border border-surface-700 bg-surface-900/40 p-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-surface-200">フォルダ別スキャン設定（一覧管理）</div>
                                                <div className="text-xs text-surface-500 mt-0.5">
                                                    起動時スキャン / 起動中新規ファイルスキャン / 対象カテゴリを登録フォルダ一覧で確認・編集します。
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFolderScanSettingsManagerOpen(true)}
                                                className="inline-flex items-center justify-center gap-1.5 rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-200 transition-colors hover:bg-surface-700"
                                            >
                                                <Settings size={15} />
                                                一覧を開く
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-300 mb-2">
                                            対応形式（カテゴリON/OFF）
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {([
                                                { key: 'video', label: '動画', hint: '.mp4 / .mkv / .webm' },
                                                { key: 'image', label: '画像', hint: '.jpg / .png / .webp' },
                                                { key: 'archive', label: '書庫', hint: '.zip / .cbz / .7z' },
                                                { key: 'audio', label: '音声', hint: '.mp3 / .flac / .m4a' },
                                            ] as const).map((item) => (
                                                <label
                                                    key={item.key}
                                                    className="flex items-center justify-between gap-3 rounded border border-surface-700 bg-surface-900/60 px-3 py-2 cursor-pointer hover:border-surface-600"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="text-sm text-surface-200">{item.label}</div>
                                                        <div className="text-[11px] text-surface-500 truncate">{item.hint}</div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={profileFileTypeFilters[item.key]}
                                                        onChange={(e) => { void handleProfileFileTypeToggle(item.key, e.target.checked); }}
                                                        className="w-4 h-4 accent-primary-500 rounded shrink-0"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-surface-500 mt-2">
                                            OFFにしたカテゴリは新規スキャン対象外になります。既に登録済みの対象は再スキャン時に一覧/DBから整理されます（元ファイルは削除しません）。
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-300 mb-2">
                                            スキャン速度調整（プロファイル別 / コイル鳴き対策）
                                        </label>
                                        <select
                                            value={scanThrottleMs}
                                            onChange={(e) => {
                                                const ms = Number(e.target.value);
                                                void handleProfileScanThrottleMsChange(ms);
                                            }}
                                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-surface-200 focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="0">通常速度（推奨）</option>
                                            <option value="50">少し遅く（軽度の対策）</option>
                                            <option value="100">遅く（中程度の対策）</option>
                                            <option value="200">かなり遅く（重度の対策）</option>
                                        </select>
                                        <p className="text-xs text-surface-500 mt-1">
                                            プレビュー生成時のファイル間待機時間を調整します。PCから異音がする場合に設定してください。
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded border border-surface-800 bg-surface-900/50 p-3">
                                    <p className="text-xs text-surface-400">
                                        `プレビューフレーム数` はサムネイルタブにあります（プロファイル別設定）。
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'thumbnails' && (
                        <div className="px-4 py-4 space-y-6">
                            {/* サムネイル設定セクション */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">
                                    サムネイル設定
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">
                                        プレビューフレーム数（プロファイル別）: {previewFrameCount === 0 ? 'オフ' : `${previewFrameCount}枚`}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        step="5"
                                        value={previewFrameCount}
                                        onChange={(e) => {
                                            const count = Number(e.target.value);
                                            void handleProfilePreviewFrameCountChange(count);
                                        }}
                                        className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                    <div className="flex justify-between text-xs text-surface-500 mt-1">
                                        <span>オフ</span>
                                        <span>30枚</span>
                                    </div>
                                    <p className="text-xs text-surface-500 mt-1">
                                        現在のプロファイルに保存されます。スキャン速度に影響します。0でプレビューフレーム生成をスキップ。
                                    </p>
                                </div>

                                {/* Thumbnail Resolution */}
                                <div>
                                    <label className="block text-sm font-medium text-surface-300 mb-2">
                                        サムネイル解像度（プロファイル別）: {thumbnailResolution}px
                                    </label>
                                    <input
                                        type="range"
                                        min="160"
                                        max="480"
                                        step="40"
                                        value={thumbnailResolution}
                                        onChange={(e) => {
                                            const resolution = Number(e.target.value);
                                            void handleProfileThumbnailResolutionChange(resolution);
                                        }}
                                        className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                    <div className="flex justify-between text-xs text-surface-500 mt-1">
                                        <span>160px</span>
                                        <span>480px</span>
                                    </div>
                                    <p className="text-xs text-surface-500 mt-1">
                                        現在のプロファイルに保存されます。次回スキャンから反映。拡大表示時や高DPI環境で効果が出ます。
                                    </p>
                                </div>

                                <div className="pt-1">
                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                                        全体設定
                                    </h4>
                                </div>

                                <div className="space-y-4 rounded-lg border border-surface-700 bg-surface-900/40 p-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-surface-200">
                                            サムネイルホバー設定
                                        </h4>
                                        <p className="mt-1 text-xs text-surface-500">
                                            一覧カード上にマウスを乗せた時のプレビュー動作を設定します。
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-300 mb-2">
                                            サムネイルホバー時の動作
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="thumbnailAction"
                                                    value="scrub"
                                                    checked={thumbnailAction === 'scrub'}
                                                    onChange={() => setThumbnailAction('scrub')}
                                                    className="w-4 h-4 accent-primary-500"
                                                />
                                                <span className="text-surface-200">スクラブ</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="thumbnailAction"
                                                    value="flipbook"
                                                    checked={thumbnailAction === 'flipbook'}
                                                    onChange={() => setThumbnailAction('flipbook')}
                                                    className="w-4 h-4 accent-primary-500"
                                                />
                                                <span className="text-surface-200">自動パラパラ</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="thumbnailAction"
                                                    value="play"
                                                    checked={thumbnailAction === 'play'}
                                                    onChange={() => setThumbnailAction('play')}
                                                    className="w-4 h-4 accent-primary-500"
                                                />
                                                <span className="text-surface-200">再生</span>
                                            </label>
                                        </div>
                                    </div>

                                    {thumbnailAction === 'flipbook' && (
                                        <div className="ml-6 mt-2">
                                            <label className="block text-sm font-medium text-surface-300 mb-1">
                                                自動パラパラ速度
                                            </label>
                                            <select
                                                value={flipbookSpeed}
                                                onChange={(e) => setFlipbookSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                                                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="slow">遅い</option>
                                                <option value="normal">標準</option>
                                                <option value="fast">速い</option>
                                            </select>
                                            <p className="text-xs text-surface-500 mt-1">
                                                プレビューフレーム枚数が少ないほど速く見えやすいです。
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-surface-300 mb-1">
                                            アニメ画像プレビュー
                                        </label>
                                        <select
                                            value={animatedImagePreviewMode}
                                            onChange={(e) => setAnimatedImagePreviewMode(e.target.value as 'off' | 'hover' | 'visible')}
                                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="off">オフ</option>
                                            <option value="hover">ホバーで再生</option>
                                            <option value="visible">表示中に自動再生</option>
                                        </select>
                                        <p className="text-xs text-surface-500 mt-1">
                                            GIF / アニメーションWebP が対象。表示中自動再生は同時2件まで。パフォーマンスモード時は無効になります。
                                        </p>
                                    </div>

                                    {/* Phase 17-3: Playモード詳細設定 */}
                                    {thumbnailAction === 'play' && (
                                        <div className="space-y-3 rounded-md border border-surface-700/80 bg-surface-950/40 p-3">
                                            <div>
                                                <label className="block text-sm font-medium text-surface-300 mb-1">
                                                    プレビュー動作
                                                </label>
                                                <select
                                                    value={playMode.jumpType}
                                                    onChange={(e) => setPlayModeJumpType(e.target.value as any)}
                                                    className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                                >
                                                    <option value="light">軽量（ジャンプなし）</option>
                                                    <option value="random">ランダムジャンプ</option>
                                                    <option value="sequential">固定間隔ジャンプ</option>
                                                </select>
                                                <div className="text-xs text-surface-400 mt-1.5 space-y-0.5">
                                                    <div><strong>軽量:</strong> 先頭から再生のみ（低負荷）</div>
                                                    <div><strong>ランダム:</strong> 毎回ランダムな位置にジャンプ</div>
                                                    <div><strong>固定間隔:</strong> 動画を分割して順番にプレビュー</div>
                                                </div>
                                            </div>

                                            {playMode.jumpType !== 'light' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-surface-300 mb-1">
                                                        ジャンプ間隔
                                                    </label>
                                                    <select
                                                        value={playMode.jumpInterval}
                                                        onChange={(e) => setPlayModeJumpInterval(Number(e.target.value) as any)}
                                                        className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                                    >
                                                        <option value={1000}>1秒（高速プレビュー）</option>
                                                        <option value={2000}>2秒（推奨）</option>
                                                        <option value={3000}>3秒</option>
                                                        <option value={5000}>5秒（じっくり確認）</option>
                                                    </select>
                                                    <p className="text-xs text-surface-400 mt-1.5">
                                                        短いほど多くのシーンを確認できますが、負荷が高くなります
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 rounded-lg border border-surface-700 bg-surface-900/40 p-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-surface-200">
                                            右サイドバー動画プレビュー
                                        </h4>
                                        <p className="mt-1 text-xs text-surface-500">
                                            右パネル上部に表示される動画プレビューの既定動作を設定します。
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-surface-300 mb-1">
                                            プレビュー方式
                                        </label>
                                        <select
                                            value={rightPanelVideoPreviewMode}
                                            onChange={(e) => setRightPanelVideoPreviewMode(e.target.value as 'loop' | 'long')}
                                            className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="loop">ループ再生</option>
                                            <option value="long">固定間隔プレビュー</option>
                                        </select>
                                        <p className="text-xs text-surface-500 mt-1">
                                            固定間隔は内容を順送りで確認します。
                                        </p>
                                    </div>

                                    {rightPanelVideoPreviewMode === 'long' && (
                                        <div>
                                            <label className="block text-sm font-medium text-surface-300 mb-1">
                                                ジャンプ間隔
                                            </label>
                                            <select
                                                value={rightPanelVideoJumpInterval}
                                                onChange={(e) => setRightPanelVideoJumpInterval(Number(e.target.value) as 1000 | 2000 | 3000 | 5000)}
                                                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                                            >
                                                <option value={1000}>1秒（高速プレビュー）</option>
                                                <option value={2000}>2秒（推奨）</option>
                                                <option value={3000}>3秒</option>
                                                <option value={5000}>5秒（じっくり確認）</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                            </div>

                        </div>
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
                        <div className="p-4 space-y-4">
                            {/* Log Controls */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-surface-400">フィルター:</label>
                                    <select
                                        value={logFilter}
                                        onChange={(e) => setLogFilter(e.target.value as any)}
                                        className="bg-surface-800 text-surface-200 text-sm px-2 py-1 rounded border border-surface-600 focus:outline-none focus:border-primary-500"
                                    >
                                        <option value="all">すべて</option>
                                        <option value="error">エラーのみ</option>
                                        <option value="warn">警告のみ</option>
                                        <option value="info">情報のみ</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={loadLogs}
                                        disabled={isLoadingLogs}
                                        className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                                        更新
                                    </button>
                                    <button
                                        onClick={handleCopyVisibleLogs}
                                        className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors"
                                    >
                                        <Copy size={14} />
                                        表示中をコピー
                                    </button>
                                    <button
                                        onClick={handleOpenLogFolder}
                                        className="flex items-center gap-1 px-3 py-1 bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm rounded transition-colors"
                                    >
                                        <FolderOpen size={14} />
                                        フォルダを開く
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs text-surface-400">
                                    問題報告時は「表示中をコピー」または「フォルダを開く」からログを共有してください。表示件数: {filteredLogs.length}件（取得済み {logs.length}件）
                                </p>
                                {logLoadError && (
                                    <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                                        {logLoadError}
                                    </div>
                                )}
                                {logActionMessage && (
                                    <div className={`text-xs rounded px-3 py-2 border ${logActionMessage.type === 'error'
                                        ? 'text-red-300 bg-red-500/10 border-red-500/30'
                                        : logActionMessage.type === 'success'
                                            ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                                            : 'text-surface-300 bg-surface-800 border-surface-700'
                                        }`}>
                                        {logActionMessage.text}
                                    </div>
                                )}
                            </div>

                            {/* Log Display */}
                            <div className="bg-surface-950 rounded border border-surface-700 h-80 overflow-y-auto font-mono text-xs">
                                {filteredLogs.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-surface-500">
                                        {isLoadingLogs ? '読み込み中...' : logs.length > 0 ? 'このフィルターに該当するログはありません' : 'ログがありません'}
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-0.5">
                                        {filteredLogs.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-surface-800 ${line.includes('[error]') ? 'text-red-300' :
                                                    line.includes('[warn]') ? 'text-yellow-300' :
                                                        'text-surface-300'
                                                    }`}
                                            >
                                                {getLogLevelIcon(line)}
                                                <span className="break-all">{line}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-surface-500">
                                最新300行を表示。ログファイルは日付ごとに自動ローテーションされます。共有時は個人情報やパス情報が含まれていないか確認してください。
                            </p>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="px-4 py-4 space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-3">データベースバックアップ</h3>

                                {/* 手動バックアップボタン */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const profileId = await window.electronAPI.getActiveProfileId();
                                            const result = await window.electronAPI.createBackup(profileId);
                                            if (result.success) {
                                                alert('バックアップが作成されました');
                                                // 履歴を再読み込み（簡易実装）
                                            } else {
                                                alert(`バックアップ失敗: ${result.error}`);
                                            }
                                        } catch (e: any) {
                                            alert(`エラー: ${e.message}`);
                                        }
                                    }}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                                >
                                    今すぐバックアップを作成
                                </button>

                                <p className="text-xs text-surface-500 mt-2">
                                    現在のデータベースを安全にバックアップします（VACUUM INTO使用）
                                </p>
                            </div>

                            <div className="text-xs text-surface-400 bg-surface-800 p-3 rounded">
                                <p className="font-semibold mb-1">⚠️ 注意事項</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>バックアップにはDBサイズの1.5倍のディスク容量が必要です</li>
                                    <li>リストアを実行するとアプリが再起動されます</li>
                                    <li>バックアップファイルは自動的に世代管理されます（最大5世代）</li>
                                </ul>
                            </div>

                            <div className="border border-surface-700 rounded-lg p-3 bg-surface-900/40">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div>
                                        <h3 className="text-sm font-medium text-surface-200">一覧エクスポート（CSV / HTML）</h3>
                                        <p className="text-xs text-surface-500 mt-0.5">
                                            利用頻度が低い操作のためバックアップ系タブに集約。タグ色も出力に含めます。
                                        </p>
                                        <p className="text-xs text-surface-500">
                                            ※ インポート対応は現在 `CSV` のみです（`HTML` は閲覧用）。
                                        </p>
                                    </div>
                                    <span className="text-xs text-surface-400 whitespace-nowrap">現在読込 {currentLoadedExportRows.length} 件</span>
                                </div>

                                <div className="space-y-2 text-xs mb-3">
                                    <div className="text-surface-400">
                                        プロファイル: <span className="text-surface-300">{activeProfileLabel}</span>
                                    </div>
                                    <div className="text-surface-400">
                                        現在選択: <span className="text-surface-300">{exportScopeLabel}</span>
                                    </div>
                                    <div className="text-surface-400">
                                        タグ色: <span className="text-surface-300">含める（CSV列 / HTMLタグチップ）</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-3">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="exportScope"
                                            value="profile"
                                            checked={exportScope === 'profile'}
                                            onChange={() => setExportScope('profile')}
                                            className="mt-0.5 w-4 h-4 accent-primary-500"
                                        />
                                        <div>
                                            <span className="text-sm text-surface-200">プロファイル全体</span>
                                            <span className="block text-xs text-surface-500">現在のアクティブプロファイルに登録されている全ファイルを出力</span>
                                        </div>
                                    </label>
                                    <label className={`flex items-start gap-2 ${canExportCurrentFolderScope ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                        <input
                                            type="radio"
                                            name="exportScope"
                                            value="folder"
                                            checked={exportScope === 'folder'}
                                            onChange={() => canExportCurrentFolderScope && setExportScope('folder')}
                                            disabled={!canExportCurrentFolderScope}
                                            className="mt-0.5 w-4 h-4 accent-primary-500"
                                        />
                                        <div>
                                            <span className="text-sm text-surface-200">現在選択フォルダ全体</span>
                                            <span className="block text-xs text-surface-500">
                                                {canExportCurrentFolderScope
                                                    ? '現在選択しているフォルダ配下を再帰的に出力'
                                                    : 'フォルダを選択している時のみ使用できます（全ファイル/ドライブ選択中は不可）'}
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => { void handleExportFromSettings('csv'); }}
                                        disabled={isExporting !== null || (exportScope === 'folder' && !canExportCurrentFolderScope)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                                    >
                                        <FileSpreadsheet size={15} />
                                        {isExporting === 'csv' ? 'CSV出力中...' : 'CSV出力'}
                                    </button>
                                    <button
                                        onClick={() => { void handleExportFromSettings('html'); }}
                                        disabled={isExporting !== null || (exportScope === 'folder' && !canExportCurrentFolderScope)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                                    >
                                        <FileCode2 size={15} />
                                        {isExporting === 'html' ? 'HTML出力中...' : 'HTML出力'}
                                    </button>
                                </div>
                            </div>

                            <div className="border border-surface-700 rounded-lg p-3 bg-surface-900/40">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div>
                                        <h3 className="text-sm font-medium text-surface-200">CSVインポート（このアプリ形式 / 旧アプリ互換）</h3>
                                        <p className="text-xs text-surface-500 mt-0.5">
                                            `path` をキーにタグを復元します（追記型）。旧アプリCSV（Shift_JIS / 可変列）は互換モードで解析します。
                                        </p>
                                        <p className="text-xs text-surface-500">
                                            旧アプリCSVは `コメント１` をメモへ追記し、末尾の追加列をタグ/星評価として解釈します。
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <button
                                        onClick={() => { void handleSelectImportCsv(); }}
                                        disabled={isImportingCsv}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                                    >
                                        <FolderOpen size={15} />
                                        このアプリCSVを解析
                                    </button>
                                    <button
                                        onClick={() => { void handleSelectLegacyImportCsv(); }}
                                        disabled={isImportingCsv}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 disabled:bg-surface-800/60 disabled:text-surface-600 text-surface-200 border border-surface-700 text-sm transition-colors"
                                    >
                                        <FolderOpen size={15} />
                                        旧アプリCSVを解析（互換）
                                    </button>
                                    <button
                                        onClick={() => { void handleApplyCsvImport(); }}
                                        disabled={isImportingCsv || !parsedImportRows || parsedImportRows.length === 0}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-700 hover:bg-primary-600 disabled:bg-surface-800/60 disabled:text-surface-600 text-white border border-primary-700 text-sm transition-colors"
                                    >
                                        <FileSpreadsheet size={15} />
                                        {isImportingCsv ? 'インポート中...' : 'インポート実行（タグ）'}
                                    </button>
                                </div>

                                {selectedImportCsvPath && (
                                    <div className="mb-3 text-xs text-surface-400">
                                        {importSourceLabel && <div>形式: <span className="text-surface-300">{importSourceLabel}</span></div>}
                                        CSV: <span className="text-surface-300 break-all">{selectedImportCsvPath}</span>
                                    </div>
                                )}

                                {importDryRun && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3">
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">行数: {importDryRun.totalRows}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">一致: {importDryRun.matchedRows}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">未一致: {importDryRun.unmatchedRows}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">タグ行: {importDryRun.rowsWithTags}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">追加予定タグ付与: {importDryRun.tagLinksToAdd}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">新規タグ作成予定: {importDryRun.newTagsToCreate}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">評価行: {importDryRun.rowsWithRating}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">評価更新予定: {importDryRun.ratingUpdates}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">メモ行: {importDryRun.rowsWithMemo}</div>
                                        <div className="bg-surface-800 rounded px-2 py-1 text-surface-300">メモ追記予定: {importDryRun.memoUpdates}</div>
                                    </div>
                                )}

                                {(importWarnings.length > 0 || (importDryRun?.unmatchedPaths.length ?? 0) > 0 || (importDryRun?.missingTagNames.length ?? 0) > 0) && (
                                    <div className="space-y-2">
                                        {importWarnings.length > 0 && (
                                            <div className="text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-800/40 rounded p-2">
                                                <div className="font-semibold mb-1">解析警告（先頭{Math.min(importWarnings.length, 5)}件）</div>
                                                {importWarnings.slice(0, 5).map((w, i) => (
                                                    <div key={`${w}-${i}`}>{w}</div>
                                                ))}
                                            </div>
                                        )}
                                        {(importDryRun?.unmatchedPaths.length ?? 0) > 0 && (
                                            <div className="text-xs text-surface-300 bg-surface-800 border border-surface-700 rounded p-2">
                                                <div className="font-semibold mb-1">未一致パス（先頭{importDryRun!.unmatchedPaths.length}件）</div>
                                                {importDryRun!.unmatchedPaths.map((p) => (
                                                    <div key={p} className="break-all text-surface-400">{p}</div>
                                                ))}
                                            </div>
                                        )}
                                        {(importDryRun?.missingTagNames.length ?? 0) > 0 && (
                                            <div className="text-xs text-surface-300 bg-surface-800 border border-surface-700 rounded p-2">
                                                <div className="font-semibold mb-1">新規作成されるタグ（先頭{importDryRun!.missingTagNames.length}件）</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {importDryRun!.missingTagNames.map((name) => (
                                                        <span key={name} className="px-2 py-0.5 rounded bg-surface-700 text-surface-200">#{name}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
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
