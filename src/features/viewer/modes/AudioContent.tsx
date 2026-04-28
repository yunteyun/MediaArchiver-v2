import React, { useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { toMediaUrl } from '../../../utils/mediaPath';
import { useViewerContext } from '../ViewerContext';

export const AudioContent = React.memo(() => {
    const { file, audioVolume } = useViewerContext();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, audioVolume));
        }
    }, [audioVolume, file.id]);

    if (hasError) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
            </div>
        );
    }

    return (
        <div className="pointer-events-auto flex w-full max-w-[780px] flex-col items-center gap-6 px-6 text-surface-100">
            {file.thumbnailPath ? (
                <img
                    src={toMediaUrl(file.thumbnailPath)}
                    alt={file.name}
                    className="h-72 w-72 rounded-xl object-cover shadow-2xl"
                    onError={() => setHasError(true)}
                />
            ) : (
                <div className="flex h-72 w-72 items-center justify-center rounded-xl bg-surface-800 shadow-2xl">
                    <Music size={72} className="text-surface-500" />
                </div>
            )}
            <audio
                ref={audioRef}
                src={toMediaUrl(file.path)}
                controls
                autoPlay
                className="w-full"
                onError={() => setHasError(true)}
            />
        </div>
    );
});

AudioContent.displayName = 'AudioContent';
