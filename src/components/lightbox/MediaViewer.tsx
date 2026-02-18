import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Archive, Music } from 'lucide-react';
import { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';

interface MediaViewerProps {
    file: MediaFile;
    videoVolume: number;
    audioVolume: number;
    onVolumeChange: () => void;
}

export const MediaViewer = React.memo<MediaViewerProps>(({ file, videoVolume, audioVolume, onVolumeChange }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Archive preview state
    const [archivePreviewFrames, setArchivePreviewFrames] = useState<string[]>([]);
    const [archiveAudioFiles, setArchiveAudioFiles] = useState<string[]>([]);
    const [currentArchiveAudioPath, setCurrentArchiveAudioPath] = useState<string | null>(null);
    const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [selectedArchiveImage, setSelectedArchiveImage] = useState<string | null>(null);

    // 動画・音声の音量を同期
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = videoVolume;
        }
        if (audioRef.current) {
            // audioRefは音声ファイルと書庫内音声の両方で使用されるため、常にaudioVolumeを使用
            audioRef.current.volume = audioVolume;
        }
    }, [videoVolume, audioVolume, file, currentArchiveAudioPath]);

    // Set initial volume when video loads
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = videoVolume;
        }
    }, [file, videoVolume]);

    // Load archive preview frames and audio files
    useEffect(() => {
        if (file.type === 'archive') {
            setArchiveLoading(true);
            setArchivePreviewFrames([]);
            setArchiveAudioFiles([]);
            setSelectedArchiveImage(null);
            setCurrentArchiveAudioPath(null);

            // 画像プレビューと音声ファイルリストを並行取得
            Promise.all([
                window.electronAPI.getArchivePreviewFrames(file.path, 12),
                window.electronAPI.getArchiveAudioFiles(file.path)
            ])
                .then(([frames, audioFiles]) => {
                    setArchivePreviewFrames(frames);
                    setArchiveAudioFiles(audioFiles);
                })
                .catch((err) => {
                    console.error('Failed to get archive contents:', err);
                })
                .finally(() => {
                    setArchiveLoading(false);
                });
        } else {
            setArchivePreviewFrames([]);
            setArchiveAudioFiles([]);
            setSelectedArchiveImage(null);
            setCurrentArchiveAudioPath(null);
        }
    }, [file])

    // Keyboard controls for video playback
    useEffect(() => {
        if (file.type !== 'video' || !videoRef.current) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            // 日本語入力時のSpaceキー対応のため e.code を使用
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    e.stopPropagation(); // 既存のショートカットとの競合を防ぐ
                    video.paused ? video.play() : video.pause();
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    e.stopPropagation(); // Lightboxのファイル移動を無効化
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    e.stopPropagation(); // Lightboxのファイル移動を無効化
                    video.currentTime = Math.min(video.duration, video.currentTime + 5);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation();
                    video.volume = Math.min(1, video.volume + 0.1);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation();
                    video.volume = Math.max(0, video.volume - 0.1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [file.type]);


    // Video type
    if (file.type === 'video') {
        return (
            <video
                ref={videoRef}
                src={toMediaUrl(file.path)}
                controls
                autoPlay
                style={{ maxWidth: 'calc(100vw - 450px)', maxHeight: '78vh', objectFit: 'contain' }}
                onVolumeChange={onVolumeChange}
            />
        );
    }

    // Image type
    if (file.type === 'image') {
        return (
            <img
                src={toMediaUrl(file.path)}
                alt={file.name}
                style={{ maxWidth: 'calc(100vw - 450px)', maxHeight: '78vh', objectFit: 'contain' }}
            />
        );
    }

    // Archive type
    if (file.type === 'archive') {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                {/* Selected image full view */}
                {selectedArchiveImage ? (
                    <img
                        src={toMediaUrl(selectedArchiveImage)}
                        alt="Archive preview"
                        style={{ maxWidth: 'calc(100vw - 450px)', maxHeight: '78vh', objectFit: 'contain' }}
                        className="cursor-pointer"
                        onClick={() => setSelectedArchiveImage(null)}
                    />
                ) : archiveLoading ? (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <Loader2 className="animate-spin" size={48} />
                        <p>書庫を読み込み中...</p>
                    </div>
                ) : (
                    /* コンテンツエリア: 画像と音声を横並び */
                    <div className="flex gap-6 max-w-6xl w-full max-h-[70vh]">
                        {/* 左側: 画像グリッド */}
                        {archivePreviewFrames.length > 0 ? (
                            <div className="flex-1 min-w-0">
                                <div className="grid grid-cols-3 gap-2 max-h-[65vh] overflow-auto p-2">
                                    {archivePreviewFrames.map((frame, index) => (
                                        <div
                                            key={index}
                                            className="aspect-square bg-surface-800 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                                            onClick={() => setSelectedArchiveImage(frame)}
                                        >
                                            <img
                                                src={toMediaUrl(frame)}
                                                alt={`Page ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : archiveAudioFiles.length > 0 ? (
                            /* 音声のみの場合: ダミーアルバムアート */
                            <div className="w-48 h-48 flex-shrink-0 bg-gradient-to-br from-surface-700 to-surface-900 rounded-xl flex items-center justify-center shadow-xl">
                                <Music size={72} className="text-primary-400" />
                            </div>
                        ) : null}

                        {/* 右側: 音声ファイルリスト */}
                        {archiveAudioFiles.length > 0 && (
                            <div className="flex-1 min-w-96">
                                <div className="bg-surface-900/80 rounded-lg p-6 h-full flex flex-col">
                                    <p className="text-white text-lg mb-4 font-medium flex items-center gap-3">
                                        <Music size={24} />
                                        音声ファイル ({archiveAudioFiles.length})
                                    </p>
                                    <div className="flex-1 overflow-y-auto max-h-[50vh]">
                                        {archiveAudioFiles.map((audioEntry, index) => {
                                            const isPlaying = currentAudioIndex === index;
                                            return (
                                                <button
                                                    key={index}
                                                    className={`w-full text-left px-4 py-3 text-base rounded-lg flex items-center gap-3 transition-all mb-1 ${isPlaying
                                                        ? 'bg-primary-600 text-white shadow-lg'
                                                        : 'text-surface-200 hover:bg-surface-700'
                                                        }`}
                                                    onClick={async () => {
                                                        const extractedPath = await window.electronAPI.extractArchiveAudioFile(
                                                            file.path,
                                                            audioEntry
                                                        );
                                                        if (extractedPath) {
                                                            setCurrentArchiveAudioPath(extractedPath);
                                                            setCurrentAudioIndex(index);
                                                        }
                                                    }}
                                                >
                                                    <Music
                                                        size={18}
                                                        className={`flex-shrink-0 ${isPlaying
                                                            ? 'text-white animate-pulse'
                                                            : 'text-primary-400'
                                                            }`}
                                                    />
                                                    <span className={`truncate ${isPlaying ? 'font-semibold' : ''}`}>
                                                        {audioEntry.split('/').pop() || audioEntry}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* 音声プレイヤー */}
                                    {currentArchiveAudioPath && (
                                        <div className="mt-3 pt-3 border-t border-surface-700">
                                            <audio
                                                ref={audioRef}
                                                src={toMediaUrl(currentArchiveAudioPath)}
                                                controls
                                                autoPlay
                                                className="w-full"
                                                onVolumeChange={onVolumeChange}
                                                onEnded={async () => {
                                                    if (autoPlayEnabled && currentAudioIndex < archiveAudioFiles.length - 1) {
                                                        const nextIndex = currentAudioIndex + 1;
                                                        const nextEntry = archiveAudioFiles[nextIndex];
                                                        if (!nextEntry) return;
                                                        const extractedPath = await window.electronAPI.extractArchiveAudioFile(
                                                            file.path,
                                                            nextEntry
                                                        );
                                                        if (extractedPath) {
                                                            setCurrentArchiveAudioPath(extractedPath);
                                                            setCurrentAudioIndex(nextIndex);
                                                        }
                                                    }
                                                }}
                                            />
                                            <label className="flex items-center gap-2 mt-2 text-sm text-surface-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={autoPlayEnabled}
                                                    onChange={(e) => setAutoPlayEnabled(e.target.checked)}
                                                    className="w-4 h-4 accent-primary-500"
                                                />
                                                連続再生
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 画像も音声もない場合 */}
                        {archivePreviewFrames.length === 0 && archiveAudioFiles.length === 0 && (
                            <div className="flex flex-col items-center gap-4 text-white">
                                <Archive size={64} className="text-surface-500" />
                                <p className="text-xl">プレビューを取得できませんでした</p>
                                <p className="text-surface-400">ダブルクリックで外部アプリケーションで開きます</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Audio type
    if (file.type === 'audio') {
        return (
            <div className="flex flex-col items-center gap-6 text-white w-full max-w-2xl px-8">
                {/* アルバムアート（サムネイルがある場合） */}
                {file.thumbnailPath ? (
                    <img
                        src={toMediaUrl(file.thumbnailPath)}
                        alt="Album Art"
                        className="w-80 h-80 object-cover rounded-lg shadow-lg"
                    />
                ) : (
                    <div className="w-80 h-80 bg-surface-800 rounded-lg flex items-center justify-center">
                        <Music size={80} className="text-surface-500" />
                    </div>
                )}
                {/* オーディオプレイヤー */}
                <audio
                    ref={audioRef}
                    src={toMediaUrl(file.path)}
                    controls
                    autoPlay
                    className="w-full"
                    onVolumeChange={onVolumeChange}
                />
            </div>
        );
    }

    // Unsupported type
    return (
        <div className="text-white text-center">
            <p className="text-xl mb-4">プレビュー非対応のファイル形式です</p>
            <p className="text-surface-400">ダブルクリックで外部アプリケーションで開きます</p>
        </div>
    );
});

MediaViewer.displayName = 'MediaViewer';
