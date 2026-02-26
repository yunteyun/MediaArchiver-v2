import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addFolderWatchNewFiles: Migration = {
    version: 12,
    description: 'Add watch_new_files flag to folders table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(folders)').all() as { name: string }[];
        const hasWatchNewFiles = columns.some(c => c.name === 'watch_new_files');
        if (!hasWatchNewFiles) {
            db.prepare('ALTER TABLE folders ADD COLUMN watch_new_files INTEGER DEFAULT 0').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLite では列削除を簡単に行えないため no-op
    }
};
