import { describe, expect, it } from 'vitest';
import { findMatchingListDisplayPresetId, LIST_DISPLAY_PRESETS } from '../listDisplayPresets';

describe('listDisplayPresets', () => {
    it('exposes the built-in quick presets', () => {
        expect(LIST_DISPLAY_PRESETS.map((preset) => preset.id)).toEqual([
            'recent',
            'weekly',
            'monthly',
            'type',
        ]);
    });

    it('matches the expected built-in preset from current settings', () => {
        expect(findMatchingListDisplayPresetId({
            sortBy: 'date',
            sortOrder: 'desc',
            groupBy: 'date',
            dateGroupingMode: 'week',
        })).toBe('weekly');

        expect(findMatchingListDisplayPresetId({
            sortBy: 'size',
            sortOrder: 'desc',
            groupBy: 'date',
            dateGroupingMode: 'auto',
        })).toBeNull();
    });
});
