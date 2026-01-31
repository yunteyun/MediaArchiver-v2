import React, { useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';
import { useFileStore } from '../stores/useFileStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export const LightBox = React.memo(() => {
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const closeLightbox = useUIStore((s) => s.closeLightbox);
    const files = useFileStore((s) => s.files);
    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const setVideoVolume = useSettingsStore((s) => s.setVideoVolume);

    const videoRef = useRef<HTMLVideoElement>(null);

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

    useEffect(() => {
        if (!lightboxFile) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxFile, closeLightbox, goToPrevious, goToNext]);

    // Set initial volume when video loads
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = videoVolume;
        }
    }, [lightboxFile, videoVolume]);

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
                onClick={closeLightbox}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                title="閉じる (ESC)"
            >
                <X size={32} />
            </button>

            {/* Navigation buttons */}
            {currentIndex > 0 && (
                <button
                    onClick={goToPrevious}
                    className="absolute left-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    title="前へ (←)"
                >
                    <ChevronLeft size={48} />
                </button>
            )}
            {currentIndex < files.length - 1 && (
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
                ) : (
                    <div className="text-white text-center">
                        <p className="text-xl mb-4">プレビュー非対応のファイル形式です</p>
                        <p className="text-surface-400">ダブルクリックで外部アプリケーションで開きます</p>
                    </div>
                )}
            </div>

            {/* File info */}
            <div className="absolute bottom-4 left-4 text-white bg-black/50 px-4 py-2 rounded">
                <p className="font-bold text-lg">{lightboxFile.name}</p>
                <p className="text-sm text-surface-300">
                    {(lightboxFile.size / 1024 / 1024).toFixed(2)} MB
                    {lightboxFile.duration && ` • ${lightboxFile.duration}`}
                </p>
            </div>
        </div>
    );
});

LightBox.displayName = 'LightBox';
