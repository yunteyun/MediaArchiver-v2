import React from 'react';
import { Eye } from 'lucide-react';
import { formatFileSize } from '../../utils/groupFiles';
import { getDisplayFolderName } from '../../utils/path';
import type { FileCardInfoCommonProps } from './FileCardInfoArea';

export const FileCardInfoDetailed = React.memo(({
    file,
    infoAreaHeight,
    showFileSize,
    renderTagSummary,
}: FileCardInfoCommonProps) => {
    return (
        <div
            className="px-3.5 py-2 flex flex-col justify-start bg-surface-800"
            style={{ height: `${infoAreaHeight}px` }}
        >
            <h3 className="text-sm font-semibold truncate text-white hover:text-primary-400 transition-colors mb-0.5" title={file.name}>
                {file.name}
            </h3>
            <div className="text-[10px] text-surface-500 truncate leading-tight mb-1">
                {getDisplayFolderName(file.path)}
                {file.createdAt && (
                    <>
                        {' · '}
                        {new Date(file.createdAt).toLocaleDateString('ja-JP', {
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit'
                        }).replace(/\//g, '/')}
                    </>
                )}
                {file.accessCount > 0 && (
                    <>
                        {' · '}
                        <Eye size={9} className="inline-block" style={{ verticalAlign: 'text-top' }} />
                        {' '}{file.accessCount}回
                    </>
                )}
                {file.externalOpenCount > 0 && (
                    <>
                        {' · '}
                        <span title="外部アプリで開いた回数">↗{file.externalOpenCount}回</span>
                    </>
                )}
            </div>
            <div className="flex items-start justify-between gap-1">
                {showFileSize && file.size && (
                    <span className="text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded">
                        {formatFileSize(file.size)}
                    </span>
                )}
                {renderTagSummary(3)}
            </div>
        </div>
    );
});

FileCardInfoDetailed.displayName = 'FileCardInfoDetailed';

