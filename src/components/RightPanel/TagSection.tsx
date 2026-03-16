import React from 'react';
import { Check, Pencil } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { useTagStore } from '../../stores/useTagStore';
import { useToastStore } from '../../stores/useToastStore';
import { TagSelector } from '../tags/TagSelector';
import { TagBadge } from '../tags/TagBadge';
import type { MediaFile } from '../../types/file';

interface TagSectionProps {
    file: MediaFile;
    embedded?: boolean;
}

export const TagSection = React.memo<TagSectionProps>(({ file, embedded = false }) => {
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);
    const tags = useTagStore((s) => s.tags);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const QUICK_TAG_LIMIT = 8;

    const tagIds = fileTagsCache.get(file.id) ?? [];

    React.useEffect(() => {
        setIsEditMode(false);
    }, [file.id]);

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

    const quickTags = React.useMemo(() => {
        const selectedSet = new Set(tagIds);
        const sortedTags = [...tags].sort((a, b) => {
            const aSelected = selectedSet.has(a.id) ? 0 : 1;
            const bSelected = selectedSet.has(b.id) ? 0 : 1;
            if (aSelected !== bSelected) return aSelected - bSelected;
            if ((a.sortOrder ?? 999) !== (b.sortOrder ?? 999)) {
                return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
            }
            return a.name.localeCompare(b.name, 'ja');
        });

        return sortedTags.slice(0, QUICK_TAG_LIMIT);
    }, [tagIds, tags]);

    const handleQuickTagToggle = async (tagId: string) => {
        if (tagIds.includes(tagId)) {
            await handleRemoveTag(tagId);
            return;
        }
        await handleAddTag(tagId);
    };

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
            {quickTags.length > 0 && (
                <div className="space-y-1">
                    <div className="text-[11px] text-surface-500">
                        クイックタグ
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {quickTags.map((tag) => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                categoryColor={tag.categoryColor}
                                icon={tag.icon}
                                description={tag.description}
                                selected={tagIds.includes(tag.id)}
                                onClick={() => {
                                    void handleQuickTagToggle(tag.id);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
            {!isEditMode && (
                <p className="text-[11px] text-surface-500">
                    編集ボタンを押すとタグの追加・削除ができます
                </p>
            )}
            <TagSelector
                selectedTagIds={tagIds}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                editable={isEditMode}
                allowCreate
            />
        </div>
    );
});

TagSection.displayName = 'TagSection';
