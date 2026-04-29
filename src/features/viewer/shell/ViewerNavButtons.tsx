import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ViewerNavButtonsProps {
    onPrevious: () => void;
    onNext: () => void;
    hasPrevious: boolean;
    hasNext: boolean;
}

const btnBase =
    'pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-viewer-surface text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600';

export const ViewerNavButtons: React.FC<ViewerNavButtonsProps> = ({
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
}) => (
    <div className="pointer-events-none absolute inset-0">
        <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className={`${btnBase} left-5`}
            title="前へ (←)"
        >
            <ChevronLeft size={22} />
        </button>
        <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className={`${btnBase} right-5`}
            title="次へ (→)"
        >
            <ChevronRight size={22} />
        </button>
    </div>
);
