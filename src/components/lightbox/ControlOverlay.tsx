import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ControlOverlayProps {
    onClose: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
    showPrevious: boolean;
    showNext: boolean;
}

export const ControlOverlay = React.memo<ControlOverlayProps>(({
    onClose,
    onPrevious,
    onNext,
    showPrevious,
    showNext
}) => {
    return (
        <>
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white z-10"
                title="閉じる (ESC)"
            >
                <X size={32} />
            </button>

            {/* Navigation buttons - 下部中央 */}
            {(showPrevious || showNext) && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-10">
                    {showPrevious && onPrevious && (
                        <button
                            onClick={onPrevious}
                            className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all text-white shadow-lg"
                            title="前へ (←)"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}
                    {showNext && onNext && (
                        <button
                            onClick={onNext}
                            className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all text-white shadow-lg"
                            title="次へ (→)"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}
                </div>
            )}
        </>
    );
});

ControlOverlay.displayName = 'ControlOverlay';
