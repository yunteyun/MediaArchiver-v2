import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, FileText, Image as ImageIcon, Archive, Loader, Music, FileMusic, Clapperboard, Maximize2 } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useFileStore } from '../stores/useFileStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTagStore, type Tag } from '../stores/useTagStore';

import { toMediaUrl } from '../utils/mediaPath';
import { isAudioArchive } from '../utils/fileHelpers';
import {
    getRandomSafeTime,
    getSequentialPreviewTime,
    shouldFallbackSequentialPreview,
    VIDEO_PREVIEW_SEQUENTIAL_SEGMENTS,
} from '../utils/videoPreview';
import { FileCardInfoArea } from './fileCard/FileCardInfoArea';
import { getDisplayModeDefinition } from './fileCard/displayModes';
import type { DisplayMode, FileCardTagOrderMode, TagPopoverTrigger } from '../stores/useSettingsStore';
import type { FileCardTagSummaryRendererProps } from './fileCard/FileCardInfoArea';

// 明るい背景色のタグで暗い文字色を使うためのヘルパー
function getTagTextColor(bgColor: string): string {
    // CSS名前付き色やTailwind色名から明るさを判定
    // orange, yellow, amber, lime は暗い文字色
    const lightColors = ['orange', 'yellow', 'amber', 'lime'];
    const colorLower = bgColor.toLowerCase();
    if (lightColors.some(c => colorLower.includes(c))) return '#1a1a2e';
    return '#FFFFFF';
}

// 色名文字列を実際のCSS色値にマッピング（TagBadge.tsxと一致）
function getTagBackgroundColor(colorName: string | undefined): string {
    if (!colorName) return '#4b5563'; // gray-600
    const colorMap: Record<string, string> = {
        gray: '#4b5563',      // gray-600
        red: '#dc2626',       // red-600
        orange: '#ea580c',    // orange-600
        amber: '#d97706',     // amber-600
        yellow: '#f59e0b',    // amber-500 (yellowはamber-500に統一)
        lime: '#65a30d',      // lime-600
        green: '#16a34a',     // green-600
        emerald: '#059669',   // emerald-600
        teal: '#0d9488',      // teal-600
        cyan: '#0891b2',      // cyan-600
        sky: '#0284c7',       // sky-600
        blue: '#2563eb',      // blue-600
        indigo: '#4f46e5',    // indigo-600
        violet: '#7c3aed',    // violet-600
        purple: '#9333ea',    // purple-600
        fuchsia: '#c026d3',   // fuchsia-600
        pink: '#db2777',      // pink-600
        rose: '#e11d48',      // rose-600
    };
    const color = colorMap[colorName];
    return color !== undefined ? color : (colorMap.gray as string); // フォールバック: gray
}

type TagSummaryUiConfig = {
    tagChipPaddingClass: string;
    tagChipTextClass: string;
    tagChipRadiusClass: string;
    tagChipMaxWidthClass: string;
};

type FileCardTagSummaryRowProps = {
    visibleTags: Tag[];
    hiddenCount: number;
    isTagBorderMode: boolean;
    tagSummaryUi: TagSummaryUiConfig;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    onMoreClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMoreMouseEnter: () => void;
    onMoreMouseLeave: () => void;
};

type FileCardTagSummaryProps = {
    visibleCount: number;
    showTags: boolean;
    sortedTags: Tag[];
    fileCardTagOrderMode: FileCardTagOrderMode;
    displayMode: DisplayMode;
    isTagBorderMode: boolean;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    tagPopoverTrigger: TagPopoverTrigger;
    showTagPopover: boolean;
    setShowTagPopover: React.Dispatch<React.SetStateAction<boolean>>;
    openPopover: () => void;
    closePopoverWithDelay: () => void;
};

function getTagSummaryUiConfig(displayMode: DisplayMode): TagSummaryUiConfig {
    const isStandardDetailedMode = displayMode === 'standard' || displayMode === 'standardLarge';
    const isMangaMode = displayMode === 'manga';

    if (isStandardDetailedMode) {
        return {
            tagChipPaddingClass: 'px-1.5 py-1',
            tagChipTextClass: 'text-[9px] leading-none',
            tagChipRadiusClass: 'rounded-md',
            tagChipMaxWidthClass: 'max-w-[90px]',
        };
    }

    if (isMangaMode) {
        return {
            tagChipPaddingClass: 'px-1.5 py-0.5',
            tagChipTextClass: 'text-[8px]',
            tagChipRadiusClass: 'rounded',
            tagChipMaxWidthClass: 'max-w-[60px]',
        };
    }

    return {
        tagChipPaddingClass: 'px-1.5 py-0.5',
        tagChipTextClass: 'text-[8px]',
        tagChipRadiusClass: 'rounded',
        tagChipMaxWidthClass: 'max-w-[60px]',
    };
}

const FileCardTagSummaryRow = React.memo(({
    visibleTags,
    hiddenCount,
    isTagBorderMode,
    tagSummaryUi,
    triggerRef,
    onMoreClick,
    onMoreMouseEnter,
    onMoreMouseLeave,
}: FileCardTagSummaryRowProps) => {
    return (
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1 overflow-hidden">
            {visibleTags.map(tag => (
                <span
                    key={tag.id}
                    className={`inline-flex min-w-0 ${tagSummaryUi.tagChipMaxWidthClass} items-center ${tagSummaryUi.tagChipPaddingClass} ${tagSummaryUi.tagChipTextClass} font-bold whitespace-nowrap ${tagSummaryUi.tagChipRadiusClass} ${isTagBorderMode ? 'border-l-2' : ''}`}
                    style={isTagBorderMode ? {
                        backgroundColor: 'rgba(55, 65, 81, 0.9)',
                        color: '#e5e7eb',
                        borderLeftColor: getTagBackgroundColor(tag.categoryColor || tag.color || ''),
                        opacity: 0.85
                    } : {
                        backgroundColor: getTagBackgroundColor(tag.categoryColor || tag.color || ''),
                        color: getTagTextColor(tag.categoryColor || tag.color || ''),
                        borderColor: getTagBackgroundColor(tag.categoryColor || tag.color || ''),
                        opacity: 0.85
                    }}
                >
                    <span className="truncate">#{tag.name}</span>
                </span>
            ))}
            {hiddenCount > 0 && (
                <button
                    ref={triggerRef}
                    onClick={onMoreClick}
                    onMouseEnter={onMoreMouseEnter}
                    onMouseLeave={onMoreMouseLeave}
                    className={`${tagSummaryUi.tagChipPaddingClass} ${tagSummaryUi.tagChipTextClass} font-bold whitespace-nowrap ${tagSummaryUi.tagChipRadiusClass} bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors cursor-pointer`}
                >
                    +{hiddenCount}
                </button>
            )}
        </div>
    );
});

FileCardTagSummaryRow.displayName = 'FileCardTagSummaryRow';

const FileCardTagSummary = React.memo(({
    visibleCount,
    showTags,
    sortedTags,
    fileCardTagOrderMode,
    displayMode,
    isTagBorderMode,
    triggerRef,
    tagPopoverTrigger,
    showTagPopover,
    setShowTagPopover,
    openPopover,
    closePopoverWithDelay,
}: FileCardTagSummaryProps) => {
    if (!showTags || sortedTags.length === 0) return null;

    const tagSummaryUi = getTagSummaryUiConfig(displayMode);
    const visibleTags = fileCardTagOrderMode === 'strict'
        ? sortedTags.slice(0, visibleCount)
        : getBalancedSummaryTags(sortedTags, visibleCount);
    const hiddenCount = Math.max(0, sortedTags.length - visibleCount);

    return (
        <FileCardTagSummaryRow
            visibleTags={visibleTags}
            hiddenCount={hiddenCount}
            isTagBorderMode={isTagBorderMode}
            tagSummaryUi={tagSummaryUi}
            triggerRef={triggerRef}
            onMoreClick={(e) => {
                e.stopPropagation();
                if (tagPopoverTrigger === 'click') setShowTagPopover(!showTagPopover);
            }}
            onMoreMouseEnter={() => {
                if (tagPopoverTrigger === 'hover') openPopover();
            }}
            onMoreMouseLeave={() => {
                if (tagPopoverTrigger === 'hover') closePopoverWithDelay();
            }}
        />
    );
});

FileCardTagSummary.displayName = 'FileCardTagSummary';

// FileCard の要約タグは、カテゴリが偏りすぎないようにカテゴリ単位で1つずつ選ぶ。
// 既存の sortOrder 順は維持しつつ、未分類タグはカテゴリタグの後ろに回す。
function getBalancedSummaryTags(tags: Tag[], visibleCount: number): Tag[] {
    if (visibleCount <= 0) return [];
    if (tags.length <= visibleCount) return tags.slice(0, visibleCount);

    const categorizedBuckets: Tag[][] = [];
    const bucketIndexByCategoryId = new Map<string, number>();
    const uncategorizedBucket: Tag[] = [];

    for (const tag of tags) {
        if (!tag.categoryId) {
            uncategorizedBucket.push(tag);
            continue;
        }

        let bucketIndex = bucketIndexByCategoryId.get(tag.categoryId);
        if (bucketIndex === undefined) {
            bucketIndex = categorizedBuckets.length;
            bucketIndexByCategoryId.set(tag.categoryId, bucketIndex);
            categorizedBuckets.push([]);
        }
        categorizedBuckets[bucketIndex]!.push(tag);
    }

    const buckets = uncategorizedBucket.length > 0
        ? [...categorizedBuckets, uncategorizedBucket]
        : categorizedBuckets;

    const bucketPositions = new Array(buckets.length).fill(0);
    const result: Tag[] = [];

    while (result.length < visibleCount) {
        let pickedInRound = false;

        for (let i = 0; i < buckets.length; i += 1) {
            const bucket = buckets[i];
            const pos = bucketPositions[i];
            if (!bucket || pos >= bucket.length) continue;

            result.push(bucket[pos]!);
            bucketPositions[i] = pos + 1;
            pickedInRound = true;

            if (result.length >= visibleCount) break;
        }

        if (!pickedInRound) break;
    }

    return result;
}

const MAX_VISIBLE_ANIMATED_PREVIEWS = 2;
const HOVER_ZOOM_PREVIEW_SIZE = 360;
const HOVER_ZOOM_PREVIEW_GAP = 12;
const HOVER_ZOOM_PREVIEW_DELAY_MS = 450;

const activeVisibleAnimatedPreviewIds = new Set<string>();
const visibleAnimatedPreviewListeners = new Set<() => void>();

function notifyVisibleAnimatedPreviewListeners() {
    for (const listener of visibleAnimatedPreviewListeners) {
        listener();
    }
}

function subscribeVisibleAnimatedPreviewSlots(listener: () => void) {
    visibleAnimatedPreviewListeners.add(listener);
    return () => {
        visibleAnimatedPreviewListeners.delete(listener);
    };
}

function requestVisibleAnimatedPreviewSlot(fileId: string): boolean {
    if (activeVisibleAnimatedPreviewIds.has(fileId)) return true;
    if (activeVisibleAnimatedPreviewIds.size >= MAX_VISIBLE_ANIMATED_PREVIEWS) return false;
    activeVisibleAnimatedPreviewIds.add(fileId);
    notifyVisibleAnimatedPreviewListeners();
    return true;
}

function releaseVisibleAnimatedPreviewSlot(fileId: string) {
    if (!activeVisibleAnimatedPreviewIds.delete(fileId)) return;
    notifyVisibleAnimatedPreviewListeners();
}

interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (id: string, mode: 'single' | 'toggle' | 'range') => void;
}




export const FileCard = React.memo(({ file, isSelected, isFocused = false, onSelect }: FileCardProps) => {
    // アイコン選択ロジック
    const Icon = useMemo(() => {
        if (file.type === 'video') return Play;
        if (file.type === 'image') return ImageIcon;
        if (file.type === 'audio') return Music;
        if (file.type === 'archive') {
            return isAudioArchive(file) ? FileMusic : Archive;
        }
        return FileText;
    }, [file.type, file.metadata]);

    const openLightbox = useUIStore((s) => s.openLightbox);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const animatedImagePreviewMode = useSettingsStore((s) => s.animatedImagePreviewMode);
    const performanceMode = useSettingsStore((s) => s.performanceMode);
    // カード表示設定（Phase 12-3）
    const showFileName = useSettingsStore((s) => s.showFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);
    // Phase 14: 表示モード取得
    const displayMode = useSettingsStore((s) => s.displayMode);
    const displayModeDefinition = getDisplayModeDefinition(displayMode);
    const config = displayModeDefinition.layout;
    // Phase 14-8: タグポップオーバートリガー設定
    const tagPopoverTrigger = useSettingsStore((s) => s.tagPopoverTrigger);
    // タグ表示スタイル設定
    const tagDisplayStyle = useSettingsStore((s) => s.tagDisplayStyle);
    const isTagBorderMode = tagDisplayStyle === 'border';
    const fileCardTagOrderMode = useSettingsStore((s) => s.fileCardTagOrderMode);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);


    // Phase 15-2: サムネイルバッジの計算（メモ化）
    const thumbnailBadges = useMemo(() => {
        const badges = { attributes: [] as Array<{ label: string; color: string }>, extension: '' };

        if (displayModeDefinition.hideThumbnailBadges) return badges;

        // 拡張子バッジ（右上）
        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        badges.extension = ext;

        // 属性バッジ（左上）
        // 1. アニメーションバッジ（右上に移設したのでここでは追加しない）
        // if (file.isAnimated) {
        //     badges.attributes.push({ label: 'ANIM', color: 'bg-pink-600' });
        // }

        // 2. 縦長画像バッジ
        try {
            const meta = file.metadata ? JSON.parse(file.metadata) : null;
            if (meta?.width && meta?.height && meta.height > meta.width * 1.3) {
                badges.attributes.push({ label: 'TALL', color: 'bg-indigo-800/80' });
            }
        } catch {
            // JSON parse error - silent fail
        }

        return badges;
    }, [file.name, file.isAnimated, file.metadata, displayModeDefinition.hideThumbnailBadges]);

    // 拡張子の色分け（半透明ダーク系で洗練された印象に）
    const extensionColor = useMemo(() => {
        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        if (['MP4', 'MOV', 'WEBM', 'AVI', 'MKV'].includes(ext)) return 'bg-blue-800/80';
        if (['ZIP', 'RAR', 'CBZ', '7Z', 'TAR', 'GZ'].includes(ext)) return 'bg-orange-800/80';
        if (['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'].includes(ext)) return 'bg-purple-800/80';
        return 'bg-emerald-800/80'; // Default: images
    }, [file.name]);



    // Phase 14-7: タグポップオーバー
    const [showTagPopover, setShowTagPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    // Phase 14-8: タグポップオーバー hover タイムアウト制御
    const tagHoverTimeoutRef = useRef<number | null>(null);


    // Hover state
    const [isHovered, setIsHovered] = useState(false);
    const [scrubIndex, setScrubIndex] = useState(0);
    const [preloadState, setPreloadState] = useState<'idle' | 'loading' | 'ready'>('idle');
    const preloadedImages = useRef<HTMLImageElement[]>([]);
    const hoverTimeoutRef = useRef<number | null>(null);
    const flipbookIntervalRef = useRef<number | null>(null);
    const [animatedPreviewSessionKey, setAnimatedPreviewSessionKey] = useState(0);
    const thumbnailAreaRef = useRef<HTMLDivElement>(null);
    const cardRootRef = useRef<HTMLDivElement>(null);
    const [isThumbnailVisible, setIsThumbnailVisible] = useState(false);
    const [visibleAnimatedPreviewVersion, setVisibleAnimatedPreviewVersion] = useState(0);
    const [isVisibleAnimatedPreviewActive, setIsVisibleAnimatedPreviewActive] = useState(false);
    const [hoverZoomPosition, setHoverZoomPosition] = useState<{ top: number; left: number } | null>(null);
    const [isZoomButtonHovered, setIsZoomButtonHovered] = useState(false);
    const hoverZoomDelayRef = useRef<number | null>(null);

    // Play mode state
    const videoRef = useRef<HTMLVideoElement>(null);
    const playDelayRef = useRef<number | null>(null);
    const jumpIntervalRef = useRef<NodeJS.Timeout | null>(null); // Phase 17-3: interval 管理

    // Phase 17-3: 同時再生制御
    const hoveredPreviewId = useUIStore((s) => s.hoveredPreviewId);
    const setHoveredPreview = useUIStore((s) => s.setHoveredPreview);

    // Phase 17-3: playMode 設定を取得
    const playMode = useSettingsStore((s) => s.playMode);
    const flipbookSpeed = useSettingsStore((s) => s.flipbookSpeed);
    const allTags = useTagStore((s) => s.tags);
    const tagCategories = useTagStore((s) => s.categories);

    // Phase 17-3: shouldPlayVideo を計算
    const shouldPlayVideo = useMemo(() => {
        return hoveredPreviewId === file.id && thumbnailAction === 'play' && file.type === 'video';
    }, [hoveredPreviewId, file.id, file.type, thumbnailAction]);

    const isAnimatedImage = useMemo(() => {
        return file.type === 'image' && file.isAnimated === true;
    }, [file.type, file.isAnimated]);

    const shouldShowHoverZoomPreview = useMemo(() => {
        return (
            isZoomButtonHovered &&
            file.type === 'image' &&
            !file.isAnimated &&
            Boolean(file.thumbnailPath || file.path)
        );
    }, [file.isAnimated, file.path, file.thumbnailPath, file.type, isZoomButtonHovered]);

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

    // Phase 17-3: interval クリーンアップヘルパー
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

    // プレビューフレームのパスをパース
    const previewFrames = useMemo(() => {
        if (!file.previewFrames) return [];
        return file.previewFrames.split(',').filter(Boolean);
    }, [file.previewFrames]);

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
        const resolvedTags: Tag[] = [];

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

    // タグをカテゴリ順 -> タグ順でソート（未分類は後ろ）
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

    // Phase 14-8: タグポップオーバー hover 制御
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

    // Phase 14-8: タグポップオーバー hover timeout クリーンアップ
    useEffect(() => {
        return () => {
            if (tagHoverTimeoutRef.current) {
                clearTimeout(tagHoverTimeoutRef.current);
            }
        };
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
        if (!shouldShowHoverZoomPreview || !cardRootRef.current) {
            setHoverZoomPosition(null);
            return;
        }

        const updatePosition = () => {
            const rect = cardRootRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const previewSize = HOVER_ZOOM_PREVIEW_SIZE;
            const gap = HOVER_ZOOM_PREVIEW_GAP;

            const preferredLeft = rect.right + gap;
            const fallbackLeft = rect.left - previewSize - gap;
            const left = preferredLeft + previewSize <= viewportWidth - 12
                ? preferredLeft
                : Math.max(12, fallbackLeft);

            const preferredTop = rect.top;
            const top = Math.min(
                Math.max(12, preferredTop),
                Math.max(12, viewportHeight - previewSize - 12)
            );

            setHoverZoomPosition({ top, left });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [shouldShowHoverZoomPreview]);

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
        if (animatedImagePreviewMode !== 'visible') {
            setIsVisibleAnimatedPreviewActive(false);
            return;
        }
        return subscribeVisibleAnimatedPreviewSlots(() => {
            setVisibleAnimatedPreviewVersion((prev) => prev + 1);
        });
    }, [animatedImagePreviewMode]);

    useEffect(() => {
        const shouldUseVisibleAnimatedPreview =
            isAnimatedImage &&
            animatedImagePreviewMode === 'visible' &&
            !performanceMode &&
            isThumbnailVisible;

        if (!shouldUseVisibleAnimatedPreview) {
            releaseVisibleAnimatedPreviewSlot(file.id);
            setIsVisibleAnimatedPreviewActive(false);
            return;
        }

        const acquired = requestVisibleAnimatedPreviewSlot(file.id);
        setIsVisibleAnimatedPreviewActive(acquired);
    }, [
        file.id,
        isAnimatedImage,
        animatedImagePreviewMode,
        performanceMode,
        isThumbnailVisible,
        visibleAnimatedPreviewVersion,
    ]);

    useEffect(() => {
        return () => {
            releaseVisibleAnimatedPreviewSlot(file.id);
        };
    }, [file.id]);

    useEffect(() => {
        if (!isVisibleAnimatedPreviewActive || animatedImagePreviewMode !== 'visible') return;
        setAnimatedPreviewSessionKey((prev) => prev + 1);
    }, [isVisibleAnimatedPreviewActive, animatedImagePreviewMode]);

    // Phase 14-7: Click-outside handler for tag popover (Phase 14-8: click モード限定)
    useEffect(() => {
        if (tagPopoverTrigger !== 'click') return;  // click モード限定
        if (!showTagPopover) return;
        const handleClickOutside = (e: MouseEvent) => {
            // ポップオーバーと+Nボタン両方を判定対象に含める
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

    // FileCardInfoDetailed 側の visibleCount 指定は維持しつつ、
    // タグ要約の選定/描画ロジックは専用コンポーネントへ移譲する。
    const TagSummaryRenderer = useCallback(({ visibleCount }: FileCardTagSummaryRendererProps) => {
        return (
            <FileCardTagSummary
                visibleCount={visibleCount}
                showTags={showTags}
                sortedTags={sortedTags}
                fileCardTagOrderMode={fileCardTagOrderMode}
                displayMode={displayMode}
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
        displayMode,
        openPopover,
        closePopoverWithDelay,
    ]);


    // ★ onMouseEnter でプリロード開始
    const handleMouseEnter = useCallback(() => {
        // Phase 17-3: 同時再生制御
        setHoveredPreview(file.id);

        // パフォーマンスモードではホバーアニメーション無効
        if (performanceMode) return;

        // 100ms後にホバー状態をアクティブに（素早い通過時は発火しない）
        hoverTimeoutRef.current = window.setTimeout(() => {
            setIsHovered(true);

            if (
                isAnimatedImage &&
                animatedImagePreviewMode === 'hover'
            ) {
                setAnimatedPreviewSessionKey((prev) => prev + 1);
            }

            // Scrub / 自動パラパラ: 動画で、まだロードしていない場合のみプリロード
            if (
                (thumbnailAction === 'scrub' || thumbnailAction === 'flipbook') &&
                file.type === 'video' &&
                previewFrames.length > 0 &&
                preloadState === 'idle'
            ) {
                setPreloadState('loading');

                const images = previewFrames.map((framePath) => {
                    const img = new Image();
                    img.src = toMediaUrl(framePath);
                    return img;
                });
                preloadedImages.current = images;

                Promise.all(images.map(img =>
                    new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    })
                )).then(() => setPreloadState('ready'));
            }
        }, 100);
    }, [thumbnailAction, animatedImagePreviewMode, isAnimatedImage, file.type, file.id, previewFrames, preloadState, performanceMode, setHoveredPreview]);

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

        // Phase 17-3: 同時再生制御
        setHoveredPreview(null);
    }, [clearFlipbookInterval, setHoveredPreview]);

    // Scrub: マウス位置からフレームインデックスを計算
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (thumbnailAction !== 'scrub' || preloadState !== 'ready' || previewFrames.length === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const index = Math.floor(percentage * previewFrames.length);
        setScrubIndex(Math.max(0, Math.min(index, previewFrames.length - 1)));
    }, [thumbnailAction, preloadState, previewFrames.length]);

    // 自動パラパラモード: ホバー中にプレビューフレームを自動再生
    useEffect(() => {
        const shouldFlipbook =
            isHovered &&
            thumbnailAction === 'flipbook' &&
            file.type === 'video' &&
            preloadState === 'ready' &&
            previewFrames.length > 1;

        if (!shouldFlipbook) {
            clearFlipbookInterval();
            return;
        }

        clearFlipbookInterval();
        const flipbookIntervalMs =
            flipbookSpeed === 'slow' ? 520 :
                flipbookSpeed === 'fast' ? 140 :
                    220;
        flipbookIntervalRef.current = window.setInterval(() => {
            setScrubIndex((prev) => (prev + 1) % previewFrames.length);
        }, flipbookIntervalMs);

        return () => {
            clearFlipbookInterval();
        };
    }, [isHovered, thumbnailAction, file.type, preloadState, previewFrames.length, flipbookSpeed, clearFlipbookInterval]);

    // Phase 17-3: Video 要素の制御（3モード対応 + interval管理強化）
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

            // 初期位置設定
            if (duration && duration > 2) {
                // sequential ガード: 短い動画は light にフォールバック
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
                // 'light' の場合は currentTime = 0 のまま
            }

            video.muted = true;
            video.volume = 0;

            try {
                await video.play();
            } catch {
                return;
            }

            // ジャンプループ（light モードではスキップ）
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

    // 表示する画像パスを決定
    const displayImagePath = useMemo(() => {
        if (
            isHovered &&
            preloadState === 'ready' &&
            previewFrames.length > 0 &&
            (thumbnailAction === 'scrub' || thumbnailAction === 'flipbook')
        ) {
            return previewFrames[scrubIndex];
        }
        if (shouldAnimateImagePreview) {
            return file.path;
        }
        return file.thumbnailPath;
    }, [isHovered, preloadState, previewFrames, scrubIndex, file.path, file.thumbnailPath, thumbnailAction, shouldAnimateImagePreview]);

    const displayImageSrc = useMemo(() => {
        if (!displayImagePath) return '';
        const base = toMediaUrl(displayImagePath);
        if (shouldAnimateImagePreview && displayImagePath === file.path) {
            return `${base}?animPreview=${animatedPreviewSessionKey}`;
        }
        return base;
    }, [displayImagePath, shouldAnimateImagePreview, file.path, animatedPreviewSessionKey]);

    const handleCardClick = (e: React.MouseEvent) => {
        // ダブルクリック時の click イベント重複発火を防ぐ
        if (e.detail === 2) return;

        if (e.shiftKey) {
            onSelect(file.id, 'range');
        } else if (e.ctrlKey || e.metaKey) {
            onSelect(file.id, 'toggle');
        } else {
            onSelect(file.id, 'single');
        }
    };

    const handleThumbnailClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openLightbox(file);
    };

    const handleDoubleClick = async () => {
        const syncExternalOpenCount = async () => {
            const result = await window.electronAPI.incrementExternalOpenCount(file.id);
            if (result.success && result.externalOpenCount !== undefined) {
                const { useFileStore } = await import('../stores/useFileStore');
                useFileStore.getState().updateFileExternalOpenCount(
                    file.id,
                    result.externalOpenCount,
                    result.lastExternalOpenedAt || Date.now()
                );
            }
        };

        // Phase 18-B: デフォルトアプリ設定 + エラーハンドリング + フォールバック
        const { externalApps, defaultExternalApps } = useSettingsStore.getState();
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        // デフォルトアプリが設定されている場合のみ外部アプリで開く
        const defaultAppId = defaultExternalApps[ext];
        if (defaultAppId) {
            const app = externalApps.find((a: { id: string; }) => a.id === defaultAppId);

            if (app) {
                const result = await window.electronAPI.openWithApp(file.path, app.path, file.id);

                if (!result.success) {
                    // エラー時: トースト表示 + OS標準で開く
                    const { useToastStore } = await import('../stores/useToastStore');
                    useToastStore.getState().error(result.error || '外部アプリで開けませんでした');
                    await window.electronAPI.openExternal(file.path);
                    await syncExternalOpenCount();
                } else if (result.externalOpenCount !== undefined) {
                    // 成功時: カウント更新
                    const { useFileStore } = await import('../stores/useFileStore');
                    useFileStore.getState().updateFileExternalOpenCount(
                        file.id,
                        result.externalOpenCount,
                        result.lastExternalOpenedAt || Date.now()
                    );
                }
                return;
            }
        }

        // デフォルト設定なし or アプリが見つからない → OS標準で開く
        await window.electronAPI.openExternal(file.path);
        await syncExternalOpenCount();
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        // Bug 2修正: 複数選択対応
        const selectedIdsArray = Array.from(useFileStore.getState().selectedIds);

        // 右クリック対象が選択中に含まれているかを判定
        const effectiveIds = selectedIdsArray.includes(file.id) ? selectedIdsArray : [file.id];

        window.electronAPI.showFileContextMenu(file.id, file.path, effectiveIds);
    };

    return (
        <div
            ref={cardRootRef}
            onClick={handleCardClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            style={{
                width: '100%',
                height: '100%'
            }}
            // ⚠️ overflow-hidden を削除するとサムネイルの角丸やレイアウトが崩れる。
            // カード外に要素を表示する場合は React Portal (createPortal) を使用すること。
            className={`
                rounded-lg overflow-hidden border-2 flex flex-col cursor-pointer
                transition-all duration-200 ease-out
                ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20 scale-[1.02] bg-surface-800'
                    : isFocused
                        ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20 bg-surface-800'
                        : 'border-surface-700/40 bg-surface-800 hover:border-cyan-500/40 hover:bg-surface-750 hover:shadow-md hover:shadow-black/30'}
            `}
        >
            {/* Thumbnail Area - Phase 14: 固定高さ */}
            <div
                ref={thumbnailAreaRef}
                onClick={handleThumbnailClick}
                className="relative bg-surface-900 flex items-center justify-center overflow-hidden group w-full flex-shrink-0"
                style={{
                    aspectRatio: config.aspectRatio
                }}
            >
                {/* サムネイル画像 */}
                {displayImagePath ? (
                    <img
                        src={displayImageSrc}
                        alt={file.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${!shouldPlayVideo ? 'group-hover:scale-105' : ''
                            } ${shouldPlayVideo ? 'opacity-0' : 'opacity-100'}`}
                        loading="lazy"
                        onError={(e) => {
                            // 画像ロードエラー時はプレースホルダーを表示（不透明度を下げるなど視覚的FB）
                            e.currentTarget.style.opacity = '0.3';
                        }}
                    />
                ) : (
                    <Icon size={40} className="text-surface-600" />
                )}

                {/* Video オーバーレイ（Playモード時のみ） */}
                {shouldPlayVideo && file.type === 'video' && (
                    <video
                        ref={videoRef}
                        src={toMediaUrl(file.path)}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onError={() => {
                            // Phase 19.5 Bug Fix: 動画ロードエラー時にプレビューを解除して404ループを防止
                            setHoveredPreview(null);
                        }}
                    />
                )}

                {/* ローディングインジケーター（Scrub / 自動パラパラ ロード中） */}
                {isHovered && preloadState === 'loading' && file.type === 'video' && (thumbnailAction === 'scrub' || thumbnailAction === 'flipbook') && (
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Loader size={10} className="animate-spin" />
                        <span>Loading...</span>
                    </div>
                )}

                {/* スクラブ / 自動パラパラ 進捗バー */}
                {isHovered && (thumbnailAction === 'scrub' || thumbnailAction === 'flipbook') && preloadState === 'ready' && previewFrames.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div
                            className="h-full bg-cyan-400 transition-all duration-100"
                            style={{
                                width: `${previewFrames.length > 1
                                    ? (scrubIndex / (previewFrames.length - 1)) * 100
                                    : 0}%`
                            }}
                        />
                    </div>
                )}

                {/* Duration Badge */}
                {showDuration && file.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {file.duration}
                    </div>
                )}

                {/* Phase 15: バッジ（右上） - アニメーション + 属性 + 拡張子 */}
                <div className="absolute top-1 right-1 flex gap-1 z-10">
                    {/* アニメーションバッジ（アイコン） */}
                    {file.isAnimated && !isSelected && (
                        <div className="bg-pink-800/80 rounded-sm p-0.5 opacity-90">
                            <Clapperboard size={12} className="text-white" strokeWidth={2.5} />
                        </div>
                    )}
                    {/* 属性バッジ（TALL等） */}
                    {!isSelected && thumbnailBadges.attributes.filter(b => b.label !== 'ANIM').map((badge, i) => (
                        <span key={i} className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-sm opacity-90 ${badge.color}`}>
                            {badge.label}
                        </span>
                    ))}
                    {/* Phase 26: 音声書庫バッジ（Music アイコン） */}
                    {!isSelected && file.type === 'archive' && isAudioArchive(file) && (
                        <div className="bg-purple-800/80 rounded-sm p-0.5 opacity-90">
                            <Music size={12} className="text-white" strokeWidth={2.5} />
                        </div>
                    )}
                    {/* 拡張子バッジ */}
                    {thumbnailBadges.extension && (
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm opacity-90 text-white uppercase ${extensionColor}`}>
                            {thumbnailBadges.extension}
                        </div>
                    )}
                </div>

                {file.type === 'image' && !file.isAnimated && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(file);
                        }}
                        onMouseEnter={() => {
                            if (hoverZoomDelayRef.current) {
                                clearTimeout(hoverZoomDelayRef.current);
                            }
                            hoverZoomDelayRef.current = window.setTimeout(() => {
                                setIsZoomButtonHovered(true);
                                hoverZoomDelayRef.current = null;
                            }, HOVER_ZOOM_PREVIEW_DELAY_MS);
                        }}
                        onMouseLeave={() => {
                            if (hoverZoomDelayRef.current) {
                                clearTimeout(hoverZoomDelayRef.current);
                                hoverZoomDelayRef.current = null;
                            }
                            setIsZoomButtonHovered(false);
                        }}
                        className={`absolute bottom-2 left-2 z-10 rounded-md border border-surface-500/80 bg-black/65 p-2 text-surface-100 shadow-lg transition-all ${isHovered ? 'opacity-100' : 'pointer-events-none opacity-0'} hover:scale-105 hover:bg-black/85 hover:text-white`}
                        title="中央ビューアで拡大表示"
                        aria-label="中央ビューアで拡大表示"
                    >
                        <Maximize2 size={18} />
                    </button>
                )}


            </div>

            {/* 情報エリア - Phase 14: モード別レイアウト */}
            {showFileName && (
                <FileCardInfoArea
                    file={file}
                    displayMode={displayMode}
                    infoVariant={displayModeDefinition.infoVariant}
                    infoAreaHeight={config.infoAreaHeight}
                    showFileSize={showFileSize}
                    TagSummaryRenderer={TagSummaryRenderer}
                />
            )}

            {/* Phase 14-7: タグポップオーバー (Portal) */}
            {showTagPopover && triggerRef.current && createPortal(
                <div
                    ref={popoverRef}
                    onMouseEnter={() => {
                        if (tagPopoverTrigger === 'hover') openPopover();
                    }}
                    onMouseLeave={() => {
                        if (tagPopoverTrigger === 'hover') closePopoverWithDelay();
                    }}
                    className="bg-surface-800 border border-surface-600
                               rounded-lg shadow-2xl p-3 min-w-[200px] max-w-[300px]"
                    style={{
                        position: 'fixed',
                        top: `${triggerRef.current.getBoundingClientRect().bottom + 4}px`,
                        left: `${triggerRef.current.getBoundingClientRect().left}px`,
                        zIndex: 9999
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-surface-200">
                            タグ ({sortedTags.length})
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowTagPopover(false);
                            }}
                            className="text-surface-400 hover:text-surface-200 text-sm"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {sortedTags.map(tag => (
                            <span
                                key={tag.id}
                                className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap rounded ${isTagBorderMode ? 'border-l-4' : ''}`}
                                style={isTagBorderMode ? {
                                    backgroundColor: 'rgba(55, 65, 81, 0.9)',
                                    color: '#e5e7eb',
                                    borderLeftColor: getTagBackgroundColor(tag.categoryColor || tag.color || '')
                                } : {
                                    backgroundColor: getTagBackgroundColor(tag.categoryColor || tag.color || ''),
                                    color: getTagTextColor(tag.categoryColor || tag.color || '')
                                }}
                            >
                                #{tag.name}
                            </span>
                        ))}
                    </div>
                </div>,
                document.body
            )}

            {shouldShowHoverZoomPreview && hoverZoomPosition && displayImageSrc && createPortal(
                <div
                    className="pointer-events-none fixed overflow-hidden rounded-lg border border-surface-600 bg-surface-800/95 shadow-2xl shadow-black/50 backdrop-blur-sm"
                    style={{
                        top: hoverZoomPosition.top,
                        left: hoverZoomPosition.left,
                        width: HOVER_ZOOM_PREVIEW_SIZE,
                        height: HOVER_ZOOM_PREVIEW_SIZE,
                        zIndex: 9998,
                    }}
                >
                    <img
                        src={displayImageSrc}
                        alt={`${file.name} enlarged preview`}
                        className="h-full w-full object-contain bg-surface-900/80"
                    />
                </div>,
                document.body
            )}
        </div>
    );
});

FileCard.displayName = 'FileCard';
