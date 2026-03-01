import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;
const ARCHIVE_PREVIEW_LIMIT = 6;

interface CenterViewerStageProps {
    file: MediaFile;
    videoVolume: number;
    audioVolume: number;
    startTimeSeconds: number | null;
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
    startTimeSeconds,
}) => {
    const [hasError, setHasError] = useState(false);
    const [archiveFrames, setArchiveFrames] = useState<string[]>([]);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveError, setArchiveError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const kind = useMemo<'image' | 'video' | 'audio' | 'archive' | 'unsupported'>(() => {
        if (file.type === 'video') return 'video';
        if (file.type === 'audio') return 'audio';
        if (file.type === 'archive') return 'archive';
        if (file.type === 'image') return 'image';
        if (IMAGE_LIKE_EXT_RE.test(file.name ?? '') || IMAGE_LIKE_EXT_RE.test(file.path ?? '')) return 'image';
        return 'unsupported';
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
        const video = videoRef.current;
        if (!video || file.type !== 'video' || startTimeSeconds == null || !Number.isFinite(startTimeSeconds)) {
            return;
        }

        const seekToStartTime = () => {
            if (!video.duration || Number.isNaN(video.duration)) {
                return;
            }
            video.currentTime = Math.max(0, Math.min(video.duration, startTimeSeconds));
        };

        if (video.readyState >= 1) {
            seekToStartTime();
            return;
        }

        video.addEventListener('loadedmetadata', seekToStartTime, { once: true });
        return () => {
            video.removeEventListener('loadedmetadata', seekToStartTime);
        };
    }, [file.id, file.type, startTimeSeconds]);

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

    if (kind === 'video') {
        return (
            <video
                ref={videoRef}
                src={toMediaUrl(file.path)}
                style={mediaStyle}
                className="pointer-events-auto max-h-full max-w-full"
                controls
                autoPlay
                onError={() => setHasError(true)}
            />
        );
    }

    if (kind === 'audio') {
        return (
            <audio
                ref={audioRef}
                src={toMediaUrl(file.path)}
                controls
                autoPlay
                className="pointer-events-auto w-[min(720px,100%)]"
                onError={() => setHasError(true)}
            />
        );
    }

    if (kind === 'archive') {
        if (archiveLoading) {
            return (
                <div className="pointer-events-auto px-6 py-8 text-center">
                    <p className="text-sm text-surface-400">書庫プレビューを読み込み中...</p>
                </div>
            );
        }

        if (archiveError) {
            return (
                <div className="pointer-events-auto px-6 py-8 text-center">
                    <p className="text-sm text-surface-300">{archiveError}</p>
                </div>
            );
        }

        if (archiveFrames.length === 0) {
            return (
                <div className="pointer-events-auto px-6 py-8 text-center">
                    <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
                </div>
            );
        }

        return (
            <div className="pointer-events-auto grid max-h-full max-w-full grid-cols-2 gap-4 overflow-auto md:grid-cols-3">
                {archiveFrames.map((framePath, index) => (
                    <div key={`${framePath}-${index}`} className="aspect-[4/3] overflow-hidden">
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

    if (kind === 'unsupported') {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">この形式は中央ビューアでは表示できません</p>
            </div>
        );
    }

    return (
        <img
            src={toMediaUrl(file.path)}
            alt={file.name}
            style={mediaStyle}
            className="pointer-events-auto max-h-full max-w-full"
            onError={() => setHasError(true)}
        />
    );
});

CenterViewerStage.displayName = 'CenterViewerStage';
