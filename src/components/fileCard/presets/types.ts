import type { FileCardDisplayModeDefinition } from '../displayModeTypes';

export type DetailedPanelBadgeKey = 'size' | 'extension' | 'updatedDate' | 'folder';

export type TagSummaryUiPreset = {
    visibleCount: number;
    chipPaddingClass: string;
    chipTextClass: string;
    chipRadiusClass: string;
    chipMaxWidthClass: string;
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

export interface FileCardDisplayPreset {
    definition: FileCardDisplayModeDefinition;
    tagSummaryUi: TagSummaryUiPreset;
    detailedInfoUi: DetailedInfoUiPreset;
}
