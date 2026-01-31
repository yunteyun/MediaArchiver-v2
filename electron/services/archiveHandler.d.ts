/**
 * Archive Handler - 書庫ファイル処理サービス
 *
 * ZIP, RAR, 7Z, CBZ, CBR などの書庫ファイルを処理し、
 * メタデータ取得、サムネイル生成、プレビュー画像抽出を行う。
 */
export interface ArchiveMetadata {
    fileCount: number;
    firstImageEntry: string | null;
    imageEntries: string[];
}
export interface ArchiveError {
    code: 'NO_IMAGES' | 'EXTRACTION_FAILED' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNKNOWN';
    message: string;
}
/**
 * ファイルが書庫ファイルかどうかを判定
 */
export declare function isArchive(filePath: string): boolean;
/**
 * 書庫ファイルのメタデータ（画像リスト）を取得
 */
export declare function getArchiveMetadata(filePath: string): Promise<ArchiveMetadata | null>;
/**
 * 書庫ファイルからサムネイル用の最初の画像を抽出
 */
export declare function getArchiveThumbnail(filePath: string): Promise<string | null>;
/**
 * 書庫ファイルから複数のプレビュー画像を抽出
 * @param filePath - 書庫ファイルパス
 * @param limit - 取得する画像の最大数（デフォルト: 9）
 */
export declare function getArchivePreviewFrames(filePath: string, limit?: number): Promise<string[]>;
/**
 * 一時ディレクトリをクリーンアップ
 */
export declare function cleanTempArchives(): void;
