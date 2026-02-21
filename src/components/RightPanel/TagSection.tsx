import React from 'react';
import { useTagStore } from '../../stores/useTagStore';
import { useFileStore } from '../../stores/useFileStore';
import { useToastStore } from '../../stores/useToastStore';
import { TagSelector } from '../tags/TagSelector';
import type { MediaFile } from '../../types/file';

interface TagSectionProps {
    file: MediaFile;
}

export const TagSection = React.memo<TagSectionProps>(({ file }) => {
    const allTags = useTagStore((s) => s.tags);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);

    const tagIds = fileTagsCache.get(file.id) ?? [];

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

    return (
        <div className="px-4 py-3 space-y-2">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">タグ</h3>
            <TagSelector
                selectedTagIds={tagIds}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
            />
        </div>
    );
});

TagSection.displayName = 'TagSection';
