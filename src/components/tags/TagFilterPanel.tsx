/**
 * TagFilterPanel - サイドバー用タグフィルターパネル
 */

import React, { useEffect, useMemo } from 'react';
import { Tag as TagIcon, Filter, X, Settings, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useTagStore } from '../../stores/useTagStore';
import { TagBadge } from './TagBadge';

interface CategoryHeaderProps {
    categoryId: string;
    categoryName: string;
}

const CategoryHeader = React.memo<CategoryHeaderProps>(({ categoryId, categoryName }) => {
    const isCollapsed = useTagStore((s) => s.collapsedCategoryIds.includes(categoryId));
    const toggleCategoryCollapse = useTagStore((s) => s.toggleCategoryCollapse);

    return (
        <button
            onClick={() => toggleCategoryCollapse(categoryId)}
            className="flex items-center gap-1 w-full hover:bg-surface-800 rounded px-1 py-0.5 transition-colors cursor-pointer"
            aria-expanded={!isCollapsed}
            aria-label={`${categoryName}カテゴリを${isCollapsed ? '展開' : '折りたたむ'}`}
        >
            {isCollapsed ? (
                <ChevronRight size={12} className="text-surface-500" />
            ) : (
                <ChevronDown size={12} className="text-surface-500" />
            )}
            <span className="text-xs text-surface-500">{categoryName}</span>
        </button>
    );
});
CategoryHeader.displayName = 'CategoryHeader';

interface TagFilterPanelProps {
    onOpenManager?: () => void;
}

export const TagFilterPanel = React.memo(({ onOpenManager }: TagFilterPanelProps) => {
    const tags = useTagStore((s) => s.tags);
    const categories = useTagStore((s) => s.categories);
    const selectedTagIds = useTagStore((s) => s.selectedTagIds);
    const filterMode = useTagStore((s) => s.filterMode);
    const collapsedCategoryIds = useTagStore((s) => s.collapsedCategoryIds);
    const searchQuery = useTagStore((s) => s.searchQuery);
    const toggleTagFilter = useTagStore((s) => s.toggleTagFilter);
    const clearTagFilter = useTagStore((s) => s.clearTagFilter);
    const setFilterMode = useTagStore((s) => s.setFilterMode);
    const setSearchQuery = useTagStore((s) => s.setSearchQuery);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);

    // Load tags on mount
    useEffect(() => {
        loadTags();
        loadCategories();
    }, [loadTags, loadCategories]);

    // Filter tags by search query
    const filteredTags = useMemo(() => {
        if (!searchQuery.trim()) return tags;
        const query = searchQuery.toLowerCase();
        return tags.filter(t =>
            t.name.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query))
        );
    }, [tags, searchQuery]);

    // Group tags by category
    const uncategorizedTags = filteredTags.filter(t => !t.categoryId);
    const categorizedGroups = categories
        .map(cat => ({
            category: cat,
            tags: filteredTags.filter(t => t.categoryId === cat.id)
        }))
        .filter(g => g.tags.length > 0);

    const hasFilters = selectedTagIds.length > 0;

    return (
        <div className="border-t border-surface-700 pt-4 mt-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-surface-300">
                    <TagIcon size={16} />
                    <span>タグフィルター</span>
                </div>
                <div className="flex items-center gap-1">
                    {hasFilters && (
                        <button
                            onClick={clearTagFilter}
                            className="text-xs text-surface-500 hover:text-surface-300 flex items-center gap-1"
                        >
                            <X size={12} />
                            クリア
                        </button>
                    )}
                    {onOpenManager && (
                        <button
                            onClick={onOpenManager}
                            className="p-1 hover:bg-surface-700 rounded"
                            title="タグ管理"
                        >
                            <Settings size={14} className="text-surface-400 hover:text-surface-200" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-3 relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="タグを検索..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-800 border border-surface-700 rounded focus:outline-none focus:border-primary-500 text-surface-200 placeholder-surface-500"
                />
            </div>

            {/* Filter Mode Toggle */}
            {selectedTagIds.length > 1 && (
                <div className="flex items-center gap-2 mb-3 text-xs">
                    <Filter size={12} className="text-surface-500" />
                    <button
                        onClick={() => setFilterMode('OR')}
                        className={`px-2 py-0.5 rounded ${filterMode === 'OR' ? 'bg-primary-500/20 text-primary-300' : 'text-surface-500 hover:text-surface-300'}`}
                    >
                        OR
                    </button>
                    <button
                        onClick={() => setFilterMode('AND')}
                        className={`px-2 py-0.5 rounded ${filterMode === 'AND' ? 'bg-primary-500/20 text-primary-300' : 'text-surface-500 hover:text-surface-300'}`}
                    >
                        AND
                    </button>
                </div>
            )}

            {/* Tag List */}
            <div className="space-y-3 max-h-64 overflow-auto">
                {/* Uncategorized */}
                {uncategorizedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {uncategorizedTags.map(tag => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                selected={selectedTagIds.includes(tag.id)}
                                onClick={() => toggleTagFilter(tag.id)}
                                icon={tag.icon}
                                description={tag.description}
                            />
                        ))}
                    </div>
                )}

                {/* By Category */}
                {categorizedGroups.map(({ category, tags }) => {
                    const hasSelectedTags = tags.some(t => selectedTagIds.includes(t.id));
                    const isCollapsed = collapsedCategoryIds.includes(category.id);
                    const visibleTags = isCollapsed
                        ? tags.filter(t => selectedTagIds.includes(t.id))
                        : tags;

                    return (
                        <div key={category.id}>
                            <CategoryHeader
                                categoryId={category.id}
                                categoryName={category.name}
                            />

                            {(!isCollapsed || hasSelectedTags) && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {visibleTags.map(tag => (
                                        <TagBadge
                                            key={tag.id}
                                            name={tag.name}
                                            color={tag.color}
                                            selected={selectedTagIds.includes(tag.id)}
                                            onClick={() => toggleTagFilter(tag.id)}
                                            icon={tag.icon}
                                            description={tag.description}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {tags.length === 0 && (
                    <div className="text-center text-surface-500 text-sm py-4">
                        タグがありません
                    </div>
                )}
            </div>
        </div>
    );
});

TagFilterPanel.displayName = 'TagFilterPanel';
