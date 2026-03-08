import type { FileCardDisplayPreset } from './types';
import { DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE } from './shared';

export const standardLargeDisplayPreset: FileCardDisplayPreset = {
    definition: {
        mode: 'standardLarge',
        label: '標準（L）',
        menuOrder: 30,
        iconKey: 'maximize',
        cardGrowMax: 16,
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
    tagSummaryUi: {
        visibleCount: 3,
        chipPaddingClass: 'px-1.5 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipRadiusClass: 'rounded-md',
        chipMaxWidthClass: 'max-w-[90px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    detailedInfoUi: {
        ...DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: 3,
    },
};
