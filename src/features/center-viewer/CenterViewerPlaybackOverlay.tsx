import React from 'react';
import type { MediaFile, PlaybackBookmark } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { formatPlaybackTime, formatPlaybackUpdatedAt } from '../../utils/playbackTime';
import {
    type BookmarkSortMode,
    getInitialBookmarkSortMode,
    persistBookmarkSortMode,
    sortPlaybackBookmarks,
} from '../../utils/playbackBookmarks';

interface CenterViewerPlaybackOverlayProps {
    file: MediaFile;
}

export const CenterViewerPlaybackOverlay = React.memo<CenterViewerPlaybackOverlayProps>(({ file }) => {
    const refreshFile = useFileStore((state) => state.refreshFile);
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const openLightbox = useUIStore((state) => state.openLightbox);
    const lightboxFile = useUIStore((state) => state.lightboxFile);
    const lightboxCurrentTime = useUIStore((state) => state.lightboxCurrentTime);
    const showToast = useUIStore((state) => state.showToast);
    const [bookmarks, setBookmarks] = React.useState<PlaybackBookmark[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isClearing, setIsClearing] = React.useState(false);
    const [isBookmarkComposerOpen, setIsBookmarkComposerOpen] = React.useState(false);
    const [isBookmarkListOpen, setIsBookmarkListOpen] = React.useState(false);
    const [bookmarkNote, setBookmarkNote] = React.useState('');
    const [isAddingBookmark, setIsAddingBookmark] = React.useState(false);
    const [deletingBookmarkId, setDeletingBookmarkId] = React.useState<string | null>(null);
    const [editingBookmarkId, setEditingBookmarkId] = React.useState<string | null>(null);
    const [editingNote, setEditingNote] = React.useState('');
    const [savingBookmarkId, setSavingBookmarkId] = React.useState<string | null>(null);
    const [settingRepresentativeBookmarkId, setSettingRepresentativeBookmarkId] = React.useState<string | null>(null);
    const [highlightedBookmarkId, setHighlightedBookmarkId] = React.useState<string | null>(null);
    const [sortMode, setSortMode] = React.useState<BookmarkSortMode>(() => getInitialBookmarkSortMode());
    const sortedBookmarks = React.useMemo(() => sortPlaybackBookmarks(bookmarks, sortMode), [bookmarks, sortMode]);

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
                console.error('Failed to load playback bookmarks in center viewer overlay:', error);
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
        setIsClearing(false);
        setIsBookmarkComposerOpen(false);
        setIsBookmarkListOpen(false);
        setBookmarkNote('');
        setIsAddingBookmark(false);
        setDeletingBookmarkId(null);
        setEditingBookmarkId(null);
        setEditingNote('');
        setSavingBookmarkId(null);
        setSettingRepresentativeBookmarkId(null);
        setHighlightedBookmarkId(null);
    }, [file.id]);

    React.useEffect(() => {
        persistBookmarkSortMode(sortMode);
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

    const savedPosition = typeof file.playbackPositionSeconds === 'number' && Number.isFinite(file.playbackPositionSeconds)
        ? file.playbackPositionSeconds
        : null;
    const hasSavedPosition = savedPosition !== null && savedPosition > 0;
    const updatedAt = formatPlaybackUpdatedAt(file.playbackPositionUpdatedAt);
    const activeCurrentTime = lightboxFile?.id === file.id && typeof lightboxCurrentTime === 'number' && Number.isFinite(lightboxCurrentTime)
        ? Math.max(0, lightboxCurrentTime)
        : null;
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
            console.error('Failed to clear playback position in center viewer overlay:', error);
        } finally {
            setIsClearing(false);
        }
    };

    const handleSaveBookmark = async () => {
        if (activeCurrentTime === null || isAddingBookmark) return;
        setIsAddingBookmark(true);
        try {
            const result = await window.electronAPI.createPlaybackBookmark(file.id, activeCurrentTime, bookmarkNote);
            if (!result.success || !result.bookmark) {
                showToast(result.error || '見どころの追加に失敗しました', 'error');
                return;
            }

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
            setBookmarkNote('');
            setIsBookmarkComposerOpen(false);
            setIsBookmarkListOpen(true);
            setHighlightedBookmarkId(result.bookmark.id);
            showToast('見どころを追加しました', 'success', 1800);
        } catch (error) {
            console.error('Failed to create playback bookmark in center viewer overlay:', error);
            showToast('見どころの追加に失敗しました', 'error');
        } finally {
            setIsAddingBookmark(false);
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
            console.error('Failed to delete playback bookmark in center viewer overlay:', error);
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
            console.error('Failed to update playback bookmark note in center viewer overlay:', error);
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
            showToast('見どころを表紙にしました', 'success', 1800);
        } catch (error) {
            console.error('Failed to set representative thumbnail from bookmark in center viewer overlay:', error);
            showToast('表紙の固定に失敗しました', 'error');
        } finally {
            setSettingRepresentativeBookmarkId(null);
        }
    };

    return (
            <div className="w-[312px] rounded-xl border border-surface-500 bg-surface-950 px-4 py-3 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-surface-100">再開 / 見どころ</div>
                        <p className="mt-1 text-[11px] leading-5 text-surface-400">
                            {hasSavedPosition
                                ? `再開位置 ${formatPlaybackTime(savedPosition ?? 0)} を保存中`
                                : '再開位置と見どころをここで扱えます'}
                        </p>
                    </div>
                    {activeCurrentTime !== null && (
                        <div className="shrink-0 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-sm font-semibold leading-none text-surface-100">
                            {formatPlaybackTime(activeCurrentTime)}
                        </div>
                    )}
                </div>

                {updatedAt && hasSavedPosition && (
                    <p className="mt-2 truncate text-[11px] text-surface-500">
                        最終保存: {updatedAt}
                    </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleResume}
                        disabled={!hasSavedPosition}
                        className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-xs font-semibold text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        続きから開く
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsBookmarkListOpen(false);
                            setIsBookmarkComposerOpen((prev) => !prev);
                        }}
                        disabled={activeCurrentTime === null}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            isBookmarkComposerOpen
                                ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                                : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        追加
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsBookmarkComposerOpen(false);
                            setIsBookmarkListOpen((prev) => !prev);
                        }}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            isBookmarkListOpen
                                ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                                : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'
                        }`}
                    >
                        一覧
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={!hasSavedPosition || isClearing}
                        className="rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isClearing ? 'クリア中...' : 'クリア'}
                    </button>
                </div>

                {isBookmarkComposerOpen && (
                    <div className="mt-3 space-y-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-medium text-surface-300">この位置を見どころに追加</p>
                            {activeCurrentTime !== null && (
                                <span className="rounded-md border border-surface-700 bg-surface-950 px-2 py-1 text-[11px] font-semibold leading-none text-surface-100">
                                    {formatPlaybackTime(activeCurrentTime)}
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            value={bookmarkNote}
                            onChange={(event) => setBookmarkNote(event.target.value.slice(0, 80))}
                            placeholder="メモを一言残す（任意）"
                            className="w-full rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsBookmarkComposerOpen(false);
                                    setBookmarkNote('');
                                }}
                                className="rounded-md border border-surface-700 bg-surface-950 px-2.5 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleSaveBookmark();
                                }}
                                disabled={activeCurrentTime === null || isAddingBookmark}
                                className="rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isAddingBookmark ? '追加中...' : '追加する'}
                            </button>
                        </div>
                    </div>
                )}

                {isBookmarkListOpen && (
                    <div className="mt-3 space-y-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-medium text-surface-300">見どころ一覧</p>
                            {bookmarks.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSortMode((current) => (current === 'timeline' ? 'recent' : 'timeline'))}
                                    className="rounded-md border border-surface-700 bg-surface-950 px-2 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800"
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
                                                ? 'border-primary-700/80 bg-primary-950/15'
                                                : 'border-surface-700 bg-surface-950',
                                    ].join(' ');

                                    return (
                                        <div
                                            key={bookmark.id}
                                            className={containerClassName}
                                        >
                                            <div className="flex items-start gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openLightbox(file, 'default', bookmark.timeSeconds)}
                                                    className="min-w-0 flex-1 rounded-md text-left transition-colors hover:bg-surface-900/70"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-semibold text-surface-100">
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
                                                        <div className="mt-1 truncate text-[11px] text-surface-400" title={bookmark.note ?? undefined}>
                                                            {bookmark.note}
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void handleSetBookmarkRepresentative(bookmark);
                                                        }}
                                                        disabled={settingRepresentativeBookmarkId === bookmark.id}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-surface-700 bg-surface-900 text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-surface-700 bg-surface-900 text-surface-300 transition-colors hover:bg-surface-800"
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
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-surface-700 bg-surface-900 text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                                            </div>
                                            {isEditing && (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editingNote}
                                                        onChange={(event) => setEditingNote(event.target.value.slice(0, 80))}
                                                        placeholder="メモを一言残す（任意）"
                                                        className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelEdit}
                                                            className="rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800"
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
                                まだ保存されていません。
                            </p>
                        )}
                    </div>
                )}
            </div>
    );
});

CenterViewerPlaybackOverlay.displayName = 'CenterViewerPlaybackOverlay';
