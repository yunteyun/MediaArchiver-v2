/**
 * Migration Types - マイグレーション型定義
 */
import Database from 'better-sqlite3';
export interface Migration {
    version: number;
    description: string;
    up: (db: Database.Database) => void;
    down?: (db: Database.Database) => void;
}
