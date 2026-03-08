import type { DisplayMode, LayoutPreset } from '../../stores/useSettingsStore';
import type { FileCardDisplayModeDefinition, FileCardLayoutConfig } from './displayModeTypes';
import { FILE_CARD_DISPLAY_PRESETS } from './presets';
import type {
    DetailedInfoUiPreset,
    DetailedPanelBadgeKey,
    ExternalDisplayPresetManifest,
    ResolvedFileCardDisplayPreset,
    TagSummaryUiPreset,
} from './presets/types';

export type {
    DetailedInfoUiPreset,
    DetailedPanelBadgeKey,
    DisplayPresetSelection,
    ExternalDisplayPresetListResult,
    ExternalDisplayPresetManifest,
    ResolvedFileCardDisplayPreset,
    TagSummaryUiPreset,
} from './presets/types';

const LAYOUT_PRESET_TO_DISPLAY_MODE: Record<LayoutPreset, DisplayMode> = {
    standard: 'standard',
    standardLarge: 'standardLarge',
    manga: 'manga',
    video: 'video',
    detailed: 'whiteBrowser',
    mangaDetailed: 'mangaDetailed',
    compact: 'compact',
};

const DISPLAY_MODE_TO_LAYOUT_PRESET: Record<DisplayMode, LayoutPreset> = {
    standard: 'standard',
    standardLarge: 'standardLarge',
    manga: 'manga',
    video: 'video',
    whiteBrowser: 'detailed',
    mangaDetailed: 'mangaDetailed',
    compact: 'compact',
};

export const FILE_CARD_DISPLAY_MODE_DEFINITIONS: Record<DisplayMode, FileCardDisplayModeDefinition> = {
    standard: FILE_CARD_DISPLAY_PRESETS.standard.definition,
    standardLarge: FILE_CARD_DISPLAY_PRESETS.standardLarge.definition,
    manga: FILE_CARD_DISPLAY_PRESETS.manga.definition,
    video: FILE_CARD_DISPLAY_PRESETS.video.definition,
    whiteBrowser: FILE_CARD_DISPLAY_PRESETS.whiteBrowser.definition,
    mangaDetailed: FILE_CARD_DISPLAY_PRESETS.mangaDetailed.definition,
    compact: FILE_CARD_DISPLAY_PRESETS.compact.definition,
};

export const BUILTIN_DISPLAY_PRESETS: Record<DisplayMode, ResolvedFileCardDisplayPreset> = {
    standard: {
        id: 'standard',
        source: 'builtin',
        baseDisplayMode: 'standard',
        ...FILE_CARD_DISPLAY_PRESETS.standard,
    },
    standardLarge: {
        id: 'standardLarge',
        source: 'builtin',
        baseDisplayMode: 'standardLarge',
        ...FILE_CARD_DISPLAY_PRESETS.standardLarge,
    },
    manga: {
        id: 'manga',
        source: 'builtin',
        baseDisplayMode: 'manga',
        ...FILE_CARD_DISPLAY_PRESETS.manga,
    },
    video: {
        id: 'video',
        source: 'builtin',
        baseDisplayMode: 'video',
        ...FILE_CARD_DISPLAY_PRESETS.video,
    },
    whiteBrowser: {
        id: 'whiteBrowser',
        source: 'builtin',
        baseDisplayMode: 'whiteBrowser',
        ...FILE_CARD_DISPLAY_PRESETS.whiteBrowser,
    },
    mangaDetailed: {
        id: 'mangaDetailed',
        source: 'builtin',
        baseDisplayMode: 'mangaDetailed',
        ...FILE_CARD_DISPLAY_PRESETS.mangaDetailed,
    },
    compact: {
        id: 'compact',
        source: 'builtin',
        baseDisplayMode: 'compact',
        ...FILE_CARD_DISPLAY_PRESETS.compact,
    },
};

export const DISPLAY_MODE_LAYOUT_CONFIGS: Record<DisplayMode, FileCardLayoutConfig> = {
    standard: FILE_CARD_DISPLAY_PRESETS.standard.definition.layout,
    standardLarge: FILE_CARD_DISPLAY_PRESETS.standardLarge.definition.layout,
    manga: FILE_CARD_DISPLAY_PRESETS.manga.definition.layout,
    video: FILE_CARD_DISPLAY_PRESETS.video.definition.layout,
    whiteBrowser: FILE_CARD_DISPLAY_PRESETS.whiteBrowser.definition.layout,
    mangaDetailed: FILE_CARD_DISPLAY_PRESETS.mangaDetailed.definition.layout,
    compact: FILE_CARD_DISPLAY_PRESETS.compact.definition.layout,
};

function mergeTagSummaryUiPreset(
    base: TagSummaryUiPreset,
    override?: Partial<TagSummaryUiPreset>
): TagSummaryUiPreset {
    if (!override) return base;
    return {
        ...base,
        ...override,
    };
}

function mergeDetailedInfoUiPreset(
    base: DetailedInfoUiPreset,
    override?: Partial<DetailedInfoUiPreset>
): DetailedInfoUiPreset {
    if (!override) return base;
    return {
        ...base,
        ...override,
        detailedPanelBadgeKeys: Array.isArray(override.detailedPanelBadgeKeys)
            ? override.detailedPanelBadgeKeys
            : base.detailedPanelBadgeKeys,
    };
}

export function resolveExternalDisplayPresets(
    manifests: ExternalDisplayPresetManifest[]
): ResolvedFileCardDisplayPreset[] {
    const resolved: ResolvedFileCardDisplayPreset[] = [];
    const seenIds = new Set<string>();

    for (const manifest of manifests) {
        const id = manifest.id.trim();
        if (!id || seenIds.has(id)) continue;
        if (id in BUILTIN_DISPLAY_PRESETS) continue;

        const base = BUILTIN_DISPLAY_PRESETS[manifest.extends];
        if (!base) continue;

        seenIds.add(id);

        resolved.push({
            id,
            source: 'external',
            baseDisplayMode: base.baseDisplayMode,
            definition: {
                ...base.definition,
                label: manifest.label ?? base.definition.label,
                menuOrder: manifest.menuOrder ?? base.definition.menuOrder,
                iconKey: manifest.iconKey ?? base.definition.iconKey,
                layout: {
                    ...base.definition.layout,
                    ...(manifest.layout ?? {}),
                },
                cardGrowMax: manifest.cardGrowMax ?? base.definition.cardGrowMax,
                infoVariant: manifest.infoVariant ?? base.definition.infoVariant,
                cardDirection: manifest.cardDirection ?? base.definition.cardDirection,
                horizontalThumbnailAspectRatio: manifest.horizontalThumbnailAspectRatio ?? base.definition.horizontalThumbnailAspectRatio,
                hideThumbnailBadges: manifest.hideThumbnailBadges ?? base.definition.hideThumbnailBadges,
            },
            tagSummaryUi: mergeTagSummaryUiPreset(base.tagSummaryUi, manifest.tagSummaryUi),
            detailedInfoUi: mergeDetailedInfoUiPreset(base.detailedInfoUi, manifest.detailedInfoUi),
            thumbnailPresentation: manifest.thumbnailPresentation ?? base.thumbnailPresentation,
        });
    }

    return resolved.sort((a, b) => {
        if (a.definition.menuOrder !== b.definition.menuOrder) {
            return a.definition.menuOrder - b.definition.menuOrder;
        }
        return a.definition.label.localeCompare(b.definition.label, 'ja');
    });
}

export function getDisplayPresetById(
    presetId: string | null | undefined,
    externalPresets: ResolvedFileCardDisplayPreset[],
    fallbackDisplayMode: DisplayMode
): ResolvedFileCardDisplayPreset {
    if (presetId) {
        const builtin = BUILTIN_DISPLAY_PRESETS[presetId as DisplayMode];
        if (builtin) return builtin;
        const external = externalPresets.find((preset) => preset.id === presetId);
        if (external) return external;
    }

    return BUILTIN_DISPLAY_PRESETS[fallbackDisplayMode];
}

export function getDisplayPresetMenuOptions(
    externalPresets: ResolvedFileCardDisplayPreset[]
): ResolvedFileCardDisplayPreset[] {
    return [...Object.values(BUILTIN_DISPLAY_PRESETS), ...externalPresets]
        .slice()
        .sort((a, b) => {
            if (a.definition.menuOrder !== b.definition.menuOrder) {
                return a.definition.menuOrder - b.definition.menuOrder;
            }
            return a.definition.label.localeCompare(b.definition.label, 'ja');
        });
}

export const getDisplayModeDefinition = (mode: DisplayMode): FileCardDisplayModeDefinition => {
    return BUILTIN_DISPLAY_PRESETS[mode].definition;
};

export const isHorizontalDisplayMode = (mode: DisplayMode): boolean => {
    return getDisplayModeDefinition(mode).cardDirection === 'horizontal';
};

export const getHorizontalThumbnailAspectRatio = (mode: DisplayMode): string => {
    return getDisplayModeDefinition(mode).horizontalThumbnailAspectRatio ?? '1 / 1';
};

export const getTagSummaryUiPreset = (mode: DisplayMode): TagSummaryUiPreset => {
    return BUILTIN_DISPLAY_PRESETS[mode].tagSummaryUi;
};

export const getDetailedInfoUiPreset = (mode: DisplayMode): DetailedInfoUiPreset => {
    return BUILTIN_DISPLAY_PRESETS[mode].detailedInfoUi;
};

export const getDisplayModeFromLayoutPreset = (layoutPreset: LayoutPreset): DisplayMode => {
    return LAYOUT_PRESET_TO_DISPLAY_MODE[layoutPreset];
};

export const getLayoutPresetFromDisplayMode = (displayMode: DisplayMode): LayoutPreset => {
    return DISPLAY_MODE_TO_LAYOUT_PRESET[displayMode];
};

export const getDisplayModeDefinitionByLayoutPreset = (layoutPreset: LayoutPreset): FileCardDisplayModeDefinition => {
    return getDisplayModeDefinition(getDisplayModeFromLayoutPreset(layoutPreset));
};

export const getDisplayModeMenuOptions = (): FileCardDisplayModeDefinition[] => {
    return Object.values(BUILTIN_DISPLAY_PRESETS)
        .map((preset) => preset.definition)
        .slice()
        .sort((a, b) => a.menuOrder - b.menuOrder);
};

