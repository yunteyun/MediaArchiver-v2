import { create } from 'zustand';
import type { MediaFile } from '../types/file';
import type { ToastData } from '../components/Toast';

export interface ScanProgress {
    phase: 'counting' | 'scanning' | 'complete' | 'error';
    current: number;
    total: number;
    currentFile?: string;
    message?: string;
    stats?: {
        newCount: number;
        updateCount: number;
        skipCount: number;
    };
}

interface UIState {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    viewMode: 'grid' | 'list';
    thumbnailSize: number;
    lightboxFile: MediaFile | null;
    sortBy: 'name' | 'date' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    searchQuery: string;
    settingsModalOpen: boolean;
    scanProgress: ScanProgress | null;
    toasts: ToastData[];
    duplicateViewOpen: boolean;
    // アクション
    setSidebarWidth: (width: number) => void;
    toggleSidebar: () => void;
    setThumbnailSize: (size: number) => void;
    openLightbox: (file: MediaFile) => void;
    closeLightbox: () => void;
    setSortBy: (sortBy: UIState['sortBy']) => void;
    setSortOrder: (order: UIState['sortOrder']) => void;
    setSearchQuery: (query: string) => void;
    openSettingsModal: () => void;
    closeSettingsModal: () => void;
    setScanProgress: (progress: ScanProgress | null) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
    removeToast: (id: string) => void;
    openDuplicateView: () => void;
    closeDuplicateView: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarWidth: 250,
    sidebarCollapsed: false,
    viewMode: 'grid',
    thumbnailSize: 150,
    lightboxFile: null,
    sortBy: 'name',
    sortOrder: 'asc',
    searchQuery: '',
    settingsModalOpen: false,
    scanProgress: null,
    toasts: [],
    duplicateViewOpen: false,

    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setThumbnailSize: (size) => set({ thumbnailSize: size }),
    openLightbox: (file) => set({ lightboxFile: file }),
    closeLightbox: () => set({ lightboxFile: null }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSortOrder: (order) => set({ sortOrder: order }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    openSettingsModal: () => set({ settingsModalOpen: true }),
    closeSettingsModal: () => set({ settingsModalOpen: false }),
    setScanProgress: (progress) => set({ scanProgress: progress }),
    showToast: (message, type = 'info', duration = 3000) => set((state) => ({
        toasts: [...state.toasts, { id: Date.now().toString(), message, type, duration }]
    })),
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    })),
    openDuplicateView: () => set({ duplicateViewOpen: true }),
    closeDuplicateView: () => set({ duplicateViewOpen: false }),
}));
