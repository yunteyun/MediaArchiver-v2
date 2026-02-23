import type { DisplayMode } from '../../stores/useSettingsStore';

export interface FileCardLayoutConfig {
    aspectRatio: string;
    cardWidth: number;
    thumbnailHeight: number;
    infoAreaHeight: number;
    totalHeight: number;
}

export type FileCardInfoVariant = 'compact' | 'detailed';

export type DisplayModeIconKey = 'grid' | 'maximize' | 'layoutGrid' | 'film' | 'minimize';

export interface FileCardDisplayModeDefinition {
    mode: DisplayMode;
    label: string;
    menuOrder: number;
    iconKey: DisplayModeIconKey;
    layout: FileCardLayoutConfig;
    infoVariant: FileCardInfoVariant;
    hideThumbnailBadges?: boolean;
}

