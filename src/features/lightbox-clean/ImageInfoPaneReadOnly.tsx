import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useRatingStore } from '../../stores/useRatingStore';
import { useTagStore } from '../../stores/useTagStore';
import { TagSelector } from '../../components/tags/TagSelector';
import { StarRatingInput } from '../../components/StarRatingInput';
import { useImageInfoReadModel } from './useImageInfoReadModel';

interface ImageInfoPaneProps {
    file: MediaFile;
}

const sectionTitleClassName = 'text-sm font-semibold text-surface-100';

const dividerClassName = 'mt-4 border-t border-surface-700/80 pt-4';

const InfoTable = React.memo<{ rows: Array<{ label: string; value: string }> }>(({ rows }) => (
    <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 text-xs">
        {rows.map((row) => (
            <React.Fragment key={`${row.label}:${row.value}`}>
                <dt className="text-surface-500">{row.label}</dt>
                <dd className="break-all text-surface-200">{row.value}</dd>
            </React.Fragment>
        ))}
    </dl>
));
InfoTable.displayName = 'InfoTable';

export const ImageInfoPane = React.memo<ImageInfoPaneProps>(({ file }) => {
    const updateFileTagCache = useFileStore((state) => state.updateFileTagCache);
    const fileRatings = useRatingStore((state) => state.fileRatings);
    const loadAxes = useRatingStore((state) => state.loadAxes);
    const axes = useRatingStore((state) => state.axes);
    const loadFileRatings = useRatingStore((state) => state.loadFileRatings);
    const setFileRating = useRatingStore((state) => state.setFileRating);
    const removeFileRating = useRatingStore((state) => state.removeFileRating);
    const isRatingLoaded = useRatingStore((state) => state.isLoaded);
    const tags = useTagStore((state) => state.tags);
    const loadTags = useTagStore((state) => state.loadTags);

    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [notes, setNotes] = useState(file.notes || '');
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const notesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { fileInfoRows } = useImageInfoReadModel(file, null);

    useEffect(() => {
        if (tags.length === 0) {
            void loadTags();
        }
    }, [loadTags, tags.length]);

    useEffect(() => {
        if (!isRatingLoaded) {
            void loadAxes();
        }
    }, [isRatingLoaded, loadAxes]);

    useEffect(() => {
        if (!fileRatings[file.id]) {
            void loadFileRatings(file.id);
        }
    }, [file.id, fileRatings, loadFileRatings]);

    useEffect(() => {
        const cachedTagIds = useFileStore.getState().fileTagsCache.get(file.id) ?? file.tags ?? [];
        setSelectedTagIds(cachedTagIds);
        window.electronAPI.getFileTagIds(file.id)
            .then((tagIds) => {
                setSelectedTagIds(tagIds);
                updateFileTagCache(file.id, tagIds);
            })
            .catch((error) => {
                console.error('Failed to load file tags in clean lightbox info pane:', error);
            });
    }, [file.id, file.tags, updateFileTagCache]);

    useEffect(() => {
        setNotes(file.notes || '');
        setNotesSaveStatus('idle');
        if (notesSaveTimerRef.current) {
            clearTimeout(notesSaveTimerRef.current);
            notesSaveTimerRef.current = null;
        }
    }, [file.id, file.notes]);

    useEffect(() => () => {
        if (notesSaveTimerRef.current) {
            clearTimeout(notesSaveTimerRef.current);
        }
    }, []);

    const sortedAxes = useMemo(
        () => [...axes].sort((a, b) => a.sortOrder - b.sortOrder),
        [axes]
    );

    const handleAddTag = useCallback(async (tagId: string) => {
        try {
            await window.electronAPI.addTagToFile(file.id, tagId);
            setSelectedTagIds((prev) => {
                if (prev.includes(tagId)) return prev;
                const next = [...prev, tagId];
                updateFileTagCache(file.id, next);
                return next;
            });
        } catch (error) {
            console.error('Failed to add tag in clean lightbox:', error);
        }
    }, [file.id, updateFileTagCache]);

    const handleRemoveTag = useCallback(async (tagId: string) => {
        try {
            await window.electronAPI.removeTagFromFile(file.id, tagId);
            setSelectedTagIds((prev) => {
                const next = prev.filter((id) => id !== tagId);
                updateFileTagCache(file.id, next);
                return next;
            });
        } catch (error) {
            console.error('Failed to remove tag in clean lightbox:', error);
        }
    }, [file.id, updateFileTagCache]);

    const handleRatingChange = useCallback(async (axisId: string, value: number | null) => {
        try {
            if (value === null) {
                await removeFileRating(file.id, axisId);
            } else {
                await setFileRating(file.id, axisId, value);
            }
        } catch (error) {
            console.error('Failed to set rating in clean lightbox:', error);
        }
    }, [file.id, removeFileRating, setFileRating]);

    const saveNotes = useCallback(async (value: string) => {
        setNotesSaveStatus('saving');
        try {
            await window.electronAPI.updateFileNotes(file.id, value);
            setNotesSaveStatus('saved');
            setTimeout(() => setNotesSaveStatus('idle'), 1500);
        } catch (error) {
            console.error('Failed to save notes in clean lightbox:', error);
            setNotesSaveStatus('idle');
        }
    }, [file.id]);

    const handleNotesChange = useCallback((value: string) => {
        setNotes(value);
        if (notesSaveTimerRef.current) {
            clearTimeout(notesSaveTimerRef.current);
        }
        notesSaveTimerRef.current = setTimeout(() => {
            void saveNotes(value);
        }, 800);
    }, [saveNotes]);

    const handleNotesBlur = useCallback(() => {
        if (notesSaveTimerRef.current) {
            clearTimeout(notesSaveTimerRef.current);
            notesSaveTimerRef.current = null;
        }
        void saveNotes(notes);
    }, [notes, saveNotes]);

    return (
        <div className="h-full overflow-y-auto px-8 py-10 text-surface-100">
            <section>
                <h2 className="text-3xl font-semibold leading-snug break-all">{file.name}</h2>
            </section>

            <section className={dividerClassName}>
                <h3 className={sectionTitleClassName}>タグ情報</h3>
                <div className="mt-3">
                    <TagSelector
                        selectedTagIds={selectedTagIds}
                        onAdd={handleAddTag}
                        onRemove={handleRemoveTag}
                    />
                </div>
            </section>

            <section className={dividerClassName}>
                <h3 className={sectionTitleClassName}>評価</h3>
                <div className="mt-3 space-y-3">
                    {sortedAxes.length === 0 ? (
                        <p className="text-xs text-surface-500">評価軸が見つかりません</p>
                    ) : (
                        sortedAxes.map((axis) => (
                            <div key={axis.id} className="space-y-1">
                                <p className="text-xs text-surface-400">{axis.name}</p>
                                <StarRatingInput
                                    value={fileRatings[file.id]?.[axis.id]}
                                    minValue={axis.minValue}
                                    maxValue={axis.maxValue}
                                    step={axis.step}
                                    onChange={(value) => void handleRatingChange(axis.id, value)}
                                    size={16}
                                />
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className={dividerClassName}>
                <div className="flex items-center justify-between gap-3">
                    <h3 className={sectionTitleClassName}>メモ</h3>
                    <span className="text-[11px] text-surface-500">
                        {notesSaveStatus === 'saving' ? '保存中…' : notesSaveStatus === 'saved' ? '保存済み' : ''}
                    </span>
                </div>
                <div className="mt-3">
                    <textarea
                        value={notes}
                        onChange={(event) => handleNotesChange(event.target.value)}
                        onBlur={handleNotesBlur}
                        rows={6}
                        placeholder="メモを入力..."
                        className="w-full resize-y rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                    />
                </div>
            </section>

            <section className={dividerClassName}>
                <h3 className={sectionTitleClassName}>ファイル情報</h3>
                <div className="mt-3">
                    <InfoTable rows={fileInfoRows} />
                </div>
            </section>
        </div>
    );
});

ImageInfoPane.displayName = 'ImageInfoPane';
