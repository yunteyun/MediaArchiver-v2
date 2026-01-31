import { create } from 'zustand';
import type { MediaFile } from '../types/file';

interface UIState {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    viewMode: 'grid' | 'list';
    thumbnailSize: number;
    lightboxFile: MediaFile | null;
    sortBy: 'name' | 'date' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    // アクション
    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    openLightbox: (file: MediaFile) => void;
    closeLightbox: () => void;
    setSortBy: (sortBy: UIState['sortBy']) => void;
    setSortOrder: (order: UIState['sortOrder']) => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarWidth: 250,
    sidebarCollapsed: false,
    viewMode: 'grid',
    thumbnailSize: 150,
    lightboxFile: null,
    sortBy: 'name',
    sortOrder: 'asc',

    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    openLightbox: (file) => set({ lightboxFile: file }),
    closeLightbox: () => set({ lightboxFile: null }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSortOrder: (order) => set({ sortOrder: order }),
}));
