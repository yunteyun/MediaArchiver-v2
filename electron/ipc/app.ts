import { ipcMain, shell, dialog, app } from 'electron';
import { logger } from '../services/logger';
import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { incrementExternalOpenCount } from '../services/database';
import { setPerfDebugEnabled } from '../services/perfDebug';
import { checkForAppUpdate, downloadLatestUpdateZip } from '../services/updateCheckService';

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
    // アプリバージョンを返す（Phase 26）
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:checkForUpdates', async (_event, sourceUrl?: string) => {
        return checkForAppUpdate(app.getVersion(), sourceUrl);
    });
    ipcMain.handle('app:downloadLatestUpdateZip', async (_event, sourceUrl?: string) => {
        return downloadLatestUpdateZip(sourceUrl);
    });
    ipcMain.handle('app:applyUpdateFromZip', async (_event, zipPath?: string) => {
        let resolvedZipPath: string | undefined;
        if (typeof zipPath === 'string' && zipPath.trim().length > 0) {
            resolvedZipPath = path.resolve(zipPath);
            if (!existsSync(resolvedZipPath)) {
                return { success: false, error: `ZIPファイルが見つかりません: ${resolvedZipPath}` };
            }
            if (path.extname(resolvedZipPath).toLowerCase() !== '.zip') {
                return { success: false, error: '指定ファイルがZIP形式ではありません' };
            }
        } else if (zipPath != null && typeof zipPath !== 'string') {
            return { success: false, error: 'ZIPパスの指定が不正です' };
        }

        const packagedUpdateBat = path.join(path.dirname(app.getPath('exe')), 'update.bat');
        const devUpdateBat = path.join(process.cwd(), 'update.bat');
        const updateBatPath = existsSync(packagedUpdateBat)
            ? packagedUpdateBat
            : (existsSync(devUpdateBat) ? devUpdateBat : '');

        if (!updateBatPath) {
            return { success: false, error: 'update.bat が見つかりませんでした' };
        }

        if (!resolvedZipPath) {
            // ZIP未指定時は update.bat 内で OpenFileDialog を出すため、通常起動する。
            const launchError = await shell.openPath(updateBatPath);
            if (launchError) {
                return { success: false, error: `update.bat の起動に失敗しました: ${launchError}` };
            }
            return {
                success: true,
                updateBatPath,
            };
        }

        const command = `start "" "${updateBatPath}" "${resolvedZipPath}"`;
        const child = spawn('cmd.exe', ['/d', '/s', '/c', command], {
            cwd: path.dirname(updateBatPath),
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
        });
        child.unref();

        return {
            success: true,
            updateBatPath,
            zipPath: resolvedZipPath,
        };
    });

    ipcMain.handle('app:setPerfDebugEnabled', async (_event, enabled: boolean) => {
        return { enabled: setPerfDebugEnabled(enabled) };
    });

    // ファイルをデフォルトアプリで開く
    ipcMain.handle('app:openExternal', async (_event, filePath: string) => {
        return shell.openPath(filePath);
    });

    ipcMain.handle('app:openUrl', async (_event, url: string) => {
        await shell.openExternal(url);
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

    // 外部アプリでファイルを開く（Phase 18-A: カウント統合、Phase 18-B: エラーハンドリング改善）
    ipcMain.handle('app:openWithApp', async (_event, filePath: string, appPath: string, fileId?: string) => {
        if (!existsSync(appPath)) {
            return { success: false, error: `アプリケーションが見つかりません: ${appPath}` };
        }
        if (!existsSync(filePath)) {
            return { success: false, error: `ファイルが見つかりません: ${filePath}` };
        }

        const ext = path.extname(appPath).toLowerCase();
        if (!['.exe', '.bat'].includes(ext)) {
            return { success: false, error: '実行可能ファイルではありません' };
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
            return { success: false, error: `起動エラー: ${(error as Error).message}` };
        }
    });
}

