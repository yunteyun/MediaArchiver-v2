import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addThumbnailLock: Migration = {
    version: 19,
    description: 'Add thumbnail lock column to files table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(files)').all() as { name: string }[];
        const hasThumbnailLocked = columns.some((column) => column.name === 'thumbnail_locked');

        if (!hasThumbnailLocked) {
            db.prepare('ALTER TABLE files ADD COLUMN thumbnail_locked INTEGER DEFAULT 0').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLite column drop is not trivial; no-op.
    }
};
