/**
 * Database Operations - メディアファイル/フォルダのCRUD操作
 * 
 * 注意: このファイルは dbManager.getDb() 経由でDBにアクセスします。
 * 必ず dbManager.initialize() が呼ばれた後に使用してください。
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { dbManager } from './databaseManager';
import { logger } from './logger';

const log = logger.scope('Database');

// --- Types (Mirrors src/types/file.ts for usage in Electron) ---
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
}

export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    created_at: number;
}

// --- Helper ---
function getDb() {
    return dbManager.getDb();
}

// --- File Operations ---

export function getFiles(rootFolderId?: string): MediaFile[] {
    const db = getDb();
    let query = 'SELECT * FROM files';
    let params: any[] = [];

    if (rootFolderId) {
        query += ' WHERE root_folder_id = ?';
        params.push(rootFolderId);
    }

    query += ' ORDER BY created_at DESC';

    const files = db.prepare(query).all(...params) as any[];
    return files.map(f => ({
        ...f,
        tags: getTags(f.id)
    }));
}

export function findFileByPath(filePath: string): MediaFile | undefined {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE path = ?').get(filePath) as any;
    if (file) {
        return { ...file, tags: getTags(file.id) };
    }
    return undefined;
}

export function findFileByHash(hash: string): MediaFile | undefined {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE content_hash = ?').get(hash) as any;
    if (file) {
        return { ...file, tags: getTags(file.id) };
    }
    return undefined;
}

export function insertFile(fileData: Partial<MediaFile> & { name: string; path: string; root_folder_id: string }): MediaFile {
    const db = getDb();
    const existing = findFileByPath(fileData.path);
    const now = Date.now();

    if (existing) {
        const stmt = db.prepare(`
            UPDATE files SET
                size = COALESCE(?, size),
                mtime_ms = COALESCE(?, mtime_ms),
                content_hash = COALESCE(?, content_hash),
                duration = COALESCE(?, duration),
                thumbnail_path = COALESCE(?, thumbnail_path),
                preview_frames = COALESCE(?, preview_frames),
                metadata = COALESCE(?, metadata),
                type = COALESCE(?, type)
            WHERE id = ?
        `);

        stmt.run(
            fileData.size,
            fileData.mtime_ms,
            fileData.content_hash,
            fileData.duration,
            fileData.thumbnail_path,
            fileData.preview_frames,
            fileData.metadata,
            fileData.type,
            existing.id
        );

        return { ...existing, ...fileData };
    } else {
        const id = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO files (
                id, name, path, size, type, created_at, 
                duration, thumbnail_path, preview_frames, 
                root_folder_id, content_hash, metadata, mtime_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            fileData.name,
            fileData.path,
            fileData.size,
            fileData.type,
            fileData.created_at || now,
            fileData.duration,
            fileData.thumbnail_path,
            fileData.preview_frames,
            fileData.root_folder_id,
            fileData.content_hash,
            fileData.metadata,
            fileData.mtime_ms
        );

        return {
            id,
            ...fileData,
            created_at: fileData.created_at || now,
            tags: []
        } as MediaFile;
    }
}

export function deleteFile(id: string) {
    const db = getDb();

    // 削除前にサムネイル情報を取得
    const file = db.prepare('SELECT thumbnail_path, preview_frames FROM files WHERE id = ?')
        .get(id) as { thumbnail_path?: string; preview_frames?: string } | undefined;

    if (file) {
        // サムネイル削除
        if (file.thumbnail_path && fs.existsSync(file.thumbnail_path)) {
            try {
                fs.unlinkSync(file.thumbnail_path);
            } catch (e) {
                log.error(`Failed to delete thumbnail: ${file.thumbnail_path}`, e);
            }
        }

        // プレビューフレーム削除
        if (file.preview_frames) {
            try {
                const frames: string[] = JSON.parse(file.preview_frames);
                frames.forEach(framePath => {
                    if (fs.existsSync(framePath)) {
                        try {
                            fs.unlinkSync(framePath);
                        } catch (e) {
                            log.error(`Failed to delete preview frame: ${framePath}`, e);
                        }
                    }
                });
            } catch (e) {
                log.error('Failed to parse/delete preview frames', e);
            }
        }
    }

    // DBレコード削除
    db.prepare('DELETE FROM files WHERE id = ?').run(id);
}

export function updateFileLocation(id: string, newPath: string, newRootFolderId: string) {
    const db = getDb();
    db.prepare('UPDATE files SET path = ?, root_folder_id = ? WHERE id = ?')
        .run(newPath, newRootFolderId, id);
}

export function updateFileHash(id: string, hash: string) {
    const db = getDb();
    db.prepare('UPDATE files SET content_hash = ? WHERE id = ?').run(hash, id);
}

export function updateFileMetadata(id: string, metadataJson: string) {
    const db = getDb();
    db.prepare('UPDATE files SET metadata = ? WHERE id = ?').run(metadataJson, id);
}

export function updateFileAllPaths(id: string, pathVal: string, thumbPath: string, previewFrames: string) {
    const db = getDb();
    db.prepare('UPDATE files SET path = ?, thumbnail_path = ?, preview_frames = ? WHERE id = ?')
        .run(pathVal, thumbPath, previewFrames, id);
}

export function updateFileNotes(id: string, notes: string) {
    const db = getDb();
    db.prepare('UPDATE files SET notes = ? WHERE id = ?').run(notes, id);
}

export function findFileById(id: string): MediaFile | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
        ...row,
        tags: getTags(row.id)
    };
}

export function updateFileThumbnail(id: string, thumbnailPath: string) {
    const db = getDb();
    db.prepare('UPDATE files SET thumbnail_path = ? WHERE id = ?').run(thumbnailPath, id);
}

export function updateFilePreviewFrames(id: string, previewFrames: string) {
    const db = getDb();
    db.prepare('UPDATE files SET preview_frames = ? WHERE id = ?').run(previewFrames, id);
}

function getTags(fileId: string): string[] {
    const db = getDb();
    const rows = db.prepare('SELECT tag FROM tags WHERE file_id = ?').all(fileId) as { tag: string }[];
    return rows.map(r => r.tag);
}

// --- Folder Operations ---

export function getFolders(): MediaFolder[] {
    const db = getDb();
    return db.prepare('SELECT * FROM folders ORDER BY created_at DESC').all() as MediaFolder[];
}

export function getFolderByPath(folderPath: string): MediaFolder | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath) as MediaFolder | undefined;
}

export function addFolder(folderPath: string, name?: string): MediaFolder {
    const db = getDb();
    const existing = getFolderByPath(folderPath);
    if (existing) return existing;

    const id = uuidv4();
    const folderName = name || path.basename(folderPath);
    const now = Date.now();

    db.prepare('INSERT INTO folders (id, path, name, created_at) VALUES (?, ?, ?, ?)')
        .run(id, folderPath, folderName, now);

    return { id, path: folderPath, name: folderName, created_at: now };
}

export function deleteFolder(id: string) {
    const db = getDb();

    // フォルダ内の全ファイルを取得
    const files = getFiles(id);

    // 各ファイルを削除（サムネイルも自動削除される）
    files.forEach(file => {
        deleteFile(file.id);
    });

    // フォルダレコード削除
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

// --- Legacy initDB (no longer needed, kept for compatibility) ---
export function initDB() {
    // Now handled by dbManager.initialize()
    // This function is kept for backward compatibility but does nothing
    console.log('initDB() called - now handled by dbManager.initialize()');
}
