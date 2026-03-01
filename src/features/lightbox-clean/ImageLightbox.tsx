import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { ImageInfoPane } from './ImageInfoPaneReadOnly';
import { ImageStage } from './ImageStage';
import {
    LIGHTBOX_INFO_PANE_WIDTH_PX,
    LIGHTBOX_INFO_PANE_WIDTH_XL_PX,
    LIGHTBOX_OVERLAY_OPACITY_MAX,
    LIGHTBOX_OVERLAY_OPACITY_MIN,
    LIGHTBOX_SHELL_MAX_HEIGHT_VH,
    LIGHTBOX_SHELL_MAX_WIDTH_PX,
    LIGHTBOX_SHELL_VIEWPORT_MARGIN_PX,
} from './constants';

interface ImageLightboxProps {
    file: MediaFile;
    overlayOpacity: number;
    lightboxVersion: string;
    videoVolume: number;
    audioVolume: number;
    showPrevious: boolean;
    showNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
}

function clampOpacity(value: number): number {
    const rounded = Math.round(Number.isFinite(value) ? value : LIGHTBOX_OVERLAY_OPACITY_MAX);
    return Math.max(LIGHTBOX_OVERLAY_OPACITY_MIN, Math.min(LIGHTBOX_OVERLAY_OPACITY_MAX, rounded));
}

export const ImageLightbox = React.memo<ImageLightboxProps>(({
    file,
    overlayOpacity,
    lightboxVersion,
    videoVolume,
    audioVolume,
    showPrevious,
    showNext,
    onPrevious,
    onNext,
    onClose,
}) => {
    const overlayStyle = useMemo<React.CSSProperties>(() => {
        const alpha = clampOpacity(overlayOpacity) / 100;
        return {
            backgroundColor: `rgba(0, 0, 0, ${alpha})`,
        };
    }, [overlayOpacity]);

    const shellStyle: React.CSSProperties = {
        width: `calc(100vw - ${LIGHTBOX_SHELL_VIEWPORT_MARGIN_PX}px)`,
        height: `calc(100vh - ${LIGHTBOX_SHELL_VIEWPORT_MARGIN_PX}px)`,
        maxWidth: `${LIGHTBOX_SHELL_MAX_WIDTH_PX}px`,
        maxHeight: `${LIGHTBOX_SHELL_MAX_HEIGHT_VH}vh`,
    };

    const infoPaneWidth = `clamp(${LIGHTBOX_INFO_PANE_WIDTH_PX}px, 22vw, ${LIGHTBOX_INFO_PANE_WIDTH_XL_PX}px)`;

    return (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-lightbox)' }} data-lightbox-version={lightboxVersion}>
            <div
                className="absolute inset-0 z-10"
                style={overlayStyle}
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="absolute inset-0 z-20 flex items-center justify-center p-3 md:p-4">
                <div
                    className="relative flex overflow-hidden rounded-[28px] border border-surface-700 bg-[#061334] shadow-2xl"
                    style={shellStyle}
                    onClick={(event) => event.stopPropagation()}
                >
                    <aside
                        className="h-full min-h-0 flex-shrink-0 overflow-y-auto border-r border-surface-700 bg-[#0b1a46]"
                        style={{ width: infoPaneWidth }}
                    >
                        <ImageInfoPane file={file} />
                    </aside>

                    <section className="flex min-w-0 flex-1 items-center justify-center bg-[#091b52] p-6 md:p-8">
                        <ImageStage
                            file={file}
                            videoVolume={videoVolume}
                            audioVolume={audioVolume}
                        />
                    </section>
                </div>
            </div>

            <div className="pointer-events-none absolute inset-0 z-30">
                <button
                    type="button"
                    onClick={onClose}
                    className="pointer-events-auto absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900"
                    title="閉じる (Esc)"
                >
                    <X size={24} />
                </button>

                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={!showPrevious}
                    className="pointer-events-auto absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600"
                    style={{ left: `calc(${infoPaneWidth} + 1.25rem)` }}
                    title="前へ (←)"
                >
                    <ChevronLeft size={22} />
                </button>

                <button
                    type="button"
                    onClick={onNext}
                    disabled={!showNext}
                    className="pointer-events-auto absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600"
                    title="次へ (→)"
                >
                    <ChevronRight size={22} />
                </button>
            </div>
        </div>
    );
});

ImageLightbox.displayName = 'ImageLightbox';
