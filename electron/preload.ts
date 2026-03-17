import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { MediaFile, PlaybackBookmark } from '../src/types/file';
import type { ExternalApp, ScanExclusionRules } from '../src/stores/useSettingsStore';
import type { ScanProgress } from '../src/stores/useUIStore';
import type { SmartFolderConditionV1 } from '../src/stores/useSmartFolderStore';
import type {
    AutoOrganizeActionV1,
    AutoOrganizeApplyResult,
    AutoOrganizeConditionV1,
    AutoOrganizeDryRunResult,
    AutoOrganizeRollbackApplyResult,
    AutoOrganizeRollbackPreviewResult,
    AutoOrganizeRuleV1,
    AutoOrganizeRunSummary,
    AutoOrganizeSettingsV1,
} from '../src/types/autoOrganize';
import type {
    AutoTagRule,
    MatchTarget,
    MatchMode,
} from '../src/stores/useTagStore';
import type { SearchCondition } from './services/searchService';
import type { DuplicateProgress } from './services/duplicateService';
import type { BackupSettings } from './services/backupService';
import type { ActivityAction } from './services/activityLogService';
import type { StorageMode } from './services/storageConfig';
import type { ExternalDisplayPresetListResult } from '../src/components/fileCard/displayModes';
import type { DuplicateSearchMode } from '../src/shared/duplicateNameCandidates';

type ScanBatchCommittedPayload = {
    rootFolderId: string;
    scanPath: string;
    committedCount: number;
    totalCommitted: number;
    removedCount: number;
    stage: 'batch' | 'complete' | 'cancelled';
};

type ContextMenuSearchDestination = {
    id: string;
    name: string;
    type: 'filename' | 'image';
    url: string;
    icon?: 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';
    enabled: boolean;
};

type RequestRenamePayload = {
    fileId: string;
    currentName: string;
    currentPath?: string;
    suggestedName?: string;
};

type ToastPayload = {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
};

type OpenFileAsModePayload = {
    fileId: string;
    mode: 'archive-audio' | 'archive-image';
};

type MoveDialogPayload = {
    fileIds: string[];
    currentFolderId: string | null;
};

type MoveRequestPayload = {
    fileId: string;
    targetFolderId: string;
};

type FileMovedPayload = {
    fileId: string;
    newPath: string;
    targetFolderId: string;
};

type ExternalOpenCountUpdatedPayload = {
    fileId: string;
    externalOpenCount: number;
    lastExternalOpenedAt: number;
};

type ThumbnailRegenerateProgress = {
    current: number;
    total: number;
};

type PreviewMatch = {
    fileId: string;
    fileName: string;
    matchedKeywords: string[];
};

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: T) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
}

/**
 * Preload script - Renderer と Main プロセス間の安全なブリッジ
 * 
 * contextBridge を使用して、Renderer プロセスから Main プロセスの
 * 機能に安全にアクセスできるAPIを公開します。
 */

contextBridge.exposeInMainWorld('electronAPI', {
    // === Database ===
    getFiles: (folderId?: string) => ipcRenderer.invoke('db:getFiles', folderId),
    getFilesByFolderPathDirect: (folderPath: string) => ipcRenderer.invoke('db:getFilesByFolderPathDirect', folderPath),
    getFilesByFolderPathRecursive: (folderPath: string) => ipcRenderer.invoke('db:getFilesByFolderPathRecursive', folderPath),
    getFileById: (fileId: string) => ipcRenderer.invoke('db:getFileById', fileId),

    // === Folder ===
    addFolder: (folderPath: string) => ipcRenderer.invoke('folder:add', folderPath),
    getFolders: () => ipcRenderer.invoke('folder:list'),
    deleteFolder: (folderId: string) => ipcRenderer.invoke('folder:delete', folderId),
    getFolderMetadata: () => ipcRenderer.invoke('folder:getMetadata'),
    getFolderTreePaths: () => ipcRenderer.invoke('folder:getTreePaths'),
    getFolderTreeStats: () => ipcRenderer.invoke('folder:getTreeStats'),
    setFolderAutoScan: (folderId: string, enabled: boolean) =>
        ipcRenderer.invoke('folder:setAutoScan', { folderId, enabled }),
    setFolderWatchNewFiles: (folderId: string, enabled: boolean) =>
        ipcRenderer.invoke('folder:setWatchNewFiles', { folderId, enabled }),
    setFolderBadgeColor: (folderId: string, color: string | null) =>
        ipcRenderer.invoke('folder:setBadgeColor', { folderId, color }),
    setFolderScanFileTypeOverrides: (
        folderId: string,
        overrides: Partial<{ video: boolean | null; image: boolean | null; archive: boolean | null; audio: boolean | null; }>
    ) => ipcRenderer.invoke('folder:setScanFileTypeOverrides', { folderId, overrides }),
    setFolderExcludedSubdirectories: (folderId: string, excludedSubdirectories: string[]) =>
        ipcRenderer.invoke('folder:setExcludedSubdirectories', { folderId, excludedSubdirectories }),
    clearFolderScanFileTypeOverrides: (folderId: string) =>
        ipcRenderer.invoke('folder:clearScanFileTypeOverrides', { folderId }),

    // Phase 22-C: ドライブ/フォルダ配下の全ファイル取得
    getFilesByDrive: (drive: string) => ipcRenderer.invoke('getFilesByDrive', drive),
    getFilesByFolderRecursive: (folderId: string) => ipcRenderer.invoke('getFilesByFolderRecursive', folderId),

    // === Scanner ===
    scanFolder: (folderPath: string) => ipcRenderer.invoke('scanner:start', folderPath),

    // === App ===
    openExternal: (path: string) => ipcRenderer.invoke('app:openExternal', path),
    openUrl: (url: string) => ipcRenderer.invoke('app:openUrl', url),
    showInExplorer: (path: string) => ipcRenderer.invoke('app:showInExplorer', path),
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    getBundledReleaseNotes: (version?: string) => ipcRenderer.invoke('app:getBundledReleaseNotes', version),
    checkForAppUpdate: (sourceUrl?: string) => ipcRenderer.invoke('app:checkForUpdates', sourceUrl),
    downloadLatestUpdateZip: (sourceUrl?: string) => ipcRenderer.invoke('app:downloadLatestUpdateZip', sourceUrl),
    applyUpdateFromZip: (zipPath?: string) => ipcRenderer.invoke('app:applyUpdateFromZip', zipPath),
    getLogs: (lines?: number) => ipcRenderer.invoke('app:getLogs', lines),
    openLogFolder: () => ipcRenderer.invoke('app:openLogFolder'),
    selectFile: () => ipcRenderer.invoke('app:selectFile'),
    validatePath: (appPath: string) => ipcRenderer.invoke('app:validatePath', appPath),
    setPerfDebugEnabled: (enabled: boolean) => ipcRenderer.invoke('app:setPerfDebugEnabled', enabled),
    setExternalApps: (apps: ExternalApp[]) => ipcRenderer.invoke('app:setExternalApps', apps),
    openWithApp: (filePath: string, appPath: string, fileId?: string) => ipcRenderer.invoke('app:openWithApp', filePath, appPath, fileId),
    getDisplayPresets: () => ipcRenderer.invoke('displayPreset:list') as Promise<ExternalDisplayPresetListResult>,
    openDisplayPresetFolder: () => ipcRenderer.invoke('displayPreset:openFolder') as Promise<{ success: boolean; directory: string; error?: string }>,

    // === File Operations ===
    updateFileNotes: (fileId: string, notes: string) =>
        ipcRenderer.invoke('file:updateNotes', { fileId, notes }),
    updateFilePlaybackPosition: (fileId: string, playbackPositionSeconds: number | null) =>
        ipcRenderer.invoke('file:updatePlaybackPosition', { fileId, playbackPositionSeconds }),
    getPlaybackBookmarks: (fileId: string) =>
        ipcRenderer.invoke('file:getPlaybackBookmarks', { fileId }) as Promise<PlaybackBookmark[]>,
    createPlaybackBookmark: (fileId: string, timeSeconds: number, note?: string | null) =>
        ipcRenderer.invoke('file:createPlaybackBookmark', { fileId, timeSeconds, note }) as Promise<{
            success: boolean;
            error?: string;
            bookmark: PlaybackBookmark | null;
        }>,
    deletePlaybackBookmark: (bookmarkId: string) =>
        ipcRenderer.invoke('file:deletePlaybackBookmark', { bookmarkId }) as Promise<{
            success: boolean;
            error?: string;
        }>,
    updatePlaybackBookmarkNote: (bookmarkId: string, note?: string | null) =>
        ipcRenderer.invoke('file:updatePlaybackBookmarkNote', { bookmarkId, note }) as Promise<{
            success: boolean;
            error?: string;
            bookmark: PlaybackBookmark | null;
        }>,
    setRepresentativeThumbnail: (fileId: string, timeSeconds: number) =>
        ipcRenderer.invoke('file:setRepresentativeThumbnail', { fileId, timeSeconds }) as Promise<{
            success: boolean;
            error?: string;
            thumbnailPath?: string;
            thumbnailLocked?: boolean;
        }>,
    setRepresentativeThumbnailFromSource: (fileId: string, sourcePath: string) =>
        ipcRenderer.invoke('file:setRepresentativeThumbnailFromSource', { fileId, sourcePath }) as Promise<{
            success: boolean;
            error?: string;
            thumbnailPath?: string;
            thumbnailLocked?: boolean;
        }>,
    restoreAutoThumbnail: (fileId: string) =>
        ipcRenderer.invoke('file:restoreAutoThumbnail', { fileId }) as Promise<{
            success: boolean;
            error?: string;
            thumbnailPath?: string;
            thumbnailLocked?: boolean;
        }>,
    renameFile: (fileId: string, newName: string) =>
        ipcRenderer.invoke('file:rename', { fileId, newName }),

    // Phase 17: Access Count
    incrementAccessCount: (fileId: string) =>
        ipcRenderer.invoke('file:incrementAccessCount', fileId),
    incrementExternalOpenCount: (fileId: string) =>
        ipcRenderer.invoke('file:incrementExternalOpenCount', fileId),

    // === Dialog ===
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    saveTextFile: (options: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }>; content: string }) =>
        ipcRenderer.invoke('dialog:saveTextFile', options),
    openTextFile: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
        ipcRenderer.invoke('dialog:openTextFile', options),
    openBinaryFile: (options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
        ipcRenderer.invoke('dialog:openBinaryFile', options),

    // === Events (Main -> Renderer) ===
    onScanProgress: (callback: (progress: ScanProgress) => void) =>
        subscribe('scanner:progress', callback),
    onScanBatchCommitted: (callback: (payload: ScanBatchCommittedPayload) => void) =>
        subscribe('scanner:batchCommitted', callback),
    cancelScan: () => ipcRenderer.invoke('scanner:cancel'),
    setPreviewFrameCount: (count: number) => ipcRenderer.invoke('scanner:setPreviewFrameCount', count),
    setScanThrottleMs: (ms: number) => ipcRenderer.invoke('scanner:setScanThrottleMs', ms),
    setThumbnailResolution: (resolution: number) => ipcRenderer.invoke('scanner:setThumbnailResolution', resolution),
    setScanFileTypeCategories: (filters: { video?: boolean; image?: boolean; archive?: boolean; audio?: boolean }) =>
        ipcRenderer.invoke('scanner:setFileTypeCategories', filters),
    setScanExclusionRules: (rules: ScanExclusionRules) =>
        ipcRenderer.invoke('scanner:setExclusionRules', rules),
    autoScan: () => ipcRenderer.invoke('scanner:autoScan'),

    // === Context Menu ===
    showFolderContextMenu: (folderId: string, path: string) =>
        ipcRenderer.invoke('folder:showContextMenu', { folderId, path }),

    onFolderDeleted: (callback: (folderId: string) => void) => subscribe('folder:deleted', callback),
    onFolderUpdated: (callback: (folderId: string) => void) => subscribe('folder:updated', callback),

    onFolderRescanComplete: (callback: (folderId: string) => void) => subscribe('folder:rescanComplete', callback),

    // === File Context Menu ===
    showFileContextMenu: (fileId: string, path: string, selectedFileIds?: string[], searchDestinations?: ContextMenuSearchDestination[]) =>
        ipcRenderer.invoke('file:showContextMenu', { fileId, filePath: path, selectedFileIds, searchDestinations }),

    onFileDeleted: (callback: (fileId: string) => void) => subscribe('file:deleted', callback),

    onThumbnailRegenerated: (callback: (fileId: string) => void) => subscribe('file:thumbnailRegenerated', callback),

    onExternalOpenCountUpdated: (callback: (data: ExternalOpenCountUpdatedPayload) => void) =>
        subscribe('file:externalOpenCountUpdated', callback),
    onOpenFileAsMode: (callback: (data: OpenFileAsModePayload) => void) =>
        subscribe('file:openAsMode', callback),

    // Phase 22-C-2: ファイル移動ダイアログ
    onOpenMoveDialog: (callback: (data: MoveDialogPayload) => void) =>
        subscribe('file:openMoveDialog', callback),
    onRequestRename: (callback: (data: RequestRenamePayload) => void) =>
        subscribe('file:requestRename', callback),
    onShowToast: (callback: (data: ToastPayload) => void) =>
        subscribe('ui:showToast', callback),

    // === File Delete Dialog (Phase 12-17B) ===
    confirmDelete: (fileId: string, filePath: string, permanentDelete: boolean) =>
        ipcRenderer.invoke('file:confirmDelete', { fileId, filePath, permanentDelete }),
    confirmDeleteBatch: (fileIds: string[], filePaths: string[], permanentDelete: boolean) =>
        ipcRenderer.invoke('file:confirmDeleteBatch', { fileIds, filePaths, permanentDelete }),
    onShowDeleteDialog: (callback: (data: { fileIds: string[]; filePaths: string[] }) => void) =>
        subscribe('file:showDeleteDialog', callback),

    // Phase 18-C: ファイル移動
    moveFileToFolder: (fileId: string, targetFolderId?: string, targetFolderPath?: string) =>
        ipcRenderer.invoke('file:moveToFolder', { fileId, targetFolderId, targetFolderPath }),
    onFileMoved: (callback: (data: FileMovedPayload) => void) => subscribe('file:moved', callback),
    onRequestMove: (callback: (data: MoveRequestPayload) => void) => subscribe('file:requestMove', callback),

    // === Archive ===
    getArchiveMetadata: (path: string) => ipcRenderer.invoke('archive:getMetadata', path),
    getArchivePreviewFrames: (path: string, limit?: number) =>
        ipcRenderer.invoke('archive:getPreviewFrames', { path, limit }),
    cleanArchiveTemp: () => ipcRenderer.invoke('archive:cleanTemp'),
    getArchiveAudioFiles: (archivePath: string) =>
        ipcRenderer.invoke('archive:getAudioFiles', archivePath),
    extractArchiveAudioFile: (archivePath: string, entryName: string) =>
        ipcRenderer.invoke('archive:extractAudioFile', { archivePath, entryName }),

    // === Tags ===
    // Categories
    getTagCategories: () => ipcRenderer.invoke('tag:getCategories'),
    createTagCategory: (name: string, color?: string) =>
        ipcRenderer.invoke('tag:createCategory', { name, color }),
    updateTagCategory: (id: string, updates: { name?: string; color?: string; sortOrder?: number }) =>
        ipcRenderer.invoke('tag:updateCategory', { id, ...updates }),
    deleteTagCategory: (id: string) => ipcRenderer.invoke('tag:deleteCategory', { id }),

    // Tag Definitions
    getAllTags: () => ipcRenderer.invoke('tag:getAll'),
    createTag: (name: string, color?: string, categoryId?: string, icon?: string, description?: string) =>
        ipcRenderer.invoke('tag:create', { name, color, categoryId, icon, description }),
    updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null; sortOrder?: number; icon?: string; description?: string }) =>
        ipcRenderer.invoke('tag:update', { id, ...updates }),
    deleteTag: (id: string) => ipcRenderer.invoke('tag:delete', { id }),

    // File-Tag Operations
    addTagToFile: (fileId: string, tagId: string) =>
        ipcRenderer.invoke('tag:addToFile', { fileId, tagId }),
    removeTagFromFile: (fileId: string, tagId: string) =>
        ipcRenderer.invoke('tag:removeFromFile', { fileId, tagId }),
    getFileTags: (fileId: string) => ipcRenderer.invoke('tag:getFileTags', { fileId }),
    getFileTagIds: (fileId: string) => ipcRenderer.invoke('tag:getFileTagIds', { fileId }),
    getFilesByTags: (tagIds: string[], mode?: 'AND' | 'OR') =>
        ipcRenderer.invoke('tag:getFilesByTags', { tagIds, mode }),
    getAllFileTagIds: () => ipcRenderer.invoke('tag:getAllFileTagIds') as Promise<Record<string, string[]>>,

    // === Profile ===
    getProfiles: () => ipcRenderer.invoke('profile:list'),
    getProfile: (id: string) => ipcRenderer.invoke('profile:get', id),
    createProfile: (name: string) => ipcRenderer.invoke('profile:create', name),
    updateProfile: (id: string, updates: { name?: string }) =>
        ipcRenderer.invoke('profile:update', { id, ...updates }),
    deleteProfile: (id: string) => ipcRenderer.invoke('profile:delete', id),
    getActiveProfileId: () => ipcRenderer.invoke('profile:getActive'),
    switchProfile: (profileId: string) => ipcRenderer.invoke('profile:switch', profileId),
    getProfileScopedSettings: () => ipcRenderer.invoke('profileSettings:get'),
    setProfileScopedSettings: (partial: {
        fileTypeFilters?: {
            video?: boolean;
            image?: boolean;
            archive?: boolean;
            audio?: boolean;
        };
        previewFrameCount?: number;
        scanThrottleMs?: number;
        thumbnailResolution?: number;
        ratingDisplayThresholds?: {
            mid?: number;
            high?: number;
        };
        listDisplayDefaults?: {
            sortBy?: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
            sortOrder?: 'asc' | 'desc';
            groupBy?: 'none' | 'date' | 'size' | 'type';
            defaultSearchTarget?: 'fileName' | 'folderName';
            activeDisplayPresetId?: string;
            displayMode?: 'standard' | 'standardLarge' | 'manga' | 'video' | 'whiteBrowser' | 'mangaDetailed' | 'compact';
            thumbnailPresentation?: 'modeDefault' | 'contain' | 'cover' | 'square';
        };
        fileCardSettings?: {
            showFileName?: boolean;
            showDuration?: boolean;
            showTags?: boolean;
            showFileSize?: boolean;
            tagPopoverTrigger?: 'click' | 'hover';
            tagDisplayStyle?: 'filled' | 'border';
            fileCardTagOrderMode?: 'balanced' | 'strict';
        };
        defaultExternalApps?: Record<string, string>;
        searchDestinations?: Array<{
            id?: string;
            name: string;
            type: 'filename' | 'image';
            url: string;
            icon?: 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';
            enabled?: boolean;
            createdAt?: number;
        }>;
    }) => ipcRenderer.invoke('profileSettings:set', partial),
    replaceProfileScopedSettings: (settings: {
        fileTypeFilters: {
            video: boolean;
            image: boolean;
            archive: boolean;
            audio: boolean;
        };
        previewFrameCount: number;
        scanThrottleMs: number;
        thumbnailResolution: number;
        ratingDisplayThresholds: {
            mid: number;
            high: number;
        };
        listDisplayDefaults: {
            sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
            sortOrder: 'asc' | 'desc';
            groupBy: 'none' | 'date' | 'size' | 'type';
            defaultSearchTarget: 'fileName' | 'folderName';
            activeDisplayPresetId: string;
            displayMode: 'standard' | 'standardLarge' | 'manga' | 'video' | 'whiteBrowser' | 'mangaDetailed' | 'compact';
            thumbnailPresentation: 'modeDefault' | 'contain' | 'cover' | 'square';
        };
        fileCardSettings: {
            showFileName: boolean;
            showDuration: boolean;
            showTags: boolean;
            showFileSize: boolean;
            tagPopoverTrigger: 'click' | 'hover';
            tagDisplayStyle: 'filled' | 'border';
            fileCardTagOrderMode: 'balanced' | 'strict';
        };
        defaultExternalApps: Record<string, string>;
        searchDestinations: Array<{
            id: string;
            name: string;
            type: 'filename' | 'image';
            url: string;
            icon: 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';
            enabled: boolean;
            createdAt: number;
        }>;
    }) => ipcRenderer.invoke('profileSettings:replace', settings),
    getSmartFolders: () => ipcRenderer.invoke('smartFolder:getAll'),
    getSmartFolderById: (id: string) => ipcRenderer.invoke('smartFolder:getById', id),
    createSmartFolder: (payload: { name: string; condition?: Partial<SmartFolderConditionV1> }) => ipcRenderer.invoke('smartFolder:create', payload),
    updateSmartFolder: (
        payload: {
            id: string;
            updates: { name?: string; condition?: Partial<SmartFolderConditionV1>; sortOrder?: number };
        }
    ) => ipcRenderer.invoke('smartFolder:update', payload),
    deleteSmartFolder: (id: string) => ipcRenderer.invoke('smartFolder:delete', id),
    getAutoOrganizeRules: () => ipcRenderer.invoke('autoOrganize:getAll') as Promise<AutoOrganizeRuleV1[]>,
    getAutoOrganizeSettings: () => ipcRenderer.invoke('autoOrganize:getSettings') as Promise<AutoOrganizeSettingsV1>,
    updateAutoOrganizeSettings: (updates: Partial<AutoOrganizeSettingsV1>) =>
        ipcRenderer.invoke('autoOrganize:updateSettings', updates) as Promise<AutoOrganizeSettingsV1>,
    getAutoOrganizeRuns: (limit?: number) =>
        ipcRenderer.invoke('autoOrganize:getRuns', limit) as Promise<AutoOrganizeRunSummary[]>,
    createAutoOrganizeRule: (payload: {
        name: string;
        enabled?: boolean;
        condition?: Partial<AutoOrganizeConditionV1>;
        action: AutoOrganizeActionV1;
        automation?: AutoOrganizeRuleV1['automation'];
    }) => ipcRenderer.invoke('autoOrganize:create', payload),
    updateAutoOrganizeRule: (payload: {
        id: string;
        updates: {
            name?: string;
            enabled?: boolean;
            condition?: Partial<AutoOrganizeConditionV1>;
            action?: AutoOrganizeActionV1;
            automation?: AutoOrganizeRuleV1['automation'];
            sortOrder?: number;
        };
    }) => ipcRenderer.invoke('autoOrganize:update', payload),
    deleteAutoOrganizeRule: (id: string) => ipcRenderer.invoke('autoOrganize:delete', id),
    dryRunAutoOrganize: (ruleIds?: string[]) => ipcRenderer.invoke('autoOrganize:dryRun', ruleIds) as Promise<AutoOrganizeDryRunResult>,
    applyAutoOrganize: (ruleIds?: string[]) => ipcRenderer.invoke('autoOrganize:apply', ruleIds) as Promise<AutoOrganizeApplyResult>,
    dryRunAutoOrganizeRollback: (runId: string) =>
        ipcRenderer.invoke('autoOrganize:rollbackDryRun', runId) as Promise<AutoOrganizeRollbackPreviewResult>,
    applyAutoOrganizeRollback: (runId: string) =>
        ipcRenderer.invoke('autoOrganize:rollbackApply', runId) as Promise<AutoOrganizeRollbackApplyResult>,

    onProfileSwitched: (callback: (profileId: string) => void) => subscribe('profile:switched', callback),

    // === Backup ===
    createBackup: (profileId: string) => ipcRenderer.invoke('backup:create', { profileId }),
    getBackupHistory: (profileId: string) => ipcRenderer.invoke('backup:history', { profileId }),
    restoreBackup: (backupPath: string) => ipcRenderer.invoke('backup:restore', { backupPath }),
    getBackupSettings: () => ipcRenderer.invoke('backup:getSettings'),
    setBackupSettings: (settings: BackupSettings) => ipcRenderer.invoke('backup:setSettings', settings),
    shouldAutoBackup: (profileId: string) => ipcRenderer.invoke('backup:shouldAutoBackup', { profileId }),

    // === Duplicate Detection ===
    findDuplicates: (mode: DuplicateSearchMode = 'exact') => ipcRenderer.invoke('duplicate:find', mode),
    cancelDuplicateSearch: () => ipcRenderer.invoke('duplicate:cancel'),
    deleteDuplicateFiles: (fileIds: string[]) => ipcRenderer.invoke('duplicate:deleteFiles', fileIds),
    onDuplicateProgress: (callback: (progress: DuplicateProgress) => void) =>
        subscribe('duplicate:progress', callback),

    // === Statistics ===
    getLibraryStats: () => ipcRenderer.invoke('statistics:get'),

    // === Activity Log ===
    getActivityLogs: (limit?: number, offset?: number, actionFilter?: string) =>
        ipcRenderer.invoke('activityLog:get', limit, offset, actionFilter),
    getActivityLogCount: (actionFilter?: string) =>
        ipcRenderer.invoke('activityLog:count', actionFilter),

    // === Thumbnail Cleanup ===
    diagnoseThumbnails: () =>
        ipcRenderer.invoke('thumbnail:diagnose'),
    cleanupOrphanedThumbnails: () =>
        ipcRenderer.invoke('thumbnail:cleanup'),

    // === Auto Tag Rules (Phase 12-8 フェーズ2) ===
    getAllAutoTagRules: () =>
        ipcRenderer.invoke('autoTag:getAllRules'),
    createAutoTagRule: (tagId: string, keywords: string[], target: MatchTarget, matchMode: MatchMode) =>
        ipcRenderer.invoke('autoTag:createRule', { tagId, keywords, target, matchMode }),
    updateAutoTagRule: (id: string, updates: Partial<AutoTagRule>) =>
        ipcRenderer.invoke('autoTag:updateRule', { id, updates }),
    deleteAutoTagRule: (id: string) =>
        ipcRenderer.invoke('autoTag:deleteRule', { id }),
    previewAutoTagRule: (rule: AutoTagRule, files: Array<Pick<MediaFile, 'id' | 'name' | 'path'>>) =>
        ipcRenderer.invoke('autoTag:previewRule', { rule, files }),
    applyAutoTagsToFiles: (fileIds: string[]) =>
        ipcRenderer.invoke('autoTag:applyToFiles', { fileIds }),
    previewFilenameBracketTags: (fileIds: string[]) =>
        ipcRenderer.invoke('autoTag:previewFilenameBracketTags', { fileIds }),
    applyFilenameBracketTagsToFiles: (fileIds: string[]) =>
        ipcRenderer.invoke('autoTag:applyFilenameBracketTags', { fileIds }),

    // === Phase 24: Thumbnail Regeneration ===
    regenerateAllThumbnails: () =>
        ipcRenderer.invoke('thumbnail:regenerateAll'),
    onThumbnailRegenerateProgress: (callback: (progress: ThumbnailRegenerateProgress) => void) =>
        subscribe('thumbnail:regenerateProgress', callback),

    // === Phase 25: Storage Config ===
    getStorageConfig: () =>
        ipcRenderer.invoke('storage:getConfig'),
    setStorageConfig: (mode: StorageMode, customPath?: string) =>
        ipcRenderer.invoke('storage:setConfig', mode, customPath),
    browseStorageFolder: () =>
        ipcRenderer.invoke('storage:browseFolder'),
    deleteOldStorageData: (oldBase: string) =>
        ipcRenderer.invoke('storage:deleteOldData', oldBase),

    // === Phase 26-B: Rating Axes ===
    // Axis Management
    getRatingAxes: () =>
        ipcRenderer.invoke('rating:getAllAxes'),
    createRatingAxis: (name: string, minValue?: number, maxValue?: number, step?: number) =>
        ipcRenderer.invoke('rating:createAxis', { name, minValue, maxValue, step }),
    updateRatingAxis: (id: string, updates: { name?: string; minValue?: number; maxValue?: number; step?: number; sortOrder?: number }) =>
        ipcRenderer.invoke('rating:updateAxis', { id, ...updates }),
    deleteRatingAxis: (id: string) =>
        ipcRenderer.invoke('rating:deleteAxis', { id }),
    setOverallRatingAxis: (id: string) =>
        ipcRenderer.invoke('rating:setOverallAxis', { id }),

    // File Ratings
    getFileRatings: (fileId: string) =>
        ipcRenderer.invoke('rating:getFileRatings', { fileId }),
    setFileRating: (fileId: string, axisId: string, value: number) =>
        ipcRenderer.invoke('rating:setFileRating', { fileId, axisId, value }),
    removeFileRating: (fileId: string, axisId: string) =>
        ipcRenderer.invoke('rating:removeFileRating', { fileId, axisId }),
    getAllFileRatings: () =>
        ipcRenderer.invoke('rating:getAllFileRatings') as Promise<Record<string, Record<string, number>>>,
    getRatingDistribution: (axisId: string) =>
        ipcRenderer.invoke('rating:getDistribution', { axisId }),

    // === Phase 26-D: 複合検索 ===
    searchFiles: (condition: SearchCondition) =>
        ipcRenderer.invoke('search:searchFiles', condition),
});

