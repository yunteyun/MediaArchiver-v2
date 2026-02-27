import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileArchive, Music4, RefreshCw } from 'lucide-react';
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
    const [activeArchiveIndex, setActiveArchiveIndex] = useState(0);
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
            setActiveArchiveIndex(0);
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
                setActiveArchiveIndex(0);
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
        const activeFramePath = archiveFrames[activeArchiveIndex] ?? archiveFrames[0] ?? '';

        return (
            <div className="w-[min(92vw,1080px)] h-[min(74vh,760px)] rounded-xl border border-surface-700 bg-surface-900 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-700 bg-surface-950">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full border border-surface-700 bg-surface-900 flex items-center justify-center text-surface-300 flex-shrink-0">
                            <FileArchive size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-surface-200 truncate">{file.name}</p>
                            <p className="text-xs text-surface-500">プレビューフレーム {archiveFrames.length}枚</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsArchiveLoading(true);
                            setArchiveError(null);
                            window.electronAPI.getArchivePreviewFrames(file.path, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT)
                                .then((frames) => {
                                    setArchiveFrames(Array.isArray(frames) ? frames.filter(Boolean) : []);
                                    setActiveArchiveIndex(0);
                                })
                                .catch((error) => {
                                    console.error('Failed to reload archive preview frames in clean lightbox:', error);
                                    setArchiveError('書庫プレビューの再取得に失敗しました');
                                })
                                .finally(() => {
                                    setIsArchiveLoading(false);
                                });
                        }}
                        className="inline-flex items-center gap-1 rounded border border-surface-600 bg-surface-800 px-2 py-1 text-xs text-surface-200 hover:bg-surface-700"
                        title="プレビュー再取得"
                    >
                        <RefreshCw size={12} />
                        再取得
                    </button>
                </div>

                <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
                    <div className="flex-1 min-h-0 rounded-lg border border-surface-700 bg-black flex items-center justify-center overflow-hidden">
                        {isArchiveLoading ? (
                            <p className="text-sm text-surface-400">書庫プレビューを読み込み中...</p>
                        ) : archiveError ? (
                            <p className="text-sm text-red-300">{archiveError}</p>
                        ) : activeFramePath ? (
                            <img
                                src={toMediaUrl(activeFramePath)}
                                alt={`${file.name} preview ${activeArchiveIndex + 1}`}
                                style={mediaBoxStyle}
                                onError={() => setArchiveError('プレビューフレームの表示に失敗しました')}
                            />
                        ) : (
                            <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
                        )}
                    </div>

                    <div className="h-28 shrink-0 rounded-lg border border-surface-700 bg-surface-950 p-2 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-2">
                            {archiveFrames.map((framePath, index) => (
                                <button
                                    key={`${framePath}-${index}`}
                                    type="button"
                                    onClick={() => setActiveArchiveIndex(index)}
                                    className={`rounded-md border overflow-hidden bg-black ${index === activeArchiveIndex
                                        ? 'border-primary-500 ring-1 ring-primary-500'
                                        : 'border-surface-700 hover:border-surface-500'
                                        }`}
                                    title={`フレーム ${index + 1}`}
                                >
                                    <img
                                        src={toMediaUrl(framePath)}
                                        alt={`Archive frame ${index + 1}`}
                                        className="w-full h-14 object-cover"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
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
