import React, { useEffect, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { LIGHTBOX_MEDIA_MAX_HEIGHT_VH } from './constants';

interface ImageStageProps {
    file: MediaFile;
}

const imageStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: `${LIGHTBOX_MEDIA_MAX_HEIGHT_VH}vh`,
    objectFit: 'contain',
};

export const ImageStage = React.memo<ImageStageProps>(({ file }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    if (hasError) {
        return (
            <div className="rounded-xl border border-surface-700 bg-surface-900 px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">画像を読み込めませんでした</p>
                <p className="mt-2 text-xs text-surface-500 break-all">{file.name}</p>
            </div>
        );
    }

    return (
        <div className="max-w-full rounded-xl border border-surface-700 bg-black shadow-2xl overflow-hidden">
            <img
                src={toMediaUrl(file.path)}
                alt={file.name}
                style={imageStyle}
                onError={() => setHasError(true)}
            />
        </div>
    );
});

ImageStage.displayName = 'ImageStage';
