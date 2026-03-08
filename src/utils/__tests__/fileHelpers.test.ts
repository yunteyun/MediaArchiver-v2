import { describe, expect, it } from 'vitest';
import { getArchiveImageCount, isAudioArchive } from '../fileHelpers';
import type { MediaFile } from '../../types/file';

function createArchiveFile(metadata?: unknown): MediaFile {
    return {
        id: 'archive-1',
        name: 'sample.cbz',
        path: 'C:\\library\\sample.cbz',
        size: 100,
        type: 'archive',
        createdAt: 1,
        tags: [],
        metadata: metadata === undefined ? undefined : JSON.stringify(metadata),
        accessCount: 0,
        lastAccessedAt: null,
        externalOpenCount: 0,
        lastExternalOpenedAt: null,
    };
}

describe('fileHelpers', () => {
    it('detects audio archives from entry list or legacy flag', () => {
        expect(isAudioArchive(createArchiveFile({ audioEntries: ['track01.mp3'] }))).toBe(true);
        expect(isAudioArchive(createArchiveFile({ hasAudio: true }))).toBe(true);
        expect(isAudioArchive(createArchiveFile({ audioEntries: [] }))).toBe(false);
    });

    it('reads archive image count from current and legacy metadata shapes', () => {
        expect(getArchiveImageCount(createArchiveFile({ imageEntries: ['1.jpg', '2.jpg', '3.jpg'] }))).toBe(3);
        expect(getArchiveImageCount(createArchiveFile({ imageCount: 8 }))).toBe(8);
        expect(getArchiveImageCount(createArchiveFile({ pageCount: 12 }))).toBe(12);
        expect(getArchiveImageCount(createArchiveFile({ fileCount: 20 }))).toBe(20);
    });

    it('returns null for invalid or non-archive metadata', () => {
        const imageFile: MediaFile = {
            ...createArchiveFile({ imageEntries: ['1.jpg'] }),
            type: 'image',
            name: 'sample.png',
            path: 'C:\\library\\sample.png',
        };

        expect(getArchiveImageCount(createArchiveFile({ imageCount: -1 }))).toBe(null);
        expect(getArchiveImageCount(createArchiveFile('{invalid-json'))).toBe(null);
        expect(getArchiveImageCount(imageFile)).toBe(null);
    });
});
