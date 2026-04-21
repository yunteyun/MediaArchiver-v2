export type MangaPageMode = 'single' | 'spread';
export type MangaBindingDirection = 'rtl' | 'ltr';

export interface MangaViewerSettings {
    pageMode: MangaPageMode;
    bindingDirection: MangaBindingDirection;
    firstPageSingle: boolean;
}

export interface PagePair {
    primary: number;
    secondary: number | null;
}

/**
 * currentIndex から見開きで表示するページペアを返す。
 * primary は常に若い（小さい）インデックス。
 * 綴じ方向による左右反転は呼び出し側が行う。
 */
export function resolvePagePair(
    index: number,
    totalCount: number,
    settings: Pick<MangaViewerSettings, 'pageMode' | 'firstPageSingle'>,
): PagePair {
    if (settings.pageMode === 'single' || totalCount === 0) {
        return { primary: index, secondary: null };
    }

    if (settings.firstPageSingle) {
        if (index === 0) return { primary: 0, secondary: null };
        // index 1以降: 奇数インデックスがペア先頭
        const pairStart = index % 2 === 1 ? index : index - 1;
        const pairEnd = pairStart + 1;
        return { primary: pairStart, secondary: pairEnd < totalCount ? pairEnd : null };
    } else {
        // 偶数インデックスがペア先頭
        const pairStart = index % 2 === 0 ? index : index - 1;
        const pairEnd = pairStart + 1;
        return { primary: pairStart, secondary: pairEnd < totalCount ? pairEnd : null };
    }
}

/**
 * 次/前のペア先頭インデックスを返す。
 * 末尾/先頭に達した場合は currentIndex を返す（変化なし）。
 * PageDown/PageUp は bindingDirection に関係なく常に次/前（NeeView と同じ挙動）。
 */
export function stepPage(
    currentIndex: number,
    direction: 'next' | 'prev',
    totalCount: number,
    settings: MangaViewerSettings,
): number {
    if (totalCount === 0) return 0;

    if (settings.pageMode === 'single') {
        const delta = direction === 'next' ? 1 : -1;
        return Math.max(0, Math.min(currentIndex + delta, totalCount - 1));
    }

    const pair = resolvePagePair(currentIndex, totalCount, settings);

    if (direction === 'next') {
        // 表紙単独表示から次へ
        if (settings.firstPageSingle && currentIndex === 0) {
            return totalCount > 1 ? 1 : 0;
        }
        const next = pair.primary + 2;
        // 既に最終ペアにいる場合は移動しない
        return next >= totalCount ? currentIndex : next;
    } else {
        const prev = pair.primary - 2;
        return Math.max(prev, 0);
    }
}
