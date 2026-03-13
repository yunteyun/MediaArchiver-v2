import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addFolderBadgeColor: Migration = {
    version: 15,
    description: 'Add badge color column to folders table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(folders)').all() as { name: string }[];
        const hasBadgeColor = columns.some((column) => column.name === 'badge_color');

        if (!hasBadgeColor) {
            db.prepare('ALTER TABLE folders ADD COLUMN badge_color TEXT').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLite column drop is not trivial; no-op.
    }
};
