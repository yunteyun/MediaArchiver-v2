/**
 * Hash Service - ファイルハッシュ計算サービス
 *
 * SHA256ハッシュを計算。大ファイルにはストリーム処理を使用。
 * エラー時（EBUSY等）はnullを返し、呼び出し元でスキップ処理を行う。
 */
export interface HashOptions {
    /** 部分ハッシュモード（先頭1MB + 末尾1MBのみ計算） */
    partial?: boolean;
}
/**
 * ファイルのSHA256ハッシュを計算
 *
 * @param filePath ファイルパス
 * @param options オプション
 * @returns ハッシュ値（16進数文字列）、エラー時はnull
 */
export declare function calculateFileHash(filePath: string, options?: HashOptions): Promise<string | null>;
/**
 * 複数ファイルのハッシュを一括計算
 *
 * @param filePaths ファイルパス配列
 * @param options オプション
 * @param onProgress 進捗コールバック
 * @returns Map<filePath, hash | null>
 */
export declare function calculateMultipleHashes(filePaths: string[], options?: HashOptions, onProgress?: (current: number, total: number, filePath: string) => void): Promise<Map<string, string | null>>;
