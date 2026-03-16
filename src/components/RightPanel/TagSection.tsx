import React from 'react';
import { Check, Pencil } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { useTagStore, type Tag } from '../../stores/useTagStore';
import { useToastStore } from '../../stores/useToastStore';
import { TagBadge } from '../tags/TagBadge';
import { TagSelector } from '../tags/TagSelector';
import type { MediaFile } from '../../types/file';

interface TagSectionProps {
    file: MediaFile;
    embedded?: boolean;
}

const ALL_CATEGORIES_KEY = '__all__';
type CategorySelection = string | typeof ALL_CATEGORIES_KEY | null;

const categoryColorMap: Record<string, string> = {
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

function resolveCategoryAccentColor(colorName?: string): string {
    if (!colorName) return categoryColorMap.gray;
    const normalized = colorName.trim().toLowerCase();
    return categoryColorMap[normalized] || colorName;
}

export const TagSection = React.memo<TagSectionProps>(({ file, embedded = false }) => {
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);
    const tags = useTagStore((s) => s.tags);
    const categories = useTagStore((s) => s.categories);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [activeCategoryKey, setActiveCategoryKey] = React.useState<CategorySelection>(null);
    const [selectorAnchorElement, setSelectorAnchorElement] = React.useState<HTMLElement | null>(null);

    const tagIds = fileTagsCache.get(file.id) ?? [];

    React.useEffect(() => {
        setIsEditMode(false);
        setActiveCategoryKey(null);
        setSelectorAnchorElement(null);
    }, [file.id]);

    React.useEffect(() => {
        void loadTags();
        void loadCategories();
    }, [loadCategories, loadTags]);

    const handleAddTag = async (tagId: string) => {
        try {
            await window.electronAPI.addTagToFile(file.id, tagId);
            const newTagIds = [...tagIds, tagId];
            updateFileTagCache(file.id, newTagIds);
        } catch {
            useToastStore.getState().error('タグの追加に失敗しました');
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        try {
            await window.electronAPI.removeTagFromFile(file.id, tagId);
            const newTagIds = tagIds.filter((id) => id !== tagId);
            updateFileTagCache(file.id, newTagIds);
        } catch {
            useToastStore.getState().error('タグの削除に失敗しました');
        }
    };

    const sortedCategories = React.useMemo(
        () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
        [categories]
    );
    const categoryColorById = React.useMemo(
        () => new Map(categories.map((category) => [category.id, category.color])),
        [categories]
    );
    const categorySortOrderById = React.useMemo(
        () => new Map(categories.map((category) => [category.id, category.sortOrder])),
        [categories]
    );
    const selectedCategoryFilterId = activeCategoryKey && activeCategoryKey !== ALL_CATEGORIES_KEY
        ? activeCategoryKey
        : null;
    const isCategorySelectorOpen = isEditMode && activeCategoryKey !== null;
    const selectedTagsSorted = React.useMemo(() => {
        return tagIds
            .map((tagId) => tags.find((tag) => tag.id === tagId))
            .filter((tag): tag is Tag => !!tag)
            .slice()
            .sort((a, b) => {
                const aCatOrder = a.categoryId ? (categorySortOrderById.get(a.categoryId) ?? 999) : Number.MAX_SAFE_INTEGER;
                const bCatOrder = b.categoryId ? (categorySortOrderById.get(b.categoryId) ?? 999) : Number.MAX_SAFE_INTEGER;
                if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;
                return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
            });
    }, [tagIds, tags, categorySortOrderById]);

    return (
        <div className={embedded ? 'space-y-2' : 'px-4 py-3 space-y-2 border-b border-surface-700'}>
            <div className="flex items-center justify-between gap-2">
                {!embedded && <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">タグ</h3>}
                <button
                    onClick={() => {
                        setIsEditMode((prev) => {
                            const next = !prev;
                            if (!next) {
                                setActiveCategoryKey(null);
                                setSelectorAnchorElement(null);
                            }
                            return next;
                        });
                    }}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
                        isEditMode
                            ? 'bg-primary-600 text-white hover:bg-primary-500'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-surface-100'
                    }`}
                    title={isEditMode ? 'タグ編集を終了' : 'タグ編集を開始'}
                >
                    {isEditMode ? <Check size={12} /> : <Pencil size={12} />}
                    <span>{isEditMode ? '編集終了' : '編集'}</span>
                </button>
            </div>
            <div className="flex flex-wrap gap-1">
                {selectedTagsSorted.map((tag) => (
                    <TagBadge
                        key={tag.id}
                        name={tag.name}
                        color={tag.color}
                        categoryColor={tag.categoryColor || (tag.categoryId ? categoryColorById.get(tag.categoryId) : undefined)}
                        icon={tag.icon}
                        description={tag.description}
                        removable={isEditMode}
                        onRemove={isEditMode ? () => { void handleRemoveTag(tag.id); } : undefined}
                    />
                ))}
            </div>
            {isEditMode && sortedCategories.length > 0 && (
                <div
                    className="space-y-2 rounded-lg border border-surface-700 bg-surface-900/45 p-2"
                    data-ignore-global-escape="true"
                >
                    <div className="text-[11px] text-surface-500">
                        カテゴリを選ぶと、その中のタグ候補がポップアップで開きます
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={(event) => {
                                const nextKey = activeCategoryKey === ALL_CATEGORIES_KEY ? null : ALL_CATEGORIES_KEY;
                                setActiveCategoryKey(nextKey);
                                setSelectorAnchorElement(nextKey ? event.currentTarget : null);
                            }}
                            className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                                activeCategoryKey === ALL_CATEGORIES_KEY
                                    ? 'border-primary-600 bg-primary-900/35 text-primary-100'
                                    : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'
                            }`}
                        >
                            すべて
                        </button>
                            {sortedCategories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={(event) => {
                                        const nextKey = activeCategoryKey === category.id ? null : category.id;
                                        setActiveCategoryKey(nextKey);
                                        setSelectorAnchorElement(nextKey ? event.currentTarget : null);
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                                        activeCategoryKey === category.id
                                            ? 'border-primary-600 bg-primary-900/35 text-primary-100'
                                        : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'
                                }`}
                            >
                                <span
                                    className="h-2 w-2 rounded-sm"
                                    style={{ backgroundColor: resolveCategoryAccentColor(category.color) }}
                                />
                                <span>{category.name}</span>
                            </button>
                        ))}
                    </div>
                    {activeCategoryKey === null && (
                        <div className="text-[11px] text-surface-500">
                            まだカテゴリは選ばれていません
                        </div>
                    )}
                </div>
            )}
            <TagSelector
                selectedTagIds={tagIds}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                editable={isEditMode}
                allowCreate
                categoryFilterId={selectedCategoryFilterId}
                displayMode="dropdown"
                showSelectedTags={false}
                controlledOpen={sortedCategories.length > 0 ? isCategorySelectorOpen : undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveCategoryKey(null);
                        setSelectorAnchorElement(null);
                    }
                }}
                anchorElement={selectorAnchorElement}
                hideTriggerButton={sortedCategories.length > 0}
            />
            {!isEditMode && (
                <p className="text-[11px] text-surface-500">
                    編集から開くと、カテゴリごとに絞ってタグを追加できます
                </p>
            )}
        </div>
    );
});

TagSection.displayName = 'TagSection';
