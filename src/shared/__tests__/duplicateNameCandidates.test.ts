import { describe, expect, it } from 'vitest';
import {
    buildSimilarNameCandidateGroups,
    getSimilarNameCandidateKeys,
} from '../duplicateNameCandidates';

describe('duplicateNameCandidates', () => {
    it('normalizes separators and casing into the same candidate key', () => {
        expect(getSimilarNameCandidateKeys('My File-01.JPG')).toEqual([
            { kind: 'normalized_name', value: 'myfile01' },
            { kind: 'numbered_series', value: 'myfile' },
        ]);
    });

    it('builds core-name keys even when media tags are mixed into the filename', () => {
        expect(getSimilarNameCandidateKeys('[Group] My File 01 1080p WEB-DL.mkv')).toEqual([
            { kind: 'normalized_name', value: 'groupmyfile011080pwebdl' },
            { kind: 'core_name', value: 'groupmyfile' },
        ]);
    });

    it('does not treat digits inside the title as numbered-series suffixes', () => {
        expect(getSimilarNameCandidateKeys('Room 1408 Director Cut.mkv')).toEqual([
            { kind: 'normalized_name', value: 'room1408directorcut' },
            { kind: 'core_name', value: 'roomdirectorcut' },
        ]);
    });

    it('builds candidate groups for numbered series variants', () => {
        const groups = buildSimilarNameCandidateGroups([
            {
                id: 'a',
                name: 'Scene 01.png',
                path: 'C:\\library\\Scene 01.png',
                size: 120,
                type: 'image' as const,
            },
            {
                id: 'b',
                name: 'scene_02.png',
                path: 'C:\\library\\scene_02.png',
                size: 100,
                type: 'image' as const,
            },
            {
                id: 'c',
                name: 'Another.png',
                path: 'C:\\library\\Another.png',
                size: 90,
                type: 'image' as const,
            },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0]).toMatchObject({
            matchKind: 'numbered_series',
            matchLabel: '連番候補',
            count: 2,
            sizeMin: 100,
            sizeMax: 120,
        });
        expect(groups[0]?.files.map((file) => file.id)).toEqual(['a', 'b']);
    });

    it('deduplicates overlapping matches and prefers exact normalized-name groups', () => {
        const groups = buildSimilarNameCandidateGroups([
            {
                id: 'a',
                name: 'Vacation Photo.png',
                path: 'C:\\library\\Vacation Photo.png',
                size: 120,
                type: 'image' as const,
            },
            {
                id: 'b',
                name: 'vacation-photo.jpg',
                path: 'C:\\library\\vacation-photo.jpg',
                size: 110,
                type: 'image' as const,
            },
            {
                id: 'c',
                name: 'vacation-photo-01.jpg',
                path: 'C:\\library\\vacation-photo-01.jpg',
                size: 100,
                type: 'image' as const,
            },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0]).toMatchObject({
            matchKind: 'normalized_name',
            matchLabel: '名前一致候補',
        });
        expect(groups[0]?.files.map((file) => file.id)).toEqual(['a', 'b']);
    });

    it('groups names with digits in the middle or media tags as similar candidates', () => {
        const groups = buildSimilarNameCandidateGroups([
            {
                id: 'a',
                name: 'Project 01 sample 1080p.mp4',
                path: 'C:\\library\\Project 01 sample 1080p.mp4',
                size: 120,
                type: 'video' as const,
            },
            {
                id: 'b',
                name: 'Project 02 sample 720p.mp4',
                path: 'C:\\library\\Project 02 sample 720p.mp4',
                size: 110,
                type: 'video' as const,
            },
            {
                id: 'c',
                name: 'Another title.mp4',
                path: 'C:\\library\\Another title.mp4',
                size: 100,
                type: 'video' as const,
            },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0]).toMatchObject({
            matchKind: 'core_name',
            matchLabel: '名前近似候補',
            count: 2,
        });
        expect(groups[0]?.files.map((file) => file.id)).toEqual(['a', 'b']);
    });

    it('groups files by core name even when codec tags contain digits', () => {
        const groups = buildSimilarNameCandidateGroups([
            {
                id: 'a',
                name: 'Movie AV1.mkv',
                path: 'C:\\library\\Movie AV1.mkv',
                size: 120,
                type: 'video' as const,
            },
            {
                id: 'b',
                name: 'Movie H264.mkv',
                path: 'C:\\library\\Movie H264.mkv',
                size: 110,
                type: 'video' as const,
            },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0]).toMatchObject({
            matchKind: 'core_name',
            matchLabel: '名前近似候補',
            count: 2,
        });
        expect(groups[0]?.files.map((file) => file.id)).toEqual(['a', 'b']);
    });
});
