export declare function generateThumbnail(filePath: string): Promise<string | null>;
/**
 * 動画からプレビューフレームを生成（スクラブ用）
 * @param videoPath 動画ファイルパス
 * @param frameCount 生成するフレーム数（デフォルト: 10）
 * @returns カンマ区切りのフレームパス文字列
 */
export declare function generatePreviewFrames(videoPath: string, frameCount?: number): Promise<string | null>;
export declare function getVideoDuration(videoPath: string): Promise<string>;
export declare function checkIsAnimated(filePath: string): Promise<boolean>;
