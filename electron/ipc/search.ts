/**
 * Search IPC Handlers - 複合検索
 * Phase 26-D1
 */

import { ipcMain } from 'electron';
import { searchFiles, SearchCondition } from '../services/searchService';
import { logger } from '../services/logger';

const log = logger.scope('SearchIPC');

export function registerSearchHandlers(): void {

    ipcMain.handle('search:searchFiles', (_event, condition: SearchCondition) => {
        try {
            return searchFiles(condition);
        } catch (e: any) {
            log.error(`search:searchFiles error: ${e.message}`);
            throw e;
        }
    });

}
