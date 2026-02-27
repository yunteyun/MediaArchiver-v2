import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Check, FileImage, FileText, FolderTree, Star, Tags, Video, Music4, FileArchive, X } from 'lucide-react';
import type { MediaFile, MediaFolder } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useRatingStore } from '../../stores/useRatingStore';
import { useTagStore } from '../../stores/useTagStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { TagSelector } from '../../components/tags/TagSelector';
import { StarRatingInput } from '../../components/StarRatingInput';
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
            <React.Fragment key={`${row.label}:${row.value}`}>
                <dt className="text-surface-500">{row.label}</dt>
                <dd className="text-surface-200 break-all">{row.value}</dd>
            </React.Fragment>
        ))}
    </dl>
));
InfoTable.displayName = 'InfoTable';

export const ImageInfoPane = React.memo<ImageInfoPaneProps>(({ file }) => {
    const refreshFile = useFileStore((s) => s.refreshFile);
    const updateFileTagCache = useFileStore((s) => s.updateFileTagCache);
    const fileRatings = useRatingStore((s) => s.fileRatings);
    const loadAxes = useRatingStore((s) => s.loadAxes);
    const axes = useRatingStore((s) => s.axes);
    const loadFileRatings = useRatingStore((s) => s.loadFileRatings);
    const setFileRating = useRatingStore((s) => s.setFileRating);
    const removeFileRating = useRatingStore((s) => s.removeFileRating);
    const isRatingLoaded = useRatingStore((s) => s.isLoaded);
    const tags = useTagStore((s) => s.tags);
    const loadTags = useTagStore((s) => s.loadTags);
    const activeProfileId = useSettingsStore((s) => s.activeProfileId);
    const showToast = useUIStore((s) => s.showToast);
    const openLightbox = useUIStore((s) => s.openLightbox);

    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [notes, setNotes] = useState(file.notes || '');
    const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [folderPathById, setFolderPathById] = useState<Map<string, string>>(new Map());
    const [isRenaming, setIsRenaming] = useState(false);
    const [draftName, setDraftName] = useState(file.name);
    const [renameSaving, setRenameSaving] = useState(false);
    const notesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const renameInputRef = useRef<HTMLInputElement | null>(null);

    const rootFolderPath = file.rootFolderId ? (folderPathById.get(file.rootFolderId) ?? null) : null;
    const { fileInfoRows, pathRows, statsRows } = useImageInfoReadModel(file, rootFolderPath);

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
        let disposed = false;
        window.electronAPI.getFolders()
            .then((folders) => {
                if (disposed) return;
                const next = new Map<string, string>();
                (folders as MediaFolder[]).forEach((folder) => {
                    next.set(folder.id, folder.path);
                });
                setFolderPathById(next);
            })
            .catch((error) => {
                console.error('Failed to load folders in clean lightbox info pane:', error);
                if (!disposed) {
                    setFolderPathById(new Map());
                }
            });
        return () => {
            disposed = true;
        };
    }, [activeProfileId]);

    useEffect(() => {
        setDraftName(file.name);
        setIsRenaming(false);
    }, [file.id, file.name]);

    useEffect(() => {
        if (!isRenaming || !renameInputRef.current) return;
        renameInputRef.current.focus();
        renameInputRef.current.select();
    }, [isRenaming]);

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

    const mediaBadge = useMemo(() => {
        if (file.type === 'video') return { label: '動画', icon: <Video size={16} /> };
        if (file.type === 'audio') return { label: '音声', icon: <Music4 size={16} /> };
        if (file.type === 'archive') return { label: '書庫', icon: <FileArchive size={16} /> };
        return { label: '画像', icon: <FileImage size={16} /> };
    }, [file.type]);

    const handleSubmitRename = useCallback(async () => {
        const nextName = draftName.trim();
        if (!nextName) {
            showToast('ファイル名を入力してください', 'error');
            return;
        }
        if (nextName === file.name) {
            setIsRenaming(false);
            return;
        }

        setRenameSaving(true);
        try {
            const result = await window.electronAPI.renameFile(file.id, nextName);
            if (!result.success) {
                showToast(result.error || 'ファイル名の変更に失敗しました', 'error');
                return;
            }

            await refreshFile(file.id);
            const updatedFile = await window.electronAPI.getFileById(file.id);
            if (updatedFile) {
                openLightbox(updatedFile);
            }

            showToast('ファイル名を変更しました', 'success');
            setIsRenaming(false);
        } catch (error) {
            console.error('Failed to rename file in clean lightbox:', error);
            showToast('ファイル名の変更に失敗しました', 'error');
        } finally {
            setRenameSaving(false);
        }
    }, [draftName, file.id, file.name, openLightbox, refreshFile, showToast]);

    const handleCancelRename = useCallback(() => {
        setDraftName(file.name);
        setIsRenaming(false);
    }, [file.name]);

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
            showToast('タグの追加に失敗しました', 'error');
        }
    }, [file.id, showToast, updateFileTagCache]);

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
            showToast('タグの削除に失敗しました', 'error');
        }
    }, [file.id, showToast, updateFileTagCache]);

    const handleRatingChange = useCallback(async (axisId: string, value: number | null) => {
        try {
            if (value === null) {
                await removeFileRating(file.id, axisId);
            } else {
                await setFileRating(file.id, axisId, value);
            }
        } catch (error) {
            console.error('Failed to set rating in clean lightbox:', error);
            showToast('評価の更新に失敗しました', 'error');
        }
    }, [file.id, removeFileRating, setFileRating, showToast]);

    const saveNotes = useCallback(async (value: string) => {
        setNotesSaveStatus('saving');
        try {
            await window.electronAPI.updateFileNotes(file.id, value);
            setNotesSaveStatus('saved');
            setTimeout(() => setNotesSaveStatus('idle'), 1500);
        } catch (error) {
            console.error('Failed to save notes in clean lightbox:', error);
            setNotesSaveStatus('idle');
            showToast('メモの保存に失敗しました', 'error');
        }
    }, [file.id, showToast]);

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
        <div className="h-full overflow-y-auto p-4 space-y-4 bg-surface-950">
            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                {!isRenaming ? (
                    <button
                        type="button"
                        onClick={() => setIsRenaming(true)}
                        className="w-full text-left"
                        title="クリックでファイル名を変更"
                    >
                        <p className="text-sm text-surface-500">ファイル名</p>
                        <p className="mt-1 text-lg font-semibold text-surface-100 break-all leading-snug">{file.name}</p>
                        <p className="mt-1 text-[11px] text-surface-500">クリックで名前変更</p>
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-surface-500">ファイル名を変更</p>
                        <input
                            ref={renameInputRef}
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleSubmitRename();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelRename();
                                }
                            }}
                            className="w-full rounded border border-surface-700 bg-surface-950 px-2 py-1.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancelRename}
                                className="inline-flex items-center gap-1 rounded border border-surface-600 bg-surface-800 px-2 py-1 text-xs text-surface-200 hover:bg-surface-700"
                            >
                                <X size={12} />
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSubmitRename()}
                                disabled={renameSaving}
                                className="inline-flex items-center gap-1 rounded border border-primary-600 bg-primary-700 px-2 py-1 text-xs text-white disabled:opacity-60"
                            >
                                <Check size={12} />
                                {renameSaving ? '変更中...' : '保存'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <SectionTitle icon={mediaBadge.icon} title="ファイル情報" />
                    <span className="inline-flex items-center rounded-md border border-surface-600 bg-surface-800 px-2 py-0.5 text-[11px] text-surface-200">
                        {mediaBadge.label}
                    </span>
                </div>
                <div className="mt-3">
                    <InfoTable rows={fileInfoRows} />
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<FolderTree size={16} />} title="パス" />
                <div className="mt-3">
                    <InfoTable rows={pathRows} />
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<Star size={16} />} title="評価" />
                <div className="mt-3 space-y-2">
                    {sortedAxes.length === 0 && (
                        <p className="text-xs text-surface-500">評価軸が見つかりません</p>
                    )}
                    {sortedAxes.map((axis) => {
                        const current = fileRatings[file.id]?.[axis.id];
                        return (
                            <div key={axis.id} className="space-y-0.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-surface-400">{axis.name}</span>
                                    {current !== undefined && (
                                        <button
                                            type="button"
                                            onClick={() => void handleRatingChange(axis.id, null)}
                                            className="text-xs text-surface-600 hover:text-red-400 transition-colors"
                                            title="評価をリセット"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <StarRatingInput
                                    value={current}
                                    minValue={axis.minValue}
                                    maxValue={axis.maxValue}
                                    step={axis.step}
                                    onChange={(value) => void handleRatingChange(axis.id, value)}
                                    size={16}
                                />
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <SectionTitle icon={<Tags size={16} />} title="タグ" />
                <div className="mt-3">
                    <TagSelector
                        selectedTagIds={selectedTagIds}
                        onAdd={handleAddTag}
                        onRemove={handleRemoveTag}
                    />
                </div>
            </section>

            <section className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <SectionTitle icon={<FileText size={16} />} title="メモ" />
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
