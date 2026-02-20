/**
 * StarRatingInput - 星評価入力コンポーネント
 * Phase 26-C1
 * 
 * RatingAxisに対してmin〜maxの星評価を入力するUI。
 * ホバーでプレビュー、クリックで確定、同じ値で再クリックするとリセット。
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
    /** 現在の評価値（undefined = 未評価） */
    value: number | undefined;
    /** 評価軸の最小値 */
    minValue: number;
    /** 評価軸の最大値 */
    maxValue: number;
    /** 刻み幅 */
    step: number;
    /** 評価変更コールバック (null = リセット) */
    onChange: (value: number | null) => void;
    /** 読み取り専用（表示のみ） */
    readOnly?: boolean;
    /** 星のサイズ (px) */
    size?: number;
    /** 非活性状態 */
    disabled?: boolean;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
    value,
    minValue,
    maxValue,
    step,
    onChange,
    readOnly = false,
    size = 18,
    disabled = false,
}) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    // step刻みで選択肢を生成
    const steps: number[] = [];
    for (let v = minValue; v <= maxValue; v += step) {
        steps.push(Math.round(v * 100) / 100);
    }

    const displayValue = hoverValue ?? value ?? 0;

    const handleClick = (v: number) => {
        if (readOnly || disabled) return;
        // 同じ値をクリックするとリセット
        if (value === v) {
            onChange(null);
        } else {
            onChange(v);
        }
    };

    return (
        <div
            className={`flex items-center gap-0.5 ${disabled ? 'opacity-50 cursor-not-allowed' : readOnly ? '' : 'cursor-pointer'}`}
            onMouseLeave={() => !readOnly && !disabled && setHoverValue(null)}
        >
            {steps.map((v) => {
                const filled = v <= displayValue;
                return (
                    <button
                        key={v}
                        type="button"
                        disabled={readOnly || disabled}
                        onClick={() => handleClick(v)}
                        onMouseEnter={() => !readOnly && !disabled && setHoverValue(v)}
                        className={`transition-transform ${!readOnly && !disabled ? 'hover:scale-110 active:scale-95' : ''} disabled:cursor-default`}
                        title={readOnly ? `${v}` : `${v}に評価`}
                        style={{ lineHeight: 0, background: 'none', border: 'none', padding: '1px' }}
                    >
                        <Star
                            size={size}
                            className={`transition-colors duration-100 ${filled
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-surface-600 fill-transparent'
                                } ${hoverValue !== null && v <= (hoverValue ?? 0) && !filled
                                    ? 'text-yellow-300 fill-yellow-300'
                                    : ''
                                }`}
                        />
                    </button>
                );
            })}
            {value !== undefined && !readOnly && (
                <span className="ml-1 text-xs text-surface-500">
                    {value}/{maxValue}
                </span>
            )}
        </div>
    );
};
