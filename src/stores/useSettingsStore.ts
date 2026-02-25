import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CardLayout = 'grid' | 'list';

// 表示モード型定義（Phase 14）
export type DisplayMode = 'standard' | 'standardLarge' | 'manga' | 'video' | 'compact';

// グループ化型定義（Phase 12-10）
export type GroupBy = 'none' | 'date' | 'size' | 'type';

// タグポップオーバートリガー型定義（Phase 14-8）
export type TagPopoverTrigger = 'click' | 'hover';

// タグ表示スタイル型定義
export type TagDisplayStyle = 'filled' | 'border';
export type FileCardTagOrderMode = 'balanced' | 'strict';
export type FileTypeCategory = 'video' | 'image' | 'archive' | 'audio';
export type FlipbookSpeed = 'slow' | 'normal' | 'fast';
export type AnimatedImagePreviewMode = 'off' | 'hover';

export interface FileTypeCategoryFilters {
    video: boolean;
    image: boolean;
    archive: boolean;
    audio: boolean;
}

export interface ProfileScopedSettingsV1 {
    fileTypeFilters: FileTypeCategoryFilters;
    previewFrameCount: number;
    scanThrottleMs: number;
    thumbnailResolution: number;
}

export const DEFAULT_PROFILE_FILE_TYPE_FILTERS: FileTypeCategoryFilters = {
    video: true,
    image: true,
    archive: true,
    audio: true,
};

// Phase 17-3: Playモード詳細設定型定義
export type PlayModeJumpType = 'light' | 'random' | 'sequential';
export type PlayModeJumpInterval = 1000 | 2000 | 3000 | 5000;

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
    thumbnailAction: 'scrub' | 'flipbook' | 'play';
    flipbookSpeed: FlipbookSpeed;
    animatedImagePreviewMode: AnimatedImagePreviewMode;
    sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed'; // Phase 17: アクセストラッキング
    sortOrder: 'asc' | 'desc';
    videoVolume: number; // 0.0 - 1.0
    audioVolume: number; // 0.0 - 1.0 (音声ファイル専用)
    performanceMode: boolean; // true = アニメーション無効化
    autoScanOnStartup: boolean; // true = 起動時自動スキャン
    previewFrameCount: number; // スキャン時のプレビューフレーム数 (0-30)
    scanThrottleMs: number; // スキャン速度抑制（ファイル間待機時間 ms）
    profileFileTypeFilters: FileTypeCategoryFilters;
    profileSettingsMigrationV1Done: boolean;

    // サムネイル生成解像度（Phase 14整理）
    thumbnailResolution: number; // 生成時の幅px（160〜480）

    // カード表示設定（Phase 12-3）
    cardLayout: CardLayout;
    showFileName: boolean;
    showDuration: boolean;
    showTags: boolean;
    showFileSize: boolean;

    // 表示モード設定（Phase 14）
    displayMode: DisplayMode;

    // 外部アプリ設定（Phase 12-7）
    externalApps: ExternalApp[];

    // Phase 18-B: デフォルト外部アプリ設定
    defaultExternalApps: Record<string, string>; // 拡張子(正規化済み) → アプリID

    // グループ化設定（Phase 12-10）
    groupBy: GroupBy;

    // タグポップオーバー設定（Phase 14-8）
    tagPopoverTrigger: TagPopoverTrigger;

    // タグ表示スタイル設定
    tagDisplayStyle: TagDisplayStyle;
    // FileCard 要約タグの並びルール
    fileCardTagOrderMode: FileCardTagOrderMode;

    // Phase 17-3: Playモード詳細設定
    playMode: {
        jumpType: PlayModeJumpType;
        jumpInterval: PlayModeJumpInterval;
    };

    // アクション
    setThumbnailAction: (action: 'scrub' | 'flipbook' | 'play') => void;
    setFlipbookSpeed: (speed: FlipbookSpeed) => void;
    setAnimatedImagePreviewMode: (mode: AnimatedImagePreviewMode) => void;
    setSortBy: (sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed') => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    setVideoVolume: (volume: number) => void;
    setAudioVolume: (volume: number) => void;
    setPerformanceMode: (enabled: boolean) => void;
    setAutoScanOnStartup: (enabled: boolean) => void;
    setPreviewFrameCount: (count: number) => void;
    setScanThrottleMs: (ms: number) => void;
    setThumbnailResolution: (resolution: number) => void;
    applyProfileScopedSettings: (settings: ProfileScopedSettingsV1) => void;
    exportProfileScopedSettings: () => ProfileScopedSettingsV1;
    setProfileFileTypeFilters: (filters: FileTypeCategoryFilters) => void;
    setProfilePreviewFrameCount: (count: number) => void;
    setProfileScanThrottleMs: (ms: number) => void;
    setProfileThumbnailResolution: (resolution: number) => void;
    setProfileSettingsMigrationV1Done: (done: boolean) => void;
    // カード設定アクション
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
    // Phase 18-B: デフォルト外部アプリアクション
    setDefaultExternalApp: (extension: string, appId: string | null) => void;
    // グループ化アクション（Phase 12-10）
    setGroupBy: (groupBy: GroupBy) => void;
    // タグポップオーバーアクション（Phase 14-8）
    setTagPopoverTrigger: (trigger: TagPopoverTrigger) => void;
    // タグ表示スタイルアクション
    setTagDisplayStyle: (style: TagDisplayStyle) => void;
    setFileCardTagOrderMode: (mode: FileCardTagOrderMode) => void;
    // Phase 17-3: Playモード詳細設定アクション
    setPlayModeJumpType: (type: PlayModeJumpType) => void;
    setPlayModeJumpInterval: (interval: PlayModeJumpInterval) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            activeProfileId: 'default',
            thumbnailAction: 'scrub',
            flipbookSpeed: 'normal',
            animatedImagePreviewMode: 'hover',
            sortBy: 'date',
            sortOrder: 'desc',
            videoVolume: 0.5,
            audioVolume: 0.5,
            performanceMode: false,
            autoScanOnStartup: false,
            previewFrameCount: 10,
            scanThrottleMs: 0,
            profileFileTypeFilters: { ...DEFAULT_PROFILE_FILE_TYPE_FILTERS },
            profileSettingsMigrationV1Done: false,

            // サムネイル生成解像度（Phase 14整理）
            thumbnailResolution: 320,

            // カード表示設定デフォルト値
            cardLayout: 'grid',
            showFileName: true,
            showDuration: true,
            showTags: true,
            showFileSize: true,

            // 表示モード設定デフォルト値（Phase 14）
            displayMode: 'standard',

            // 外部アプリ設定（Phase 12-7）
            externalApps: [],

            // Phase 18-B: デフォルト外部アプリ設定
            defaultExternalApps: {},

            // グループ化設定（Phase 12-10）
            groupBy: 'none',

            // タグポップオーバー設定（Phase 14-8）
            tagPopoverTrigger: 'click',

            // タグ表示スタイル設定
            tagDisplayStyle: 'filled' as TagDisplayStyle,
            fileCardTagOrderMode: 'balanced' as FileCardTagOrderMode,

            // Phase 17-3: Playモード詳細設定
            playMode: {
                jumpType: 'random' as PlayModeJumpType,
                jumpInterval: 2000 as PlayModeJumpInterval
            },

            setThumbnailAction: (thumbnailAction) => set({ thumbnailAction }),
            setFlipbookSpeed: (flipbookSpeed) => set({ flipbookSpeed }),
            setAnimatedImagePreviewMode: (animatedImagePreviewMode) => set({ animatedImagePreviewMode }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (sortOrder) => set({ sortOrder }),
            setVideoVolume: (volume) => set({ videoVolume: volume }),
            setAudioVolume: (volume) => set({ audioVolume: volume }),
            setPerformanceMode: (performanceMode) => set({ performanceMode }),
            setAutoScanOnStartup: (autoScanOnStartup) => set({ autoScanOnStartup }),
            setPreviewFrameCount: (previewFrameCount) => set({ previewFrameCount }),
            setScanThrottleMs: (scanThrottleMs) => set({ scanThrottleMs }),
            setThumbnailResolution: (thumbnailResolution) => set({ thumbnailResolution }),
            applyProfileScopedSettings: (settings) => set({
                profileFileTypeFilters: { ...DEFAULT_PROFILE_FILE_TYPE_FILTERS, ...settings.fileTypeFilters },
                previewFrameCount: Math.max(0, Math.min(30, Math.round(Number(settings.previewFrameCount) || 0))),
                scanThrottleMs: [0, 50, 100, 200].includes(Number(settings.scanThrottleMs)) ? Number(settings.scanThrottleMs) : 0,
                thumbnailResolution: [160, 200, 240, 280, 320, 360, 400, 440, 480].includes(Number(settings.thumbnailResolution))
                    ? Number(settings.thumbnailResolution)
                    : 320
            }),
            exportProfileScopedSettings: () => ({
                fileTypeFilters: { ...get().profileFileTypeFilters },
                previewFrameCount: get().previewFrameCount,
                scanThrottleMs: get().scanThrottleMs,
                thumbnailResolution: get().thumbnailResolution
            }),
            setProfileFileTypeFilters: (profileFileTypeFilters) => set({ profileFileTypeFilters }),
            setProfilePreviewFrameCount: (previewFrameCount) => set({ previewFrameCount }),
            setProfileScanThrottleMs: (scanThrottleMs) => set({ scanThrottleMs }),
            setProfileThumbnailResolution: (thumbnailResolution) => set({ thumbnailResolution }),
            setProfileSettingsMigrationV1Done: (profileSettingsMigrationV1Done) => set({ profileSettingsMigrationV1Done }),
            // カード設定セッター
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
                    externalApps: state.externalApps.filter(app => app.id !== id),
                    // Phase 18-B: 削除されたアプリのデフォルト設定も削除
                    defaultExternalApps: Object.fromEntries(
                        Object.entries(state.defaultExternalApps).filter(([, appId]) => appId !== id)
                    )
                }));
            },
            // Phase 18-B: デフォルト外部アプリアクション
            setDefaultExternalApp: (extension, appId) => {
                // 拡張子を正規化（ドット除去 + 小文字化）
                const normalizedExt = extension.replace(/^\./, '').toLowerCase();
                set((state) => {
                    const newDefaults = { ...state.defaultExternalApps };
                    if (appId === null) {
                        delete newDefaults[normalizedExt];
                    } else {
                        newDefaults[normalizedExt] = appId;
                    }
                    return { defaultExternalApps: newDefaults };
                });
            },
            // グループ化アクション（Phase 12-10）
            setGroupBy: (groupBy) => set({ groupBy }),
            // タグポップオーバーアクション（Phase 14-8）
            setTagPopoverTrigger: (tagPopoverTrigger) => set({ tagPopoverTrigger }),
            // タグ表示スタイルアクション
            setTagDisplayStyle: (tagDisplayStyle) => set({ tagDisplayStyle }),
            setFileCardTagOrderMode: (fileCardTagOrderMode) => set({ fileCardTagOrderMode }),
            // Phase 17-3: Playモード詳細設定アクション
            setPlayModeJumpType: (jumpType) => set((state) => ({
                playMode: { ...state.playMode, jumpType }
            })),
            setPlayModeJumpInterval: (jumpInterval) => set((state) => ({
                playMode: { ...state.playMode, jumpInterval }
            })),
        }),
        {
            name: 'settings-storage',
        }
    )
);
