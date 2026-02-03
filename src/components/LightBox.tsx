import React, { useEffect, useCallback, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Archive, Check, FileText, Music } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useFileStore } from '../stores/useFileStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTagStore } from '../stores/useTagStore';
import { TagSelector } from './tags';

export const LightBox = React.memo(() => {
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const closeLightbox = useUIStore((s) => s.closeLightbox);
    const files = useFileStore((s) => s.files);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);
    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);

    const videoRef = useRef<HTMLVideoElement>(null);

    // Archive preview state
    const [archivePreviewFrames, setArchivePreviewFrames] = useState<string[]>([]);
    const [archiveAudioFiles, setArchiveAudioFiles] = useState<string[]>([]);
    const [currentArchiveAudioPath, setCurrentArchiveAudioPath] = useState<string | null>(null);
    const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [selectedArchiveImage, setSelectedArchiveImage] = useState<string | null>(null);

    // Tag state
    const [fileTagIds, setFileTagIds] = useState<string[]>([]);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);
    const tags = useTagStore((s) => s.tags);

    // Memo state
    const [notes, setNotes] = useState('');
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentIndex = files.findIndex(f => f.id === lightboxFile?.id);

    const goToPrevious = useCallback(() => {
        const prevFile = files[currentIndex - 1];
        if (currentIndex > 0 && prevFile) {
            useUIStore.getState().openLightbox(prevFile);
        }
    }, [currentIndex, files]);

    const goToNext = useCallback(() => {
        const nextFile = files[currentIndex + 1];
        if (currentIndex < files.length - 1 && nextFile) {
            useUIStore.getState().openLightbox(nextFile);
        }
    }, [currentIndex, files]);

    // クイックタグ付け（1-9キー）
    const handleQuickTag = useCallback(async (digit: number) => {
        if (!lightboxFile || digit < 1 || digit > 9) return;

        const tagIndex = digit - 1;
        if (tagIndex >= tags.length) {
            return;
        }

        const targetTag = tags[tagIndex];
        if (!targetTag) return;

        const isTagged = fileTagIds.includes(targetTag.id);

        try {
            if (isTagged) {
                await window.electronAPI.removeTagFromFile(lightboxFile.id, targetTag.id);
                const newTagIds = fileTagIds.filter(id => id !== targetTag.id);
                setFileTagIds(newTagIds);
                updateFileTagCache(lightboxFile.id, newTagIds);
            } else {
                await window.electronAPI.addTagToFile(lightboxFile.id, targetTag.id);
                const newTagIds = [...fileTagIds, targetTag.id];
                setFileTagIds(newTagIds);
                updateFileTagCache(lightboxFile.id, newTagIds);
            }
        } catch (err) {
            console.error('Quick tag failed:', err);
        }
    }, [lightboxFile, tags, fileTagIds, updateFileTagCache]);

    // メモ保存（debounce）
    const saveNotes = useCallback(async (value: string) => {
        if (!lightboxFile) return;
        setNotesSaveStatus('saving');
        try {
            await window.electronAPI.updateFileNotes(lightboxFile.id, value);
            setNotesSaveStatus('saved');
            setTimeout(() => setNotesSaveStatus('idle'), 2000);
        } catch (err) {
            console.error('Failed to save notes:', err);
            setNotesSaveStatus('idle');
        }
    }, [lightboxFile]);

    const handleNotesChange = useCallback((value: string) => {
        setNotes(value);
        // debounce: 1秒後に保存
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveNotes(value);
        }, 1000);
    }, [saveNotes]);

    // フォーカス外れたら即保存
    const handleNotesBlur = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (lightboxFile) {
            saveNotes(notes);
        }
    }, [lightboxFile, notes, saveNotes]);

    useEffect(() => {
        if (!lightboxFile) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // テキストエリアにフォーカスがある場合は無視
            if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

            if (e.key === 'Escape') {
                if (selectedArchiveImage) {
                    setSelectedArchiveImage(null);
                } else {
                    closeLightbox();
                }
            }
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();

            // 数字キーでクイックタグ
            if (e.key >= '1' && e.key <= '9') {
                handleQuickTag(parseInt(e.key, 10));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxFile, closeLightbox, goToPrevious, goToNext, selectedArchiveImage, handleQuickTag]);

    // Set initial volume when video loads
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = videoVolume;
        }
    }, [lightboxFile, videoVolume]);

    // Load archive preview frames and audio files
    useEffect(() => {
        if (lightboxFile?.type === 'archive') {
            setArchiveLoading(true);
            setArchivePreviewFrames([]);
            setArchiveAudioFiles([]);
            setSelectedArchiveImage(null);
            setCurrentArchiveAudioPath(null);

            // 画像プレビューと音声ファイルリストを並行取得
            Promise.all([
                window.electronAPI.getArchivePreviewFrames(lightboxFile.path, 12),
                window.electronAPI.getArchiveAudioFiles(lightboxFile.path)
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
    }, [lightboxFile]);

    // Load file tags and notes when lightbox opens
    useEffect(() => {
        if (lightboxFile) {
            loadTags();
            loadCategories();
            window.electronAPI.getFileTagIds(lightboxFile.id)
                .then(setFileTagIds)
                .catch(console.error);
            // メモを読み込み
            setNotes(lightboxFile.notes || '');
            setNotesSaveStatus('idle');
        } else {
            setFileTagIds([]);
            setNotes('');
        }
    }, [lightboxFile, loadTags, loadCategories]);

    // クリーンアップ
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleVolumeChange = () => {
        if (videoRef.current) {
            setVideoVolume(videoRef.current.volume);
        }
    };

    if (!lightboxFile) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
            {/* Close button */}
            <button
                onClick={() => {
                    if (selectedArchiveImage) {
                        setSelectedArchiveImage(null);
                    } else {
                        closeLightbox();
                    }
                }}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white z-10"
                title="閉じる (ESC)"
            >
                <X size={32} />
            </button>

            {/* Navigation buttons */}
            {!selectedArchiveImage && currentIndex > 0 && (
                <button
                    onClick={goToPrevious}
                    className="absolute left-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    title="前へ (←)"
                >
                    <ChevronLeft size={48} />
                </button>
            )}
            {!selectedArchiveImage && currentIndex < files.length - 1 && (
                <button
                    onClick={goToNext}
                    className="absolute right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    title="次へ (→)"
                >
                    <ChevronRight size={48} />
                </button>
            )}

            {/* Media display */}
            <div className="max-w-7xl max-h-screen p-8 flex items-center justify-center">
                {lightboxFile.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={`file://${lightboxFile.path}`}
                        controls
                        autoPlay
                        className="max-w-full max-h-full"
                        onVolumeChange={handleVolumeChange}
                    />
                ) : lightboxFile.type === 'image' ? (
                    <img
                        src={`file://${lightboxFile.path}`}
                        alt={lightboxFile.name}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : lightboxFile.type === 'archive' ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        {/* Selected image full view */}
                        {selectedArchiveImage ? (
                            <img
                                src={`file://${selectedArchiveImage}`}
                                alt="Archive preview"
                                className="max-w-full max-h-[80vh] object-contain cursor-pointer"
                                onClick={() => setSelectedArchiveImage(null)}
                            />
                        ) : archiveLoading ? (
                            <div className="flex flex-col items-center gap-4 text-white">
                                <Loader2 className="animate-spin" size={48} />
                                <p>書庫を読み込み中...</p>
                            </div>
                        ) : (
                            /* コンテンツエリア: 画像と音声を横並び */
                            <div className="flex gap-6 max-w-6xl w-full max-h-[80vh]">
                                {/* 左側: 画像グリッド */}
                                {archivePreviewFrames.length > 0 ? (
                                    <div className="flex-1 min-w-0">
                                        <div className="grid grid-cols-3 gap-2 max-h-[75vh] overflow-auto p-2">
                                            {archivePreviewFrames.map((frame, index) => (
                                                <div
                                                    key={index}
                                                    className="aspect-square bg-surface-800 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                                                    onClick={() => setSelectedArchiveImage(frame)}
                                                >
                                                    <img
                                                        src={`file://${frame}`}
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
                                            <div className="flex-1 overflow-y-auto max-h-[60vh]">
                                                {archiveAudioFiles.map((audioEntry, index) => (
                                                    <button
                                                        key={index}
                                                        className={`w-full text-left px-4 py-3 text-base rounded-lg flex items-center gap-3 transition-colors mb-1 ${currentAudioIndex === index
                                                            ? 'bg-primary-600 text-white'
                                                            : 'text-surface-200 hover:bg-surface-700'
                                                            }`}
                                                        onClick={async () => {
                                                            const extractedPath = await window.electronAPI.extractArchiveAudioFile(
                                                                lightboxFile.path,
                                                                audioEntry
                                                            );
                                                            if (extractedPath) {
                                                                setCurrentArchiveAudioPath(extractedPath);
                                                                setCurrentAudioIndex(index);
                                                            }
                                                        }}
                                                    >
                                                        <Music size={18} className={`flex-shrink-0 ${currentAudioIndex === index ? 'text-white' : 'text-primary-400'}`} />
                                                        <span className="truncate">{audioEntry.split('/').pop() || audioEntry}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {/* 音声プレイヤー */}
                                            {currentArchiveAudioPath && (
                                                <div className="mt-3 pt-3 border-t border-surface-700">
                                                    <audio
                                                        src={`file://${currentArchiveAudioPath}`}
                                                        controls
                                                        autoPlay
                                                        className="w-full"
                                                        onEnded={async () => {
                                                            if (autoPlayEnabled && currentAudioIndex < archiveAudioFiles.length - 1) {
                                                                const nextIndex = currentAudioIndex + 1;
                                                                const nextEntry = archiveAudioFiles[nextIndex];
                                                                if (!nextEntry) return;
                                                                const extractedPath = await window.electronAPI.extractArchiveAudioFile(
                                                                    lightboxFile.path,
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
                ) : lightboxFile.type === 'audio' ? (
                    <div className="flex flex-col items-center gap-6 text-white">
                        {/* アルバムアート（サムネイルがある場合） */}
                        {lightboxFile.thumbnailPath ? (
                            <img
                                src={`file://${lightboxFile.thumbnailPath}`}
                                alt="Album Art"
                                className="w-64 h-64 object-cover rounded-lg shadow-lg"
                            />
                        ) : (
                            <div className="w-64 h-64 bg-surface-800 rounded-lg flex items-center justify-center">
                                <Music size={80} className="text-surface-500" />
                            </div>
                        )}
                        {/* オーディオプレイヤー */}
                        <audio
                            ref={videoRef}
                            src={`file://${lightboxFile.path}`}
                            controls
                            autoPlay
                            className="w-80"
                            onVolumeChange={handleVolumeChange}
                        />
                    </div>
                ) : (
                    <div className="text-white text-center">
                        <p className="text-xl mb-4">プレビュー非対応のファイル形式です</p>
                        <p className="text-surface-400">ダブルクリックで外部アプリケーションで開きます</p>
                    </div>
                )}
            </div>

            {/* File info */}
            <div className="absolute bottom-4 left-4 text-white bg-black/50 px-4 py-2 rounded max-w-md">
                <p className="font-bold text-lg truncate">{lightboxFile.name}</p>
                <p className="text-sm text-surface-300">
                    {(lightboxFile.size / 1024 / 1024).toFixed(2)} MB
                    {lightboxFile.duration && ` • ${lightboxFile.duration}`}
                    {lightboxFile.type === 'archive' && archivePreviewFrames.length > 0 && ` • ${archivePreviewFrames.length} ページ`}
                </p>

                {/* Tag Selector */}
                <div className="mt-2">
                    <TagSelector
                        selectedTagIds={fileTagIds}
                        onAdd={async (tagId) => {
                            await window.electronAPI.addTagToFile(lightboxFile.id, tagId);
                            const newTagIds = [...fileTagIds, tagId];
                            setFileTagIds(newTagIds);
                            updateFileTagCache(lightboxFile.id, newTagIds);
                        }}
                        onRemove={async (tagId) => {
                            await window.electronAPI.removeTagFromFile(lightboxFile.id, tagId);
                            const newTagIds = fileTagIds.filter(id => id !== tagId);
                            setFileTagIds(newTagIds);
                            updateFileTagCache(lightboxFile.id, newTagIds);
                        }}
                    />
                </div>

                {/* Memo Section */}
                <div className="mt-3 border-t border-white/20 pt-2">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText size={14} className="text-surface-400" />
                        <span className="text-xs text-surface-400">メモ</span>
                        {notesSaveStatus === 'saving' && (
                            <span className="text-xs text-surface-500">保存中...</span>
                        )}
                        {notesSaveStatus === 'saved' && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <Check size={12} />
                                保存済み
                            </span>
                        )}
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        onBlur={handleNotesBlur}
                        placeholder="メモを入力..."
                        className="w-full h-16 bg-black/50 text-white text-sm px-2 py-1 rounded border border-white/20 resize-none focus:outline-none focus:border-primary-500 placeholder-surface-500"
                    />
                </div>
            </div>
        </div>
    );
});

LightBox.displayName = 'LightBox';


