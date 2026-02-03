export { };

// Shared types for Tag system
interface TagDefinition {
    id: string;
    name: string;
    color: string;
    categoryId: string | null;
    sortOrder: number;
    createdAt: number;
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

            // Scanner
            scanFolder: (folderPath: string) => Promise<void>;

            // App
            openExternal: (path: string) => Promise<void>;
            showInExplorer: (path: string) => Promise<void>;
            getLogs: (lines?: number) => Promise<string[]>;
            openLogFolder: () => Promise<void>;

            // File Operations
            updateFileNotes: (fileId: string, notes: string) => Promise<{ success: boolean }>;

            // Dialog
            selectFolder: () => Promise<string | null>;

            // Events
            onScanProgress: (callback: (progress: any) => void) => () => void;
            cancelScan: () => Promise<void>;
            setPreviewFrameCount: (count: number) => Promise<void>;
            autoScan: () => Promise<void>;

            // Context Menu
            showFolderContextMenu: (folderId: string, path: string) => Promise<void>;
            onFolderDeleted: (callback: (folderId: string) => void) => () => void;
            onFolderRescanComplete: (callback: (folderId: string) => void) => () => void;

            // File Context Menu
            showFileContextMenu: (fileId: string, path: string) => Promise<void>;
            onFileDeleted: (callback: (fileId: string) => void) => () => void;
            onThumbnailRegenerated: (callback: (fileId: string) => void) => () => void;

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
            createTag: (name: string, color?: string, categoryId?: string) => Promise<TagDefinition>;
            updateTag: (id: string, updates: { name?: string; color?: string; categoryId?: string | null; sortOrder?: number }) => Promise<TagDefinition | null>;
            deleteTag: (id: string) => Promise<{ success: boolean }>;

            // Tags - File Operations
            addTagToFile: (fileId: string, tagId: string) => Promise<{ success: boolean }>;
            removeTagFromFile: (fileId: string, tagId: string) => Promise<{ success: boolean }>;
            getFileTags: (fileId: string) => Promise<TagDefinition[]>;
            getFileTagIds: (fileId: string) => Promise<string[]>;
            getFilesByTags: (tagIds: string[], mode?: 'AND' | 'OR') => Promise<string[]>;

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
        };
    }
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
