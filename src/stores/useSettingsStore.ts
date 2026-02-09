import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// カードサイズ型定義
export type CardSize = 'small' | 'medium' | 'large';
export type CardLayout = 'grid' | 'list';

// 表示モード型定義（Phase 14）
export type DisplayMode = 'standard' | 'manga' | 'video';

// グループ化型定義（Phase 12-10）
export type GroupBy = 'none' | 'date' | 'size' | 'type';

// 外部アプリ型定義（Phase 12-7）
export interface ExternalApp {
    id: string;
    name: string;
    path: string;
    extensions: string[];  // 対応拡張子（空=全ファイル）
    createdAt: number;
}

interface SettingsState {
    activeProfileId: string;
    thumbnailAction: 'scrub' | 'play';
    sortBy: 'name' | 'date' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    videoVolume: number; // 0.0 - 1.0
    performanceMode: boolean; // true = アニメーション無効化
    autoScanOnStartup: boolean; // true = 起動時自動スキャン
    previewFrameCount: number; // スキャン時のプレビューフレーム数 (0-30)
    scanThrottleMs: number; // スキャン速度抑制（ファイル間待機時間 ms）

    // カード表示設定（Phase 12-3）
    cardSize: CardSize;
    cardLayout: CardLayout;
    showFileName: boolean;
    showDuration: boolean;
    showTags: boolean;
    showFileSize: boolean;

    // 表示モード設定（Phase 14）
    displayMode: DisplayMode;

    // 外部アプリ設定（Phase 12-7）
    externalApps: ExternalApp[];

    // グループ化設定（Phase 12-10）
    groupBy: GroupBy;

    // アクション
    setThumbnailAction: (action: 'scrub' | 'play') => void;
    setSortBy: (sortBy: 'name' | 'date' | 'size' | 'type') => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    setVideoVolume: (volume: number) => void;
    setPerformanceMode: (enabled: boolean) => void;
    setAutoScanOnStartup: (enabled: boolean) => void;
    setPreviewFrameCount: (count: number) => void;
    setScanThrottleMs: (ms: number) => void;
    // カード設定アクション
    setCardSize: (size: CardSize) => void;
    setCardLayout: (layout: CardLayout) => void;
    setShowFileName: (show: boolean) => void;
    setShowDuration: (show: boolean) => void;
    setShowTags: (show: boolean) => void;
    setShowFileSize: (show: boolean) => void;
    // 表示モードアクション（Phase 14）
    setDisplayMode: (mode: DisplayMode) => void;
    // 外部アプリアクション（Phase 12-7）
    addExternalApp: (name: string, path: string, extensions: string[]) => void;
    updateExternalApp: (id: string, updates: Partial<Omit<ExternalApp, 'id' | 'createdAt'>>) => void;
    deleteExternalApp: (id: string) => void;
    // グループ化アクション（Phase 12-10）
    setGroupBy: (groupBy: GroupBy) => void;
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
            scanThrottleMs: 0,

            // カード表示設定デフォルト値
            cardSize: 'medium',
            cardLayout: 'grid',
            showFileName: true,
            showDuration: true,
            showTags: true,
            showFileSize: false,

            // 表示モード設定デフォルト値（Phase 14）
            displayMode: 'standard',

            // 外部アプリ設定（Phase 12-7）
            externalApps: [],

            // グループ化設定（Phase 12-10）
            groupBy: 'none',

            setThumbnailAction: (thumbnailAction) => set({ thumbnailAction }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (sortOrder) => set({ sortOrder }),
            setVideoVolume: (volume) => set({ videoVolume: volume }),
            setPerformanceMode: (performanceMode) => set({ performanceMode }),
            setAutoScanOnStartup: (autoScanOnStartup) => set({ autoScanOnStartup }),
            setPreviewFrameCount: (previewFrameCount) => set({ previewFrameCount }),
            setScanThrottleMs: (scanThrottleMs) => set({ scanThrottleMs }),
            // カード設定セッター
            setCardSize: (cardSize) => set({ cardSize }),
            setCardLayout: (cardLayout) => set({ cardLayout }),
            setShowFileName: (showFileName) => set({ showFileName }),
            setShowDuration: (showDuration) => set({ showDuration }),
            setShowTags: (showTags) => set({ showTags }),
            setShowFileSize: (showFileSize) => set({ showFileSize }),
            // 表示モード設定セッター（Phase 14）
            setDisplayMode: (displayMode) => set({ displayMode }),
            // 外部アプリアクション（Phase 12-7）
            addExternalApp: (name, path, extensions) => {
                const newApp: ExternalApp = {
                    id: crypto.randomUUID(),
                    name,
                    path,
                    extensions: extensions.map(e => e.toLowerCase().replace(/^\./, '')),
                    createdAt: Date.now()
                };
                set((state) => ({
                    externalApps: [...state.externalApps, newApp]
                }));
            },
            updateExternalApp: (id, updates) => {
                set((state) => ({
                    externalApps: state.externalApps.map(app =>
                        app.id === id
                            ? { ...app, ...updates }
                            : app
                    )
                }));
            },
            deleteExternalApp: (id) => {
                set((state) => ({
                    externalApps: state.externalApps.filter(app => app.id !== id)
                }));
            },
            // グループ化アクション（Phase 12-10）
            setGroupBy: (groupBy) => set({ groupBy }),
        }),
        {
            name: 'settings-storage',
        }
    )
);

