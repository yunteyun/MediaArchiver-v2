import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addPlaybackBookmarkNote: Migration = {
    version: 18,
    description: 'Add note column to playback bookmarks table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(playback_bookmarks)').all() as { name: string }[];
        const hasNote = columns.some((column) => column.name === 'note');

        if (!hasNote) {
            db.prepare('ALTER TABLE playback_bookmarks ADD COLUMN note TEXT').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLite column drop is not trivial; no-op.
    }
};
