/**
 * Thumbnail Cleanup Service - サムネイル診断・クリーンアップ
 *
 * 「サムネイルDirにあるが、DBに登録がないファイル」を孤立サムネイルとして検出する。
 * Phase 25対応: getBasePath() を使用して保存場所を動的取得
 */
export interface OrphanedThumbnail {
    path: string;
    size: number;
}
export interface DiagnosticResult {
    totalThumbnails: number;
    orphanedCount: number;
    totalOrphanedSize: number;
    orphanedFiles: string[];
    samples: OrphanedThumbnail[];
}
export interface CleanupResult {
    success: boolean;
    deletedCount: number;
    freedBytes: number;
    errors: string[];
}
/**
 * 孤立サムネイルの診断
 *
 * 定義: サムネイルDir上に存在するが、現在のDBに thumbnail_path / preview_frames
 *       として登録されていないファイル = 孤立サムネイル
 *
 * bg: フォルダを登録から除外してもfilesテーブルのレコードは残るが、
 *     DB上に残ったままでも実際のサムネイルファイルが参照されなければ「孤立」。
 *     ただし最も直接的な孤立は「Dirにあるがどのファイルのthumbnail_pathにも含まれない」。
 */
export declare function diagnoseThumbnails(profileId: string): Promise<DiagnosticResult>;
/**
 * 孤立サムネイルをクリーンアップ（削除）
 * Phase 12-6: ストレージクリーンアップ機能
 */
export declare function cleanupOrphanedThumbnails(profileId: string): Promise<CleanupResult>;
