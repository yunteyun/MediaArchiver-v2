import { ipcMain, dialog } from 'electron';

export function registerDialogHandlers() {
    ipcMain.handle('dialog:selectFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });
}
