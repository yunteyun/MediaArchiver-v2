import type { DisplayMode, LayoutPreset } from '../../stores/useSettingsStore';
import type {
    FileCardDisplayModeDefinition,
    FileCardLayoutConfig,
} from './displayModeTypes';

export type TagSummaryUiPreset = {
    visibleCount: number;
    chipPaddingClass: string;
    chipTextClass: string;
    chipRadiusClass: string;
    chipMaxWidthClass: string;
    rowLayoutClass: string;
};

export type DetailedInfoUiPreset = {
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

export const FILE_CARD_DISPLAY_MODE_DEFINITIONS: Record<DisplayMode, FileCardDisplayModeDefinition> = {
    standard: {
        mode: 'standard',
        label: '標準（M）',
        menuOrder: 20,
        iconKey: 'grid',
        infoVariant: 'detailed',
        cardDirection: 'vertical',
        layout: {
            aspectRatio: '1/1',
            cardWidth: 220,
            thumbnailHeight: 220,
            infoAreaHeight: 80,
            totalHeight: 300,
        },
    },
    standardLarge: {
        mode: 'standardLarge',
        label: '標準（L）',
        menuOrder: 30,
        iconKey: 'maximize',
        infoVariant: 'detailed',
        cardDirection: 'vertical',
        layout: {
            aspectRatio: '1/1',
            cardWidth: 265,
            thumbnailHeight: 265,
            infoAreaHeight: 80,
            totalHeight: 345,
        },
    },
    manga: {
        mode: 'manga',
        label: '漫画',
        menuOrder: 50,
        iconKey: 'layoutGrid',
        infoVariant: 'detailed',
        cardDirection: 'vertical',
        layout: {
            aspectRatio: '2/3',
            cardWidth: 220,
            thumbnailHeight: 330,
            infoAreaHeight: 76,
            totalHeight: 406,
        },
    },
    video: {
        mode: 'video',
        label: '動画（ワイド）',
        menuOrder: 40,
        iconKey: 'film',
        infoVariant: 'detailed',
        cardDirection: 'vertical',
        layout: {
            aspectRatio: '25/16',
            cardWidth: 265,
            thumbnailHeight: 170,
            infoAreaHeight: 76,
            totalHeight: 246,
        },
    },
    whiteBrowser: {
        mode: 'whiteBrowser',
        label: '詳細表示',
        menuOrder: 45,
        iconKey: 'layoutGrid',
        infoVariant: 'detailed',
        cardDirection: 'horizontal',
        horizontalThumbnailAspectRatio: '1 / 1',
        layout: {
            aspectRatio: '16/9',
            cardWidth: 420,
            thumbnailHeight: 200,
            infoAreaHeight: 200,
            totalHeight: 360,
        },
    },
    mangaDetailed: {
        mode: 'mangaDetailed',
        label: '詳細表示（漫画）',
        menuOrder: 46,
        iconKey: 'layoutGrid',
        infoVariant: 'detailed',
        cardDirection: 'horizontal',
        horizontalThumbnailAspectRatio: '2 / 3',
        layout: {
            aspectRatio: '3/2',
            cardWidth: 360,
            thumbnailHeight: 240,
            infoAreaHeight: 240,
            totalHeight: 360,
        },
    },
    compact: {
        mode: 'compact',
        // NOTE: Internal key "compact" is kept for persisted settings compatibility.
        // UI label is "標準（S/簡易）" to align with Standard S/M/L naming.
        label: '標準（S/簡易）',
        menuOrder: 10,
        iconKey: 'minimize',
        infoVariant: 'compact',
        cardDirection: 'vertical',
        hideThumbnailBadges: true,
        layout: {
            aspectRatio: '5/4',
            cardWidth: 200,
            thumbnailHeight: 160,
            infoAreaHeight: 48,
            totalHeight: 208,
        },
    },
};

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

export const DISPLAY_MODE_LAYOUT_CONFIGS: Record<DisplayMode, FileCardLayoutConfig> = {
    standard: FILE_CARD_DISPLAY_MODE_DEFINITIONS.standard.layout,
    standardLarge: FILE_CARD_DISPLAY_MODE_DEFINITIONS.standardLarge.layout,
    manga: FILE_CARD_DISPLAY_MODE_DEFINITIONS.manga.layout,
    video: FILE_CARD_DISPLAY_MODE_DEFINITIONS.video.layout,
    whiteBrowser: FILE_CARD_DISPLAY_MODE_DEFINITIONS.whiteBrowser.layout,
    mangaDetailed: FILE_CARD_DISPLAY_MODE_DEFINITIONS.mangaDetailed.layout,
    compact: FILE_CARD_DISPLAY_MODE_DEFINITIONS.compact.layout,
};

const TAG_SUMMARY_UI_PRESETS: Record<DisplayMode, TagSummaryUiPreset> = {
    standard: {
        visibleCount: 3,
        chipPaddingClass: 'px-1.5 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipRadiusClass: 'rounded-md',
        chipMaxWidthClass: 'max-w-[90px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    standardLarge: {
        visibleCount: 3,
        chipPaddingClass: 'px-1.5 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipRadiusClass: 'rounded-md',
        chipMaxWidthClass: 'max-w-[90px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    manga: {
        visibleCount: 2,
        chipPaddingClass: 'px-1.5 py-0.5',
        chipTextClass: 'text-[8px]',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[60px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    video: {
        visibleCount: 3,
        chipPaddingClass: 'px-1.5 py-0.5',
        chipTextClass: 'text-[8px]',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[60px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    whiteBrowser: {
        visibleCount: 15,
        chipPaddingClass: 'px-2 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[110px]',
        rowLayoutClass: 'flex-wrap items-start justify-start content-start max-h-[72px]',
    },
    mangaDetailed: {
        visibleCount: 10,
        chipPaddingClass: 'px-2 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[84px]',
        rowLayoutClass: 'flex-wrap items-start justify-start content-start max-h-[72px]',
    },
    compact: {
        visibleCount: 3,
        chipPaddingClass: 'px-1.5 py-0.5',
        chipTextClass: 'text-[8px]',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[60px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
};

const DETAILED_INFO_UI_PRESETS: Record<DisplayMode, DetailedInfoUiPreset> = {
    standard: {
        isBadgeMetaMode: true,
        containerClass: 'flex flex-col bg-surface-800 px-3.5 py-2.5 justify-start',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0.5 truncate',
        metaLineClass: 'text-[10px] text-surface-500 truncate leading-snug mb-1',
        bottomRowClass: 'flex justify-between gap-1 items-center mt-auto',
        standaloneFileSizeClass: 'inline-flex items-center text-[8px] leading-none font-bold text-surface-200 bg-surface-700/80',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.standard.visibleCount,
    },
    standardLarge: {
        isBadgeMetaMode: true,
        containerClass: 'flex flex-col bg-surface-800 px-3.5 py-2.5 justify-start',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0.5 truncate',
        metaLineClass: 'text-[10px] text-surface-500 truncate leading-snug mb-1',
        bottomRowClass: 'flex justify-between gap-1 items-center mt-auto',
        standaloneFileSizeClass: 'inline-flex items-center text-[8px] leading-none font-bold text-surface-200 bg-surface-700/80',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.standardLarge.visibleCount,
    },
    manga: {
        isBadgeMetaMode: true,
        containerClass: 'flex flex-col bg-surface-800 px-3 py-1.5 justify-between',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0 leading-tight truncate',
        metaLineClass: 'text-[10px] text-surface-500 truncate leading-tight mb-0.5',
        bottomRowClass: 'flex justify-between gap-1 items-center',
        standaloneFileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight bg-surface-700/60',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[84px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.manga.visibleCount,
    },
    video: {
        isBadgeMetaMode: true,
        containerClass: 'flex flex-col bg-surface-800 px-3.5 py-2.5 justify-start',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0.5 truncate',
        metaLineClass: 'text-[10px] text-surface-500 truncate leading-snug mb-1',
        bottomRowClass: 'flex justify-between gap-1 items-center mt-auto',
        standaloneFileSizeClass: 'inline-flex items-center text-[8px] leading-none font-bold text-surface-200 bg-surface-700/80',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[96px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.video.visibleCount,
    },
    whiteBrowser: {
        isBadgeMetaMode: false,
        containerClass: 'flex flex-col bg-surface-800 px-2.5 py-2 justify-start',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-[12px] leading-snug mb-1 line-clamp-2 break-all',
        metaLineClass: 'text-[10px] text-surface-400 leading-snug mb-1 whitespace-normal break-all line-clamp-3',
        bottomRowClass: 'flex flex-col items-start gap-1 mt-auto',
        standaloneFileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight bg-surface-700/60',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[140px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.whiteBrowser.visibleCount,
    },
    mangaDetailed: {
        isBadgeMetaMode: false,
        containerClass: 'flex flex-col bg-surface-800 px-2.5 py-2 justify-start',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-[12px] leading-snug mb-1 line-clamp-2 break-all',
        metaLineClass: 'text-[10px] text-surface-400 leading-snug mb-1 whitespace-normal break-all line-clamp-3',
        bottomRowClass: 'flex flex-col items-start gap-1 mt-auto',
        standaloneFileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight bg-surface-700/60',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.mangaDetailed.visibleCount,
    },
    compact: {
        isBadgeMetaMode: true,
        containerClass: 'flex flex-col bg-surface-800 px-3.5 py-2.5 justify-start',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0.5 truncate',
        metaLineClass: 'text-[10px] text-surface-500 truncate leading-snug mb-1',
        bottomRowClass: 'flex justify-between gap-1 items-center mt-auto',
        standaloneFileSizeClass: 'inline-flex items-center text-[8px] leading-none font-bold text-surface-200 bg-surface-700/80',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: TAG_SUMMARY_UI_PRESETS.compact.visibleCount,
    },
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

