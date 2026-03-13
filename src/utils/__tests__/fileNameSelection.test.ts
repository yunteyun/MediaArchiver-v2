import { describe, expect, it } from 'vitest';
import { getEditableNameSelectionRange } from '../fileNameSelection';

describe('fileNameSelection', () => {
    it('selects only the base name when an extension exists', () => {
        expect(getEditableNameSelectionRange('sample.png')).toEqual({ start: 0, end: 6 });
        expect(getEditableNameSelectionRange('archive.tar.gz')).toEqual({ start: 0, end: 11 });
    });

    it('selects the whole name when there is no editable extension part', () => {
        expect(getEditableNameSelectionRange('sample')).toEqual({ start: 0, end: 6 });
        expect(getEditableNameSelectionRange('.gitignore')).toEqual({ start: 0, end: 10 });
    });
});
