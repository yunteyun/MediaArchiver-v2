/**
 * Activity Log Service
 *
 * ファイル追加・削除、タグ付け、スキャン履歴を記録・取得。
 * Fire-and-Forget方式でメイン処理を阻害しない。
 */
export type ActivityAction = 'file_add' | 'file_delete' | 'tag_add' | 'tag_remove' | 'scan_start' | 'scan_end';
export interface ActivityLog {
    id: number;
    action: ActivityAction;
    target_id: string | null;
    target_name: string | null;
    details: string | null;
    created_at: number;
}
export interface ActivityLogInput {
    action: ActivityAction;
    targetId?: string;
    targetName?: string;
    details?: Record<string, any>;
}
/**
 * アクティビティログを記録（Fire-and-Forget）
 * エラーが発生してもメイン処理に影響しない
 */
export declare function logActivity(action: ActivityAction, targetId?: string, targetName?: string, details?: Record<string, any>): Promise<void>;
/**
 * アクティビティログを取得（ページネーション対応）
 */
export declare function getActivityLogs(limit?: number, offset?: number, actionFilter?: ActivityAction): ActivityLog[];
/**
 * アクティビティログの総数を取得
 */
export declare function getActivityLogCount(actionFilter?: ActivityAction): number;
/**
 * 古いログを削除（Pruning）
 * アプリ起動時に1回実行
 */
export declare function pruneOldLogs(daysToKeep?: number): void;
