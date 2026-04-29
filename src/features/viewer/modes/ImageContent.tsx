import React, { useEffect, useState } from 'react';
import { toMediaUrl } from '../../../utils/mediaPath';
import { useViewerContext } from '../viewerContexts';

const mediaStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
};

export const ImageContent = React.memo(() => {
    const { file } = useViewerContext();
    const [displayedSrc, setDisplayedSrc] = useState('');
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    // decode() 完了後に表示して段階描写を防ぐ
    useEffect(() => {
        setDisplayedSrc('');
        const src = toMediaUrl(file.path);
        let cancelled = false;
        const img = new Image();
        img.src = src;

        const controller = new AbortController();
        img.decode()
            .then(() => { if (!cancelled) setDisplayedSrc(src); })
            .catch(() => { if (!cancelled) setDisplayedSrc(src); });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [file.path]);

    if (hasError) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
            </div>
        );
    }

    if (!displayedSrc) return null;

    return (
        <img
            key={displayedSrc}
            src={displayedSrc}
            alt={file.name}
            style={mediaStyle}
            className="pointer-events-auto max-h-full max-w-full"
            onError={() => setHasError(true)}
        />
    );
});

ImageContent.displayName = 'ImageContent';
