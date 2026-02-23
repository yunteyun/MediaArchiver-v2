import React from 'react';
import type { MediaFile } from '../../types/file';
import type { DisplayMode } from '../../stores/useSettingsStore';
import type { FileCardInfoVariant } from './displayModeTypes';
import { FileCardInfoCompact } from './FileCardInfoCompact';
import { FileCardInfoDetailed } from './FileCardInfoDetailed';

export interface FileCardInfoCommonProps {
    file: MediaFile;
    displayMode: DisplayMode;
    infoAreaHeight: number;
    showFileSize: boolean;
    renderTagSummary: (visibleCount: number) => React.ReactNode;
}

export interface FileCardInfoAreaProps extends FileCardInfoCommonProps {
    infoVariant: FileCardInfoVariant;
}

export const FileCardInfoArea = React.memo((props: FileCardInfoAreaProps) => {
    if (props.infoVariant === 'compact') {
        return <FileCardInfoCompact {...props} />;
    }

    return <FileCardInfoDetailed {...props} />;
});

FileCardInfoArea.displayName = 'FileCardInfoArea';
