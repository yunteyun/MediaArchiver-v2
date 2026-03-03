export declare function generateThumbnail(filePath: string, resolution?: number): Promise<string | null>;
/**
 * 動画からプレビューフレームを生成（スクラブ用）
 * @param videoPath 動画ファイルパス
 * @param frameCount 生成するフレーム数（デフォルト: 10）
 * @returns カンマ区切りのフレームパス文字列
 */
export declare function generatePreviewFrames(videoPath: string, frameCount?: number): Promise<string | null>;
export declare function getVideoDuration(videoPath: string): Promise<string>;
export declare function getMediaMetadata(filePath: string): Promise<{
    width?: number;
    height?: number;
    format?: string;
    container?: string;
    codec?: string;
    videoCodec?: string;
    audioCodec?: string;
    fps?: number;
    bitrate?: number;
} | null>;
export declare function checkIsAnimated(filePath: string): Promise<boolean>;
