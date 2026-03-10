export interface RatingDisplayThresholds {
    mid: number;
    high: number;
}

export const RATING_DISPLAY_THRESHOLD_STEP = 0.5;

export const DEFAULT_RATING_DISPLAY_THRESHOLDS: RatingDisplayThresholds = {
    mid: 3,
    high: 4.5,
};

function roundToThresholdStep(value: number): number {
    return Math.round(value / RATING_DISPLAY_THRESHOLD_STEP) * RATING_DISPLAY_THRESHOLD_STEP;
}

function normalizeThresholdValue(value: unknown, fallback: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
        return fallback;
    }

    return Math.max(0, roundToThresholdStep(normalized));
}

export function normalizeRatingDisplayThresholds(input: unknown): RatingDisplayThresholds {
    const candidate = input && typeof input === 'object'
        ? input as Partial<RatingDisplayThresholds>
        : undefined;
    const mid = normalizeThresholdValue(candidate?.mid, DEFAULT_RATING_DISPLAY_THRESHOLDS.mid);
    const rawHigh = normalizeThresholdValue(candidate?.high, DEFAULT_RATING_DISPLAY_THRESHOLDS.high);
    const high = rawHigh >= mid + RATING_DISPLAY_THRESHOLD_STEP
        ? rawHigh
        : roundToThresholdStep(mid + RATING_DISPLAY_THRESHOLD_STEP);

    return { mid, high };
}
