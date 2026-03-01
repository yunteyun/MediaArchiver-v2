import React from 'react';
import type { MediaFile } from '../../types/file';
import { SectionTitle } from './SectionTitle';

interface BasicInfoSectionProps {
    file: MediaFile;
    rootFolderPath: string | null;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    });
}

function formatDateTime(ts?: number | null): string | null {
    if (!ts || !Number.isFinite(ts)) return null;
    return new Date(ts).toLocaleString('ja-JP');
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
    hasAudio?: boolean;
    imageEntries?: string[];
}

function parseMetadata(metadata?: string): ParsedMetadata | null {
    if (!metadata) return null;
    try {
        const parsed = JSON.parse(metadata) as ParsedMetadata;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        // パース失敗時は非表示
    }
    return null;
}

function parseResolution(metadata?: string): string | null {
    const parsed = parseMetadata(metadata);
    if (parsed?.width && parsed.height) {
        return `${parsed.width} × ${parsed.height}`;
    }
    return null;
}

const typeLabel: Record<string, string> = {
    video: '動画',
    image: '画像',
    archive: '書庫',
    audio: '音声',
};

interface InfoRowProps {
    label: string;
    value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
    <div className="flex gap-2 text-sm">
        <span className="text-surface-400 shrink-0 w-20">{label}</span>
        <span className="text-surface-100 break-all">{value}</span>
    </div>
);

function normalizeWinPath(path: string): string {
    return path.replace(/\//g, '\\').replace(/\\+$/, '');
}

function getParentDirectoryPath(filePath: string): string {
    const normalized = normalizeWinPath(filePath);
    const idx = normalized.lastIndexOf('\\');
    return idx >= 0 ? normalized.slice(0, idx) : normalized;
}

function getRootRelativeFolderPath(filePath: string, rootFolderPath: string | null): string | null {
    if (!rootFolderPath) return null;

    const root = normalizeWinPath(rootFolderPath);
    const parentDir = getParentDirectoryPath(filePath);
    const rootLower = root.toLowerCase();
    const parentLower = parentDir.toLowerCase();

    if (parentLower === rootLower) {
        return '.';
    }

    const rootPrefix = `${rootLower}\\`;
    if (!parentLower.startsWith(rootPrefix)) {
        return null;
    }

    return parentDir.slice(root.length + 1);
}

export const BasicInfoSection = React.memo<BasicInfoSectionProps>(({ file, rootFolderPath }) => {
    const metadata = parseMetadata(file.metadata);
    const resolution = parseResolution(file.metadata);
    const relativeFolderPath = getRootRelativeFolderPath(file.path, rootFolderPath);
    const updatedAt = formatDateTime(file.mtimeMs);
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '-' : '-';
    const archiveImageCount = file.type === 'archive' && Array.isArray(metadata?.imageEntries)
        ? metadata.imageEntries.length
        : null;
    const bitrate = typeof metadata?.bitrate === 'number' && Number.isFinite(metadata.bitrate)
        ? `${Math.round(metadata.bitrate / 1000)} kbps`
        : null;

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <SectionTitle>基本情報</SectionTitle>
            <div className="space-y-1.5">
                <InfoRow label="種別" value={typeLabel[file.type] ?? file.type} />
                <InfoRow label="サイズ" value={formatBytes(file.size)} />
                <InfoRow label="作成日" value={formatDate(file.createdAt)} />
                {resolution && (
                    <InfoRow label="解像度" value={resolution} />
                )}
                {relativeFolderPath && (
                    <InfoRow label="相対フォルダ" value={relativeFolderPath} />
                )}
            </div>
            <details className="group rounded-md border border-surface-800 bg-surface-950/50">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs text-surface-400 transition-colors group-open:text-surface-300">
                    追加情報を表示
                </summary>
                <div className="space-y-1.5 border-t border-surface-800 px-3 py-3">
                    {updatedAt && <InfoRow label="更新日時" value={updatedAt} />}
                    {file.duration && <InfoRow label="再生時間" value={file.duration} />}
                    <InfoRow label="拡張子" value={extension} />
                    <InfoRow label="ファイルパス" value={file.path} />
                    {metadata?.format && <InfoRow label="形式" value={metadata.format} />}
                    {metadata?.container && <InfoRow label="コンテナ" value={metadata.container} />}
                    {(metadata?.videoCodec || metadata?.codec) && (
                        <InfoRow label="映像コーデック" value={metadata.videoCodec ?? metadata.codec ?? ''} />
                    )}
                    {metadata?.audioCodec && <InfoRow label="音声コーデック" value={metadata.audioCodec} />}
                    {typeof metadata?.fps === 'number' && Number.isFinite(metadata.fps) && (
                        <InfoRow label="FPS" value={`${metadata.fps}`} />
                    )}
                    {bitrate && <InfoRow label="ビットレート" value={bitrate} />}
                    {archiveImageCount != null && <InfoRow label="書庫内画像数" value={`${archiveImageCount}`} />}
                    {file.type === 'archive' && metadata?.hasAudio && <InfoRow label="書庫内音声" value="あり" />}
                </div>
            </details>
        </section>
    );
});

BasicInfoSection.displayName = 'BasicInfoSection';
