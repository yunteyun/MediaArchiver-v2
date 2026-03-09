/**
 * RatingFilterPanel - サイドバー内の評価フィルターUI
 * Phase 27.5
 *
 * 評価軸ごとに「★N以上」をクリックで設定。
 * 星はアプリのblue系（primary-600 = #2563eb）で表示。
 * 同じ星を再クリックで解除（トグル）。
 * 軸が0件の場合は非表示。
 */

import React, { useState, useEffect } from 'react';
import { Settings, Star } from 'lucide-react';
import { useRatingStore } from '../../stores/useRatingStore';
import { useUIStore } from '../../stores/useUIStore';
import { SidebarSectionHeader } from '../SidebarSectionHeader';
import { getRatingDisplayTone } from './ratingDisplayTone';

const COLOR_EMPTY = '#334155';    // 未選択（surface-700）

interface StarButtonProps {
    value: number;
    filled: boolean;
    hovered: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    size?: number;
}

const StarButton: React.FC<StarButtonProps> = ({
    value, filled, hovered, onClick, onMouseEnter, onMouseLeave, size = 16,
}) => {
    const tone = getRatingDisplayTone(value);
    const color = filled || hovered ? (hovered ? tone.hoverColor : tone.color) : COLOR_EMPTY;
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            title={`★${value}以上`}
            style={{ background: 'none', border: 'none', padding: '1px', lineHeight: 0, cursor: 'pointer' }}
            className="transition-transform hover:scale-110 active:scale-95"
        >
            <Star
                size={size}
                style={{ color, fill: (filled || hovered) ? color : 'transparent', transition: 'color 0.1s, fill 0.1s' }}
            />
        </button>
    );
};

interface AxisFilterRowProps {
    axisId: string;
    axisName: string;
    minValue: number;
    maxValue: number;
    step: number;
    currentMin: number | undefined;
    onSet: (min: number) => void;
    onClear: () => void;
}

const AxisFilterRow: React.FC<AxisFilterRowProps> = ({
    axisId: _axisId, axisName, minValue, maxValue, step, currentMin, onSet, onClear,
}) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const isHalfMode = step < 1;

    const handleClick = (v: number) => {
        if (currentMin === v) {
            onClear();
        } else {
            onSet(v);
        }
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-surface-300">{axisName}</span>
                {currentMin !== undefined && (
                    <button
                        onClick={onClear}
                        className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                        title="フィルター解除"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div
                className="flex items-center gap-0.5"
                onMouseLeave={() => setHoverValue(null)}
            >
                {isHalfMode ? (
                    // ─ ハーフスターモード ─
                    (() => {
                        const positions: number[] = [];
                        for (let i = Math.ceil(minValue); i <= Math.ceil(maxValue); i++) positions.push(i);
                        return positions.map((pos) => {
                            const leftValue = Math.round((pos - step) * 100) / 100;
                            const rightValue = pos;
                            const resolvedLeft = leftValue >= minValue && leftValue <= maxValue ? leftValue : undefined;
                            const resolvedRight = rightValue >= minValue && rightValue <= maxValue ? rightValue : undefined;
                            if (resolvedLeft === undefined && resolvedRight === undefined) return null;
                            // 表示状態
                            const dispVal = hoverValue ?? currentMin ?? 0;
                            const state: 'full' | 'half' | 'empty' =
                                resolvedRight !== undefined && dispVal >= resolvedRight ? 'full' :
                                    resolvedLeft !== undefined && dispVal >= resolvedLeft ? 'half' : 'empty';
                            const activeToneValue = state === 'full' ? resolvedRight : resolvedLeft;
                            const activeTone = activeToneValue !== undefined
                                ? getRatingDisplayTone(activeToneValue)
                                : null;
                            const fillColor = state !== 'empty' && activeTone
                                ? (hoverValue !== null ? activeTone.hoverColor : activeTone.color)
                                : 'transparent';

                            return (
                                <div
                                    key={pos}
                                    style={{ position: 'relative', display: 'inline-block', lineHeight: 0, width: 16, height: 16, flexShrink: 0 }}
                                >
                                    {/* ベース輪郭 */}
                                    <Star size={16} style={{ color: COLOR_EMPTY, fill: 'transparent', display: 'block', transition: 'color 0.1s, fill 0.1s' }} />
                                    {/* 塗り */}
                                    {state !== 'empty' && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: state === 'half' ? '50%' : '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
                                            <Star size={16} style={{ color: fillColor, fill: fillColor, display: 'block', transition: 'color 0.1s, fill 0.1s' }} />
                                        </div>
                                    )}
                                    {/* 左半ボタン */}
                                    <button
                                        type="button"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        title={resolvedLeft !== undefined ? `★${resolvedLeft}以上` : undefined}
                                        disabled={resolvedLeft === undefined}
                                        onClick={() => resolvedLeft !== undefined && handleClick(resolvedLeft)}
                                        onMouseEnter={() => resolvedLeft !== undefined && setHoverValue(resolvedLeft)}
                                    />
                                    {/* 右半ボタン */}
                                    <button
                                        type="button"
                                        style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        title={resolvedRight !== undefined ? `★${resolvedRight}以上` : undefined}
                                        disabled={resolvedRight === undefined}
                                        onClick={() => resolvedRight !== undefined && handleClick(resolvedRight)}
                                        onMouseEnter={() => resolvedRight !== undefined && setHoverValue(resolvedRight)}
                                    />
                                </div>
                            );
                        });
                    })()
                ) : (
                    // ─ 通常モード ─
                    (() => {
                        const steps: number[] = [];
                        for (let v = minValue; v <= maxValue; v += step) {
                            steps.push(Math.round(v * 100) / 100);
                        }
                        return steps.map((v) => {
                            const filled = currentMin !== undefined && v <= currentMin;
                            const hovered = hoverValue !== null && v <= hoverValue;
                            return (
                                <StarButton
                                    key={v}
                                    value={v}
                                    filled={filled}
                                    hovered={!filled && hovered}
                                    onClick={() => handleClick(v)}
                                    onMouseEnter={() => setHoverValue(v)}
                                    onMouseLeave={() => setHoverValue(null)}
                                />
                            );
                        });
                    })()
                )}
                {currentMin !== undefined && (
                    <span
                        className="ml-1 text-xs"
                        style={{ color: getRatingDisplayTone(currentMin).color }}
                    >
                        {currentMin}以上
                    </span>
                )}
            </div>
        </div>
    );
};

export const RatingFilterPanel: React.FC = () => {
    const axes = useRatingStore((s) => s.axes);
    const isLoaded = useRatingStore((s) => s.isLoaded);
    const loadAxes = useRatingStore((s) => s.loadAxes);
    const ratingFilter = useRatingStore((s) => s.ratingFilter);
    const setRatingFilter = useRatingStore((s) => s.setRatingFilter);
    const clearRatingFilters = useRatingStore((s) => s.clearRatingFilters);
    const ratingQuickFilter = useUIStore((s) => s.ratingQuickFilter);
    const setRatingQuickFilter = useUIStore((s) => s.setRatingQuickFilter);
    const openSettingsModal = useUIStore((s) => s.openSettingsModal);
    const overallAxis = axes.find((axis) => axis.isSystem) ?? axes[0];

    // 起動時に評価軸をロード。多重実行ガードはストア側が担う。
    useEffect(() => {
        loadAxes();
    }, [loadAxes]);

    // ロード前は非表示
    if (!isLoaded) return null;

    const hasAnyFilter = Object.values(ratingFilter).some(
        (r) => r.min !== undefined || r.max !== undefined
    );
    const hasQuickFilter = ratingQuickFilter !== 'none';

    if (axes.length === 0) {
        return (
            <div className="mt-2 border-t border-surface-700 pt-2 space-y-1">
                <SidebarSectionHeader
                    icon={Star}
                    title="評価フィルター"
                    actions={(
                        <button
                            onClick={() => openSettingsModal('ratings')}
                            className="inline-flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-200 transition-colors"
                            title="評価軸を管理"
                        >
                            <Settings size={12} />
                            管理
                        </button>
                    )}
                />
                <div className="px-1">
                    <p className="text-[11px] text-surface-500">評価軸が未作成です。右の「管理」から追加できます。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 border-t border-surface-700 pt-2 space-y-1">
            {/* ヘッダー */}
            <SidebarSectionHeader
                icon={Star}
                title="評価フィルター"
                actions={
                    <>
                        <button
                            onClick={() => openSettingsModal('ratings')}
                            className="inline-flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-200 transition-colors"
                            title="評価軸を管理"
                        >
                            <Settings size={12} />
                            管理
                        </button>
                        {hasAnyFilter && (
                            <button
                                onClick={clearRatingFilters}
                                className="inline-flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                                title="すべて解除"
                            >
                                全解除
                            </button>
                        )}
                        {hasQuickFilter && (
                            <button
                                onClick={() => setRatingQuickFilter('none')}
                                className="inline-flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                                title="評価クイック条件を解除"
                            >
                                条件解除
                            </button>
                        )}
                    </>
                }
            />

            {overallAxis && (
                <div className="px-1">
                    <div className="mb-1 text-[11px] text-surface-500">総合評価クイック条件</div>
                    <div className="flex flex-wrap gap-1">
                        <button
                            type="button"
                            onClick={() => setRatingQuickFilter('overall4plus')}
                            className={`rounded px-2 py-1 text-[11px] transition-colors ${
                                ratingQuickFilter === 'overall4plus'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                            }`}
                        >
                            総合 4+
                        </button>
                        <button
                            type="button"
                            onClick={() => setRatingQuickFilter('unrated')}
                            className={`rounded px-2 py-1 text-[11px] transition-colors ${
                                ratingQuickFilter === 'unrated'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                            }`}
                        >
                            未評価のみ
                        </button>
                    </div>
                </div>
            )}

            {/* 軸ごとのフィルター行 */}
            <div className="px-1 space-y-2">
                {axes.map((axis) => (
                    <AxisFilterRow
                        key={axis.id}
                        axisId={axis.id}
                        axisName={axis.name}
                        minValue={axis.minValue}
                        maxValue={axis.maxValue}
                        step={axis.step}
                        currentMin={ratingFilter[axis.id]?.min}
                        onSet={(min) => setRatingFilter(axis.id, min, undefined)}
                        onClear={() => setRatingFilter(axis.id, undefined, undefined)}
                    />
                ))}
            </div>
        </div>
    );
};
