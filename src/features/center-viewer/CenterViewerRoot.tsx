import React, { useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { CenterViewerStage } from './CenterViewerStage';

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;

export const CenterViewerRoot = React.memo(() => {
    const lightboxFile = useUIStore((state) => state.lightboxFile);
    const closeLightbox = useUIStore((state) => state.closeLightbox);
    const showToast = useUIStore((state) => state.showToast);
    const files = useFileStore((state) => state.files);
    const incrementAccessCount = useFileStore((state) => state.incrementAccessCount);
    const setFocusedId = useFileStore((state) => state.setFocusedId);
    const videoVolume = useSettingsStore((state) => state.videoVolume);
    const audioVolume = useSettingsStore((state) => state.audioVolume);

    const lightboxKind = useMemo<'image' | 'video' | 'audio' | 'archive' | 'unsupported'>(() => {
        if (!lightboxFile) return 'unsupported';
        if (lightboxFile.type === 'video') return 'video';
        if (lightboxFile.type === 'audio') return 'audio';
        if (lightboxFile.type === 'archive') return 'archive';
        if (lightboxFile.type === 'image') return 'image';
        return IMAGE_LIKE_EXT_RE.test(lightboxFile.name ?? '') || IMAGE_LIKE_EXT_RE.test(lightboxFile.path ?? '')
            ? 'image'
            : 'unsupported';
    }, [lightboxFile]);

    const currentIndex = useMemo(() => {
        if (!lightboxFile) return -1;
        return files.findIndex((file) => file.id === lightboxFile.id);
    }, [files, lightboxFile]);

    const goToPrevious = useCallback(() => {
        if (currentIndex <= 0) return;
        const previousFile = files[currentIndex - 1];
        if (!previousFile) return;
        setFocusedId(previousFile.id);
        useUIStore.getState().openLightbox(previousFile);
    }, [currentIndex, files, setFocusedId]);

    const goToNext = useCallback(() => {
        if (currentIndex < 0 || currentIndex >= files.length - 1) return;
        const nextFile = files[currentIndex + 1];
        if (!nextFile) return;
        setFocusedId(nextFile.id);
        useUIStore.getState().openLightbox(nextFile);
    }, [currentIndex, files, setFocusedId]);

    useEffect(() => {
        if (!lightboxFile || lightboxKind !== 'unsupported') return;
        showToast('このファイル形式のビューア表示にはまだ対応していません', 'info');
        closeLightbox();
    }, [closeLightbox, lightboxFile, lightboxKind, showToast]);

    useEffect(() => {
        if (!lightboxFile || lightboxKind === 'unsupported') return;

        setFocusedId(lightboxFile.id);

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (event.key === 'Escape') closeLightbox();
            if (event.key === 'ArrowLeft') goToPrevious();
            if (event.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeLightbox, goToNext, goToPrevious, lightboxFile, lightboxKind, setFocusedId]);

    useEffect(() => {
        if (!lightboxFile || lightboxKind === 'unsupported') return;

        const countAccess = async () => {
            const result = await window.electronAPI.incrementAccessCount(lightboxFile.id);
            if (result.success && result.lastAccessedAt) {
                incrementAccessCount(lightboxFile.id, result.lastAccessedAt);
            }
        };

        void countAccess();
    }, [incrementAccessCount, lightboxFile, lightboxKind]);

    if (!lightboxFile || lightboxKind === 'unsupported') {
        return null;
    }

    return (
        <div className="absolute inset-0 z-20 p-4 md:p-5">
            <div className="absolute inset-0 bg-black/55" onClick={closeLightbox} />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:p-5">
                <div className="pointer-events-auto relative flex h-full w-full items-center justify-center rounded-[28px] border border-surface-700 bg-[#091b52] px-10 py-8 shadow-2xl">
                    <button
                        type="button"
                        onClick={closeLightbox}
                        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900"
                        title="閉じる (Esc)"
                    >
                        <X size={22} />
                    </button>

                    <button
                        type="button"
                        onClick={goToPrevious}
                        disabled={currentIndex <= 0}
                        className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600"
                        title="前へ (←)"
                    >
                        <ChevronLeft size={22} />
                    </button>

                    <button
                        type="button"
                        onClick={goToNext}
                        disabled={currentIndex < 0 || currentIndex >= files.length - 1}
                        className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600"
                        title="次へ (→)"
                    >
                        <ChevronRight size={22} />
                    </button>

                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[28px] bg-surface-800 p-6">
                        <CenterViewerStage
                            file={lightboxFile}
                            videoVolume={videoVolume}
                            audioVolume={audioVolume}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

CenterViewerRoot.displayName = 'CenterViewerRoot';
