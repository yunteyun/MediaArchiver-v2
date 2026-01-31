import { ipcMain, Menu, shell, BrowserWindow } from 'electron';
import { deleteFolder } from '../services/database';
import { scanDirectory } from '../services/scanner';

export function registerFolderHandlers() {
    ipcMain.handle('folder:showContextMenu', async (event, { folderId, path }) => {
        const menu = Menu.buildFromTemplate([
            {
                label: '再スキャン',
                click: async () => {
                    // Start scan
                    // Note: scanDirectory might take time, we might want to notify start/end or progress
                    // But here we just trigger it. The existing scanner logic sends progress via webContents if set up?
                    // actually scanDirectory takes onProgress callback.
                    // We can reuse the existing IPC mechanism for progress if we hook it up, 
                    // or just fire a completion event.

                    // Ideally we should send 'scanner:progress' events.
                    // The scanDirectory function takes an onProgress callback.

                    // We can just rely on the existing mechanism if we want, or simple fire-and-forget 
                    // with a completion event.
                    // Let's implement a simple wrapper that sends events to the sender.

                    try {
                        const webContents = event.sender;
                        await scanDirectory(path, folderId, (progress) => {
                            webContents.send('scanner:progress', progress);
                        });
                        webContents.send('folder:rescanComplete', folderId);
                    } catch (e) {
                        console.error('Rescan failed:', e);
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'エクスプローラーで開く',
                click: async () => {
                    await shell.openPath(path);
                }
            },
            { type: 'separator' },
            {
                label: '削除',
                click: async () => {
                    await deleteFolder(folderId);
                    event.sender.send('folder:deleted', folderId);
                }
            }
        ]);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });
}
