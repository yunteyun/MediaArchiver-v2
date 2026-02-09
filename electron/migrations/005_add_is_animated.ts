/**
 * Migration 005: Add is_animated column
 * 
 * アニメーション画像（GIF/WebP等）を識別するためのフラグを追加。
 * 将来的にAPNG/AVIF等にも対応可能な設計。
 */

import Database from 'better-sqlite3';
import type { Migration } from './types';

export const addIsAnimated: Migration = {
    version: 5,
    description: 'Add is_animated column for animated image detection',

    up: (db: Database.Database) => {
        // is_animated カラムを追加（preview上で「フレーム変化を持つ」メディア）
        const columns = db.prepare('PRAGMA table_info(files)').all() as { name: string }[];
        const hasIsAnimated = columns.some(c => c.name === 'is_animated');

        if (!hasIsAnimated) {
            db.prepare(`ALTER TABLE files ADD COLUMN is_animated INTEGER DEFAULT 0`).run();
            console.log('[Migration 005] Added is_animated column');
        }
    },

    down: (db: Database.Database) => {
        // ロールバック（本番では使用しない）
        // SQLiteはALTER TABLE DROP COLUMNをサポートしていないため、
        // テーブル再作成が必要だが、開発用のため省略
        void db; // lint: unused parameter
        console.log('[Migration 005] Rollback not implemented (SQLite limitation)');
    }
};
