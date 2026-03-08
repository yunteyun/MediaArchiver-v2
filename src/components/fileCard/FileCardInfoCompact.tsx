import React from 'react';
import { formatFileSize } from '../../utils/groupFiles';
import type { FileCardInfoCommonProps } from './FileCardInfoArea';

export const FileCardInfoCompact = React.memo(({
    file,
    displayPreset,
    infoAreaHeight,
    showFileSize,
    TagSummaryRenderer,
}: FileCardInfoCommonProps) => {
    const tagSummaryVisibleCount = displayPreset.tagSummaryUi.visibleCount;
    const compactUi = displayPreset.compactInfoUi;

    return (
        <div
            className={compactUi.containerClass}
            style={{ height: `${infoAreaHeight}px` }}
        >
            <div className={compactUi.titleClass} title={file.name}>
                {file.name}
            </div>
            <div className={compactUi.metaRowClass}>
                {showFileSize && file.size && (
                    <span className={compactUi.fileSizeClass}>
                        {formatFileSize(file.size)}
                    </span>
                )}
                <TagSummaryRenderer visibleCount={tagSummaryVisibleCount} />
            </div>
        </div>
    );
});

FileCardInfoCompact.displayName = 'FileCardInfoCompact';

