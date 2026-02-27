import React, { useCallback, useEffect, useMemo } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ImageLightbox } from './ImageLightbox';

const IMAGE_LIKE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|apng)$/i;

export const CleanLightboxRoot = React.memo(() => {
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const closeLightbox = useUIStore((s) => s.closeLightbox);
    const showToast = useUIStore((s) => s.showToast);
    const files = useFileStore((s) => s.files);
    const incrementAccessCount = useFileStore((s) => s.incrementAccessCount);
    const overlayOpacity = useSettingsStore((s) => s.lightboxOverlayOpacity);

    const isImageFile = useMemo(() => {
        if (!lightboxFile) return false;
        if (lightboxFile.type === 'image') return true;
        return IMAGE_LIKE_EXT_RE.test(lightboxFile.name ?? '') || IMAGE_LIKE_EXT_RE.test(lightboxFile.path ?? '');
    }, [lightboxFile]);

    const currentIndex = useMemo(() => {
        if (!lightboxFile) return -1;
        return files.findIndex((file) => file.id === lightboxFile.id);
    }, [files, lightboxFile]);

    const goToPrevious = useCallback(() => {
        if (currentIndex <= 0) return;
        const previousFile = files[currentIndex - 1];
        if (!previousFile) return;
        useUIStore.getState().openLightbox(previousFile);
    }, [currentIndex, files]);

    const goToNext = useCallback(() => {
        if (currentIndex < 0 || currentIndex >= files.length - 1) return;
        const nextFile = files[currentIndex + 1];
        if (!nextFile) return;
        useUIStore.getState().openLightbox(nextFile);
    }, [currentIndex, files]);

    useEffect(() => {
        if (!lightboxFile || isImageFile) return;
        showToast('画像ライトボックスのみ対応中です', 'info');
        closeLightbox();
    }, [closeLightbox, isImageFile, lightboxFile, showToast]);

    useEffect(() => {
        if (!lightboxFile || !isImageFile) return;
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
    }, [closeLightbox, goToNext, goToPrevious, isImageFile, lightboxFile]);

    useEffect(() => {
        if (!lightboxFile || !isImageFile) return;
        const countAccess = async () => {
            const result = await window.electronAPI.incrementAccessCount(lightboxFile.id);
            if (result.success && result.lastAccessedAt) {
                incrementAccessCount(lightboxFile.id, result.lastAccessedAt);
            }
        };
        void countAccess();
    }, [incrementAccessCount, isImageFile, lightboxFile]);

    if (!lightboxFile || !isImageFile) return null;

    return (
        <ImageLightbox
            file={lightboxFile}
            overlayOpacity={overlayOpacity}
            showPrevious={currentIndex > 0}
            showNext={currentIndex >= 0 && currentIndex < files.length - 1}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onClose={closeLightbox}
        />
    );
});

CleanLightboxRoot.displayName = 'CleanLightboxRoot';
