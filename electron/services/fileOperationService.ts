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

/**
 * Phase 18-C: ファイルを別フォルダに移動する
 * @param sourcePath 移動元ファイルパス
 * @param targetPath 移動先ファイルパス
 * @returns 移動結果
 */
export async function moveFileToFolder(
    sourcePath: string,
    targetPath: string
): Promise<{ success: boolean; error?: string }> {
    log.info(`Moving file: ${sourcePath} -> ${targetPath}`);

    try {
        // 移動元ファイルの存在確認
        try {
            await access(sourcePath, constants.F_OK);
        } catch {
            log.warn(`Source file not found: ${sourcePath}`);
            return {
                success: false,
                error: 'ファイルが見つかりません'
            };
        }

        // 移動先ファイルの存在確認（同名ファイルチェック）
        try {
            await access(targetPath, constants.F_OK);
            log.warn(`Target file already exists: ${targetPath}`);
            return {
                success: false,
                error: '移動先に同名のファイルが既に存在します'
            };
        } catch {
            // 存在しない = OK
        }

        // ファイル移動（rename は同一ドライブ内でアトミック）
        // 異なるドライブ間の場合は EXDEV エラーが発生するので copy + delete にフォールバック
        const { rename, copyFile, unlink } = await import('fs/promises');

        try {
            await rename(sourcePath, targetPath);
            log.info(`File moved successfully (rename): ${targetPath}`);
            return { success: true };
        } catch (renameError: any) {
            // EXDEV エラー（異なるドライブ間）の場合は copy + delete
            if (renameError.code === 'EXDEV') {
                log.info(`Cross-device move detected, using copy + delete`);

                try {
                    // ファイルをコピー
                    await copyFile(sourcePath, targetPath);

                    // コピー成功後、元ファイルを削除
                    await unlink(sourcePath);

                    log.info(`File moved successfully (copy + delete): ${targetPath}`);
                    return { success: true };
                } catch (copyError) {
                    const errorMessage = copyError instanceof Error ? copyError.message : String(copyError);
                    log.error(`Copy + delete failed: ${errorMessage}`);
                    return {
                        success: false,
                        error: `ファイル移動に失敗しました: ${errorMessage}`
                    };
                }
            } else {
                // その他のエラー
                throw renameError;
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Move failed: ${errorMessage}`);
        return {
            success: false,
            error: `ファイル移動に失敗しました: ${errorMessage}`
        };
    }
}
