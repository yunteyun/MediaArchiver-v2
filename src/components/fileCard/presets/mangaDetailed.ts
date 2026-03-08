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
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[84px]',
        rowLayoutClass: 'flex-wrap items-start justify-start content-start max-h-[72px]',
    },
    detailedInfoUi: {
        ...DETAILED_INFO_HORIZONTAL_PANEL_PRESET_BASE,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: 10,
    },
    thumbnailPresentation: 'square',
};
