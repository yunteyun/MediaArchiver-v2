/**
 * Profile IPC Handlers - プロファイル管理のIPC通信
 */

import { ipcMain, BrowserWindow } from 'electron';
import { dbManager, Profile } from '../services/databaseManager';

export function registerProfileHandlers() {
    // プロファイル一覧取得
    ipcMain.handle('profile:list', (): Profile[] => {
        return dbManager.getProfiles();
    });

    // 単一プロファイル取得
    ipcMain.handle('profile:get', (_, id: string): Profile | undefined => {
        return dbManager.getProfile(id);
    });

    // プロファイル作成
    ipcMain.handle('profile:create', (_, name: string): Profile => {
        return dbManager.createProfile(name);
    });

    // プロファイル更新
    ipcMain.handle('profile:update', (_, { id, name }: { id: string; name?: string }): void => {
        dbManager.updateProfile(id, { name });
    });

    // プロファイル削除
    ipcMain.handle('profile:delete', (_, id: string): boolean => {
        return dbManager.deleteProfile(id);
    });

    // アクティブプロファイルID取得
    ipcMain.handle('profile:getActive', (): string => {
        return dbManager.getActiveProfileId();
    });

    // プロファイル切替
    ipcMain.handle('profile:switch', async (event, profileId: string): Promise<{ success: boolean }> => {
        dbManager.switchProfile(profileId);

        // Rendererに通知（データ再読み込みのため）
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            window.webContents.send('profile:switched', profileId);
        }

        return { success: true };
    });
}
