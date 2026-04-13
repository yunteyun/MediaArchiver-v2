/**
 * TagBadge - タグ表示用バッジコンポーネント
 */

import React from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getLucideIconByName } from '../icons/lucideIconMap';
import { TAG_COLOR_CLASSES, TAG_COLOR_HEX, resolveColorHex } from '../../lib/colors';

function resolveTagAccentColor(colorName?: string): string | undefined {
    if (!colorName) return undefined;
    const normalized = colorName.trim().toLowerCase();
    if (!normalized) return undefined;

    // TAG_COLOR_HEX に定義済みの色名はHEXを返す
    if (TAG_COLOR_HEX[normalized]) return TAG_COLOR_HEX[normalized];

    // 既にCSS色（#hex / rgb / hsl 等）はそのまま渡す
    return resolveColorHex(colorName, colorName);
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
    const IconComponent = getLucideIconByName(icon);

    if (isBorderMode) {
        // border モード: ダーク背景 + 左端色ライン
        const borderColor = resolveTagAccentColor(categoryColor) || TAG_COLOR_HEX[color] || TAG_COLOR_HEX.gray;
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
    const colorClass = TAG_COLOR_CLASSES[color] || TAG_COLOR_CLASSES.gray;

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
