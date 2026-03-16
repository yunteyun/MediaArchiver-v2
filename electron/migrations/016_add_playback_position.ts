import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addPlaybackPosition: Migration = {
    version: 16,
    description: 'Add playback position columns to files table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(files)').all() as { name: string }[];
        const hasPlaybackPositionSeconds = columns.some((column) => column.name === 'playback_position_seconds');
        const hasPlaybackPositionUpdatedAt = columns.some((column) => column.name === 'playback_position_updated_at');

        if (!hasPlaybackPositionSeconds) {
            db.prepare('ALTER TABLE files ADD COLUMN playback_position_seconds REAL').run();
        }

        if (!hasPlaybackPositionUpdatedAt) {
            db.prepare('ALTER TABLE files ADD COLUMN playback_position_updated_at INTEGER').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLite column drop is not trivial; no-op.
    }
};
