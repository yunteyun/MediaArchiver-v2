import { describe, expect, it } from 'vitest';
import { mergePriorityIds } from '../thumbnailBackfillQueue';

describe('mergePriorityIds', () => {
    it('moves newly visible ids to the front while keeping the rest', () => {
        expect(mergePriorityIds(
            ['file-3', 'file-4', 'file-5'],
            ['file-1', 'file-4', 'file-2'],
        )).toEqual(['file-1', 'file-4', 'file-2', 'file-3', 'file-5']);
    });

    it('skips ids that are already active', () => {
        expect(mergePriorityIds(
            ['file-3', 'file-4'],
            ['file-1', 'file-2'],
            ['file-2'],
        )).toEqual(['file-1', 'file-3', 'file-4']);
    });
});
