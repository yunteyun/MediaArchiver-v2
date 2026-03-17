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
    const [isClearing, setIsClearing] = React.useState(false);
    const [isBookmarksOpen, setIsBookmarksOpen] = React.useState(false);
    const bookmarksButtonRef = React.useRef<HTMLButtonElement | null>(null);

    React.useEffect(() => {
        setIsClearing(false);
        setIsBookmarksOpen(false);
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

    return (
        <>
            <div className="pointer-events-auto absolute left-5 top-5 w-[280px] rounded-xl border border-surface-600 bg-black/88 px-4 py-3 shadow-2xl backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-surface-100">再開 / 見どころ</div>
                        <p className="mt-1 text-[11px] leading-5 text-surface-400">
                            {hasSavedPosition
                                ? `再開位置 ${formatPlaybackTime(savedPosition ?? 0)} を保存中`
                                : '見どころや再開位置はここで確認できます'}
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
                        ref={bookmarksButtonRef}
                        type="button"
                        onClick={() => setIsBookmarksOpen((prev) => !prev)}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            isBookmarksOpen
                                ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                                : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'
                        }`}
                    >
                        見どころ
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
