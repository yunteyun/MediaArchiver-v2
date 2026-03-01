import React, { useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { toMediaUrl } from '../../utils/mediaPath';
import {
    getSequentialPreviewTime,
    shouldFallbackSequentialPreview,
    VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS,
} from '../../utils/videoPreview';
import type { MediaFile } from '../../types/file';
import { SectionTitle } from './SectionTitle';

interface PreviewSectionProps {
    file: MediaFile;
}

export const PreviewSection = React.memo<PreviewSectionProps>(({ file }) => {
    const openLightbox = useUIStore((s) => s.openLightbox);
    const lightboxFile = useUIStore((s) => s.lightboxFile);
    const setPreviewContext = useUIStore((s) => s.setPreviewContext);
    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const rightPanelVideoMuted = useSettingsStore((s) => s.rightPanelVideoMuted);
    const rightPanelVideoPreviewMode = useSettingsStore((s) => s.rightPanelVideoPreviewMode);
    const setRightPanelVideoMuted = useSettingsStore((s) => s.setRightPanelVideoMuted);
    const setRightPanelVideoPreviewMode = useSettingsStore((s) => s.setRightPanelVideoPreviewMode);
    const videoRef = useRef<HTMLVideoElement>(null);
    const jumpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isVideo = file.type === 'video';
    const isCenterViewerOpen = Boolean(lightboxFile);
    // GIF/WebP アニメーション: サムネイルではなく元ファイルを直接表示
    const isAnimated = file.isAnimated === true;

    // 動画マウント時に previewContext を right-panel にセット（グリッドホバー排他）
    useEffect(() => {
        if (isVideo) {
            setPreviewContext('right-panel');
            return () => setPreviewContext(null);
        }
    }, [isVideo, setPreviewContext]);

    const handleClick = () => openLightbox(file);

    const animatedSrc = isAnimated ? toMediaUrl(file.path) : null;
    const thumbnailSrc = toMediaUrl(file.thumbnailPath);
    const videoSrc = isVideo ? toMediaUrl(file.path) : null;

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isVideo) return;
        video.muted = rightPanelVideoMuted;
        video.volume = rightPanelVideoMuted ? 0 : Math.max(0, Math.min(1, videoVolume));
    }, [isVideo, rightPanelVideoMuted, videoVolume, file.id]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isVideo) return;

        if (jumpIntervalRef.current) {
            clearInterval(jumpIntervalRef.current);
            jumpIntervalRef.current = null;
        }

        let disposed = false;
        let currentSegment = 0;

        const startPreview = async () => {
            if (disposed) return;

            if (rightPanelVideoPreviewMode === 'loop') {
                video.loop = true;
                video.currentTime = 0;
                if (isCenterViewerOpen) {
                    video.pause();
                    return;
                }
                void video.play().catch(() => undefined);
                return;
            }

            video.loop = false;
            const duration = video.duration;
            if (duration && !shouldFallbackSequentialPreview(duration)) {
                video.currentTime = getSequentialPreviewTime(duration, 0);
                currentSegment = 0;
            } else {
                video.currentTime = 0;
            }

            if (isCenterViewerOpen) {
                video.pause();
                return;
            }

            void video.play().catch(() => undefined);

            if (duration && !shouldFallbackSequentialPreview(duration)) {
                jumpIntervalRef.current = setInterval(() => {
                    if (!video.duration || Number.isNaN(video.duration)) return;
                    currentSegment = (currentSegment + 1) % VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS;
                    video.currentTime = getSequentialPreviewTime(video.duration, currentSegment);
                }, 2000);
            }
        };

        const handleLoadedMetadata = () => {
            void startPreview();
        };

        if (video.readyState >= 1) {
            void startPreview();
        } else {
            video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        }

        return () => {
            disposed = true;
            if (jumpIntervalRef.current) {
                clearInterval(jumpIntervalRef.current);
                jumpIntervalRef.current = null;
            }
            video.pause();
            video.currentTime = 0;
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [file.id, isCenterViewerOpen, isVideo, rightPanelVideoPreviewMode]);

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <SectionTitle>プレビュー</SectionTitle>
            <div
                className="h-[220px] bg-black flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 relative group rounded-md"
                onClick={handleClick}
                title="クリックして拡大表示"
            >
                {isVideo && videoSrc ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            className="max-w-full max-h-full object-contain"
                            autoPlay
                            muted={rightPanelVideoMuted}
                            loop={rightPanelVideoPreviewMode === 'loop'}
                            playsInline
                            preload="metadata"
                        />
                        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setRightPanelVideoMuted(!rightPanelVideoMuted);
                                }}
                                className="rounded bg-black/70 px-2 py-1 text-[11px] text-white transition hover:bg-black/85"
                                title={rightPanelVideoMuted ? '音声を再生' : 'ミュート'}
                            >
                                {rightPanelVideoMuted ? '音声OFF' : '音声ON'}
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setRightPanelVideoPreviewMode(
                                        rightPanelVideoPreviewMode === 'loop' ? 'long' : 'loop'
                                    );
                                }}
                                className="rounded bg-black/70 px-2 py-1 text-[11px] text-white transition hover:bg-black/85"
                                title={rightPanelVideoPreviewMode === 'loop' ? '長めプレビューへ切替' : 'ループ再生へ切替'}
                            >
                                {rightPanelVideoPreviewMode === 'loop' ? 'ループ' : '長め'}
                            </button>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black/50 rounded-full p-2">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    </>
                ) : isAnimated && animatedSrc ? (
                    <img
                        src={animatedSrc}
                        alt={file.name}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : thumbnailSrc ? (
                    <img
                        src={thumbnailSrc}
                        alt={file.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-surface-500">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">プレビューなし</span>
                    </div>
                )}
            </div>
        </section>
    );
});

PreviewSection.displayName = 'PreviewSection';
