import React from 'react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { PlaybackBookmarksPopover } from '../../components/RightPanel/PlaybackBookmarksSection';
import { formatPlaybackTime, formatPlaybackUpdatedAt } from '../../utils/playbackTime';

interface CenterViewerPlaybackOverlayProps {
    file: MediaFile;
}

export const CenterViewerPlaybackOverlay = React.memo<CenterViewerPlaybackOverlayProps>(({ file }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const openLightbox = useUIStore((state) => state.openLightbox);
    const lightboxFile = useUIStore((state) => state.lightboxFile);
    const lightboxCurrentTime = useUIStore((state) => state.lightboxCurrentTime);
    const showToast = useUIStore((state) => state.showToast);
    const [isClearing, setIsClearing] = React.useState(false);
    const [isBookmarksOpen, setIsBookmarksOpen] = React.useState(false);
    const [isBookmarkComposerOpen, setIsBookmarkComposerOpen] = React.useState(false);
    const [bookmarkNote, setBookmarkNote] = React.useState('');
    const [isAddingBookmark, setIsAddingBookmark] = React.useState(false);
    const bookmarksButtonRef = React.useRef<HTMLButtonElement | null>(null);

    React.useEffect(() => {
        setIsClearing(false);
        setIsBookmarksOpen(false);
        setIsBookmarkComposerOpen(false);
        setBookmarkNote('');
        setIsAddingBookmark(false);
    }, [file.id]);

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

            setBookmarkNote('');
            setIsBookmarkComposerOpen(false);
            showToast('見どころを追加しました', 'success', 1800);
        } catch (error) {
            console.error('Failed to create playback bookmark in center viewer overlay:', error);
            showToast('見どころの追加に失敗しました', 'error');
        } finally {
            setIsAddingBookmark(false);
        }
    };

    return (
        <>
            <div className="pointer-events-auto absolute left-5 top-5 w-[312px] rounded-xl border border-surface-500 bg-surface-950 px-4 py-3 shadow-2xl">
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
                            setIsBookmarksOpen(false);
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
                        ref={bookmarksButtonRef}
                        type="button"
                        onClick={() => {
                            setIsBookmarkComposerOpen(false);
                            setIsBookmarksOpen((prev) => !prev);
                        }}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            isBookmarksOpen
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
            </div>

            <PlaybackBookmarksPopover
                file={file}
                anchorElement={bookmarksButtonRef.current}
                open={isBookmarksOpen}
                onClose={() => setIsBookmarksOpen(false)}
            />
        </>
    );
});

CenterViewerPlaybackOverlay.displayName = 'CenterViewerPlaybackOverlay';
