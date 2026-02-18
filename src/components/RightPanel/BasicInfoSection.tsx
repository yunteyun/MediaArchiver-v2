import React from 'react';
import type { MediaFile } from '../../types/file';

interface BasicInfoSectionProps {
    file: MediaFile;
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

export const BasicInfoSection = React.memo<BasicInfoSectionProps>(({ file }) => {
    const resolution = parseResolution(file.metadata);

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
            </div>
        </div>
    );
});

BasicInfoSection.displayName = 'BasicInfoSection';
