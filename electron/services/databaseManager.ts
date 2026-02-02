/**
 * DatabaseManager - プロファイルごとのDB切り替えを管理
 * 
 * - metaDb: プロファイル一覧を管理する共通DB (profiles.db)
 * - db: 現在アクティブなプロファイルのDB (profile_xxx.db)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---
export interface Profile {
    id: string;
    name: string;
    dbFilename: string;
    createdAt: number;
    updatedAt: number;
}

class DatabaseManager {
    private db: Database.Database | null = null;
    private currentProfileId: string | null = null;
    private metaDb: Database.Database;
    private userDataPath: string;

    constructor() {
        this.userDataPath = app.getPath('userData');
        const metaPath = path.join(this.userDataPath, 'profiles.db');
        this.metaDb = new Database(metaPath);
        this.initMetaDb();
    }

    /**
     * メタDB初期化（プロファイル一覧管理用）
     */
    private initMetaDb() {
        this.metaDb.exec(`
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                db_filename TEXT NOT NULL UNIQUE,
                created_at INTEGER,
                updated_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // デフォルトプロファイルが存在しない場合は作成
        const count = (this.metaDb.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }).count;
        if (count === 0) {
            this.createDefaultProfile();
        }
    }

    /**
     * デフォルトプロファイル作成
     */
    private createDefaultProfile() {
        const now = Date.now();
        this.metaDb.prepare(`
            INSERT INTO profiles (id, name, db_filename, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run('default', 'Default', 'media_default.db', now, now);

        this.metaDb.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)
        `).run('active_profile_id', 'default');
    }

    /**
     * メディアDB初期化（プロファイルごと）
     */
    private initMediaDb() {
        if (!this.db) return;

        this.db.exec(`
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

            CREATE TABLE IF NOT EXISTS tag_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT 'gray',
                sort_order INTEGER DEFAULT 0,
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS tag_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT 'gray',
                category_id TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at INTEGER,
                FOREIGN KEY(category_id) REFERENCES tag_categories(id) ON DELETE SET NULL
            );

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

            CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
            CREATE INDEX IF NOT EXISTS idx_files_hash ON files(content_hash);
            CREATE INDEX IF NOT EXISTS idx_tag_definitions_category ON tag_definitions(category_id);
            CREATE INDEX IF NOT EXISTS idx_tag_definitions_name ON tag_definitions(name);
            CREATE INDEX IF NOT EXISTS idx_tag_categories_name ON tag_categories(name);
            CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
            CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
        `);

        // スキーマバージョン初期化
        const versionCheck = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
        if (!versionCheck) {
            this.db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)').run(1, 'Initial v2 schema');
        }
    }

    // === Profile CRUD ===

    /**
     * 全プロファイル取得
     */
    getProfiles(): Profile[] {
        const rows = this.metaDb.prepare('SELECT * FROM profiles ORDER BY created_at ASC').all() as any[];
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            dbFilename: r.db_filename,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    }

    /**
     * 単一プロファイル取得
     */
    getProfile(id: string): Profile | undefined {
        const row = this.metaDb.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as any;
        if (!row) return undefined;
        return {
            id: row.id,
            name: row.name,
            dbFilename: row.db_filename,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * プロファイル作成
     */
    createProfile(name: string): Profile {
        const id = uuidv4();
        const dbFilename = `media_${id}.db`;
        const now = Date.now();

        this.metaDb.prepare(`
            INSERT INTO profiles (id, name, db_filename, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, name, dbFilename, now, now);

        // 新しいDBファイルを作成してスキーマ初期化
        const dbPath = path.join(this.userDataPath, dbFilename);
        const newDb = new Database(dbPath);
        const tempCurrent = this.db;
        this.db = newDb;
        this.initMediaDb();
        newDb.close();
        this.db = tempCurrent;

        return { id, name, dbFilename, createdAt: now, updatedAt: now };
    }

    /**
     * プロファイル更新
     */
    updateProfile(id: string, updates: { name?: string }): void {
        if (id === 'default' && updates.name) {
            // デフォルトプロファイルの名前変更は許可
        }
        const now = Date.now();
        if (updates.name) {
            this.metaDb.prepare('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?')
                .run(updates.name, now, id);
        }
    }

    /**
     * プロファイル削除
     */
    deleteProfile(id: string): boolean {
        if (id === 'default') {
            throw new Error('Cannot delete default profile');
        }

        const profile = this.getProfile(id);
        if (!profile) return false;

        // 現在アクティブなプロファイルなら切り替え
        if (this.currentProfileId === id) {
            this.switchProfile('default');
        }

        // DBファイル削除
        const fs = require('fs');
        const dbPath = path.join(this.userDataPath, profile.dbFilename);
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        // メタDBから削除
        this.metaDb.prepare('DELETE FROM profiles WHERE id = ?').run(id);
        return true;
    }

    // === Profile Switching ===

    /**
     * アクティブプロファイルID取得
     */
    getActiveProfileId(): string {
        const row = this.metaDb.prepare('SELECT value FROM app_settings WHERE key = ?').get('active_profile_id') as { value: string } | undefined;
        return row?.value || 'default';
    }

    /**
     * プロファイル切替
     */
    switchProfile(profileId: string): void {
        if (this.currentProfileId === profileId && this.db) {
            return; // 同じプロファイルなら何もしない
        }

        // 現在のDB接続を閉じる
        if (this.db) {
            this.db.close();
            this.db = null;
        }

        // プロファイル情報取得
        const profile = this.getProfile(profileId);
        if (!profile) {
            throw new Error(`Profile not found: ${profileId}`);
        }

        // 新しいDBに接続
        const dbPath = path.join(this.userDataPath, profile.dbFilename);
        this.db = new Database(dbPath);
        this.initMediaDb();
        this.currentProfileId = profileId;

        // アクティブプロファイルを記録
        this.metaDb.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
            .run('active_profile_id', profileId);
    }

    /**
     * 起動時の初期化（アクティブプロファイルに接続）
     */
    initialize(): void {
        const activeId = this.getActiveProfileId();
        this.switchProfile(activeId);
    }

    // === Database Access ===

    /**
     * 現在のDBインスタンス取得
     */
    getDb(): Database.Database {
        if (!this.db) {
            throw new Error('No active database. Call initialize() or switchProfile() first.');
        }
        return this.db;
    }

    /**
     * メタDBインスタンス取得
     */
    getMetaDb(): Database.Database {
        return this.metaDb;
    }

    /**
     * 現在のプロファイルID取得
     */
    getCurrentProfileId(): string | null {
        return this.currentProfileId;
    }

    /**
     * クリーンアップ
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.metaDb.close();
    }
}

// シングルトンインスタンス
export const dbManager = new DatabaseManager();
