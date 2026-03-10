import { describe, expect, it } from 'vitest';
import { buildVisibleFiles, sortFiles, type FileListQueryOptions } from '../fileListQuery';
import type { MediaFile } from '../../types/file';
import { DEFAULT_RATING_DISPLAY_THRESHOLDS } from '../../shared/ratingDisplayThresholds';

function createFile(overrides: Partial<MediaFile>): MediaFile {
    return {
        id: overrides.id ?? 'file-1',
        name: overrides.name ?? 'sample.png',
        path: overrides.path ?? 'C:\\library\\folder\\sample.png',
        size: overrides.size ?? 100,
        type: overrides.type ?? 'image',
        createdAt: overrides.createdAt ?? 1,
        tags: overrides.tags ?? [],
        metadata: overrides.metadata,
        duration: overrides.duration,
        thumbnailPath: overrides.thumbnailPath,
        previewFrames: overrides.previewFrames,
        rootFolderId: overrides.rootFolderId,
        mtimeMs: overrides.mtimeMs,
        notes: overrides.notes,
        isAnimated: overrides.isAnimated,
        contentHash: overrides.contentHash,
        accessCount: overrides.accessCount ?? 0,
        lastAccessedAt: overrides.lastAccessedAt ?? null,
        externalOpenCount: overrides.externalOpenCount ?? 0,
        lastExternalOpenedAt: overrides.lastExternalOpenedAt ?? null,
    };
}

function createQueryOptions(overrides: Partial<FileListQueryOptions> = {}): FileListQueryOptions {
    return {
        sortBy: overrides.sortBy ?? 'name',
        sortOrder: overrides.sortOrder ?? 'asc',
        fileTagsCache: overrides.fileTagsCache ?? new Map(),
        selectedTagIds: overrides.selectedTagIds ?? [],
        filterMode: overrides.filterMode ?? 'OR',
        ratingFilter: overrides.ratingFilter ?? {},
        fileRatings: overrides.fileRatings ?? {},
        overallRatingAxisId: overrides.overallRatingAxisId ?? null,
        ratingQuickFilter: overrides.ratingQuickFilter ?? 'none',
        ratingDisplayThresholds: overrides.ratingDisplayThresholds ?? DEFAULT_RATING_DISPLAY_THRESHOLDS,
        searchConditions: overrides.searchConditions ?? [],
        selectedFileTypes: overrides.selectedFileTypes ?? ['video', 'image', 'archive', 'audio'],
    };
}

describe('fileListQuery', () => {
    it('sorts by last accessed in descending order while keeping nulls last', () => {
        const files = [
            createFile({ id: 'old', name: 'old.png', lastAccessedAt: 100 }),
            createFile({ id: 'new', name: 'new.png', lastAccessedAt: 300 }),
            createFile({ id: 'never', name: 'never.png', lastAccessedAt: null }),
        ];

        const result = sortFiles(files, 'lastAccessed', 'desc');

        expect(result.map((file) => file.id)).toEqual(['new', 'old', 'never']);
    });

    it('applies tag, rating, search, and file type filters together', () => {
        const files = [
            createFile({ id: 'match', name: 'Hero Poster.png', path: 'C:\\library\\Blue Team\\Hero Poster.png', type: 'image' }),
            createFile({ id: 'wrong-tag', name: 'Hero Poster 2.png', path: 'C:\\library\\Blue Team\\Hero Poster 2.png', type: 'image' }),
            createFile({ id: 'wrong-folder', name: 'Hero Poster 3.png', path: 'C:\\library\\Red Team\\Hero Poster 3.png', type: 'image' }),
            createFile({ id: 'wrong-type', name: 'Hero Theme.mp3', path: 'C:\\library\\Blue Team\\Hero Theme.mp3', type: 'audio' }),
        ];

        const result = buildVisibleFiles(files, createQueryOptions({
            sortBy: 'name',
            sortOrder: 'asc',
            fileTagsCache: new Map([
                ['match', ['tag-hero', 'tag-blue']],
                ['wrong-tag', ['tag-blue']],
                ['wrong-folder', ['tag-hero', 'tag-blue']],
                ['wrong-type', ['tag-hero', 'tag-blue']],
            ]),
            selectedTagIds: ['tag-hero', 'tag-blue'],
            filterMode: 'AND',
            ratingFilter: { overall: { min: 4 } },
            fileRatings: {
                match: { overall: 5 },
                'wrong-tag': { overall: 5 },
                'wrong-folder': { overall: 5 },
                'wrong-type': { overall: 5 },
            },
            searchConditions: [
                { text: 'hero', target: 'fileName' },
                { text: 'blue team', target: 'folderName' },
            ],
            selectedFileTypes: ['image'],
        }));

        expect(result.map((file) => file.id)).toEqual(['match']);
    });

    it('sorts by overall rating and supports quick filters', () => {
        const files = [
            createFile({ id: 'unrated', name: 'unrated.png' }),
            createFile({ id: 'high', name: 'high.png' }),
            createFile({ id: 'mid', name: 'mid.png' }),
        ];

        const sorted = sortFiles(
            files,
            'overallRating',
            'desc',
            {
                high: { overall: 5 },
                mid: { overall: 3 },
            },
            'overall'
        );
        expect(sorted.map((file) => file.id)).toEqual(['high', 'mid', 'unrated']);

        const midOrAbove = buildVisibleFiles(files, createQueryOptions({
            fileRatings: {
                high: { overall: 5 },
                mid: { overall: 3 },
            },
            overallRatingAxisId: 'overall',
            ratingQuickFilter: 'midOrAbove',
        }));
        expect(midOrAbove.map((file) => file.id)).toEqual(['high', 'mid']);

        const unrated = buildVisibleFiles(files, createQueryOptions({
            fileRatings: {
                high: { overall: 5 },
                mid: { overall: 3 },
            },
            overallRatingAxisId: 'overall',
            ratingQuickFilter: 'unrated',
        }));
        expect(unrated.map((file) => file.id)).toEqual(['unrated']);

        const raisedThreshold = buildVisibleFiles(files, createQueryOptions({
            fileRatings: {
                high: { overall: 5 },
                mid: { overall: 3 },
            },
            overallRatingAxisId: 'overall',
            ratingQuickFilter: 'midOrAbove',
            ratingDisplayThresholds: {
                mid: 4,
                high: 4.5,
            },
        }));
        expect(raisedThreshold.map((file) => file.id)).toEqual(['high']);
    });
});
