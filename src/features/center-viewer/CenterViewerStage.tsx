import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music4 } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;
const ARCHIVE_PREVIEW_LIMIT = 6;

interface CenterViewerStageProps {
    file: MediaFile;
    videoVolume: number;
    audioVolume: number;
}

const mediaStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
};

export const CenterViewerStage = React.memo<CenterViewerStageProps>(({
    file,
    videoVolume,
    audioVolume,
}) => {
    const [hasError, setHasError] = useState(false);
    const [archiveFrames, setArchiveFrames] = useState<string[]>([]);
    const [archiveLoading, setArchiveLoading] = useState(false);
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
            setArchiveLoading(false);
            setArchiveError(null);
            return () => {
                disposed = true;
            };
        }

        const loadArchiveFrames = async () => {
            setArchiveLoading(true);
            setArchiveError(null);

            try {
                const frames = await window.electronAPI.getArchivePreviewFrames(file.path, ARCHIVE_PREVIEW_LIMIT);
                if (disposed) return;
                setArchiveFrames(Array.isArray(frames) ? frames.filter(Boolean).slice(0, ARCHIVE_PREVIEW_LIMIT) : []);
            } catch (error) {
                if (disposed) return;
                console.error('Failed to load archive preview frames in center viewer:', error);
                setArchiveFrames([]);
                setArchiveError('書庫プレビューの取得に失敗しました');
            } finally {
                if (!disposed) {
                    setArchiveLoading(false);
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
    }, [file.id, videoVolume]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, audioVolume));
        }
    }, [audioVolume, file.id]);

    if (hasError) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-surface-900 px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
            </div>
        );
    }

    if (kind === 'video') {
        return (
            <video
                ref={videoRef}
                src={toMediaUrl(file.path)}
                style={mediaStyle}
                className="max-h-full max-w-full rounded-[28px] bg-black shadow-2xl"
                controls
                autoPlay
                onError={() => setHasError(true)}
            />
        );
    }

    if (kind === 'audio') {
        return (
            <div className="w-full max-w-[720px] rounded-[28px] bg-surface-900 px-8 py-7 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 text-surface-200">
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
        if (archiveLoading) {
            return (
                <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-surface-900">
                    <p className="text-sm text-surface-400">書庫プレビューを読み込み中...</p>
                </div>
            );
        }

        if (archiveError) {
            return (
                <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-surface-900">
                    <p className="text-sm text-surface-300">{archiveError}</p>
                </div>
            );
        }

        if (archiveFrames.length === 0) {
            return (
                <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-surface-900">
                    <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
                </div>
            );
        }

        return (
            <div className="grid h-full w-full grid-cols-2 gap-4 overflow-auto rounded-[28px] bg-surface-900 p-5 md:grid-cols-3">
                {archiveFrames.map((framePath, index) => (
                    <div key={`${framePath}-${index}`} className="aspect-[4/3] overflow-hidden rounded-2xl bg-black">
                        <img
                            src={toMediaUrl(framePath)}
                            alt={`Archive frame ${index + 1}`}
                            className="h-full w-full object-cover object-center"
                            onError={(event) => {
                                event.currentTarget.style.visibility = 'hidden';
                            }}
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <img
            src={toMediaUrl(file.path)}
            alt={file.name}
            style={mediaStyle}
            className="max-h-full max-w-full rounded-[28px] bg-black shadow-2xl"
            onError={() => setHasError(true)}
        />
    );
});

CenterViewerStage.displayName = 'CenterViewerStage';
