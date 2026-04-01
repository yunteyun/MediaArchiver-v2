/**
 * Duplicate IPC Handlers - 重複検出のIPC通信
 * 
 * 進捗イベントは50-100msに1回に間引き（IPCスロットリング）
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { existsSync } from 'fs';
import {
    findDuplicates,
    cancelDuplicateSearch,
    getDuplicateStats,
    DuplicateProgress
} from '../services/duplicateService';
import { findFileById, deleteFile } from '../services/database';
import { deleteFileSafe } from '../services/fileOperationService';
import type { DuplicateSearchMode } from '../../src/shared/duplicateNameCandidates';

// 進捗スロットリング用の状態
let lastProgressTime = 0;
const PROGRESS_THROTTLE_MS = 100; // 100msに1回

export function registerDuplicateHandlers() {
    /**
     * 重複ファイル検索
     */
    ipcMain.handle('duplicate:find', async (event: IpcMainInvokeEvent, mode: DuplicateSearchMode = 'exact') => {
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
        }, mode);

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
        const results: { id: string; success: boolean; error?: string }[] = [];

        for (const fileId of fileIds) {
            try {
                const file = findFileById(fileId);
                if (!file) {
                    results.push({ id: fileId, success: false, error: 'File not found in database' });
                    continue;
                }

                // ファイルシステムから削除（安全のため強制的にゴミ箱へ移動）
                if (existsSync(file.path)) {
                    const result = await deleteFileSafe(file.path, true);
                    if (!result.success) {
                        results.push({ id: fileId, success: false, error: result.error });
                        continue;
                    }
                }

                // DBから削除
                deleteFile(fileId);
                results.push({ id: fileId, success: true });
            } catch (err) {
                results.push({ id: fileId, success: false, error: err instanceof Error ? err.message : String(err) });
            }
        }

        return results;
    });
}
