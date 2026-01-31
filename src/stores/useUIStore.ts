import { create } from 'zustand';
import type { MediaFile } from '../types/file';

interface UIState {
    sidebarWidth: number;
    viewMode: 'grid' | 'list';
    thumbnailSize: number;
    lightboxFile: MediaFile | null;
    // アクション
    setSidebarWidth: (width: number) => void;
    openLightbox: (file: MediaFile) => void;
    closeLightbox: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarWidth: 250,
    viewMode: 'grid',
    thumbnailSize: 150,
    lightboxFile: null,

    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    openLightbox: (file) => set({ lightboxFile: file }),
    closeLightbox: () => set({ lightboxFile: null }),
}));
