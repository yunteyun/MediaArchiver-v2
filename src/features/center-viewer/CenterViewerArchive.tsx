import React, { useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import type { LightboxOpenMode } from '../../stores/useUIStore';
import { useUIStore } from '../../stores/useUIStore';
import { toMediaUrl } from '../../utils/mediaPath';
import { isAudioArchive } from '../../utils/fileHelpers';
import { LIGHTBOX_ARCHIVE_PREVIEW_LIMIT } from '../../components/lightbox/shared/lightboxShared';
import { resolveArchiveDetailKeyboardAction } from '../../components/lightbox/shared/viewerKeyboard';
import { useArchiveAudioPlayer } from './useArchiveAudioPlayer';

interface CenterViewerArchiveProps {
    file: MediaFile;
    openMode: LightboxOpenMode;
    audioVolume: number;
}

const mediaStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
};

export const CenterViewerArchive = React.memo<CenterViewerArchiveProps>(({
    file,
    openMode,
    audioVolume,
}) => {
    const showToast = useUIStore((state) => state.showToast);
    const showToastRef = useRef(showToast);
    showToastRef.current = showToast;

    const [archiveFrames, setArchiveFrames] = useState<string[]>([]);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [archiveError, setArchiveError] = useState<string | null>(null);
    const [selectedArchiveFrameIndex, setSelectedArchiveFrameIndex] = useState<number | null>(null);
    const [archiveAudioEntries, setArchiveAudioEntries] = useState<string[]>([]);
    const archiveFramesRef = useRef(archiveFrames);
    archiveFramesRef.current = archiveFrames;

    const audioPlayer = useArchiveAudioPlayer(file.path, archiveAudioEntries);

    // ファイル切り替え時に書庫状態をリセット
    useEffect(() => {
        setSelectedArchiveFrameIndex(null);
        setArchiveAudioEntries([]);
    }, [file.id, file.path]);

    // アンマウント時に書庫音声の一時ファイルをクリーンアップ
    useEffect(() => {
        return () => {
            void window.electronAPI.cleanArchiveTemp();
        };
    }, []);

    // 書庫フレーム・音声エントリを読み込む
    useEffect(() => {
        let disposed = false;

        setArchiveFrames([]);
        setArchiveLoading(true);
        setArchiveError(null);

        const load = async () => {
            try {
                const [frames, audioEntries] = await Promise.all([
                    window.electronAPI.getArchivePreviewFrames(file.path, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT),
                    window.electronAPI.getArchiveAudioFiles(file.path),
                ]);
                if (disposed) return;
                setArchiveFrames(Array.isArray(frames) ? frames.filter(Boolean).slice(0, LIGHTBOX_ARCHIVE_PREVIEW_LIMIT) : []);
                setArchiveAudioEntries(Array.isArray(audioEntries) ? audioEntries.filter(Boolean) : []);
            } catch (error) {
                if (disposed) return;
                console.error('Failed to load archive preview frames:', error);
                setArchiveFrames([]);
                setArchiveAudioEntries([]);
                setArchiveError('書庫プレビューの取得に失敗しました');
                showToastRef.current('書庫プレビューの取得に失敗しました', 'error');
            } finally {
                if (!disposed) setArchiveLoading(false);
            }
        };

        void load();
        return () => { disposed = true; };
    }, [file.path]);

    // 音声ボリューム同期
    useEffect(() => {
        if (audioPlayer.audioRef.current) {
            audioPlayer.audioRef.current.volume = Math.max(0, Math.min(1, audioVolume));
        }
    }, [audioVolume, file.id, audioPlayer.audioRef]);

    // 書庫詳細モードのキーボードナビゲーション
    useEffect(() => {
        if (selectedArchiveFrameIndex == null) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const action = resolveArchiveDetailKeyboardAction(event);
            if (action === null) return;
            event.preventDefault();
            event.stopPropagation();

            if (action === 'back_to_grid') {
                setSelectedArchiveFrameIndex(null);
                return;
            }
            setSelectedArchiveFrameIndex((current) => {
                if (current == null) return current;
                if (action === 'previous') return Math.max(0, current - 1);
                return Math.min(archiveFramesRef.current.length - 1, current + 1);
            });
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [selectedArchiveFrameIndex]);

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

    if (archiveFrames.length === 0 && archiveAudioEntries.length === 0) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm text-surface-400">表示できるプレビューフレームがありません</p>
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

    const renderAudioPlayer = () => {
        if (!audioPlayer.currentAudioPath) return null;
        return (
            <div className="mt-4 flex-shrink-0 border-t border-surface-500/80 pt-4">
                <audio
                    ref={audioPlayer.audioRef}
                    src={toMediaUrl(audioPlayer.currentAudioPath)}
                    controls
                    autoPlay={audioPlayer.isPlaying}
                    className="block w-full min-w-0"
                    onLoadedMetadata={(event) => {
                        event.currentTarget.volume = audioVolume;
                        const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
                        const safeTime = Math.max(0, Math.min(audioPlayer.audioCurrentTime, duration || audioPlayer.audioCurrentTime));
                        if (safeTime > 0) {
                            event.currentTarget.currentTime = safeTime;
                        }
                        if (audioPlayer.isPlaying) {
                            void event.currentTarget.play().catch(() => {
                                // 再開失敗は握りつぶす
                            });
                        }
                    }}
                    onTimeUpdate={(event) => audioPlayer.handleTimeUpdate(event.currentTarget.currentTime)}
                    onPlay={audioPlayer.handlePlay}
                    onPause={audioPlayer.handlePause}
                    onEnded={() => { void audioPlayer.handleEnded(); }}
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-surface-300">
                    <input
                        type="checkbox"
                        checked={audioPlayer.autoPlay}
                        onChange={(event) => audioPlayer.setAutoPlay(event.target.checked)}
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
                            <span className="text-xs text-surface-400">Esc で戻る</span>
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
                <div className={`flex max-h-full min-h-0 gap-5 ${showArchiveAudioList ? 'items-stretch justify-center' : 'justify-center'}`}>
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
                        <div className={`${showArchivePreviewGrid ? 'w-[560px]' : 'w-full max-w-[920px]'} min-w-0 max-h-full flex-shrink-0`}>
                            <div className="flex h-full max-h-full flex-col rounded-xl border border-surface-500/90 bg-black p-5 shadow-2xl">
                                <div className="mb-4 flex items-center gap-3 text-lg font-medium text-surface-100">
                                    <Music size={22} />
                                    <span>音声ファイル ({archiveAudioEntries.length})</span>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {archiveAudioEntries.map((entry, index) => {
                                        const isPlaying = audioPlayer.currentAudioIndex === index;
                                        return (
                                            <button
                                                type="button"
                                                key={`${entry}-${index}`}
                                                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${isPlaying ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-200 hover:bg-surface-700/90'}`}
                                                onClick={() => { void audioPlayer.handleSelect(entry, index); }}
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
                                {renderAudioPlayer()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

CenterViewerArchive.displayName = 'CenterViewerArchive';
