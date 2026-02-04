/**
 * pathValidator.ts - ファイルパス検証ユーティリティ
 * 
 * Phase 10-4: ファイルパス検証とエラーハンドリング強化
 * - Windows 260文字パス制限対応
 * - 無効文字チェック
 * - アクセス権限検証
 */

import fs from 'fs';
import { logger } from './logger';

const log = logger.scope('PathValidator');

// Windowsパス長制限
export const MAX_PATH_LENGTH = 260;

// Windowsファイル名の無効文字
const INVALID_FILENAME_CHARS = /[<>:"|?*\x00-\x1f]/;

// パス検証結果
export interface PathValidationResult {
    valid: boolean;
    error?: 'too_long' | 'invalid_chars' | 'inaccessible' | 'not_found';
    message?: string;
}

/**
 * パス長を検証
 * @param filePath ファイルパス
 * @returns 有効な場合true
 */
export function validatePathLength(filePath: string): boolean {
    try {
        return filePath.length <= MAX_PATH_LENGTH;
    } catch {
        return false;
    }
}

/**
 * 無効文字をチェック
 * @param filePath ファイルパス
 * @returns 有効な場合true（無効文字がない）
 */
export function validatePathChars(filePath: string): boolean {
    try {
        // ファイル名部分のみチェック（ドライブレターのコロンは許可）
        const parts = filePath.split(/[\\/]/);
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part && INVALID_FILENAME_CHARS.test(part)) {
                return false;
            }
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * アクセス権限を検証（同期版）
 * @param filePath ファイルパス
 * @returns アクセス可能な場合true
 */
export function validateAccessSync(filePath: string): boolean {
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * アクセス権限を検証（非同期版）
 * @param filePath ファイルパス
 * @returns アクセス可能な場合true
 */
export async function validateAccess(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * 総合的なパス検証（同期版）
 * スキャンループ内での高速な検証用
 * @param filePath ファイルパス
 * @returns 検証結果
 */
export function validatePathSync(filePath: string): PathValidationResult {
    try {
        // 1. パス長チェック
        if (!validatePathLength(filePath)) {
            return {
                valid: false,
                error: 'too_long',
                message: `Path exceeds ${MAX_PATH_LENGTH} characters`
            };
        }

        // 2. 無効文字チェック
        if (!validatePathChars(filePath)) {
            return {
                valid: false,
                error: 'invalid_chars',
                message: 'Path contains invalid characters'
            };
        }

        // 3. アクセス権限チェック
        if (!validateAccessSync(filePath)) {
            return {
                valid: false,
                error: 'inaccessible',
                message: 'Path is not accessible'
            };
        }

        return { valid: true };
    } catch (err) {
        // 検証関数自体がクラッシュしないよう、すべての例外をキャッチ
        log.warn('Path validation failed unexpectedly:', err);
        return {
            valid: false,
            error: 'inaccessible',
            message: 'Validation failed unexpectedly'
        };
    }
}

/**
 * 総合的なパス検証（非同期版）
 * @param filePath ファイルパス
 * @returns 検証結果
 */
export async function validatePath(filePath: string): Promise<PathValidationResult> {
    try {
        // 1. パス長チェック
        if (!validatePathLength(filePath)) {
            return {
                valid: false,
                error: 'too_long',
                message: `Path exceeds ${MAX_PATH_LENGTH} characters`
            };
        }

        // 2. 無効文字チェック
        if (!validatePathChars(filePath)) {
            return {
                valid: false,
                error: 'invalid_chars',
                message: 'Path contains invalid characters'
            };
        }

        // 3. アクセス権限チェック
        if (!(await validateAccess(filePath))) {
            return {
                valid: false,
                error: 'inaccessible',
                message: 'Path is not accessible'
            };
        }

        return { valid: true };
    } catch (err) {
        log.warn('Path validation failed unexpectedly:', err);
        return {
            valid: false,
            error: 'inaccessible',
            message: 'Validation failed unexpectedly'
        };
    }
}

/**
 * ファイルシステムエラーが「よくあること」かどうかを判定
 * EPERM, EACCES, ENOENT, ENAMETOOLONG はスキップ対象
 */
export function isSkippableError(err: unknown): boolean {
    if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code: string }).code;
        return ['EPERM', 'EACCES', 'ENOENT', 'ENAMETOOLONG', 'EBUSY'].includes(code);
    }
    return false;
}

/**
 * エラーコードを取得
 */
export function getErrorCode(err: unknown): string | undefined {
    if (err && typeof err === 'object' && 'code' in err) {
        return (err as { code: string }).code;
    }
    return undefined;
}
