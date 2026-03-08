import type {
    AnimatedImagePreviewMode,
    CardLayout,
    ExternalApp,
    FileCardTagOrderMode,
    FlipbookSpeed,
    GroupBy,
    LayoutPreset,
    PlayModeJumpInterval,
    PlayModeJumpType,
    ProfileScopedSettingsV1,
    RightPanelVideoPreviewMode,
    ScanExclusionRules,
    SearchDestination,
    StorageMaintenanceSettings,
    TagDisplayStyle,
    TagPopoverTrigger,
    ThumbnailPresentation,
} from '../stores/useSettingsStore';

type SortBy = 'name' | 'date' | 'size' | 'type' | 'accessCount' | 'lastAccessed';
type SortOrder = 'asc' | 'desc';
type DisplayMode = 'standard' | 'standardLarge' | 'manga' | 'video' | 'whiteBrowser' | 'mangaDetailed' | 'compact';

export interface GlobalSettingsExportV1 {
    thumbnailAction: 'scrub' | 'flipbook' | 'play';
    flipbookSpeed: FlipbookSpeed;
    animatedImagePreviewMode: AnimatedImagePreviewMode;
    rightPanelVideoMuted: boolean;
    rightPanelVideoPreviewMode: RightPanelVideoPreviewMode;
    rightPanelVideoJumpInterval: PlayModeJumpInterval;
    sortBy: SortBy;
    sortOrder: SortOrder;
    videoVolume: number;
    audioVolume: number;
    lightboxOverlayOpacity: number;
    performanceMode: boolean;
    scanExclusionRules: ScanExclusionRules;
    storageMaintenanceSettings: StorageMaintenanceSettings;
    cardLayout: CardLayout;
    showFileName: boolean;
    showDuration: boolean;
    showTags: boolean;
    showFileSize: boolean;
    activeDisplayPresetId: string;
    displayMode: DisplayMode;
    layoutPreset: LayoutPreset;
    thumbnailPresentation: ThumbnailPresentation;
    externalApps: ExternalApp[];
    defaultExternalApps: Record<string, string>;
    searchDestinations: SearchDestination[];
    groupBy: GroupBy;
    tagPopoverTrigger: TagPopoverTrigger;
    tagDisplayStyle: TagDisplayStyle;
    fileCardTagOrderMode: FileCardTagOrderMode;
    playMode: {
        jumpType: PlayModeJumpType;
        jumpInterval: PlayModeJumpInterval;
    };
}

export interface SettingsExportPayloadV1 {
    version: 1;
    exportedAt: string;
    globalSettings: GlobalSettingsExportV1;
    profileSettings: ProfileScopedSettingsV1;
}

export function buildSettingsExportPayload(
    globalSettings: GlobalSettingsExportV1,
    profileSettings: ProfileScopedSettingsV1
): SettingsExportPayloadV1 {
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        globalSettings,
        profileSettings,
    };
}

export function parseSettingsImportPayload(content: string): SettingsExportPayloadV1 {
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('JSON の解析に失敗しました');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('設定ファイルの形式が不正です');
    }

    const payload = parsed as Partial<SettingsExportPayloadV1>;
    if (payload.version !== 1) {
        throw new Error('対応していない設定ファイルです');
    }
    if (!payload.globalSettings || typeof payload.globalSettings !== 'object') {
        throw new Error('全体設定が見つかりません');
    }
    if (!payload.profileSettings || typeof payload.profileSettings !== 'object') {
        throw new Error('プロファイル設定が見つかりません');
    }

    return payload as SettingsExportPayloadV1;
}
