import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addFolderScanSettings: Migration = {
    version: 11,
    description: 'Add folder scan settings JSON column to folders table',

    up: (db: Database.Database) => {
        const columns = db.prepare('PRAGMA table_info(folders)').all() as { name: string }[];
        const hasScanSettingsJson = columns.some(c => c.name === 'scan_settings_json');
        if (!hasScanSettingsJson) {
            db.prepare('ALTER TABLE folders ADD COLUMN scan_settings_json TEXT').run();
        }
    },

    down: (_db: Database.Database) => {
        // SQLiteでは列削除を簡単に行えないため no-op
    }
};
