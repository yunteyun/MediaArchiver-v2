/**
 * Migration 002: Activity Logs
 *
 * アクティビティログテーブルを追加。
 * ファイル追加・削除、タグ付け、スキャン履歴を記録。
 */
import type { Migration } from './types';
export declare const activityLogs: Migration;
