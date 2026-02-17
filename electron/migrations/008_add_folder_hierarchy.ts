import type { Migration } from './types';

export const migration: Migration = {
    version: 8,
    name: 'add_folder_hierarchy',
    up: (db) => {
        // Phase 22-C: foldersテーブルにparent_idとdriveカラムを追加
        db.exec(`
            ALTER TABLE folders ADD COLUMN parent_id TEXT;
            ALTER TABLE folders ADD COLUMN drive TEXT;
        `);

        // 既存フォルダのdriveを更新
        const folders = db.prepare('SELECT id, path FROM folders').all() as { id: string; path: string }[];
        const updateStmt = db.prepare('UPDATE folders SET drive = ? WHERE id = ?');

        for (const folder of folders) {
            const drive = folder.path.match(/^[A-Z]:/i) ? folder.path.substring(0, 2).toUpperCase() : '/';
            updateStmt.run(drive, folder.id);
        }
    },
    down: (db) => {
        // ロールバック: カラム削除（SQLiteでは直接削除できないため、テーブル再作成が必要）
        db.exec(`
            CREATE TABLE folders_backup (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                created_at INTEGER
            );
            
            INSERT INTO folders_backup (id, path, name, created_at)
            SELECT id, path, name, created_at FROM folders;
            
            DROP TABLE folders;
            
            ALTER TABLE folders_backup RENAME TO folders;
        `);
    }
};
