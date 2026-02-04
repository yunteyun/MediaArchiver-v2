/**
 * Statistics IPC Handler - 統計関連の IPC 通信
 */

import { ipcMain } from 'electron';
import { getLibraryStats } from '../services/statisticsService';
import { logger } from '../services/logger';

const log = logger.scope('StatisticsIPC');

export function registerStatisticsHandlers(): void {
    // 統計取得
    ipcMain.handle('statistics:get', async () => {
        try {
            log.debug('Fetching library statistics');
            return getLibraryStats();
        } catch (error: any) {
            log.error('Failed to get statistics:', error);
            throw error;
        }
    });
}
