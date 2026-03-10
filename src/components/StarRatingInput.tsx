/**
 * StarRatingInput - 星評価入力コンポーネント
 * Phase 26-C1 / 更新: 28（ハーフスター対応）
 *
 * - step >= 1: 通常の整星モード（1ステップ = 1つのボタン）
 * - step < 1 (例: 0.5): ハーフスターモード
 *   各整数位置の星を左右2つのクリック領域に分割し、
 *   左半分 = i-step、右半分 = i を選択できる
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { getRatingDisplayTone } from './ratings/ratingDisplayTone';
import { useSettingsStore } from '../stores/useSettingsStore';

// カラー定数（フィルターと統一）
const C_FILLED = '#2563eb';
const C_HOVER = '#60a5fa';
const C_EMPTY = '#475569';

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
    /** 表示色ルール */
    toneMode?: 'perStar' | 'uniform';
}

// ─── ハーフスターモード ───────────────────────────────────────────────────────

interface HalfStarProps {
    /** 整数の星の位置 (1〜maxValue) */
    position: number;
    leftValue?: number;
    rightValue?: number;
    displayValue: number;
    readOnly: boolean;
    disabled: boolean;
    size: number;
    activeColor: string;
    onClickValue: (v: number) => void;
    onHoverValue: (v: number) => void;
    onLeave: () => void;
}

const HalfStar = React.memo<HalfStarProps>(({
    position, leftValue, rightValue, displayValue, readOnly, disabled, size,
    activeColor,
    onClickValue, onHoverValue, onLeave,
}) => {
    // この星の表示状態
    const state: 'full' | 'half' | 'empty' =
        rightValue !== undefined && displayValue >= rightValue ? 'full' :
            leftValue !== undefined && displayValue >= leftValue ? 'half' : 'empty';

    const fillColor = state !== 'empty' ? activeColor : 'transparent';
    const baseStyle: React.CSSProperties = {
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        lineHeight: 0,
        flexShrink: 0,
    };

    return (
        <div
            style={baseStyle}
            onMouseLeave={onLeave}
        >
            {/* ベース：常時表示の輪郭 */}
            <Star size={size} style={{ color: C_EMPTY, fill: 'transparent', display: 'block' }} />

            {/* 塗り：状態に応じて幅を変えてクリップ */}
            {state !== 'empty' && (
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: state === 'half' ? '50%' : '100%',
                    height: '100%',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}>
                    <Star size={size} style={{ color: fillColor, fill: fillColor, display: 'block' }} />
                </div>
            )}

            {/* インタラクション：左半分（= halfVal） */}
            {!readOnly && !disabled && (
                <>
                    <button
                        type="button"
                        style={{
                            position: 'absolute', top: 0, left: 0,
                            width: '50%', height: '100%',
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        }}
                        title={leftValue !== undefined ? `${leftValue}に評価` : undefined}
                        disabled={leftValue === undefined}
                        onClick={() => leftValue !== undefined && onClickValue(leftValue)}
                        onMouseEnter={() => leftValue !== undefined && onHoverValue(leftValue)}
                    />
                    {/* 右半分（= position） */}
                    <button
                        type="button"
                        style={{
                            position: 'absolute', top: 0, left: '50%',
                            width: '50%', height: '100%',
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        }}
                        title={rightValue !== undefined ? `${rightValue}に評価` : undefined}
                        disabled={rightValue === undefined}
                        onClick={() => rightValue !== undefined && onClickValue(rightValue)}
                        onMouseEnter={() => rightValue !== undefined && onHoverValue(rightValue)}
                    />
                </>
            )}
        </div>
    );
});
HalfStar.displayName = 'HalfStar';

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export const StarRatingInput = React.memo<StarRatingInputProps>((({
    value,
    minValue,
    maxValue,
    step,
    onChange,
    readOnly = false,
    size = 18,
    disabled = false,
    toneMode = 'perStar',
}) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const ratingDisplayThresholds = useSettingsStore((s) => s.ratingDisplayThresholds);

    const displayValue = hoverValue ?? value ?? 0;
    const isHalfMode = step < 1;
    const uniformTone = getRatingDisplayTone(
        displayValue || value || minValue,
        ratingDisplayThresholds
    );
    const uniformColor = hoverValue !== null ? uniformTone.hoverColor : uniformTone.color;

    const handleClick = (v: number) => {
        if (readOnly || disabled) return;
        if (value === v) {
            onChange(null);
        } else {
            onChange(v);
        }
    };
    const handleLeave = () => { if (!readOnly && !disabled) setHoverValue(null); };

    // ─ ハーフスターモード ─
    if (isHalfMode) {
        const positions: number[] = [];
        for (let i = Math.ceil(minValue); i <= Math.ceil(maxValue); i++) {
            positions.push(i);
        }

        return (
            <div
                className={`flex items-center gap-0.5 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onMouseLeave={handleLeave}
            >
                {positions.map((pos) => {
                    const leftValue = Math.round((pos - step) * 100) / 100;
                    const rightValue = pos;
                    const resolvedLeft = leftValue >= minValue && leftValue <= maxValue ? leftValue : undefined;
                    const resolvedRight = rightValue >= minValue && rightValue <= maxValue ? rightValue : undefined;
                    if (resolvedLeft === undefined && resolvedRight === undefined) return null;

                    return (
                        <HalfStar
                            key={pos}
                            position={pos}
                            leftValue={resolvedLeft}
                            rightValue={resolvedRight}
                            displayValue={displayValue}
                            readOnly={readOnly}
                            disabled={disabled}
                            size={size}
                            activeColor={toneMode === 'uniform' ? uniformColor : (hoverValue !== null ? C_HOVER : C_FILLED)}
                            onClickValue={handleClick}
                            onHoverValue={(v) => { if (!readOnly && !disabled) setHoverValue(v); }}
                            onLeave={() => {/* 親のonMouseLeaveに委ねる */ }}
                        />
                    );
                })}
                {value !== undefined && !readOnly && (
                    <span className="ml-1 text-xs text-surface-500">
                        {value}/{maxValue}
                    </span>
                )}
            </div>
        );
    }

    // ─ 通常モード（step >= 1）─
    const steps: number[] = [];
    for (let v = minValue; v <= maxValue; v += step) {
        steps.push(Math.round(v * 100) / 100);
    }

    return (
        <div
            className={`flex items-center gap-0.5 ${disabled ? 'opacity-50 cursor-not-allowed' : readOnly ? '' : 'cursor-pointer'}`}
            onMouseLeave={handleLeave}
        >
            {steps.map((v) => {
                const filled = v <= displayValue;
                const isHovered = hoverValue !== null && v <= (hoverValue ?? 0) && !filled;
                const tone = toneMode === 'uniform'
                    ? uniformColor
                    : filled
                        ? C_FILLED
                        : (isHovered ? C_HOVER : C_EMPTY);
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
                            style={{
                                color: tone,
                                fill: filled ? tone : (isHovered ? tone : 'transparent'),
                                transition: 'color 0.1s, fill 0.1s',
                            }}
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
}));

StarRatingInput.displayName = 'StarRatingInput';
