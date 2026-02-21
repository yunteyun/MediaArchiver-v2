/**
 * DatabaseManager - プロファイルごとのDB切り替えを管理
 * 
 * - metaDb: プロファイル一覧を管理する共通DB (profiles.db)
 * - db: 現在アクティブなプロファイルのDB (profile_xxx.db)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { runMigrations } from '../migrations';
import { getBasePath } from './storageConfig';

const log = logger.scope('DatabaseManager');

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
    private metaDb: Database.Database | null = null;

    constructor() {
        // NOTE:
        // metaDb の実体は initialize() 時に開く。
        // こうすることで initStorageConfig() 後の basePath を正しく反映できる。
    }

    /** Phase 25: プロファイルDBのベースパス（動的取得） */
    private getDbBasePath(): string {
        return getBasePath();
    }

    /** metaDb を開く */
    private openMetaDb(): Database.Database {
        const metaPath = path.join(this.getDbBasePath(), 'profiles.db');
        this.ensureDbDirectory(metaPath);
        return new Database(metaPath);
    }

    /** Phase 25: 移行後に metaDb を再接続する */
    reopenMetaDb(): void {
        if (this.metaDb && this.metaDb.open) return;
        this.metaDb = this.openMetaDb();
        this.initMetaDb();
        log.info('metaDb reopened');
    }

    /**
     * メタDB初期化（プロファイル一覧管理用）
     */
    private initMetaDb() {
        if (!this.metaDb) {
            throw new Error('metaDb is not initialized');
        }
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
        const metaDb = this.getMetaDb();
        const now = Date.now();
        metaDb.prepare(`
            INSERT INTO profiles (id, name, db_filename, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run('default', 'Default', 'media_default.db', now, now);

        metaDb.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)
        `).run('active_profile_id', 'default');
    }

    /**
     * DBディレクトリを事前作成する（DRY共通処理）
     * mode=install で data/ が存在しない場合などに対応
     */
    private ensureDbDirectory(dbPath: string): void {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log.info(`Created DB directory: ${dir}`);
        }
    }

    /**
     * メディアDB初期化（プロファイルごと）
     * マイグレーションシステムを使用してスキーマを管理
     */
    private initMediaDb() {
        if (!this.db) return;

        // マイグレーションシステムを使用
        runMigrations(this.db);
    }

    // === Profile CRUD ===

    /**
     * 全プロファイル取得
     */
    getProfiles(): Profile[] {
        this.reopenMetaDb();
        const metaDb = this.getMetaDb();
        const rows = metaDb.prepare('SELECT * FROM profiles ORDER BY created_at ASC').all() as any[];
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
        this.reopenMetaDb();
        const metaDb = this.getMetaDb();
        const row = metaDb.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as any;
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
        this.reopenMetaDb();
        const metaDb = this.getMetaDb();
        const id = uuidv4();
        const dbFilename = `media_${id}.db`;
        const now = Date.now();

        metaDb.prepare(`
            INSERT INTO profiles (id, name, db_filename, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, name, dbFilename, now, now);

        // 新しいDBファイルを作成してスキーマ初期化
        const dbPath = path.join(this.getDbBasePath(), dbFilename);
        this.ensureDbDirectory(dbPath);
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
        this.reopenMetaDb();
        const metaDb = this.getMetaDb();
        if (id === 'default' && updates.name) {
            // デフォルトプロファイルの名前変更は許可
        }
        const now = Date.now();
        if (updates.name) {
            metaDb.prepare('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?')
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
        const dbPath = path.join(this.getDbBasePath(), profile.dbFilename);
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        // サムネイルディレクトリ削除
        const thumbnailDir = path.join(this.getDbBasePath(), 'thumbnails', id);
        if (fs.existsSync(thumbnailDir)) {
            try {
                fs.rmSync(thumbnailDir, { recursive: true, force: true });
            } catch (e) {
                log.error(`Failed to delete thumbnail directory: ${thumbnailDir}`, e);
            }
        }

        // メタDBから削除
        const metaDb = this.getMetaDb();
        metaDb.prepare('DELETE FROM profiles WHERE id = ?').run(id);
        return true;
    }

    // === Profile Switching ===

    /**
     * アクティブプロファイルID取得
     */
    getActiveProfileId(): string {
        this.reopenMetaDb();
        const metaDb = this.getMetaDb();
        const row = metaDb.prepare('SELECT value FROM app_settings WHERE key = ?').get('active_profile_id') as { value: string } | undefined;
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
        const dbPath = path.join(this.getDbBasePath(), profile.dbFilename);
        this.ensureDbDirectory(dbPath);
        this.db = new Database(dbPath);
        this.initMediaDb();
        this.currentProfileId = profileId;

        // アクティブプロファイルを記録
        const metaDb = this.getMetaDb();
        metaDb.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
            .run('active_profile_id', profileId);
    }

    /**
     * 起動時の初期化（アクティブプロファイルに接続）
     */
    initialize(): void {
        this.reopenMetaDb();
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
        if (!this.metaDb) {
            throw new Error('metaDb is not initialized. Call initialize() first.');
        }
        return this.metaDb;
    }

    /**
     * 現在のプロファイルID取得
     */
    getCurrentProfileId(): string | null {
        return this.currentProfileId;
    }

    /**
     * 現在のDBファイルパス取得（バックアップ用）
     */
    getCurrentDbPath(): string {
        if (!this.currentProfileId) {
            throw new Error('No active profile');
        }
        const profile = this.getProfile(this.currentProfileId);
        if (!profile) {
            throw new Error('Active profile not found');
        }
        return path.join(this.getDbBasePath(), profile.dbFilename);
    }

    /**
     * Phase 25: WALチェックポイント（移行前に実行しDBを安全にフラッシュ）
     */
    walCheckpoint(): void {
        if (this.db && this.db.open) {
            this.db.pragma('wal_checkpoint(FULL)');
            log.info('WAL checkpoint completed');
        }
        if (this.metaDb && this.metaDb.open) {
            this.metaDb.pragma('wal_checkpoint(FULL)');
        }
    }

    /**
     * Phase 25: DB接続を全て閉じる（移行前に実行）
     */
    closeAll(): void {
        if (this.db && this.db.open) {
            this.db.close();
            this.db = null;
        }
        if (this.metaDb && this.metaDb.open) {
            this.metaDb.close();
            this.metaDb = null;
        }
    }
    /**
     * DB接続を明示的に閉じる（リストア処理用）
     */
    closeDb(): void {
        if (this.db && this.db.open) {
            log.info('Closing database connection explicitly');
            this.db.close();
            this.db = null;
        }
    }

    /**
     * クリーンアップ
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        if (this.metaDb && this.metaDb.open) {
            this.metaDb.close();
        }
        this.metaDb = null;
    }
}

// シングルトンインスタンス
export const dbManager = new DatabaseManager();
