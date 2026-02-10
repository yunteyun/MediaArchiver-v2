import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, FileText, Image as ImageIcon, Archive, Loader, Music, FileMusic } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore, type DisplayMode } from '../stores/useSettingsStore';
import type { Tag } from '../stores/useTagStore';

import { toMediaUrl } from '../utils/mediaPath';
import { isAudioArchive } from '../utils/fileHelpers';
import { getDisplayFolderName } from '../utils/path';


interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (id: string, multi: boolean) => void;
}




// Phase 14: 表示モード別の定数定義（Phase 13実測値ベース）
export const DISPLAY_MODE_CONFIGS: Record<DisplayMode, {
    aspectRatio: string;
    cardWidth: number;
    thumbnailHeight: number;
    infoAreaHeight: number;
    totalHeight: number;
}> = {
    // 標準モード: 3行レイアウト（ファイル名 + フォルダ名 + サイズ＆タグ）
    standard: {
        aspectRatio: '1/1',
        cardWidth: 250,  // Phase 14-6: 表示密度向上のため縮小
        thumbnailHeight: 160,  // 250 * (192/300) ≈ 160
        infoAreaHeight: 70,  // 3行レイアウト用の固定高さ
        totalHeight: 230  // 160 + 70
    },
    // 漫画モード: 縦長アスペクト比
    manga: {
        aspectRatio: '2/3',
        cardWidth: 200,
        thumbnailHeight: 300,
        infoAreaHeight: 70,
        totalHeight: 370
    },
    // 動画モード: 横長アスペクト比
    video: {
        aspectRatio: '16/9',
        cardWidth: 350,
        thumbnailHeight: 197,
        infoAreaHeight: 70,
        totalHeight: 267
    },
    // Compactモード: ファイル表示量が多い形式（2行レイアウト）
    compact: {
        aspectRatio: '1/1',
        cardWidth: 200,
        thumbnailHeight: 160,
        infoAreaHeight: 48,
        totalHeight: 208
    }
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
    const showFileName = useSettingsStore((s) => s.showFileName);
    const showDuration = useSettingsStore((s) => s.showDuration);
    const showTags = useSettingsStore((s) => s.showTags);
    const showFileSize = useSettingsStore((s) => s.showFileSize);
    // Phase 14: 表示モード取得
    const displayMode = useSettingsStore((s) => s.displayMode);
    const config = DISPLAY_MODE_CONFIGS[displayMode];



    // File tags state
    const [fileTags, setFileTags] = useState<Tag[]>([]);
    // Phase 14-7: タグポップオーバー
    const [showTagPopover, setShowTagPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);


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
                    createdAt: t.createdAt,
                    icon: t.icon || '',
                    description: t.description || ''
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

    // Phase 14-7: Click-outside handler for tag popover
    useEffect(() => {
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
    }, [showTagPopover]);

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
                width: '100%',
                height: '100%'
            }}
            // ⚠️ overflow-hidden を削除するとサムネイルの角丸やレイアウトが崩れる。
            // カード外に要素を表示する場合は React Portal (createPortal) を使用すること。
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
            {/* Thumbnail Area - Phase 14: 固定高さ */}
            <div
                className="relative bg-surface-900 flex items-center justify-center overflow-hidden group"
                style={{
                    height: `${config.thumbnailHeight}px`,
                    aspectRatio: config.aspectRatio
                }}
            >
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


            </div>

            {/* 情報エリア - Phase 14: モード別レイアウト */}
            {showFileName && (
                displayMode === 'compact' ? (
                    // Compactモード: 2行レイアウト（ファイル名 + サイズ＆タグ）
                    <div
                        className="px-2 py-1 flex flex-col justify-start bg-surface-800 gap-0"
                        style={{ height: `${config.infoAreaHeight}px` }}
                    >
                        {/* ファイル名 */}
                        <div className="text-xs text-surface-100 truncate leading-tight font-medium mb-0.5" title={file.name}>
                            {file.name}
                        </div>
                        {/* サイズ＆タグ */}
                        <div className="flex items-start justify-between gap-1">
                            {showFileSize && file.size && (
                                <span className="text-xs text-surface-500 font-mono tracking-tight flex-shrink-0">
                                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </span>
                            )}
                            {showTags && sortedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {sortedTags.slice(0, 2).map(tag => (
                                        <span
                                            key={tag.id}
                                            className="px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap rounded"
                                            style={{
                                                backgroundColor: tag.categoryColor || tag.color,
                                                color: '#FFFFFF',
                                                borderColor: tag.categoryColor || tag.color
                                            }}
                                        >
                                            #{tag.name}
                                        </span>
                                    ))}
                                    {sortedTags.length > 2 && (
                                        <button
                                            ref={triggerRef}
                                            onClick={(e) => { e.stopPropagation(); setShowTagPopover(!showTagPopover); }}
                                            className="px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors cursor-pointer"
                                        >
                                            +{sortedTags.length - 2}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Standard/Manga/Videoモード: 3行レイアウト（ファイル名 + フォルダ名 + サイズ＆タグ）
                    <div
                        className="px-3.5 py-2 flex flex-col justify-start bg-surface-800"
                        style={{ height: `${config.infoAreaHeight}px` }}
                    >
                        {/* 1行目: ファイル名（最優先） */}
                        <h3 className="text-xs font-semibold truncate text-surface-200 hover:text-primary-400 transition-colors mb-0.5" title={file.name}>
                            {file.name}
                        </h3>
                        {/* 2行目: フォルダ名（控えめ） */}
                        <div className="text-[11px] text-surface-400 font-medium truncate leading-tight mb-1">
                            {getDisplayFolderName(file.path)}
                        </div>
                        {/* 3行目: サイズ（左）＆タグ（右） */}
                        <div className="flex items-start justify-between gap-1">
                            {showFileSize && file.size && (
                                <span className="text-xs text-surface-400 font-semibold tracking-tight flex-shrink-0">
                                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </span>
                            )}
                            {showTags && sortedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {sortedTags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className="px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap rounded"
                                            style={{
                                                backgroundColor: tag.categoryColor || tag.color,
                                                color: '#FFFFFF',
                                                borderColor: tag.categoryColor || tag.color
                                            }}
                                        >
                                            #{tag.name}
                                        </span>
                                    ))}
                                    {sortedTags.length > 3 && (
                                        <button
                                            ref={triggerRef}
                                            onClick={(e) => { e.stopPropagation(); setShowTagPopover(!showTagPopover); }}
                                            className="px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap rounded bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors cursor-pointer"
                                        >
                                            +{sortedTags.length - 3}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            )}

            {/* Phase 14-7: タグポップオーバー (Portal) */}
            {showTagPopover && triggerRef.current && createPortal(
                <div
                    ref={popoverRef}
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
                                className="px-2 py-1 text-[10px] font-bold whitespace-nowrap rounded"
                                style={{
                                    backgroundColor: tag.categoryColor || tag.color,
                                    color: '#FFF'
                                }}
                            >
                                #{tag.name}
                            </span>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
});

FileCard.displayName = 'FileCard';
