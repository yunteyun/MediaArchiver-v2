import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    activeProfileId: string;
    thumbnailAction: 'scrub' | 'play';
    sortBy: 'name' | 'date' | 'size';
    sortOrder: 'asc' | 'desc';
    videoVolume: number; // 0.0 - 1.0
    performanceMode: boolean; // true = アニメーション無効化
    autoScanOnStartup: boolean; // true = 起動時自動スキャン
    // アクション
    setThumbnailAction: (action: 'scrub' | 'play') => void;
    setSortBy: (sortBy: 'name' | 'date' | 'size') => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    setVideoVolume: (volume: number) => void;
    setPerformanceMode: (enabled: boolean) => void;
    setAutoScanOnStartup: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            activeProfileId: 'default',
            thumbnailAction: 'scrub',
            sortBy: 'date',
            sortOrder: 'desc',
            videoVolume: 0.5,
            performanceMode: false,
            autoScanOnStartup: false,

            setThumbnailAction: (thumbnailAction) => set({ thumbnailAction }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (sortOrder) => set({ sortOrder }),
            setVideoVolume: (volume) => set({ videoVolume: volume }),
            setPerformanceMode: (performanceMode) => set({ performanceMode }),
            setAutoScanOnStartup: (autoScanOnStartup) => set({ autoScanOnStartup }),
        }),
        {
            name: 'settings-storage',
        }
    )
);
