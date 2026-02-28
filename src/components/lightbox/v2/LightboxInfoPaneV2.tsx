import React from 'react';
import { Image as ImageIcon, File } from 'lucide-react';
import type { MediaFile } from '../../../types/file';
import { RatingSection } from '../sections/RatingSection';
import { TagSection } from '../sections/TagSection';
import { MemoSection } from '../sections/MemoSection';
import { MetaSection } from '../sections/MetaSection';
import { StatsSection } from '../sections/StatsSection';

interface LightboxInfoPaneV2Props {
    file: MediaFile;
    fileTagIds: string[];
    onAddTag: (tagId: string) => Promise<void>;
    onRemoveTag: (tagId: string) => Promise<void>;
    notes: string;
    notesSaveStatus: 'idle' | 'saving' | 'saved';
    onNotesChange: (value: string) => void;
    onNotesBlur: () => void;
}

function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '-';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

const SectionCard = React.memo<{ children: React.ReactNode }>(({ children }) => (
    <div className="rounded-lg border border-white/12 bg-surface-900 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        {children}
    </div>
));
SectionCard.displayName = 'SectionCard';

const GroupLabel = React.memo<{ children: React.ReactNode }>(({ children }) => (
    <div className="px-1 text-[11px] font-semibold tracking-[0.08em] uppercase text-white/45">
        {children}
    </div>
));
GroupLabel.displayName = 'GroupLabel';

export const LightboxInfoPaneV2 = React.memo<LightboxInfoPaneV2Props>(({
    file,
    fileTagIds,
    onAddTag,
    onRemoveTag,
    notes,
    notesSaveStatus,
    onNotesChange,
    onNotesBlur,
}) => {
    const typeLabel = file.type === 'image'
        ? '画像'
        : file.type === 'video'
            ? '動画'
            : file.type === 'audio'
                ? '音声'
                : file.type === 'archive'
                    ? '書庫'
                    : 'ファイル';

    return (
        <div className="w-full h-full overflow-y-auto bg-gradient-to-b from-surface-900 to-surface-950">
            <div className="sticky top-0 z-10 px-4 pt-3 pb-2 bg-gradient-to-b from-surface-900 to-surface-950 pointer-events-none" />

            <div className="relative -mt-2 p-4 space-y-3">
                <div className="rounded-lg border border-white/16 bg-surface-900 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="flex items-start gap-2">
                        <div className="mt-0.5 text-white/70">
                            {file.type === 'image' ? <ImageIcon size={16} /> : <File size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/14 bg-surface-950 text-white/70">
                                    {typeLabel}
                                </span>
                                <span className="text-[11px] text-white/55">{formatFileSize(file.size)}</span>
                            </div>
                            <h2 className="text-[15px] leading-snug font-semibold text-white break-words" title={file.name}>
                                {file.name}
                            </h2>
                        </div>
                    </div>
                </div>

                <GroupLabel>編集</GroupLabel>
                <SectionCard>
                    <RatingSection fileId={file.id} />
                </SectionCard>

                <SectionCard>
                    <TagSection
                        fileId={file.id}
                        selectedTagIds={fileTagIds}
                        onAdd={onAddTag}
                        onRemove={onRemoveTag}
                    />
                </SectionCard>

                <SectionCard>
                    <MemoSection
                        notes={notes}
                        saveStatus={notesSaveStatus}
                        onChange={onNotesChange}
                        onBlur={onNotesBlur}
                    />
                </SectionCard>

                <GroupLabel>情報</GroupLabel>
                <SectionCard>
                    <div className="[&_h3]:text-white/85 [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:leading-6 [&_span]:text-white/55">
                        <MetaSection file={file} />
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="[&_h3]:text-white/85 [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:leading-6 [&_span]:text-white/55">
                        <StatsSection file={file} />
                    </div>
                </SectionCard>
            </div>
        </div>
    );
});

LightboxInfoPaneV2.displayName = 'LightboxInfoPaneV2';
