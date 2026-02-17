import React from 'react';
import { MediaFile } from '../../../types/file';

interface MetaSectionProps {
    file: MediaFile;
}

// ファイルサイズをフォーマット
function formatFileSize(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 日付をフォーマット
function formatDate(timestamp: number | undefined): string {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export const MetaSection = React.memo<MetaSectionProps>(({ file }) => {
    return (
        <div className="space-y-1 text-sm text-surface-300">
            <h3 className="font-medium mb-2 text-surface-200">ファイル情報</h3>
            <p className="truncate" title={file.name}>
                <span className="text-surface-400">ファイル名:</span> {file.name}
            </p>
            <p>
                <span className="text-surface-400">サイズ:</span> {formatFileSize(file.size)}
            </p>
            {file.duration && (
                <p>
                    <span className="text-surface-400">再生時間:</span> {file.duration}
                </p>
            )}
            <p>
                <span className="text-surface-400">作成日時:</span> {formatDate(file.createdAt)}
            </p>
            {file.mtimeMs && (
                <p>
                    <span className="text-surface-400">更新日時:</span> {formatDate(file.mtimeMs)}
                </p>
            )}
        </div>
    );
});

MetaSection.displayName = 'MetaSection';
