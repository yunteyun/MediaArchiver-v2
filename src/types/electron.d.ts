export { };

// Shared types for Tag system
interface TagDefinition {
    id: string;
    name: string;
    color: string;
    categoryId: string | null;
    categoryColor?: string;  // カテゴリの色（動的ボーダー用）
    sortOrder: number;
    createdAt: number;
    icon: string;
    description: string;
}

interface TagCategory {
    id: string;
    name: string;
    color: string;
    sortOrder: number;
    createdAt: number;
}

// Profile type
interface Profile {
    id: string;
    name: string;
    dbFilename: string;
    createdAt: number;
    updatedAt: number;
}

declare global {
    interface Window {
        electronAPI: {
            // Database
            getFiles: (folderId?: string) => Promise<any[]>;
            getFileById: (fileId: string) => Promise<any | null>;

            // Folder
            addFolder: (folderPath: string) => Promise<any>;
            getFolders: () => Promise<any[]>;
            deleteFolder: (folderId: string) => Promise<void>;
            getFolderMetadata: () => Promise<{ fileCounts: Record<string, number>; thumbnails: Record<string, string> }>;

            // Scanner
            scanFolder: (folderPath: string) => Promise<void>;

            // App
            openExternal: (path: string) => Promise<void>;
            showInExplorer: (path: string) => Promise<void>;
            getLogs: (lines?: number) => Promise<string[]>;
            openLogFolder: () => Promise<void>;
            selectFile: () => Promise<string | null>;
            validatePath: (appPath: string) => Promise<boolean>;
            setExternalApps: (apps: any[]) => Promise<void>;
            openWithApp: (filePath: string, appPath: string, fileId?: string) => Promise<{
                success: boolean;
                error?: string;
                externalOpenCount?: number;
                lastExternalOpenedAt?: number;
            }>;

            // File Operations
            updateFileNotes: (fileId: string, notes: string) => Promise<{ success: boolean }>;

            // Dialog
            selectFolder: () => Promise<string | null>;

            // Events
            onScanProgress: (callback: (progress: any) => void) => () => void;
            cancelScan: () => Promise<void>;
            setPreviewFrameCount: (count: number) => Promise<void>;
            setScanThrottleMs: (ms: number) => Promise<void>;
            setThumbnailResolution: (resolution: number) => Promise<void>;
            autoScan: () => Promise<void>;

            // Context Menu
            showFolderContextMenu: (folderId: string, path: string) => Promise<void>;
            onFolderDeleted: (callback: (folderId: string) => void) => () => void;
            onFolderRescanComplete: (callback: (folderId: string) => void) => () => void;

            // File Context Menu
            showFileContextMenu: (fileId: string, path: string) => Promise<void>;
            onFileDeleted: (callback: (fileId: string) => void) => () => void;
            onThumbnailRegenerated: (callback: (fileId: string) => void) => () => void;

            // File Delete Dialog (Phase 12-17B)
            confirmDelete: (fileId: string, filePath: string, permanentDelete: boolean) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
            onShowDeleteDialog: (callback: (data: { fileId: string; filePath: string }) => void) => () => void;

            // Phase 18-C: File Move
            moveFileToFolder: (fileId: string, targetFolderId: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
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
            getTagCategories: () => Promise<TagCategory[]>;
            createTagCategory: (name: string, color?: string) => Promise<TagCategory>;
            updateTagCategory: (id: string, updates: { name?: string; color?: string; sortOrder?: number }) => Promise<TagCategory | null>;
            deleteTagCategory: (id: string) => Promise<{ success: boolean }>;

            // Tags - Definitions
            getAllTags: () => Promise<TagDefinition[]>;
            createTag: (name: string, color?: string, categoryId?: string, icon?: string, description?: string) => Promise<TagDefinition>;
            updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null; sortOrder?: number; icon?: string; description?: string }) => Promise<TagDefinition | null>;
            deleteTag: (id: string) => Promise<{ success: boolean }>;

            // Tags - File Operations
            addTagToFile: (fileId: string, tagId: string) => Promise<{ success: boolean }>;
            removeTagFromFile: (fileId: string, tagId: string) => Promise<{ success: boolean }>;
            getFileTags: (fileId: string) => Promise<TagDefinition[]>;
            getFileTagIds: (fileId: string) => Promise<string[]>;
            getFilesByTags: (tagIds: string[], mode?: 'AND' | 'OR') => Promise<string[]>;
            getAllFileTagIds: () => Promise<Record<string, string[]>>;

            // Profile
            getProfiles: () => Promise<Profile[]>;
            getProfile: (id: string) => Promise<Profile | undefined>;
            createProfile: (name: string) => Promise<Profile>;
            updateProfile: (id: string, updates: { name?: string }) => Promise<void>;
            deleteProfile: (id: string) => Promise<boolean>;
            getActiveProfileId: () => Promise<string>;
            switchProfile: (profileId: string) => Promise<{ success: boolean }>;
            onProfileSwitched: (callback: (profileId: string) => void) => () => void;

            // Duplicate Detection
            findDuplicates: () => Promise<{
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
            getAllAutoTagRules: () => Promise<AutoTagRule[]>;
            createAutoTagRule: (tagId: string, keywords: string[], target: MatchTarget, matchMode: MatchMode) => Promise<AutoTagRule>;
            updateAutoTagRule: (id: string, updates: Partial<AutoTagRule>) => Promise<{ success: boolean }>;
            deleteAutoTagRule: (id: string) => Promise<{ success: boolean }>;
            previewAutoTagRule: (rule: AutoTagRule, files: Array<{ id: string; name: string; path: string }>) => Promise<PreviewMatch[]>;
            applyAutoTagsToFiles: (fileIds: string[]) => Promise<ApplyResult>;

            // Phase 17: Access Count
            incrementAccessCount: (fileId: string) => Promise<{
                success: boolean;
                accessCount?: number;
                lastAccessedAt?: number;
                error?: string;
            }>;
        };
    }
}

// Auto Tag Rule types (Phase 12-8 フェーズ2)
type MatchTarget = 'filename' | 'foldername' | 'both';
type MatchMode = 'partial' | 'exact';

interface AutoTagRule {
    id: string;
    tagId: string;
    keywords: string[];
    target: MatchTarget;
    matchMode: MatchMode;
    enabled: boolean;
    sortOrder: number;
    createdAt: number;
}

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

// Duplicate Detection types
interface DuplicateGroup {
    hash: string;
    size: number;
    files: any[];
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
    ratingStats: { rating: string; count: number }[];
    largeFiles: { id: string; name: string; path: string; type: string; size: number; thumbnailPath: string | null }[];
    extensionStats: { type: string; extension: string; count: number }[];
    resolutionStats: { resolution: string; count: number }[];
}

// Activity Log types
type ActivityAction =
    | 'file_add'
    | 'file_delete'
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
