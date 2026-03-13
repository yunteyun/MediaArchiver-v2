/**
 * TagSelector - ファイルにタグを追加するためのドロップダウンUI
 * Portal化によりoverflow:autoな親コンテナでもドロップダウンが隠れない
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, Search } from 'lucide-react';
import { useTagStore, Tag } from '../../stores/useTagStore';
import { useToastStore } from '../../stores/useToastStore';
import { TagBadge } from './TagBadge';

interface TagSelectorProps {
    selectedTagIds: string[];
    onAdd: (tagId: string) => void | Promise<void>;
    onRemove: (tagId: string) => void | Promise<void>;
    editable?: boolean;
    allowCreate?: boolean;
}

export const TagSelector = React.memo(({
    selectedTagIds,
    onAdd,
    onRemove,
    editable = true,
    allowCreate = false,
}: TagSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const tags = useTagStore((s) => s.tags);
    const categories = useTagStore((s) => s.categories);
    const createTag = useTagStore((s) => s.createTag);
    const categoryColorById = useMemo(() => new Map(categories.map(c => [c.id, c.color])), [categories]);
    const categorySortOrderById = useMemo(() => new Map(categories.map(c => [c.id, c.sortOrder])), [categories]);
    const normalizedSearch = search.trim();
    const normalizedSearchLower = normalizedSearch.toLowerCase();

    // Filter tags by search
    const filteredTags = normalizedSearch
        ? tags.filter(tag => tag.name.toLowerCase().includes(normalizedSearchLower))
        : tags;
    const hasExactMatch = normalizedSearch.length > 0
        && tags.some((tag) => tag.name.trim().toLowerCase() === normalizedSearchLower);
    const canQuickCreate = editable && allowCreate && normalizedSearch.length > 0 && !hasExactMatch;

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
        if (!editable) return;
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

    const handleTagClick = async (tag: Tag) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (selectedTagIds.includes(tag.id)) {
                await onRemove(tag.id);
            } else {
                await onAdd(tag.id);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickCreateTag = async () => {
        if (!canQuickCreate || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const newTag = await createTag(normalizedSearch, 'gray');
            try {
                await onAdd(newTag.id);
                useToastStore.getState().success(`タグ「${newTag.name}」を作成して追加しました`);
                setSearch('');
                setIsOpen(false);
            } catch (error) {
                console.error('Failed to add newly created tag to file:', error);
                useToastStore.getState().error(`タグ「${newTag.name}」は作成しましたが、このファイルへの追加に失敗しました`);
            }
        } catch (error) {
            console.error('Failed to quick-create tag from selector:', error);
            useToastStore.getState().error('タグの新規作成に失敗しました');
        } finally {
            setIsSubmitting(false);
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

    const selectedTagsSorted = useMemo(() => {
        return selectedTagIds
            .map(tagId => tags.find(t => t.id === tagId))
            .filter((tag): tag is Tag => !!tag)
            .slice()
            .sort((a, b) => {
                const aCatOrder = a.categoryId ? (categorySortOrderById.get(a.categoryId) ?? 999) : Number.MAX_SAFE_INTEGER;
                const bCatOrder = b.categoryId ? (categorySortOrderById.get(b.categoryId) ?? 999) : Number.MAX_SAFE_INTEGER;
                if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;
                return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
            });
    }, [selectedTagIds, tags, categorySortOrderById]);

    // カテゴリ色 → CSS背景クラス
    const colorBgClass = (color: string) =>
        color === 'amber' ? 'bg-amber-600'
            : color === 'yellow' ? 'bg-amber-500'
                : color === 'lime' ? 'bg-lime-600'
                    : `bg-${color}-600`;

    const dropdown = isOpen && editable && createPortal(
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && canQuickCreate) {
                                e.preventDefault();
                                void handleQuickCreateTag();
                            }
                        }}
                        className="w-full pl-7 pr-2 py-1.5 text-sm bg-surface-900 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
                        autoFocus
                    />
                </div>
            </div>

            {/* Tag List */}
            <div className="max-h-96 overflow-auto p-2">
                {canQuickCreate && (
                    <div className="mb-2 rounded border border-primary-500/30 bg-primary-500/10 p-2">
                        <button
                            type="button"
                            onClick={() => { void handleQuickCreateTag(); }}
                            disabled={isSubmitting}
                            className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm text-surface-100 transition-colors hover:bg-surface-700/50 disabled:cursor-wait disabled:opacity-60"
                        >
                            <Plus size={14} className="mt-0.5 shrink-0 text-primary-300" />
                            <div className="min-w-0">
                                <div className="truncate">
                                    「{normalizedSearch}」を新規タグとして作成して追加
                                </div>
                                <div className="mt-0.5 text-[11px] text-surface-400">
                                    未分類 / グレーで作成します
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Uncategorized tags */}
                {uncategorizedTags.length > 0 && (
                    <div className="mb-2">
                        <div className="grid grid-cols-2 gap-0.5">
                            {uncategorizedTags.map(tag => (
                                <TagItem
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={selectedTagIds.includes(tag.id)}
                                    onClick={() => { void handleTagClick(tag); }}
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
                                    onClick={() => { void handleTagClick(tag); }}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {filteredTags.length === 0 && !canQuickCreate && (
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
                {selectedTagsSorted.map(tag => (
                    <TagBadge
                        key={tag.id}
                        name={tag.name}
                        color={tag.color}
                        categoryColor={tag.categoryColor || (tag.categoryId ? categoryColorById.get(tag.categoryId) : undefined)}
                        icon={tag.icon}
                        description={tag.description}
                        removable={editable}
                        onRemove={editable ? () => onRemove(tag.id) : undefined}
                    />
                ))}
            </div>

            {/* Add Tag Button */}
            {editable && (
                <button
                    ref={buttonRef}
                    onClick={handleToggle}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors"
                >
                    <Plus size={14} />
                    <span>タグを追加</span>
                </button>
            )}

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
        <TagBadge
            name={tag.name}
            color={tag.color}
            categoryColor={tag.categoryColor}
            icon={tag.icon}
            description={tag.description}
        />
    </button>
));

TagItem.displayName = 'TagItem';
