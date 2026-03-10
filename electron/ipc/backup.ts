/**
 * Backup IPC Handler - バックアップ関連の IPC 通信
 */

import { ipcMain, dialog } from 'electron';
import {
    createBackup,
    DEFAULT_BACKUP_SETTINGS,
    getBackupHistory,
    loadBackupSettings,
    restoreBackup,
    pruneOldBackups,
    saveBackupSettings,
    shouldAutoBackup,
    BackupSettings
} from '../services/backupService';
import { logger } from '../services/logger';

const log = logger.scope('BackupIPC');

let backupSettings: BackupSettings = loadBackupSettings();

export function registerBackupHandlers(): void {
    // バックアップ作成
    ipcMain.handle('backup:create', async (_event, { profileId }: { profileId: string }) => {
        try {
            log.info(`Creating backup for profile: ${profileId}`);
            const backup = await createBackup(profileId, backupSettings);

            // 世代数制限チェック
            pruneOldBackups(profileId, backupSettings.maxBackups, backupSettings);

            return { success: true, backup };
        } catch (error: any) {
            log.error('Backup creation failed:', error);
            return { success: false, error: error.message };
        }
    });

    // バックアップ履歴取得
    ipcMain.handle('backup:history', async (_event, { profileId }: { profileId: string }) => {
        try {
            return getBackupHistory(profileId, backupSettings);
        } catch (error: any) {
            log.error('Failed to get backup history:', error);
            return [];
        }
    });

    // リストア（確認ダイアログ付き）
    ipcMain.handle('backup:restore', async (_event, { backupPath }: { backupPath: string }) => {
        try {
            const result = await dialog.showMessageBox({
                type: 'warning',
                title: 'バックアップをリストア',
                message: 'リストアを実行すると、アプリが再起動されます。\n現在のデータは上書きされます。\n\nこの操作は取り消せません。',
                buttons: ['キャンセル', 'リストアして再起動'],
                defaultId: 0,
                cancelId: 0
            });

            if (result.response === 1) {
                log.info('User confirmed restore operation');
                await restoreBackup(backupPath);
                return { success: true };
            }

            log.info('User cancelled restore operation');
            return { success: false, cancelled: true };
        } catch (error: any) {
            log.error('Restore failed:', error);
            return { success: false, error: error.message };
        }
    });

    // 設定取得
    ipcMain.handle('backup:getSettings', async () => {
        return backupSettings;
    });

    // 設定更新
    ipcMain.handle('backup:setSettings', async (_event, settings: BackupSettings) => {
        backupSettings = saveBackupSettings({ ...DEFAULT_BACKUP_SETTINGS, ...backupSettings, ...settings });
        log.info('Backup settings updated:', backupSettings);
        return { success: true };
    });

    // 自動バックアップチェック
    ipcMain.handle('backup:shouldAutoBackup', async (_event, { profileId }: { profileId: string }) => {
        return shouldAutoBackup(profileId, backupSettings);
    });
}
