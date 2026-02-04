/**
 * Activity Log Service
 * 
 * ファイル追加・削除、タグ付け、スキャン履歴を記録・取得。
 * Fire-and-Forget方式でメイン処理を阻害しない。
 */

import { dbManager } from './databaseManager';
import { logger } from './logger';

const log = logger.scope('ActivityLogService');

// --- Types ---

export type ActivityAction =
    | 'file_add'
    | 'file_delete'
    | 'tag_add'
    | 'tag_remove'
    | 'scan_start'
    | 'scan_end';

export interface ActivityLog {
    id: number;
    action: ActivityAction;
    target_id: string | null;
    target_name: string | null;
    details: string | null;  // JSON string
    created_at: number;
}

export interface ActivityLogInput {
    action: ActivityAction;
    targetId?: string;
    targetName?: string;
    details?: Record<string, any>;
}

// --- Public API ---

/**
 * アクティビティログを記録（Fire-and-Forget）
 * エラーが発生してもメイン処理に影響しない
 */
export function logActivity(
    action: ActivityAction,
    targetId?: string,
    targetName?: string,
    details?: Record<string, any>
): Promise<void> {
    return new Promise((resolve) => {
        try {
            const db = dbManager.getDb();
            const now = Date.now();

            db.prepare(`
                INSERT INTO activity_logs (action, target_id, target_name, details, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                action,
                targetId || null,
                targetName || null,
                details ? JSON.stringify(details) : null,
                now
            );

            log.debug(`Activity logged: ${action} - ${targetName || targetId || 'N/A'}`);
            resolve();
        } catch (error: any) {
            log.warn(`Failed to log activity (${action}):`, error.message);
            resolve(); // エラーでも resolve（Fire-and-Forget）
        }
    });
}

/**
 * アクティビティログを取得（ページネーション対応）
 */
export function getActivityLogs(
    limit: number = 50,
    offset: number = 0,
    actionFilter?: ActivityAction
): ActivityLog[] {
    try {
        const db = dbManager.getDb();

        let query = `
            SELECT id, action, target_id, target_name, details, created_at
            FROM activity_logs
        `;

        const params: any[] = [];

        if (actionFilter) {
            query += ` WHERE action = ?`;
            params.push(actionFilter);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const logs = db.prepare(query).all(...params) as ActivityLog[];

        return logs;
    } catch (error: any) {
        log.error('Failed to get activity logs:', error);
        return [];
    }
}

/**
 * アクティビティログの総数を取得
 */
export function getActivityLogCount(actionFilter?: ActivityAction): number {
    try {
        const db = dbManager.getDb();

        let query = `SELECT COUNT(*) as count FROM activity_logs`;
        const params: any[] = [];

        if (actionFilter) {
            query += ` WHERE action = ?`;
            params.push(actionFilter);
        }

        const result = db.prepare(query).get(...params) as { count: number };
        return result.count;
    } catch (error: any) {
        log.error('Failed to get activity log count:', error);
        return 0;
    }
}

/**
 * 古いログを削除（Pruning）
 * アプリ起動時に1回実行
 */
export function pruneOldLogs(daysToKeep: number = 30): void {
    try {
        const db = dbManager.getDb();
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        const result = db.prepare(`
            DELETE FROM activity_logs WHERE created_at < ?
        `).run(cutoffTime);

        if (result.changes > 0) {
            log.info(`Pruned ${result.changes} old activity logs (older than ${daysToKeep} days)`);
        }
    } catch (error: any) {
        log.error('Failed to prune old logs:', error);
    }
}
