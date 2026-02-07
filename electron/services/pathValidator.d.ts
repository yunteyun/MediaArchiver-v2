/**
 * pathValidator.ts - ファイルパス検証ユーティリティ
 *
 * Phase 10-4: ファイルパス検証とエラーハンドリング強化
 * - Windows 260文字パス制限対応
 * - 無効文字チェック
 * - アクセス権限検証
 */
export declare const MAX_PATH_LENGTH = 260;
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
export declare function validatePathLength(filePath: string): boolean;
/**
 * 無効文字をチェック
 * @param filePath ファイルパス
 * @returns 有効な場合true（無効文字がない）
 */
export declare function validatePathChars(filePath: string): boolean;
/**
 * アクセス権限を検証（同期版）
 * @param filePath ファイルパス
 * @returns アクセス可能な場合true
 */
export declare function validateAccessSync(filePath: string): boolean;
/**
 * アクセス権限を検証（非同期版）
 * @param filePath ファイルパス
 * @returns アクセス可能な場合true
 */
export declare function validateAccess(filePath: string): Promise<boolean>;
/**
 * 総合的なパス検証（同期版）
 * スキャンループ内での高速な検証用
 * @param filePath ファイルパス
 * @returns 検証結果
 */
export declare function validatePathSync(filePath: string): PathValidationResult;
/**
 * 総合的なパス検証（非同期版）
 * @param filePath ファイルパス
 * @returns 検証結果
 */
export declare function validatePath(filePath: string): Promise<PathValidationResult>;
/**
 * ファイルシステムエラーが「よくあること」かどうかを判定
 * EPERM, EACCES, ENOENT, ENAMETOOLONG はスキップ対象
 */
export declare function isSkippableError(err: unknown): boolean;
/**
 * エラーコードを取得
 */
export declare function getErrorCode(err: unknown): string | undefined;
