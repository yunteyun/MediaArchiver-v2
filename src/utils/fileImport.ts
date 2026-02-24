export interface MediaArchiverCsvImportRow {
    rowNumber: number;
    path: string;
    tags: string[];
    tagColorByName: Map<string, string>;
    ratingValue?: number;
    source?: 'mediaarchiver' | 'legacy';
}

export interface MediaArchiverCsvImportParseResult {
    rows: MediaArchiverCsvImportRow[];
    warnings: string[];
}

function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Simple CSV parser for exported CSV (quoted fields + commas/newlines)
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let i = 0;
    let inQuotes = false;

    while (i < text.length) {
        const ch = text[i]!;

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i += 1;
                continue;
            }
            cell += ch;
            i += 1;
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            i += 1;
            continue;
        }

        if (ch === ',') {
            row.push(cell);
            cell = '';
            i += 1;
            continue;
        }

        if (ch === '\r') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            if (text[i + 1] === '\n') i += 2;
            else i += 1;
            continue;
        }

        if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            i += 1;
            continue;
        }

        cell += ch;
        i += 1;
    }

    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function splitExportTags(raw: string): string[] {
    if (!raw.trim()) return [];
    return raw
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
}

function parseTagColors(raw: string): Map<string, string> {
    const result = new Map<string, string>();
    if (!raw.trim()) return result;
    const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
        const sep = part.lastIndexOf(':');
        if (sep <= 0) continue;
        const name = part.slice(0, sep).trim();
        const color = part.slice(sep + 1).trim();
        if (name && color) result.set(name, color);
    }
    return result;
}

export function parseMediaArchiverExportCsv(content: string): MediaArchiverCsvImportParseResult {
    const text = stripBom(content);
    const parsed = parseCsv(text);
    const warnings: string[] = [];

    if (parsed.length === 0) {
        throw new Error('CSVが空です');
    }

    const header = parsed[0]!.map((h) => h.trim());
    const pathIndex = header.indexOf('path');
    const tagsIndex = header.indexOf('tags');
    const tagColorsIndex = header.indexOf('tag_colors');

    if (pathIndex < 0 || tagsIndex < 0) {
        throw new Error('このアプリのエクスポートCSV形式ではありません（path/tags 列が必要）');
    }

    const rows: MediaArchiverCsvImportRow[] = [];

    for (let i = 1; i < parsed.length; i += 1) {
        const r = parsed[i]!;
        const path = (r[pathIndex] ?? '').trim();
        if (!path) {
            warnings.push(`${i + 1}行目: path が空のためスキップ`);
            continue;
        }

        const tags = splitExportTags(r[tagsIndex] ?? '');
        const tagColorByName = tagColorsIndex >= 0
            ? parseTagColors(r[tagColorsIndex] ?? '')
            : new Map<string, string>();

        rows.push({
            rowNumber: i + 1,
            path,
            tags,
            tagColorByName,
        });
    }

    return { rows, warnings };
}

export interface CsvImportDryRunSummary {
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    rowsWithTags: number;
    tagLinksToAdd: number;
    newTagsToCreate: number;
    rowsWithRating: number;
    ratingUpdates: number;
    unmatchedPaths: string[];
    missingTagNames: string[];
}

function decodeUtf8(bytes: Uint8Array): string {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function decodeShiftJis(bytes: Uint8Array): string {
    return new TextDecoder('shift-jis', { fatal: false }).decode(bytes);
}

function normalizeWinPath(folder: string, fileName: string): string {
    const f = folder.replace(/[\\/]+$/, '');
    return `${f}\\${fileName}`;
}

function parseStarRatingToken(token: string): number | null {
    const trimmed = token.trim();
    if (!trimmed) return null;
    if (!/^[★☆]+$/.test(trimmed)) return null;
    const stars = (trimmed.match(/★/g) ?? []).length;
    return stars > 0 ? stars : 0;
}

export function parseLegacyAppCsvFromBytes(bytes: Uint8Array): MediaArchiverCsvImportParseResult {
    const decoded = stripBom(decodeShiftJis(bytes));
    const parsed = parseCsv(decoded);
    const warnings: string[] = [];

    if (parsed.length === 0) {
        throw new Error('CSVが空です');
    }

    const header = parsed[0]!.map((h) => h.trim());
    const fileNameIndex = header.indexOf('ファイル名');
    const folderIndex = header.indexOf('フォルダ');
    const comment1Index = header.indexOf('コメント１');
    if (fileNameIndex < 0 || folderIndex < 0) {
        throw new Error('旧アプリCSV形式として認識できません（ファイル名/フォルダ 列が必要）');
    }

    const rows: MediaArchiverCsvImportRow[] = [];
    for (let i = 1; i < parsed.length; i += 1) {
        const r = parsed[i]!;
        const fileName = (r[fileNameIndex] ?? '').trim();
        const folder = (r[folderIndex] ?? '').trim();
        if (!fileName || !folder) {
            warnings.push(`${i + 1}行目: ファイル名またはフォルダが空のためスキップ`);
            continue;
        }

        const path = normalizeWinPath(folder, fileName);
        const tags: string[] = [];
        let ratingValue: number | undefined;

        // コメント1 もタグ/評価候補として扱う（旧アプリ側で列ずれしているケースがある）
        const candidates = [
            ...(comment1Index >= 0 ? [r[comment1Index] ?? ''] : []),
            ...r.slice(Math.max(header.length, 5)),
        ]
            .map((v) => (v ?? '').trim())
            .filter(Boolean);

        for (const token of candidates) {
            const stars = parseStarRatingToken(token);
            if (stars != null) {
                ratingValue = Math.max(ratingValue ?? 0, stars);
                continue;
            }
            tags.push(token);
        }

        rows.push({
            rowNumber: i + 1,
            path,
            tags: Array.from(new Set(tags)),
            tagColorByName: new Map(),
            ratingValue,
            source: 'legacy',
        });
    }

    return { rows, warnings };
}

export function parseMediaArchiverExportCsvFromBytes(bytes: Uint8Array): MediaArchiverCsvImportParseResult {
    // UTF-8(BOM付き)想定。BOMなしUTF-8も許容。
    return parseMediaArchiverExportCsv(decodeUtf8(bytes));
}
