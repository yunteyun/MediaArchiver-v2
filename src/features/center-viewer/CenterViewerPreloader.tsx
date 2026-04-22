import React from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';

interface CenterViewerPreloaderProps {
    files: MediaFile[];
    currentIndex: number;
}

export const CenterViewerPreloader = React.memo<CenterViewerPreloaderProps>(({ files, currentIndex }) => {
    const srcs: string[] = [];
    for (const offset of [-2, -1, 1, 2]) {
        const f = files[currentIndex + offset];
        if (f?.type === 'image') srcs.push(f.path);
    }

    if (srcs.length === 0) return null;

    return (
        <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden>
            {srcs.map(path => (
                <img key={path} src={toMediaUrl(path)} alt="" />
            ))}
        </div>
    );
});
CenterViewerPreloader.displayName = 'CenterViewerPreloader';
