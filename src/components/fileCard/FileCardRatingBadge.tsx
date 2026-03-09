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
            iconClass: 'text-surface-200',
        };
    }

    const ratio = clamp((value - minValue) / (maxValue - minValue), 0, 1);

    if (ratio >= 0.999) {
        return {
            iconClass: 'text-yellow-200',
        };
    }
    if (ratio >= 0.75) {
        return {
            iconClass: 'text-sky-200',
        };
    }
    if (ratio >= 0.5) {
        return {
            iconClass: 'text-amber-200',
        };
    }
    if (ratio >= 0.25) {
        return {
            iconClass: 'text-orange-200',
        };
    }

    return {
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
            className={`inline-flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm backdrop-blur-[1px] ${className}`.trim()}
            title={`${axisName}: ${formattedValue}/${formattedMaxValue}`}
        >
            <Star size={11} className={tone.iconClass} fill="currentColor" strokeWidth={2.2} />
            <span>{formattedValue}</span>
        </div>
    );
});

FileCardRatingBadge.displayName = 'FileCardRatingBadge';
