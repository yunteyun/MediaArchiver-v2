import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music4 } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { LIGHTBOX_ARCHIVE_PREVIEW_LIMIT, LIGHTBOX_MEDIA_MAX_HEIGHT_VH } from './constants';

interface ImageStageProps {
    file: MediaFile;
    videoVolume: number;
    audioVolume: number;
}

const imageStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: `${LIGHTBOX_MEDIA_MAX_HEIGHT_VH}vh`,
    objectFit: 'contain',
};

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;

export const ImageStage = React.memo<ImageStageProps>(({ file, videoVolume, audioVolume }) => {
    const [hasError, setHasError] = useState(false);
    const [archiveFrames, setArchiveFrames] = useState<string[]>([]);
    const [isArchiveLoading, setIsArchiveLoading] = useState(false);
    const [archiveError, setArchiveError] = useState<string | null>(null);
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
        let disposed = false;

        if (kind !== 'archive') {
            setArchiveFrames([]);
            setArchiveError(null);
            setIsArchiveLoading(false);
            return () => {
                disposed = true;
            };
        }

        const loadArchiveFrames = async () => {
            setIsArchiveLoading(true);
            setArchiveError(null);
            try {
                const frames = await window.electronAPI.getArchivePreviewFrames(file.path, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT);
                if (disposed) return;
                setArchiveFrames(Array.isArray(frames) ? frames.filter(Boolean).slice(0, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT) : []);
            } catch (error) {
                if (disposed) return;
                console.error('Failed to load archive preview frames in clean lightbox:', error);
                setArchiveFrames([]);
                setArchiveError('書庫プレビューの取得に失敗しました');
            } finally {
                if (!disposed) {
                    setIsArchiveLoading(false);
                }
            }
        };

        void loadArchiveFrames();

        return () => {
            disposed = true;
        };
    }, [file.path, kind]);

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
            <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#8b8b8b] px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-100">メディアを読み込めませんでした</p>
            </div>
        );
    }

    if (kind === 'video') {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#8b8b8b] p-6">
                <video
                    ref={videoRef}
                    src={toMediaUrl(file.path)}
                    style={imageStyle}
                    controls
                    autoPlay
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    if (kind === 'audio') {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#8b8b8b] p-6">
                <div className="w-full max-w-[640px] rounded-2xl bg-surface-950 px-8 py-7 text-surface-100">
                    <div className="mb-4 flex items-center gap-3">
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
            </div>
        );
    }

    if (kind === 'archive') {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#8b8b8b] p-6">
                {isArchiveLoading ? (
                    <p className="text-sm text-surface-100">書庫プレビューを読み込み中...</p>
                ) : archiveError ? (
                    <p className="text-sm text-surface-100">{archiveError}</p>
                ) : archiveFrames.length === 0 ? (
                    <p className="text-sm text-surface-100">表示できるプレビューフレームがありません</p>
                ) : (
                    <div className="grid w-full max-w-[1180px] grid-cols-2 gap-4 md:grid-cols-3">
                        {archiveFrames.map((framePath, index) => (
                            <div
                                key={`${framePath}-${index}`}
                                className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#101010]"
                            >
                                <img
                                    src={toMediaUrl(framePath)}
                                    alt={`Archive frame ${index + 1}`}
                                    className="block h-full w-full object-cover object-center"
                                    onError={(event) => {
                                        event.currentTarget.style.visibility = 'hidden';
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-[#8b8b8b] p-6">
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
