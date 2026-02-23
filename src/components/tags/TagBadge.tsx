/**
 * TagBadge - タグ表示用バッジコンポーネント
 */

import React from 'react';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

// Color mapping for tag colors (Phase 13.5: 完全不透明化で視認性向上)
// filled モード用: フル背景色
const colorClasses: Record<string, string> = {
    gray: 'bg-gray-600 text-gray-100 border-gray-500',
    red: 'bg-red-600 text-red-100 border-red-500',
    orange: 'bg-orange-600 text-gray-900 border-orange-500',   // 濃いオレンジには黒文字
    amber: 'bg-amber-600 text-gray-900 border-amber-500',      // 濃いamberで視認性向上
    yellow: 'bg-amber-500 text-gray-900 border-amber-400',     // yellowもamber寄りに統一
    lime: 'bg-lime-600 text-gray-900 border-lime-500',         // limeも濃く
    green: 'bg-green-600 text-green-100 border-green-500',
    emerald: 'bg-emerald-600 text-emerald-100 border-emerald-500',
    teal: 'bg-teal-600 text-teal-100 border-teal-500',
    cyan: 'bg-cyan-600 text-cyan-100 border-cyan-500',
    sky: 'bg-sky-600 text-sky-100 border-sky-500',
    blue: 'bg-blue-600 text-blue-100 border-blue-500',
    indigo: 'bg-indigo-600 text-indigo-100 border-indigo-500',
    violet: 'bg-violet-600 text-violet-100 border-violet-500',
    purple: 'bg-purple-600 text-purple-100 border-purple-500',
    fuchsia: 'bg-fuchsia-600 text-fuchsia-100 border-fuchsia-500',
    pink: 'bg-pink-600 text-pink-100 border-pink-500',
    rose: 'bg-rose-600 text-rose-100 border-rose-500',
};

// border モード用: 左端に色ライン、背景はダーク統一
const borderColorMap: Record<string, string> = {
    gray: '#4b5563',
    red: '#dc2626',
    orange: '#ea580c',
    amber: '#d97706',
    yellow: '#f59e0b',
    lime: '#65a30d',
    green: '#16a34a',
    emerald: '#059669',
    teal: '#0d9488',
    cyan: '#0891b2',
    sky: '#0284c7',
    blue: '#2563eb',
    indigo: '#4f46e5',
    violet: '#7c3aed',
    purple: '#9333ea',
    fuchsia: '#c026d3',
    pink: '#db2777',
    rose: '#e11d48',
};

function resolveTagAccentColor(colorName?: string): string | undefined {
    if (!colorName) return undefined;
    const normalized = colorName.trim().toLowerCase();
    if (!normalized) return undefined;

    // Tailwind系の色名を実色へ変換
    if (borderColorMap[normalized]) {
        return borderColorMap[normalized];
    }

    // 既にCSS色（#hex / rgb / hsl / named color）として使える場合はそのまま渡す
    return colorName;
}

interface TagBadgeProps {
    name: string;
    color?: string;
    size?: 'sm' | 'md';
    categoryColor?: string;  // カテゴリの色（動的ボーダー用）
    removable?: boolean;
    onClick?: () => void;
    onRemove?: () => void;
    selected?: boolean;
    icon?: string;  // lucide-react アイコン名
    description?: string;  // ツールチップ用説明文
}

export const TagBadge = React.memo(({
    name,
    color = 'gray',
    size = 'sm',
    categoryColor,
    removable = false,
    onClick,
    onRemove,
    selected = false,
    icon,
    description,
}: TagBadgeProps) => {
    const tagDisplayStyle = useSettingsStore((s) => s.tagDisplayStyle);
    const isBorderMode = tagDisplayStyle === 'border';

    const sizeClass = size === 'sm' ? 'text-[10px] px-1 py-0.5' : 'text-sm px-2 py-1';
    const selectedClass = selected ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-surface-900' : '';

    // アイコンコンポーネントを動的に取得
    const IconComponent = icon ? (LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>) : null;

    if (isBorderMode) {
        // border モード: ダーク背景 + 左端色ライン
        const borderColor = resolveTagAccentColor(categoryColor) || borderColorMap[color] || borderColorMap.gray;
        return (
            <span
                className={`inline-flex items-center gap-1 rounded border-l-[3px] bg-surface-700/90 text-gray-200 transition-all ${sizeClass} ${selectedClass} ${onClick ? 'cursor-pointer hover:bg-surface-600' : ''}`}
                style={{ borderLeftColor: borderColor }}
                onClick={onClick}
                title={description && description.trim() ? description : undefined}
            >
                {IconComponent && <IconComponent size={size === 'sm' ? 12 : 14} />}
                <span className="truncate max-w-[120px]">{name}</span>
                {removable && onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="hover:bg-white/10 rounded p-0.5 -mr-0.5"
                    >
                        <X size={12} />
                    </button>
                )}
            </span>
        );
    }

    // filled モード: フル背景色（従来の表示）
    const colorClass = colorClasses[color] || colorClasses.gray;

    // カテゴリ色がある場合は左ボーダーを動的に適用
    const resolvedCategoryColor = resolveTagAccentColor(categoryColor);
    const hasCategoryBorder = !!resolvedCategoryColor;
    const categoryBorderClass = hasCategoryBorder ? 'border-l-4' : '';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded border transition-all ${colorClass} ${sizeClass} ${selectedClass} ${categoryBorderClass} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
            style={hasCategoryBorder ? { borderLeftColor: resolvedCategoryColor } : undefined}
            onClick={onClick}
            title={description && description.trim() ? description : undefined}
        >
            {IconComponent && <IconComponent size={size === 'sm' ? 12 : 14} />}
            <span className="truncate max-w-[120px]">{name}</span>
            {removable && onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="hover:bg-white/10 rounded p-0.5 -mr-0.5"
                >
                    <X size={12} />
                </button>
            )}
        </span>
    );
});

TagBadge.displayName = 'TagBadge';
