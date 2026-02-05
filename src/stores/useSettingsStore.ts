import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// カードサイズ型定義
export type CardSize = 'small' | 'medium' | 'large';
export type CardLayout = 'grid' | 'list';

interface SettingsState {
    activeProfileId: string;
    thumbnailAction: 'scrub' | 'play';
    sortBy: 'name' | 'date' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    videoVolume: number; // 0.0 - 1.0
    performanceMode: boolean; // true = アニメーション無効化
    autoScanOnStartup: boolean; // true = 起動時自動スキャン
    previewFrameCount: number; // スキャン時のプレビューフレーム数 (0-30)

    // カード表示設定（Phase 12-3）
    cardSize: CardSize;
    cardLayout: CardLayout;
    showFileName: boolean;
    showDuration: boolean;
    showTags: boolean;
    showFileSize: boolean;

    // アクション
    setThumbnailAction: (action: 'scrub' | 'play') => void;
    setSortBy: (sortBy: 'name' | 'date' | 'size' | 'type') => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    setVideoVolume: (volume: number) => void;
    setPerformanceMode: (enabled: boolean) => void;
    setAutoScanOnStartup: (enabled: boolean) => void;
    setPreviewFrameCount: (count: number) => void;
    // カード設定アクション
    setCardSize: (size: CardSize) => void;
    setCardLayout: (layout: CardLayout) => void;
    setShowFileName: (show: boolean) => void;
    setShowDuration: (show: boolean) => void;
    setShowTags: (show: boolean) => void;
    setShowFileSize: (show: boolean) => void;
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
            previewFrameCount: 10,

            // カード表示設定デフォルト値
            cardSize: 'medium',
            cardLayout: 'grid',
            showFileName: true,
            showDuration: true,
            showTags: true,
            showFileSize: false,

            setThumbnailAction: (thumbnailAction) => set({ thumbnailAction }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (sortOrder) => set({ sortOrder }),
            setVideoVolume: (volume) => set({ videoVolume: volume }),
            setPerformanceMode: (performanceMode) => set({ performanceMode }),
            setAutoScanOnStartup: (autoScanOnStartup) => set({ autoScanOnStartup }),
            setPreviewFrameCount: (previewFrameCount) => set({ previewFrameCount }),
            // カード設定セッター
            setCardSize: (cardSize) => set({ cardSize }),
            setCardLayout: (cardLayout) => set({ cardLayout }),
            setShowFileName: (showFileName) => set({ showFileName }),
            setShowDuration: (showDuration) => set({ showDuration }),
            setShowTags: (showTags) => set({ showTags }),
            setShowFileSize: (showFileSize) => set({ showFileSize }),
        }),
        {
            name: 'settings-storage',
        }
    )
);

