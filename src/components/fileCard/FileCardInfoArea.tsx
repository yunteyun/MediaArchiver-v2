import React from 'react';
import type { MediaFile } from '../../types/file';
import type { ResolvedFileCardDisplayPreset } from './displayModes';
import { FileCardInfoCompact } from './FileCardInfoCompact';
import { FileCardInfoDetailed } from './FileCardInfoDetailed';

export interface FileCardTagSummaryRendererProps {
    visibleCount: number;
}

export interface FileCardInfoCommonProps {
    file: MediaFile;
    displayPreset: ResolvedFileCardDisplayPreset;
    infoAreaHeight: number;
    showFileSize: boolean;
    folderBadgeColor?: string | null;
    TagSummaryRenderer: React.ComponentType<FileCardTagSummaryRendererProps>;
}

export const FileCardInfoArea = React.memo((props: FileCardInfoCommonProps) => {
    if (props.displayPreset.definition.infoVariant === 'compact') {
        return <FileCardInfoCompact {...props} />;
    }

    return <FileCardInfoDetailed {...props} />;
});

FileCardInfoArea.displayName = 'FileCardInfoArea';
