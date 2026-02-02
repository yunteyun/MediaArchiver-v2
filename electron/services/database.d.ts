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
    type: 'video' | 'image' | 'archive';
    created_at: number;
    duration?: string;
    thumbnail_path?: string;
    preview_frames?: string;
    root_folder_id?: string;
    tags: string[];
    content_hash?: string;
    metadata?: string;
    mtime_ms?: number;
}
export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    created_at: number;
}
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
export declare function updateFileHash(id: string, hash: string): void;
export declare function updateFileMetadata(id: string, metadataJson: string): void;
export declare function updateFileAllPaths(id: string, pathVal: string, thumbPath: string, previewFrames: string): void;
export declare function getFolders(): MediaFolder[];
export declare function getFolderByPath(folderPath: string): MediaFolder | undefined;
export declare function addFolder(folderPath: string, name?: string): MediaFolder;
export declare function deleteFolder(id: string): void;
export declare function initDB(): void;
