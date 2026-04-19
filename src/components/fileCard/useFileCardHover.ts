import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { getArchiveImageCount, isAudioArchive } from '../../utils/fileHelpers';
import {
    getRandomSafeTime,
    getSequentialPreviewTime,
    shouldFallbackSequentialPreview,
    VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS,
} from '../../utils/videoPreview';
import { useUIStore } from '../../stores/useUIStore';
import { useAnimatedPreviewSlots } from './useAnimatedPreviewSlots';

const ARCHIVE_PREVIEW_FRAME_COUNT = 8;

export const VIDEO_FLIPBOOK_INTERVAL_MS = {
    slow: 840,
    normal: 520,
    fast: 220,
} as const;

export const ARCHIVE_FLIPBOOK_INTERVAL_MS = {
    slow: 760,
    normal: 460,
    fast: 280,
} as const;

type ThumbnailAction = 'scrub' | 'flipbook' | 'play';
type ArchiveThumbnailAction = 'flipbook' | 'none';
type AnimatedImagePreviewMode = 'hover' | 'visible' | 'disabled';
type FlipbookSpeed = keyof typeof VIDEO_FLIPBOOK_INTERVAL_MS;

type UseFileCardHoverParams = {
    file: MediaFile;
    thumbnailAction: ThumbnailAction;
    archiveThumbnailAction: ArchiveThumbnailAction;
    animatedImagePreviewMode: AnimatedImagePreviewMode;
    performanceMode: boolean;
    videoFlipbookSpeed: FlipbookSpeed;
    archiveFlipbookSpeed: FlipbookSpeed;
    playMode: {
        jumpType: 'light' | 'random' | 'sequential';
        jumpInterval: number;
    };
    thumbnailPresentation: string;
};

export function useFileCardHover({
    file,
    thumbnailAction,
    archiveThumbnailAction,
    animatedImagePreviewMode,
    performanceMode,
    videoFlipbookSpeed,
    archiveFlipbookSpeed,
    playMode,
    thumbnailPresentation,
}: UseFileCardHoverParams) {
    const hoveredPreviewId = useUIStore((s) => s.hoveredPreviewId);
    const setHoveredPreview = useUIStore((s) => s.setHoveredPreview);

    const isAudioArchiveFile = useMemo(() => file.type === 'archive' && isAudioArchive(file), [file]);
    const archiveImageCount = getArchiveImageCount(file);

    const [isHovered, setIsHovered] = useState(false);
    const [scrubIndex, setScrubIndex] = useState(0);
    const [preloadState, setPreloadState] = useState<'idle' | 'loading' | 'ready'>('idle');
    const [archivePreviewFrames, setArchivePreviewFrames] = useState<string[]>([]);
    const [archivePreviewFetchState, setArchivePreviewFetchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [animatedPreviewSessionKey, setAnimatedPreviewSessionKey] = useState(0);
    const [isThumbnailVisible, setIsThumbnailVisible] = useState(false);
    const [isZoomButtonHovered, setIsZoomButtonHovered] = useState(false);
    const [hoverZoomLayout, setHoverZoomLayout] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    const preloadedImages = useRef<HTMLImageElement[]>([]);
    const hoverTimeoutRef = useRef<number | null>(null);
    const flipbookIntervalRef = useRef<number | null>(null);
    const thumbnailAreaRef = useRef<HTMLDivElement>(null);
    const hoverZoomDelayRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playDelayRef = useRef<number | null>(null);
    const jumpIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const zoomButtonRef = useRef<HTMLButtonElement>(null);

    const isAnimatedImage = useMemo(() => file.type === 'image' && file.isAnimated === true, [file.type, file.isAnimated]);

    const { isVisibleAnimatedPreviewActive } = useAnimatedPreviewSlots({
        fileId: file.id,
        isAnimatedImage,
        animatedImagePreviewMode,
        performanceMode,
        isThumbnailVisible,
    });

    const imageDimensions = useMemo(() => {
        try {
            const meta = file.metadata ? JSON.parse(file.metadata) : null;
            const width = Number(meta?.width);
            const height = Number(meta?.height);
            if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
                return { width, height };
            }
        } catch {
            // ignore malformed metadata
        }
        return null;
    }, [file.metadata]);

    const canFlipbookArchive = file.type === 'archive'
        && archiveThumbnailAction === 'flipbook'
        && !isAudioArchiveFile
        && (archiveImageCount ?? 0) > 1;

    const previewFrames = useMemo(() => {
        if (!file.previewFrames) return [];
        return file.previewFrames.split(',').filter(Boolean);
    }, [file.previewFrames]);

    const activePreviewFrames = useMemo(() => {
        if (file.type === 'video') return previewFrames;
        if (canFlipbookArchive) return archivePreviewFrames;
        return [];
    }, [file.type, previewFrames, canFlipbookArchive, archivePreviewFrames]);

    const canScrubPreview = file.type === 'video';
    const canFlipbookPreview = (thumbnailAction === 'flipbook' && file.type === 'video') || canFlipbookArchive;
    const canHoverFramePreview = (thumbnailAction === 'scrub' && canScrubPreview) || canFlipbookPreview;

    const shouldPlayVideo = useMemo(() => {
        return hoveredPreviewId === file.id && thumbnailAction === 'play' && file.type === 'video';
    }, [hoveredPreviewId, file.id, file.type, thumbnailAction]);

    const shouldAnimateImagePreview = useMemo(() => {
        return (
            isAnimatedImage &&
            !performanceMode &&
            (
                (animatedImagePreviewMode === 'hover' && isHovered) ||
                (animatedImagePreviewMode === 'visible' && isVisibleAnimatedPreviewActive)
            )
        );
    }, [isAnimatedImage, isHovered, animatedImagePreviewMode, isVisibleAnimatedPreviewActive, performanceMode]);

    const shouldShowHoverZoomPreview = useMemo(() => {
        return (
            isZoomButtonHovered &&
            (file.type === 'image' || file.type === 'archive') &&
            Boolean(file.type === 'archive' ? file.thumbnailPath : (file.path || file.thumbnailPath))
        );
    }, [file.path, file.thumbnailPath, file.type, isZoomButtonHovered]);

    const thumbnailObjectFitClass = thumbnailPresentation === 'contain' ? 'object-contain' : 'object-cover';

    const clearJumpInterval = useCallback(() => {
        if (jumpIntervalRef.current) {
            clearInterval(jumpIntervalRef.current);
            jumpIntervalRef.current = null;
        }
    }, []);

    const clearFlipbookInterval = useCallback(() => {
        if (flipbookIntervalRef.current) {
            clearInterval(flipbookIntervalRef.current);
            flipbookIntervalRef.current = null;
        }
    }, []);

    const preloadFrameImages = useCallback((framePaths: string[]) => {
        const images = framePaths.map((framePath) => {
            const img = new Image();
            img.src = toMediaUrl(framePath);
            return img;
        });
        preloadedImages.current = images;

        return Promise.all(images.map((img) =>
            new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            })
        ));
    }, []);

    useEffect(() => {
        return () => {
            clearFlipbookInterval();
        };
    }, [clearFlipbookInterval]);

    useEffect(() => {
        return () => {
            if (hoverZoomDelayRef.current) {
                clearTimeout(hoverZoomDelayRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setArchivePreviewFrames([]);
        setArchivePreviewFetchState('idle');
        setPreloadState('idle');
        setScrubIndex(0);
    }, [file.id]);

    const HOVER_ZOOM_PREVIEW_MAX_WIDTH = 460;
    const HOVER_ZOOM_PREVIEW_MAX_HEIGHT = 520;
    const HOVER_ZOOM_PREVIEW_MIN_SIZE = 240;
    const HOVER_ZOOM_PREVIEW_GAP = 2;

    useEffect(() => {
        if (!shouldShowHoverZoomPreview || !zoomButtonRef.current) {
            setHoverZoomLayout(null);
            return;
        }

        const updatePosition = () => {
            const buttonRect = zoomButtonRef.current?.getBoundingClientRect();
            if (!buttonRect) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const gap = HOVER_ZOOM_PREVIEW_GAP;
            const margin = 12;
            const aspectRatio = imageDimensions ? (imageDimensions.width / imageDimensions.height) : 1;
            const maxWidth = Math.max(
                HOVER_ZOOM_PREVIEW_MIN_SIZE,
                Math.min(HOVER_ZOOM_PREVIEW_MAX_WIDTH, Math.floor(viewportWidth * 0.3))
            );
            const maxHeight = Math.max(
                HOVER_ZOOM_PREVIEW_MIN_SIZE,
                Math.min(HOVER_ZOOM_PREVIEW_MAX_HEIGHT, Math.floor(viewportHeight * 0.62))
            );

            let previewWidth = maxWidth;
            let previewHeight = previewWidth / aspectRatio;
            if (previewHeight > maxHeight) {
                previewHeight = maxHeight;
                previewWidth = previewHeight * aspectRatio;
            }

            previewWidth = Math.round(previewWidth);
            previewHeight = Math.round(previewHeight);

            const preferredLeft = buttonRect.right + gap;
            const fallbackLeft = buttonRect.left - previewWidth - gap;

            const left = preferredLeft + previewWidth <= viewportWidth - margin
                ? preferredLeft
                : fallbackLeft >= margin
                    ? fallbackLeft
                    : Math.max(margin, viewportWidth - previewWidth - margin);

            const anchorTop = buttonRect.top - previewHeight + HOVER_ZOOM_PREVIEW_GAP;
            const top = Math.min(
                Math.max(margin, anchorTop),
                Math.max(margin, viewportHeight - previewHeight - margin)
            );

            setHoverZoomLayout({ top, left, width: previewWidth, height: previewHeight });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [imageDimensions, shouldShowHoverZoomPreview]);

    useEffect(() => {
        if (!isAnimatedImage || !thumbnailAreaRef.current) {
            setIsThumbnailVisible(false);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry) return;
                setIsThumbnailVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35);
            },
            { threshold: [0, 0.35] }
        );

        observer.observe(thumbnailAreaRef.current);
        return () => observer.disconnect();
    }, [isAnimatedImage]);

    useEffect(() => {
        if (!isVisibleAnimatedPreviewActive || animatedImagePreviewMode !== 'visible') return;
        setAnimatedPreviewSessionKey((prev) => prev + 1);
    }, [isVisibleAnimatedPreviewActive, animatedImagePreviewMode]);

    const handleMouseEnter = useCallback(() => {
        setHoveredPreview(file.id);

        if (performanceMode) return;

        hoverTimeoutRef.current = window.setTimeout(() => {
            setIsHovered(true);

            if (isAnimatedImage && animatedImagePreviewMode === 'hover') {
                setAnimatedPreviewSessionKey((prev) => prev + 1);
            }

            if (canHoverFramePreview && activePreviewFrames.length > 0 && preloadState === 'idle') {
                setPreloadState('loading');
                void preloadFrameImages(activePreviewFrames).then(() => setPreloadState('ready'));
                return;
            }

            if (canFlipbookArchive && activePreviewFrames.length === 0 && archivePreviewFetchState === 'idle') {
                setArchivePreviewFetchState('loading');
                setPreloadState('loading');

                void window.electronAPI.getArchivePreviewFrames(file.path, ARCHIVE_PREVIEW_FRAME_COUNT)
                    .then((frames) => {
                        if (frames.length === 0) {
                            setArchivePreviewFrames([]);
                            setArchivePreviewFetchState('error');
                            setPreloadState('idle');
                            return;
                        }

                        setArchivePreviewFrames(frames);
                        setArchivePreviewFetchState('ready');
                        return preloadFrameImages(frames).then(() => setPreloadState('ready'));
                    })
                    .catch(() => {
                        setArchivePreviewFrames([]);
                        setArchivePreviewFetchState('error');
                        setPreloadState('idle');
                    });
            }
        }, 100);
    }, [
        animatedImagePreviewMode,
        isAnimatedImage,
        file.id,
        file.path,
        activePreviewFrames,
        preloadState,
        performanceMode,
        setHoveredPreview,
        canHoverFramePreview,
        canFlipbookArchive,
        archivePreviewFetchState,
        preloadFrameImages,
    ]);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (playDelayRef.current) {
            clearTimeout(playDelayRef.current);
            playDelayRef.current = null;
        }
        clearFlipbookInterval();
        setIsHovered(false);
        setIsZoomButtonHovered(false);
        setScrubIndex(0);
        if (hoverZoomDelayRef.current) {
            clearTimeout(hoverZoomDelayRef.current);
            hoverZoomDelayRef.current = null;
        }
        setHoveredPreview(null);
    }, [clearFlipbookInterval, setHoveredPreview]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (thumbnailAction !== 'scrub' || !canScrubPreview || preloadState !== 'ready' || activePreviewFrames.length === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const index = Math.floor(percentage * activePreviewFrames.length);
        setScrubIndex(Math.max(0, Math.min(index, activePreviewFrames.length - 1)));
    }, [thumbnailAction, canScrubPreview, preloadState, activePreviewFrames.length]);

    // コマ送りモード effect
    useEffect(() => {
        const shouldFlipbook =
            isHovered &&
            canFlipbookPreview &&
            (file.type === 'video' || canFlipbookArchive) &&
            preloadState === 'ready' &&
            activePreviewFrames.length > 1;

        if (!shouldFlipbook) {
            clearFlipbookInterval();
            return;
        }

        clearFlipbookInterval();
        const activeFlipbookSpeed = file.type === 'archive' ? archiveFlipbookSpeed : videoFlipbookSpeed;
        const flipbookIntervalMs = file.type === 'archive'
            ? ARCHIVE_FLIPBOOK_INTERVAL_MS[activeFlipbookSpeed]
            : VIDEO_FLIPBOOK_INTERVAL_MS[activeFlipbookSpeed];
        flipbookIntervalRef.current = window.setInterval(() => {
            setScrubIndex((prev) => (prev + 1) % activePreviewFrames.length);
        }, flipbookIntervalMs);

        return () => {
            clearFlipbookInterval();
        };
    }, [isHovered, canFlipbookPreview, file.type, canFlipbookArchive, preloadState, activePreviewFrames.length, videoFlipbookSpeed, archiveFlipbookSpeed, clearFlipbookInterval]);

    // Video 再生制御 effect
    useEffect(() => {
        const shouldPlay = hoveredPreviewId === file.id && thumbnailAction === 'play' && file.type === 'video';

        if (!shouldPlay || !videoRef.current) {
            clearJumpInterval();
            return;
        }

        const video = videoRef.current;
        let cancelled = false;
        let currentSegment = 0;

        const startPlayback = async () => {
            if (cancelled) return;
            const duration = video.duration;

            if (duration && duration > 2) {
                const effectiveJumpType =
                    playMode.jumpType === 'sequential' && shouldFallbackSequentialPreview(duration)
                        ? 'light'
                        : playMode.jumpType;

                if (effectiveJumpType === 'random') {
                    video.currentTime = getRandomSafeTime(duration);
                } else if (effectiveJumpType === 'sequential') {
                    video.currentTime = getSequentialPreviewTime(duration, 0);
                    currentSegment = 0;
                }
            }

            video.muted = true;
            video.volume = 0;

            try {
                await video.play();
            } catch {
                return;
            }

            const effectiveJumpType =
                playMode.jumpType === 'sequential' && shouldFallbackSequentialPreview(video.duration)
                    ? 'light'
                    : playMode.jumpType;

            if (effectiveJumpType !== 'light') {
                jumpIntervalRef.current = setInterval(() => {
                    if (!video.duration || isNaN(video.duration)) return;

                    if (effectiveJumpType === 'random') {
                        video.currentTime = getRandomSafeTime(video.duration, video.currentTime);
                    } else if (effectiveJumpType === 'sequential') {
                        currentSegment = (currentSegment + 1) % VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS;
                        video.currentTime = getSequentialPreviewTime(video.duration, currentSegment);
                    }
                }, playMode.jumpInterval);
            }
        };

        const handleLoadedMetadata = () => {
            startPlayback();
        };

        if (video.readyState >= 1) {
            startPlayback();
        } else {
            video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        }

        return () => {
            cancelled = true;
            clearJumpInterval();
            video.pause();
            video.currentTime = 0;
        };
    }, [hoveredPreviewId, file.id, file.type, thumbnailAction, playMode.jumpType, playMode.jumpInterval, clearJumpInterval]);

    const displayImagePath = useMemo(() => {
        if (
            isHovered &&
            preloadState === 'ready' &&
            activePreviewFrames.length > 0 &&
            ((thumbnailAction === 'scrub' && canScrubPreview) || canFlipbookPreview)
        ) {
            return activePreviewFrames[scrubIndex];
        }
        if (shouldAnimateImagePreview) {
            return file.path;
        }
        return file.thumbnailPath;
    }, [isHovered, preloadState, activePreviewFrames, scrubIndex, file.path, file.thumbnailPath, thumbnailAction, canScrubPreview, canFlipbookPreview, shouldAnimateImagePreview]);

    const displayImageSrc = useMemo(() => {
        if (!displayImagePath) return '';
        const base = toMediaUrl(displayImagePath);
        if (shouldAnimateImagePreview && displayImagePath === file.path) {
            return `${base}?animPreview=${animatedPreviewSessionKey}`;
        }
        return base;
    }, [displayImagePath, shouldAnimateImagePreview, file.path, animatedPreviewSessionKey]);

    const hoverZoomImageSrc = useMemo(() => {
        const sourcePath = file.type === 'archive'
            ? file.thumbnailPath
            : (file.path || file.thumbnailPath);
        if (!sourcePath) return '';
        const base = toMediaUrl(sourcePath);
        return file.isAnimated ? `${base}?hoverZoom=${animatedPreviewSessionKey}` : base;
    }, [file.isAnimated, file.path, file.thumbnailPath, file.type, animatedPreviewSessionKey]);

    const handleZoomButtonMouseEnter = useCallback(() => {
        const HOVER_ZOOM_PREVIEW_DELAY_MS = 600;
        if (hoverZoomDelayRef.current) {
            clearTimeout(hoverZoomDelayRef.current);
        }
        hoverZoomDelayRef.current = window.setTimeout(() => {
            setIsZoomButtonHovered(true);
            hoverZoomDelayRef.current = null;
        }, HOVER_ZOOM_PREVIEW_DELAY_MS);
    }, []);

    const handleZoomButtonMouseLeave = useCallback(() => {
        if (hoverZoomDelayRef.current) {
            clearTimeout(hoverZoomDelayRef.current);
            hoverZoomDelayRef.current = null;
        }
        setIsZoomButtonHovered(false);
    }, []);

    return {
        isHovered,
        scrubIndex,
        preloadState,
        archivePreviewFrames,
        isZoomButtonHovered,
        hoverZoomLayout,
        shouldPlayVideo,
        shouldAnimateImagePreview,
        shouldShowHoverZoomPreview,
        canFlipbookArchive,
        canHoverFramePreview,
        canFlipbookPreview,
        canScrubPreview,
        activePreviewFrames,
        displayImagePath,
        displayImageSrc,
        hoverZoomImageSrc,
        thumbnailObjectFitClass,
        thumbnailAreaRef,
        videoRef,
        zoomButtonRef,
        handleMouseEnter,
        handleMouseLeave,
        handleMouseMove,
        handleZoomButtonMouseEnter,
        handleZoomButtonMouseLeave,
        setHoveredPreview,
    };
}
