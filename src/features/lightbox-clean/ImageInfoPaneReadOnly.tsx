import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileImage, Tags, BarChart3, Star, Video, Music4, FileArchive, Plus, X } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useRatingStore } from '../../stores/useRatingStore';
import { useTagStore } from '../../stores/useTagStore';
import { useImageInfoReadModel } from './useImageInfoReadModel';

interface ImageInfoPaneProps {
    file: MediaFile;
}

const SectionTitle = React.memo<{ icon: React.ReactNode; title: string }>(({ icon, title }) => (
    <div className="flex items-center gap-2 text-sm font-semibold text-surface-200">
        <span className="text-surface-400">{icon}</span>
        <span>{title}</span>
    </div>
));
SectionTitle.displayName = 'SectionTitle';

const InfoTable = React.memo<{ rows: Array<{ label: string; value: string }> }>(({ rows }) => (
    <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-xs">
        {rows.map((row) => (
            <React.Fragment key={row.label}>
                <dt className="text-surface-500">{row.label}</dt>
                <dd className="text-surface-200 break-all">{row.value}</dd>
            </React.Fragment>
        ))}
    </dl>
));
InfoTable.displayName = 'InfoTable';

export const ImageInfoPane = React.memo<ImageInfoPaneProps>(({ file }) => {
    const { fileInfoRows, statsRows } = useImageInfoReadModel(file);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);

    const tags = useTagStore((s) => s.tags);
    const loadTags = useTagStore((s) => s.loadTags);

    const axes = useRatingStore((s) => s.axes);
    const fileRatings = useRatingStore((s) => s.fileRatings);
    const loadAxes = useRatingStore((s) => s.loadAxes);
    const loadFileRatings = useRatingStore((s) => s.loadFileRatings);
    const setFileRating = useRatingStore((s) => s.setFileRating);

    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [tagQuery, setTagQuery] = useState('');

    const [notes, setNotes] = useState(file.notes || '');
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (tags.length === 0) {
            void loadTags();
        }
    }, [tags.length, loadTags]);

    useEffect(() => {
        if (axes.length === 0) {
            void loadAxes();
        }
    }, [axes.length, loadAxes]);

    useEffect(() => {
        const cached = useFileStore.getState().fileTagsCache.get(file.id) ?? file.tags ?? [];
        setSelectedTagIds(cached);
        setTagQuery('');
        window.electronAPI.getFileTagIds(file.id)
            .then((tagIds) => {
                setSelectedTagIds(tagIds);
                updateFileTagCache(file.id, tagIds);
            })
            .catch((error) => {
                console.error('Failed to load file tags in clean lightbox:', error);
            });
    }, [file.id, file.tags, updateFileTagCache]);

    useEffect(() => {
        setNotes(file.notes || '');
        setNotesSaveStatus('idle');
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    }, [file.id, file.notes]);

    useEffect(() => {
        if (!fileRatings[file.id]) {
            void loadFileRatings(file.id);
        }
    }, [file.id, fileRatings, loadFileRatings]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

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
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            void saveNotes(value);
        }, 800);
    }, [saveNotes]);

    const handleNotesBlur = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        void saveNotes(notes);
    }, [notes, saveNotes]);

    const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
    const selectedTagItems = useMemo(
        () => selectedTagIds.map((id) => tagById.get(id)).filter((tag): tag is NonNullable<typeof tag> => !!tag),
        [selectedTagIds, tagById]
    );
    const filteredTagCandidates = useMemo(() => {
        const normalized = tagQuery.trim().toLowerCase();
        return tags.filter((tag) => {
            if (selectedTagIds.includes(tag.id)) return false;
            if (!normalized) return true;
            return tag.name.toLowerCase().includes(normalized);
        }).slice(0, 20);
    }, [tagQuery, tags, selectedTagIds]);

    const ratings = fileRatings[file.id] ?? {};
    const sortedAxes = useMemo(() => [...axes].sort((a, b) => a.sortOrder - b.sortOrder), [axes]);

    const handleAddTag = useCallback(async (tagId: string) => {
        try {
            await window.electronAPI.addTagToFile(file.id, tagId);
            setSelectedTagIds((prev) => {
                if (prev.includes(tagId)) return prev;
                const next = [...prev, tagId];
                updateFileTagCache(file.id, next);
                return next;
            });
            setTagQuery('');
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

    const handleRatingChange = useCallback(async (axisId: string, value: number) => {
        try {
            await setFileRating(file.id, axisId, value);
        } catch (error) {
            console.error('Failed to set rating in clean lightbox:', error);
        }
    }, [file.id, setFileRating]);

    const mediaBadge = file.type === 'video'
        ? { label: '動画', icon: <Video size={16} /> }
        : file.type === 'audio'
            ? { label: '音声', icon: <Music4 size={16} /> }
            : file.type === 'archive'
                ? { label: '書庫', icon: <FileArchive size={16} /> }
                : { label: '画像', icon: <FileImage size={16} /> };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4 bg-surface-950">
            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <SectionTitle icon={mediaBadge.icon} title="基本情報" />
                    <span className="inline-flex items-center rounded-md border border-surface-600 bg-surface-800 px-2 py-0.5 text-[11px] text-surface-200">
                        {mediaBadge.label}
                    </span>
                </div>
                <div className="mt-3">
                    <InfoTable rows={fileInfoRows} />
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<Star size={16} />} title="評価" />
                <div className="mt-3 space-y-1.5">
                    {sortedAxes.length === 0 && (
                        <p className="text-xs text-surface-500">評価軸が見つかりません</p>
                    )}
                    {sortedAxes.map((axis) => {
                        const current = ratings[axis.id] ?? axis.minValue;
                        return (
                            <div key={axis.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-surface-400">{axis.name}</span>
                                    <span className="font-semibold text-surface-100">{current}</span>
                                </div>
                                <input
                                    type="range"
                                    min={axis.minValue}
                                    max={axis.maxValue}
                                    step={axis.step}
                                    value={current}
                                    onChange={(e) => void handleRatingChange(axis.id, Number(e.target.value))}
                                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                />
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<Tags size={16} />} title="タグ" />
                <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {selectedTagItems.length === 0 && (
                            <p className="text-xs text-surface-500">タグなし</p>
                        )}
                        {selectedTagItems.map((tag) => (
                            <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 rounded-md border border-surface-600 bg-surface-800 px-2 py-1 text-[11px] text-surface-200"
                            >
                                <span>{tag.name}</span>
                                <button
                                    type="button"
                                    onClick={() => void handleRemoveTag(tag.id)}
                                    className="text-surface-400 hover:text-surface-100"
                                    title="タグを外す"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>

                    <input
                        type="text"
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        placeholder="タグ名で絞り込み"
                        className="w-full rounded border border-surface-700 bg-surface-950 px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
                    />

                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {filteredTagCandidates.length === 0 && (
                            <p className="text-[11px] text-surface-500">追加可能なタグがありません</p>
                        )}
                        {filteredTagCandidates.map((tag) => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => void handleAddTag(tag.id)}
                                className="w-full text-left rounded border border-surface-700 bg-surface-950 px-2 py-1.5 text-xs text-surface-200 hover:bg-surface-800 inline-flex items-center justify-between"
                            >
                                <span className="truncate">{tag.name}</span>
                                <Plus size={12} className="text-surface-400" />
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <SectionTitle icon={<FileImage size={16} />} title="メモ" />
                    <span className="text-[11px] text-surface-500">
                        {notesSaveStatus === 'saving' ? '保存中…' : notesSaveStatus === 'saved' ? '保存済み' : ''}
                    </span>
                </div>
                <div className="mt-3">
                    <textarea
                        value={notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        onBlur={handleNotesBlur}
                        rows={5}
                        placeholder="メモを入力..."
                        className="w-full resize-y rounded border border-surface-700 bg-surface-950 px-2 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
                    />
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<BarChart3 size={16} />} title="統計" />
                <div className="mt-3">
                    <InfoTable rows={statsRows} />
                </div>
            </section>
        </div>
    );
});

ImageInfoPane.displayName = 'ImageInfoPane';
