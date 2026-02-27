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

interface ParsedMetadata {
    width?: number;
    height?: number;
    format?: string;
    container?: string;
    codec?: string;
    videoCodec?: string;
    audioCodec?: string;
    fps?: number;
    bitrate?: number;
}

function parseMetadata(metadata?: string): ParsedMetadata {
    if (!metadata) return {};
    try {
        const parsed = JSON.parse(metadata) as ParsedMetadata;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function normalizeWinPath(targetPath: string): string {
    return targetPath.replace(/\//g, '\\').replace(/\\+$/, '');
}

function getRootRelativeFolderPath(filePath: string, rootFolderPath: string | null): string | null {
    if (!rootFolderPath) return null;
    const normalizedRoot = normalizeWinPath(rootFolderPath);
    const normalizedFilePath = normalizeWinPath(filePath);
    const parentIndex = normalizedFilePath.lastIndexOf('\\');
    const parentDir = parentIndex >= 0 ? normalizedFilePath.slice(0, parentIndex) : normalizedFilePath;
    const rootLower = normalizedRoot.toLowerCase();
    const parentLower = parentDir.toLowerCase();

    if (parentLower === rootLower) return '.';

    const prefix = `${rootLower}\\`;
    if (!parentLower.startsWith(prefix)) return null;

    return parentDir.slice(normalizedRoot.length + 1);
}

function getRootRelativePath(filePath: string, rootFolderPath: string | null): string | null {
    if (!rootFolderPath) return null;
    const normalizedRoot = normalizeWinPath(rootFolderPath);
    const normalizedFilePath = normalizeWinPath(filePath);
    const rootLower = normalizedRoot.toLowerCase();
    const fileLower = normalizedFilePath.toLowerCase();
    if (fileLower === rootLower) return '.';
    const prefix = `${rootLower}\\`;
    if (!fileLower.startsWith(prefix)) return null;
    return normalizedFilePath.slice(normalizedRoot.length + 1);
}

function getFileExtension(file: MediaFile): string {
    const fromName = (file.name || '').split('.').pop();
    if (fromName && fromName !== file.name) return fromName.toLowerCase();
    const fromPath = (file.path || '').split('.').pop();
    return fromPath && fromPath !== file.path ? fromPath.toLowerCase() : '-';
}

function getTypeLabel(type: MediaFile['type']): string {
    switch (type) {
        case 'video':
            return '動画';
        case 'audio':
            return '音声';
        case 'archive':
            return '書庫';
        case 'image':
        default:
            return '画像';
    }
}

function resolveResolution(meta: ParsedMetadata): string | null {
    if (!meta.width || !meta.height) return null;
    return `${meta.width} × ${meta.height}`;
}

function resolveVideoCodec(meta: ParsedMetadata): string | null {
    if (typeof meta.videoCodec === 'string' && meta.videoCodec) return meta.videoCodec;
    if (typeof meta.codec === 'string' && meta.codec) return meta.codec;
    return null;
}

function resolveAudioCodec(meta: ParsedMetadata): string | null {
    if (typeof meta.audioCodec === 'string' && meta.audioCodec) return meta.audioCodec;
    return null;
}

export function useImageInfoReadModel(file: MediaFile, rootFolderPath: string | null) {
    const metadata = useMemo(() => parseMetadata(file.metadata), [file.metadata]);
    const resolution = useMemo(() => resolveResolution(metadata), [metadata]);
    const videoCodec = useMemo(() => resolveVideoCodec(metadata), [metadata]);
    const audioCodec = useMemo(() => resolveAudioCodec(metadata), [metadata]);

    const fileInfoRows = useMemo<ReadonlyInfoRow[]>(() => {
        const rows: ReadonlyInfoRow[] = [
            { label: '種別', value: getTypeLabel(file.type) },
            { label: 'サイズ', value: formatFileSize(file.size) },
            { label: '作成日時', value: formatDateTime(file.createdAt) },
            { label: '更新日時', value: formatDateTime(file.mtimeMs) },
            { label: '拡張子', value: getFileExtension(file) },
        ];
        if (file.duration) rows.push({ label: '再生時間', value: file.duration });
        if (resolution) rows.push({ label: '解像度', value: resolution });
        if (metadata.format) rows.push({ label: '形式', value: metadata.format });
        if (metadata.container) rows.push({ label: 'コンテナ', value: metadata.container });
        if (videoCodec) rows.push({ label: '映像コーデック', value: videoCodec });
        if (audioCodec) rows.push({ label: '音声コーデック', value: audioCodec });
        if (typeof metadata.fps === 'number' && Number.isFinite(metadata.fps)) {
            rows.push({ label: 'FPS', value: `${metadata.fps}` });
        }
        if (typeof metadata.bitrate === 'number' && Number.isFinite(metadata.bitrate)) {
            rows.push({ label: 'ビットレート', value: `${Math.round(metadata.bitrate / 1000)} kbps` });
        }
        return rows;
    }, [
        audioCodec,
        file,
        metadata.bitrate,
        metadata.container,
        metadata.format,
        metadata.fps,
        resolution,
        videoCodec,
    ]);

    const pathRows = useMemo<ReadonlyInfoRow[]>(() => {
        const rows: ReadonlyInfoRow[] = [
            { label: 'ファイルパス', value: file.path || '-' },
        ];
        const relativeFolderPath = getRootRelativeFolderPath(file.path, rootFolderPath);
        if (relativeFolderPath) rows.push({ label: '相対フォルダ', value: relativeFolderPath });
        const relativePath = getRootRelativePath(file.path, rootFolderPath);
        if (relativePath) rows.push({ label: '相対パス', value: relativePath });
        return rows;
    }, [file.path, rootFolderPath]);

    const statsRows = useMemo<ReadonlyInfoRow[]>(() => ([
        { label: 'アクセス回数', value: `${file.accessCount ?? 0}回` },
        { label: '外部アプリ起動', value: `${file.externalOpenCount ?? 0}回` },
        { label: '最終アクセス', value: formatDateTime(file.lastAccessedAt) },
        { label: '最終外部起動', value: formatDateTime(file.lastExternalOpenedAt) },
    ]), [file.accessCount, file.externalOpenCount, file.lastAccessedAt, file.lastExternalOpenedAt]);

    return {
        fileInfoRows,
        pathRows,
        statsRows,
    };
}
