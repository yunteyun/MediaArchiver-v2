import { Database } from 'better-sqlite3';
import type { Migration } from './types';

/**
 * Migration 009: Add Rating Axes tables
 * Phase 26-B1: 評価軸（rating_axes）とファイル評価（file_ratings）テーブルを追加
 * 
 * 設計ポイント:
 * - is_system=1 の軸はUI上で削除不可とする（overall軸など）
 * - min_value/max_value/step により可変レンジ対応
 * - file_ratings は files/rating_axes に対してCASCADE DELETE
 */
export const addRatingAxes: Migration = {
    version: 9,
    description: 'Add rating_axes and file_ratings tables (Phase 26-B1)',
    up: (db: Database) => {
        // 評価軸マスタ
        db.exec(`
            CREATE TABLE IF NOT EXISTS rating_axes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                min_value REAL NOT NULL DEFAULT 1,
                max_value REAL NOT NULL DEFAULT 5,
                step REAL NOT NULL DEFAULT 1,
                is_system INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );
        `);

        // ファイル評価データ
        db.exec(`
            CREATE TABLE IF NOT EXISTS file_ratings (
                file_id TEXT NOT NULL,
                axis_id TEXT NOT NULL,
                value REAL NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (file_id, axis_id),
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
                FOREIGN KEY (axis_id) REFERENCES rating_axes(id) ON DELETE CASCADE
            );
        `);

        // パフォーマンス用インデックス
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_file_ratings_file_id ON file_ratings(file_id);
            CREATE INDEX IF NOT EXISTS idx_file_ratings_axis_id ON file_ratings(axis_id);
        `);
    },
    down: (_db: Database) => {
        // SQLite DROP TABLE は可能だが、CASCADE参照を考慮
        // 本番環境では使用しない
    }
};
