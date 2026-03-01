import React from 'react';
import { formatFileSize } from '../../utils/groupFiles';
import type { FileCardInfoCommonProps } from './FileCardInfoArea';

export const FileCardInfoCompact = React.memo(({
    file,
    infoAreaHeight,
    showFileSize,
    TagSummaryRenderer,
}: FileCardInfoCommonProps) => {
    return (
        <div
            className="px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0"
            style={{ height: `${infoAreaHeight}px` }}
        >
            <div className="text-xs text-white truncate leading-tight font-semibold mb-0.5" title={file.name}>
                {file.name}
            </div>
            <div className="flex items-start justify-between gap-1">
                {showFileSize && file.size && (
                    <span className="text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded">
                        {formatFileSize(file.size)}
                    </span>
                )}
                <TagSummaryRenderer visibleCount={2} />
            </div>
        </div>
    );
});

FileCardInfoCompact.displayName = 'FileCardInfoCompact';

