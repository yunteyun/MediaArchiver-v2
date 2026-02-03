import { ipcMain, shell } from 'electron';
import { logger } from '../services/logger';

export function registerAppHandlers() {
    // ファイルをデフォルトアプリで開く
    ipcMain.handle('app:openExternal', async (_event, filePath: string) => {
        return shell.openPath(filePath);
    });

    // エクスプローラーでファイル位置を表示
    ipcMain.handle('app:showInExplorer', async (_event, filePath: string) => {
        shell.showItemInFolder(filePath);
    });

    // ログを取得
    ipcMain.handle('app:getLogs', async (_event, lines: number = 200) => {
        return logger.getRecentLogs(lines);
    });

    // ログフォルダを開く
    ipcMain.handle('app:openLogFolder', async () => {
        const logPath = logger.getLogPath();
        shell.openPath(logPath);
    });
}

