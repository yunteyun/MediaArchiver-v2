import { describe, expect, it } from 'vitest';
import type { DisplayMode, LayoutPreset } from '../../../stores/useSettingsStore';
import {
    FILE_CARD_DISPLAY_MODE_DEFINITIONS,
    getDisplayPresetById,
    getDisplayPresetMenuOptions,
    getDetailedInfoUiPreset,
    getDisplayModeDefinition,
    getDisplayModeFromLayoutPreset,
    getDisplayModeMenuOptions,
    getLayoutPresetFromDisplayMode,
    getTagSummaryUiPreset,
    resolveExternalDisplayPresets,
} from '../displayModes';

const DISPLAY_MODES: DisplayMode[] = [
    'standard',
    'standardLarge',
    'manga',
    'video',
    'whiteBrowser',
    'mangaDetailed',
    'compact',
];

const LAYOUT_PRESETS: LayoutPreset[] = [
    'standard',
    'standardLarge',
    'manga',
    'video',
    'detailed',
    'mangaDetailed',
    'compact',
];

describe('displayModes registry', () => {
    it('registers definitions and UI presets for every display mode', () => {
        expect(Object.keys(FILE_CARD_DISPLAY_MODE_DEFINITIONS).sort()).toEqual([...DISPLAY_MODES].sort());

        for (const mode of DISPLAY_MODES) {
            const definition = getDisplayModeDefinition(mode);
            const tagSummaryUi = getTagSummaryUiPreset(mode);
            const detailedInfoUi = getDetailedInfoUiPreset(mode);

            expect(definition.mode).toBe(mode);
            expect(definition.layout.cardWidth).toBeGreaterThan(0);
            expect(definition.layout.thumbnailHeight).toBeGreaterThan(0);
            expect(tagSummaryUi.visibleCount).toBeGreaterThan(0);
            expect(tagSummaryUi.chipFontWeightClass).not.toHaveLength(0);
            expect(tagSummaryUi.rowGapClass).not.toHaveLength(0);
            expect(detailedInfoUi.tagSummaryVisibleCount).toBeGreaterThan(0);
        }
    });

    it('keeps layout preset mappings reversible', () => {
        for (const layoutPreset of LAYOUT_PRESETS) {
            const displayMode = getDisplayModeFromLayoutPreset(layoutPreset);
            expect(getLayoutPresetFromDisplayMode(displayMode)).toBe(layoutPreset);
        }
    });

    it('returns menu options sorted by menu order', () => {
        const menuOptions = getDisplayModeMenuOptions();
        expect(menuOptions.map((option) => option.mode)).toEqual([
            'compact',
            'standard',
            'standardLarge',
            'video',
            'whiteBrowser',
            'mangaDetailed',
            'manga',
        ]);
    });

    it('resolves external presets on top of built-in presets', () => {
        const externalPresets = resolveExternalDisplayPresets([
            {
                id: 'custom-whitebrowser',
                extends: 'whiteBrowser',
                label: 'Custom WhiteBrowser',
                menuOrder: 47,
                thumbnailPresentation: 'contain',
                layout: {
                    cardWidth: 500,
                },
                tagSummaryUi: {
                    visibleCount: 11,
                    chipFontWeightClass: 'font-medium',
                    rowGapClass: 'gap-0.5',
                },
                compactInfoUi: {
                    titleClass: 'text-[10px]',
                },
            },
        ]);

        const resolved = getDisplayPresetById('custom-whitebrowser', externalPresets, 'standard');
        const menuOptions = getDisplayPresetMenuOptions(externalPresets);

        expect(resolved.id).toBe('custom-whitebrowser');
        expect(resolved.baseDisplayMode).toBe('whiteBrowser');
        expect(resolved.thumbnailPresentation).toBe('contain');
        expect(resolved.definition.layout.cardWidth).toBe(500);
        expect(resolved.tagSummaryUi.visibleCount).toBe(11);
        expect(resolved.tagSummaryUi.chipFontWeightClass).toBe('font-medium');
        expect(resolved.tagSummaryUi.rowGapClass).toBe('gap-0.5');
        expect(resolved.compactInfoUi.titleClass).toBe('text-[10px]');
        expect(menuOptions.some((preset) => preset.id === 'custom-whitebrowser')).toBe(true);
    });
});
