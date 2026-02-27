import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileArchive, Music4 } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { LIGHTBOX_MEDIA_MAX_HEIGHT_VH } from './constants';

interface ImageStageProps {
    file: MediaFile;
    videoVolume: number;
    audioVolume: number;
}

const mediaBoxStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: `${LIGHTBOX_MEDIA_MAX_HEIGHT_VH}vh`,
    objectFit: 'contain',
};

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;

export const ImageStage = React.memo<ImageStageProps>(({ file, videoVolume, audioVolume }) => {
    const [hasError, setHasError] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const kind = useMemo<'image' | 'video' | 'audio' | 'archive'>(() => {
        if (file.type === 'video') return 'video';
        if (file.type === 'audio') return 'audio';
        if (file.type === 'archive') return 'archive';
        if (file.type === 'image') return 'image';
        return IMAGE_LIKE_EXT_RE.test(file.name ?? '') || IMAGE_LIKE_EXT_RE.test(file.path ?? '') ? 'image' : 'archive';
    }, [file.name, file.path, file.type]);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = Math.max(0, Math.min(1, videoVolume));
        }
    }, [videoVolume, file.id]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, audioVolume));
        }
    }, [audioVolume, file.id]);

    if (hasError) {
        return (
            <div className="rounded-xl border border-surface-700 bg-surface-900 px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
                <p className="mt-2 text-xs text-surface-500 break-all">{file.name}</p>
            </div>
        );
    }

    if (kind === 'video') {
        return (
            <div className="max-w-full rounded-xl border border-surface-700 bg-black shadow-2xl overflow-hidden">
                <video
                    ref={videoRef}
                    src={toMediaUrl(file.path)}
                    style={mediaBoxStyle}
                    controls
                    autoPlay
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    if (kind === 'audio') {
        return (
            <div className="rounded-xl border border-surface-700 bg-surface-900 shadow-2xl px-8 py-7 min-w-[420px] max-w-[92vw]">
                <div className="flex items-center gap-3 text-surface-200 mb-4">
                    <Music4 size={20} />
                    <p className="text-sm font-semibold break-all">{file.name}</p>
                </div>
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
    }

    if (kind === 'archive') {
        return (
            <div className="rounded-xl border border-surface-700 bg-surface-900 shadow-2xl px-8 py-8 text-center max-w-[92vw]">
                <div className="mx-auto mb-3 h-11 w-11 rounded-full border border-surface-700 bg-surface-950 flex items-center justify-center text-surface-300">
                    <FileArchive size={20} />
                </div>
                <p className="text-sm font-semibold text-surface-200">書庫プレビューは次フェーズで再開予定です</p>
                <p className="mt-2 text-xs text-surface-500 break-all">{file.name}</p>
            </div>
        );
    }

    return (
        <div className="max-w-full rounded-xl border border-surface-700 bg-black shadow-2xl overflow-hidden">
            <img
                src={toMediaUrl(file.path)}
                alt={file.name}
                style={mediaBoxStyle}
                onError={() => setHasError(true)}
            />
        </div>
    );
});

ImageStage.displayName = 'ImageStage';
