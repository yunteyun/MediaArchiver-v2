import { describe, expect, it } from 'vitest';
import {
    parseMediaArchiverExportCsv,
    parseMediaArchiverExportCsvFromBytes,
} from '../fileImport';

describe('fileImport', () => {
    it('parses exported CSV rows with quoted tags and tag colors', () => {
        const csv = [
            'path,tags,tag_colors',
            '"C:\\library\\alpha.png","hero / blue team","hero:red / blue team:blue"',
            '"C:\\library\\beta.png","",""',
        ].join('\n');

        const result = parseMediaArchiverExportCsv(csv);

        expect(result.warnings).toEqual([]);
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toMatchObject({
            rowNumber: 2,
            path: 'C:\\library\\alpha.png',
            tags: ['hero', 'blue team'],
        });
        expect(result.rows[0]?.tagColorByName.get('hero')).toBe('red');
        expect(result.rows[0]?.tagColorByName.get('blue team')).toBe('blue');
    });

    it('skips rows with empty path and reports warnings', () => {
        const csv = [
            'path,tags',
            '"","tag-a"',
            '"C:\\library\\valid.png","tag-b"',
        ].join('\n');

        const result = parseMediaArchiverExportCsv(csv);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.path).toBe('C:\\library\\valid.png');
        expect(result.warnings).toEqual(['2行目: path が空のためスキップ']);
    });

    it('accepts UTF-8 bytes with BOM', () => {
        const csv = '\ufeffpath,tags\n"C:\\library\\from-bytes.png","tag-a / tag-b"';
        const bytes = new TextEncoder().encode(csv);

        const result = parseMediaArchiverExportCsvFromBytes(bytes);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.tags).toEqual(['tag-a', 'tag-b']);
    });
});
