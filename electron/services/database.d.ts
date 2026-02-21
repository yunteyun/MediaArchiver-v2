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
    parent_id: string | null;
    drive: string;
}
/**
 * preview_frames文字列を安全に文字列配列へパースし、
 * CSV形式(カンマ区切り)からのフォールバック時はJSON形式へ正規化(DB更新)する
 * @param previewFramesStr DB上の文字列
 * @param fileId DB正規化(UPDATE)を行うためのファイルID
 */
export declare function parsePreviewFrames(previewFramesStr: string | null | undefined, fileId?: string): string[];
/**
 * Phase 18-A: 外部アプリ起動カウントをインクリメント
 */
export declare function incrementExternalOpenCount(id: string): {
    externalOpenCount: number;
    lastExternalOpenedAt: number;
};
export declare function getFiles(rootFolderId?: string): MediaFile[];
/**
 * Phase 22-C: 複数フォルダのファイルを一括取得
 */
export declare function getFilesByFolderIds(folderIds: string[]): MediaFile[];
export declare function findFileByPath(filePath: string): MediaFile | undefined;
export declare function findFileByHash(hash: string): MediaFile | undefined;
export declare function insertFile(fileData: Partial<MediaFile> & {
    name: string;
    path: string;
    root_folder_id: string;
}): MediaFile;
export declare function deleteFile(id: string): void;
export declare function updateFileLocation(id: string, newPath: string, newRootFolderId: string): void;
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
