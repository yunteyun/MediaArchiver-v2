import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, FileText, Image as ImageIcon, Archive, Loader } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Tag } from '../stores/useTagStore';
import { TagBadge } from './tags';

interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    onSelect: (id: string, multi: boolean) => void;
}

export const FileCard = React.memo(({ file, isSelected, onSelect }: FileCardProps) => {
    const Icon = file.type === 'video' ? Play
        : file.type === 'image' ? ImageIcon
            : file.type === 'archive' ? Archive
                : FileText;
    const openLightbox = useUIStore((s) => s.openLightbox);
    const thumbnailAction = useSettingsStore((s) => s.thumbnailAction);
    const videoVolume = useSettingsStore((s) => s.videoVolume);

    // File tags state
    const [fileTags, setFileTags] = useState<Tag[]>([]);

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
                    sortOrder: t.sortOrder,
                    createdAt: t.createdAt
                }));
                setFileTags(mappedTags);
            }
        }).catch(console.error);
        return () => { isMounted = false; };
    }, [file.id]);

    // ★ onMouseEnter でプリロード開始
    const handleMouseEnter = useCallback(() => {
        // 100ms後にホバー状態をアクティブに（素早い通過時は発火しない）
        hoverTimeoutRef.current = window.setTimeout(() => {
            setIsHovered(true);

            // Scrubモード: 動画で、まだロードしていない場合のみプリロード
            if (thumbnailAction === 'scrub' && file.type === 'video' && previewFrames.length > 0 && preloadState === 'idle') {
                setPreloadState('loading');

                const images = previewFrames.map((framePath) => {
                    const img = new Image();
                    img.src = `file://${framePath}`;
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
    }, [thumbnailAction, file.type, previewFrames, preloadState]);

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
            className={`
                w-full h-full rounded-lg overflow-hidden border-2 flex flex-col bg-surface-800 cursor-pointer
                transition-all duration-150
                ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-transparent hover:border-surface-600'}
            `}
        >
            {/* Thumbnail Area */}
            <div className="flex-1 relative bg-surface-900 flex items-center justify-center overflow-hidden group min-h-0">
                {/* サムネイル画像 */}
                {displayImage ? (
                    <img
                        src={`file://${displayImage}`}
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
                        src={`file://${file.path}`}
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

                {/* Duration Badge */}
                {file.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {file.duration}
                    </div>
                )}

                {/* Tags Overlay (on hover) */}
                {fileTags.length > 0 && (
                    <div className="absolute top-1 left-1 flex flex-wrap gap-0.5 max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity">
                        {fileTags.slice(0, 3).map(tag => (
                            <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                        ))}
                        {fileTags.length > 3 && (
                            <span className="text-xs bg-black/70 text-white px-1 rounded">
                                +{fileTags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="h-10 px-2 flex flex-col justify-center bg-surface-800">
                <div className="text-xs text-surface-200 truncate" title={file.name}>
                    {file.name}
                </div>
            </div>
        </div>
    );
});

FileCard.displayName = 'FileCard';
