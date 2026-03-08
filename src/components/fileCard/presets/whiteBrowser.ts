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
    thumbnailPresentation: 'square',
};
