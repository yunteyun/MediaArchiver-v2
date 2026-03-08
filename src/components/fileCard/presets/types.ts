import type { DisplayMode, ThumbnailPresentation } from '../../../stores/useSettingsStore';
import type {
    DisplayModeIconKey,
    FileCardDirection,
    FileCardDisplayModeDefinition,
    FileCardInfoVariant,
    FileCardLayoutConfig,
} from '../displayModeTypes';

export type DetailedPanelBadgeKey = 'size' | 'extension' | 'updatedDate' | 'folder';

export type TagSummaryUiPreset = {
    visibleCount: number;
    chipPaddingClass: string;
    chipTextClass: string;
    chipFontWeightClass: string;
    chipRadiusClass: string;
    chipMaxWidthClass: string;
    rowGapClass: string;
    rowLayoutClass: string;
};

export type DetailedInfoUiPreset = {
    detailedPanelBadgeKeys: DetailedPanelBadgeKey[];
    isBadgeMetaMode: boolean;
    containerClass: string;
    titleClass: string;
    metaLineClass: string;
    bottomRowClass: string;
    standaloneFileSizeClass: string;
    fallbackTagSummaryVisibleCount: number;
    folderBadgeMaxWidthClass: string;
    tagSummaryVisibleCount: number;
};

export type CompactInfoUiPreset = {
    containerClass: string;
    titleClass: string;
    metaRowClass: string;
    fileSizeClass: string;
};

export interface FileCardDisplayPreset {
    definition: FileCardDisplayModeDefinition;
    tagSummaryUi: TagSummaryUiPreset;
    detailedInfoUi: DetailedInfoUiPreset;
    compactInfoUi: CompactInfoUiPreset;
    thumbnailPresentation: ThumbnailPresentation;
}

export interface ExternalDisplayPresetManifest {
    id: string;
    extends: DisplayMode;
    label?: string;
    menuOrder?: number;
    iconKey?: DisplayModeIconKey;
    layout?: Partial<FileCardLayoutConfig>;
    cardGrowMax?: number;
    infoVariant?: FileCardInfoVariant;
    cardDirection?: FileCardDirection;
    horizontalThumbnailAspectRatio?: string;
    hideThumbnailBadges?: boolean;
    tagSummaryUi?: Partial<TagSummaryUiPreset>;
    detailedInfoUi?: Partial<DetailedInfoUiPreset>;
    compactInfoUi?: Partial<CompactInfoUiPreset>;
    thumbnailPresentation?: ThumbnailPresentation;
}

export interface ResolvedFileCardDisplayPreset extends FileCardDisplayPreset {
    id: string;
    source: 'builtin' | 'external';
    baseDisplayMode: DisplayMode;
}

export interface DisplayPresetSelection {
    id: string;
    baseDisplayMode: DisplayMode;
    thumbnailPresentation: ThumbnailPresentation;
}

export interface ExternalDisplayPresetListResult {
    directory: string;
    presets: ExternalDisplayPresetManifest[];
    warnings: string[];
}
