import React from 'react';
import { createPortal } from 'react-dom';
import type { MediaFile, PlaybackBookmark } from '../../types/file';
import { useUIStore } from '../../stores/useUIStore';
import { formatPlaybackTime } from '../../utils/playbackTime';

interface PlaybackBookmarksPopoverProps {
    file: MediaFile;
    anchorElement: HTMLElement | null;
    open: boolean;
    onClose: () => void;
}

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 412;
const VIEWPORT_PADDING = 12;
const POPOVER_GAP = 8;

export const PlaybackBookmarksPopover = React.memo<PlaybackBookmarksPopoverProps>(({
    file,
    anchorElement,
    open,
    onClose,
}) => {
    const openLightbox = useUIStore((state) => state.openLightbox);
    const lightboxFile = useUIStore((state) => state.lightboxFile);
    const lightboxCurrentTime = useUIStore((state) => state.lightboxCurrentTime);
    const [bookmarks, setBookmarks] = React.useState<PlaybackBookmark[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isAdding, setIsAdding] = React.useState(false);
    const [deletingBookmarkId, setDeletingBookmarkId] = React.useState<string | null>(null);
    const [bookmarkNote, setBookmarkNote] = React.useState('');
    const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});
    const popoverRef = React.useRef<HTMLDivElement | null>(null);

    const activeCurrentTime = lightboxFile?.id === file.id && typeof lightboxCurrentTime === 'number' && Number.isFinite(lightboxCurrentTime)
        ? Math.max(0, lightboxCurrentTime)
        : null;
    const canAddBookmark = activeCurrentTime !== null;

    const updatePopoverPosition = React.useCallback(() => {
        if (!anchorElement) {
            setPopoverStyle({});
            return;
        }

        const rect = anchorElement.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
        const showBelow = spaceBelow >= POPOVER_HEIGHT || rect.top < POPOVER_HEIGHT;
        const top = showBelow
            ? Math.min(rect.bottom + POPOVER_GAP, window.innerHeight - POPOVER_HEIGHT - VIEWPORT_PADDING)
            : Math.max(VIEWPORT_PADDING, rect.top - POPOVER_HEIGHT - POPOVER_GAP);
        const preferredLeft = rect.right - POPOVER_WIDTH;
        const left = Math.min(
            Math.max(VIEWPORT_PADDING, preferredLeft),
            Math.max(VIEWPORT_PADDING, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING)
        );

        setPopoverStyle({
            position: 'fixed',
            top,
            left,
            width: POPOVER_WIDTH,
            zIndex: 'var(--z-dropdown)',
        });
    }, [anchorElement]);

    React.useEffect(() => {
        let disposed = false;

        if (file.type !== 'video' || !open) {
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
    }, [file.id, file.type, open]);

    React.useEffect(() => {
        if (!open) {
            setPopoverStyle({});
            return;
        }

        updatePopoverPosition();
        const handleResize = () => updatePopoverPosition();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [open, updatePopoverPosition]);

    React.useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (popoverRef.current?.contains(target)) return;
            if (anchorElement?.contains(target)) return;
            onClose();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [anchorElement, onClose, open]);

    React.useEffect(() => {
        if (!open) return;
        setDeletingBookmarkId(null);
        setBookmarkNote('');
    }, [file.id, open]);

    if (file.type !== 'video' || !open || !anchorElement) {
        return null;
    }

    const handleAddBookmark = async () => {
        if (!canAddBookmark || activeCurrentTime === null || isAdding) return;
        setIsAdding(true);
        try {
            const result = await window.electronAPI.createPlaybackBookmark(file.id, activeCurrentTime, bookmarkNote);
            if (!result.success || !result.bookmark) return;
            setBookmarks((current) => {
                const next = [...current];
                const existingIndex = next.findIndex((bookmark) => bookmark.id === result.bookmark!.id);
                if (existingIndex >= 0) {
                    next[existingIndex] = result.bookmark!;
                } else {
                    next.push(result.bookmark!);
                }
                return next.sort((a, b) => a.timeSeconds - b.timeSeconds || a.createdAt - b.createdAt);
            });
            setBookmarkNote('');
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

    const bookmarkRows = bookmarks.map((bookmark) => (
        <div
            key={bookmark.id}
            className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-900/60 px-2 py-1.5"
        >
            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-surface-100">
                    {formatPlaybackTime(bookmark.timeSeconds)}
                </div>
                {bookmark.note && (
                    <div className="truncate text-[11px] text-surface-400" title={bookmark.note}>
                        {bookmark.note}
                    </div>
                )}
            </div>
            <button
                type="button"
                onClick={() => {
                    openLightbox(file, 'default', bookmark.timeSeconds);
                    onClose();
                }}
                className="rounded-md border border-primary-700 bg-primary-900/25 px-2 py-1 text-[11px] font-medium text-primary-100 transition-colors hover:bg-primary-900/45"
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
    ));

    return createPortal(
        <div
            ref={popoverRef}
            className="rounded-xl border border-surface-600 bg-surface-900 p-3 shadow-2xl"
            style={popoverStyle}
            data-ignore-global-escape="true"
        >
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-sm font-semibold text-surface-100">見どころ</h3>
                        <p className="text-[11px] leading-5 text-surface-500">
                            {canAddBookmark
                                ? '中央ビューアの今の位置を保存できます'
                                : '中央ビューアで動画を開くと今の位置を保存できます'}
                        </p>
                    </div>
                    {canAddBookmark && activeCurrentTime !== null && (
                        <div className="shrink-0 rounded-md border border-surface-700 bg-surface-950 px-2.5 py-1 text-sm font-semibold leading-none text-surface-100">
                            {formatPlaybackTime(activeCurrentTime)}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => {
                        void handleAddBookmark();
                    }}
                    disabled={!canAddBookmark || isAdding}
                    className="w-full rounded-md border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-xs font-medium text-surface-200 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isAdding ? '追加中...' : '今の位置を追加'}
                </button>

                <input
                    type="text"
                    value={bookmarkNote}
                    onChange={(event) => setBookmarkNote(event.target.value.slice(0, 80))}
                    placeholder="メモを一言残す（任意）"
                    className="w-full rounded-md border border-surface-700 bg-surface-950 px-3 py-2 text-xs text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                />

                {isLoading ? (
                    <p className="text-xs text-surface-500">読み込み中...</p>
                ) : bookmarks.length > 0 ? (
                    <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                        {bookmarkRows}
                    </div>
                ) : (
                    <p className="text-xs leading-5 text-surface-500">
                        まだ保存されていません。
                    </p>
                )}
            </div>
        </div>,
        document.body,
    );
});

PlaybackBookmarksPopover.displayName = 'PlaybackBookmarksPopover';
