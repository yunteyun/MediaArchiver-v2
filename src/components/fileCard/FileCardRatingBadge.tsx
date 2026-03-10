import React from 'react';
import { Star } from 'lucide-react';
import { getRatingDisplayTone } from '../ratings/ratingDisplayTone';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface FileCardRatingBadgeProps {
    value: number;
    minValue: number;
    maxValue: number;
    axisName?: string;
    className?: string;
}

type RatingTone = {
    color: string;
};

function formatRatingValue(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getRatingTone(
    value: number,
    minValue: number,
    maxValue: number,
    ratingDisplayThresholds: Parameters<typeof getRatingDisplayTone>[1]
): RatingTone {
    if (maxValue <= minValue) {
        return {
            color: '#e2e8f0',
        };
    }

    return {
        color: getRatingDisplayTone(value, ratingDisplayThresholds).color,
    };
}

export const FileCardRatingBadge = React.memo(({
    value,
    minValue,
    maxValue,
    axisName = '総合評価',
    className = '',
}: FileCardRatingBadgeProps) => {
    const ratingDisplayThresholds = useSettingsStore((s) => s.ratingDisplayThresholds);
    if (!Number.isFinite(value)) return null;

    const tone = getRatingTone(value, minValue, maxValue, ratingDisplayThresholds);
    const formattedValue = formatRatingValue(value);
    const formattedMaxValue = formatRatingValue(maxValue);

    return (
        <div
            className={`inline-flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-surface-100 shadow-sm backdrop-blur-[1px] ${className}`.trim()}
            title={`${axisName}: ${formattedValue}/${formattedMaxValue}`}
        >
            <Star size={11} style={{ color: tone.color, fill: tone.color }} strokeWidth={2.2} />
            <span style={{ color: tone.color }}>{formattedValue}</span>
        </div>
    );
});

FileCardRatingBadge.displayName = 'FileCardRatingBadge';
