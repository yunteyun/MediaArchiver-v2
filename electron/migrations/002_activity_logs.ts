/**
 * Migration 002: Activity Logs
 * 
 * アクティビティログテーブルを追加。
 * ファイル追加・削除、タグ付け、スキャン履歴を記録。
 */

import Database from 'better-sqlite3';
import type { Migration } from './types';

export const activityLogs: Migration = {
    version: 2,
    description: 'Add activity_logs table for tracking file operations',

    up: (db: Database.Database) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                target_id TEXT,
                target_name TEXT,
                details TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
        `);
    },

    down: (db: Database.Database) => {
        db.exec(`
            DROP INDEX IF EXISTS idx_activity_logs_created;
            DROP INDEX IF EXISTS idx_activity_logs_action;
            DROP TABLE IF EXISTS activity_logs;
        `);
    }
};
