import React from 'react';
import type { MediaFile, PlaybackBookmark } from '../../../types/file';
import { useFileStore } from '../../../stores/useFileStore';
import { useUIStore } from '../../../stores/useUIStore';
import { formatPlaybackTime, formatPlaybackUpdatedAt } from '../../../utils/playbackTime';

const BOOKMARK_DUPLICATE_THRESHOLD_SECONDS = 2;
const BOOKMARK_SORT_STORAGE_KEY = 'playback-bookmarks-sort-mode';

type BookmarkSortMode = 'timeline' | 'recent';

interface PlaybackSectionProps {
    file: MediaFile;
}

export const PlaybackSection = React.memo<PlaybackSectionProps>(({ file }) => {
    const refreshFile = useFileStore((state) => state.refreshFile);
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const openLightbox = useUIStore((state) => state.openLightbox);
    const lightboxFile = useUIStore((state) => state.lightboxFile);
    const lightboxCurrentTime = useUIStore((state) => state.lightboxCurrentTime);
    const showToast = useUIStore((state) => state.showToast);
    const [bookmarks, setBookmarks] = React.useState<PlaybackBookmark[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isAdding, setIsAdding] = React.useState(false);
    const [isClearing, setIsClearing] = React.useState(false);
    const [deletingBookmarkId, setDeletingBookmarkId] = React.useState<string | null>(null);
    const [editingBookmarkId, setEditingBookmarkId] = React.useState<string | null>(null);
    const [editingNote, setEditingNote] = React.useState('');
    const [savingBookmarkId, setSavingBookmarkId] = React.useState<string | null>(null);
    const [settingRepresentativeBookmarkId, setSettingRepresentativeBookmarkId] = React.useState<string | null>(null);
    const [highlightedBookmarkId, setHighlightedBookmarkId] = React.useState<string | null>(null);
    const [sortMode, setSortMode] = React.useState<BookmarkSortMode>(() => {
        try {
            const stored = window.localStorage.getItem(BOOKMARK_SORT_STORAGE_KEY);
            return stored === 'recent' ? 'recent' : 'timeline';
        } catch {
            return 'timeline';
        }
    });

    const activeCurrentTime = lightboxFile?.id === file.id && typeof lightboxCurrentTime === 'number' && Number.isFinite(lightboxCurrentTime)
        ? Math.max(0, lightboxCurrentTime)
        : null;
    const savedPosition = typeof file.playbackPositionSeconds === 'number' && Number.isFinite(file.playbackPositionSeconds)
        ? file.playbackPositionSeconds
        : null;
    const hasSavedPosition = savedPosition !== null && savedPosition > 0;
    const updatedAt = formatPlaybackUpdatedAt(file.playbackPositionUpdatedAt);
    const sortBookmarks = React.useCallback((items: PlaybackBookmark[]) => {
        const next = [...items];
        if (sortMode === 'recent') {
            return next.sort((a, b) => b.createdAt - a.createdAt || a.timeSeconds - b.timeSeconds);
        }

        return next.sort((a, b) => a.timeSeconds - b.timeSeconds || a.createdAt - b.createdAt);
    }, [sortMode]);
    const sortedBookmarks = React.useMemo(() => sortBookmarks(bookmarks), [bookmarks, sortBookmarks]);

    React.useEffect(() => {
        let disposed = false;

        if (file.type !== 'video') {
            setBookmarks([]);
            setIsLoading(false);
            return () => {
                disposed = true;
            };
        }

        const loadBookmarks = async () => {
            setIsLoading(true);
            try {
                const result = await window.electronAPI.getPlaybackBookmarks(file.id);
                if (!disposed) {
                    setBookmarks(result);
                }
            } catch (error) {
                console.error('Failed to load playback bookmarks in LightBox PlaybackSection:', error);
                if (!disposed) {
                    setBookmarks([]);
                }
            } finally {
                if (!disposed) {
                    setIsLoading(false);
                }
            }
        };

        void loadBookmarks();

        return () => {
            disposed = true;
        };
    }, [file.id, file.type]);

    React.useEffect(() => {
        setEditingBookmarkId(null);
        setEditingNote('');
        setSavingBookmarkId(null);
        setDeletingBookmarkId(null);
        setSettingRepresentativeBookmarkId(null);
        setHighlightedBookmarkId(null);
        setIsClearing(false);
    }, [file.id]);

    React.useEffect(() => {
        try {
            window.localStorage.setItem(BOOKMARK_SORT_STORAGE_KEY, sortMode);
        } catch {
            // Ignore storage failures and keep the current in-memory setting.
        }
    }, [sortMode]);

    React.useEffect(() => {
        if (!highlightedBookmarkId) return;

        const timeoutId = window.setTimeout(() => {
            setHighlightedBookmarkId((current) => (
                current === highlightedBookmarkId ? null : current
            ));
        }, 1600);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [highlightedBookmarkId]);

    if (file.type !== 'video') {
        return null;
    }

    const handleResume = () => {
        if (!hasSavedPosition || savedPosition === null) return;
        openLightbox(file, 'default', savedPosition);
    };

    const handleClear = async () => {
        if (isClearing || !hasSavedPosition) return;
        setIsClearing(true);
        try {
            const result = await window.electronAPI.updateFilePlaybackPosition(file.id, null);
            updatePlaybackPosition(
                file.id,
                result.playbackPositionSeconds ?? null,
                result.playbackPositionUpdatedAt ?? null,
            );
        } catch (error) {
            console.error('Failed to clear playback position in LightBox PlaybackSection:', error);
        } finally {
            setIsClearing(false);
        }
    };

    const handleAddBookmark = async () => {
        if (activeCurrentTime === null || isAdding) return;

        const nearbyBookmark = bookmarks.find((bookmark) => (
            Math.abs(bookmark.timeSeconds - activeCurrentTime) < BOOKMARK_DUPLICATE_THRESHOLD_SECONDS
        ));
        if (nearbyBookmark) {
            setHighlightedBookmarkId(nearbyBookmark.id);
            if (Math.abs(nearbyBookmark.timeSeconds - activeCurrentTime) >= 0.2) {
                showToast('近い見どころがあるため、そちらを使います', 'info', 1800);
            }
            return;
        }

        setIsAdding(true);
        try {
            const result = await window.electronAPI.createPlaybackBookmark(file.id, activeCurrentTime);
            if (!result.success || !result.bookmark) return;
            setBookmarks((current) => {
                const next = [...current];
                const existingIndex = next.findIndex((bookmark) => bookmark.id === result.bookmark!.id);
                if (existingIndex >= 0) {
                    next[existingIndex] = result.bookmark!;
                } else {
                    next.push(result.bookmark!);
                }
                return next;
            });
            setHighlightedBookmarkId(result.bookmark.id);
        } catch (error) {
            console.error('Failed to create playback bookmark in LightBox PlaybackSection:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteBookmark = async (bookmarkId: string) => {
        if (!bookmarkId || deletingBookmarkId === bookmarkId) return;
        setDeletingBookmarkId(bookmarkId);
        try {
            const result = await window.electronAPI.deletePlaybackBookmark(bookmarkId);
            if (!result.success) return;
            setBookmarks((current) => current.filter((bookmark) => bookmark.id !== bookmarkId));
        } catch (error) {
            console.error('Failed to delete playback bookmark in LightBox PlaybackSection:', error);
        } finally {
            setDeletingBookmarkId(null);
        }
    };

    const handleStartEdit = (bookmark: PlaybackBookmark) => {
        if (editingBookmarkId === bookmark.id) return;
        setEditingBookmarkId(bookmark.id);
        setEditingNote(bookmark.note ?? '');
    };

    const handleCancelEdit = () => {
        setEditingBookmarkId(null);
        setEditingNote('');
        setSavingBookmarkId(null);
    };

    const handleSaveNote = async (bookmarkId: string) => {
        if (!bookmarkId || savingBookmarkId === bookmarkId) return;
        setSavingBookmarkId(bookmarkId);
        try {
            const result = await window.electronAPI.updatePlaybackBookmarkNote(bookmarkId, editingNote);
            if (!result.success || !result.bookmark) return;
            setBookmarks((current) => current.map((bookmark) => (
                bookmark.id === bookmarkId ? result.bookmark! : bookmark
            )));
            setEditingBookmarkId(null);
            setEditingNote('');
        } catch (error) {
            console.error('Failed to update playback bookmark note in LightBox PlaybackSection:', error);
        } finally {
            setSavingBookmarkId(null);
        }
    };

    const handleSetBookmarkRepresentative = async (bookmark: PlaybackBookmark) => {
        if (settingRepresentativeBookmarkId === bookmark.id) return;
        setSettingRepresentativeBookmarkId(bookmark.id);
        try {
            const result = await window.electronAPI.setRepresentativeThumbnail(file.id, bookmark.timeSeconds);
            if (!result.success) {
                showToast(result.error || '表紙の固定に失敗しました', 'error');
                return;
            }

            await refreshFile(file.id);
            showToast('見どころを表紙にしました', 'success', 2000);
        } catch (error) {
            console.error('Failed to set representative thumbnail from bookmark in LightBox PlaybackSection:', error);
            showToast('表紙の固定に失敗しました', 'error');
        } finally {
            setSettingRepresentativeBookmarkId(null);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-sm font-medium text-surface-300">再開 / 見どころ</h3>
                    <p className="text-[11px] leading-5 text-surface-500">
                        {hasSavedPosition
                            ? `再開位置 ${formatPlaybackTime(savedPosition ?? 0)} を保存しています`
                            : '再開位置はまだありません'}
                    </p>
                </div>
                {activeCurrentTime !== null && (
                    <div className="shrink-0 rounded-md border border-white/14 bg-black/35 px-2.5 py-1 text-sm font-semibold leading-none text-white">
                        {formatPlaybackTime(activeCurrentTime)}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={handleResume}
                    disabled={!hasSavedPosition}
                    className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1.5 text-xs font-semibold text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    続きから開く
                </button>
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={!hasSavedPosition || isClearing}
                    className="rounded-md border border-white/16 bg-white/5 px-2.5 py-1.5 text-xs text-surface-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isClearing ? 'クリア中...' : '再開位置をクリア'}
                </button>
                {updatedAt && (
                    <span className="self-center text-[11px] text-surface-500">
                        最終保存: {updatedAt}
                    </span>
                )}
            </div>

            <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            void handleAddBookmark();
                        }}
                        disabled={activeCurrentTime === null || isAdding}
                        className="min-w-0 flex-1 rounded-md border border-white/16 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-surface-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isAdding ? '追加中...' : '今の位置を見どころに追加'}
                    </button>
                    {bookmarks.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setSortMode((current) => (current === 'timeline' ? 'recent' : 'timeline'))}
                            className="shrink-0 rounded-md border border-white/16 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-surface-300 transition-colors hover:bg-white/10"
                        >
                            {sortMode === 'timeline' ? '時刻順' : '新しい順'}
                        </button>
                    )}
                </div>
                {isLoading ? (
                    <p className="text-xs text-surface-500">読み込み中...</p>
                ) : sortedBookmarks.length > 0 ? (
                    <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                        {sortedBookmarks.map((bookmark) => {
                            const isEditing = editingBookmarkId === bookmark.id;
                            const hasNote = Boolean(bookmark.note?.trim());
                            const isHighlighted = highlightedBookmarkId === bookmark.id;
                            const isNearCurrentPosition = activeCurrentTime !== null
                                && Math.abs(bookmark.timeSeconds - activeCurrentTime) < 3;

                            const containerClassName = [
                                'rounded-md border px-3 transition-colors',
                                isEditing || hasNote ? 'space-y-2 py-2.5' : 'space-y-1.5 py-2',
                                isHighlighted
                                    ? 'border-primary-500 bg-primary-950/30 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                                    : isNearCurrentPosition
                                        ? 'border-primary-700/70 bg-primary-950/15'
                                        : 'border-white/10 bg-white/[0.03]',
                            ].join(' ');

                            return (
                                <div
                                    key={bookmark.id}
                                    className={containerClassName}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-semibold text-white">
                                                    {formatPlaybackTime(bookmark.timeSeconds)}
                                                </div>
                                                {isNearCurrentPosition && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-primary-700/80 bg-primary-900/25 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary-200">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-primary-300" aria-hidden="true" />
                                                        近い
                                                    </span>
                                                )}
                                            </div>
                                            {!isEditing && hasNote && (
                                                <div className="truncate text-[11px] text-surface-400" title={bookmark.note ?? undefined}>
                                                    {bookmark.note}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openLightbox(file, 'default', bookmark.timeSeconds)}
                                            className="rounded-md border border-primary-700 bg-primary-900/25 px-2 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/45"
                                        >
                                            ここから開く
                                        </button>
                                    </div>
                                    <div className="flex justify-end gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleSetBookmarkRepresentative(bookmark);
                                            }}
                                            disabled={settingRepresentativeBookmarkId === bookmark.id}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/14 bg-white/5 text-surface-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                            title="この見どころを表紙にする"
                                            aria-label="この見どころを表紙にする"
                                        >
                                            {settingRepresentativeBookmarkId === bookmark.id ? (
                                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" opacity="0.35" />
                                                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                </svg>
                                            ) : (
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M4 7h16" />
                                                    <path d="M7 4h10" />
                                                    <path d="M6 10h12v8H6z" />
                                                    <path d="M12 13v2" />
                                                    <path d="M11 14h2" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(bookmark)}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/14 bg-white/5 text-surface-300 transition-colors hover:bg-white/10"
                                            title="メモを編集する"
                                            aria-label="メモを編集する"
                                        >
                                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="m4 20 4.5-1 9-9-3.5-3.5-9 9L4 20Z" />
                                                <path d="M13.5 6.5 17 10" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleDeleteBookmark(bookmark.id);
                                            }}
                                            disabled={deletingBookmarkId === bookmark.id}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/14 bg-white/5 text-surface-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                            title="この見どころを削除"
                                            aria-label="この見どころを削除"
                                        >
                                            {deletingBookmarkId === bookmark.id ? (
                                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" opacity="0.35" />
                                                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                </svg>
                                            ) : (
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M4 7h16" />
                                                    <path d="M9 7V5h6v2" />
                                                    <path d="M7 7l1 12h8l1-12" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {isEditing && (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={editingNote}
                                                onChange={(event) => setEditingNote(event.target.value.slice(0, 80))}
                                                placeholder="メモを一言残す（任意）"
                                                className="w-full rounded-md border border-white/14 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="rounded-md border border-white/14 bg-white/5 px-2.5 py-1 text-[11px] text-surface-300 transition-colors hover:bg-white/10"
                                                >
                                                    キャンセル
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void handleSaveNote(bookmark.id);
                                                    }}
                                                    disabled={savingBookmarkId === bookmark.id}
                                                    className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {savingBookmarkId === bookmark.id ? '保存中...' : '保存'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs leading-5 text-surface-500">
                        見どころはまだありません。
                    </p>
                )}
            </div>
        </div>
    );
});

PlaybackSection.displayName = 'PlaybackSection';
