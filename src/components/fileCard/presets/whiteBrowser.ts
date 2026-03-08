import type { FileCardDisplayPreset } from './types';
import { DETAILED_INFO_HORIZONTAL_PANEL_PRESET_BASE } from './shared';

export const whiteBrowserDisplayPreset: FileCardDisplayPreset = {
    definition: {
        mode: 'whiteBrowser',
        label: '詳細表示',
        menuOrder: 45,
        iconKey: 'layoutGrid',
        cardGrowMax: 20,
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
    tagSummaryUi: {
        visibleCount: 15,
        chipPaddingClass: 'px-2 py-1',
        chipTextClass: 'text-[9px] leading-none',
        chipRadiusClass: 'rounded',
        chipMaxWidthClass: 'max-w-[110px]',
        rowLayoutClass: 'flex-wrap items-start justify-start content-start max-h-[72px]',
    },
    detailedInfoUi: {
        ...DETAILED_INFO_HORIZONTAL_PANEL_PRESET_BASE,
        folderBadgeMaxWidthClass: 'max-w-[140px]',
        tagSummaryVisibleCount: 15,
    },
    compactInfoUi: {
        containerClass: 'px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0',
        titleClass: 'text-xs text-white truncate leading-tight font-semibold mb-0.5',
        metaRowClass: 'flex items-start justify-between gap-1',
        fileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded',
    },
    thumbnailPresentation: 'square',
};
