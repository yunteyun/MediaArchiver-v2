import { useEffect } from 'react';
import { resolvePagePair, stepPage, type MangaViewerSettings } from './mangaPagePairing';

export function useArchivePagePreload(
    filePath: string,
    currentIndex: number,
    totalCount: number,
    settings: MangaViewerSettings,
): void {
    const { pageMode, bindingDirection, firstPageSingle } = settings;

    useEffect(() => {
        if (!filePath || totalCount === 0) return;
        const s: MangaViewerSettings = { pageMode, bindingDirection, firstPageSingle };

        let indices: number[];
        if (pageMode === 'spread') {
            // 現在のsecondary + 前後ペア分のインデックスを先読み
            const set = new Set<number>();
            const currentPair = resolvePagePair(currentIndex, totalCount, s);
            if (currentPair.secondary !== null) set.add(currentPair.secondary);

            // 次2ペア
            let fwd = currentIndex;
            for (let i = 0; i < 2; i++) {
                const next = stepPage(fwd, 'next', totalCount, s);
                if (next === fwd) break;
                const pair = resolvePagePair(next, totalCount, s);
                set.add(pair.primary);
                if (pair.secondary !== null) set.add(pair.secondary);
                fwd = next;
            }
            // 前1ペア
            const prev = stepPage(currentIndex, 'prev', totalCount, s);
            if (prev !== currentIndex) {
                const pair = resolvePagePair(prev, totalCount, s);
                set.add(pair.primary);
                if (pair.secondary !== null) set.add(pair.secondary);
            }

            indices = [...set].filter(
                i => i !== currentIndex && (currentPair.secondary === null || i !== currentPair.secondary) && i >= 0 && i < totalCount,
            );
        } else {
            indices = [-2, -1, 1, 2]
                .map(offset => currentIndex + offset)
                .filter(i => i >= 0 && i < totalCount);
        }

        for (const i of indices) {
            void window.electronAPI.getArchiveImageByIndex(filePath, i);
        }
    }, [filePath, currentIndex, totalCount, pageMode, bindingDirection, firstPageSingle]);
}
