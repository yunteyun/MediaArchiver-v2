import React from 'react';
import type { MediaFile } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { SectionTitle } from './SectionTitle';

interface PlaybackResumeSectionProps {
    file: MediaFile;
}

function formatPlaybackTime(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remain = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
    }

    return `${minutes}:${String(remain).padStart(2, '0')}`;
}

function formatUpdatedAt(timestamp: number | null | undefined): string | null {
    if (!timestamp || !Number.isFinite(timestamp)) return null;
    return new Date(timestamp).toLocaleString('ja-JP');
}

export const PlaybackResumeSection = React.memo<PlaybackResumeSectionProps>(({ file }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const openLightbox = useUIStore((state) => state.openLightbox);
    const [isClearing, setIsClearing] = React.useState(false);

    React.useEffect(() => {
        setIsClearing(false);
    }, [file.id]);

    if (file.type !== 'video') {
        return null;
    }

    const savedPosition = typeof file.playbackPositionSeconds === 'number' && Number.isFinite(file.playbackPositionSeconds)
        ? file.playbackPositionSeconds
        : null;
    const hasSavedPosition = savedPosition !== null && savedPosition > 0;
    const updatedAt = formatUpdatedAt(file.playbackPositionUpdatedAt);

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
        <section className="px-4 py-3 border-b border-surface-700 space-y-3">
            <div className="space-y-1">
                <SectionTitle>再開位置</SectionTitle>
                {hasSavedPosition ? (
                    <>
                        <p className="text-sm font-medium text-surface-100">
                            {formatPlaybackTime(savedPosition)}
                        </p>
                        {updatedAt && (
                            <p className="text-xs text-surface-500">
                                最終保存: {updatedAt}
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-xs leading-5 text-surface-500">
                        動画を中央ビューアで見た位置を自動で覚えます。見終わり付近まで再生した場合は自動で消えます。
                    </p>
                )}
            </div>

            {hasSavedPosition && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleResume}
                        className="flex-1 rounded-lg border border-primary-700 bg-primary-900/40 px-3 py-2 text-sm font-medium text-primary-100 transition-colors hover:bg-primary-900/60"
                    >
                        続きから開く
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isClearing}
                        className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isClearing ? 'クリア中...' : 'クリア'}
                    </button>
                </div>
            )}
        </section>
    );
});

PlaybackResumeSection.displayName = 'PlaybackResumeSection';
