import { describe, expect, it } from 'vitest';
import {
    normalizeExcludedSubdirectories,
    parseExcludedSubdirectoriesText,
    parseFolderScanSettingsJson,
    pathMatchesExcludedSubdirectory,
} from '../folderScanSettings';

describe('folderScanSettings', () => {
    it('normalizes excluded subdirectories from arrays and text input', () => {
        expect(normalizeExcludedSubdirectories([' cache ', 'cache', '.\\Temp\\raw\\', '/Temp/raw/'])).toEqual([
            'cache',
            'Temp/raw',
        ]);

        expect(parseExcludedSubdirectoriesText(' cache \nTemp\\\\raw\n\n./Temp/raw/')).toEqual([
            'cache',
            'Temp/raw',
        ]);
    });

    it('parses folder scan settings json and keeps excluded subdirectories', () => {
        expect(parseFolderScanSettingsJson(JSON.stringify({
            fileTypeOverrides: {
                video: false,
                image: true,
                archive: false,
            },
            excludedSubdirectories: ['cache', 'temp/raw'],
        }))).toEqual({
            fileTypeOverrides: {
                video: false,
                image: true,
                archive: false,
                audio: undefined,
            },
            excludedSubdirectories: ['cache', 'temp/raw'],
        });
    });

    it('detects files and directories under excluded subdirectories', () => {
        const rootPath = 'C:\\Library';
        const excluded = ['cache', 'temp/raw'];

        expect(pathMatchesExcludedSubdirectory('C:\\Library\\cache', rootPath, excluded)).toBe(true);
        expect(pathMatchesExcludedSubdirectory('C:\\Library\\cache\\a.png', rootPath, excluded)).toBe(true);
        expect(pathMatchesExcludedSubdirectory('C:\\Library\\temp\\raw\\b.png', rootPath, excluded)).toBe(true);
        expect(pathMatchesExcludedSubdirectory('C:\\Library\\temp\\raw\\nested', rootPath, excluded)).toBe(true);
        expect(pathMatchesExcludedSubdirectory('C:\\Library\\temp', rootPath, excluded)).toBe(false);
        expect(pathMatchesExcludedSubdirectory('C:\\Library\\temp\\other\\b.png', rootPath, excluded)).toBe(false);
        expect(pathMatchesExcludedSubdirectory('C:\\Other\\cache\\a.png', rootPath, excluded)).toBe(false);
    });
});
