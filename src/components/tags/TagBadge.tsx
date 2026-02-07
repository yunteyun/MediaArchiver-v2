/**
 * TagBadge - タグ表示用バッジコンポーネント
 */

import React from 'react';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Color mapping for tag colors
const colorClasses: Record<string, string> = {
    gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    lime: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    teal: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    sky: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    fuchsia: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

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
    const colorClass = colorClasses[color] || colorClasses.gray;
    const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
    const selectedClass = selected ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-surface-900' : '';

    // カテゴリ色がある場合は左ボーダーを動的に適用
    const hasCategoryBorder = !!categoryColor;
    const categoryBorderClass = hasCategoryBorder ? 'border-l-4' : '';

    // アイコンコンポーネントを動的に取得
    const IconComponent = icon ? (LucideIcons[icon as keyof typeof LucideIcons] as React.ComponentType<{ size?: number; className?: string }>) : null;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded border transition-all ${colorClass} ${sizeClass} ${selectedClass} ${categoryBorderClass} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
            style={hasCategoryBorder ? { borderLeftColor: categoryColor } : undefined}
            onClick={onClick}
            title={description && description.trim() ? description : undefined}  // ツールチップ
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

