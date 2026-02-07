/**
 * Migration 003: Add Tag Fields
 * 
 * tag_definitions テーブルに icon と description 列を追加。
 * タグにアイコンと説明文を設定可能にする。
 */

import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addTagFields: Migration = {
    version: 3,
    description: 'Add icon and description fields to tag_definitions',

    up: (db: Database.Database) => {
        db.exec(`
            ALTER TABLE tag_definitions ADD COLUMN icon TEXT DEFAULT '';
            ALTER TABLE tag_definitions ADD COLUMN description TEXT DEFAULT '';
        `);

        // 既存データの確認ログ
        const count = db.prepare('SELECT COUNT(*) as count FROM tag_definitions')
            .get() as { count: number };
        console.log(`Migration 003: Updated ${count.count} existing tags with new fields`);
    },

    down: () => {
        // SQLite 3.35.0+ でのみ動作
        // 本番では実行しない想定
        console.warn('Rollback: DROP COLUMN requires SQLite 3.35.0+');
    }
};
