/**
 * RatingSection - RightPanel用 評価セクション
 * Phase 26-C1
 *
 * 選択中ファイルに対して全評価軸の星評価を表示・編集する。
 * file変更時にlazy loadでfileRatingsを取得。
 */

import React, { useEffect } from 'react';
import { StarRatingInput } from '../StarRatingInput';
import { useRatingStore } from '../../stores/useRatingStore';
import type { MediaFile } from '../../types/file';

interface RatingSectionProps {
    file: MediaFile;
}

export const RatingSection: React.FC<RatingSectionProps> = ({ file }) => {
    const axes = useRatingStore((s) => s.axes);
    const fileRatings = useRatingStore((s) => s.fileRatings);
    const loadFileRatings = useRatingStore((s) => s.loadFileRatings);
    const setFileRating = useRatingStore((s) => s.setFileRating);
    const removeFileRating = useRatingStore((s) => s.removeFileRating);
    const loadAxes = useRatingStore((s) => s.loadAxes);
    const isLoaded = useRatingStore((s) => s.isLoaded);

    // ファイルや軸が変わったらlazy load
    useEffect(() => {
        if (!isLoaded) {
            loadAxes();
        }
    }, [isLoaded, loadAxes]);

    useEffect(() => {
        if (file?.id && !fileRatings[file.id]) {
            loadFileRatings(file.id);
        }
    }, [file?.id, fileRatings, loadFileRatings]);

    if (!isLoaded || axes.length === 0) return null;

    const ratings = fileRatings[file.id] ?? {};

    const handleChange = async (axisId: string, value: number | null) => {
        if (value === null) {
            await removeFileRating(file.id, axisId);
        } else {
            await setFileRating(file.id, axisId, value);
        }
    };

    return (
        <div className="px-4 py-3 space-y-2 border-t border-surface-700/50">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">評価</h3>
            <div className="space-y-2">
                {axes.map((axis) => (
                    <div key={axis.id} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-surface-400">{axis.name}</span>
                            {ratings[axis.id] !== undefined && (
                                <button
                                    className="text-xs text-surface-600 hover:text-red-400 transition-colors"
                                    onClick={() => handleChange(axis.id, null)}
                                    title="評価をリセット"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
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
