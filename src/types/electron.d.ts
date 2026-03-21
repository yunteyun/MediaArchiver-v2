import type { MediaFile, MediaFolder, PlaybackBookmark } from './file';
import type {
    ExternalApp as SettingsExternalApp,
    ScanExclusionRules as SettingsScanExclusionRules,
} from '../stores/useSettingsStore';
import type { ScanProgress as UiScanProgress } from '../stores/useUIStore';
import type { SmartFolderConditionV1, SmartFolderV1 } from '../stores/useSmartFolderStore';
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
} from './autoOrganize';
import type { ExternalDisplayPresetListResult } from '../components/fileCard/displayModes';
import type { DuplicateSearchMode, SimilarNameMatchKind } from '../shared/duplicateNameCandidates';
import type {
    Tag as RendererTagDefinition,
    TagCategory as RendererTagCategory,
    AutoTagRule as RendererAutoTagRule,
    MatchTarget,
    MatchMode,
} from '../stores/useTagStore';

export { };

// Profile type
interface Profile {
    id: string;
    name: string;
    dbFilename: string;
    createdAt: number;
    updatedAt: number;
}

interface FileTypeCategoryFilters {
    video: boolean;
    image: boolean;
    archive: boolean;
    audio: boolean;
}

interface ProfileScopedSettingsV1 {
    fileTypeFilters: FileTypeCategoryFilters;
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
}

interface ProfileScopedSettingsResponse {
    settings: ProfileScopedSettingsV1;
    exists: boolean;
}

interface ScanBatchCommittedPayload {
    jobId: string;
    rootFolderId: string;
    scanPath: string;
    committedCount: number;
    totalCommitted: number;
    removedCount: number;
    stage: 'batch' | 'complete' | 'cancelled';
}

// Phase 26-D: 複合検索型定義
interface SearchConditionTagFilter {
    ids: string[];
    mode: 'AND' | 'OR';
}

interface SearchConditionRatingFilter {
    axisId: string;
    min?: number;
    max?: number;
}

interface SearchCondition {
    text?: string;
    tags?: SearchConditionTagFilter;
    ratings?: SearchConditionRatingFilter[];
    types?: string[];
}

interface SearchResult {
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    duration: number | null;
    width: number | null;
    height: number | null;
    createdAt: number;
    thumbnailPath: string | null;
}

interface ContextMenuSearchDestination {
    id: string;
    name: string;
    type: 'filename' | 'image';
    url: string;
    icon?: 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';
    enabled: boolean;
}

interface AppUpdateCheckResult {
    success: boolean;
    currentVersion: string;
    latestVersion?: string;
    hasUpdate?: boolean;
    downloadUrl?: string;
    downloadFileName?: string;
    releaseUrl?: string;
    publishedAt?: string;
    releaseNotes?: string;
    sourceUrl: string;
    error?: string;
}

interface AppUpdateDownloadResult {
    success: boolean;
    sourceUrl: string;
    filePath?: string;
    fileName?: string;
    bytes?: number;
    sha256?: string;
    expectedSha256?: string;
    verified?: boolean;
    error?: string;
}

interface AppUpdateApplyResult {
    success: boolean;
    zipPath?: string;
    updateBatPath?: string;
    error?: string;
}

interface AppBundledReleaseNotesResult {
    success: boolean;
    version: string;
    path?: string;
    content?: string;
    error?: string;
}

declare global {
    interface Window {
        electronAPI: {
            // Database
            getFiles: (folderId?: string) => Promise<MediaFile[]>;
            getFilesByFolderPathDirect: (folderPath: string) => Promise<MediaFile[]>;
            getFilesByFolderPathRecursive: (folderPath: string) => Promise<MediaFile[]>;
            getFileById: (fileId: string) => Promise<MediaFile | null>;

            // Folder
            addFolder: (folderPath: string) => Promise<MediaFolder>;
            getFolders: () => Promise<MediaFolder[]>;
            deleteFolder: (folderId: string) => Promise<void>;
            getFolderMetadata: () => Promise<{ fileCounts: Record<string, number>; thumbnails: Record<string, string> }>;
            getFolderTreePaths: () => Promise<string[]>;
        getFolderTreeStats: (options?: { includeDiskPaths?: boolean }) => Promise<{ paths: string[]; recursiveCountsByPath: Record<string, number> }>;
            setFolderAutoScan: (folderId: string, enabled: boolean) => Promise<{ success: boolean }>;
            setFolderWatchNewFiles: (folderId: string, enabled: boolean) => Promise<{ success: boolean }>;
            setFolderBadgeColor: (folderId: string, color: string | null) => Promise<{ success: boolean }>;
            setFolderScanFileTypeOverrides: (
                folderId: string,
                overrides: Partial<{ video: boolean | null; image: boolean | null; archive: boolean | null; audio: boolean | null; }>
            ) => Promise<{ success: boolean }>;
            setFolderExcludedSubdirectories: (folderId: string, excludedSubdirectories: string[]) => Promise<{ success: boolean }>;
            clearFolderScanFileTypeOverrides: (folderId: string) => Promise<{ success: boolean }>;

            // Phase 22-C: ドライブ/フォルダ配下の全ファイル取得
            getFilesByDrive: (drive: string) => Promise<MediaFile[]>;
            getFilesByFolderRecursive: (folderId: string) => Promise<MediaFile[]>;

            // Scanner
            scanFolder: (folderPath: string) => Promise<void>;

            // App
            openExternal: (path: string) => Promise<void>;
            openUrl: (url: string) => Promise<void>;
            showInExplorer: (path: string) => Promise<void>;
            getAppVersion: () => Promise<string>;  // Phase 26
            getBundledReleaseNotes: (version?: string) => Promise<AppBundledReleaseNotesResult>;
            checkForAppUpdate: (sourceUrl?: string) => Promise<AppUpdateCheckResult>;
            downloadLatestUpdateZip: (sourceUrl?: string) => Promise<AppUpdateDownloadResult>;
            applyUpdateFromZip: (zipPath?: string) => Promise<AppUpdateApplyResult>;
            getLogs: (lines?: number) => Promise<string[]>;
            openLogFolder: () => Promise<void>;
            selectFile: () => Promise<string | null>;
            validatePath: (appPath: string) => Promise<boolean>;
            setPerfDebugEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>;
            setExternalApps: (apps: SettingsExternalApp[]) => Promise<void>;
            openWithApp: (filePath: string, appPath: string, fileId?: string) => Promise<{
                success: boolean;
                error?: string;
                externalOpenCount?: number;
                lastExternalOpenedAt?: number;
            }>;
            getDisplayPresets: () => Promise<ExternalDisplayPresetListResult>;
            openDisplayPresetFolder: () => Promise<{ success: boolean; directory: string; error?: string }>;

            // File Operations
            updateFileNotes: (fileId: string, notes: string) => Promise<{ success: boolean }>;
            updateFilePlaybackPosition: (fileId: string, playbackPositionSeconds: number | null) => Promise<{
                success: boolean;
                error?: string;
                playbackPositionSeconds: number | null;
                playbackPositionUpdatedAt: number | null;
            }>;
            getPlaybackBookmarks: (fileId: string) => Promise<PlaybackBookmark[]>;
            createPlaybackBookmark: (fileId: string, timeSeconds: number, note?: string | null) => Promise<{
                success: boolean;
                error?: string;
                bookmark: PlaybackBookmark | null;
            }>;
            deletePlaybackBookmark: (bookmarkId: string) => Promise<{
                success: boolean;
                error?: string;
            }>;
            updatePlaybackBookmarkNote: (bookmarkId: string, note?: string | null) => Promise<{
                success: boolean;
                error?: string;
                bookmark: PlaybackBookmark | null;
            }>;
            setRepresentativeThumbnail: (fileId: string, timeSeconds: number) => Promise<{
                success: boolean;
                error?: string;
                thumbnailPath?: string;
                thumbnailLocked?: boolean;
            }>;
            setRepresentativeThumbnailFromSource: (fileId: string, sourcePath: string) => Promise<{
                success: boolean;
                error?: string;
                thumbnailPath?: string;
                thumbnailLocked?: boolean;
            }>;
            restoreAutoThumbnail: (fileId: string) => Promise<{
                success: boolean;
                error?: string;
                thumbnailPath?: string;
                thumbnailLocked?: boolean;
            }>;
            renameFile: (fileId: string, newName: string) => Promise<{ success: boolean; newName?: string; newPath?: string; error?: string }>;

            // Dialog
            selectFolder: () => Promise<string | null>;
            saveTextFile: (options: {
                title?: string;
                defaultPath?: string;
                filters?: Array<{ name: string; extensions: string[] }>;
                content: string;
            }) => Promise<{ canceled: boolean; filePath?: string }>;
            openTextFile: (options?: {
                title?: string;
                filters?: Array<{ name: string; extensions: string[] }>;
            }) => Promise<{ canceled: boolean; filePath?: string; content?: string }>;
            openBinaryFile: (options?: {
                title?: string;
                filters?: Array<{ name: string; extensions: string[] }>;
            }) => Promise<{ canceled: boolean; filePath?: string; bytes?: Uint8Array }>;

            // Events
            onScanProgress: (callback: (progress: UiScanProgress) => void) => () => void;
            onScanBatchCommitted: (callback: (payload: ScanBatchCommittedPayload) => void) => () => void;
            cancelScan: () => Promise<void>;
            setPreviewFrameCount: (count: number) => Promise<void>;
            setScanThrottleMs: (ms: number) => Promise<void>;
            setThumbnailResolution: (resolution: number) => Promise<void>;
            setScanFileTypeCategories: (filters: Partial<FileTypeCategoryFilters>) => Promise<void>;
            setScanExclusionRules: (rules: SettingsScanExclusionRules) => Promise<void>;
            autoScan: () => Promise<void>;

            // Context Menu
            showFolderContextMenu: (folderId: string, path: string) => Promise<void>;
            onFolderDeleted: (callback: (folderId: string) => void) => () => void;
            onFolderUpdated: (callback: (folderId: string) => void) => () => void;
            onFolderRescanComplete: (callback: (folderId: string) => void) => () => void;

            // File Context Menu
            showFileContextMenu: (
                fileId: string,
                path: string,
                selectedFileIds?: string[],
                searchDestinations?: ContextMenuSearchDestination[]
            ) => Promise<void>;
            onFileDeleted: (callback: (fileId: string) => void) => () => void;
            onThumbnailRegenerated: (callback: (fileId: string) => void) => () => void;
            onExternalOpenCountUpdated: (callback: (data: { fileId: string; externalOpenCount: number; lastExternalOpenedAt: number }) => void) => () => void;
            onOpenFileAsMode: (callback: (data: { fileId: string; mode: 'archive-audio' | 'archive-image' }) => void) => () => void;

            // Phase 22-C-2: ファイル移動ダイアログ
            onOpenMoveDialog: (callback: (data: { fileIds: string[]; currentFolderId: string | null }) => void) => () => void;
            onRequestRename: (callback: (data: { fileId: string; currentName: string; currentPath?: string; suggestedName?: string }) => void) => () => void;
            onShowToast: (callback: (data: { message: string; type?: 'success' | 'error' | 'info'; duration?: number }) => void) => () => void;

            // File Delete Dialog (Phase 12-17B)
            confirmDelete: (fileId: string, filePath: string, permanentDelete: boolean) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
            confirmDeleteBatch: (
                fileIds: string[],
                filePaths: string[],
                permanentDelete: boolean
            ) => Promise<{
                success: boolean;
                cancelled?: boolean;
                deletedCount: number;
                failedCount: number;
                error?: string;
                errors?: string[];
            }>;
            onShowDeleteDialog: (callback: (data: { fileIds: string[]; filePaths: string[] }) => void) => () => void;

            // Phase 18-C: File Move
            moveFileToFolder: (fileId: string, targetFolderId?: string, targetFolderPath?: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
            onFileMoved: (callback: (data: { fileId: string; newPath: string; targetFolderId: string }) => void) => () => void;
            onRequestMove: (callback: (data: { fileId: string; targetFolderId: string }) => void) => () => void;

            // Archive
            getArchiveMetadata: (path: string) => Promise<{
                fileCount: number;
                firstImageEntry: string | null;
                imageEntries: string[];
                audioEntries: string[];
                hasAudio: boolean;
            } | null>;
            getArchivePreviewFrames: (path: string, limit?: number) => Promise<string[]>;
            cleanArchiveTemp: () => Promise<{ success: boolean }>;
            getArchiveAudioFiles: (archivePath: string) => Promise<string[]>;
            extractArchiveAudioFile: (archivePath: string, entryName: string) => Promise<string | null>;

            // Tags - Categories
            getTagCategories: () => Promise<RendererTagCategory[]>;
            createTagCategory: (name: string, color?: string) => Promise<RendererTagCategory>;
            updateTagCategory: (id: string, updates: { name?: string; color?: string; sortOrder?: number }) => Promise<RendererTagCategory | null>;
            deleteTagCategory: (id: string) => Promise<{ success: boolean }>;

            // Tags - Definitions
            getAllTags: () => Promise<RendererTagDefinition[]>;
            createTag: (name: string, color?: string, categoryId?: string, icon?: string, description?: string) => Promise<RendererTagDefinition>;
            updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null; sortOrder?: number; icon?: string; description?: string }) => Promise<RendererTagDefinition | null>;
            deleteTag: (id: string) => Promise<{ success: boolean }>;

            // Tags - File Operations
            addTagToFile: (fileId: string, tagId: string) => Promise<{ success: boolean }>;
            removeTagFromFile: (fileId: string, tagId: string) => Promise<{ success: boolean }>;
            getFileTags: (fileId: string) => Promise<RendererTagDefinition[]>;
            getFileTagIds: (fileId: string) => Promise<string[]>;
            getFileTagIdsForFiles: (fileIds: string[]) => Promise<Record<string, string[]>>;
            getFilesByTags: (tagIds: string[], mode?: 'AND' | 'OR') => Promise<string[]>;
            getAllFileTagIds: () => Promise<Record<string, string[]>>;

            // Profile
            getProfiles: () => Promise<Profile[]>;
            getProfile: (id: string) => Promise<Profile | undefined>;
            createProfile: (name: string) => Promise<Profile>;
            updateProfile: (id: string, updates: { name?: string }) => Promise<void>;
            deleteProfile: (id: string) => Promise<boolean>;
            getActiveProfileId: () => Promise<string>;
            switchProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
            getProfileScopedSettings: () => Promise<ProfileScopedSettingsResponse>;
            setProfileScopedSettings: (partial: Partial<ProfileScopedSettingsV1>) => Promise<ProfileScopedSettingsResponse>;
            replaceProfileScopedSettings: (settings: ProfileScopedSettingsV1) => Promise<ProfileScopedSettingsResponse>;
            getSmartFolders: () => Promise<SmartFolderV1[]>;
            getSmartFolderById: (id: string) => Promise<SmartFolderV1 | null>;
            createSmartFolder: (payload: { name: string; condition?: Partial<SmartFolderConditionV1> }) => Promise<SmartFolderV1>;
            updateSmartFolder: (payload: {
                id: string;
                updates: {
                    name?: string;
                    condition?: Partial<SmartFolderConditionV1>;
                    sortOrder?: number;
                };
            }) => Promise<SmartFolderV1>;
            deleteSmartFolder: (id: string) => Promise<{ success: boolean }>;
            getAutoOrganizeRules: () => Promise<AutoOrganizeRuleV1[]>;
            getAutoOrganizeSettings: () => Promise<AutoOrganizeSettingsV1>;
            updateAutoOrganizeSettings: (updates: Partial<AutoOrganizeSettingsV1>) => Promise<AutoOrganizeSettingsV1>;
            getAutoOrganizeRuns: (limit?: number) => Promise<AutoOrganizeRunSummary[]>;
            createAutoOrganizeRule: (payload: {
                name: string;
                enabled?: boolean;
                condition?: Partial<AutoOrganizeConditionV1>;
                action: AutoOrganizeActionV1;
                automation?: AutoOrganizeRuleV1['automation'];
            }) => Promise<AutoOrganizeRuleV1>;
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
            }) => Promise<AutoOrganizeRuleV1>;
            deleteAutoOrganizeRule: (id: string) => Promise<{ success: boolean }>;
            dryRunAutoOrganize: (ruleIds?: string[]) => Promise<AutoOrganizeDryRunResult>;
            applyAutoOrganize: (ruleIds?: string[]) => Promise<AutoOrganizeApplyResult>;
            dryRunAutoOrganizeRollback: (runId: string) => Promise<AutoOrganizeRollbackPreviewResult>;
            applyAutoOrganizeRollback: (runId: string) => Promise<AutoOrganizeRollbackApplyResult>;
            onProfileSwitched: (callback: (profileId: string) => void) => () => void;

            // Duplicate Detection
            findDuplicates: (mode?: DuplicateSearchMode) => Promise<{
                groups: DuplicateGroup[];
                stats: DuplicateStats;
            }>;
            cancelDuplicateSearch: () => Promise<void>;
            deleteDuplicateFiles: (fileIds: string[]) => Promise<{ id: string; success: boolean; error?: string }[]>;
            onDuplicateProgress: (callback: (progress: DuplicateProgress) => void) => () => void;

            // Backup
            createBackup: (profileId: string) => Promise<{ success: boolean; backup?: BackupInfo; error?: string }>;
            getBackupHistory: (profileId: string) => Promise<BackupInfo[]>;
            restoreBackup: (backupPath: string) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
            getBackupSettings: () => Promise<BackupSettings>;
            setBackupSettings: (settings: BackupSettings) => Promise<{ success: boolean }>;
            shouldAutoBackup: (profileId: string) => Promise<boolean>;

            // Statistics
            getLibraryStats: () => Promise<LibraryStats>;

            // Activity Log
            getActivityLogs: (limit?: number, offset?: number, actionFilter?: ActivityAction) => Promise<ActivityLog[]>;
            getActivityLogCount: (actionFilter?: ActivityAction) => Promise<number>;

            // Thumbnail Cleanup
            diagnoseThumbnails: () => Promise<DiagnosticResult>;
            cleanupOrphanedThumbnails: () => Promise<CleanupResult>;

            // Auto Tag Rules (Phase 12-8 フェーズ2)
            getAllAutoTagRules: () => Promise<RendererAutoTagRule[]>;
            createAutoTagRule: (tagId: string, keywords: string[], target: MatchTarget, matchMode: MatchMode) => Promise<RendererAutoTagRule>;
            updateAutoTagRule: (id: string, updates: Partial<RendererAutoTagRule>) => Promise<{ success: boolean }>;
            deleteAutoTagRule: (id: string) => Promise<{ success: boolean }>;
            previewAutoTagRule: (rule: RendererAutoTagRule, files: Array<Pick<MediaFile, 'id' | 'name' | 'path'>>) => Promise<PreviewMatch[]>;
            applyAutoTagsToFiles: (fileIds: string[]) => Promise<ApplyResult>;
            previewFilenameBracketTags: (fileIds: string[]) => Promise<FilenameBracketTagPreviewResult>;
            applyFilenameBracketTagsToFiles: (fileIds: string[]) => Promise<FilenameBracketTagApplyResult>;

            // Phase 17: Access Count
            incrementAccessCount: (fileId: string) => Promise<{
                success: boolean;
                accessCount?: number;
                lastAccessedAt?: number;
                error?: string;
            }>;
            incrementExternalOpenCount: (fileId: string) => Promise<{
                success: boolean;
                externalOpenCount?: number;
                lastExternalOpenedAt?: number;
                error?: string;
            }>;

            // Phase 24: Thumbnail Regeneration
            regenerateAllThumbnails: () => Promise<ThumbnailRegenerateResult>;
            onThumbnailRegenerateProgress: (callback: (progress: { current: number; total: number }) => void) => () => void;

            // Phase 25: Storage Config
            getStorageConfig: () => Promise<StorageConfig>;
            setStorageConfig: (mode: StorageMode, customPath?: string) => Promise<MigrationResult>;
            browseStorageFolder: () => Promise<string | null>;
            deleteOldStorageData: (oldBase: string) => Promise<{ success: boolean; error?: string }>;

            // Phase 26-B: Rating Axes
            getRatingAxes: () => Promise<RatingAxis[]>;
            createRatingAxis: (name: string, minValue?: number, maxValue?: number, step?: number) => Promise<RatingAxis>;
            updateRatingAxis: (id: string, updates: { name?: string; minValue?: number; maxValue?: number; step?: number; sortOrder?: number }) => Promise<RatingAxis | null>;
            deleteRatingAxis: (id: string) => Promise<{ success: boolean; reason?: string }>;
            setOverallRatingAxis: (id: string) => Promise<RatingAxis[] | null>;
            getFileRatings: (fileId: string) => Promise<FileRating[]>;
            setFileRating: (fileId: string, axisId: string, value: number) => Promise<{ success: boolean }>;
            removeFileRating: (fileId: string, axisId: string) => Promise<{ success: boolean }>;
            getAllFileRatings: () => Promise<Record<string, Record<string, number>>>;
            getRatingDistribution: (axisId: string) => Promise<{ value: number; count: number }[]>;

            // Phase 26-D: 複合検索
            searchFiles: (condition: SearchCondition) => Promise<SearchResult[]>;

        };
    }
}

// Auto Tag Rule types (Phase 12-8 フェーズ2)
interface PreviewMatch {
    fileId: string;
    fileName: string;
    matchedKeywords: string[];
}

interface ApplyResult {
    success: boolean;
    filesProcessed: number;
    filesUpdated: number;
    tagsAssigned: number;
}

interface FilenameBracketTagPreviewResult {
    filesProcessed: number;
    filesWithCandidates: number;
    candidateTagNames: string[];
    newTagNames: string[];
}

interface FilenameBracketTagApplyResult extends ApplyResult {
    tagsCreated: number;
    createdTagNames: string[];
}

// Duplicate Detection types
interface DuplicateFileEntry {
    id: string;
    name: string;
    path: string;
    size: number;
    type: string;
    created_at: number;
    duration?: string;
    thumbnail_path?: string;
    preview_frames?: string;
    root_folder_id?: string;
    tags: string[];
    content_hash?: string;
    metadata?: string;
    mtime_ms?: number;
    notes?: string;
}

interface DuplicateGroup {
    hash: string;
    size: number;
    sizeMin: number;
    sizeMax: number;
    matchKind: 'content_hash' | SimilarNameMatchKind;
    matchLabel: string;
    files: DuplicateFileEntry[];
    count: number;
}

interface DuplicateStats {
    totalGroups: number;
    totalFiles: number;
    wastedSpace: number;
}

interface DuplicateProgress {
    phase: 'analyzing' | 'hashing' | 'complete';
    current: number;
    total: number;
    currentFile?: string;
}

// Backup types
interface BackupInfo {
    id: string;
    filename: string;
    path: string;
    createdAt: number;
    size: number;
    profileId: string;
}

interface BackupSettings {
    enabled: boolean;
    interval: 'daily' | 'weekly';
    maxBackups: number;
    backupPath: string;
}

// Statistics types
interface LibraryStats {
    totalFiles: number;
    totalSize: number;
    byType: { type: string; count: number; size: number }[];
    byTag: { tagId: string; tagName: string; tagColor: string; count: number }[];
    byFolder: { folderId: string; folderPath: string; count: number; size: number }[];
    recentFiles: { id: string; name: string; path: string; type: string; createdAt: number; thumbnailPath: string | null }[];
    monthlyTrend: { month: string; count: number }[];
    untaggedStats: { tagged: number; untagged: number };
    ratingStats: { ratingValue: number; ratingLabel: string; count: number }[];
    largeFiles: { id: string; name: string; path: string; type: string; size: number; thumbnailPath: string | null }[];
    extensionStats: { type: string; extension: string; count: number }[];
    resolutionStats: { resolution: string; count: number }[];
    thumbnailSize: number;  // Phase 24: サムネイルディレクトリ合計サイズ
}

// Activity Log types
type ActivityAction =
    | 'file_add'
    | 'file_delete'
    | 'file_move'
    | 'file_rename'
    | 'tag_add'
    | 'tag_remove'
    | 'scan_start'
    | 'scan_end';

interface ActivityLog {
    id: number;
    action: ActivityAction;
    target_id: string | null;
    target_name: string | null;
    details: string | null;
    created_at: number;
}

// Thumbnail Cleanup types
interface OrphanedThumbnail {
    path: string;
    size: number;
}

interface DiagnosticResult {
    totalThumbnails: number;
    orphanedCount: number;
    totalOrphanedSize: number;
    orphanedFiles: string[];
    samples: OrphanedThumbnail[];
}

interface CleanupResult {
    success: boolean;
    deletedCount: number;
    freedBytes: number;
    errors: string[];
}

// File Operation types
interface DeleteFileResult {
    success: boolean;
    method: 'trash' | 'permanent' | 'none';
    cancelled?: boolean;
    error?: string;
}

// Phase 24: Thumbnail Regeneration types
interface ThumbnailRegenerateResult {
    success: number;
    failed: number;
}

// Phase 25: Storage Config types
type StorageMode = 'appdata' | 'install' | 'custom';

interface StorageConfig {
    mode: StorageMode;
    customPath?: string;
    resolvedPath: string;
}

interface MigrationResult {
    success: boolean;
    oldBase: string;
    newBase: string;
    error?: string;
}

// Phase 26-B: Rating Axes types
interface RatingAxis {
    id: string;
    name: string;
    minValue: number;
    maxValue: number;
    step: number;
    isSystem: boolean;
    sortOrder: number;
    createdAt: number;
}

interface FileRating {
    fileId: string;
    axisId: string;
    value: number;
    updatedAt: number;
}

