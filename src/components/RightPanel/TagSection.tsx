import React from 'react';
import { Check, Pencil } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { useTagStore } from '../../stores/useTagStore';
import { useToastStore } from '../../stores/useToastStore';
import { TagSelector } from '../tags/TagSelector';
import type { MediaFile } from '../../types/file';

interface TagSectionProps {
    file: MediaFile;
    embedded?: boolean;
}

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
    const categories = useTagStore((s) => s.categories);
    const loadTags = useTagStore((s) => s.loadTags);
    const loadCategories = useTagStore((s) => s.loadCategories);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);

    const tagIds = fileTagsCache.get(file.id) ?? [];

    React.useEffect(() => {
        setIsEditMode(false);
        setActiveCategoryId(null);
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

    return (
        <div className={embedded ? 'space-y-2' : 'px-4 py-3 space-y-2 border-b border-surface-700'}>
            <div className="flex items-center justify-between gap-2">
                {!embedded && <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">タグ</h3>}
                <button
                    onClick={() => setIsEditMode((prev) => !prev)}
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
            {sortedCategories.length > 0 && (
                <div className="space-y-1">
                    <div className="text-[11px] text-surface-500">
                        カテゴリ
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveCategoryId(null);
                                setIsEditMode(true);
                            }}
                            className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                                activeCategoryId === null
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
                                onClick={() => {
                                    setActiveCategoryId(category.id);
                                    setIsEditMode(true);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                                    activeCategoryId === category.id
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
                </div>
            )}
            {!isEditMode && (
                <p className="text-[11px] text-surface-500">
                    カテゴリを選んで編集すると、追加・削除するタグ候補を絞れます
                </p>
            )}
            <TagSelector
                selectedTagIds={tagIds}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                editable={isEditMode}
                allowCreate
                categoryFilterId={activeCategoryId}
            />
        </div>
    );
});

TagSection.displayName = 'TagSection';
