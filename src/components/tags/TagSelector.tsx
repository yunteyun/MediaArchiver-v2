/**
 * TagSelector - ファイルにタグを追加するためのドロップダウンUI
 * Portal化によりoverflow:autoな親コンテナでもドロップダウンが隠れない
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, Search } from 'lucide-react';
import { useTagStore, Tag } from '../../stores/useTagStore';
import { TagBadge } from './TagBadge';

interface TagSelectorProps {
    selectedTagIds: string[];
    onAdd: (tagId: string) => void;
    onRemove: (tagId: string) => void;
}

export const TagSelector = React.memo(({
    selectedTagIds,
    onAdd,
    onRemove,
}: TagSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const tags = useTagStore((s) => s.tags);
    const categories = useTagStore((s) => s.categories);

    // Filter tags by search
    const filteredTags = search
        ? tags.filter(tag => tag.name.toLowerCase().includes(search.toLowerCase()))
        : tags;

    // ドロップダウンの位置をボタンのDOMRectから計算（Portal用）
    const calcDropdownPosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownHeight = 440; // max-h-96(384px) + 検索欄(~56px)
        const dropdownWidth = 384;  // w-96
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        // 上に十分なスペースがあれば上向き、なければ下向き
        if (spaceAbove > dropdownHeight || spaceAbove > spaceBelow) {
            setDropdownStyle({
                position: 'fixed',
                bottom: window.innerHeight - rect.top + 4,
                left: Math.min(rect.left, window.innerWidth - dropdownWidth - 8),
                width: dropdownWidth,
                zIndex: 9999,
            });
        } else {
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: Math.min(rect.left, window.innerWidth - dropdownWidth - 8),
                width: dropdownWidth,
                zIndex: 9999,
            });
        }
    }, []);

    const handleToggle = () => {
        if (!isOpen) {
            calcDropdownPosition();
        }
        setIsOpen(prev => !prev);
        setSearch('');
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                buttonRef.current && !buttonRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // スクロールやリサイズで位置を再計算
    useEffect(() => {
        if (!isOpen) return;
        const update = () => calcDropdownPosition();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [isOpen, calcDropdownPosition]);

    const handleTagClick = (tag: Tag) => {
        if (selectedTagIds.includes(tag.id)) {
            onRemove(tag.id);
        } else {
            onAdd(tag.id);
        }
    };

    // Group tags by category (sortOrder順)
    const uncategorizedTags = filteredTags
        .filter(t => !t.categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const categorizedGroups = [...categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(cat => ({
            category: cat,
            tags: filteredTags
                .filter(t => t.categoryId === cat.id)
                .sort((a, b) => a.sortOrder - b.sortOrder)
        }))
        .filter(g => g.tags.length > 0);

    // カテゴリ色 → CSS背景クラス
    const colorBgClass = (color: string) =>
        color === 'amber' ? 'bg-amber-600'
            : color === 'yellow' ? 'bg-amber-500'
                : color === 'lime' ? 'bg-lime-600'
                    : `bg-${color}-600`;

    const dropdown = isOpen && createPortal(
        <div
            ref={dropdownRef}
            className="bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden"
            style={dropdownStyle}
        >
            {/* Search */}
            <div className="p-2 border-b border-surface-700">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="タグを検索..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-sm bg-surface-900 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
                        autoFocus
                    />
                </div>
            </div>

            {/* Tag List */}
            <div className="max-h-96 overflow-auto p-2">
                {/* Uncategorized tags */}
                {uncategorizedTags.length > 0 && (
                    <div className="mb-2">
                        <div className="grid grid-cols-2 gap-0.5">
                            {uncategorizedTags.map(tag => (
                                <TagItem
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={selectedTagIds.includes(tag.id)}
                                    onClick={() => handleTagClick(tag)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Categorized tags */}
                {categorizedGroups.map(({ category, tags }) => (
                    <div key={category.id} className="mb-2">
                        <div className="text-xs text-surface-500 font-medium mb-1 px-2 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${colorBgClass(category.color)}`} />
                            {category.name}
                        </div>
                        <div className="grid grid-cols-2 gap-0.5">
                            {tags.map(tag => (
                                <TagItem
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={selectedTagIds.includes(tag.id)}
                                    onClick={() => handleTagClick(tag)}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {filteredTags.length === 0 && (
                    <div className="text-center text-surface-500 text-sm py-4">
                        タグが見つかりません
                    </div>
                )}
            </div>
        </div>,
        document.body
    );

    return (
        <div className="relative">
            {/* Selected Tags Display */}
            <div className="flex flex-wrap gap-1 mb-2">
                {selectedTagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                        <TagBadge
                            key={tag.id}
                            name={tag.name}
                            color={tag.color}
                            removable
                            onRemove={() => onRemove(tag.id)}
                        />
                    );
                })}
            </div>

            {/* Add Tag Button */}
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
                <Plus size={14} />
                <span>タグを追加</span>
            </button>

            {/* Dropdown - Portal経由でbody直下に配置（overflowクリップ回避） */}
            {dropdown}
        </div>
    );
});

TagSelector.displayName = 'TagSelector';

// Helper component for tag items in dropdown
const TagItem = React.memo(({
    tag,
    isSelected,
    onClick,
}: {
    tag: Tag;
    isSelected: boolean;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-700 transition-colors ${isSelected ? 'bg-surface-700' : ''
            }`}
    >
        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-surface-500'
            }`}>
            {isSelected && <Check size={12} className="text-white" />}
        </div>
        <TagBadge name={tag.name} color={tag.color} />
    </button>
));

TagItem.displayName = 'TagItem';
