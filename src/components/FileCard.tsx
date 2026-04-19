import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, FileText, Music, FileMusic } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useFileStore } from '../stores/useFileStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';
import { useTagStore } from '../stores/useTagStore';
import { useDisplayPresetStore } from '../stores/useDisplayPresetStore';

import { isAudioArchive } from '../utils/fileHelpers';
import { getDisplayPresetById, isHorizontalDisplayMode, getHorizontalThumbnailAspectRatio } from './fileCard/displayModes';
import { FileCardInfoArea } from './fileCard/FileCardInfoArea';
import { FileCardThumbnail } from './fileCard/FileCardThumbnail';
import { FileCardTagPopover } from './fileCard/FileCardTagPopover';
import { FileCardTagSummary } from './fileCard/FileCardTagSummary';
import { useFileCardHover } from './fileCard/useFileCardHover';
import type { FileCardTagSummaryRendererProps } from './fileCard/FileCardInfoArea';

function isPerfDebugEnabled(): boolean {
    return import.meta.env.DEV && (globalThis as { __MA_DEBUG_PERF?: boolean }).__MA_DEBUG_PERF === true;
}

interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (id: string, mode: 'single' | 'toggle' | 'range') => void;
    folderBadgeColor?: string | null;
    overallRating?: number;
    overallRatingAxis?: {
        name: string;
        minValue: number;
        maxValue: number;
    } | null;
}

export const FileCard = React.memo(({
    file,
    isSelected,
    isFocused = false,
    onSelect,
    folderBadgeColor = null,
    overallRating,
    overallRatingAxis = null,
}: FileCardProps) => {
    const perfDebugEnabled = isPerfDebugEnabled();

    const openLightbox = useUIStore((s) => s.openLightbox);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const archiveThumbnailAction = useSettingsStore((s) => s.archiveThumbnailAction);
    const animatedImagePreviewMode = useSettingsStore((s) => s.animatedImagePreviewMode);
    const performanceMode = useSettingsStore((s) => s.performanceMode);
    const searchDestinations = useSettingsStore((s) => s.searchDestinations);
    const showFileName = useSettingsStore((s) => s.showFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);
    const showCreatedDate = useSettingsStore((s) => s.showCreatedDate);
    const showFolderBadge = useSettingsStore((s) => s.showFolderBadge);
    const showDriveBadge = useSettingsStore((s) => s.showDriveBadge);
    const driveColors = useSettingsStore((s) => s.driveColors);
    const infoBadgeOrder = useSettingsStore((s) => s.infoBadgeOrder);
    const displayMode = useUIStore((s) => s.currentDisplayMode);
    const activeDisplayPresetId = useUIStore((s) => s.currentActiveDisplayPresetId);
    const thumbnailPresentation = useUIStore((s) => s.currentThumbnailPresentation);
    const externalDisplayPresets = useDisplayPresetStore((s) => s.presets);
    const tagPopoverTrigger = useSettingsStore((s) => s.tagPopoverTrigger);
    const tagDisplayStyle = useSettingsStore((s) => s.tagDisplayStyle);
    const isTagBorderMode = tagDisplayStyle === 'border';
    const fileCardTagOrderMode = useSettingsStore((s) => s.fileCardTagOrderMode);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const playMode = useSettingsStore((s) => s.playMode);
    const videoFlipbookSpeed = useSettingsStore((s) => s.videoFlipbookSpeed);
    const archiveFlipbookSpeed = useSettingsStore((s) => s.archiveFlipbookSpeed);
    const allTags = useTagStore((s) => s.tags);
    const tagCategories = useTagStore((s) => s.categories);

    const displayPreset = useMemo(
        () => getDisplayPresetById(activeDisplayPresetId, externalDisplayPresets, displayMode),
        [activeDisplayPresetId, externalDisplayPresets, displayMode]
    );
    const config = displayPreset.definition.layout;
    const isDetailedHorizontalMode = isHorizontalDisplayMode(displayPreset.baseDisplayMode);
    const detailedThumbnailAspectRatio = getHorizontalThumbnailAspectRatio(displayPreset.baseDisplayMode);

    const isAudioArchiveFile = useMemo(() => file.type === 'archive' && isAudioArchive(file), [file]);

    const Icon = (() => {
        if (file.type === 'video') return Play;
        if (file.type === 'audio') return Music;
        if (file.type === 'archive') return isAudioArchiveFile ? FileMusic : null;
        return FileText;
    })();

    const thumbnailBadges = useMemo(() => {
        const badges = { attributes: [] as Array<{ label: string; color: string }>, extension: '' };

        if (displayPreset.definition.hideThumbnailBadges) return badges;

        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        badges.extension = ext;

        try {
            const meta = file.metadata ? JSON.parse(file.metadata) : null;
            if (meta?.width && meta?.height && meta.height > meta.width * 1.3) {
                badges.attributes.push({ label: 'TALL', color: 'bg-indigo-800/80' });
            }
        } catch {
            // ignore
        }

        return badges;
    }, [file.name, file.metadata, displayPreset.definition.hideThumbnailBadges]);

    const extensionColor = useMemo(() => {
        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        if (['MP4', 'MOV', 'WEBM', 'AVI', 'MKV'].includes(ext)) return 'bg-blue-800/80';
        if (['ZIP', 'RAR', 'CBZ', '7Z', 'TAR', 'GZ'].includes(ext)) return 'bg-orange-800/80';
        if (['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'].includes(ext)) return 'bg-purple-800/80';
        return 'bg-emerald-800/80';
    }, [file.name]);

    const [showTagPopover, setShowTagPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tagHoverTimeoutRef = useRef<number | null>(null);
    const isOpeningFileRef = useRef(false);
    const cardRootRef = useRef<HTMLDivElement>(null);

    const hover = useFileCardHover({
        file,
        thumbnailAction,
        archiveThumbnailAction,
        animatedImagePreviewMode,
        performanceMode,
        videoFlipbookSpeed,
        archiveFlipbookSpeed,
        playMode,
        thumbnailPresentation,
    });

    const tagById = useMemo(
        () => new Map(allTags.map((tag) => [tag.id, tag])),
        [allTags]
    );

    const categoryColorById = useMemo(
        () => new Map(tagCategories.map((category) => [category.id, category.color])),
        [tagCategories]
    );

    const fileTags = useMemo(() => {
        const tagIds = fileTagsCache.get(file.id) ?? file.tags ?? [];
        const resolvedTags = [];

        for (const tagId of tagIds) {
            const tag = tagById.get(tagId);
            if (!tag) continue;
            resolvedTags.push({
                ...tag,
                categoryColor: tag.categoryId ? (categoryColorById.get(tag.categoryId) || tag.categoryColor) : undefined,
            });
        }

        return resolvedTags;
    }, [file.id, file.tags, fileTagsCache, tagById, categoryColorById]);

    const categorySortOrderById = useMemo(
        () => new Map(tagCategories.map((c) => [c.id, c.sortOrder])),
        [tagCategories]
    );

    const sortedTags = useMemo(() => {
        return [...fileTags].sort((a, b) => {
            const aCategoryOrder = a.categoryId
                ? (categorySortOrderById.get(a.categoryId) ?? 999)
                : Number.MAX_SAFE_INTEGER;
            const bCategoryOrder = b.categoryId
                ? (categorySortOrderById.get(b.categoryId) ?? 999)
                : Number.MAX_SAFE_INTEGER;

            if (aCategoryOrder !== bCategoryOrder) {
                return aCategoryOrder - bCategoryOrder;
            }

            return (a.sortOrder || 999) - (b.sortOrder || 999);
        });
    }, [fileTags, categorySortOrderById]);

    const openPopover = useCallback(() => {
        if (tagHoverTimeoutRef.current) {
            clearTimeout(tagHoverTimeoutRef.current);
            tagHoverTimeoutRef.current = null;
        }
        setShowTagPopover(true);
    }, []);

    const closePopoverWithDelay = useCallback(() => {
        tagHoverTimeoutRef.current = window.setTimeout(() => {
            setShowTagPopover(false);
        }, 150);
    }, []);

    useEffect(() => {
        return () => {
            if (tagHoverTimeoutRef.current) {
                clearTimeout(tagHoverTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (tagPopoverTrigger !== 'click') return;
        if (!showTagPopover) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setShowTagPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTagPopover, tagPopoverTrigger]);

    const TagSummaryRenderer = useCallback(({ visibleCount }: FileCardTagSummaryRendererProps) => {
        return (
            <FileCardTagSummary
                visibleCount={visibleCount}
                showTags={showTags}
                sortedTags={sortedTags}
                fileCardTagOrderMode={fileCardTagOrderMode}
                displayPreset={displayPreset}
                isTagBorderMode={isTagBorderMode}
                triggerRef={triggerRef}
                tagPopoverTrigger={tagPopoverTrigger}
                showTagPopover={showTagPopover}
                setShowTagPopover={setShowTagPopover}
                openPopover={openPopover}
                closePopoverWithDelay={closePopoverWithDelay}
            />
        );
    }, [
        showTags,
        sortedTags,
        isTagBorderMode,
        fileCardTagOrderMode,
        tagPopoverTrigger,
        showTagPopover,
        displayPreset,
        openPopover,
        closePopoverWithDelay,
    ]);

    const handleCardClick = (e: React.MouseEvent) => {
        if (e.detail === 2) return;

        if (e.shiftKey) {
            onSelect(file.id, 'range');
        } else if (e.ctrlKey || e.metaKey) {
            onSelect(file.id, 'toggle');
        } else {
            onSelect(file.id, 'single');
        }
    };

    const handleDoubleClick = async () => {
        if (isOpeningFileRef.current) return;
        isOpeningFileRef.current = true;

        const syncExternalOpenCount = async () => {
            const result = await window.electronAPI.incrementExternalOpenCount(file.id);
            if (result.success && result.externalOpenCount !== undefined) {
                useFileStore.getState().updateFileExternalOpenCount(
                    file.id,
                    result.externalOpenCount,
                    result.lastExternalOpenedAt || Date.now()
                );
            }
        };

        try {
            const { externalApps, defaultExternalApps } = useSettingsStore.getState();
            const ext = file.name.split('.').pop()?.toLowerCase() || '';

            const defaultAppId = defaultExternalApps[ext];
            if (defaultAppId) {
                const app = externalApps.find((a: { id: string; }) => a.id === defaultAppId);

                if (app) {
                    const result = await window.electronAPI.openWithApp(file.path, app.path, file.id);

                    if (!result.success) {
                        useToastStore.getState().error(result.error || '外部アプリで開けませんでした');
                        await window.electronAPI.openExternal(file.path);
                        await syncExternalOpenCount();
                    } else if (result.externalOpenCount !== undefined) {
                        useFileStore.getState().updateFileExternalOpenCount(
                            file.id,
                            result.externalOpenCount,
                            result.lastExternalOpenedAt || Date.now()
                        );
                    }
                    return;
                }
            }

            await window.electronAPI.openExternal(file.path);
            await syncExternalOpenCount();
        } finally {
            isOpeningFileRef.current = false;
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        const selectedIdsArray = Array.from(useFileStore.getState().selectedIds);
        const effectiveIds = selectedIdsArray.includes(file.id) ? selectedIdsArray : [file.id];

        const start = perfDebugEnabled ? performance.now() : 0;
        const menuPromise = window.electronAPI.showFileContextMenu(file.id, file.path, effectiveIds, searchDestinations);

        if (perfDebugEnabled) {
            menuPromise
                .then(() => {
                    console.debug('[perf][FileCard][contextMenu]', {
                        fileId: file.id,
                        selectedCount: effectiveIds.length,
                        status: 'resolved',
                        elapsedMs: Number((performance.now() - start).toFixed(2)),
                    });
                })
                .catch((error) => {
                    console.debug('[perf][FileCard][contextMenu]', {
                        fileId: file.id,
                        selectedCount: effectiveIds.length,
                        status: 'error',
                        error: error instanceof Error ? error.message : String(error),
                        elapsedMs: Number((performance.now() - start).toFixed(2)),
                    });
                });
        }
    };

    return (
        <div
            ref={cardRootRef}
            onClick={handleCardClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={hover.handleMouseEnter}
            onMouseLeave={hover.handleMouseLeave}
            onMouseMove={hover.handleMouseMove}
            style={{ width: '100%', height: '100%' }}
            // ⚠️ overflow-hidden を削除するとサムネイルの角丸やレイアウトが崩れる。
            // カード外に要素を表示する場合は React Portal (createPortal) を使用すること。
            className={`
                rounded-lg overflow-hidden border-2 flex ${isDetailedHorizontalMode ? 'flex-row' : 'flex-col'} cursor-pointer
                transition-all duration-200 ease-out
                ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20 scale-[1.02] bg-surface-800'
                    : isFocused
                        ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20 bg-surface-800'
                        : 'border-surface-700/40 bg-surface-800 hover:border-cyan-500/40 hover:bg-surface-750 hover:shadow-md hover:shadow-black/30'}
            `}
        >
            <FileCardThumbnail
                file={file}
                isSelected={isSelected}
                isAudioArchiveFile={isAudioArchiveFile}
                isDetailedHorizontalMode={isDetailedHorizontalMode}
                detailedThumbnailAspectRatio={detailedThumbnailAspectRatio}
                aspectRatio={config.aspectRatio}
                displayImagePath={hover.displayImagePath}
                displayImageSrc={hover.displayImageSrc}
                hoverZoomImageSrc={hover.hoverZoomImageSrc}
                thumbnailObjectFitClass={hover.thumbnailObjectFitClass}
                shouldPlayVideo={hover.shouldPlayVideo}
                isHovered={hover.isHovered}
                preloadState={hover.preloadState}
                canHoverFramePreview={hover.canHoverFramePreview}
                canFlipbookArchive={hover.canFlipbookArchive}
                activePreviewFrames={hover.activePreviewFrames}
                scrubIndex={hover.scrubIndex}
                showDuration={showDuration}
                hideThumbnailBadges={!!displayPreset.definition.hideThumbnailBadges}
                thumbnailBadges={thumbnailBadges}
                extensionColor={extensionColor}
                overallRating={overallRating}
                overallRatingAxis={overallRatingAxis}
                shouldShowHoverZoomPreview={hover.shouldShowHoverZoomPreview}
                hoverZoomLayout={hover.hoverZoomLayout}
                thumbnailAreaRef={hover.thumbnailAreaRef}
                videoRef={hover.videoRef}
                zoomButtonRef={hover.zoomButtonRef}
                onZoomClick={(e) => {
                    e.stopPropagation();
                    openLightbox(file);
                }}
                onZoomButtonMouseEnter={hover.handleZoomButtonMouseEnter}
                onZoomButtonMouseLeave={hover.handleZoomButtonMouseLeave}
                onVideoError={() => hover.setHoveredPreview(null)}
            />

            {/* 情報エリア */}
            {showFileName && (
                <div className={isDetailedHorizontalMode ? 'h-full flex-1 min-w-0 border-l border-surface-700/60' : ''}>
                    <FileCardInfoArea
                        file={file}
                        displayPreset={displayPreset}
                        infoAreaHeight={config.infoAreaHeight}
                        showFileSize={showFileSize}
                        showCreatedDate={showCreatedDate}
                        showFolderBadge={showFolderBadge}
                        showDriveBadge={showDriveBadge}
                        driveColors={driveColors}
                        infoBadgeOrder={infoBadgeOrder}
                        folderBadgeColor={folderBadgeColor}
                        TagSummaryRenderer={TagSummaryRenderer}
                    />
                </div>
            )}

            <FileCardTagPopover
                show={showTagPopover}
                triggerRef={triggerRef}
                popoverRef={popoverRef}
                sortedTags={sortedTags}
                isTagBorderMode={isTagBorderMode}
                tagPopoverTrigger={tagPopoverTrigger}
                onClose={() => setShowTagPopover(false)}
                onMouseEnter={openPopover}
                onMouseLeave={closePopoverWithDelay}
            />
        </div>
    );
});

FileCard.displayName = 'FileCard';
