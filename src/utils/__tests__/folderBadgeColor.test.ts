import { describe, expect, it } from 'vitest';
import {
    getFolderBadgePillStyle,
    getFolderBadgeTextColor,
    resolveFolderBadgeColorHex,
} from '../folderBadgeColor';

describe('folderBadgeColor', () => {
    it('resolves known color names to hex', () => {
        expect(resolveFolderBadgeColorHex('blue')).toBe('#2563eb');
        expect(resolveFolderBadgeColorHex(' BLUE ')).toBe('#2563eb');
    });

    it('returns null for empty or unknown colors', () => {
        expect(resolveFolderBadgeColorHex('')).toBeNull();
        expect(resolveFolderBadgeColorHex('unknown')).toBeNull();
    });

    it('uses dark text for bright badge colors', () => {
        expect(getFolderBadgeTextColor('amber')).toBe('#1a1a2e');
        expect(getFolderBadgeTextColor('blue')).toBe('#f8fafc');
    });

    it('builds colored pill styles only when a color is set', () => {
        expect(getFolderBadgePillStyle('pink')).toMatchObject({
            color: '#f8fafc',
        });
        expect(getFolderBadgePillStyle(null)).toBeUndefined();
    });
});
