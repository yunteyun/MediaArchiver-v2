import React from 'react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { SectionTitle } from './SectionTitle';
import { PlaybackBookmarksPopover } from './PlaybackBookmarksSection';
import { formatPlaybackTime, formatPlaybackUpdatedAt } from '../../utils/playbackTime';

interface PlaybackResumeSectionProps {
    file: MediaFile;
}

export const PlaybackResumeSection = React.memo<PlaybackResumeSectionProps>(({ file }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const openLightbox = useUIStore((state) => state.openLightbox);
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
            console.error('Failed to clear playback position:', error);
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <section className="px-4 py-3 border-b border-surface-700 space-y-2">
            {hasSavedPosition ? (
                <>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <SectionTitle>再開位置</SectionTitle>
                            {updatedAt && (
                                <p className="mt-1 truncate text-[11px] text-surface-500">
                                    最終保存: {updatedAt}
                                </p>
                            )}
                        </div>
                        <div className="shrink-0 rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-base font-semibold leading-none text-surface-100">
                            {formatPlaybackTime(savedPosition)}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleResume}
                            className="flex-1 rounded-md border border-primary-700 bg-primary-900/30 px-2.5 py-1 text-xs font-semibold text-primary-100 transition-colors hover:bg-primary-900/50"
                        >
                            続きから開く
                        </button>
                        <button
                            ref={bookmarksButtonRef}
                            type="button"
                            onClick={() => setIsBookmarksOpen((prev) => !prev)}
                            className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
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
                            disabled={isClearing}
                            className="rounded-md border border-surface-700 bg-surface-900 px-2.5 py-1 text-[11px] text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isClearing ? 'クリア中...' : 'クリア'}
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-2">
                    <SectionTitle>再開位置</SectionTitle>
                    <p className="text-xs leading-5 text-surface-500">
                        動画を中央ビューアで見た位置を自動で覚えます。見終わり付近まで再生した場合は自動で消えます。
                    </p>
                    <div className="flex justify-start">
                        <button
                            ref={bookmarksButtonRef}
                            type="button"
                            onClick={() => setIsBookmarksOpen((prev) => !prev)}
                            className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                                isBookmarksOpen
                                    ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                                    : 'border-surface-700 bg-surface-900 text-surface-300 hover:bg-surface-800'
                            }`}
                        >
                            見どころ
                        </button>
                    </div>
                </div>
            )}
            <PlaybackBookmarksPopover
                file={file}
                anchorElement={bookmarksButtonRef.current}
                open={isBookmarksOpen}
                onClose={() => setIsBookmarksOpen(false)}
            />
        </section>
    );
});

PlaybackResumeSection.displayName = 'PlaybackResumeSection';
