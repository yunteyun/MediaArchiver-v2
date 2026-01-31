import { create } from 'zustand';
import type { MediaFile } from '../types/file';

interface UIState {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    viewMode: 'grid' | 'list';
    thumbnailSize: number;
    lightboxFile: MediaFile | null;
    // アクション
    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    openLightbox: (file: MediaFile) => void;
    closeLightbox: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarWidth: 250,
    sidebarCollapsed: false,
    viewMode: 'grid',
    thumbnailSize: 150,
    lightboxFile: null,

    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    openLightbox: (file) => set({ lightboxFile: file }),
    closeLightbox: () => set({ lightboxFile: null }),
}));
