/**
 * TagSelector - ファイルにタグを追加するためのドロップダウンUI
 */

import React, { useState, useRef, useEffect } from 'react';
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    const tags = useTagStore((s) => s.tags);
    const categories = useTagStore((s) => s.categories);

    // Filter tags by search
    const filteredTags = search
        ? tags.filter(tag => tag.name.toLowerCase().includes(search.toLowerCase()))
        : tags;

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

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

    return (
        <div className="relative" ref={dropdownRef}>
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
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
                <Plus size={14} />
                <span>タグを追加</span>
            </button>

            {/* Dropdown - opens upward */}
            {isOpen && (
                <div className="absolute bottom-full mb-1 w-96 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden" style={{ zIndex: 'var(--z-dropdown)' }}>
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
                </div>
            )}
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
