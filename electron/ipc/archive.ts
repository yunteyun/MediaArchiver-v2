/**
 * Archive IPC Handler - 書庫ファイル関連の IPC 通信
 */

import { ipcMain } from 'electron';
import {
    getArchiveMetadata,
    getArchivePreviewFrames,
    cleanTempArchives
} from '../services/archiveHandler';

export function registerArchiveHandlers(): void {
    // 書庫メタデータ取得
    ipcMain.handle('archive:getMetadata', async (_event, filePath: string) => {
        return getArchiveMetadata(filePath);
    });

    // プレビューフレーム取得
    ipcMain.handle('archive:getPreviewFrames', async (_event, { path, limit }: { path: string; limit?: number }) => {
        return getArchivePreviewFrames(path, limit);
    });

    // 一時ファイルクリーンアップ
    ipcMain.handle('archive:cleanTemp', async () => {
        cleanTempArchives();
        return { success: true };
    });
}
