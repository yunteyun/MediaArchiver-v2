export type FfmpegWorkerJobSource = 'scan' | 'interactive';

export interface ExtractedMediaMetadata {
    width?: number;
    height?: number;
    format?: string;
    container?: string;
    codec?: string;
    videoCodec?: string;
    audioCodec?: string;
    fps?: number;
    bitrate?: number;
}

interface FfmpegWorkerBaseRequest {
    requestId: string;
    jobSource: FfmpegWorkerJobSource;
}

export interface PreviewFrameJobRequest extends FfmpegWorkerBaseRequest {
    type: 'worker:run-preview-job';
    videoPath: string;
    frameDir: string;
    frameCount: number;
    frameWidth: number;
    quality: number;
}

export interface VideoThumbnailJobRequest extends FfmpegWorkerBaseRequest {
    type: 'worker:run-video-thumbnail-job';
    videoPath: string;
    outputPath: string;
    resolution: number;
    quality: number;
}

export interface VideoDurationJobRequest extends FfmpegWorkerBaseRequest {
    type: 'worker:read-video-duration-job';
    filePath: string;
}

export interface MediaMetadataJobRequest extends FfmpegWorkerBaseRequest {
    type: 'worker:read-media-metadata-job';
    filePath: string;
}

export type FfmpegWorkerRequest =
    | PreviewFrameJobRequest
    | VideoThumbnailJobRequest
    | VideoDurationJobRequest
    | MediaMetadataJobRequest;

export interface PreviewFrameJobSuccess {
    type: 'worker:preview-job-success';
    requestId: string;
    framePaths: string[] | null;
}

export interface VideoThumbnailJobSuccess {
    type: 'worker:video-thumbnail-job-success';
    requestId: string;
    thumbnailPath: string | null;
}

export interface VideoDurationJobSuccess {
    type: 'worker:video-duration-job-success';
    requestId: string;
    durationSeconds: number;
}

export interface MediaMetadataJobSuccess {
    type: 'worker:media-metadata-job-success';
    requestId: string;
    metadata: ExtractedMediaMetadata | null;
}

export type FfmpegWorkerSuccessMessage =
    | PreviewFrameJobSuccess
    | VideoThumbnailJobSuccess
    | VideoDurationJobSuccess
    | MediaMetadataJobSuccess;

export interface FfmpegWorkerJobFailure {
    type: 'worker:job-failure';
    requestId: string;
    error: string;
}

export interface FfmpegWorkerReady {
    type: 'worker:ready';
}

export type FfmpegWorkerMessage =
    | FfmpegWorkerRequest
    | FfmpegWorkerSuccessMessage
    | FfmpegWorkerJobFailure
    | FfmpegWorkerReady;
