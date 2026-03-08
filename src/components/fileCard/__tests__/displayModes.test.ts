import { describe, expect, it } from 'vitest';
import type { DisplayMode, LayoutPreset } from '../../../stores/useSettingsStore';
import {
    FILE_CARD_DISPLAY_MODE_DEFINITIONS,
    getDetailedInfoUiPreset,
    getDisplayModeDefinition,
    getDisplayModeFromLayoutPreset,
    getDisplayModeMenuOptions,
    getLayoutPresetFromDisplayMode,
    getTagSummaryUiPreset,
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
});
