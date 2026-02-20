/**
 * RatingSection - Lightbox InfoPanel用 評価セクション
 * Phase 26-C2
 */

import React, { useEffect } from 'react';
import { StarRatingInput } from '../../StarRatingInput';
import { useRatingStore } from '../../../stores/useRatingStore';

interface RatingSectionProps {
    fileId: string;
}

export const RatingSection: React.FC<RatingSectionProps> = ({ fileId }) => {
    const axes = useRatingStore((s) => s.axes);
    const fileRatings = useRatingStore((s) => s.fileRatings);
    const loadFileRatings = useRatingStore((s) => s.loadFileRatings);
    const setFileRating = useRatingStore((s) => s.setFileRating);
    const removeFileRating = useRatingStore((s) => s.removeFileRating);
    const loadAxes = useRatingStore((s) => s.loadAxes);
    const isLoaded = useRatingStore((s) => s.isLoaded);

    useEffect(() => {
        if (!isLoaded) loadAxes();
    }, [isLoaded, loadAxes]);

    useEffect(() => {
        if (fileId && !fileRatings[fileId]) {
            loadFileRatings(fileId);
        }
    }, [fileId, fileRatings, loadFileRatings]);

    if (!isLoaded || axes.length === 0) return null;

    const ratings = fileRatings[fileId] ?? {};

    const handleChange = async (axisId: string, value: number | null) => {
        if (value === null) {
            await removeFileRating(fileId, axisId);
        } else {
            await setFileRating(fileId, axisId, value);
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">評価</h3>
            <div className="space-y-2">
                {axes.map((axis) => (
                    <div key={axis.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/60 shrink-0">{axis.name}</span>
                        <StarRatingInput
                            value={ratings[axis.id]}
                            minValue={axis.minValue}
                            maxValue={axis.maxValue}
                            step={axis.step}
                            onChange={(v) => handleChange(axis.id, v)}
                            size={16}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
