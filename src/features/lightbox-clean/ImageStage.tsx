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

const mediaBoxStyle: React.CSSProperties = {
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
    const [selectedArchiveFrame, setSelectedArchiveFrame] = useState<string | null>(null);
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
        setSelectedArchiveFrame(null);
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
                setArchiveFrames(Array.isArray(frames) ? frames.filter(Boolean) : []);
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
    }, [file.id, file.path, kind]);

    const archiveGridFrames = useMemo(() => {
        if (archiveFrames.length <= LIGHTBOX_ARCHIVE_PREVIEW_LIMIT) {
            return archiveFrames;
        }

        // 先頭〜末尾を均等サンプリングして、最大6枚のプレビューを表示する
        const sampled = new Set<string>();
        const lastIndex = archiveFrames.length - 1;
        for (let i = 0; i < LIGHTBOX_ARCHIVE_PREVIEW_LIMIT; i += 1) {
            const index = Math.round((i * lastIndex) / Math.max(1, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT - 1));
            sampled.add(archiveFrames[index]);
        }
        return Array.from(sampled).filter(Boolean).slice(0, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT);
    }, [archiveFrames]);

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

    useEffect(() => {
        if (kind !== 'archive' || !selectedArchiveFrame) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setSelectedArchiveFrame(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [kind, selectedArchiveFrame]);

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
            <div className="relative w-[min(94vw,1160px)] h-[min(78vh,820px)] rounded-xl border border-surface-700 bg-black shadow-2xl overflow-hidden">
                {isArchiveLoading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-sm text-surface-400">書庫プレビューを読み込み中...</p>
                    </div>
                ) : archiveError ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-sm text-red-300">{archiveError}</p>
                    </div>
                ) : archiveGridFrames.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
                    </div>
                ) : (
                    <div className="h-full w-full overflow-y-auto p-3">
                        <div className="grid min-h-full grid-cols-2 content-center gap-3 md:grid-cols-3">
                            {archiveGridFrames.map((framePath, index) => (
                                <button
                                    key={`${framePath}-${index}`}
                                    type="button"
                                    className="relative h-[27vh] w-full overflow-hidden rounded-lg border border-surface-800 bg-surface-950/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 md:h-[31vh]"
                                    onClick={() => setSelectedArchiveFrame(framePath)}
                                >
                                    <img
                                        src={toMediaUrl(framePath)}
                                        alt={`Archive frame ${index + 1}`}
                                        className="block h-full w-full cursor-zoom-in object-cover object-center"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {selectedArchiveFrame ? (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-6"
                        onClick={() => setSelectedArchiveFrame(null)}
                    >
                        <div
                            className="max-h-full max-w-full overflow-hidden rounded-xl border border-surface-700 bg-black shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <img
                                src={toMediaUrl(selectedArchiveFrame)}
                                alt="Selected archive preview"
                                className="block max-w-[min(88vw,1200px)] max-h-[min(82vh,920px)] object-contain"
                                onError={() => setSelectedArchiveFrame(null)}
                            />
                        </div>
                    </div>
                ) : null}
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
