/**
 * Database Migration System
 *
 * ASAR問題を回避するため、静的リスト方式を採用。
 * 新しいマイグレーションを追加する場合は：
 * 1. 新しいマイグレーションファイルを作成（例: 002_add_hash_column.ts）
 * 2. このファイルでimportして MIGRATIONS 配列に追加
 */
import Database from 'better-sqlite3';
import type { Migration } from './types';
export type { Migration };
/**
 * マイグレーションを実行
 * DBを最新のスキーマバージョンに更新
 */
export declare function runMigrations(db: Database.Database): void;
/**
 * 現在のDBバージョンを取得
 */
export declare function getCurrentVersion(db: Database.Database): number;
/**
 * 利用可能な最新バージョンを取得
 */
export declare function getLatestVersion(): number;
