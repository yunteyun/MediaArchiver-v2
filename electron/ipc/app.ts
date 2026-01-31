import { ipcMain, shell } from 'electron';

export function registerAppHandlers() {
    // ファイルをデフォルトアプリで開く
    ipcMain.handle('app:openExternal', async (_event, filePath: string) => {
        return shell.openPath(filePath);
    });

    // エクスプローラーでファイル位置を表示
    ipcMain.handle('app:showInExplorer', async (_event, filePath: string) => {
        shell.showItemInFolder(filePath);
    });
}
