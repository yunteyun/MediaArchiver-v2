import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, FileText, Image as ImageIcon, Archive, Loader, Music, FileMusic } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore, type CardSize } from '../stores/useSettingsStore';
import type { Tag } from '../stores/useTagStore';
import { TagBadge } from './tags';
import { toMediaUrl } from '../utils/mediaPath';
import { isAudioArchive } from '../utils/fileHelpers';

interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (id: string, multi: boolean) => void;
}

// UIレンダリング専用定数（サムネイル生成・永続化処理には使用しない）
const CARD_SIZES: Record<CardSize, { width: number; height: number }> = {
    small: { width: 150, height: 120 },
    medium: { width: 200, height: 160 },
    large: { width: 280, height: 220 }
};

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
    const videoVolume = useSettingsStore((s) => s.videoVolume);
    const performanceMode = useSettingsStore((s) => s.performanceMode);
    // カード表示設定（Phase 12-3）
    const cardSize = useSettingsStore((s) => s.cardSize);
    const showFileName = useSettingsStore((s) => s.showFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);

    // カードサイズ計算
    const cardDimensions = CARD_SIZES[cardSize];

    // File tags state
    const [fileTags, setFileTags] = useState<Tag[]>([]);
    const [isTagsExpanded, setTagsExpanded] = useState(false);

    // Hover state
    const [isHovered, setIsHovered] = useState(false);
    const [scrubIndex, setScrubIndex] = useState(0);
    const [preloadState, setPreloadState] = useState<'idle' | 'loading' | 'ready'>('idle');
    const preloadedImages = useRef<HTMLImageElement[]>([]);
    const hoverTimeoutRef = useRef<number | null>(null);

    // Play mode state
    const [shouldPlayVideo, setShouldPlayVideo] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playDelayRef = useRef<number | null>(null);

    // プレビューフレームのパスをパース
    const previewFrames = useMemo(() => {
        if (!file.previewFrames) return [];
        return file.previewFrames.split(',').filter(Boolean);
    }, [file.previewFrames]);

    // Load file tags
    useEffect(() => {
        let isMounted = true;
        window.electronAPI.getFileTags(file.id).then((tags) => {
            if (isMounted) {
                const mappedTags = tags.map(t => ({
                    id: t.id,
                    name: t.name,
                    color: t.color,
                    categoryId: t.categoryId,
                    categoryColor: t.categoryColor,  // カテゴリ色を追加
                    sortOrder: t.sortOrder,
                    createdAt: t.createdAt
                }));
                setFileTags(mappedTags);
            }
        }).catch(console.error);
        return () => { isMounted = false; };
    }, [file.id]);

    // タグをsortOrderでソート（メモ化でパフォーマンス最適化）
    const sortedTags = useMemo(() => {
        return [...fileTags].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
    }, [fileTags]);

    // ★ onMouseEnter でプリロード開始
    const handleMouseEnter = useCallback(() => {
        // パフォーマンスモードではホバーアニメーション無効
        if (performanceMode) return;

        // 100ms後にホバー状態をアクティブに（素早い通過時は発火しない）
        hoverTimeoutRef.current = window.setTimeout(() => {
            setIsHovered(true);

            // Scrubモード: 動画で、まだロードしていない場合のみプリロード
            if (thumbnailAction === 'scrub' && file.type === 'video' && previewFrames.length > 0 && preloadState === 'idle') {
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
    }, [thumbnailAction, file.type, previewFrames, preloadState, performanceMode]);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (playDelayRef.current) {
            clearTimeout(playDelayRef.current);
            playDelayRef.current = null;
        }
        setIsHovered(false);
        setScrubIndex(0);
        setShouldPlayVideo(false);
    }, []);

    // Scrub: マウス位置からフレームインデックスを計算
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (thumbnailAction !== 'scrub' || preloadState !== 'ready' || previewFrames.length === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const index = Math.floor(percentage * previewFrames.length);
        setScrubIndex(Math.max(0, Math.min(index, previewFrames.length - 1)));
    }, [thumbnailAction, preloadState, previewFrames.length]);

    // Play モード: 300ms後に再生開始
    useEffect(() => {
        if (thumbnailAction !== 'play' || file.type !== 'video') return;

        if (isHovered) {
            playDelayRef.current = window.setTimeout(() => {
                setShouldPlayVideo(true);
            }, 300);
        } else {
            setShouldPlayVideo(false);
        }

        return () => {
            if (playDelayRef.current) {
                clearTimeout(playDelayRef.current);
            }
        };
    }, [isHovered, thumbnailAction, file.type]);

    // Video 要素の制御
    useEffect(() => {
        if (shouldPlayVideo && videoRef.current) {
            videoRef.current.volume = videoVolume;
            videoRef.current.play().catch(() => { });
        }
    }, [shouldPlayVideo, videoVolume]);

    // 表示する画像を決定
    const displayImage = useMemo(() => {
        if (isHovered && preloadState === 'ready' && previewFrames.length > 0 && thumbnailAction === 'scrub') {
            return previewFrames[scrubIndex];
        }
        return file.thumbnailPath;
    }, [isHovered, preloadState, previewFrames, scrubIndex, file.thumbnailPath, thumbnailAction]);

    const handleClick = (e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey) {
            onSelect(file.id, true);
        } else {
            openLightbox(file);
        }
    };

    const handleDoubleClick = async () => {
        try {
            await window.electronAPI.openExternal(file.path);
        } catch (e) {
            console.error('Failed to open file:', e);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        window.electronAPI.showFileContextMenu(file.id, file.path);
    };

    return (
        <div
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            style={{
                width: `${cardDimensions.width}px`,
                height: `${cardDimensions.height + (showFileName ? 40 : 0)}px`
            }}
            className={`
                rounded-lg overflow-hidden border-2 flex flex-col bg-surface-800 cursor-pointer
                transition-all duration-200 ease-out
                ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : isFocused
                        ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20'
                        : 'border-transparent hover:border-surface-500 hover:shadow-md hover:shadow-black/30'}
            `}
        >
            {/* Thumbnail Area */}
            <div className="flex-1 relative bg-surface-900 flex items-center justify-center overflow-hidden group min-h-0">
                {/* サムネイル画像 */}
                {displayImage ? (
                    <img
                        src={toMediaUrl(displayImage)}
                        alt={file.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${!shouldPlayVideo ? 'group-hover:scale-105' : ''
                            } ${shouldPlayVideo ? 'opacity-0' : 'opacity-100'}`}
                        loading="lazy"
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
                    />
                )}

                {/* ローディングインジケーター（Scrub ロード中） */}
                {isHovered && preloadState === 'loading' && file.type === 'video' && thumbnailAction === 'scrub' && (
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Loader size={10} className="animate-spin" />
                        <span>Loading...</span>
                    </div>
                )}

                {/* スクラブモードシークバー（Phase 12-5a） */}
                {isHovered && thumbnailAction === 'scrub' && preloadState === 'ready' && previewFrames.length > 0 && (
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

                {/* Tags Overlay (on hover) */}
                {showTags && sortedTags.length > 0 && (
                    <div
                        className={`absolute left-1 flex flex-wrap gap-0.5 opacity-0 group-hover:opacity-100 transition-all ${isTagsExpanded
                            ? 'top-0 bottom-0 right-0 left-0 bg-black/85 p-2 z-10 content-start overflow-y-auto'
                            : 'top-1 max-w-[90%]'
                            }`}
                        onMouseLeave={() => setTagsExpanded(false)}
                    >
                        {(isTagsExpanded ? sortedTags : sortedTags.slice(0, 3)).map(tag => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                categoryColor={tag.categoryColor}
                                size="sm"
                            />
                        ))}
                        {sortedTags.length > 3 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setTagsExpanded(!isTagsExpanded); }}
                                className="text-xs bg-black/70 hover:bg-black/90 text-white px-1.5 py-0.5 rounded transition-colors"
                            >
                                {isTagsExpanded ? '▲' : `+${sortedTags.length - 3}`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Info Area */}
            {showFileName && (
                <div className="h-10 px-2 flex flex-col justify-center bg-surface-800">
                    <div className="text-xs text-surface-200 truncate" title={file.name}>
                        {file.name}
                    </div>
                    {showFileSize && file.size && (
                        <div className="text-xs text-surface-400">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

FileCard.displayName = 'FileCard';
