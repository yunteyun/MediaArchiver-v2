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
    compactInfoUi: {
        containerClass: 'px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0',
        titleClass: 'text-xs text-white truncate leading-tight font-semibold mb-0.5',
        metaRowClass: 'flex items-start justify-between gap-1',
        fileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded',
    },
    thumbnailPresentation: 'modeDefault',
};
