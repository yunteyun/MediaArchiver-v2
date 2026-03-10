import React, { useEffect, useState } from 'react';
import {
    DEFAULT_RATING_DISPLAY_THRESHOLDS,
    RATING_DISPLAY_THRESHOLD_STEP,
    type RatingDisplayThresholds,
} from '../../shared/ratingDisplayThresholds';
import { SettingsSection } from './SettingsSection';

interface RatingDisplaySettingsSectionProps {
    value: RatingDisplayThresholds;
    onChange: (value: RatingDisplayThresholds) => void;
    onReset: () => void;
    activeProfileLabel: string;
}

function formatThresholdValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const RatingDisplaySettingsSection: React.FC<RatingDisplaySettingsSectionProps> = ({
    value,
    onChange,
    onReset,
    activeProfileLabel,
}) => {
    const [midInput, setMidInput] = useState(() => formatThresholdValue(value.mid));
    const [highInput, setHighInput] = useState(() => formatThresholdValue(value.high));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMidInput(formatThresholdValue(value.mid));
        setHighInput(formatThresholdValue(value.high));
    }, [value.high, value.mid]);

    const commit = () => {
        const nextMid = Number(midInput);
        const nextHigh = Number(highInput);

        if (!Number.isFinite(nextMid) || !Number.isFinite(nextHigh)) {
            setError('青開始と黄開始は数値で入力してください');
            return;
        }
        if (nextMid < 0 || nextHigh < 0) {
            setError('境界値は 0 以上にしてください');
            return;
        }
        if (nextHigh < nextMid + RATING_DISPLAY_THRESHOLD_STEP) {
            setError('黄開始は青開始より高くしてください');
            return;
        }

        setError(null);
        onChange({
            mid: nextMid,
            high: nextHigh,
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            commit();
        }
        if (event.key === 'Escape') {
            setMidInput(formatThresholdValue(value.mid));
            setHighInput(formatThresholdValue(value.high));
            setError(null);
        }
    };

    return (
        <section className="px-4 pt-4">
            <SettingsSection
                title="評価表示の色境界"
                description={`現在のプロファイルに保存されます。対象: ${activeProfileLabel}。ファイルカード、左サイドバー、右パネル、中央ビューアの星色に使う境界値です。`}
                scope="profile"
                onReset={onReset}
                className="border-primary-900/40 bg-primary-950/10"
            >
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-surface-400">
                        <span className="mb-1 block">青開始</span>
                        <input
                            type="number"
                            min="0"
                            step={RATING_DISPLAY_THRESHOLD_STEP}
                            value={midInput}
                            onChange={(event) => setMidInput(event.target.value)}
                            onBlur={commit}
                            onKeyDown={handleKeyDown}
                            className="w-full rounded border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                        />
                    </label>
                    <label className="text-xs text-surface-400">
                        <span className="mb-1 block">黄開始</span>
                        <input
                            type="number"
                            min="0"
                            step={RATING_DISPLAY_THRESHOLD_STEP}
                            value={highInput}
                            onChange={(event) => setHighInput(event.target.value)}
                            onBlur={commit}
                            onKeyDown={handleKeyDown}
                            className="w-full rounded border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                        />
                    </label>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-surface-900 px-2 py-1 text-white">
                        {`< ${formatThresholdValue(value.mid)}`}
                    </span>
                    <span className="rounded bg-surface-900 px-2 py-1 text-sky-300">
                        {`${formatThresholdValue(value.mid)} 以上`}
                    </span>
                    <span className="rounded bg-surface-900 px-2 py-1 text-yellow-300">
                        {`${formatThresholdValue(value.high)} 以上`}
                    </span>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <p className="mt-3 text-[11px] text-surface-500">
                    既定値は 青開始 {formatThresholdValue(DEFAULT_RATING_DISPLAY_THRESHOLDS.mid)} / 黄開始 {formatThresholdValue(DEFAULT_RATING_DISPLAY_THRESHOLDS.high)} です。
                </p>
            </SettingsSection>
        </section>
    );
};
