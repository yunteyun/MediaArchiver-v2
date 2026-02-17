import React from 'react';
import { MediaFile } from '../../../types/file';

interface StatsSectionProps {
    file: MediaFile;
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

export const StatsSection = React.memo<StatsSectionProps>(({ file }) => {
    return (
        <div className="space-y-1 text-sm text-surface-300">
            <h3 className="font-medium mb-2 text-surface-200">統計</h3>
            <p>
                <span className="text-surface-400">アクセス回数:</span> {file.accessCount || 0}回
            </p>
            <p>
                <span className="text-surface-400">外部アプリ起動:</span> {file.externalOpenCount || 0}回
            </p>
            {file.lastAccessedAt && (
                <p>
                    <span className="text-surface-400">最終アクセス:</span> {formatDate(file.lastAccessedAt)}
                </p>
            )}
            {file.lastExternalOpenedAt && (
                <p>
                    <span className="text-surface-400">最終外部起動:</span> {formatDate(file.lastExternalOpenedAt)}
                </p>
            )}
        </div>
    );
});

StatsSection.displayName = 'StatsSection';
