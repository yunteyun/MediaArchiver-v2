import { ipcMain } from 'electron';
import {
    createSmartFolder,
    deleteSmartFolder,
    getAllSmartFolders,
    getSmartFolderById,
    moveSmartFolder,
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
        } catch (error) {
            log.error(`smartFolder:getById error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    });

    ipcMain.handle(
        'smartFolder:create',
        async (_event, payload: { name: string; condition?: unknown }) => {
            try {
                return createSmartFolder(payload);
            } catch (error) {
                log.error(`smartFolder:create error: ${error instanceof Error ? error.message : String(error)}`);
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
            } catch (error) {
                log.error(`smartFolder:update error: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }
    );

    ipcMain.handle('smartFolder:delete', async (_event, id: string) => {
        try {
            return deleteSmartFolder(id);
        } catch (error) {
            log.error(`smartFolder:delete error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    });

    ipcMain.handle('smartFolder:move', async (_event, payload: { id: string; direction: 'up' | 'down' }) => {
        try {
            return moveSmartFolder(payload.id, payload.direction);
        } catch (error) {
            log.error(`smartFolder:move error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    });
}
