import type { DisplayMode, LayoutPreset } from '../../stores/useSettingsStore';
import type { FileCardDisplayModeDefinition, FileCardLayoutConfig } from './displayModeTypes';
import { FILE_CARD_DISPLAY_PRESETS } from './presets';
import type { DetailedInfoUiPreset, DetailedPanelBadgeKey, TagSummaryUiPreset } from './presets/types';

export type { DetailedInfoUiPreset, DetailedPanelBadgeKey, TagSummaryUiPreset } from './presets/types';

const LAYOUT_PRESET_TO_DISPLAY_MODE: Record<LayoutPreset, DisplayMode> = {
    standard: 'standard',
    standardLarge: 'standardLarge',
    manga: 'manga',
    video: 'video',
    detailed: 'whiteBrowser',
    mangaDetailed: 'mangaDetailed',
    compact: 'compact',
};

const DISPLAY_MODE_TO_LAYOUT_PRESET: Record<DisplayMode, LayoutPreset> = {
    standard: 'standard',
    standardLarge: 'standardLarge',
    manga: 'manga',
    video: 'video',
    whiteBrowser: 'detailed',
    mangaDetailed: 'mangaDetailed',
    compact: 'compact',
};

export const FILE_CARD_DISPLAY_MODE_DEFINITIONS: Record<DisplayMode, FileCardDisplayModeDefinition> = {
    standard: FILE_CARD_DISPLAY_PRESETS.standard.definition,
    standardLarge: FILE_CARD_DISPLAY_PRESETS.standardLarge.definition,
    manga: FILE_CARD_DISPLAY_PRESETS.manga.definition,
    video: FILE_CARD_DISPLAY_PRESETS.video.definition,
    whiteBrowser: FILE_CARD_DISPLAY_PRESETS.whiteBrowser.definition,
    mangaDetailed: FILE_CARD_DISPLAY_PRESETS.mangaDetailed.definition,
    compact: FILE_CARD_DISPLAY_PRESETS.compact.definition,
};

export const DISPLAY_MODE_LAYOUT_CONFIGS: Record<DisplayMode, FileCardLayoutConfig> = {
    standard: FILE_CARD_DISPLAY_PRESETS.standard.definition.layout,
    standardLarge: FILE_CARD_DISPLAY_PRESETS.standardLarge.definition.layout,
    manga: FILE_CARD_DISPLAY_PRESETS.manga.definition.layout,
    video: FILE_CARD_DISPLAY_PRESETS.video.definition.layout,
    whiteBrowser: FILE_CARD_DISPLAY_PRESETS.whiteBrowser.definition.layout,
    mangaDetailed: FILE_CARD_DISPLAY_PRESETS.mangaDetailed.definition.layout,
    compact: FILE_CARD_DISPLAY_PRESETS.compact.definition.layout,
};

const TAG_SUMMARY_UI_PRESETS: Record<DisplayMode, TagSummaryUiPreset> = {
    standard: FILE_CARD_DISPLAY_PRESETS.standard.tagSummaryUi,
    standardLarge: FILE_CARD_DISPLAY_PRESETS.standardLarge.tagSummaryUi,
    manga: FILE_CARD_DISPLAY_PRESETS.manga.tagSummaryUi,
    video: FILE_CARD_DISPLAY_PRESETS.video.tagSummaryUi,
    whiteBrowser: FILE_CARD_DISPLAY_PRESETS.whiteBrowser.tagSummaryUi,
    mangaDetailed: FILE_CARD_DISPLAY_PRESETS.mangaDetailed.tagSummaryUi,
    compact: FILE_CARD_DISPLAY_PRESETS.compact.tagSummaryUi,
};

const DETAILED_INFO_UI_PRESETS: Record<DisplayMode, DetailedInfoUiPreset> = {
    standard: FILE_CARD_DISPLAY_PRESETS.standard.detailedInfoUi,
    standardLarge: FILE_CARD_DISPLAY_PRESETS.standardLarge.detailedInfoUi,
    manga: FILE_CARD_DISPLAY_PRESETS.manga.detailedInfoUi,
    video: FILE_CARD_DISPLAY_PRESETS.video.detailedInfoUi,
    whiteBrowser: FILE_CARD_DISPLAY_PRESETS.whiteBrowser.detailedInfoUi,
    mangaDetailed: FILE_CARD_DISPLAY_PRESETS.mangaDetailed.detailedInfoUi,
    compact: FILE_CARD_DISPLAY_PRESETS.compact.detailedInfoUi,
};

export const getDisplayModeDefinition = (mode: DisplayMode): FileCardDisplayModeDefinition => {
    return FILE_CARD_DISPLAY_MODE_DEFINITIONS[mode];
};

export const isHorizontalDisplayMode = (mode: DisplayMode): boolean => {
    return getDisplayModeDefinition(mode).cardDirection === 'horizontal';
};

export const getHorizontalThumbnailAspectRatio = (mode: DisplayMode): string => {
    return getDisplayModeDefinition(mode).horizontalThumbnailAspectRatio ?? '1 / 1';
};

export const getTagSummaryUiPreset = (mode: DisplayMode): TagSummaryUiPreset => {
    return TAG_SUMMARY_UI_PRESETS[mode];
};

export const getDetailedInfoUiPreset = (mode: DisplayMode): DetailedInfoUiPreset => {
    return DETAILED_INFO_UI_PRESETS[mode];
};

export const getDisplayModeFromLayoutPreset = (layoutPreset: LayoutPreset): DisplayMode => {
    return LAYOUT_PRESET_TO_DISPLAY_MODE[layoutPreset];
};

export const getLayoutPresetFromDisplayMode = (displayMode: DisplayMode): LayoutPreset => {
    return DISPLAY_MODE_TO_LAYOUT_PRESET[displayMode];
};

export const getDisplayModeDefinitionByLayoutPreset = (layoutPreset: LayoutPreset): FileCardDisplayModeDefinition => {
    return getDisplayModeDefinition(getDisplayModeFromLayoutPreset(layoutPreset));
};

export const getDisplayModeMenuOptions = (): FileCardDisplayModeDefinition[] => {
    return Object.values(FILE_CARD_DISPLAY_MODE_DEFINITIONS)
        .slice()
        .sort((a, b) => a.menuOrder - b.menuOrder);
};

