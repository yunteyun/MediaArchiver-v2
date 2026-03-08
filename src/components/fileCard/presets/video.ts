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
    compactInfoUi: {
        containerClass: 'px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0',
        titleClass: 'text-xs text-white truncate leading-tight font-semibold mb-0.5',
        metaRowClass: 'flex items-start justify-between gap-1',
        fileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded',
    },
    thumbnailPresentation: 'modeDefault',
};
