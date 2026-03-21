import { describe, expect, it } from 'vitest';
import { resolvePreviewWorkerLane } from '../previewWorkerQueue';

describe('resolvePreviewWorkerLane', () => {
    it('routes heavy thumbnail and preview jobs to the heavy lane', () => {
        expect(resolvePreviewWorkerLane('worker:run-preview-job')).toBe('heavy');
        expect(resolvePreviewWorkerLane('worker:run-video-thumbnail-job')).toBe('heavy');
        expect(resolvePreviewWorkerLane('worker:run-audio-thumbnail-job')).toBe('heavy');
    });

    it('routes metadata reads to the read lane', () => {
        expect(resolvePreviewWorkerLane('worker:read-video-duration-job')).toBe('read');
        expect(resolvePreviewWorkerLane('worker:read-media-metadata-job')).toBe('read');
    });
});
