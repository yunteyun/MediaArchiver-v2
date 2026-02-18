import React from 'react';
import { useTagStore } from '../../stores/useTagStore';
import { useFileStore } from '../../stores/useFileStore';
import { useToastStore } from '../../stores/useToastStore';
import type { MediaFile } from '../../types/file';

interface TagSectionProps {
    file: MediaFile;
}

export const TagSection = React.memo<TagSectionProps>(({ file }) => {
    const allTags = useTagStore((s) => s.tags);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);

    const tagIds = fileTagsCache.get(file.id) ?? [];
    const fileTags = allTags.filter((t) => tagIds.includes(t.id));

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
            {fileTags.length === 0 ? (
                <p className="text-sm text-surface-500">タグなし</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {fileTags.map((tag) => (
                        <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                                backgroundColor: tag.color ? `${tag.color}33` : '#6366f133',
                                color: tag.color ?? '#6366f1',
                                border: `1px solid ${tag.color ?? '#6366f1'}66`,
                            }}
                        >
                            {tag.name}
                            <button
                                onClick={() => handleRemoveTag(tag.id)}
                                className="hover:opacity-70 transition-opacity ml-0.5"
                                title="タグを削除"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {/* タグ追加: 未付与タグのドロップダウン */}
            <TagAddDropdown
                fileId={file.id}
                currentTagIds={tagIds}
                onAdd={handleAddTag}
            />
        </div>
    );
});

TagSection.displayName = 'TagSection';

// タグ追加用の小さなドロップダウン
const TagAddDropdown: React.FC<{
    fileId: string;
    currentTagIds: string[];
    onAdd: (tagId: string) => void;
}> = ({ currentTagIds, onAdd }) => {
    const allTags = useTagStore((s) => s.tags);
    const availableTags = allTags.filter((t) => !currentTagIds.includes(t.id));

    if (availableTags.length === 0) return null;

    return (
        <select
            className="w-full text-xs bg-surface-800 border border-surface-600 rounded px-2 py-1 text-surface-300 cursor-pointer hover:border-surface-500 transition-colors"
            value=""
            onChange={(e) => {
                if (e.target.value) onAdd(e.target.value);
            }}
        >
            <option value="">+ タグを追加...</option>
            {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                    {tag.name}
                </option>
            ))}
        </select>
    );
};
