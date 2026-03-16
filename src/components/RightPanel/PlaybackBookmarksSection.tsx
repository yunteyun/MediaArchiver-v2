import React from 'react';
import type { MediaFile, PlaybackBookmark } from '../../types/file';
import { useUIStore } from '../../stores/useUIStore';
import { SectionTitle } from './SectionTitle';
import { formatPlaybackTime } from '../../utils/playbackTime';

interface PlaybackBookmarksSectionProps {
    file: MediaFile;
}

export const PlaybackBookmarksSection = React.memo<PlaybackBookmarksSectionProps>(({ file }) => {
    const openLightbox = useUIStore((state) => state.openLightbox);
    const lightboxFile = useUIStore((state) => state.lightboxFile);
    const lightboxCurrentTime = useUIStore((state) => state.lightboxCurrentTime);
    const [bookmarks, setBookmarks] = React.useState<PlaybackBookmark[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isAdding, setIsAdding] = React.useState(false);
    const [deletingBookmarkId, setDeletingBookmarkId] = React.useState<string | null>(null);

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
                    setBookmarks(
                        [...result].sort((a, b) => a.timeSeconds - b.timeSeconds || a.createdAt - b.createdAt)
                    );
                }
            } catch (error) {
                console.error('Failed to load playback bookmarks:', error);
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

    if (file.type !== 'video') {
        return null;
    }

    const activeCurrentTime = lightboxFile?.id === file.id && typeof lightboxCurrentTime === 'number' && Number.isFinite(lightboxCurrentTime)
        ? Math.max(0, lightboxCurrentTime)
        : null;
    const canAddBookmark = activeCurrentTime !== null;

    const handleAddBookmark = async () => {
        if (!canAddBookmark || activeCurrentTime === null || isAdding) return;
        setIsAdding(true);
        try {
            const result = await window.electronAPI.createPlaybackBookmark(file.id, activeCurrentTime);
            if (!result.success || !result.bookmark) return;
            setBookmarks((current) => {
                const next = [...current];
                const existingIndex = next.findIndex((bookmark) => bookmark.id === result.bookmark?.id);
                if (existingIndex >= 0) {
                    next[existingIndex] = result.bookmark;
                } else {
                    next.push(result.bookmark);
                }
                return next.sort((a, b) => a.timeSeconds - b.timeSeconds || a.createdAt - b.createdAt);
            });
        } catch (error) {
            console.error('Failed to create playback bookmark:', error);
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
            console.error('Failed to delete playback bookmark:', error);
        } finally {
            setDeletingBookmarkId(null);
        }
    };

    return (
        <section className="px-4 py-3 border-b border-surface-700 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                    <SectionTitle>見どころ</SectionTitle>
                    <p className="text-[11px] leading-5 text-surface-500">
                        {canAddBookmark
                            ? '中央ビューアの今の位置を保存できます'
                            : '中央ビューアで動画を開くと今の位置を保存できます'}
                    </p>
                </div>
                {canAddBookmark && activeCurrentTime !== null && (
                    <div className="shrink-0 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-sm font-semibold leading-none text-surface-100">
                        {formatPlaybackTime(activeCurrentTime)}
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={handleAddBookmark}
                disabled={!canAddBookmark || isAdding}
                className="w-full rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-xs font-medium text-surface-200 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isAdding ? '追加中...' : '今の位置を追加'}
            </button>

            {isLoading ? (
                <p className="text-xs text-surface-500">読み込み中...</p>
            ) : bookmarks.length > 0 ? (
                <div className="space-y-1.5">
                    {bookmarks.map((bookmark) => (
                        <div
                            key={bookmark.id}
                            className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-900/60 px-2 py-1.5"
                        >
                            <div className="min-w-[52px] shrink-0 text-sm font-semibold text-surface-100">
                                {formatPlaybackTime(bookmark.timeSeconds)}
                            </div>
                            <button
                                type="button"
                                onClick={() => openLightbox(file, 'default', bookmark.timeSeconds)}
                                className="flex-1 rounded-md border border-primary-700 bg-primary-900/25 px-2 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/45"
                            >
                                ここから開く
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleDeleteBookmark(bookmark.id);
                                }}
                                disabled={deletingBookmarkId === bookmark.id}
                                className="rounded-md border border-surface-700 bg-surface-900 px-2 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {deletingBookmarkId === bookmark.id ? '削除中...' : '削除'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs leading-5 text-surface-500">
                    まだ保存されていません。
                </p>
            )}
        </section>
    );
});

PlaybackBookmarksSection.displayName = 'PlaybackBookmarksSection';
