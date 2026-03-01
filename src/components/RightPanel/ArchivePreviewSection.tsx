/**
 * ArchivePreviewSection - 書庫ファイルのプレビューフレームグリッド
 * BASIC INFO の下 / TAG セクションの上に表示する
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Film, Images } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { isAudioArchive } from '../../utils/fileHelpers';
import { toMediaUrl } from '../../utils/mediaPath';
import { useUIStore } from '../../stores/useUIStore';
import { SectionTitle } from './SectionTitle';
import { getGeneratedPreviewFrameTime, parseDurationLabelToSeconds } from '../../utils/videoPreview';

interface Props {
    file: MediaFile;
}

export const ArchivePreviewSection = React.memo<Props>(({ file }) => {
    const openLightbox = useUIStore((s) => s.openLightbox);
    const [frames, setFrames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const isVideo = file.type === 'video';
    const isArchive = file.type === 'archive' && !isAudioArchive(file);
    const videoFrames = useMemo(() => {
        if (!isVideo || !file.previewFrames) return [];
        return file.previewFrames.split(',').filter(Boolean);
    }, [file.previewFrames, isVideo]);
    const shouldShow = isArchive || (isVideo && videoFrames.length > 0);
    const displayFrames = isVideo ? videoFrames : frames;
    const frameAspectClass = isVideo ? 'aspect-square' : 'aspect-[3/4]';
    const title = isVideo ? '動画フレーム' : 'プレビューフレーム';
    const videoDurationSeconds = useMemo(() => parseDurationLabelToSeconds(file.duration), [file.duration]);

    useEffect(() => {
        if (!isArchive) {
            setFrames([]);
            return;
        }
        setFrames([]);
        setLoading(true);
        window.electronAPI.getArchivePreviewFrames(file.path, 4)
            .then((f: string[]) => setFrames(f))
            .catch(() => setFrames([]))
            .finally(() => setLoading(false));
    }, [file.path, isArchive]);

    if (!shouldShow) return null;

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <div className="flex items-center gap-1.5">
                {isVideo ? (
                    <Film size={13} className="text-surface-400" />
                ) : (
                    <Images size={13} className="text-surface-400" />
                )}
                <SectionTitle>{title}</SectionTitle>
            </div>

            {loading ? (
                // ローディングスピナー
                <div className="flex items-center justify-center h-20 text-surface-500">
                    <div className="w-5 h-5 border-2 border-surface-600 border-t-surface-300 rounded-full animate-spin" />
                </div>
            ) : displayFrames.length >= 2 ? (
                // 2×2 グリッド表示
                <div className="grid grid-cols-2 gap-1">
                    {displayFrames.slice(0, 4).map((framePath, i) => (
                        <button
                            type="button"
                            key={i}
                            className={`${frameAspectClass} overflow-hidden rounded-sm bg-surface-800 flex items-center justify-center cursor-pointer transition hover:ring-1 hover:ring-surface-500`}
                            onClick={() => {
                                if (isVideo && videoDurationSeconds) {
                                    openLightbox(file, 'default', getGeneratedPreviewFrameTime(videoDurationSeconds, i, displayFrames.length));
                                    return;
                                }
                                openLightbox(file);
                            }}
                            title={isVideo ? 'クリックしてこの場面から中央ビューアで開く' : 'クリックして中央ビューアで開く'}
                        >
                            <img
                                src={toMediaUrl(framePath)}
                                alt={`frame ${i + 1}`}
                                className="h-full w-full object-contain bg-surface-900"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </button>
                    ))}
                    {/* 空きセルを埋める（3枚以下の場合） */}
                    {displayFrames.length < 4 && Array.from({ length: 4 - displayFrames.length }).map((_, i) => (
                        <div key={`empty-${i}`} className={`${frameAspectClass} rounded-sm bg-surface-800`} />
                    ))}
                </div>
            ) : displayFrames.length === 1 ? (
                // 1枚のみの場合
                <div
                    className={`w-full overflow-hidden rounded-sm cursor-pointer ${isVideo ? 'aspect-square bg-surface-800' : ''}`}
                    onClick={() => {
                        if (isVideo && videoDurationSeconds) {
                            openLightbox(file, 'default', getGeneratedPreviewFrameTime(videoDurationSeconds, 0, displayFrames.length));
                            return;
                        }
                        openLightbox(file);
                    }}
                >
                    <img
                        src={toMediaUrl(displayFrames[0])}
                        alt="preview"
                        className="h-full w-full object-contain bg-surface-900"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            ) : (
                // フレームなし
                <p className="text-xs text-surface-500">プレビューフレームなし</p>
            )}
        </section>
    );
});

ArchivePreviewSection.displayName = 'ArchivePreviewSection';
