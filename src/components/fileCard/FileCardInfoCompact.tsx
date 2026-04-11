import React from 'react';
import { formatFileSize } from '../../utils/groupFiles';
import { getDriveLetter } from '../../utils/path';
import { getFolderBadgePillStyle } from '../../utils/folderBadgeColor';
import type { FileCardInfoCommonProps } from './FileCardInfoArea';

export const FileCardInfoCompact = React.memo(({
    file,
    displayPreset,
    infoAreaHeight,
    showFileSize,
    showDriveBadge,
    driveColors,
    TagSummaryRenderer,
}: FileCardInfoCommonProps) => {
    const driveLetter = showDriveBadge ? getDriveLetter(file.path) : '';
    const driveColor = driveLetter ? (driveColors[driveLetter] ?? null) : null;
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
                {showDriveBadge && driveLetter && (
                    <span
                        className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded whitespace-nowrap text-[8px] leading-none font-medium text-surface-300 bg-surface-700/50 border border-surface-600/60"
                        style={getFolderBadgePillStyle(driveColor)}
                    >
                        {driveLetter}
                    </span>
                )}
                <TagSummaryRenderer visibleCount={tagSummaryVisibleCount} />
            </div>
        </div>
    );
});

FileCardInfoCompact.displayName = 'FileCardInfoCompact';

