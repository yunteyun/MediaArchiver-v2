export type PreviewWorkerRequestType =
    | 'worker:run-preview-job'
    | 'worker:run-video-thumbnail-job'
    | 'worker:read-video-duration-job'
    | 'worker:run-audio-thumbnail-job'
    | 'worker:read-media-metadata-job';

export type PreviewWorkerLane = 'heavy' | 'read';

export function resolvePreviewWorkerLane(requestType: PreviewWorkerRequestType): PreviewWorkerLane {
    switch (requestType) {
        case 'worker:run-preview-job':
        case 'worker:run-video-thumbnail-job':
        case 'worker:run-audio-thumbnail-job':
            return 'heavy';
        case 'worker:read-video-duration-job':
        case 'worker:read-media-metadata-job':
            return 'read';
        default: {
            const exhaustiveCheck: never = requestType;
            return exhaustiveCheck;
        }
    }
}
