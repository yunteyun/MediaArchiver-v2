import { Database } from 'better-sqlite3';
import type { Migration } from './types';

/**
 * Migration 006: Add access tracking columns to files table
 * Phase 17: アクセス回数・直近アクセス機能
 */

export const accessTracking: Migration = {
    version: 6,
    description: 'Add access_count and last_accessed_at columns',
    up: (db: Database) => {
        // access_count カラムを追加（デフォルト: 0）
        db.exec(`
            ALTER TABLE files 
            ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0;
        `);

        // last_accessed_at カラムを追加（デフォルト: NULL）
        db.exec(`
            ALTER TABLE files 
            ADD COLUMN last_accessed_at INTEGER;
        `);

        // access_count でのソート用インデックス
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_files_access_count 
            ON files(access_count);
        `);

        // last_accessed_at でのソート用インデックス
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_files_last_accessed 
            ON files(last_accessed_at);
        `);
    },
    down: (db: Database) => {
        // SQLite では安全な DROP COLUMN が困難なため、no-op
        // ロールバックが必要な場合は手動で対応
    }
};
