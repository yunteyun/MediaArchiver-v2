import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRatingStore, type RatingAxis } from '../useRatingStore';

const baseAxes: RatingAxis[] = [
    {
        id: 'overall',
        name: '総合評価',
        minValue: 1,
        maxValue: 5,
        step: 1,
        isSystem: true,
        sortOrder: 0,
        createdAt: 1,
    },
    {
        id: 'story',
        name: 'ストーリー',
        minValue: 1,
        maxValue: 5,
        step: 1,
        isSystem: false,
        sortOrder: 1,
        createdAt: 2,
    },
];

function resetRatingStore() {
    useRatingStore.setState({
        axes: [],
        fileRatings: {},
        isLoaded: false,
        isLoading: false,
        ratingFilter: {},
    });
}

describe('useRatingStore', () => {
    beforeEach(() => {
        resetRatingStore();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('switches the overall axis and keeps a single system axis', async () => {
        const switchedAxes: RatingAxis[] = [
            { ...baseAxes[0], isSystem: false },
            { ...baseAxes[1], isSystem: true },
        ];

        useRatingStore.setState({
            axes: baseAxes,
            isLoaded: true,
        });

        vi.stubGlobal('window', {
            electronAPI: {
                setOverallRatingAxis: vi.fn().mockResolvedValue(switchedAxes),
            },
        });

        await useRatingStore.getState().setOverallAxis('story');

        const axes = useRatingStore.getState().axes;
        expect(axes.find((axis) => axis.id === 'overall')?.isSystem).toBe(false);
        expect(axes.find((axis) => axis.id === 'story')?.isSystem).toBe(true);
        expect(axes.filter((axis) => axis.isSystem)).toHaveLength(1);
    });
});
