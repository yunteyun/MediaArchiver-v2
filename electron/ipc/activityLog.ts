/**
 * Activity Log IPC Handlers
 */

import { ipcMain } from 'electron';
import { getActivityLogs, getActivityLogCount } from '../services/activityLogService';
import type { ActivityAction } from '../services/activityLogService';
import { logger } from '../services/logger';

const log = logger.scope('ActivityLogIPC');

export function registerActivityLogHandlers(): void {
    // アクティビティログ取得
    ipcMain.handle('activityLog:get', async (_event, limit?: number, offset?: number, actionFilter?: ActivityAction) => {
        try {
            log.debug('Fetching activity logs', { limit, offset, actionFilter });
            return getActivityLogs(limit, offset, actionFilter);
        } catch (error: any) {
            log.error('Failed to get activity logs:', error);
            throw error;
        }
    });

    // アクティビティログ総数取得
    ipcMain.handle('activityLog:count', async (_event, actionFilter?: ActivityAction) => {
        try {
            return getActivityLogCount(actionFilter);
        } catch (error: any) {
            log.error('Failed to get activity log count:', error);
            throw error;
        }
    });
}
