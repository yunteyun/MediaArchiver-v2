import { describe, expect, it } from 'vitest';
import { groupFiles } from '../groupFiles';
import type { MediaFile } from '../../types/file';

function createMediaFile(id: string, createdAt: string): MediaFile {
    return {
        id,
        name: `${id}.jpg`,
        path: `C:\\Media\\${id}.jpg`,
        size: 1024,
        type: 'image',
        createdAt: new Date(createdAt).getTime(),
        tags: [],
        accessCount: 0,
        lastAccessedAt: null,
        externalOpenCount: 0,
        lastExternalOpenedAt: null,
    };
}

describe('groupFiles date grouping', () => {
    const now = new Date('2026-03-21T12:00:00+09:00');

    it('keeps older files grouped by month in auto mode', () => {
        const files = [
            createMediaFile('feb-a', '2026-02-10T09:00:00+09:00'),
            createMediaFile('feb-b', '2026-02-22T09:00:00+09:00'),
        ];

        const groups = groupFiles(files, 'date', 'date', 'desc', { now, dateGroupingMode: 'auto' });

        expect(groups).toHaveLength(1);
        expect(groups[0]?.key).toBe('month:2026-02');
        expect(groups[0]?.label).toBe('2026年2月');
        expect(groups[0]?.files.map((file) => file.id)).toEqual(['feb-b', 'feb-a']);
    });

    it('splits older files into weekly buckets when week mode is selected', () => {
        const files = [
            createMediaFile('feb-a', '2026-02-10T09:00:00+09:00'),
            createMediaFile('feb-b', '2026-02-22T09:00:00+09:00'),
        ];

        const groups = groupFiles(files, 'date', 'date', 'desc', { now, dateGroupingMode: 'week' });

        expect(groups.map((group) => group.key)).toEqual([
            'week:2026-02-16',
            'week:2026-02-09',
        ]);
        expect(groups.map((group) => group.files[0]?.id)).toEqual(['feb-b', 'feb-a']);
    });

    it('keeps recent relative groups ahead of older weekly groups', () => {
        const files = [
            createMediaFile('recent', '2026-03-05T09:00:00+09:00'),
            createMediaFile('older', '2026-02-10T09:00:00+09:00'),
        ];

        const groups = groupFiles(files, 'date', 'date', 'desc', { now, dateGroupingMode: 'week' });

        expect(groups.map((group) => group.key)).toEqual([
            'relative:twoWeeksAgo',
            'week:2026-02-09',
        ]);
        expect(groups[0]?.label).toBe('2週間前');
    });
});
