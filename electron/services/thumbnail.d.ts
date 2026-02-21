export declare function generateThumbnail(filePath: string, resolution?: number): Promise<string | null>;
/**
 * 動画からプレビューフレームを生成（スクラブ用）
 * Phase 24: 320px x10枚 → 256px x6枚 WebP に軽量化
 * @param videoPath 動画ファイルパス
 * @param frameCount 生成するフレーム数（デフォルト: 6）
 * @returns カンマ区切りのフレームパス文字列
 */
export declare function generatePreviewFrames(videoPath: string, frameCount?: number): Promise<string | null>;
export declare function getVideoDuration(videoPath: string): Promise<string>;
export declare function checkIsAnimated(filePath: string): Promise<boolean>;
/**
 * 全ファイルのサムネイルを一括再生成（WebP化）
 * Phase 24: 安全な順序で実行（生成→DB更新→旧ファイル削除）
 * @param files 再生成対象ファイルリスト
 * @param updateDB DB更新コールバック
 * @param onProgress 進捗コールバック
 */
export declare function regenerateAllThumbnails(files: {
    id: string;
    path: string;
    type: string;
    thumbnailPath: string | null;
}[], updateDB: (fileId: string, newThumbnailPath: string) => Promise<void>, onProgress: (current: number, total: number) => void): Promise<{
    success: number;
    failed: number;
}>;
