import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MangaPageMode, MangaBindingDirection } from '../features/center-viewer/mangaPagePairing';

export type { MangaPageMode, MangaBindingDirection };

interface MangaViewerSettingsState {
    pageMode: MangaPageMode;
    bindingDirection: MangaBindingDirection;
    firstPageSingle: boolean;
    setPageMode: (mode: MangaPageMode) => void;
    setBindingDirection: (direction: MangaBindingDirection) => void;
    setFirstPageSingle: (value: boolean) => void;
}

export const useMangaViewerSettingsStore = create<MangaViewerSettingsState>()(
    persist(
        (set) => ({
            // 日本漫画デフォルト: 見開き・右綴じ・表紙単独
            pageMode: 'spread',
            bindingDirection: 'rtl',
            firstPageSingle: true,
            setPageMode: (mode) => set({ pageMode: mode }),
            setBindingDirection: (direction) => set({ bindingDirection: direction }),
            setFirstPageSingle: (value) => set({ firstPageSingle: value }),
        }),
        { name: 'manga-viewer-settings' },
    ),
);
