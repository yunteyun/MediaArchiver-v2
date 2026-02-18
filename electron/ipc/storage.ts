/**
 * storage.ts - Phase 25: ストレージ設定 IPC ハンドラ
 */

import { ipcMain, dialog, app } from 'electron';
import {
    getStorageConfig,
    migrateStorage,
    checkWritePermission,
    deleteOldStorageData,
    StorageMode,
} from '../services/storageConfig';
import { dbManager } from '../services/databaseManager';
import { logger } from '../services/logger';

const log = logger.scope('StorageIPC');

export function registerStorageHandlers(): void {
    // 現在の設定を取得
    ipcMain.handle('storage:getConfig', () => {
        return getStorageConfig();
    });

    // 設定変更 + 移行
    ipcMain.handle('storage:setConfig', async (_, mode: StorageMode, customPath?: string) => {
        log.info(`storage:setConfig called: mode=${mode}, customPath=${customPath}`);

        // 書き込み権限チェック
        const { getBasePath } = await import('../services/storageConfig');
        const newBase = mode === 'appdata'
            ? app.getPath('userData')
            : mode === 'install'
                ? require('path').join(require('path').dirname(app.getPath('exe')), 'data')
                : customPath ?? app.getPath('userData');

        const permCheck = checkWritePermission(newBase);
        if (!permCheck.ok) {
            return { success: false, error: `書き込み権限がありません: ${permCheck.error}` };
        }

        // WAL チェックポイント → DB 接続クローズ
        try {
            dbManager.walCheckpoint();
            dbManager.closeAll();
        } catch (e: any) {
            log.warn('WAL checkpoint or close failed:', e);
        }

        // 原子的移行
        const result = await migrateStorage(mode, customPath);

        if (!result.success) {
            // 移行失敗時は metaDb を再接続してから DB を再初期化
            try {
                dbManager.reopenMetaDb();
                dbManager.initialize();
            } catch (e) { log.error('Re-init failed', e); }
            return result;
        }

        // 移行成功: metaDb を再接続してから新しいパスで DB を初期化
        try {
            dbManager.reopenMetaDb();
            dbManager.initialize();
        } catch (e: any) {
            log.error('DB re-init after migration failed:', e);
            return { success: false, error: `移行後のDB再接続に失敗: ${e.message}` };
        }


        return { success: true, oldBase: result.oldBase, newBase: result.newBase };
    });

    // フォルダ選択ダイアログ
    ipcMain.handle('storage:browseFolder', async (event) => {
        const { BrowserWindow } = await import('electron');
        const win = BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win!, {
            properties: ['openDirectory'],
            title: '保存先フォルダを選択',
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    // 旧データ削除（ユーザー主導）
    ipcMain.handle('storage:deleteOldData', (_, oldBase: string) => {
        log.info(`storage:deleteOldData called: ${oldBase}`);
        return deleteOldStorageData(oldBase);
    });
}
