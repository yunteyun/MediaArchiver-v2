import { describe, expect, it } from 'vitest';
import type { MediaFile } from '../../types/file';
import type { GridItem } from '../../types/grid';
import { buildOrderedFileIds, buildRangeSelectionIds } from '../fileSelection';
import type { FileGroup } from '../groupFiles';

function createFile(id: string): MediaFile {
    return {
        id,
        name: `${id}.png`,
        path: `C:\\library\\${id}.png`,
        size: 100,
        type: 'image',
        createdAt: 1,
        tags: [],
        accessCount: 0,
        lastAccessedAt: null,
        externalOpenCount: 0,
        lastExternalOpenedAt: null,
    };
}

describe('fileSelection', () => {
    it('uses grouped display order when grouping is active', () => {
        const groupedFiles: FileGroup[] = [
            { key: 'b', label: 'B', icon: 'Folder', files: [createFile('file-3'), createFile('file-4')] },
            { key: 'a', label: 'A', icon: 'Folder', files: [createFile('file-1'), createFile('file-2')] },
        ];
        const gridItems: GridItem[] = groupedFiles
            .flatMap((group) => group.files)
            .map((file) => ({ type: 'file', file }));

        expect(buildOrderedFileIds(gridItems, groupedFiles, true)).toEqual([
            'file-3',
            'file-4',
            'file-1',
            'file-2',
        ]);
    });

    it('builds range ids between anchor and target in visible order', () => {
        const orderedFileIds = ['file-1', 'file-2', 'file-3', 'file-4'];

        expect(buildRangeSelectionIds(orderedFileIds, 'file-2', 'file-4')).toEqual([
            'file-2',
            'file-3',
            'file-4',
        ]);
        expect(buildRangeSelectionIds(orderedFileIds, 'file-4', 'file-2')).toEqual([
            'file-2',
            'file-3',
            'file-4',
        ]);
    });

    it('falls back to the clicked file when the anchor is unavailable', () => {
        expect(buildRangeSelectionIds(['file-1', 'file-2'], 'missing', 'file-2')).toEqual(['file-2']);
    });
});
