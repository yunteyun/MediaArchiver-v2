import { useMemo } from 'react';
import type { MediaFile } from '../../types/file';

function formatDateTime(value: number | null | undefined): string {
    if (!value || !Number.isFinite(value)) return '-';
    try {
        return new Date(value).toLocaleString('ja-JP');
    } catch {
        return '-';
    }
}

function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '-';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

export interface ReadonlyInfoRow {
    label: string;
    value: string;
}

export function useImageInfoReadModel(file: MediaFile) {
    const fileInfoRows = useMemo<ReadonlyInfoRow[]>(() => ([
        { label: 'ファイル名', value: file.name },
        { label: 'サイズ', value: formatFileSize(file.size) },
        { label: '作成日時', value: formatDateTime(file.createdAt) },
        { label: '更新日時', value: formatDateTime(file.mtimeMs) },
    ]), [file.createdAt, file.mtimeMs, file.name, file.size]);

    const statsRows = useMemo<ReadonlyInfoRow[]>(() => ([
        { label: 'アクセス回数', value: `${file.accessCount ?? 0}回` },
        { label: '外部アプリ起動', value: `${file.externalOpenCount ?? 0}回` },
        { label: '最終アクセス', value: formatDateTime(file.lastAccessedAt) },
        { label: '最終外部起動', value: formatDateTime(file.lastExternalOpenedAt) },
    ]), [file.accessCount, file.externalOpenCount, file.lastAccessedAt, file.lastExternalOpenedAt]);

    return {
        fileInfoRows,
        statsRows,
    };
}
