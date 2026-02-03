/**
 * Migration 001: Initial Schema
 * 
 * MediaArchiver v2の初期スキーマを定義。
 * 既存DBとの互換性を確保するため、CREATE TABLE IF NOT EXISTSを使用。
 */

import Database from 'better-sqlite3';
import type { Migration } from './index';

export const initialSchema: Migration = {
    version: 1,
    description: 'Initial v2 schema with audio support and notes',

    up: (db: Database.Database) => {
        // filesテーブル
        db.exec(`
            CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                size INTEGER,
                type TEXT CHECK(type IN ('video', 'image', 'archive', 'audio')),
                created_at INTEGER,
                duration TEXT,
                thumbnail_path TEXT,
                preview_frames TEXT,
                root_folder_id TEXT,
                content_hash TEXT,
                metadata TEXT,
                mtime_ms INTEGER DEFAULT 0,
                notes TEXT DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
            CREATE INDEX IF NOT EXISTS idx_files_hash ON files(content_hash);
            CREATE INDEX IF NOT EXISTS idx_files_root_folder ON files(root_folder_id);
            CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);
        `);

        // tagsテーブル（レガシー）
        db.exec(`
            CREATE TABLE IF NOT EXISTS tags (
                file_id TEXT,
                tag TEXT,
                PRIMARY KEY (file_id, tag),
                FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
            );
        `);

        // tag_categoriesテーブル
        db.exec(`
            CREATE TABLE IF NOT EXISTS tag_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT 'gray',
                sort_order INTEGER DEFAULT 0,
                created_at INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_tag_categories_name ON tag_categories(name);
        `);

        // tag_definitionsテーブル
        db.exec(`
            CREATE TABLE IF NOT EXISTS tag_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT 'gray',
                category_id TEXT,
                sort_order INTEGER DEFAULT 0,
                created_at INTEGER,
                FOREIGN KEY(category_id) REFERENCES tag_categories(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tag_definitions_category ON tag_definitions(category_id);
            CREATE INDEX IF NOT EXISTS idx_tag_definitions_name ON tag_definitions(name);
        `);

        // file_tagsテーブル
        db.exec(`
            CREATE TABLE IF NOT EXISTS file_tags (
                file_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                added_at INTEGER,
                PRIMARY KEY (file_id, tag_id),
                FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
                FOREIGN KEY(tag_id) REFERENCES tag_definitions(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
            CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
        `);

        // foldersテーブル
        db.exec(`
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                created_at INTEGER,
                auto_scan INTEGER DEFAULT 0
            );
        `);

        // 既存DBにnotesカラムがない場合は追加
        const columns = db.prepare('PRAGMA table_info(files)').all() as { name: string }[];
        const hasNotes = columns.some(c => c.name === 'notes');
        if (!hasNotes) {
            db.prepare(`ALTER TABLE files ADD COLUMN notes TEXT DEFAULT ''`).run();
        }
    },

    down: (db: Database.Database) => {
        // 開発用のロールバック（本番では使用しない）
        db.exec(`
            DROP TABLE IF EXISTS file_tags;
            DROP TABLE IF EXISTS tag_definitions;
            DROP TABLE IF EXISTS tag_categories;
            DROP TABLE IF EXISTS tags;
            DROP TABLE IF EXISTS files;
            DROP TABLE IF EXISTS folders;
        `);
    }
};
