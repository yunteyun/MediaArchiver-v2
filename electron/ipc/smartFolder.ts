import { ipcMain } from 'electron';
import {
    createSmartFolder,
    deleteSmartFolder,
    getAllSmartFolders,
    getSmartFolderById,
    updateSmartFolder,
} from '../services/smartFolderService';
import { logger } from '../services/logger';

const log = logger.scope('SmartFolderIPC');

export function registerSmartFolderHandlers(): void {
    ipcMain.handle('smartFolder:getAll', async () => {
        return getAllSmartFolders();
    });

    ipcMain.handle('smartFolder:getById', async (_event, id: string) => {
        try {
            return getSmartFolderById(id);
        } catch (error: any) {
            log.error(`smartFolder:getById error: ${error.message}`);
            throw error;
        }
    });

    ipcMain.handle(
        'smartFolder:create',
        async (_event, payload: { name: string; condition?: unknown }) => {
            try {
                return createSmartFolder(payload);
            } catch (error: any) {
                log.error(`smartFolder:create error: ${error.message}`);
                throw error;
            }
        }
    );

    ipcMain.handle(
        'smartFolder:update',
        async (
            _event,
            payload: {
                id: string;
                updates: {
                    name?: string;
                    condition?: unknown;
                    sortOrder?: number;
                };
            }
        ) => {
            try {
                return updateSmartFolder(payload.id, payload.updates ?? {});
            } catch (error: any) {
                log.error(`smartFolder:update error: ${error.message}`);
                throw error;
            }
        }
    );

    ipcMain.handle('smartFolder:delete', async (_event, id: string) => {
        try {
            return deleteSmartFolder(id);
        } catch (error: any) {
            log.error(`smartFolder:delete error: ${error.message}`);
            throw error;
        }
    });
}
