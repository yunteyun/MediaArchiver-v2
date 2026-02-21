/**
 * File Operation Service - ファイル操作の共通サービス
 *
 * ファイル削除を安全に行うための共通ロジック。
 * デフォルトでゴミ箱に移動し、ユーザーの明示的な選択で完全削除も可能。
 */
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
export declare function deleteFileSafe(filePath: string, moveToTrash?: boolean): Promise<DeleteResult>;
/**
 * Phase 18-C: ファイルを別フォルダに移動する
 * @param sourcePath 移動元ファイルパス
 * @param targetPath 移動先ファイルパス
 * @returns 移動結果
 */
export declare function moveFileToFolder(sourcePath: string, targetPath: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * ファイルを安全に移動する（同期版）
 * archiveHandlerなどから利用。異なるドライブ間(EXDEV)の移動にも対応。
 * @param srcPath 移動元パス
 * @param destPath 移動先パス
 * @returns 成功した場合はtrue、スキップされた場合はfalse
 */
export declare function safeMoveFileSync(srcPath: string, destPath: string): boolean;
