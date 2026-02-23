import React from 'react';
import { TagSection } from './sections/TagSection';
import { MemoSection } from './sections/MemoSection';
import { MetaSection } from './sections/MetaSection';
import { StatsSection } from './sections/StatsSection';
import { RatingSection } from './sections/RatingSection';
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
        <div className="w-80 xl:w-88 max-h-[74vh] self-center rounded-r-xl bg-black/70 backdrop-blur-md border-r border-white/10 p-5 overflow-y-auto shadow-2xl">
            <div className="space-y-4">
                <div>
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">ファイル名</p>
                    <h2 className="text-lg font-semibold leading-snug text-white break-words" title={file.name}>
                        {file.name}
                    </h2>
                </div>
                {/* Phase 26-C2: 評価セクション */}
                <div className="border-t border-white/10 pt-4">
                    <RatingSection fileId={file.id} />
                </div>
                <div className="border-t border-white/10 pt-4">
                    <TagSection
                        fileId={file.id}
                        selectedTagIds={fileTagIds}
                        onAdd={onAddTag}
                        onRemove={onRemoveTag}
                    />
                </div>
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
