import { describe, expect, it } from 'vitest';
import {
    normalizeScanExclusionRules,
    pathHasExcludedDirectory,
    shouldSkipDirectoryEntry,
    shouldSkipFileByExtension,
} from '../scanExclusionRules';

describe('scanExclusionRules', () => {
    it('normalizes extension and folder name lists', () => {
        expect(normalizeScanExclusionRules({
            excludedExtensions: [' TMP ', '.part', 'jpg', '.PART'],
            excludedFolderNames: [' Cache ', 'temp', 'CACHE'],
            skipHiddenFolders: false,
        })).toEqual({
            excludedExtensions: ['.tmp', '.part', '.jpg'],
            excludedFolderNames: ['cache', 'temp'],
            skipHiddenFolders: false,
        });
    });

    it('skips excluded directory names and hidden folders', () => {
        const rules = normalizeScanExclusionRules({
            excludedFolderNames: ['cache'],
            skipHiddenFolders: true,
        });

        expect(shouldSkipDirectoryEntry('cache', rules)).toBe(true);
        expect(shouldSkipDirectoryEntry('.git', rules)).toBe(true);
        expect(shouldSkipDirectoryEntry('images', rules)).toBe(false);
    });

    it('skips excluded file extensions', () => {
        const rules = normalizeScanExclusionRules({
            excludedExtensions: ['tmp', '.part'],
        });

        expect(shouldSkipFileByExtension('.tmp', rules)).toBe(true);
        expect(shouldSkipFileByExtension('part', rules)).toBe(true);
        expect(shouldSkipFileByExtension('.mp4', rules)).toBe(false);
    });

    it('detects excluded directories inside a registered root folder', () => {
        const rules = normalizeScanExclusionRules({
            excludedFolderNames: ['cache'],
            skipHiddenFolders: true,
        });

        expect(pathHasExcludedDirectory(
            'C:\\Media\\cache\\sample.jpg',
            'C:\\Media',
            rules
        )).toBe(true);
        expect(pathHasExcludedDirectory(
            'C:\\Media\\.thumbs\\sample.jpg',
            'C:\\Media',
            rules
        )).toBe(true);
        expect(pathHasExcludedDirectory(
            'C:\\Media\\gallery\\sample.jpg',
            'C:\\Media',
            rules
        )).toBe(false);
    });
});
