import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addPlaybackBookmarks: Migration = {
    version: 17,
    description: 'Add playback bookmarks table',

    up: (db: Database.Database) => {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS playback_bookmarks (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL,
                time_seconds REAL NOT NULL,
                created_at INTEGER NOT NULL
            )
        `).run();

        db.prepare(`
            CREATE INDEX IF NOT EXISTS idx_playback_bookmarks_file_id
            ON playback_bookmarks(file_id, time_seconds, created_at)
        `).run();
    },

    down: (_db: Database.Database) => {
        // テーブル削除は後方互換性のため行わない。
    }
};
