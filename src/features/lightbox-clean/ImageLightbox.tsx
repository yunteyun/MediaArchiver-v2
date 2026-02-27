import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { ImageInfoPaneReadOnly } from './ImageInfoPaneReadOnly';
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
    showPrevious,
    showNext,
    onPrevious,
    onNext,
    onClose,
}) => {
    const overlayStyle = useMemo<React.CSSProperties>(() => {
        const alpha = clampOpacity(overlayOpacity) / 100;
        return {
            zIndex: 'var(--z-lightbox)',
            backgroundColor: `rgba(0, 0, 0, ${alpha})`,
        };
    }, [overlayOpacity]);

    const shellStyle: React.CSSProperties = {
        width: `calc(100vw - ${LIGHTBOX_SHELL_VIEWPORT_MARGIN_PX}px)`,
        height: `calc(100vh - ${LIGHTBOX_SHELL_VIEWPORT_MARGIN_PX}px)`,
        maxWidth: `${LIGHTBOX_SHELL_MAX_WIDTH_PX}px`,
        maxHeight: `${LIGHTBOX_SHELL_MAX_HEIGHT_VH}vh`,
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={overlayStyle}
            onClick={onClose}
            data-lightbox-version="clean-image"
        >
            {import.meta.env.DEV && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] px-3 py-1 rounded-full border border-emerald-400 bg-emerald-900 text-emerald-100 text-xs font-semibold pointer-events-none">
                    Lightbox Clean (Image)
                </div>
            )}

            <div
                className="relative z-10 rounded-2xl border border-surface-700 bg-surface-950 shadow-2xl"
                style={shellStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-full w-full p-4 md:p-5 flex items-center gap-4 md:gap-5">
                    <aside
                        className="h-full min-h-0 flex-shrink-0 rounded-xl border border-surface-700 bg-surface-950 overflow-hidden"
                        style={{ width: `clamp(${LIGHTBOX_INFO_PANE_WIDTH_PX}px, 22vw, ${LIGHTBOX_INFO_PANE_WIDTH_XL_PX}px)` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ImageInfoPaneReadOnly file={file} />
                    </aside>

                    <section
                        className="relative flex-1 h-full min-w-0 rounded-xl border border-surface-700 bg-surface-950 overflow-hidden"
                        onClick={onClose}
                    >
                        <div className="h-full w-full flex items-center justify-center p-4 md:p-6">
                            <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="absolute top-0 right-0 z-30 rounded-full border border-surface-600 bg-black px-2.5 py-2.5 text-surface-100 shadow-xl translate-x-[calc(100%+10px)] -translate-y-[calc(100%+6px)] md:translate-x-[calc(100%+12px)] md:-translate-y-[calc(100%+8px)] hover:bg-surface-900"
                                    title="閉じる (Esc)"
                                >
                                    <X size={24} />
                                </button>
                                <ImageStage file={file} />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={onPrevious}
                        disabled={!showPrevious}
                        className="h-11 w-11 rounded-full border border-surface-600 bg-black text-surface-100 disabled:text-surface-600 disabled:border-surface-800 disabled:cursor-not-allowed hover:bg-surface-900 flex items-center justify-center"
                        title="前へ (←)"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!showNext}
                        className="h-11 w-11 rounded-full border border-surface-600 bg-black text-surface-100 disabled:text-surface-600 disabled:border-surface-800 disabled:cursor-not-allowed hover:bg-surface-900 flex items-center justify-center"
                        title="次へ (→)"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
});

ImageLightbox.displayName = 'ImageLightbox';
