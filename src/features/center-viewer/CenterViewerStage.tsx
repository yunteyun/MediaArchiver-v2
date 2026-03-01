import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Music } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import type { LightboxOpenMode } from '../../stores/useUIStore';
import { toMediaUrl } from '../../utils/mediaPath';
import { isAudioArchive } from '../../utils/fileHelpers';

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;
const ARCHIVE_PREVIEW_LIMIT = 6;

interface CenterViewerStageProps {
    file: MediaFile;
    openMode: LightboxOpenMode;
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
    openMode,
    videoVolume,
    audioVolume,
    startTimeSeconds,
}) => {
    const [hasError, setHasError] = useState(false);
    const [archiveFrames, setArchiveFrames] = useState<string[]>([]);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveError, setArchiveError] = useState<string | null>(null);
    const [selectedArchiveFrameIndex, setSelectedArchiveFrameIndex] = useState<number | null>(null);
    const [archiveAudioEntries, setArchiveAudioEntries] = useState<string[]>([]);
    const [currentArchiveAudioPath, setCurrentArchiveAudioPath] = useState<string | null>(null);
    const [currentArchiveAudioIndex, setCurrentArchiveAudioIndex] = useState<number>(-1);
    const [archiveAudioCurrentTime, setArchiveAudioCurrentTime] = useState(0);
    const [archiveAudioIsPlaying, setArchiveAudioIsPlaying] = useState(false);
    const [archiveAudioAutoPlay, setArchiveAudioAutoPlay] = useState(true);
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
        setSelectedArchiveFrameIndex(null);
        setArchiveAudioEntries([]);
        setCurrentArchiveAudioPath(null);
        setCurrentArchiveAudioIndex(-1);
        setArchiveAudioCurrentTime(0);
        setArchiveAudioIsPlaying(false);
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
                const [frames, audioEntries] = await Promise.all([
                    window.electronAPI.getArchivePreviewFrames(file.path, ARCHIVE_PREVIEW_LIMIT),
                    window.electronAPI.getArchiveAudioFiles(file.path),
                ]);
                if (disposed) return;
                setArchiveFrames(Array.isArray(frames) ? frames.filter(Boolean).slice(0, ARCHIVE_PREVIEW_LIMIT) : []);
                setArchiveAudioEntries(Array.isArray(audioEntries) ? audioEntries.filter(Boolean) : []);
            } catch (error) {
                if (disposed) return;
                console.error('Failed to load archive preview frames in center viewer:', error);
                setArchiveFrames([]);
                setArchiveAudioEntries([]);
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

    const handleSelectArchiveAudio = async (entry: string, index: number) => {
        try {
            const extractedPath = await window.electronAPI.extractArchiveAudioFile(file.path, entry);
            if (!extractedPath) return;
            setCurrentArchiveAudioPath(extractedPath);
            setCurrentArchiveAudioIndex(index);
            setArchiveAudioCurrentTime(0);
            setArchiveAudioIsPlaying(true);
        } catch (error) {
            console.error('Failed to extract archive audio file in center viewer:', error);
        }
    };

    const handleArchiveAudioEnded = async () => {
        setArchiveAudioIsPlaying(false);
        setArchiveAudioCurrentTime(0);
        if (!archiveAudioAutoPlay || currentArchiveAudioIndex < 0 || currentArchiveAudioIndex >= archiveAudioEntries.length - 1) {
            return;
        }
        const nextIndex = currentArchiveAudioIndex + 1;
        const nextEntry = archiveAudioEntries[nextIndex];
        if (!nextEntry) return;
        await handleSelectArchiveAudio(nextEntry, nextIndex);
    };

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

        const hasAudioArchiveEntries = archiveAudioEntries.length > 0 || isAudioArchive(file);
        const audioFocusedArchiveView = openMode === 'archive-audio' && archiveAudioEntries.length > 0;
        const imageFocusedArchiveView = openMode === 'archive-image' && archiveFrames.length > 0;
        const showArchivePreviewGrid = archiveFrames.length > 0 && !audioFocusedArchiveView;
        const showArchiveAudioList = archiveAudioEntries.length > 0 && !imageFocusedArchiveView;
        const isMixedArchiveView = showArchivePreviewGrid && showArchiveAudioList;
        const archiveGridColumnClass = archiveFrames.length <= 1
            ? 'grid-cols-1'
            : archiveFrames.length <= 4
                ? 'grid-cols-2'
                : 'grid-cols-3';
        const archivePreviewPanelClass = isMixedArchiveView
            ? archiveFrames.length <= 1
                ? 'w-[min(30vw,280px)] flex-shrink-0'
                : archiveFrames.length <= 4
                    ? 'w-[min(42vw,420px)] flex-shrink-0'
                    : 'w-[min(48vw,520px)] flex-shrink-0'
            : 'w-full';

        if (archiveFrames.length === 0 && archiveAudioEntries.length === 0) {
            return (
                <div className="pointer-events-auto px-6 py-8 text-center">
                    <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
                </div>
            );
        }

        const renderArchiveAudioPlayer = () => {
            if (!currentArchiveAudioPath) return null;
            return (
                <div className="mt-4 border-t border-surface-500/80 pt-4">
                    <audio
                        ref={audioRef}
                        src={toMediaUrl(currentArchiveAudioPath)}
                        controls
                        autoPlay={archiveAudioIsPlaying}
                        className="block w-full min-w-0"
                        onLoadedMetadata={(event) => {
                            event.currentTarget.volume = audioVolume;
                            const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
                            const safeTime = Math.max(0, Math.min(archiveAudioCurrentTime, duration || archiveAudioCurrentTime));
                            if (safeTime > 0) {
                                event.currentTarget.currentTime = safeTime;
                            }
                            if (archiveAudioIsPlaying) {
                                void event.currentTarget.play().catch(() => {
                                    // 再開失敗は握りつぶす
                                });
                            }
                        }}
                        onTimeUpdate={(event) => setArchiveAudioCurrentTime(event.currentTarget.currentTime)}
                        onPlay={() => setArchiveAudioIsPlaying(true)}
                        onPause={() => setArchiveAudioIsPlaying(false)}
                        onEnded={() => {
                            void handleArchiveAudioEnded();
                        }}
                    />
                    <label className="mt-3 flex items-center gap-2 text-sm text-surface-300">
                        <input
                            type="checkbox"
                            checked={archiveAudioAutoPlay}
                            onChange={(event) => setArchiveAudioAutoPlay(event.target.checked)}
                            className="h-4 w-4 accent-primary-500"
                        />
                        連続再生
                    </label>
                </div>
            );
        };

        return (
            <div className="pointer-events-auto flex max-h-full w-full max-w-[1180px] flex-col gap-4 text-surface-100">
                {selectedArchiveFrameIndex != null ? (
                    <>
                        <div className="flex items-center justify-between gap-3 text-sm text-surface-200">
                            <button
                                type="button"
                                onClick={() => setSelectedArchiveFrameIndex(null)}
                                className="rounded-md border border-surface-600 bg-black/60 px-3 py-1.5 transition hover:bg-surface-900"
                            >
                                グリッドへ戻る
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedArchiveFrameIndex((prev) => {
                                        if (prev == null) return prev;
                                        return Math.max(0, prev - 1);
                                    })}
                                    disabled={selectedArchiveFrameIndex <= 0}
                                    className="rounded-md border border-surface-600 bg-black/60 px-3 py-1.5 transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-500"
                                >
                                    前へ
                                </button>
                                <span>{selectedArchiveFrameIndex + 1} / {archiveFrames.length}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedArchiveFrameIndex((prev) => {
                                        if (prev == null) return prev;
                                        return Math.min(archiveFrames.length - 1, prev + 1);
                                    })}
                                    disabled={selectedArchiveFrameIndex >= archiveFrames.length - 1}
                                    className="rounded-md border border-surface-600 bg-black/60 px-3 py-1.5 transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-500"
                                >
                                    次へ
                                </button>
                            </div>
                        </div>
                        <div className="flex max-h-full max-w-full items-center justify-center overflow-hidden">
                            <img
                                src={toMediaUrl(archiveFrames[selectedArchiveFrameIndex] ?? '')}
                                alt={`Archive frame ${selectedArchiveFrameIndex + 1}`}
                                style={mediaStyle}
                                className="pointer-events-auto max-h-full max-w-full"
                                onError={(event) => {
                                    event.currentTarget.style.visibility = 'hidden';
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <div className={`flex max-h-full gap-5 ${showArchiveAudioList ? 'items-stretch justify-center' : 'justify-center'}`}>
                        {showArchivePreviewGrid ? (
                            <div className={archivePreviewPanelClass}>
                                <div className="rounded-xl border border-surface-600/80 bg-black/60 p-4 shadow-2xl backdrop-blur-sm">
                                    <div className={`grid max-h-full ${archiveGridColumnClass} gap-3 overflow-auto`}>
                                        {archiveFrames.map((framePath, index) => (
                                            <button
                                                type="button"
                                                key={`${framePath}-${index}`}
                                                className="aspect-square overflow-hidden rounded-md border border-surface-600/70 bg-surface-800/90 transition hover:ring-2 hover:ring-surface-400"
                                                onClick={() => setSelectedArchiveFrameIndex(index)}
                                            >
                                                <img
                                                    src={toMediaUrl(framePath)}
                                                    alt={`Archive frame ${index + 1}`}
                                                    className="h-full w-full object-contain bg-surface-800/95"
                                                    onError={(event) => {
                                                        event.currentTarget.style.visibility = 'hidden';
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : hasAudioArchiveEntries ? (
                            <div className="flex h-56 w-56 flex-shrink-0 items-center justify-center rounded-xl border border-surface-600/80 bg-gradient-to-br from-surface-700 to-surface-900 shadow-2xl">
                                <Music size={72} className="text-primary-400" />
                            </div>
                        ) : null}

                        {showArchiveAudioList && (
                            <div className={`${showArchivePreviewGrid ? 'w-[560px]' : 'w-full max-w-[920px]'} min-w-0 flex-shrink-0`}>
                                <div className="flex h-full max-h-full flex-col rounded-xl border border-surface-500/90 bg-black p-5 shadow-2xl">
                                    <div className="mb-4 flex items-center gap-3 text-lg font-medium text-surface-100">
                                        <Music size={22} />
                                        <span>音声ファイル ({archiveAudioEntries.length})</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {archiveAudioEntries.map((entry, index) => {
                                            const isPlaying = currentArchiveAudioIndex === index;
                                            return (
                                                <button
                                                    type="button"
                                                    key={`${entry}-${index}`}
                                                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${isPlaying ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-200 hover:bg-surface-700/90'}`}
                                                    onClick={() => {
                                                        void handleSelectArchiveAudio(entry, index);
                                                    }}
                                                >
                                                    <Music
                                                        size={18}
                                                        className={`flex-shrink-0 ${isPlaying ? 'animate-pulse text-white' : 'text-primary-400'}`}
                                                    />
                                                    <span className="truncate">{entry.split('/').pop() || entry}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {renderArchiveAudioPlayer()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (kind === 'unsupported') {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <Archive size={56} className="mx-auto mb-4 text-surface-500" />
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
