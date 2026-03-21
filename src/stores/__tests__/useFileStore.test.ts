import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFileStore } from '../useFileStore';
import type { MediaFile } from '../../types/file';

function createFile(overrides: Partial<MediaFile> = {}): MediaFile {
    return {
        id: overrides.id ?? 'file-1',
        name: overrides.name ?? 'sample.png',
        path: overrides.path ?? 'C:\\library\\sample.png',
        size: overrides.size ?? 100,
        type: overrides.type ?? 'image',
        createdAt: overrides.createdAt ?? 1,
        tags: overrides.tags ?? [],
        duration: overrides.duration,
        thumbnailPath: overrides.thumbnailPath,
        previewFrames: overrides.previewFrames,
        rootFolderId: overrides.rootFolderId,
        contentHash: overrides.contentHash,
        metadata: overrides.metadata,
        mtimeMs: overrides.mtimeMs,
        notes: overrides.notes,
        isAnimated: overrides.isAnimated,
        accessCount: overrides.accessCount ?? 0,
        lastAccessedAt: overrides.lastAccessedAt ?? null,
        externalOpenCount: overrides.externalOpenCount ?? 0,
        lastExternalOpenedAt: overrides.lastExternalOpenedAt ?? null,
        playbackPositionSeconds: overrides.playbackPositionSeconds ?? null,
        playbackPositionUpdatedAt: overrides.playbackPositionUpdatedAt ?? null,
    };
}

describe('useFileStore', () => {
    beforeEach(() => {
        useFileStore.setState({
            files: [],
            fileMap: new Map(),
            selectedIds: new Set(),
            focusedId: null,
            anchorId: null,
            currentFolderId: null,
            fileTagsCache: new Map(),
            folderFileCounts: {},
            folderThumbnails: {},
        });
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('debounces tag cache reload after setting files', async () => {
        vi.useFakeTimers();
        const getFileTagIdsForFiles = vi.fn().mockResolvedValue({
            'file-1': ['tag-a'],
            'file-2': ['tag-b', 'tag-c'],
        });

        vi.stubGlobal('window', {
            electronAPI: {
                getAllFileTagIds: vi.fn(),
                getFileTagIdsForFiles,
                getFileById: vi.fn(),
            },
        });

        useFileStore.getState().setFiles([createFile({ id: 'file-1' })]);
        useFileStore.getState().setFiles([createFile({ id: 'file-1' }), createFile({ id: 'file-2' })]);

        expect(getFileTagIdsForFiles).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(250);
        await Promise.resolve();

        expect(getFileTagIdsForFiles).toHaveBeenCalledTimes(1);
        expect(getFileTagIdsForFiles).toHaveBeenCalledWith(['file-1', 'file-2']);
        expect(useFileStore.getState().fileTagsCache).toEqual(new Map([
            ['file-1', ['tag-a']],
            ['file-2', ['tag-b', 'tag-c']],
        ]));
    });

    it('refreshes a file in both files and fileMap', async () => {
        const original = createFile({ id: 'file-1', name: 'before.png' });
        const updated = createFile({ id: 'file-1', name: 'after.png', notes: 'updated' });
        useFileStore.setState({
            files: [original],
            fileMap: new Map([[original.id, original]]),
        });

        const getFileById = vi.fn().mockResolvedValue(updated);
        vi.stubGlobal('window', {
            electronAPI: {
                getAllFileTagIds: vi.fn(),
                getFileTagIdsForFiles: vi.fn(),
                getFileById,
            },
        });

        await useFileStore.getState().refreshFile('file-1');

        expect(getFileById).toHaveBeenCalledWith('file-1');
        expect(useFileStore.getState().files[0]?.name).toBe('after.png');
        expect(useFileStore.getState().fileMap.get('file-1')?.notes).toBe('updated');
    });

    it('removes file state from list, map, selection, and tag cache', () => {
        const first = createFile({ id: 'file-1' });
        const second = createFile({ id: 'file-2' });
        useFileStore.setState({
            files: [first, second],
            fileMap: new Map([
                [first.id, first],
                [second.id, second],
            ]),
            selectedIds: new Set(['file-1', 'file-2']),
            fileTagsCache: new Map([
                ['file-1', ['tag-a']],
                ['file-2', ['tag-b']],
            ]),
        });

        useFileStore.getState().removeFile('file-1');

        const state = useFileStore.getState();
        expect(state.files.map((file) => file.id)).toEqual(['file-2']);
        expect(state.fileMap.has('file-1')).toBe(false);
        expect(Array.from(state.selectedIds)).toEqual(['file-2']);
        expect(state.fileTagsCache.has('file-1')).toBe(false);
    });

    it('updates playback position in both files and fileMap', () => {
        const original = createFile({ id: 'file-1', type: 'video' });
        useFileStore.setState({
            files: [original],
            fileMap: new Map([[original.id, original]]),
        });

        useFileStore.getState().updatePlaybackPosition('file-1', 123.4, 456);

        expect(useFileStore.getState().files[0]?.playbackPositionSeconds).toBe(123.4);
        expect(useFileStore.getState().files[0]?.playbackPositionUpdatedAt).toBe(456);
        expect(useFileStore.getState().fileMap.get('file-1')?.playbackPositionSeconds).toBe(123.4);
        expect(useFileStore.getState().fileMap.get('file-1')?.playbackPositionUpdatedAt).toBe(456);
    });
});
