import { describe, expect, it } from 'vitest';
import type { DisplayMode } from '../../../stores/useSettingsStore';
import {
    DISPLAY_MODE_DIRECTIONS,
    FILE_CARD_DISPLAY_MODE_DEFINITIONS,
    HORIZONTAL_THUMBNAIL_ASPECT_RATIOS,
    getDisplayPresetById,
    getDisplayPresetMenuOptions,
    getDetailedInfoUiPreset,
    getDisplayModeDefinition,
    getDisplayModeMenuOptions,
    getHorizontalThumbnailAspectRatio,
    getTagSummaryUiPreset,
    isHorizontalDisplayMode,
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

    it('DISPLAY_MODE_DIRECTIONS covers all modes with correct values', () => {
        expect(Object.keys(DISPLAY_MODE_DIRECTIONS).sort()).toEqual([...DISPLAY_MODES].sort());
        expect(DISPLAY_MODE_DIRECTIONS.whiteBrowser).toBe('horizontal');
        expect(DISPLAY_MODE_DIRECTIONS.mangaDetailed).toBe('horizontal');
        expect(DISPLAY_MODE_DIRECTIONS.standard).toBe('vertical');
        expect(DISPLAY_MODE_DIRECTIONS.standardLarge).toBe('vertical');
        expect(DISPLAY_MODE_DIRECTIONS.manga).toBe('vertical');
        expect(DISPLAY_MODE_DIRECTIONS.video).toBe('vertical');
        expect(DISPLAY_MODE_DIRECTIONS.compact).toBe('vertical');
    });

    it.each([
        ['standard', false],
        ['standardLarge', false],
        ['manga', false],
        ['video', false],
        ['compact', false],
        ['whiteBrowser', true],
        ['mangaDetailed', true],
    ] as [DisplayMode, boolean][])('isHorizontalDisplayMode(%s) === %s', (mode, expected) => {
        expect(isHorizontalDisplayMode(mode)).toBe(expected);
    });

    it('getHorizontalThumbnailAspectRatio returns correct ratios', () => {
        expect(getHorizontalThumbnailAspectRatio('whiteBrowser')).toBe('1 / 1');
        expect(getHorizontalThumbnailAspectRatio('mangaDetailed')).toBe('2 / 3');
        expect(getHorizontalThumbnailAspectRatio('standard')).toBe('1 / 1');
    });

    it('horizontal modes all have aspect ratios in HORIZONTAL_THUMBNAIL_ASPECT_RATIOS', () => {
        for (const mode of DISPLAY_MODES) {
            if (DISPLAY_MODE_DIRECTIONS[mode] === 'horizontal') {
                expect(HORIZONTAL_THUMBNAIL_ASPECT_RATIOS[mode]).toBeDefined();
            }
        }
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
