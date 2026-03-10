import { useSettingsStore } from '../../stores/useSettingsStore';
import {
    getRatingQuickFilterLabel,
    type RatingQuickFilter,
} from '../../shared/ratingQuickFilter';
import { getRatingDisplayTone } from './ratingDisplayTone';

export function useRatingDisplay() {
    const ratingDisplayThresholds = useSettingsStore((state) => state.ratingDisplayThresholds);

    return {
        ratingDisplayThresholds,
        getTone: (value: number) => getRatingDisplayTone(value, ratingDisplayThresholds),
        getQuickFilterLabel: (filter: RatingQuickFilter) => getRatingQuickFilterLabel(filter, ratingDisplayThresholds),
    };
}
