import React from 'react';
import { TagSection } from './sections/TagSection';
import { MemoSection } from './sections/MemoSection';
import { MetaSection } from './sections/MetaSection';
import { StatsSection } from './sections/StatsSection';
import { MediaFile } from '../../types/file';

interface InfoPanelProps {
    file: MediaFile;
    // Tag props
    fileTagIds: string[];
    onAddTag: (tagId: string) => Promise<void>;
    onRemoveTag: (tagId: string) => Promise<void>;
    // Memo props
    notes: string;
    notesSaveStatus: 'idle' | 'saving' | 'saved';
    onNotesChange: (value: string) => void;
    onNotesBlur: () => void;
}

export const InfoPanel = React.memo<InfoPanelProps>(({
    file,
    fileTagIds,
    onAddTag,
    onRemoveTag,
    notes,
    notesSaveStatus,
    onNotesChange,
    onNotesBlur
}) => {
    // 常に固定幅の2カラムレイアウト
    return (
        <div className="w-96 bg-black/80 backdrop-blur-sm p-6 overflow-y-auto">
            <div className="space-y-4">
                <TagSection
                    fileId={file.id}
                    selectedTagIds={fileTagIds}
                    onAdd={onAddTag}
                    onRemove={onRemoveTag}
                />
                <div className="border-t border-white/10 pt-4">
                    <MemoSection
                        notes={notes}
                        saveStatus={notesSaveStatus}
                        onChange={onNotesChange}
                        onBlur={onNotesBlur}
                    />
                </div>
                <div className="border-t border-white/10 pt-4">
                    <MetaSection file={file} />
                </div>
                <div className="border-t border-white/10 pt-4">
                    <StatsSection file={file} />
                </div>
            </div>
        </div>
    );
});

InfoPanel.displayName = 'InfoPanel';
