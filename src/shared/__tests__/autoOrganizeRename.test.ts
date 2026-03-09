import { describe, expect, it } from 'vitest';
import {
    buildAutoOrganizeRenameContext,
    buildAutoOrganizeRenamePreview,
    renderAutoOrganizeRenameBaseName,
} from '../autoOrganizeRename';

describe('autoOrganizeRename', () => {
    const sampleFile = {
        name: 'Hero Poster.png',
        path: 'C:\\library\\Blue Team\\Hero Poster.png',
        type: 'image' as const,
    };

    it('builds rename context from current file path', () => {
        expect(buildAutoOrganizeRenameContext(sampleFile)).toEqual({
            currentFileName: 'Hero Poster.png',
            currentBaseName: 'Hero Poster',
            sourceFolderName: 'Blue Team',
            fileType: 'image',
        });
    });

    it('renders supported tokens into the rename base name', () => {
        const context = buildAutoOrganizeRenameContext(sampleFile);

        expect(renderAutoOrganizeRenameBaseName('[{folder}] {name} {type}', context)).toBe('[Blue Team] Hero Poster image');
    });

    it('preserves the original extension when building the next file name', () => {
        expect(buildAutoOrganizeRenamePreview(sampleFile, '[{folder}] {name}')).toEqual({
            baseName: '[Blue Team] Hero Poster',
            fileName: '[Blue Team] Hero Poster.png',
        });
    });

    it('avoids duplicating the current extension when the template already includes it', () => {
        expect(buildAutoOrganizeRenamePreview(sampleFile, '{name}.png')).toEqual({
            baseName: 'Hero Poster',
            fileName: 'Hero Poster.png',
        });
    });
});
