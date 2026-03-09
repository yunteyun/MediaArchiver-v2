import React from 'react';
import { Star } from 'lucide-react';

interface FileCardRatingBadgeProps {
    value: number;
    minValue: number;
    maxValue: number;
    axisName?: string;
    className?: string;
}

type RatingTone = {
    containerClass: string;
    iconClass: string;
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function formatRatingValue(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getRatingTone(value: number, minValue: number, maxValue: number): RatingTone {
    if (maxValue <= minValue) {
        return {
            containerClass: 'border-surface-400/45 bg-surface-900/88 text-surface-100',
            iconClass: 'text-surface-200',
        };
    }

    const ratio = clamp((value - minValue) / (maxValue - minValue), 0, 1);

    if (ratio >= 0.999) {
        return {
            containerClass: 'border-yellow-400/50 bg-yellow-900/80 text-yellow-50',
            iconClass: 'text-yellow-200',
        };
    }
    if (ratio >= 0.75) {
        return {
            containerClass: 'border-sky-400/45 bg-sky-900/80 text-sky-50',
            iconClass: 'text-sky-200',
        };
    }
    if (ratio >= 0.5) {
        return {
            containerClass: 'border-amber-400/45 bg-amber-900/80 text-amber-50',
            iconClass: 'text-amber-200',
        };
    }
    if (ratio >= 0.25) {
        return {
            containerClass: 'border-orange-400/45 bg-orange-900/80 text-orange-50',
            iconClass: 'text-orange-200',
        };
    }

    return {
        containerClass: 'border-rose-400/45 bg-rose-900/80 text-rose-50',
        iconClass: 'text-rose-200',
    };
}

export const FileCardRatingBadge = React.memo(({
    value,
    minValue,
    maxValue,
    axisName = '総合評価',
    className = '',
}: FileCardRatingBadgeProps) => {
    if (!Number.isFinite(value)) return null;

    const tone = getRatingTone(value, minValue, maxValue);
    const formattedValue = formatRatingValue(value);
    const formattedMaxValue = formatRatingValue(maxValue);

    return (
        <div
            className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm backdrop-blur-[1px] ${tone.containerClass} ${className}`.trim()}
            title={`${axisName}: ${formattedValue}/${formattedMaxValue}`}
        >
            <Star size={11} className={tone.iconClass} fill="currentColor" strokeWidth={2.2} />
            <span>{formattedValue}</span>
        </div>
    );
});

FileCardRatingBadge.displayName = 'FileCardRatingBadge';
