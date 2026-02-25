import React from 'react';
import type { MediaFile } from '../../types/file';

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

function parseResolution(metadata?: string): string | null {
    if (!metadata) return null;
    try {
        const parsed = JSON.parse(metadata);
        if (parsed.width && parsed.height) {
            return `${parsed.width} × ${parsed.height}`;
        }
    } catch {
        // パース失敗時は非表示
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
    const resolution = parseResolution(file.metadata);
    const relativeFolderPath = getRootRelativeFolderPath(file.path, rootFolderPath);

    return (
        <div className="px-4 py-3 space-y-2 border-b border-surface-700">
            {/* ファイル名 */}
            <p className="text-sm font-medium text-surface-100 break-all leading-snug">{file.name}</p>
            <div className="space-y-1.5 pt-1">
                <InfoRow label="種別" value={typeLabel[file.type] ?? file.type} />
                <InfoRow label="サイズ" value={formatBytes(file.size)} />
                <InfoRow label="作成日" value={formatDate(file.createdAt)} />
                {file.duration && (
                    <InfoRow label="再生時間" value={file.duration} />
                )}
                {resolution && (
                    <InfoRow label="解像度" value={resolution} />
                )}
                <InfoRow label="ファイルパス" value={file.path} />
                {relativeFolderPath && (
                    <InfoRow label="相対フォルダ" value={relativeFolderPath} />
                )}
            </div>
        </div>
    );
});

BasicInfoSection.displayName = 'BasicInfoSection';
