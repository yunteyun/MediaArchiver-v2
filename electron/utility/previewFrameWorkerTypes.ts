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

export interface PreviewFrameJobRequest {
    type: 'worker:run-preview-job';
    requestId: string;
    videoPath: string;
    frameDir: string;
    frameCount: number;
    frameWidth: number;
    quality: number;
}

export interface VideoThumbnailJobRequest {
    type: 'worker:run-video-thumbnail-job';
    requestId: string;
    videoPath: string;
    outputPath: string;
    resolution: number;
    quality: number;
}

export interface VideoDurationJobRequest {
    type: 'worker:read-video-duration-job';
    requestId: string;
    filePath: string;
}

export interface AudioThumbnailJobRequest {
    type: 'worker:run-audio-thumbnail-job';
    requestId: string;
    audioPath: string;
    outputPath: string;
}

export interface MediaMetadataJobRequest {
    type: 'worker:read-media-metadata-job';
    requestId: string;
    filePath: string;
}

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

export interface AudioThumbnailJobSuccess {
    type: 'worker:audio-thumbnail-job-success';
    requestId: string;
    thumbnailPath: string | null;
}

export interface MediaMetadataJobSuccess {
    type: 'worker:media-metadata-job-success';
    requestId: string;
    metadata: ExtractedMediaMetadata | null;
}

export interface WorkerJobFailure {
    type: 'worker:job-failure';
    requestId: string;
    error: string;
}

export interface PreviewFrameWorkerReady {
    type: 'worker:ready';
}

export type PreviewFrameWorkerMessage =
    | PreviewFrameJobRequest
    | VideoThumbnailJobRequest
    | VideoDurationJobRequest
    | AudioThumbnailJobRequest
    | MediaMetadataJobRequest
    | PreviewFrameJobSuccess
    | VideoThumbnailJobSuccess
    | VideoDurationJobSuccess
    | AudioThumbnailJobSuccess
    | MediaMetadataJobSuccess
    | WorkerJobFailure
    | PreviewFrameWorkerReady;
