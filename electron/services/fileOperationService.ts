/**
 * File Operation Service - ファイル操作の共通サービス
 * 
 * ファイル削除を安全に行うための共通ロジック。
 * デフォルトでゴミ箱に移動し、ユーザーの明示的な選択で完全削除も可能。
 */

import { shell } from 'electron';
import { unlink, access } from 'fs/promises';
import { constants } from 'fs';
import { logger } from './logger';

const log = logger.scope('FileOperation');

export interface DeleteResult {
    success: boolean;
    method: 'trash' | 'permanent' | 'none';
    error?: string;
}

/**
 * ファイルを安全に削除する
 * @param filePath 削除対象ファイルのパス
 * @param moveToTrash true: ゴミ箱に移動（デフォルト）, false: 完全削除
 * @returns 削除結果
 */
export async function deleteFileSafe(
    filePath: string,
    moveToTrash: boolean = true
): Promise<DeleteResult> {
    log.info(`Deleting file: ${filePath}, method: ${moveToTrash ? 'trash' : 'permanent'}`);

    try {
        // ファイルの存在確認
        try {
            await access(filePath, constants.F_OK);
        } catch {
            log.warn(`File not found: ${filePath}`);
            return {
                success: false,
                method: 'none',
                error: 'ファイルが見つかりません'
            };
        }

        if (moveToTrash) {
            // ゴミ箱に移動
            try {
                await shell.trashItem(filePath);
                log.info(`File moved to trash: ${filePath}`);
                return {
                    success: true,
                    method: 'trash'
                };
            } catch (error) {
                // ゴミ箱移動に失敗した場合（Linux環境など）
                const errorMessage = error instanceof Error ? error.message : String(error);
                log.error(`Failed to move to trash: ${errorMessage}`);
                return {
                    success: false,
                    method: 'trash',
                    error: `ゴミ箱への移動に失敗しました: ${errorMessage}`
                };
            }
        } else {
            // 完全削除
            await unlink(filePath);
            log.info(`File permanently deleted: ${filePath}`);
            return {
                success: true,
                method: 'permanent'
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Delete failed: ${errorMessage}`);
        return {
            success: false,
            method: moveToTrash ? 'trash' : 'permanent',
            error: errorMessage
        };
    }
}
