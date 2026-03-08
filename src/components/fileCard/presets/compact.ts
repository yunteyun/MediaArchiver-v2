import type { FileCardDisplayPreset } from './types';
import { DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE } from './shared';

export const compactDisplayPreset: FileCardDisplayPreset = {
    definition: {
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
    tagSummaryUi: {
        visibleCount: 2,
        chipPaddingClass: 'px-1.5 py-0.5',
        chipTextClass: 'text-[8px]',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[60px]',
        rowLayoutClass: 'flex-nowrap items-center justify-start',
    },
    detailedInfoUi: {
        ...DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE,
        folderBadgeMaxWidthClass: 'max-w-[110px]',
        tagSummaryVisibleCount: 2,
    },
    thumbnailPresentation: 'modeDefault',
};
