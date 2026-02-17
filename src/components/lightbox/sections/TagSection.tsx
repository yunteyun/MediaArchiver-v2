import React from 'react';
import { TagSelector } from '../../tags';

interface TagSectionProps {
    fileId: string;
    selectedTagIds: string[];
    onAdd: (tagId: string) => Promise<void>;
    onRemove: (tagId: string) => Promise<void>;
}

export const TagSection = React.memo<TagSectionProps>(({
    fileId,
    selectedTagIds,
    onAdd,
    onRemove
}) => {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-surface-300">タグ</h3>
            <TagSelector
                selectedTagIds={selectedTagIds}
                onAdd={onAdd}
                onRemove={onRemove}
            />
        </div>
    );
});

TagSection.displayName = 'TagSection';
