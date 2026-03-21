/**
 * Database Operations - メディアファイル/フォルダのCRUD操作
 * 
 * 注意: このファイルは dbManager.getDb() 経由でDBにアクセスします。
 * 必ず dbManager.initialize() が呼ばれた後に使用してください。
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from './activityLogService';
import { dbManager } from './databaseManager';
import { logger } from './logger';
import {
    normalizeExcludedSubdirectories,
    normalizeFolderScanSettings,
    parseFolderScanSettingsJson,
    type FolderScanFileTypeOverrides,
    type FolderScanSettings,
} from '../../src/shared/folderScanSettings';
import { collectExistingFolderTreePaths } from '../../src/shared/folderTreePaths';

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
    thumbnail_locked?: number;
    thumbnailLocked?: boolean;
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
    playbackPositionSeconds?: number | null;
    playbackPositionUpdatedAt?: number | null;
}

export interface PlaybackBookmark {
    id: string;
    file_id: string;
    time_seconds: number;
    created_at: number;
    note?: string | null;
    fileId?: string;
    timeSeconds?: number;
    createdAt?: number;
}

interface FileRow {
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
    content_hash?: string;
    metadata?: string;
    mtime_ms?: number;
    notes?: string;
    is_animated?: number;
    access_count?: number;
    last_accessed_at?: number | null;
    external_open_count?: number;
    last_external_opened_at?: number | null;
    playback_position_seconds?: number | null;
    playback_position_updated_at?: number | null;
    thumbnail_locked?: number;
}

export interface ScannerFileRecord {
    id: string;
    path: string;
    size: number;
    type: 'video' | 'image' | 'archive' | 'audio';
    duration?: string;
    thumbnail_path?: string;
    preview_frames?: string;
    root_folder_id?: string;
    content_hash?: string;
    metadata?: string;
    mtime_ms?: number;
    is_animated?: number;
    thumbnail_locked?: number;
}

export interface MediaFolder {
    id: string;
    name: string;
    path: string;
    created_at: number;
    parent_id: string | null;  // Phase 22-C: 親フォルダID
    drive: string;              // Phase 22-C: ドライブ文字
    auto_scan?: number;         // 起動時スキャン対象
    watch_new_files?: number;   // 起動中の新規/更新検知スキャン
    badge_color?: string | null;
    scan_settings_json?: string | null; // Phase 27: 登録フォルダごとのスキャン設定
    last_scan_at?: number | null;
    last_scan_status?: string | null;
    last_scan_message?: string | null;
}

// --- Helper ---
function getDb() {
    return dbManager.getDb();
}

function parsePreviewFrames(previewFramesRaw?: string): string[] {
    if (!previewFramesRaw) return [];

    const raw = previewFramesRaw.trim();
    if (!raw) return [];

    // Backward/forward compatibility:
    // - legacy: JSON array string
    // - current: comma-separated absolute paths
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
            }
        } catch {
            // fall through to comma-split
        }
    }

    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function serializeFolderScanSettings(settings: FolderScanSettings): string | null {
    const normalizedSettings = normalizeFolderScanSettings(settings);
    const normalizedOverrides = normalizedSettings.fileTypeOverrides
        ? {
            video: typeof normalizedSettings.fileTypeOverrides.video === 'boolean' ? normalizedSettings.fileTypeOverrides.video : undefined,
            image: typeof normalizedSettings.fileTypeOverrides.image === 'boolean' ? normalizedSettings.fileTypeOverrides.image : undefined,
            archive: typeof normalizedSettings.fileTypeOverrides.archive === 'boolean' ? normalizedSettings.fileTypeOverrides.archive : undefined,
            audio: typeof normalizedSettings.fileTypeOverrides.audio === 'boolean' ? normalizedSettings.fileTypeOverrides.audio : undefined,
        }
        : undefined;
    const normalizedExcludedSubdirectories = normalizeExcludedSubdirectories(normalizedSettings.excludedSubdirectories);

    const hasAnyOverride = !!normalizedOverrides && Object.values(normalizedOverrides).some(v => typeof v === 'boolean');
    const hasExcludedSubdirectories = normalizedExcludedSubdirectories.length > 0;
    if (!hasAnyOverride && !hasExcludedSubdirectories) return null;

    return JSON.stringify({
        ...(hasAnyOverride ? { fileTypeOverrides: normalizedOverrides } : {}),
        ...(hasExcludedSubdirectories ? { excludedSubdirectories: normalizedExcludedSubdirectories } : {}),
    });
}

// snake_case DB row → camelCase MediaFile 変換ヘルパー
function mapRow(f: FileRow): MediaFile {
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
        thumbnail_locked: f.thumbnail_locked,
        // Phase 15-2: フロントエンド用 camelCase フィールド
        isAnimated: f.is_animated === 1,
        thumbnailPath: f.thumbnail_path,
        thumbnailLocked: f.thumbnail_locked === 1,
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
        playbackPositionSeconds: typeof f.playback_position_seconds === 'number' ? f.playback_position_seconds : null,
        playbackPositionUpdatedAt: typeof f.playback_position_updated_at === 'number' ? f.playback_position_updated_at : null,
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
    const params: string[] = [];

    if (rootFolderId) {
        query += ' WHERE root_folder_id = ?';
        params.push(rootFolderId);
    }

    query += ' ORDER BY created_at DESC';

    const files = db.prepare(query).all(...params) as FileRow[];

    return files.map(f => ({
        ...mapRow(f),
        tags: getTags(f.id)
    }));
}

function normalizeDirPathForMatch(dirPath: string): string {
    return dirPath.replace(/[\\/]+$/, '');
}

export function getFilesByFolderPathDirect(folderPath: string): MediaFile[] {
    const normalized = normalizeDirPathForMatch(folderPath);
    return getFiles().filter((f) => normalizeDirPathForMatch(path.dirname(f.path)) === normalized);
}

export function getFilesByFolderPathRecursive(folderPath: string): MediaFile[] {
    const normalized = normalizeDirPathForMatch(folderPath);
    const normalizedLower = normalized.toLowerCase();
    const prefixLower = `${normalized}\\`.toLowerCase();
    return getFiles().filter((f) => {
        const fileDirLower = normalizeDirPathForMatch(path.dirname(f.path)).toLowerCase();
        const filePathLower = f.path.toLowerCase();
        return fileDirLower === normalizedLower || filePathLower.startsWith(prefixLower);
    });
}

/**
 * Phase 22-C: 複数フォルダのファイルを一括取得
 */
export function getFilesByFolderIds(folderIds: string[]): MediaFile[] {
    if (folderIds.length === 0) return [];

    const db = getDb();
    const placeholders = folderIds.map(() => '?').join(',');
    const query = `SELECT * FROM files WHERE root_folder_id IN (${placeholders}) ORDER BY created_at DESC`;
    const files = db.prepare(query).all(...folderIds) as FileRow[];

    return files.map(f => ({
        ...mapRow(f),
        tags: getTags(f.id)
    }));
}


export function findFileByPath(filePath: string): MediaFile | undefined {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE path = ?').get(filePath) as FileRow | undefined;
    if (file) {
        return { ...mapRow(file), tags: getTags(file.id) };
    }
    return undefined;
}

export function findFileScanRecordByPath(filePath: string): ScannerFileRecord | undefined {
    const db = getDb();
    const row = db.prepare(`
        SELECT id, path, size, type, duration, thumbnail_path, preview_frames, root_folder_id, content_hash, metadata, mtime_ms, is_animated
             , thumbnail_locked
        FROM files
        WHERE path = ?
    `).get(filePath) as ScannerFileRecord | undefined;
    if (!row) return undefined;
    return {
        id: row.id,
        path: row.path,
        size: row.size,
        type: row.type,
        duration: row.duration,
        thumbnail_path: row.thumbnail_path,
        preview_frames: row.preview_frames,
        root_folder_id: row.root_folder_id,
        content_hash: row.content_hash,
        metadata: row.metadata,
        mtime_ms: row.mtime_ms,
        is_animated: row.is_animated,
        thumbnail_locked: row.thumbnail_locked,
    };
}

export function findFileByHash(hash: string): MediaFile | undefined {
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE content_hash = ?').get(hash) as FileRow | undefined;
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
                is_animated = COALESCE(?, is_animated),
                thumbnail_locked = COALESCE(?, thumbnail_locked)
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
            fileData.thumbnail_locked,
            existing.id
        );

        return { ...existing, ...fileData };
    } else {
        const id = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO files (
                id, name, path, size, type, created_at, 
                duration, thumbnail_path, preview_frames, 
                root_folder_id, content_hash, metadata, mtime_ms, is_animated, thumbnail_locked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            fileData.is_animated,
            fileData.thumbnail_locked ?? 0
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
            try {
                const frames = parsePreviewFrames(file.preview_frames);
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

    db.prepare('DELETE FROM playback_bookmarks WHERE file_id = ?').run(id);

    // DBレコード削除
    db.prepare('DELETE FROM files WHERE id = ?').run(id);

    // アクティビティログ記録（Fire-and-Forget）
    if (file) {
        void logActivity('file_delete', undefined, file.name, {
            path: file.path,
            size: file.size,
            type: file.type
        }).catch(e => log.warn('Activity log failed:', e.message));
    }
}

export function updateFileLocation(id: string, newPath: string, newRootFolderId: string) {
    const db = getDb();
    db.prepare('UPDATE files SET path = ?, root_folder_id = ? WHERE id = ?')
        .run(newPath, newRootFolderId, id);
}

export function upsertFileRecord(
    fileData: Partial<MediaFile> & { name: string; path: string; root_folder_id: string },
    existingId?: string
): void {
    const db = getDb();
    const now = Date.now();

    if (existingId) {
        db.prepare(`
            UPDATE files SET
                size = COALESCE(?, size),
                mtime_ms = COALESCE(?, mtime_ms),
                content_hash = COALESCE(?, content_hash),
                duration = COALESCE(?, duration),
                thumbnail_path = COALESCE(?, thumbnail_path),
                preview_frames = COALESCE(?, preview_frames),
                metadata = COALESCE(?, metadata),
                type = COALESCE(?, type),
                is_animated = COALESCE(?, is_animated),
                thumbnail_locked = COALESCE(?, thumbnail_locked)
            WHERE id = ?
        `).run(
            fileData.size,
            fileData.mtime_ms,
            fileData.content_hash,
            fileData.duration,
            fileData.thumbnail_path,
            fileData.preview_frames,
            fileData.metadata,
            fileData.type,
            fileData.is_animated,
            fileData.thumbnail_locked,
            existingId
        );
        return;
    }

    db.prepare(`
        INSERT INTO files (
            id, name, path, size, type, created_at,
            duration, thumbnail_path, preview_frames,
            root_folder_id, content_hash, metadata, mtime_ms, is_animated, thumbnail_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
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
        fileData.is_animated,
        fileData.thumbnail_locked ?? 0
    );
}

export function updateFileNameAndPath(id: string, newName: string, newPath: string) {
    const db = getDb();
    db.prepare('UPDATE files SET name = ?, path = ? WHERE id = ?')
        .run(newName, newPath, id);
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

export function updateFilePlaybackPosition(id: string, playbackPositionSeconds: number | null): {
    playbackPositionSeconds: number | null;
    playbackPositionUpdatedAt: number | null;
} {
    const db = getDb();

    if (typeof playbackPositionSeconds === 'number' && Number.isFinite(playbackPositionSeconds)) {
        const normalizedSeconds = Math.max(0, Math.round(playbackPositionSeconds * 10) / 10);
        const updatedAt = Date.now();
        db.prepare(`
            UPDATE files
            SET playback_position_seconds = ?,
                playback_position_updated_at = ?
            WHERE id = ?
        `).run(normalizedSeconds, updatedAt, id);
        return {
            playbackPositionSeconds: normalizedSeconds,
            playbackPositionUpdatedAt: updatedAt,
        };
    }

    db.prepare(`
        UPDATE files
        SET playback_position_seconds = NULL,
            playback_position_updated_at = NULL
        WHERE id = ?
    `).run(id);

    return {
        playbackPositionSeconds: null,
        playbackPositionUpdatedAt: null,
    };
}

function mapPlaybackBookmarkRow(row: PlaybackBookmark): PlaybackBookmark {
    return {
        id: row.id,
        file_id: row.file_id,
        time_seconds: row.time_seconds,
        created_at: row.created_at,
        note: typeof row.note === 'string' && row.note.trim().length > 0 ? row.note.trim() : null,
        fileId: row.file_id,
        timeSeconds: row.time_seconds,
        createdAt: row.created_at,
    };
}

export function getPlaybackBookmarks(fileId: string): PlaybackBookmark[] {
    const db = getDb();
    const rows = db.prepare(`
        SELECT id, file_id, time_seconds, created_at, note
        FROM playback_bookmarks
        WHERE file_id = ?
        ORDER BY time_seconds ASC, created_at ASC
    `).all(fileId) as PlaybackBookmark[];

    return rows.map((row) => mapPlaybackBookmarkRow(row));
}

export function createPlaybackBookmark(fileId: string, timeSeconds: number, note?: string | null): PlaybackBookmark {
    const db = getDb();
    const normalizedSeconds = Math.max(0, Math.round(timeSeconds * 10) / 10);
    const normalizedNote = typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 80) : null;
    const existing = db.prepare(`
        SELECT id, file_id, time_seconds, created_at, note
        FROM playback_bookmarks
        WHERE file_id = ? AND time_seconds = ?
        LIMIT 1
    `).get(fileId, normalizedSeconds) as PlaybackBookmark | undefined;

    if (existing) {
        if (normalizedNote !== (existing.note ?? null)) {
            db.prepare(`
                UPDATE playback_bookmarks
                SET note = ?
                WHERE id = ?
            `).run(normalizedNote, existing.id);

            return mapPlaybackBookmarkRow({
                ...existing,
                note: normalizedNote,
            });
        }

        return mapPlaybackBookmarkRow(existing);
    }

    const bookmark: PlaybackBookmark = {
        id: uuidv4(),
        file_id: fileId,
        time_seconds: normalizedSeconds,
        created_at: Date.now(),
        note: normalizedNote,
    };

    db.prepare(`
        INSERT INTO playback_bookmarks (id, file_id, time_seconds, created_at, note)
        VALUES (?, ?, ?, ?, ?)
    `).run(bookmark.id, bookmark.file_id, bookmark.time_seconds, bookmark.created_at, bookmark.note ?? null);

    return mapPlaybackBookmarkRow(bookmark);
}

export function deletePlaybackBookmark(bookmarkId: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM playback_bookmarks WHERE id = ?').run(bookmarkId);
    return result.changes > 0;
}

export function updatePlaybackBookmarkNote(bookmarkId: string, note?: string | null): PlaybackBookmark | null {
    const db = getDb();
    const normalizedNote = typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 80) : null;
    const existing = db.prepare(`
        SELECT id, file_id, time_seconds, created_at, note
        FROM playback_bookmarks
        WHERE id = ?
        LIMIT 1
    `).get(bookmarkId) as PlaybackBookmark | undefined;

    if (!existing) {
        return null;
    }

    db.prepare(`
        UPDATE playback_bookmarks
        SET note = ?
        WHERE id = ?
    `).run(normalizedNote, bookmarkId);

    return mapPlaybackBookmarkRow({
        ...existing,
        note: normalizedNote,
    });
}

export function findFileById(id: string): MediaFile | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRow | undefined;
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

export function updateFileThumbnailState(id: string, thumbnailPath: string, locked: boolean) {
    const db = getDb();
    db.prepare(`
        UPDATE files
        SET thumbnail_path = ?,
            thumbnail_locked = ?
        WHERE id = ?
    `).run(thumbnailPath, locked ? 1 : 0, id);
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

export function getTagIdsByFileId(fileId: string): string[] {
    return getTags(fileId);
}

// --- Folder Operations ---

export function getFolders(): MediaFolder[] {
    const db = getDb();
    return db.prepare('SELECT * FROM folders ORDER BY created_at DESC').all() as MediaFolder[];
}

export function getFolderTreePaths(options?: { includeDiskPaths?: boolean }): string[] {
    const includeDiskPaths = options?.includeDiskPaths === true;
    const folders = getFolders();
    const registeredPaths = new Set(folders.map((f) => normalizeDirPathForMatch(f.path)));
    const allPaths = new Set<string>(registeredPaths);
    const rootById = new Map(folders.map((f) => [f.id, normalizeDirPathForMatch(f.path)] as const));

    if (includeDiskPaths) {
        for (const existingPath of collectExistingFolderTreePaths(folders.map((folder) => folder.path))) {
            allPaths.add(normalizeDirPathForMatch(existingPath));
        }
    }

    const files = getFiles();
    for (const file of files) {
        const rootPath = file.root_folder_id ? rootById.get(file.root_folder_id) : undefined;
        let current = normalizeDirPathForMatch(path.dirname(file.path));

        while (current && current !== '.' && current !== path.dirname(current)) {
            allPaths.add(current);
            if (rootPath && current.toLowerCase() === rootPath.toLowerCase()) {
                break;
            }
            current = normalizeDirPathForMatch(path.dirname(current));
        }
    }

    return [...allPaths];
}

export function getFolderTreeRecursiveCountsByPath(): Record<string, number> {
    const result: Record<string, number> = {};
    const files = getFiles();

    for (const file of files) {
        let current = normalizeDirPathForMatch(path.dirname(file.path));
        while (current && current !== '.' && current !== path.dirname(current)) {
            const key = current.toLowerCase();
            result[key] = (result[key] || 0) + 1;
            current = normalizeDirPathForMatch(path.dirname(current));
        }
        if (current && current !== '.' ) {
            const key = current.toLowerCase();
            result[key] = (result[key] || 0) + 1;
        }
    }

    return result;
}

export function getFolderByPath(folderPath: string): MediaFolder | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath) as MediaFolder | undefined;
}

export function getFolderById(folderId: string): MediaFolder | undefined {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId) as MediaFolder | undefined;
}

export function getFileCleanupCandidatesByRootFolderId(rootFolderId: string): Array<{
    id: string;
    path: string;
    type: 'video' | 'image' | 'archive' | 'audio';
}> {
    const db = getDb();
    return db.prepare(`
        SELECT id, path, type
        FROM files
        WHERE root_folder_id = ?
    `).all(rootFolderId) as Array<{
        id: string;
        path: string;
        type: 'video' | 'image' | 'archive' | 'audio';
    }>;
}

export function getFolderScanSettings(folderId: string): FolderScanSettings {
    const folder = getFolderById(folderId);
    return parseFolderScanSettingsJson(folder?.scan_settings_json);
}

export function setFolderScanFileTypeOverride(
    folderId: string,
    category: keyof FolderScanFileTypeOverrides,
    value: boolean | null
): FolderScanSettings {
    const db = getDb();
    const current = getFolderScanSettings(folderId);
    const nextOverrides: FolderScanFileTypeOverrides = { ...(current.fileTypeOverrides || {}) };

    if (value === null) {
        delete nextOverrides[category];
    } else {
        nextOverrides[category] = value;
    }

    const nextSettings: FolderScanSettings = {
        fileTypeOverrides: nextOverrides
    };
    const serialized = serializeFolderScanSettings(nextSettings);
    db.prepare('UPDATE folders SET scan_settings_json = ? WHERE id = ?').run(serialized, folderId);
    return parseFolderScanSettingsJson(serialized);
}

export function clearFolderScanFileTypeOverrides(folderId: string): FolderScanSettings {
    const db = getDb();
    const current = getFolderScanSettings(folderId);
    const serialized = serializeFolderScanSettings({
        excludedSubdirectories: current.excludedSubdirectories,
    });
    db.prepare('UPDATE folders SET scan_settings_json = ? WHERE id = ?').run(serialized, folderId);
    return parseFolderScanSettingsJson(serialized);
}

export function setFolderExcludedSubdirectories(
    folderId: string,
    excludedSubdirectories: string[]
): FolderScanSettings {
    const db = getDb();
    const current = getFolderScanSettings(folderId);
    const nextSettings: FolderScanSettings = {
        ...current,
        excludedSubdirectories: normalizeExcludedSubdirectories(excludedSubdirectories),
    };
    const serialized = serializeFolderScanSettings(nextSettings);
    db.prepare('UPDATE folders SET scan_settings_json = ? WHERE id = ?').run(serialized, folderId);
    return parseFolderScanSettingsJson(serialized);
}

export function clearFolderScanSettings(folderId: string): void {
    const db = getDb();
    db.prepare('UPDATE folders SET scan_settings_json = NULL WHERE id = ?').run(folderId);
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

    return {
        id,
        path: folderPath,
        name: folderName,
        created_at: now,
        parent_id,
        drive,
        auto_scan: 0,
        watch_new_files: 0,
        scan_settings_json: null
    };
}

export function setFolderAutoScanEnabled(folderId: string, enabled: boolean): void {
    const db = getDb();
    db.prepare('UPDATE folders SET auto_scan = ? WHERE id = ?').run(enabled ? 1 : 0, folderId);
}

export function setFolderWatchNewFilesEnabled(folderId: string, enabled: boolean): void {
    const db = getDb();
    db.prepare('UPDATE folders SET watch_new_files = ? WHERE id = ?').run(enabled ? 1 : 0, folderId);
}

export function setFolderBadgeColor(folderId: string, color: string | null): void {
    const db = getDb();
    const normalizedColor = typeof color === 'string' && color.trim().length > 0
        ? color.trim().toLowerCase()
        : null;
    db.prepare('UPDATE folders SET badge_color = ? WHERE id = ?').run(normalizedColor, folderId);
}

export function getAutoScanFolders(): MediaFolder[] {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE COALESCE(auto_scan, 0) = 1 ORDER BY created_at DESC').all() as MediaFolder[];
}

export function getWatchNewFilesFolders(): MediaFolder[] {
    const db = getDb();
    return db.prepare('SELECT * FROM folders WHERE COALESCE(watch_new_files, 0) = 1 ORDER BY created_at DESC').all() as MediaFolder[];
}

export function updateFolderLastScanStatus(
    folderId: string,
    params: {
        at: number;
        status: 'running' | 'success' | 'error' | 'cancelled';
        message?: string | null;
    }
): void {
    const db = getDb();
    db.prepare(`
        UPDATE folders
        SET last_scan_at = ?,
            last_scan_status = ?,
            last_scan_message = ?
        WHERE id = ?
    `).run(params.at, params.status, params.message ?? null, folderId);
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

    // created_at順に候補を列挙し、実在するサムネイルを各フォルダで最初に採用する。
    // 保存先移行や再生成の途中で古い thumbnail_path が残っていても、
    // 同フォルダ内に有効なサムネイルがあればフォルダカード表示を復旧しやすくする。
    const rows = db.prepare(`
        SELECT
            root_folder_id,
            thumbnail_path
        FROM files
        WHERE root_folder_id IS NOT NULL
          AND thumbnail_path IS NOT NULL
        ORDER BY root_folder_id ASC, created_at ASC, id ASC
    `).all() as { root_folder_id: string; thumbnail_path: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        if (result[row.root_folder_id]) {
            continue;
        }
        if (!row.thumbnail_path) {
            continue;
        }
        if (fs.existsSync(row.thumbnail_path)) {
            result[row.root_folder_id] = row.thumbnail_path;
        }
    }
    return result;
}

// --- Legacy initDB (no longer needed, kept for compatibility) ---
export function initDB() {
    // Now handled by dbManager.initialize()
    // This function is kept for backward compatibility but does nothing
    console.log('initDB() called - now handled by dbManager.initialize()');
}
