import { useEffect, useMemo } from 'react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useTagStore } from '../../stores/useTagStore';
import { useRatingStore } from '../../stores/useRatingStore';

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

export interface ReadonlyRatingRow {
    id: string;
    label: string;
    value: string;
}

export function useImageInfoReadModel(file: MediaFile) {
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const tags = useTagStore((s) => s.tags);
    const loadTags = useTagStore((s) => s.loadTags);

    const axes = useRatingStore((s) => s.axes);
    const fileRatings = useRatingStore((s) => s.fileRatings);
    const loadAxes = useRatingStore((s) => s.loadAxes);
    const loadFileRatings = useRatingStore((s) => s.loadFileRatings);

    useEffect(() => {
        if (tags.length === 0) {
            void loadTags();
        }
    }, [tags.length, loadTags]);

    useEffect(() => {
        if (axes.length === 0) {
            void loadAxes();
        }
    }, [axes.length, loadAxes]);

    useEffect(() => {
        if (!fileRatings[file.id]) {
            void loadFileRatings(file.id);
        }
    }, [file.id, fileRatings, loadFileRatings]);

    const tagNames = useMemo(() => {
        const ids = fileTagsCache.get(file.id) ?? file.tags ?? [];
        if (ids.length === 0) return [];
        const tagById = new Map(tags.map((tag) => [tag.id, tag.name]));
        return ids.map((id) => tagById.get(id) ?? id);
    }, [file.id, file.tags, fileTagsCache, tags]);

    const ratingRows = useMemo<ReadonlyRatingRow[]>(() => {
        if (axes.length === 0) return [];
        const ratings = fileRatings[file.id] ?? {};
        return [...axes]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((axis) => ({
                id: axis.id,
                label: axis.name,
                value: ratings[axis.id] == null ? '-' : String(ratings[axis.id]),
            }));
    }, [axes, file.id, fileRatings]);

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
        tagNames,
        ratingRows,
        fileInfoRows,
        statsRows,
    };
}
