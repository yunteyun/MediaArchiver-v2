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
    | PreviewFrameJobSuccess
    | VideoThumbnailJobSuccess
    | WorkerJobFailure
    | PreviewFrameWorkerReady;
