/**
 * Database Migration System
 * 
 * ASAR問題を回避するため、静的リスト方式を採用。
 * 新しいマイグレーションを追加する場合は：
 * 1. 新しいマイグレーションファイルを作成（例: 002_add_hash_column.ts）
 * 2. このファイルでimportして MIGRATIONS 配列に追加
 */

import Database from 'better-sqlite3';
import { logger } from '../services/logger';
import type { Migration } from './types';
import { initialSchema } from './001_initial_schema';
import { activityLogs } from './002_activity_logs';
// 将来のマイグレーション:
// import { addHashColumn } from './003_add_hash_column';

// 型をre-export
export type { Migration };

const log = logger.scope('Migration');

// --- 静的マイグレーションリスト ---
// ★ 新しいマイグレーションはここに手動で追加
const MIGRATIONS: Migration[] = [
    initialSchema,
    activityLogs,
];

/**
 * マイグレーションを実行
 * DBを最新のスキーマバージョンに更新
 */
export function runMigrations(db: Database.Database): void {
    // 1. schema_versionテーブルの存在確認と再作成
    // 既存のテーブル構造が異なる可能性があるため、カラムをチェック
    const tableInfo = db.prepare("PRAGMA table_info(schema_version)").all() as { name: string }[];
    const hasCurrentVersion = tableInfo.some(col => col.name === 'current_version');

    if (tableInfo.length > 0 && !hasCurrentVersion) {
        // 古い構造のテーブルが存在する場合、削除して再作成
        log.info('Recreating schema_version table with new structure...');
        db.prepare('DROP TABLE IF EXISTS schema_version').run();
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY CHECK (version = 1),
            current_version INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        INSERT OR IGNORE INTO schema_version (version, current_version) VALUES (1, 0)
    `).run();

    // 2. 現在のバージョン取得
    const currentVer = db.prepare('SELECT current_version FROM schema_version')
        .get() as { current_version: number };
    let dbVersion = currentVer.current_version;

    log.info(`Current DB Version: ${dbVersion}`);

    // 3. 未適用のマイグレーションをフィルタリング
    const pendingMigrations = MIGRATIONS.filter(m => m.version > dbVersion);

    if (pendingMigrations.length === 0) {
        log.info('No new migrations.');
        return;
    }

    log.info(`Pending migrations: ${pendingMigrations.length}`);

    // 4. マイグレーション単位でトランザクション実行
    for (const migration of pendingMigrations) {
        log.info(`Applying v${migration.version}: ${migration.description}...`);

        const runMigration = db.transaction(() => {
            migration.up(db);
            db.prepare('UPDATE schema_version SET current_version = ?, updated_at = CURRENT_TIMESTAMP')
                .run(migration.version);
        });

        try {
            runMigration();
            dbVersion = migration.version;
            log.info(`Success v${migration.version}`);
        } catch (err) {
            log.error(`Failed at v${migration.version}:`, err);
            throw err; // 起動を止める
        }
    }

    log.info(`Migration complete. DB Version: ${dbVersion}`);
}

/**
 * 現在のDBバージョンを取得
 */
export function getCurrentVersion(db: Database.Database): number {
    try {
        const result = db.prepare('SELECT current_version FROM schema_version').get() as { current_version: number } | undefined;
        return result?.current_version ?? 0;
    } catch {
        return 0;
    }
}

/**
 * 利用可能な最新バージョンを取得
 */
export function getLatestVersion(): number {
    if (MIGRATIONS.length === 0) return 0;
    return Math.max(...MIGRATIONS.map(m => m.version));
}
