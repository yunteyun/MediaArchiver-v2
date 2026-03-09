/**
 * File Operation Service - ファイル操作の共通サービス
 *
 * 削除・移動・リネームの共通ロジックを提供する。
 */

import { shell } from 'electron';
import { unlink, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { logger } from './logger';

const log = logger.scope('FileOperation');
const INVALID_WINDOWS_FILENAME_RE = /[<>:"/\\|?*\u0000-\u001f]/;
const RESERVED_WINDOWS_NAME_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

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

export function validateNewFileName(newName: string): string | null {
    const trimmed = newName.trim();
    if (!trimmed) return 'ファイル名を入力してください';
    if (trimmed === '.' || trimmed === '..') return 'そのファイル名は使用できません';
    if (INVALID_WINDOWS_FILENAME_RE.test(trimmed)) return 'ファイル名に使用できない文字が含まれています';
    if (/[.\s]$/.test(trimmed)) return 'ファイル名の末尾に空白やドットは使用できません';
    if (RESERVED_WINDOWS_NAME_RE.test(trimmed)) return '予約語のファイル名は使用できません';
    return null;
}

export async function relocateFile(
    sourcePath: string,
    targetPath: string
): Promise<{ success: boolean; error?: string }> {
    log.info(`Relocating file: ${sourcePath} -> ${targetPath}`);

    try {
        try {
            await access(sourcePath, constants.F_OK);
        } catch {
            log.warn(`Source file not found: ${sourcePath}`);
            return {
                success: false,
                error: 'ファイルが見つかりません',
            };
        }

        const normalizedSource = path.normalize(sourcePath);
        const normalizedTarget = path.normalize(targetPath);
        if (normalizedSource === normalizedTarget) {
            return { success: true };
        }

        const sourceLower = normalizedSource.toLowerCase();
        const targetLower = normalizedTarget.toLowerCase();
        const caseInsensitiveSamePath = sourceLower === targetLower;

        try {
            await access(targetPath, constants.F_OK);
            if (!caseInsensitiveSamePath) {
                log.warn(`Target file already exists: ${targetPath}`);
                return {
                    success: false,
                    error: '移動先に同名のファイルが既に存在します',
                };
            }
        } catch {
            // not exists
        }

        const { rename, copyFile, unlink: removeFile } = await import('fs/promises');

        try {
            if (caseInsensitiveSamePath) {
                const tempPath = path.join(path.dirname(sourcePath), `.__rename_tmp__${Date.now()}_${Math.random().toString(16).slice(2)}`);
                await rename(sourcePath, tempPath);
                await rename(tempPath, targetPath);
            } else {
                await rename(sourcePath, targetPath);
            }
            log.info(`File relocated successfully: ${targetPath}`);
            return { success: true };
        } catch (renameError: any) {
            if (renameError.code === 'EXDEV') {
                log.info('Cross-device relocate detected, using copy + delete');

                try {
                    await copyFile(sourcePath, targetPath);
                    await removeFile(sourcePath);
                    log.info(`File relocated successfully (copy + delete): ${targetPath}`);
                    return { success: true };
                } catch (copyError) {
                    const errorMessage = copyError instanceof Error ? copyError.message : String(copyError);
                    log.error(`Copy + delete failed: ${errorMessage}`);
                    return {
                        success: false,
                        error: `ファイル移動に失敗しました: ${errorMessage}`,
                    };
                }
            }

            throw renameError;
        }
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        const errorMessage = err?.message || String(error);
        log.error(`Relocate failed: ${errorMessage}`);

        if (err?.code === 'EEXIST') {
            return { success: false, error: '移動先に同名のファイルが既に存在します' };
        }
        if (err?.code === 'ENOENT') {
            return { success: false, error: 'ファイルが見つかりません' };
        }
        if (err?.code === 'EACCES' || err?.code === 'EPERM') {
            return { success: false, error: 'ファイルを変更する権限がありません' };
        }

        return {
            success: false,
            error: `ファイル移動に失敗しました: ${errorMessage}`,
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
    return relocateFile(sourcePath, targetPath);
}
