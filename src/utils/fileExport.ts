import type { MediaFile } from '../types/file';
import type { Tag } from '../stores/useTagStore';
import { formatFileSize } from './groupFiles';

export interface FileExportTagChip {
    id: string;
    name: string;
    colorName: string;
    colorHex: string;
}

export interface FileExportRow {
    name: string;
    path: string;
    type: string;
    sizeBytes: number;
    sizeLabel: string;
    createdAt: string;
    modifiedAt: string;
    duration: string;
    width: string;
    height: string;
    tags: string;
    tagColors: string;
    tagChips: FileExportTagChip[];
    accessCount: number;
    externalOpenCount: number;
}

function parseFileMetadata(file: MediaFile): { width?: number; height?: number } {
    if (!file.metadata) return {};
    try {
        const parsed = JSON.parse(file.metadata) as { width?: number; height?: number };
        return parsed ?? {};
    } catch {
        return {};
    }
}

function formatExportDateTime(timestamp?: number | null): string {
    if (!timestamp) return '';
    try {
        return new Date(timestamp).toLocaleString('ja-JP');
    } catch {
        return '';
    }
}

// FileCard 側と同等の色マップ（タグ名色→CSS色）
export function resolveTagColorHex(colorName?: string): string {
    if (!colorName) return '#4b5563';
    const colorMap: Record<string, string> = {
        gray: '#4b5563',
        red: '#dc2626',
        orange: '#ea580c',
        amber: '#d97706',
        yellow: '#f59e0b',
        lime: '#65a30d',
        green: '#16a34a',
        emerald: '#059669',
        teal: '#0d9488',
        cyan: '#0891b2',
        sky: '#0284c7',
        blue: '#2563eb',
        indigo: '#4f46e5',
        violet: '#7c3aed',
        purple: '#9333ea',
        fuchsia: '#c026d3',
        pink: '#db2777',
        rose: '#e11d48',
    };
    return colorMap[colorName] ?? colorMap.gray;
}

export function buildFileExportRows(
    files: MediaFile[],
    fileTagsCache: Map<string, string[]>,
    allTags: Tag[]
): FileExportRow[] {
    const tagById = new Map(allTags.map((t) => [t.id, t]));

    return files.map((file) => {
        const metadata = parseFileMetadata(file);
        const tagIds = fileTagsCache.get(file.id) ?? [];
        const tagChips = tagIds
            .map((tagId) => tagById.get(tagId))
            .filter((tag): tag is Tag => Boolean(tag))
            .map((tag) => {
                const colorName = tag.categoryColor || tag.color || 'gray';
                return {
                    id: tag.id,
                    name: tag.name,
                    colorName,
                    colorHex: resolveTagColorHex(colorName),
                };
            });

        return {
            name: file.name,
            path: file.path,
            type: file.type,
            sizeBytes: file.size ?? 0,
            sizeLabel: formatFileSize(file.size ?? 0),
            createdAt: formatExportDateTime(file.createdAt),
            modifiedAt: formatExportDateTime(file.mtimeMs ?? null),
            duration: file.duration ?? '',
            width: metadata.width != null ? String(metadata.width) : '',
            height: metadata.height != null ? String(metadata.height) : '',
            tags: tagChips.map((t) => t.name).join(' / '),
            tagColors: tagChips.map((t) => `${t.name}:${t.colorName}`).join(' / '),
            tagChips,
            accessCount: file.accessCount ?? 0,
            externalOpenCount: file.externalOpenCount ?? 0,
        };
    });
}

function escapeCsvCell(value: string | number): string {
    const text = String(value ?? '');
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function escapeHtml(value: string | number): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildCsvContent(rows: FileExportRow[]): string {
    const headers = [
        'name', 'path', 'type', 'size_bytes', 'size', 'created_at', 'modified_at',
        'duration', 'width', 'height', 'tags', 'tag_colors', 'access_count', 'external_open_count'
    ];
    const lines = [
        headers.join(','),
        ...rows.map((row) => ([
            row.name,
            row.path,
            row.type,
            row.sizeBytes,
            row.sizeLabel,
            row.createdAt,
            row.modifiedAt,
            row.duration,
            row.width,
            row.height,
            row.tags,
            row.tagColors,
            row.accessCount,
            row.externalOpenCount,
        ].map(escapeCsvCell).join(',')))
    ];
    return `\uFEFF${lines.join('\r\n')}`;
}

export function buildHtmlContent(rows: FileExportRow[], meta?: { scopeLabel?: string; profileLabel?: string }): string {
    const generatedAt = new Date().toLocaleString('ja-JP');
    const headerCells = [
        'Name', 'Type', 'Size', 'Created', 'Modified', 'Duration', 'Resolution', 'Tags', 'Path'
    ].map((label) => `<th>${escapeHtml(label)}</th>`).join('');

    const bodyRows = rows.map((row) => {
        const resolution = row.width && row.height ? `${row.width}x${row.height}` : '';
        const tagsHtml = row.tagChips.length > 0
            ? row.tagChips.map((tag) =>
                `<span class="tag-chip" style="background:${escapeHtml(tag.colorHex)}" title="${escapeHtml(`${tag.name} (${tag.colorName})`)}">#${escapeHtml(tag.name)}</span>`
            ).join(' ')
            : '';
        return `<tr>
<td>${escapeHtml(row.name)}</td>
<td>${escapeHtml(row.type)}</td>
<td>${escapeHtml(row.sizeLabel)}</td>
<td>${escapeHtml(row.createdAt)}</td>
<td>${escapeHtml(row.modifiedAt)}</td>
<td>${escapeHtml(row.duration)}</td>
<td>${escapeHtml(resolution)}</td>
<td>${tagsHtml}</td>
<td class="path">${escapeHtml(row.path)}</td>
</tr>`;
    }).join('\n');

    const scopeInfo = [
        meta?.profileLabel ? `プロファイル: ${meta.profileLabel}` : '',
        meta?.scopeLabel ? `対象: ${meta.scopeLabel}` : '',
        `件数: ${rows.length}`,
    ].filter(Boolean).join(' / ');

    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MediaArchiver Export</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; background: #0b1220; color: #e5e7eb; margin: 16px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .meta { color: #9ca3af; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; background: #111827; }
    th, td { border: 1px solid #1f2937; padding: 6px 8px; font-size: 12px; vertical-align: top; text-align: left; }
    th { background: #0f172a; position: sticky; top: 0; }
    tr:nth-child(even) td { background: #0c1424; }
    td.path { word-break: break-all; color: #cbd5e1; }
    .tag-chip { display: inline-block; margin: 0 4px 4px 0; padding: 1px 6px; border-radius: 999px; color: #fff; font-weight: 600; font-size: 11px; }
  </style>
</head>
<body>
  <h1>MediaArchiver Export</h1>
  <div class="meta">生成日時: ${escapeHtml(generatedAt)}${scopeInfo ? ` / ${escapeHtml(scopeInfo)}` : ''}</div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>
${bodyRows}
    </tbody>
  </table>
</body>
</html>`;
}
