import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addProfileSettings: Migration = {
    version: 10,
    description: 'Add profile_settings table for profile-scoped UI/scanner settings',

    up: (db: Database.Database) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS profile_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `);
    },

    down: (db: Database.Database) => {
        db.exec(`
            DROP TABLE IF EXISTS profile_settings;
        `);
    }
};
