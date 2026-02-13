import { ipcMain, shell, dialog } from 'electron';
import { logger } from '../services/logger';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { incrementExternalOpenCount } from '../services/database';

// 外部アプリのキャッシュ
interface ExternalApp {
    id: string;
    name: string;
    path: string;
    extensions: string[];
    createdAt: number;
}
let cachedExternalApps: ExternalApp[] = [];

// file.ts から参照するための getter
export function getCachedExternalApps(): ExternalApp[] {
    return cachedExternalApps;
}

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

    // ファイル選択ダイアログ（外部アプリ登録用）
    ipcMain.handle('app:selectFile', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: '実行ファイル', extensions: ['exe'] },
                { name: 'すべてのファイル', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    // パス検証（セキュリティ）
    ipcMain.handle('app:validatePath', async (_event, appPath: string) => {
        if (!existsSync(appPath)) return false;
        const ext = path.extname(appPath).toLowerCase();
        return ['.exe', '.bat'].includes(ext);
    });

    // 外部アプリキャッシュ設定
    ipcMain.handle('app:setExternalApps', async (_event, apps: ExternalApp[]) => {
        cachedExternalApps = apps;
    });

    // 外部アプリキャッシュ取得（file.ts から使用）
    ipcMain.handle('app:getExternalApps', async () => {
        return cachedExternalApps;
    });

    // 外部アプリでファイルを開く（Phase 18-A: カウント統合）
    ipcMain.handle('app:openWithApp', async (_event, filePath: string, appPath: string, fileId?: string) => {
        if (!existsSync(appPath)) {
            throw new Error(`アプリケーションが見つかりません: ${appPath}`);
        }
        if (!existsSync(filePath)) {
            throw new Error(`ファイルが見つかりません: ${filePath}`);
        }

        const ext = path.extname(appPath).toLowerCase();
        if (!['.exe', '.bat'].includes(ext)) {
            throw new Error('実行可能ファイルではありません');
        }

        try {
            const child = spawn(path.resolve(appPath), [path.resolve(filePath)], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            // Phase 18-A: カウントをインクリメントして結果を返す
            if (fileId) {
                const result = incrementExternalOpenCount(fileId);
                return { success: true, ...result };
            }
            return { success: true };
        } catch (error) {
            throw new Error(`アプリケーション起動エラー: ${(error as Error).message}`);
        }
    });
}

