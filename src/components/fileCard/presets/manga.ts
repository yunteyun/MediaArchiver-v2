import type { FileCardDisplayPreset } from './types';

export const mangaDisplayPreset: FileCardDisplayPreset = {
    definition: {
        mode: 'manga',
        label: '縦型',
        menuOrder: 50,
        iconKey: 'layoutGrid',
        cardGrowMax: 12,
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
    tagSummaryUi: {
        visibleCount: 2,
        chipPaddingClass: 'px-1.5 py-0.5',
        chipTextClass: 'text-[8px]',
        chipFontWeightClass: 'font-bold',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[60px]',
        rowGapClass: 'gap-1',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    detailedInfoUi: {
        detailedPanelBadgeKeys: [],
        isBadgeMetaMode: true,
        containerClass: 'flex flex-col bg-surface-800 px-3 py-1.5 justify-between',
        titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0 leading-tight truncate',
        metaLineClass: 'text-[10px] text-surface-500 truncate leading-tight mb-0.5',
        bottomRowClass: 'flex justify-between gap-1 items-center',
        standaloneFileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight bg-surface-700/60',
        fallbackTagSummaryVisibleCount: 3,
        folderBadgeMaxWidthClass: 'max-w-[84px]',
        tagSummaryVisibleCount: 2,
    },
    compactInfoUi: {
        containerClass: 'px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0',
        titleClass: 'text-xs text-white truncate leading-tight font-semibold mb-0.5',
        metaRowClass: 'flex items-start justify-between gap-1',
        fileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded',
    },
    thumbnailPresentation: 'modeDefault',
};
