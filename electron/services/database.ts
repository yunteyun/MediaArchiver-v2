import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(app.getPath('userData'), 'media.db');
const db = new Database(dbPath);
// db.pragma('journal_mode = WAL'); // Enhance performance

// --- Types (Mirrors src/types/file.ts for usage in Electron) ---
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

// --- Database Initialization ---

export function initDB() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      size INTEGER,
      type TEXT CHECK(type IN ('video', 'image', 'archive')),
      created_at INTEGER,
      duration TEXT,
      thumbnail_path TEXT,
      preview_frames TEXT,
      root_folder_id TEXT,
      content_hash TEXT,
      metadata TEXT,
      mtime_ms INTEGER DEFAULT 0
    );

    -- Legacy tags table (file_id, tag string) - kept for backward compatibility
    CREATE TABLE IF NOT EXISTS tags (
      file_id TEXT,
      tag TEXT,
      PRIMARY KEY (file_id, tag),
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    -- New: Tag Categories
    CREATE TABLE IF NOT EXISTS tag_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT 'gray',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER
    );

    -- New: Tag Definitions (master table)
    CREATE TABLE IF NOT EXISTS tag_definitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT 'gray',
      category_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER,
      FOREIGN KEY(category_id) REFERENCES tag_categories(id) ON DELETE SET NULL
    );

    -- New: File-Tag relationship (normalized)
    CREATE TABLE IF NOT EXISTS file_tags (
      file_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      added_at INTEGER,
      PRIMARY KEY (file_id, tag_id),
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tag_definitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER,
      auto_scan INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      watched_folder_ids TEXT DEFAULT '[]',
      tag_categories TEXT DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
    CREATE INDEX IF NOT EXISTS idx_files_hash ON files(content_hash);
    CREATE INDEX IF NOT EXISTS idx_tag_definitions_category ON tag_definitions(category_id);
    CREATE INDEX IF NOT EXISTS idx_tag_definitions_name ON tag_definitions(name);
    CREATE INDEX IF NOT EXISTS idx_tag_categories_name ON tag_categories(name);
    CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
  `);

    // Initialize schema version if not set
    const versionCheck = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    if (!versionCheck) {
        db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)').run(1, 'Initial v2 schema');
    }

    // Create default profile if none exists
    const profileCount = (db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }).count;
    if (profileCount === 0) {
        initDefaultProfile();
    }
}

function initDefaultProfile() {
    const defaultTagCategories = JSON.stringify([
        {
            id: 'cat_genre',
            name: 'ジャンル',
            color: 'blue',
            tags: [
                { id: 'tag_anime', name: 'アニメ' },
                { id: 'tag_game', name: 'ゲーム' },
                { id: 'tag_live', name: '実写' },
                { id: 'tag_landscape', name: '風景' },
                { id: 'tag_illust', name: 'イラスト' }
            ]
        },
        {
            id: 'cat_rating',
            name: '評価',
            color: 'amber',
            tags: [
                { id: 'tag_star5', name: '★5(最高)' },
                { id: 'tag_star4', name: '★4(良)' },
                { id: 'tag_star3', name: '★3(普通)' },
                { id: 'tag_important', name: '重要' }
            ]
        },
        {
            id: 'cat_status',
            name: '状態',
            color: 'emerald',
            tags: [
                { id: 'tag_unchecked', name: '未チェック' },
                { id: 'tag_checked', name: '確認済' },
                { id: 'tag_pending', name: '編集待ち' }
            ]
        },
    ]);
    const now = Date.now();
    db.prepare('INSERT INTO profiles (id, name, watched_folder_ids, tag_categories, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run('default', 'Default', '[]', defaultTagCategories, now, now);

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run('active_profile_id', 'default');
}

// --- File Operations ---

// ... (existing helper functions if any)

// --- File Operations ---

export function getFiles(rootFolderId?: string): MediaFile[] {
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
    // スキャン時のパス照合はケース依存しない方が安全だが、システムによる
    // Windows環境なのでnocase比較が良いが、とりあえずexact matchで検索
    // v1では特になし。
    const file = db.prepare('SELECT * FROM files WHERE path = ?').get(filePath) as any;
    if (file) {
        return { ...file, tags: getTags(file.id) };
    }
    return undefined;
}

export function findFileByHash(hash: string): MediaFile | undefined {
    const file = db.prepare('SELECT * FROM files WHERE content_hash = ?').get(hash) as any;
    if (file) {
        return { ...file, tags: getTags(file.id) };
    }
    return undefined;
}

export function insertFile(fileData: Partial<MediaFile> & { name: string; path: string; root_folder_id: string }): MediaFile {
    const existing = findFileByPath(fileData.path);
    const now = Date.now();

    if (existing) {
        // Update existing
        // updateFileLocation等で移動扱いの場合はIDが変わる実装もあったが、
        // ここでは単純なメタデータ更新とする（ハッシュ変更なしの場合）
        // スキャナーロジックでハッシュ比較等は行われる

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
        // Insert new
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
    db.prepare('DELETE FROM files WHERE id = ?').run(id);
}

export function updateFileLocation(id: string, newPath: string, newRootFolderId: string) {
    db.prepare('UPDATE files SET path = ?, root_folder_id = ? WHERE id = ?')
        .run(newPath, newRootFolderId, id);
}

export function updateFileHash(id: string, hash: string) {
    db.prepare('UPDATE files SET content_hash = ? WHERE id = ?').run(hash, id);
}

export function updateFileMetadata(id: string, metadataJson: string) {
    db.prepare('UPDATE files SET metadata = ? WHERE id = ?').run(metadataJson, id);
}

export function updateFileAllPaths(id: string, pathVal: string, thumbPath: string, previewFrames: string) {
    db.prepare('UPDATE files SET path = ?, thumbnail_path = ?, preview_frames = ? WHERE id = ?')
        .run(pathVal, thumbPath, previewFrames, id);
}


function getTags(fileId: string): string[] {
    const rows = db.prepare('SELECT tag FROM tags WHERE file_id = ?').all(fileId) as { tag: string }[];
    return rows.map(r => r.tag);
}

// --- Folder Operations ---

export function getFolders(): MediaFolder[] {
    return db.prepare('SELECT * FROM folders ORDER BY created_at DESC').all() as MediaFolder[];
}

export function getFolderByPath(folderPath: string): MediaFolder | undefined {
    return db.prepare('SELECT * FROM folders WHERE path = ?').get(folderPath) as MediaFolder | undefined;
}

export function addFolder(folderPath: string, name?: string): MediaFolder {
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
    // Cascade delete files (though we might want to keep them if they are just unlinked? No, usually delete files record too)
    // Manually delete files or rely on application logic?
    // Let's delete files associated with this root folder
    db.prepare('DELETE FROM files WHERE root_folder_id = ?').run(id);
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

