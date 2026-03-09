export const RATING_BADGE_MID_THRESHOLD = 3;
export const RATING_BADGE_HIGH_THRESHOLD = 4.5;

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

export function getRatingDisplayTone(value: number): RatingDisplayTone {
    if (value >= RATING_BADGE_HIGH_THRESHOLD) {
        return HIGH_TONE;
    }
    if (value >= RATING_BADGE_MID_THRESHOLD) {
        return MID_TONE;
    }
    return LOW_TONE;
}
