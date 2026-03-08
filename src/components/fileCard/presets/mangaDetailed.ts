import type { FileCardDisplayPreset } from './types';
import { DETAILED_INFO_HORIZONTAL_PANEL_PRESET_BASE } from './shared';

export const mangaDetailedDisplayPreset: FileCardDisplayPreset = {
    definition: {
        mode: 'mangaDetailed',
        label: '詳細表示（縦）',
        menuOrder: 46,
        iconKey: 'layoutGrid',
        cardGrowMax: 16,
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
    tagSummaryUi: {
        visibleCount: 10,
        chipPaddingClass: 'px-2 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipFontWeightClass: 'font-bold',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[84px]',
        rowGapClass: 'gap-1',
        rowLayoutClass: 'flex-wrap items-start justify-start content-start max-h-[72px]',
    },
    detailedInfoUi: {
        ...DETAILED_INFO_HORIZONTAL_PANEL_PRESET_BASE,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: 10,
    },
    compactInfoUi: {
        containerClass: 'px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0',
        titleClass: 'text-xs text-white truncate leading-tight font-semibold mb-0.5',
        metaRowClass: 'flex items-start justify-between gap-1',
        fileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded',
    },
    thumbnailPresentation: 'square',
};
