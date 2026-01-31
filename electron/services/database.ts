import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

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

    CREATE TABLE IF NOT EXISTS tags (
      file_id TEXT,
      tag TEXT,
      PRIMARY KEY (file_id, tag),
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
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

function getTags(fileId: string): string[] {
    const rows = db.prepare('SELECT tag FROM tags WHERE file_id = ?').all(fileId) as { tag: string }[];
    return rows.map(r => r.tag);
}

// export function insertFile... (実装が必要になったら追加)
