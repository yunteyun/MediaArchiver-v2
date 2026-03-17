/**
 * ArchivePreviewSection - 書庫ファイルのプレビューフレームグリッド
 * BASIC INFO の下 / TAG セクションの上に表示する
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Film, Images } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { isAudioArchive } from '../../utils/fileHelpers';
import { toMediaUrl } from '../../utils/mediaPath';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { SectionTitle } from './SectionTitle';
import { getGeneratedPreviewFrameTime, parseDurationLabelToSeconds } from '../../utils/videoPreview';

interface Props {
    file: MediaFile;
}

export const ArchivePreviewSection = React.memo<Props>(({ file }) => {
    const refreshFile = useFileStore((s) => s.refreshFile);
    const openLightbox = useUIStore((s) => s.openLightbox);
    const showToast = useUIStore((s) => s.showToast);
    const [frames, setFrames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [applyingFramePath, setApplyingFramePath] = useState<string | null>(null);
    const [restoringRepresentative, setRestoringRepresentative] = useState(false);

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

    const handleSetArchiveRepresentative = async (framePath: string) => {
        if (!isArchive || !framePath || applyingFramePath === framePath) return;
        setApplyingFramePath(framePath);
        try {
            const result = await window.electronAPI.setRepresentativeThumbnailFromSource(file.id, framePath);
            if (!result.success) {
                showToast(result.error || '表紙の固定に失敗しました', 'error');
                return;
            }

            await refreshFile(file.id);
            showToast('このページを表紙にしました', 'success', 2000);
        } catch (error) {
            console.error('Failed to set archive representative thumbnail:', error);
            showToast('表紙の固定に失敗しました', 'error');
        } finally {
            setApplyingFramePath(null);
        }
    };

    const handleRestoreAutoThumbnail = async () => {
        if (!isArchive || !file.thumbnailLocked || restoringRepresentative) return;
        setRestoringRepresentative(true);
        try {
            const result = await window.electronAPI.restoreAutoThumbnail(file.id);
            if (!result.success) {
                showToast(result.error || '自動サムネイルへ戻せませんでした', 'error');
                return;
            }

            await refreshFile(file.id);
            showToast('自動サムネイルへ戻しました', 'success', 2000);
        } catch (error) {
            console.error('Failed to restore archive thumbnail:', error);
            showToast('自動サムネイルへ戻せませんでした', 'error');
        } finally {
            setRestoringRepresentative(false);
        }
    };

    if (!shouldShow) return null;

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    {isVideo ? (
                        <Film size={13} className="text-surface-400" />
                    ) : (
                        <Images size={13} className="text-surface-400" />
                    )}
                    <SectionTitle>{title}</SectionTitle>
                </div>
                {isArchive && file.thumbnailLocked && (
                    <button
                        type="button"
                        onClick={() => {
                            void handleRestoreAutoThumbnail();
                        }}
                        disabled={restoringRepresentative || applyingFramePath !== null}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-surface-700 bg-surface-900 text-surface-300 transition-colors hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-50"
                        title="自動サムネイルへ戻す"
                        aria-label="自動サムネイルへ戻す"
                    >
                        {restoringRepresentative ? (
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" opacity="0.35" />
                                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 12a9 9 0 1 0 3-6.7" />
                                <path d="M3 4v5h5" />
                            </svg>
                        )}
                    </button>
                )}
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
                        <div key={i} className={`relative ${frameAspectClass}`}>
                            {isArchive && (
                                <button
                                    type="button"
                                    className="absolute right-1 top-1 z-[1] inline-flex h-6 w-6 items-center justify-center rounded-md border border-surface-700 bg-surface-950/90 text-surface-200 shadow-sm transition-colors hover:bg-surface-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        void handleSetArchiveRepresentative(framePath);
                                    }}
                                    disabled={applyingFramePath === framePath}
                                    title="このページを表紙にする"
                                    aria-label="このページを表紙にする"
                                >
                                    {applyingFramePath === framePath ? (
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
                            )}
                            <button
                                type="button"
                                className="h-full w-full overflow-hidden rounded-sm bg-surface-800 flex items-center justify-center cursor-pointer transition hover:ring-1 hover:ring-surface-500"
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
                        </div>
                    ))}
                    {/* 空きセルを埋める（3枚以下の場合） */}
                    {displayFrames.length < 4 && Array.from({ length: 4 - displayFrames.length }).map((_, i) => (
                        <div key={`empty-${i}`} className={`${frameAspectClass} rounded-sm bg-surface-800`} />
                    ))}
                </div>
            ) : displayFrames.length === 1 ? (
                // 1枚のみの場合
                <div className={`relative w-full overflow-hidden rounded-sm ${isVideo ? 'aspect-square bg-surface-800' : ''}`}>
                    {isArchive && (
                        <button
                            type="button"
                            className="absolute right-1 top-1 z-[1] inline-flex h-6 w-6 items-center justify-center rounded-md border border-surface-700 bg-surface-950/90 text-surface-200 shadow-sm transition-colors hover:bg-surface-900 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={(event) => {
                                event.stopPropagation();
                                void handleSetArchiveRepresentative(displayFrames[0]);
                            }}
                            disabled={applyingFramePath === displayFrames[0]}
                            title="このページを表紙にする"
                            aria-label="このページを表紙にする"
                        >
                            {applyingFramePath === displayFrames[0] ? (
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
                    )}
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
                </div>
            ) : (
                // フレームなし
                <p className="text-xs text-surface-500">プレビューフレームなし</p>
            )}
        </section>
    );
});

ArchivePreviewSection.displayName = 'ArchivePreviewSection';
