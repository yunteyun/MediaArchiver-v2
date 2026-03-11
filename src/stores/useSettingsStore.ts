import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    LIGHTBOX_OVERLAY_OPACITY_DEFAULT,
    clampOverlayOpacity,
} from '../features/lightbox-clean/constants';
import type { DisplayPresetSelection } from '../components/fileCard/displayModes';
import {
    DEFAULT_SCAN_EXCLUSION_RULES,
    normalizeScanExclusionRules,
    type ScanExclusionRules,
} from '../shared/scanExclusionRules';
import {
    DEFAULT_RATING_DISPLAY_THRESHOLDS,
    normalizeRatingDisplayThresholds,
    type RatingDisplayThresholds,
} from '../shared/ratingDisplayThresholds';

export type { ScanExclusionRules } from '../shared/scanExclusionRules';
export { DEFAULT_SCAN_EXCLUSION_RULES } from '../shared/scanExclusionRules';
export type { RatingDisplayThresholds } from '../shared/ratingDisplayThresholds';
export {
    DEFAULT_RATING_DISPLAY_THRESHOLDS,
    RATING_DISPLAY_THRESHOLD_STEP,
} from '../shared/ratingDisplayThresholds';

// 表示モード型定義（Phase 14）
export type DisplayMode = 'standard' | 'standardLarge' | 'manga' | 'video' | 'whiteBrowser' | 'mangaDetailed' | 'compact';
export type LayoutPreset = 'standard' | 'standardLarge' | 'manga' | 'video' | 'detailed' | 'mangaDetailed' | 'compact';
export type ThumbnailPresentation = 'modeDefault' | 'contain' | 'cover' | 'square';
export type SearchTarget = 'fileName' | 'folderName';

// グループ化型定義（Phase 12-10）
export type GroupBy = 'none' | 'date' | 'size' | 'type';

// タグポップオーバートリガー型定義（Phase 14-8）
export type TagPopoverTrigger = 'click' | 'hover';

// タグ表示スタイル型定義
export type TagDisplayStyle = 'filled' | 'border';
export type FileCardTagOrderMode = 'balanced' | 'strict';
export type FileTypeCategory = 'video' | 'image' | 'archive' | 'audio';
export type FlipbookSpeed = 'slow' | 'normal' | 'fast';
export type AnimatedImagePreviewMode = 'off' | 'hover' | 'visible';
export type RightPanelVideoPreviewMode = 'loop' | 'long' | 'off';
export type ThumbnailAction = 'scrub' | 'flipbook' | 'play';
export type ArchiveThumbnailAction = 'off' | 'flipbook';
export type PlayModeJumpType = 'light' | 'random' | 'sequential';
export type PlayModeJumpInterval = 1000 | 2000 | 3000 | 5000;

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
    ratingDisplayThresholds: RatingDisplayThresholds;
    listDisplayDefaults: {
        sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating';
        sortOrder: 'asc' | 'desc';
        groupBy: GroupBy;
        defaultSearchTarget: SearchTarget;
        activeDisplayPresetId: string;
        displayMode: DisplayMode;
        thumbnailPresentation: ThumbnailPresentation;
    };
    fileCardSettings: {
        showFileName: boolean;
        showDuration: boolean;
        showTags: boolean;
        showFileSize: boolean;
        tagPopoverTrigger: TagPopoverTrigger;
        tagDisplayStyle: TagDisplayStyle;
        fileCardTagOrderMode: FileCardTagOrderMode;
    };
    defaultExternalApps: Record<string, string>;
    searchDestinations: SearchDestination[];
}

export interface StorageMaintenanceSettings {
    autoCleanupOrphanedThumbnailsOnStartup: boolean;
    autoCleanupThresholdMb: number;
}

export const DEFAULT_STORAGE_MAINTENANCE_SETTINGS: StorageMaintenanceSettings = {
    autoCleanupOrphanedThumbnailsOnStartup: false,
    autoCleanupThresholdMb: 500,
};

export const DEFAULT_PROFILE_FILE_TYPE_FILTERS: FileTypeCategoryFilters = {
    video: true,
    image: true,
    archive: true,
    audio: true,
};

export const DEFAULT_LIST_DISPLAY_SETTINGS = {
    sortBy: 'date' as const,
    sortOrder: 'desc' as const,
    defaultSearchTarget: 'fileName' as const,
    groupBy: 'none' as const,
    activeDisplayPresetId: 'standard',
    displayMode: 'standard' as const,
    layoutPreset: 'standard' as const,
    thumbnailPresentation: 'modeDefault' as const,
};

export const DEFAULT_MEDIA_PLAYBACK_SETTINGS = {
    videoVolume: 0.5,
    audioVolume: 0.5,
    lightboxOverlayOpacity: LIGHTBOX_OVERLAY_OPACITY_DEFAULT,
    performanceMode: false,
};

export const DEFAULT_PROFILE_SCOPED_SETTINGS: ProfileScopedSettingsV1 = {
    fileTypeFilters: { ...DEFAULT_PROFILE_FILE_TYPE_FILTERS },
    previewFrameCount: 10,
    scanThrottleMs: 0,
    thumbnailResolution: 320,
    ratingDisplayThresholds: { ...DEFAULT_RATING_DISPLAY_THRESHOLDS },
    listDisplayDefaults: { ...DEFAULT_LIST_DISPLAY_SETTINGS },
    fileCardSettings: {
        showFileName: true,
        showDuration: true,
        showTags: true,
        showFileSize: true,
        tagPopoverTrigger: 'click',
        tagDisplayStyle: 'filled',
        fileCardTagOrderMode: 'balanced',
    },
    defaultExternalApps: {},
    searchDestinations: [
        { id: 'filename-google', name: 'Google', type: 'filename', url: 'https://www.google.com/search?q={query}', icon: 'search', enabled: true, createdAt: 1 },
        { id: 'filename-duckduckgo', name: 'DuckDuckGo', type: 'filename', url: 'https://duckduckgo.com/?q={query}', icon: 'globe', enabled: true, createdAt: 2 },
        { id: 'filename-bing', name: 'Bing', type: 'filename', url: 'https://www.bing.com/search?q={query}', icon: 'globe', enabled: true, createdAt: 3 },
        { id: 'image-google-lens', name: 'Google Lens', type: 'image', url: 'https://lens.google.com/', icon: 'camera', enabled: true, createdAt: 4 },
        { id: 'image-bing-visual-search', name: 'Bing Visual Search', type: 'image', url: 'https://www.bing.com/visualsearch', icon: 'image', enabled: true, createdAt: 5 },
        { id: 'image-yandex-images', name: 'Yandex Images', type: 'image', url: 'https://yandex.com/images/', icon: 'image', enabled: true, createdAt: 6 },
    ],
};

export const DEFAULT_FILE_CARD_SETTINGS = {
    showFileName: true,
    showDuration: true,
    showTags: true,
    showFileSize: true,
    tagPopoverTrigger: 'click' as const,
    tagDisplayStyle: 'filled' as const,
    fileCardTagOrderMode: 'balanced' as const,
};

export const DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS = {
    thumbnailAction: 'scrub' as ThumbnailAction,
    archiveThumbnailAction: 'off' as ArchiveThumbnailAction,
    flipbookSpeed: 'normal' as FlipbookSpeed,
    animatedImagePreviewMode: 'hover' as AnimatedImagePreviewMode,
    playMode: {
        jumpType: 'random' as PlayModeJumpType,
        jumpInterval: 2000 as PlayModeJumpInterval,
    },
};

export const DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS = {
    rightPanelVideoMuted: true,
    rightPanelVideoPreviewMode: 'loop' as RightPanelVideoPreviewMode,
    rightPanelVideoJumpInterval: 2000 as PlayModeJumpInterval,
};

function normalizeStorageMaintenanceSettings(input: unknown): StorageMaintenanceSettings {
    const settings = input && typeof input === 'object'
        ? input as Partial<StorageMaintenanceSettings>
        : undefined;
    const thresholdValue = Number(settings?.autoCleanupThresholdMb);

    return {
        autoCleanupOrphanedThumbnailsOnStartup: typeof settings?.autoCleanupOrphanedThumbnailsOnStartup === 'boolean'
            ? settings.autoCleanupOrphanedThumbnailsOnStartup
            : DEFAULT_STORAGE_MAINTENANCE_SETTINGS.autoCleanupOrphanedThumbnailsOnStartup,
        autoCleanupThresholdMb: Number.isFinite(thresholdValue) && thresholdValue >= 0
            ? Math.round(thresholdValue)
            : DEFAULT_STORAGE_MAINTENANCE_SETTINGS.autoCleanupThresholdMb,
    };
}

// 外部アプリ型定義（Phase 12-7）
export interface ExternalApp {
    id: string;
    name: string;
    path: string;
    extensions: string[];  // 対応拡張子（空=全ファイル）
    createdAt: number;
}

export type SearchDestinationType = 'filename' | 'image';
export type SearchDestinationIcon = 'search' | 'globe' | 'image' | 'camera' | 'book' | 'sparkles' | 'link';

export interface SearchDestination {
    id: string;
    name: string;
    type: SearchDestinationType;
    url: string;
    icon: SearchDestinationIcon;
    enabled: boolean;
    createdAt: number;
}

function getDefaultSearchDestinationIcon(type: SearchDestinationType): SearchDestinationIcon {
    return type === 'filename' ? 'search' : 'image';
}

function normalizeSearchDestination(destination: SearchDestination): SearchDestination {
    return {
        ...destination,
        icon: destination.icon ?? getDefaultSearchDestinationIcon(destination.type),
    };
}

const DEFAULT_SEARCH_DESTINATIONS: SearchDestination[] = [
    {
        id: 'filename-google',
        name: 'Google',
        type: 'filename',
        url: 'https://www.google.com/search?q={query}',
        icon: 'search',
        enabled: true,
        createdAt: 1,
    },
    {
        id: 'filename-duckduckgo',
        name: 'DuckDuckGo',
        type: 'filename',
        url: 'https://duckduckgo.com/?q={query}',
        icon: 'globe',
        enabled: true,
        createdAt: 2,
    },
    {
        id: 'filename-bing',
        name: 'Bing',
        type: 'filename',
        url: 'https://www.bing.com/search?q={query}',
        icon: 'globe',
        enabled: true,
        createdAt: 3,
    },
    {
        id: 'image-google-lens',
        name: 'Google Lens',
        type: 'image',
        url: 'https://lens.google.com/',
        icon: 'camera',
        enabled: true,
        createdAt: 4,
    },
    {
        id: 'image-bing-visual-search',
        name: 'Bing Visual Search',
        type: 'image',
        url: 'https://www.bing.com/visualsearch',
        icon: 'image',
        enabled: true,
        createdAt: 5,
    },
    {
        id: 'image-yandex-images',
        name: 'Yandex Images',
        type: 'image',
        url: 'https://yandex.com/images/',
        icon: 'image',
        enabled: true,
        createdAt: 6,
    },
];

const VALID_LAYOUT_PRESETS = new Set<LayoutPreset>([
    'standard',
    'standardLarge',
    'manga',
    'video',
    'detailed',
    'mangaDetailed',
    'compact',
]);

const VALID_THUMBNAIL_PRESENTATIONS = new Set<ThumbnailPresentation>([
    'modeDefault',
    'contain',
    'cover',
    'square',
]);

function normalizeLayoutPreset(value: unknown): LayoutPreset | null {
    if (typeof value !== 'string') return null;
    return VALID_LAYOUT_PRESETS.has(value as LayoutPreset) ? (value as LayoutPreset) : null;
}

function normalizeThumbnailPresentation(value: unknown): ThumbnailPresentation | null {
    if (typeof value !== 'string') return null;
    return VALID_THUMBNAIL_PRESENTATIONS.has(value as ThumbnailPresentation)
        ? (value as ThumbnailPresentation)
        : null;
}

export function mapDisplayModeToPresentationAxes(displayMode: DisplayMode): {
    layoutPreset: LayoutPreset;
    thumbnailPresentation: ThumbnailPresentation;
} {
    switch (displayMode) {
        case 'whiteBrowser':
            return { layoutPreset: 'detailed', thumbnailPresentation: 'square' };
        case 'mangaDetailed':
            return { layoutPreset: 'mangaDetailed', thumbnailPresentation: 'square' };
        case 'compact':
            return { layoutPreset: 'compact', thumbnailPresentation: 'modeDefault' };
        case 'standard':
            return { layoutPreset: 'standard', thumbnailPresentation: 'modeDefault' };
        case 'standardLarge':
            return { layoutPreset: 'standardLarge', thumbnailPresentation: 'modeDefault' };
        case 'manga':
            return { layoutPreset: 'manga', thumbnailPresentation: 'modeDefault' };
        case 'video':
            return { layoutPreset: 'video', thumbnailPresentation: 'modeDefault' };
        default:
            return { layoutPreset: 'standard', thumbnailPresentation: 'modeDefault' };
    }
}

function mapLayoutPresetToLegacyDisplayMode(layoutPreset: LayoutPreset): DisplayMode {
    switch (layoutPreset) {
        case 'detailed':
            return 'whiteBrowser';
        case 'mangaDetailed':
            return 'mangaDetailed';
        case 'compact':
            return 'compact';
        case 'standard':
            return 'standard';
        case 'standardLarge':
            return 'standardLarge';
        case 'manga':
            return 'manga';
        case 'video':
            return 'video';
        default:
            return 'standard';
    }
}

interface SettingsState {
    thumbnailAction: ThumbnailAction;
    archiveThumbnailAction: ArchiveThumbnailAction;
    flipbookSpeed: FlipbookSpeed;
    animatedImagePreviewMode: AnimatedImagePreviewMode;
    rightPanelVideoMuted: boolean;
    rightPanelVideoPreviewMode: RightPanelVideoPreviewMode;
    rightPanelVideoJumpInterval: PlayModeJumpInterval;
    sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating'; // Phase 17: アクセストラッキング
    sortOrder: 'asc' | 'desc';
    defaultSearchTarget: SearchTarget;
    videoVolume: number; // 0.0 - 1.0
    audioVolume: number; // 0.0 - 1.0 (音声ファイル専用)
    lightboxOverlayOpacity: number; // 70 - 100
    performanceMode: boolean; // true = アニメーション無効化
    previewFrameCount: number; // スキャン時のプレビューフレーム数 (0-30)
    scanThrottleMs: number; // スキャン速度抑制（ファイル間待機時間 ms）
    profileFileTypeFilters: FileTypeCategoryFilters;
    profileSettingsMigrationV1Done: boolean;
    scanExclusionRules: ScanExclusionRules;
    storageMaintenanceSettings: StorageMaintenanceSettings;

    // サムネイル生成解像度（Phase 14整理）
    thumbnailResolution: number; // 生成時の幅px（160〜480）
    ratingDisplayThresholds: RatingDisplayThresholds;

    showFileName: boolean;
    showDuration: boolean;
    showTags: boolean;
    showFileSize: boolean;

    // 表示モード設定（Phase 14）
    activeDisplayPresetId: string;
    displayMode: DisplayMode;
    layoutPreset: LayoutPreset;
    thumbnailPresentation: ThumbnailPresentation;

    // 外部アプリ設定（Phase 12-7）
    externalApps: ExternalApp[];

    // Phase 18-B: デフォルト外部アプリ設定
    defaultExternalApps: Record<string, string>; // 拡張子(正規化済み) → アプリID

    searchDestinations: SearchDestination[];

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
    setThumbnailAction: (action: ThumbnailAction) => void;
    setArchiveThumbnailAction: (action: ArchiveThumbnailAction) => void;
    setFlipbookSpeed: (speed: FlipbookSpeed) => void;
    setAnimatedImagePreviewMode: (mode: AnimatedImagePreviewMode) => void;
    setRightPanelVideoMuted: (muted: boolean) => void;
    setRightPanelVideoPreviewMode: (mode: RightPanelVideoPreviewMode) => void;
    setRightPanelVideoJumpInterval: (interval: PlayModeJumpInterval) => void;
    setSortBy: (sortBy: 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed' | 'overallRating') => void;
    setSortOrder: (sortOrder: 'asc' | 'desc') => void;
    setDefaultSearchTarget: (target: SearchTarget) => void;
    setVideoVolume: (volume: number) => void;
    setAudioVolume: (volume: number) => void;
    setLightboxOverlayOpacity: (opacity: number) => void;
    setPerformanceMode: (enabled: boolean) => void;
    setPreviewFrameCount: (count: number) => void;
    setScanThrottleMs: (ms: number) => void;
    setThumbnailResolution: (resolution: number) => void;
    setRatingDisplayThresholds: (thresholds: RatingDisplayThresholds) => void;
    setScanExclusionRules: (rules: ScanExclusionRules) => void;
    setStorageMaintenanceSettings: (settings: StorageMaintenanceSettings) => void;
    applyProfileScopedSettings: (settings: ProfileScopedSettingsV1) => void;
    exportProfileScopedSettings: () => ProfileScopedSettingsV1;
    setProfileFileTypeFilters: (filters: FileTypeCategoryFilters) => void;
    setProfilePreviewFrameCount: (count: number) => void;
    setProfileScanThrottleMs: (ms: number) => void;
    setProfileThumbnailResolution: (resolution: number) => void;
    setProfileSettingsMigrationV1Done: (done: boolean) => void;
    setShowFileName: (show: boolean) => void;
    setShowDuration: (show: boolean) => void;
    setShowTags: (show: boolean) => void;
    setShowFileSize: (show: boolean) => void;
    // 表示モードアクション（Phase 14）
    setActiveDisplayPreset: (selection: DisplayPresetSelection) => void;
    setDisplayMode: (mode: DisplayMode) => void;
    setLayoutPreset: (preset: LayoutPreset) => void;
    setThumbnailPresentation: (presentation: ThumbnailPresentation) => void;
    // 外部アプリアクション（Phase 12-7）
    addExternalApp: (name: string, path: string, extensions: string[]) => void;
    updateExternalApp: (id: string, updates: Partial<Omit<ExternalApp, 'id' | 'createdAt'>>) => void;
    deleteExternalApp: (id: string) => void;
    // Phase 18-B: デフォルト外部アプリアクション
    setDefaultExternalApp: (extension: string, appId: string | null) => void;
    addSearchDestination: (type: SearchDestinationType, name: string, url: string, icon?: SearchDestinationIcon) => void;
    updateSearchDestination: (id: string, updates: Partial<Omit<SearchDestination, 'id' | 'createdAt'>>) => void;
    deleteSearchDestination: (id: string) => void;
    replaceSearchDestinations: (destinations: Array<Omit<SearchDestination, 'id' | 'createdAt'>>) => void;
    resetSearchDestinations: () => void;
    toggleSearchDestinationEnabled: (id: string, enabled: boolean) => void;
    moveSearchDestination: (id: string, direction: 'up' | 'down') => void;
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

type PersistedSettingsState = Partial<SettingsState> & {
    activeProfileId?: string;
    autoScanOnStartup?: boolean;
    rightPanelVideoMuted?: boolean;
    cardLayout?: string;
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            thumbnailAction: 'scrub',
            archiveThumbnailAction: DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.archiveThumbnailAction,
            flipbookSpeed: DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.flipbookSpeed,
            animatedImagePreviewMode: DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.animatedImagePreviewMode,
            rightPanelVideoMuted: DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS.rightPanelVideoMuted,
            rightPanelVideoPreviewMode: DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS.rightPanelVideoPreviewMode,
            rightPanelVideoJumpInterval: DEFAULT_RIGHT_PANEL_PREVIEW_SETTINGS.rightPanelVideoJumpInterval,
            sortBy: DEFAULT_LIST_DISPLAY_SETTINGS.sortBy,
            sortOrder: DEFAULT_LIST_DISPLAY_SETTINGS.sortOrder,
            defaultSearchTarget: DEFAULT_LIST_DISPLAY_SETTINGS.defaultSearchTarget,
            videoVolume: DEFAULT_MEDIA_PLAYBACK_SETTINGS.videoVolume,
            audioVolume: DEFAULT_MEDIA_PLAYBACK_SETTINGS.audioVolume,
            lightboxOverlayOpacity: DEFAULT_MEDIA_PLAYBACK_SETTINGS.lightboxOverlayOpacity,
            performanceMode: DEFAULT_MEDIA_PLAYBACK_SETTINGS.performanceMode,
            previewFrameCount: DEFAULT_PROFILE_SCOPED_SETTINGS.previewFrameCount,
            scanThrottleMs: DEFAULT_PROFILE_SCOPED_SETTINGS.scanThrottleMs,
            profileFileTypeFilters: { ...DEFAULT_PROFILE_SCOPED_SETTINGS.fileTypeFilters },
            profileSettingsMigrationV1Done: false,
            scanExclusionRules: { ...DEFAULT_SCAN_EXCLUSION_RULES },
            storageMaintenanceSettings: { ...DEFAULT_STORAGE_MAINTENANCE_SETTINGS },

            // サムネイル生成解像度（Phase 14整理）
            thumbnailResolution: DEFAULT_PROFILE_SCOPED_SETTINGS.thumbnailResolution,
            ratingDisplayThresholds: { ...DEFAULT_PROFILE_SCOPED_SETTINGS.ratingDisplayThresholds },

            showFileName: DEFAULT_FILE_CARD_SETTINGS.showFileName,
            showDuration: DEFAULT_FILE_CARD_SETTINGS.showDuration,
            showTags: DEFAULT_FILE_CARD_SETTINGS.showTags,
            showFileSize: DEFAULT_FILE_CARD_SETTINGS.showFileSize,

            // 表示モード設定デフォルト値（Phase 14）
            activeDisplayPresetId: DEFAULT_LIST_DISPLAY_SETTINGS.activeDisplayPresetId,
            displayMode: DEFAULT_LIST_DISPLAY_SETTINGS.displayMode,
            layoutPreset: DEFAULT_LIST_DISPLAY_SETTINGS.layoutPreset,
            thumbnailPresentation: DEFAULT_LIST_DISPLAY_SETTINGS.thumbnailPresentation,

            // 外部アプリ設定（Phase 12-7）
            externalApps: [],

            // Phase 18-B: デフォルト外部アプリ設定
            defaultExternalApps: {},

            searchDestinations: DEFAULT_SEARCH_DESTINATIONS,

            // グループ化設定（Phase 12-10）
            groupBy: DEFAULT_LIST_DISPLAY_SETTINGS.groupBy,

            // タグポップオーバー設定（Phase 14-8）
            tagPopoverTrigger: DEFAULT_FILE_CARD_SETTINGS.tagPopoverTrigger,

            // タグ表示スタイル設定
            tagDisplayStyle: DEFAULT_FILE_CARD_SETTINGS.tagDisplayStyle,
            fileCardTagOrderMode: DEFAULT_FILE_CARD_SETTINGS.fileCardTagOrderMode,

            // Phase 17-3: Playモード詳細設定
            playMode: { ...DEFAULT_THUMBNAIL_BEHAVIOR_SETTINGS.playMode },

            setThumbnailAction: (thumbnailAction) => set({ thumbnailAction }),
            setArchiveThumbnailAction: (archiveThumbnailAction) => set({ archiveThumbnailAction }),
            setFlipbookSpeed: (flipbookSpeed) => set({ flipbookSpeed }),
            setAnimatedImagePreviewMode: (animatedImagePreviewMode) => set({ animatedImagePreviewMode }),
            setRightPanelVideoMuted: (rightPanelVideoMuted) => set({ rightPanelVideoMuted }),
            setRightPanelVideoPreviewMode: (rightPanelVideoPreviewMode) => set({ rightPanelVideoPreviewMode }),
            setRightPanelVideoJumpInterval: (rightPanelVideoJumpInterval) => set({ rightPanelVideoJumpInterval }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (sortOrder) => set({ sortOrder }),
            setDefaultSearchTarget: (defaultSearchTarget) => set({ defaultSearchTarget }),
            setVideoVolume: (volume) => set({ videoVolume: volume }),
            setAudioVolume: (volume) => set({ audioVolume: volume }),
            setLightboxOverlayOpacity: (opacity) => set({ lightboxOverlayOpacity: clampOverlayOpacity(opacity) }),
            setPerformanceMode: (performanceMode) => set({ performanceMode }),
            setPreviewFrameCount: (previewFrameCount) => set({ previewFrameCount }),
            setScanThrottleMs: (scanThrottleMs) => set({ scanThrottleMs }),
            setThumbnailResolution: (thumbnailResolution) => set({ thumbnailResolution }),
            setRatingDisplayThresholds: (ratingDisplayThresholds) => set({
                ratingDisplayThresholds: normalizeRatingDisplayThresholds(ratingDisplayThresholds),
            }),
            setScanExclusionRules: (scanExclusionRules) => set({
                scanExclusionRules: normalizeScanExclusionRules(scanExclusionRules),
            }),
            setStorageMaintenanceSettings: (storageMaintenanceSettings) => set({
                storageMaintenanceSettings: normalizeStorageMaintenanceSettings(storageMaintenanceSettings),
            }),
            applyProfileScopedSettings: (settings) => set({
                profileFileTypeFilters: { ...DEFAULT_PROFILE_FILE_TYPE_FILTERS, ...settings.fileTypeFilters },
                previewFrameCount: Math.max(0, Math.min(30, Math.round(Number(settings.previewFrameCount) || 0))),
                scanThrottleMs: [0, 50, 100, 200].includes(Number(settings.scanThrottleMs)) ? Number(settings.scanThrottleMs) : 0,
                thumbnailResolution: [160, 200, 240, 280, 320, 360, 400, 440, 480].includes(Number(settings.thumbnailResolution))
                    ? Number(settings.thumbnailResolution)
                    : 320,
                ratingDisplayThresholds: normalizeRatingDisplayThresholds(settings.ratingDisplayThresholds),
                sortBy: settings.listDisplayDefaults?.sortBy ?? DEFAULT_LIST_DISPLAY_SETTINGS.sortBy,
                sortOrder: settings.listDisplayDefaults?.sortOrder ?? DEFAULT_LIST_DISPLAY_SETTINGS.sortOrder,
                groupBy: settings.listDisplayDefaults?.groupBy ?? DEFAULT_LIST_DISPLAY_SETTINGS.groupBy,
                defaultSearchTarget: settings.listDisplayDefaults?.defaultSearchTarget ?? DEFAULT_LIST_DISPLAY_SETTINGS.defaultSearchTarget,
                activeDisplayPresetId: settings.listDisplayDefaults?.activeDisplayPresetId ?? DEFAULT_LIST_DISPLAY_SETTINGS.activeDisplayPresetId,
                displayMode: settings.listDisplayDefaults?.displayMode ?? DEFAULT_LIST_DISPLAY_SETTINGS.displayMode,
                thumbnailPresentation: settings.listDisplayDefaults?.thumbnailPresentation ?? DEFAULT_LIST_DISPLAY_SETTINGS.thumbnailPresentation,
                showFileName: settings.fileCardSettings?.showFileName ?? DEFAULT_FILE_CARD_SETTINGS.showFileName,
                showDuration: settings.fileCardSettings?.showDuration ?? DEFAULT_FILE_CARD_SETTINGS.showDuration,
                showTags: settings.fileCardSettings?.showTags ?? DEFAULT_FILE_CARD_SETTINGS.showTags,
                showFileSize: settings.fileCardSettings?.showFileSize ?? DEFAULT_FILE_CARD_SETTINGS.showFileSize,
                tagPopoverTrigger: settings.fileCardSettings?.tagPopoverTrigger ?? DEFAULT_FILE_CARD_SETTINGS.tagPopoverTrigger,
                tagDisplayStyle: settings.fileCardSettings?.tagDisplayStyle ?? DEFAULT_FILE_CARD_SETTINGS.tagDisplayStyle,
                fileCardTagOrderMode: settings.fileCardSettings?.fileCardTagOrderMode ?? DEFAULT_FILE_CARD_SETTINGS.fileCardTagOrderMode,
                defaultExternalApps: settings.defaultExternalApps ?? {},
                searchDestinations: Array.isArray(settings.searchDestinations)
                    ? settings.searchDestinations.map((destination) => normalizeSearchDestination(destination))
                    : DEFAULT_SEARCH_DESTINATIONS,
            }),
            exportProfileScopedSettings: () => ({
                fileTypeFilters: { ...get().profileFileTypeFilters },
                previewFrameCount: get().previewFrameCount,
                scanThrottleMs: get().scanThrottleMs,
                thumbnailResolution: get().thumbnailResolution,
                ratingDisplayThresholds: { ...get().ratingDisplayThresholds },
                listDisplayDefaults: {
                    sortBy: get().sortBy,
                    sortOrder: get().sortOrder,
                    groupBy: get().groupBy,
                    defaultSearchTarget: get().defaultSearchTarget,
                    activeDisplayPresetId: get().activeDisplayPresetId,
                    displayMode: get().displayMode,
                    thumbnailPresentation: get().thumbnailPresentation,
                },
                fileCardSettings: {
                    showFileName: get().showFileName,
                    showDuration: get().showDuration,
                    showTags: get().showTags,
                    showFileSize: get().showFileSize,
                    tagPopoverTrigger: get().tagPopoverTrigger,
                    tagDisplayStyle: get().tagDisplayStyle,
                    fileCardTagOrderMode: get().fileCardTagOrderMode,
                },
                defaultExternalApps: { ...get().defaultExternalApps },
                searchDestinations: get().searchDestinations.map((destination) => ({ ...destination })),
            }),
            setProfileFileTypeFilters: (profileFileTypeFilters) => set({ profileFileTypeFilters }),
            setProfilePreviewFrameCount: (previewFrameCount) => set({ previewFrameCount }),
            setProfileScanThrottleMs: (scanThrottleMs) => set({ scanThrottleMs }),
            setProfileThumbnailResolution: (thumbnailResolution) => set({ thumbnailResolution }),
            setProfileSettingsMigrationV1Done: (profileSettingsMigrationV1Done) => set({ profileSettingsMigrationV1Done }),
            setShowFileName: (showFileName) => set({ showFileName }),
            setShowDuration: (showDuration) => set({ showDuration }),
            setShowTags: (showTags) => set({ showTags }),
            setShowFileSize: (showFileSize) => set({ showFileSize }),
            // 表示モード設定セッター（Phase 14）
            setActiveDisplayPreset: (selection) => {
                const { layoutPreset } = mapDisplayModeToPresentationAxes(selection.baseDisplayMode);
                set({
                    activeDisplayPresetId: selection.id,
                    displayMode: selection.baseDisplayMode,
                    layoutPreset,
                    thumbnailPresentation: selection.thumbnailPresentation,
                });
            },
            setDisplayMode: (displayMode) => {
                const { layoutPreset, thumbnailPresentation } = mapDisplayModeToPresentationAxes(displayMode);
                set({
                    activeDisplayPresetId: displayMode,
                    displayMode,
                    layoutPreset,
                    thumbnailPresentation,
                });
            },
            setLayoutPreset: (layoutPreset) => set({
                layoutPreset,
                displayMode: mapLayoutPresetToLegacyDisplayMode(layoutPreset),
                activeDisplayPresetId: mapLayoutPresetToLegacyDisplayMode(layoutPreset),
            }),
            setThumbnailPresentation: (thumbnailPresentation) => set({ thumbnailPresentation }),
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
            addSearchDestination: (type, name, url, icon) => {
                const normalizedUrl = url.trim();
                const normalizedName = name.trim();
                if (!normalizedName || !normalizedUrl) return;
                const newDestination: SearchDestination = {
                    id: crypto.randomUUID(),
                    type,
                    name: normalizedName,
                    url: normalizedUrl,
                    icon: icon ?? getDefaultSearchDestinationIcon(type),
                    enabled: true,
                    createdAt: Date.now(),
                };
                set((state) => ({
                    searchDestinations: [...state.searchDestinations, newDestination]
                }));
            },
            updateSearchDestination: (id, updates) => {
                set((state) => ({
                    searchDestinations: state.searchDestinations.map((destination) =>
                        destination.id === id
                            ? {
                                ...destination,
                                ...updates,
                                name: typeof updates.name === 'string' ? updates.name.trim() : destination.name,
                                url: typeof updates.url === 'string' ? updates.url.trim() : destination.url,
                                icon: updates.icon ?? destination.icon,
                            }
                            : destination
                    )
                }));
            },
            deleteSearchDestination: (id) => {
                set((state) => ({
                    searchDestinations: state.searchDestinations.filter((destination) => destination.id !== id)
                }));
            },
            replaceSearchDestinations: (destinations) => {
                set({
                    searchDestinations: destinations.map((destination, index) => ({
                        id: crypto.randomUUID(),
                        type: destination.type,
                        name: destination.name.trim(),
                        url: destination.url.trim(),
                        icon: destination.icon ?? getDefaultSearchDestinationIcon(destination.type),
                        enabled: destination.enabled !== false,
                        createdAt: Date.now() + index,
                    }))
                });
            },
            resetSearchDestinations: () => {
                set({
                    searchDestinations: DEFAULT_SEARCH_DESTINATIONS.map((destination) => ({
                        ...destination,
                        id: crypto.randomUUID(),
                        createdAt: Date.now(),
                    }))
                });
            },
            toggleSearchDestinationEnabled: (id, enabled) => {
                set((state) => ({
                    searchDestinations: state.searchDestinations.map((destination) =>
                        destination.id === id
                            ? { ...destination, enabled }
                            : destination
                    )
                }));
            },
            moveSearchDestination: (id, direction) => {
                set((state) => {
                    const currentIndex = state.searchDestinations.findIndex((destination) => destination.id === id);
                    if (currentIndex < 0) {
                        return state;
                    }

                    const current = state.searchDestinations[currentIndex];
                    if (!current) {
                        return state;
                    }

                    const siblingIndexes = state.searchDestinations
                        .map((destination, index) => ({ destination, index }))
                        .filter(({ destination }) => destination.type === current.type)
                        .map(({ index }) => index);

                    const siblingPosition = siblingIndexes.indexOf(currentIndex);
                    if (siblingPosition < 0) {
                        return state;
                    }

                    const targetSiblingPosition = direction === 'up'
                        ? siblingPosition - 1
                        : siblingPosition + 1;

                    const targetIndex = siblingIndexes[targetSiblingPosition];
                    if (targetIndex === undefined) {
                        return state;
                    }

                    const nextDestinations = [...state.searchDestinations];
                    const temp = nextDestinations[currentIndex];
                    nextDestinations[currentIndex] = nextDestinations[targetIndex]!;
                    nextDestinations[targetIndex] = temp!;

                    return { searchDestinations: nextDestinations };
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
            merge: (persistedState, currentState) => {
                const typedPersisted = persistedState as PersistedSettingsState | undefined;
                const {
                    activeProfileId: _legacyActiveProfileId,
                    autoScanOnStartup: _legacyAutoScanOnStartup,
                    rightPanelVideoMuted: _legacyRightPanelVideoMuted,
                    cardLayout: _legacyCardLayout,
                    ...persistedWithoutLegacyKeys
                } = typedPersisted ?? {};
                const persistedDestinations = Array.isArray(typedPersisted?.searchDestinations)
                    ? typedPersisted.searchDestinations.map((destination) =>
                        normalizeSearchDestination(destination as SearchDestination)
                    )
                    : currentState.searchDestinations;
                const fallbackDisplayMode = persistedWithoutLegacyKeys.displayMode ?? currentState.displayMode;
                const fallbackActiveDisplayPresetId = typeof persistedWithoutLegacyKeys.activeDisplayPresetId === 'string' && persistedWithoutLegacyKeys.activeDisplayPresetId
                    ? persistedWithoutLegacyKeys.activeDisplayPresetId
                    : fallbackDisplayMode;
                const mappedAxes = mapDisplayModeToPresentationAxes(fallbackDisplayMode);
                const persistedLayoutPreset = normalizeLayoutPreset(persistedWithoutLegacyKeys.layoutPreset);
                const persistedThumbnailPresentation = normalizeThumbnailPresentation(persistedWithoutLegacyKeys.thumbnailPresentation);

                return {
                    ...currentState,
                    ...persistedWithoutLegacyKeys,
                    rightPanelVideoMuted: typeof typedPersisted?.rightPanelVideoMuted === 'boolean'
                        ? typedPersisted.rightPanelVideoMuted
                        : currentState.rightPanelVideoMuted,
                    activeDisplayPresetId: fallbackActiveDisplayPresetId,
                    searchDestinations: persistedDestinations,
                    scanExclusionRules: normalizeScanExclusionRules(persistedWithoutLegacyKeys.scanExclusionRules),
                    storageMaintenanceSettings: normalizeStorageMaintenanceSettings(persistedWithoutLegacyKeys.storageMaintenanceSettings),
                    ratingDisplayThresholds: normalizeRatingDisplayThresholds(persistedWithoutLegacyKeys.ratingDisplayThresholds),
                    layoutPreset: persistedLayoutPreset ?? mappedAxes.layoutPreset,
                    thumbnailPresentation: persistedThumbnailPresentation ?? mappedAxes.thumbnailPresentation,
                };
            },
        }
    )
);
