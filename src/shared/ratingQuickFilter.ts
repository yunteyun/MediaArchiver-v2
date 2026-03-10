import {
    DEFAULT_RATING_DISPLAY_THRESHOLDS,
    type RatingDisplayThresholds,
} from './ratingDisplayThresholds';

export type RatingQuickFilter = 'none' | 'midOrAbove' | 'unrated';

function formatThresholdValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function normalizeRatingQuickFilter(input: unknown): RatingQuickFilter {
    if (input === 'midOrAbove' || input === 'overall4plus') {
        return 'midOrAbove';
    }
    if (input === 'unrated') {
        return 'unrated';
    }
    return 'none';
}

export function getRatingQuickFilterLabel(
    filter: RatingQuickFilter,
    thresholds: RatingDisplayThresholds = DEFAULT_RATING_DISPLAY_THRESHOLDS
): string {
    if (filter === 'midOrAbove') {
        return `総合 ${formatThresholdValue(thresholds.mid)}+`;
    }
    if (filter === 'unrated') {
        return '未評価のみ';
    }
    return 'なし';
}

export function matchesRatingQuickFilterValue(
    rating: number | undefined,
    quickFilter: RatingQuickFilter,
    thresholds: RatingDisplayThresholds = DEFAULT_RATING_DISPLAY_THRESHOLDS
): boolean {
    if (quickFilter === 'none') {
        return true;
    }
    if (quickFilter === 'midOrAbove') {
        return rating !== undefined && rating >= thresholds.mid;
    }
    return rating === undefined;
}
