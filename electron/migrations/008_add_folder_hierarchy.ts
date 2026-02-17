import { Database } from 'better-sqlite3';
import type { Migration } from './types';

/**
 * Migration 008: Add folder hierarchy columns
 * Phase 22-C: parent_id, driveカラム追加
 */
export const addFolderHierarchy: Migration = {
    version: 8,
    description: 'Add parent_id and drive columns to folders table',
    up: (db: Database) => {
        // Phase 22-C: foldersテーブルにparent_idとdriveカラムを追加
        db.exec(`ALTER TABLE folders ADD COLUMN parent_id TEXT`);
        db.exec(`ALTER TABLE folders ADD COLUMN drive TEXT`);

        // 既存フォルダのdriveを更新
        const folders = db.prepare('SELECT id, path FROM folders').all() as { id: string; path: string }[];
        const updateStmt = db.prepare('UPDATE folders SET drive = ? WHERE id = ?');

        for (const folder of folders) {
            const drive = folder.path.match(/^[A-Z]:/i) ? folder.path.substring(0, 2).toUpperCase() : '/';
            updateStmt.run(drive, folder.id);
        }
    },
    down: (_db: Database) => {
        // SQLite DROP COLUMN は困難なため no-op
    }
};
