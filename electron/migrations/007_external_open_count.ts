import { Database } from 'better-sqlite3';
import type { Migration } from './types';

/**
 * Migration 007: Add external app open tracking columns
 * Phase 18-A: 最小構成（インデックスなし）
 */
export const externalOpenCount: Migration = {
    version: 7,
    description: 'Add external_open_count and last_external_opened_at columns',
    up: (db: Database) => {
        db.exec(`ALTER TABLE files ADD COLUMN external_open_count INTEGER NOT NULL DEFAULT 0`);
        db.exec(`ALTER TABLE files ADD COLUMN last_external_opened_at INTEGER`);
    },
    down: (_db: Database) => {
        // SQLite DROP COLUMN は困難なため no-op
    }
};
