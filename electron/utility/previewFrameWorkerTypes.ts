export interface PreviewFrameJobRequest {
    type: 'worker:run-preview-job';
    requestId: string;
    videoPath: string;
    frameDir: string;
    frameCount: number;
    frameWidth: number;
    quality: number;
}

export interface PreviewFrameJobSuccess {
    type: 'worker:preview-job-success';
    requestId: string;
    framePaths: string[] | null;
}

export interface PreviewFrameJobFailure {
    type: 'worker:preview-job-failure';
    requestId: string;
    error: string;
}

export interface PreviewFrameWorkerReady {
    type: 'worker:ready';
}

export type PreviewFrameWorkerMessage =
    | PreviewFrameJobRequest
    | PreviewFrameJobSuccess
    | PreviewFrameJobFailure
    | PreviewFrameWorkerReady;
