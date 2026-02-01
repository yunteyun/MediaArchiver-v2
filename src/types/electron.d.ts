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

declare global {
    interface Window {
        electronAPI: {
            // Database
            getFiles: (folderId?: string) => Promise<any[]>;

            // Folder
            addFolder: (folderPath: string) => Promise<any>;
            getFolders: () => Promise<any[]>;
            deleteFolder: (folderId: string) => Promise<void>;

            // Scanner
            scanFolder: (folderPath: string) => Promise<void>;

            // App
            openExternal: (path: string) => Promise<void>;
            showInExplorer: (path: string) => Promise<void>;

            // Dialog
            selectFolder: () => Promise<string | null>;

            // Events
            onScanProgress: (callback: (progress: any) => void) => () => void;

            // Context Menu
            showFolderContextMenu: (folderId: string, path: string) => Promise<void>;
            onFolderDeleted: (callback: (folderId: string) => void) => () => void;
            onFolderRescanComplete: (callback: (folderId: string) => void) => () => void;

            // File Context Menu
            showFileContextMenu: (fileId: string, path: string) => Promise<void>;
            onFileDeleted: (callback: (fileId: string) => void) => () => void;

            // Archive
            getArchiveMetadata: (path: string) => Promise<{
                fileCount: number;
                firstImageEntry: string | null;
                imageEntries: string[];
            } | null>;
            getArchivePreviewFrames: (path: string, limit?: number) => Promise<string[]>;
            cleanArchiveTemp: () => Promise<{ success: boolean }>;

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
        };
    }
}

