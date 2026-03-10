import {
    DEFAULT_RATING_DISPLAY_THRESHOLDS,
    type RatingDisplayThresholds,
} from '../../shared/ratingDisplayThresholds';

export interface RatingDisplayTone {
    color: string;
    hoverColor: string;
}

const LOW_TONE: RatingDisplayTone = {
    color: '#ffffff',
    hoverColor: '#ffffff',
};

const MID_TONE: RatingDisplayTone = {
    color: '#93c5fd',
    hoverColor: '#bfdbfe',
};

const HIGH_TONE: RatingDisplayTone = {
    color: '#fef08a',
    hoverColor: '#fef9c3',
};

export function getRatingDisplayTone(
    value: number,
    thresholds: RatingDisplayThresholds = DEFAULT_RATING_DISPLAY_THRESHOLDS
): RatingDisplayTone {
    if (value >= thresholds.high) {
        return HIGH_TONE;
    }
    if (value >= thresholds.mid) {
        return MID_TONE;
    }
    return LOW_TONE;
}
