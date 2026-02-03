/**
 * Duplicate IPC Handlers - 重複検出のIPC通信
 * 
 * 進捗イベントは50-100msに1回に間引き（IPCスロットリング）
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import {
    findDuplicates,
    cancelDuplicateSearch,
    getDuplicateStats,
    DuplicateProgress,
    DuplicateGroup
} from '../services/duplicateService';

// 進捗スロットリング用の状態
let lastProgressTime = 0;
const PROGRESS_THROTTLE_MS = 100; // 100msに1回

export function registerDuplicateHandlers() {
    /**
     * 重複ファイル検索
     */
    ipcMain.handle('duplicate:find', async (event: IpcMainInvokeEvent) => {
        lastProgressTime = 0;

        const groups = await findDuplicates((progress: DuplicateProgress) => {
            // スロットリング: 100msに1回のみ送信
            const now = Date.now();
            if (now - lastProgressTime >= PROGRESS_THROTTLE_MS) {
                lastProgressTime = now;
                event.sender.send('duplicate:progress', progress);
            }

            // 完了時は必ず送信
            if (progress.phase === 'complete') {
                event.sender.send('duplicate:progress', progress);
            }
        });

        // 統計情報も計算して返す
        const stats = getDuplicateStats(groups);

        return { groups, stats };
    });

    /**
     * 検索キャンセル
     */
    ipcMain.handle('duplicate:cancel', async () => {
        cancelDuplicateSearch();
        return;
    });

    /**
     * 重複ファイル削除
     */
    ipcMain.handle('duplicate:deleteFiles', async (_event, fileIds: string[]) => {
        const fs = await import('fs');
        const { findFileById, deleteFile } = await import('../services/database');

        const results: { id: string; success: boolean; error?: string }[] = [];

        for (const fileId of fileIds) {
            try {
                const file = findFileById(fileId);
                if (!file) {
                    results.push({ id: fileId, success: false, error: 'File not found in database' });
                    continue;
                }

                // ファイルシステムから削除
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }

                // DBから削除
                deleteFile(fileId);
                results.push({ id: fileId, success: true });
            } catch (err: any) {
                results.push({ id: fileId, success: false, error: err.message });
            }
        }

        return results;
    });
}
