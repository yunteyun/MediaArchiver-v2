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
    is_animated?: number; // SQLiteはbooleanをINTEGERとして保存 (0 or 1)
    // Phase 15-2: フロントエンド用 camelCase エイリアス
    isAnimated?: boolean;
    thumbnailPath?: string;
    previewFrames?: string;
    rootFolderId?: string;
    contentHash?: string;
    createdAt?: number;
    mtimeMs?: number;
    // Phase 17: アクセストラッキング
    accessCount?: number;
    lastAccessedAt?: number | null;
    // Phase 18-A: 外部アプリ起動トラッキング
    externalOpenCount?: number;
    lastExternalOpenedAt?: number | null;
}

export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    created_at: number;
    parent_id: string | null;  // Phase 22-C: 親フォルダID
    drive: string;              // Phase 22-C: ドライブ文字
}

// --- Helper ---
function getDb() {
    return dbManager.getDb();
}

/**
 * preview_frames文字列を安全に文字列配列へパースし、
 * CSV形式(カンマ区切り)からのフォールバック時はJSON形式へ正規化(DB更新)する
 * @param previewFramesStr DB上の文字列
 * @param fileId DB正規化(UPDATE)を行うためのファイルID
 */
export function parsePreviewFrames(previewFramesStr: string | null | undefined, fileId?: string): string[] {
    if (!previewFramesStr) return [];

    try {
        const parsed = JSON.parse(previewFramesStr);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch (e) {
        // CSV フォールバック
        const frames = previewFramesStr.split(',').filter(f => f.trim().length > 0);
        if (frames.length > 0 && fileId) {
            log.info(`Normalizing preview_frames to JSON for file: ${fileId}`);
            try {
                // DB内データを将来的に完全JSONに収束させるため正規化
                updateFilePreviewFrames(fileId, JSON.stringify(frames));
            } catch (updateErr) {
                log.warn(`Failed to normalize preview_frames for file ${fileId}`, updateErr);
            }
        }
        return frames;
    }
}

// snake_case DB row → camelCase MediaFile 変換ヘルパー
function mapRow(f: any): MediaFile {
    return {
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        type: f.type,
        created_at: f.created_at,
        duration: f.duration,
        thumbnail_path: f.thumbnail_path,
        preview_frames: f.preview_frames,
        root_folder_id: f.root_folder_id,
        content_hash: f.content_hash,
        metadata: f.metadata,
        mtime_ms: f.mtime_ms,
        notes: f.notes,
        is_animated: f.is_animated,
        // Phase 15-2: フロントエンド用 camelCase フィールド
        isAnimated: f.is_animated === 1,
        thumbnailPath: f.thumbnail_path,
        previewFrames: f.preview_frames,
        rootFolderId: f.root_folder_id,
        contentHash: f.content_hash,
        createdAt: f.created_at,
        mtimeMs: f.mtime_ms,
        // Phase 17: アクセストラッキング
        accessCount: f.access_count || 0,
        lastAccessedAt: f.last_accessed_at || null,
        // Phase 18-A: 外部アプリ起動トラッキング
        externalOpenCount: f.external_open_count || 0,
        lastExternalOpenedAt: f.last_external_opened_at || null,
        tags: [],
    };
}

/**
 * Phase 18-A: 外部アプリ起動カウントをインクリメント
 */
export function incrementExternalOpenCount(id: string): { externalOpenCount: number; lastExternalOpenedAt: number } {
    const db = getDb();
    const now = Date.now();
    db.prepare(`
        UPDATE files
        SET external_open_count = external_open_count + 1,
            last_external_opened_at = ?
        WHERE id = ?
    `).run(now, id);

    const result = db.prepare('SELECT external_open_count FROM files WHERE id = ?').get(id) as { external_open_count: number } | undefined;
    return {
        externalOpenCount: result?.external_open_count || 0,
        lastExternalOpenedAt: now,
    };
}

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
        ...mapRow(f),
        tags: getTags(f.id)
    }));
}

/**
 * Phase 22-C: 複数フォルダのファイルを一括取得
 */
export function getFilesByFolderIds(folderIds: string[]): MediaFile[] {
    if (folderIds.length === 0) return [];

    const db = getDb();
    const placeholders = folderIds.map(() => '?').join(',');
    const query = `SELECT * FROM files WHERE root_folder_id IN (${placeholders}) ORDER BY created_at DESC`;
    const files = db.prepare(query).all(...folderIds) as any[];

    return files.map(f => ({
        ...mapRow(f),
        tags: getTags(f.id)
    }));
}


export function findFileByPath(filePath: string): MediaFile | undefined {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE path = ?').get(filePath) as any;
    if (file) {
        return { ...mapRow(file), tags: getTags(file.id) };
    }
    return undefined;
}

export function findFileByHash(hash: string): MediaFile | undefined {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE content_hash = ?').get(hash) as any;
    if (file) {
        return { ...mapRow(file), tags: getTags(file.id) };
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
                type = COALESCE(?, type),
                is_animated = COALESCE(?, is_animated)
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
            fileData.is_animated,
            existing.id
        );

        return { ...existing, ...fileData };
    } else {
        const id = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO files (
                id, name, path, size, type, created_at, 
                duration, thumbnail_path, preview_frames, 
                root_folder_id, content_hash, metadata, mtime_ms, is_animated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            fileData.mtime_ms,
            fileData.is_animated
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

    // 削除前にサムネイル情報とファイル名を取得
    const file = db.prepare('SELECT name, path, size, type, thumbnail_path, preview_frames FROM files WHERE id = ?')
        .get(id) as { name: string; path: string; size: number; type: string; thumbnail_path?: string; preview_frames?: string } | undefined;

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
            // パースおよび必要に応じた正規化を実行する
            const frames = parsePreviewFrames(file.preview_frames, id);

            frames.forEach(framePath => {
                if (fs.existsSync(framePath)) {
                    try {
                        fs.unlinkSync(framePath);
                    } catch (e) {
                        log.error(`Failed to delete preview frame: ${framePath}`, e);
                    }
                }
            });
        }
    }

    // DBレコード削除
    db.prepare('DELETE FROM files WHERE id = ?').run(id);

    // アクティビティログ記録（Fire-and-Forget）
    if (file) {
        import('./activityLogService').then(({ logActivity }) => {
            logActivity('file_delete', undefined, file.name, {
                path: file.path,
                size: file.size,
                type: file.type
            }).catch(e => log.warn('Activity log failed:', e.message));
        });
    }
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
        ...mapRow(row),
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

// Phase 17: アクセス回数をインクリメント
export function incrementAccessCount(id: string): { accessCount: number; lastAccessedAt: number } {
    const db = getDb();
    const now = Date.now();

    db.prepare(`
        UPDATE files 
        SET access_count = access_count + 1,
            last_accessed_at = ?
        WHERE id = ?
    `).run(now, id);

    // 更新後の値を返す
    const result = db.prepare(`
        SELECT access_count, last_accessed_at 
        FROM files 
        WHERE id = ?
    `).get(id) as { access_count: number; last_accessed_at: number } | undefined;

    return {
        accessCount: result?.access_count || 0,
        lastAccessedAt: result?.last_accessed_at || now
    };
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

    // Phase 22-C: drive抽出
    const drive = folderPath.match(/^[A-Z]:/i) ? folderPath.substring(0, 2).toUpperCase() : '/';

    // Phase 22-C: parent_id算出（pathベース）
    const parentPath = path.dirname(folderPath);
    const parent = parentPath && parentPath !== folderPath ? getFolderByPath(parentPath) : null;
    const parent_id = parent ? parent.id : null;

    db.prepare('INSERT INTO folders (id, path, name, created_at, parent_id, drive) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, folderPath, folderName, now, parent_id, drive);

    return { id, path: folderPath, name: folderName, created_at: now, parent_id, drive };
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

/**
 * フォルダごとのファイル数を一括取得（Phase 12-4）
 * N+1問題を回避するため、一括取得
 */
export function getFolderFileCounts(): Record<string, number> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT root_folder_id, COUNT(*) as count
        FROM files
        WHERE root_folder_id IS NOT NULL
        GROUP BY root_folder_id
    `).all() as { root_folder_id: string; count: number }[];

    const result: Record<string, number> = {};
    for (const row of rows) {
        result[row.root_folder_id] = row.count;
    }
    return result;
}

/**
 * フォルダごとの代表サムネイルパスを一括取得（Phase 12-4）
 * 各フォルダの最初のファイルのサムネイルを取得
 * N+1問題を回避するため、一括取得
 */
export function getFolderThumbnails(): Record<string, string> {
    const db = getDb();

    // 各フォルダの最初のファイル（created_atが最小）のサムネイルを取得
    const rows = db.prepare(`
        SELECT 
            f1.root_folder_id,
            f1.thumbnail_path
        FROM files f1
        INNER JOIN (
            SELECT root_folder_id, MIN(created_at) as min_created
            FROM files
            WHERE root_folder_id IS NOT NULL
              AND thumbnail_path IS NOT NULL
            GROUP BY root_folder_id
        ) f2 ON f1.root_folder_id = f2.root_folder_id 
            AND f1.created_at = f2.min_created
        WHERE f1.thumbnail_path IS NOT NULL
    `).all() as { root_folder_id: string; thumbnail_path: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.root_folder_id] = row.thumbnail_path;
    }
    return result;
}

// --- Legacy initDB (no longer needed, kept for compatibility) ---
export function initDB() {
    // Now handled by dbManager.initialize()
    // This function is kept for backward compatibility but does nothing
    console.log('initDB() called - now handled by dbManager.initialize()');
}
