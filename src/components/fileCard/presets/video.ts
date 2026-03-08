import type { FileCardDisplayPreset } from './types';
import { DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE } from './shared';

export const videoDisplayPreset: FileCardDisplayPreset = {
    definition: {
        mode: 'video',
        label: '動画（ワイド）',
        menuOrder: 40,
        iconKey: 'film',
        cardGrowMax: 12,
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
    tagSummaryUi: {
        visibleCount: 3,
        chipPaddingClass: 'px-1.5 py-0.5',
        chipTextClass: 'text-[8px]',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[60px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    detailedInfoUi: {
        ...DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE,
        folderBadgeMaxWidthClass: 'max-w-[96px]',
        tagSummaryVisibleCount: 3,
    },
    thumbnailPresentation: 'modeDefault',
};
