import React, { useCallback } from 'react';
import type { MangaBindingDirection } from './mangaPagePairing';

interface MangaPageSliderProps {
    currentIndex: number;
    totalCount: number;
    bindingDirection: MangaBindingDirection;
    pageLabel: string;
    onSeek: (index: number) => void;
}

export const MangaPageSlider = React.memo<MangaPageSliderProps>(
    ({ currentIndex, totalCount, bindingDirection, pageLabel, onSeek }) => {
        const max = totalCount - 1;

        const handleChange = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const raw = Number(e.target.value);
                const index = bindingDirection === 'rtl' ? max - raw : raw;
                onSeek(index);
            },
            [bindingDirection, max, onSeek],
        );

        if (totalCount === 0) return null;

        // RTL: スライダー値を反転（右端=ページ1、左端=最終ページ）
        const displayValue = bindingDirection === 'rtl' ? max - currentIndex : currentIndex;
        const leftLabel = bindingDirection === 'rtl' ? `${totalCount}` : '1';
        const rightLabel = bindingDirection === 'rtl' ? '1' : `${totalCount}`;

        return (
            <div
                data-manga-control
                className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded bg-black/60 px-3 py-1.5"
            >
                <span className="min-w-[1.5rem] text-center text-xs tabular-nums text-surface-400">
                    {leftLabel}
                </span>
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={displayValue}
                    onChange={handleChange}
                    className="h-1 w-[min(50vw,400px)] cursor-pointer appearance-none rounded bg-surface-600 accent-primary-500"
                    style={{ direction: 'ltr' }}
                />
                <span className="min-w-[1.5rem] text-center text-xs tabular-nums text-surface-400">
                    {rightLabel}
                </span>
                <span className="ml-1 whitespace-nowrap text-xs tabular-nums text-white">
                    {pageLabel}
                </span>
            </div>
        );
    },
);
MangaPageSlider.displayName = 'MangaPageSlider';
