import type { GridItem } from '../types/grid';
import type { FileGroup } from './groupFiles';

export function buildOrderedFileIds(
    gridItems: GridItem[],
    groupedFiles: FileGroup[],
    isGrouped: boolean
): string[] {
    if (isGrouped) {
        return groupedFiles.flatMap((group) => group.files.map((file) => file.id));
    }

    return gridItems
        .filter((item): item is Extract<GridItem, { type: 'file' }> => item.type === 'file')
        .map((item) => item.file.id);
}

export function buildRangeSelectionIds(
    orderedFileIds: string[],
    anchorId: string | null | undefined,
    targetId: string
): string[] {
    const anchorIndex = anchorId ? orderedFileIds.indexOf(anchorId) : -1;
    const targetIndex = orderedFileIds.indexOf(targetId);

    if (anchorIndex < 0 || targetIndex < 0) {
        return targetIndex >= 0 ? [targetId] : [];
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    return orderedFileIds.slice(start, end + 1);
}
