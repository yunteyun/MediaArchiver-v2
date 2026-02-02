import React, { useEffect, useCallback, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Archive } from 'lucide-react';
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
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [selectedArchiveImage, setSelectedArchiveImage] = useState<string | null>(null);

    // Tag state
    const [fileTagIds, setFileTagIds] = useState<string[]>([]);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);
    const tags = useTagStore((s) => s.tags);

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

    useEffect(() => {
        if (!lightboxFile) return;

        const handleKeyDown = (e: KeyboardEvent) => {
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

    // Load archive preview frames
    useEffect(() => {
        if (lightboxFile?.type === 'archive') {
            setArchiveLoading(true);
            setArchivePreviewFrames([]);
            setSelectedArchiveImage(null);

            window.electronAPI.getArchivePreviewFrames(lightboxFile.path, 12)
                .then((frames) => {
                    setArchivePreviewFrames(frames);
                })
                .catch((err) => {
                    console.error('Failed to get archive preview frames:', err);
                })
                .finally(() => {
                    setArchiveLoading(false);
                });
        } else {
            setArchivePreviewFrames([]);
            setSelectedArchiveImage(null);
        }
    }, [lightboxFile]);

    // Load file tags when lightbox opens
    useEffect(() => {
        if (lightboxFile) {
            loadTags();
            loadCategories();
            window.electronAPI.getFileTagIds(lightboxFile.id)
                .then(setFileTagIds)
                .catch(console.error);
        } else {
            setFileTagIds([]);
        }
    }, [lightboxFile, loadTags, loadCategories]);

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
                    <div className="w-full h-full flex flex-col items-center justify-center">
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
                        ) : archivePreviewFrames.length > 0 ? (
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[80vh] overflow-auto p-4">
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
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-white">
                                <Archive size={64} className="text-surface-500" />
                                <p className="text-xl">プレビューを取得できませんでした</p>
                                <p className="text-surface-400">ダブルクリックで外部アプリケーションで開きます</p>
                            </div>
                        )}
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
            </div>
        </div>
    );
});

LightBox.displayName = 'LightBox';

