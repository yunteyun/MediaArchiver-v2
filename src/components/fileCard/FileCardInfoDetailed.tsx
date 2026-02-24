import React from 'react';
import { Eye } from 'lucide-react';
import { formatFileSize } from '../../utils/groupFiles';
import { getDisplayFolderName } from '../../utils/path';
import type { FileCardInfoCommonProps } from './FileCardInfoArea';

export const FileCardInfoDetailed = React.memo(({
    file,
    displayMode,
    infoAreaHeight,
    showFileSize,
    renderTagSummary,
}: FileCardInfoCommonProps) => {
    const isMangaMode = displayMode === 'manga';
    const isStandardMode = displayMode === 'standard' || displayMode === 'standardLarge';

    return (
        <div
            className={`flex flex-col bg-surface-800 ${
                isMangaMode ? 'px-3 py-1.5 justify-between' : 'px-3.5 py-2.5 justify-start'
            }`}
            style={{ height: `${infoAreaHeight}px` }}
        >
            <h3
                className={`text-sm font-semibold truncate text-white hover:text-primary-400 transition-colors ${
                    isMangaMode ? 'mb-0 leading-tight' : 'mb-0.5'
                }`}
                title={file.name}
            >
                {file.name}
            </h3>
            <div className={`text-[10px] text-surface-500 truncate ${isMangaMode ? 'leading-tight mb-0.5' : 'leading-snug mb-1'}`}>
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
            <div
                className={`flex justify-between gap-1 ${
                    isMangaMode ? 'items-center' : isStandardMode ? 'items-center mt-auto' : 'items-start mt-auto'
                }`}
            >
                {showFileSize && file.size && (
                    <span
                        className={`flex-shrink-0 px-1.5 py-0.5 rounded whitespace-nowrap ${
                            isStandardMode
                                ? 'inline-flex items-center text-[8px] leading-none font-bold text-surface-200 bg-surface-700/80'
                                : 'text-[11px] text-surface-200 font-semibold tracking-tight bg-surface-700/60'
                        }`}
                    >
                        {formatFileSize(file.size)}
                    </span>
                )}
                {renderTagSummary(3)}
            </div>
        </div>
    );
});

FileCardInfoDetailed.displayName = 'FileCardInfoDetailed';
