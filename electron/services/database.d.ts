/**
 * Database Operations - メディアファイル/フォルダのCRUD操作
 *
 * 注意: このファイルは dbManager.getDb() 経由でDBにアクセスします。
 * 必ず dbManager.initialize() が呼ばれた後に使用してください。
 */
export interface MediaFile {
    id: string;
    name: string;
    path: string;
    size: number;
    type: 'video' | 'image' | 'archive' | 'audio';
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
    is_animated?: number;
    isAnimated?: boolean;
    thumbnailPath?: string;
    previewFrames?: string;
    rootFolderId?: string;
    contentHash?: string;
    createdAt?: number;
    mtimeMs?: number;
    accessCount?: number;
    lastAccessedAt?: number | null;
    externalOpenCount?: number;
    lastExternalOpenedAt?: number | null;
}
export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    created_at: number;
}
/**
 * Phase 18-A: 外部アプリ起動カウントをインクリメント
 */
export declare function incrementExternalOpenCount(id: string): {
    externalOpenCount: number;
    lastExternalOpenedAt: number;
};
export declare function getFiles(rootFolderId?: string): MediaFile[];
export declare function findFileByPath(filePath: string): MediaFile | undefined;
export declare function findFileByHash(hash: string): MediaFile | undefined;
export declare function insertFile(fileData: Partial<MediaFile> & {
    name: string;
    path: string;
    root_folder_id: string;
}): MediaFile;
export declare function deleteFile(id: string): void;
export declare function updateFileLocation(id: string, newPath: string, newRootFolderId: string): void;
export declare function updateFileNameAndPath(id: string, newName: string, newPath: string): void;
export declare function updateFileHash(id: string, hash: string): void;
export declare function updateFileMetadata(id: string, metadataJson: string): void;
export declare function updateFileAllPaths(id: string, pathVal: string, thumbPath: string, previewFrames: string): void;
export declare function updateFileNotes(id: string, notes: string): void;
export declare function findFileById(id: string): MediaFile | undefined;
export declare function updateFileThumbnail(id: string, thumbnailPath: string): void;
export declare function updateFilePreviewFrames(id: string, previewFrames: string): void;
export declare function incrementAccessCount(id: string): {
    accessCount: number;
    lastAccessedAt: number;
};
export declare function getFolders(): MediaFolder[];
export declare function getFolderByPath(folderPath: string): MediaFolder | undefined;
export declare function addFolder(folderPath: string, name?: string): MediaFolder;
export declare function deleteFolder(id: string): void;
/**
 * フォルダごとのファイル数を一括取得（Phase 12-4）
 * N+1問題を回避するため、一括取得
 */
export declare function getFolderFileCounts(): Record<string, number>;
/**
 * フォルダごとの代表サムネイルパスを一括取得（Phase 12-4）
 * 各フォルダの最初のファイルのサムネイルを取得
 * N+1問題を回避するため、一括取得
 */
export declare function getFolderThumbnails(): Record<string, string>;
export declare function initDB(): void;
