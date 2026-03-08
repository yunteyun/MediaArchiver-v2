import type { DetailedInfoUiPreset, DetailedPanelBadgeKey } from './types';

type DetailedInfoUiPresetBase = Omit<DetailedInfoUiPreset, 'folderBadgeMaxWidthClass' | 'tagSummaryVisibleCount'>;

export const DETAILED_INFO_VERTICAL_BADGE_PRESET_BASE: DetailedInfoUiPresetBase = {
    detailedPanelBadgeKeys: [] as DetailedPanelBadgeKey[],
    isBadgeMetaMode: true,
    containerClass: 'flex flex-col bg-surface-800 px-3.5 py-2.5 justify-start',
    titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-sm mb-0.5 truncate',
    metaLineClass: 'text-[10px] text-surface-500 truncate leading-snug mb-1',
    bottomRowClass: 'flex justify-between gap-1 items-center mt-auto',
    standaloneFileSizeClass: 'inline-flex items-center text-[8px] leading-none font-bold text-surface-200 bg-surface-700/80',
    fallbackTagSummaryVisibleCount: 3,
};

export const DETAILED_INFO_HORIZONTAL_PANEL_PRESET_BASE: DetailedInfoUiPresetBase = {
    detailedPanelBadgeKeys: ['size', 'extension', 'updatedDate', 'folder'] as DetailedPanelBadgeKey[],
    isBadgeMetaMode: false,
    containerClass: 'flex flex-col bg-surface-800 px-2.5 py-2 justify-start',
    titleClass: 'font-semibold text-white hover:text-primary-400 transition-colors text-[12px] leading-snug mb-1 line-clamp-2 break-all',
    metaLineClass: 'text-[10px] text-surface-400 leading-snug mb-1 whitespace-normal break-all line-clamp-3',
    bottomRowClass: 'flex flex-col items-start gap-1 mt-auto',
    standaloneFileSizeClass: 'text-[11px] text-surface-200 font-semibold tracking-tight bg-surface-700/60',
    fallbackTagSummaryVisibleCount: 3,
};
