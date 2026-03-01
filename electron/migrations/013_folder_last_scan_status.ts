import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addFolderLastScanStatus: Migration = {
    version: 13,
    description: 'Add last scan status columns to folders table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(folders)').all() as { name: string }[];
        const hasLastScanAt = columns.some(c => c.name === 'last_scan_at');
        const hasLastScanStatus = columns.some(c => c.name === 'last_scan_status');
        const hasLastScanMessage = columns.some(c => c.name === 'last_scan_message');

        if (!hasLastScanAt) {
            db.prepare('ALTER TABLE folders ADD COLUMN last_scan_at INTEGER').run();
        }
        if (!hasLastScanStatus) {
            db.prepare('ALTER TABLE folders ADD COLUMN last_scan_status TEXT').run();
        }
        if (!hasLastScanMessage) {
            db.prepare('ALTER TABLE folders ADD COLUMN last_scan_message TEXT').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLite column drop is not trivial; no-op.
    }
};
