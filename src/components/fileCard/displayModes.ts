import type { DisplayMode } from '../../stores/useSettingsStore';
import type {
    FileCardDisplayModeDefinition,
    FileCardLayoutConfig,
} from './displayModeTypes';

export const FILE_CARD_DISPLAY_MODE_DEFINITIONS: Record<DisplayMode, FileCardDisplayModeDefinition> = {
    standard: {
        mode: 'standard',
        label: '標準（M）',
        menuOrder: 20,
        iconKey: 'grid',
        infoVariant: 'detailed',
        layout: {
            aspectRatio: '1/1',
            cardWidth: 240,
            thumbnailHeight: 240,
            infoAreaHeight: 80,
            totalHeight: 320,
        },
    },
    standardLarge: {
        mode: 'standardLarge',
        label: '標準（L）',
        menuOrder: 30,
        iconKey: 'maximize',
        infoVariant: 'detailed',
        layout: {
            aspectRatio: '1/1',
            cardWidth: 250,
            thumbnailHeight: 250,
            infoAreaHeight: 80,
            totalHeight: 330,
        },
    },
    manga: {
        mode: 'manga',
        label: '漫画',
        menuOrder: 50,
        iconKey: 'layoutGrid',
        infoVariant: 'detailed',
        layout: {
            aspectRatio: '2/3',
            cardWidth: 210,
            thumbnailHeight: 315,
            infoAreaHeight: 76,
            totalHeight: 391,
        },
    },
    video: {
        mode: 'video',
        label: '動画（ワイド）',
        menuOrder: 40,
        iconKey: 'film',
        infoVariant: 'detailed',
        layout: {
            aspectRatio: '25/16',
            cardWidth: 250,
            thumbnailHeight: 160,
            infoAreaHeight: 76,
            totalHeight: 236,
        },
    },
    compact: {
        mode: 'compact',
        // NOTE: Internal key "compact" is kept for persisted settings compatibility.
        // UI label is "標準（S/簡易）" to align with Standard S/M/L naming.
        label: '標準（S/簡易）',
        menuOrder: 10,
        iconKey: 'minimize',
        infoVariant: 'compact',
        hideThumbnailBadges: true,
        layout: {
            aspectRatio: '5/4',
            cardWidth: 200,
            thumbnailHeight: 160,
            infoAreaHeight: 48,
            totalHeight: 208,
        },
    },
};

export const DISPLAY_MODE_LAYOUT_CONFIGS: Record<DisplayMode, FileCardLayoutConfig> = {
    standard: FILE_CARD_DISPLAY_MODE_DEFINITIONS.standard.layout,
    standardLarge: FILE_CARD_DISPLAY_MODE_DEFINITIONS.standardLarge.layout,
    manga: FILE_CARD_DISPLAY_MODE_DEFINITIONS.manga.layout,
    video: FILE_CARD_DISPLAY_MODE_DEFINITIONS.video.layout,
    compact: FILE_CARD_DISPLAY_MODE_DEFINITIONS.compact.layout,
};

export const getDisplayModeDefinition = (mode: DisplayMode): FileCardDisplayModeDefinition => {
    return FILE_CARD_DISPLAY_MODE_DEFINITIONS[mode];
};

export const getDisplayModeMenuOptions = (): FileCardDisplayModeDefinition[] => {
    return Object.values(FILE_CARD_DISPLAY_MODE_DEFINITIONS)
        .slice()
        .sort((a, b) => a.menuOrder - b.menuOrder);
};
