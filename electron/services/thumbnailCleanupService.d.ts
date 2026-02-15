/**
 * Thumbnail Cleanup Service - サムネイル診断・クリーンアップ
 *
 * DBに存在しないサムネイルファイル（孤立サムネイル）を検出する。
 * Phase 12-1.5: 診断機能のみ実装（削除機能は Phase 12-6 で実装予定）
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
 * アーキテクチャレビュー対応:
 * - IPCペイロード軽量化: サンプル最大10件に制限
 * - パス比較の厳密化: path.normalize() で正規化
 */
export declare function diagnoseThumbnails(profileId: string): Promise<DiagnosticResult>;
/**
 * 孤立サムネイルをクリーンアップ（削除）
 * Phase 12-6: ストレージクリーンアップ機能
 */
export declare function cleanupOrphanedThumbnails(profileId: string): Promise<CleanupResult>;
