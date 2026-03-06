import React from 'react';
import { Check, Pencil } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { useToastStore } from '../../stores/useToastStore';
import { TagSelector } from '../tags/TagSelector';
import type { MediaFile } from '../../types/file';

interface TagSectionProps {
    file: MediaFile;
    embedded?: boolean;
}

export const TagSection = React.memo<TagSectionProps>(({ file, embedded = false }) => {
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);
    const [isEditMode, setIsEditMode] = React.useState(false);

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
            />
        </div>
    );
});

TagSection.displayName = 'TagSection';
