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
    const rightPanelVideoJumpInterval = useSettingsStore((s) => s.rightPanelVideoJumpInterval);
    const setRightPanelVideoMuted = useSettingsStore((s) => s.setRightPanelVideoMuted);
    const setRightPanelVideoPreviewMode = useSettingsStore((s) => s.setRightPanelVideoPreviewMode);
    const videoRef = useRef<HTMLVideoElement>(null);
    const jumpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastActivePreviewModeRef = useRef<'loop' | 'long'>(
        rightPanelVideoPreviewMode === 'long' ? 'long' : 'loop'
    );

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

    const animatedSrc = isAnimated ? toMediaUrl(file.path) : null;
    const thumbnailSrc = toMediaUrl(file.thumbnailPath);
    const videoSrc = isVideo ? toMediaUrl(file.path) : null;
    const backgroundSrc = isVideo ? thumbnailSrc : (animatedSrc || thumbnailSrc);
    useEffect(() => {
        if (rightPanelVideoPreviewMode !== 'off') {
            lastActivePreviewModeRef.current = rightPanelVideoPreviewMode;
        }
    }, [rightPanelVideoPreviewMode]);

    const activePreviewMode = rightPanelVideoPreviewMode === 'off'
        ? lastActivePreviewModeRef.current
        : rightPanelVideoPreviewMode;
    const rightPanelPreviewModeLabel = activePreviewMode === 'loop'
        ? 'ループ'
        : '固定間隔';
    const nextRightPanelPreviewMode = activePreviewMode === 'loop'
        ? 'long'
        : 'loop';
    const nextRightPanelPreviewModeTitle = activePreviewMode === 'loop'
        ? '固定間隔プレビューへ切替'
        : 'ループ再生へ切替';
    const currentPreviewModeTitle = activePreviewMode === 'loop'
        ? '現在: ループ再生'
        : '現在: 固定間隔プレビュー';

    const toggleVideoPreviewPlayback = () => {
        setRightPanelVideoPreviewMode(
            rightPanelVideoPreviewMode === 'off'
                ? lastActivePreviewModeRef.current
                : 'off'
        );
    };

    const handlePreviewClick = () => {
        openLightbox(file);
    };

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

            if (rightPanelVideoPreviewMode === 'off') {
                video.loop = false;
                video.pause();
                video.currentTime = 0;
                return;
            }

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
                }, rightPanelVideoJumpInterval);
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
    }, [file.id, isCenterViewerOpen, isVideo, rightPanelVideoJumpInterval, rightPanelVideoPreviewMode]);

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <div className="flex items-center justify-between gap-2">
                <SectionTitle>プレビュー</SectionTitle>
                {isVideo && (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleVideoPreviewPlayback();
                            }}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                rightPanelVideoPreviewMode === 'off'
                                    ? 'border-surface-500 bg-surface-800 text-surface-300 hover:bg-surface-700'
                                    : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                            }`}
                            title={rightPanelVideoPreviewMode === 'off' ? 'プレビューを再開' : 'プレビューを停止'}
                            aria-label={rightPanelVideoPreviewMode === 'off' ? 'プレビューを再開' : 'プレビューを停止'}
                        >
                            {rightPanelVideoPreviewMode === 'off' ? (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M6 5h4v14H6z" />
                                    <path d="M14 5h4v14h-4z" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setRightPanelVideoMuted(!rightPanelVideoMuted);
                            }}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                rightPanelVideoMuted
                                    ? 'border-surface-500 bg-surface-800 text-surface-300 hover:bg-surface-700'
                                    : 'border-sky-500/60 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20'
                            }`}
                            title={rightPanelVideoMuted ? '音声を再生' : 'ミュート'}
                            aria-label={rightPanelVideoMuted ? '音声を再生' : 'ミュート'}
                        >
                            {rightPanelVideoMuted ? (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                                    <path d="m17 9 4 6" />
                                    <path d="m21 9-4 6" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                                    <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setRightPanelVideoPreviewMode(nextRightPanelPreviewMode);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-surface-500 bg-surface-800 text-surface-300 transition hover:bg-surface-700"
                            title={`${currentPreviewModeTitle} / ${nextRightPanelPreviewModeTitle}`}
                            aria-label={`${currentPreviewModeTitle} / ${nextRightPanelPreviewModeTitle}`}
                        >
                            {activePreviewMode === 'loop' ? (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M17 2v4h-4" />
                                    <path d="M7 22v-4h4" />
                                    <path d="M20 11a8 8 0 0 0-13.66-5.66L3 9" />
                                    <path d="M4 13a8 8 0 0 0 13.66 5.66L21 15" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M4 6h16" />
                                    <path d="M7 12h10" />
                                    <path d="M10 18h4" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}
            </div>
            <div
                className="h-[208px] bg-black flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 relative group rounded-md"
                onClick={handlePreviewClick}
                title="クリックして拡大表示"
            >
                {backgroundSrc && (
                    <>
                        <img
                            src={backgroundSrc}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
                        />
                        <div className="absolute inset-0 bg-black/45" />
                    </>
                )}
                {isVideo && videoSrc ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            className="relative z-[1] block h-full w-full object-contain"
                            autoPlay={rightPanelVideoPreviewMode !== 'off'}
                            muted={rightPanelVideoMuted}
                            loop={rightPanelVideoPreviewMode === 'loop'}
                            playsInline
                            preload="metadata"
                        />
                    </>
                ) : isAnimated && animatedSrc ? (
                    <img
                        src={animatedSrc}
                        alt={file.name}
                        className="relative z-[1] block h-full w-full object-contain"
                    />
                ) : thumbnailSrc ? (
                    <img
                        src={thumbnailSrc}
                        alt={file.name}
                        className="relative z-[1] block h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-2 text-surface-500">
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
