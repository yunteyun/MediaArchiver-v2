import { ipcMain, shell } from 'electron';
import { listExternalDisplayPresetManifests } from '../services/displayPresetService';

export function registerDisplayPresetHandlers() {
    ipcMain.handle('displayPreset:list', async () => {
        return listExternalDisplayPresetManifests();
    });

    ipcMain.handle('displayPreset:openFolder', async () => {
        const { directory } = listExternalDisplayPresetManifests();
        const errorMessage = await shell.openPath(directory);
        return {
            success: !errorMessage,
            directory,
            error: errorMessage || undefined,
        };
    });
}
