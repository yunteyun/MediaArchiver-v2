import { ipcMain, Menu, shell, BrowserWindow, dialog } from 'electron';
import { deleteFile } from '../services/database';
import fs from 'fs';

export function registerFileHandlers() {
    ipcMain.handle('file:showContextMenu', async (event, { fileId, filePath }) => {
        const menu = Menu.buildFromTemplate([
            {
                label: '外部アプリで開く',
                click: async () => {
                    await shell.openPath(filePath);
                }
            },
            {
                label: 'エクスプローラーで表示',
                click: async () => {
                    shell.showItemInFolder(filePath);
                }
            },
            { type: 'separator' },
            {
                label: 'ファイルを削除',
                click: async () => {
                    const result = await dialog.showMessageBox({
                        type: 'warning',
                        buttons: ['削除', 'キャンセル'],
                        defaultId: 1,
                        title: 'ファイル削除の確認',
                        message: 'このファイルをディスクから削除しますか？',
                        detail: '削除したファイルは復元できません。',
                    });

                    if (result.response === 0) {
                        try {
                            // Delete from filesystem
                            await fs.promises.unlink(filePath);
                            // Delete from database
                            deleteFile(fileId);
                            // Notify renderer
                            event.sender.send('file:deleted', fileId);
                        } catch (e) {
                            console.error('Failed to delete file:', e);
                        }
                    }
                }
            }
        ]);

        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            menu.popup({ window: win });
        }
    });
}
