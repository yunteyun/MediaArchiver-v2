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
    valueClass: string;
};

const RATING_BADGE_MID_THRESHOLD = 3;
const RATING_BADGE_HIGH_THRESHOLD = 4.5;

function formatRatingValue(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getRatingTone(value: number, minValue: number, maxValue: number): RatingTone {
    if (maxValue <= minValue) {
        return {
            iconClass: 'text-surface-200',
            valueClass: 'text-surface-100',
        };
    }

    if (value >= RATING_BADGE_HIGH_THRESHOLD) {
        return {
            iconClass: 'text-yellow-200',
            valueClass: 'text-yellow-100',
        };
    }
    if (value >= RATING_BADGE_MID_THRESHOLD) {
        return {
            iconClass: 'text-blue-300',
            valueClass: 'text-blue-300',
        };
    }

    return {
        iconClass: 'text-white',
        valueClass: 'text-white',
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
            className={`inline-flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-surface-100 shadow-sm backdrop-blur-[1px] ${className}`.trim()}
            title={`${axisName}: ${formattedValue}/${formattedMaxValue}`}
        >
            <Star size={11} className={tone.iconClass} fill="currentColor" strokeWidth={2.2} />
            <span className={tone.valueClass}>{formattedValue}</span>
        </div>
    );
});

FileCardRatingBadge.displayName = 'FileCardRatingBadge';
