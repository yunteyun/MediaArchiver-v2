import type { FileCardDisplayPreset } from './types';
import { DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE } from './shared';

export const standardDisplayPreset: FileCardDisplayPreset = {
    definition: {
        mode: 'standard',
        label: '標準（M）',
        menuOrder: 20,
        iconKey: 'grid',
        cardGrowMax: 16,
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
