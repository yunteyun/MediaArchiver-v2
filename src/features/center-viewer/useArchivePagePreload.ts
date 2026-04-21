import { useEffect } from 'react';

export function useArchivePagePreload(
    filePath: string,
    currentIndex: number,
    totalCount: number
): void {
    useEffect(() => {
        if (!filePath || totalCount === 0) return;
        const indices = [-2, -1, 1, 2]
            .map(offset => currentIndex + offset)
            .filter(i => i >= 0 && i < totalCount);
        for (const i of indices) {
            void window.electronAPI.getArchiveImageByIndex(filePath, i);
        }
    }, [filePath, currentIndex, totalCount]);
}
