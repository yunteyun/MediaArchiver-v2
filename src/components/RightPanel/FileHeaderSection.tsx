import React from 'react';
import type { MediaFile } from '../../types/file';

interface FileHeaderSectionProps {
    file: MediaFile;
}

export const FileHeaderSection = React.memo<FileHeaderSectionProps>(({ file }) => (
    <div className="px-4 py-3 border-b border-surface-700">
        <p className="text-base font-semibold text-surface-100 break-all leading-snug">{file.name}</p>
    </div>
));

FileHeaderSection.displayName = 'FileHeaderSection';
