import { ipcMain } from 'electron';
import { getFiles } from '../services/database';

export function registerDatabaseHandlers() {
    ipcMain.handle('db:getFiles', async (_event, folderId?: string) => {
        return getFiles(folderId);
    });
}
