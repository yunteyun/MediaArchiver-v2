import { describe, expect, it } from 'vitest';
import {
    getFolderBadgePillStyle,
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

    it('builds left-accent styles only when a color is set', () => {
        expect(getFolderBadgePillStyle('pink')).toMatchObject({
            borderLeftColor: '#db2777',
            borderLeftWidth: '3px',
        });
        expect(getFolderBadgePillStyle(null)).toBeUndefined();
    });
});
