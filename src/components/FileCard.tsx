import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, FileText, Image as ImageIcon, Archive, Loader, Music, FileMusic, Clapperboard, Eye } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore, type DisplayMode } from '../stores/useSettingsStore';
import type { Tag } from '../stores/useTagStore';

import { toMediaUrl } from '../utils/mediaPath';
import { isAudioArchive } from '../utils/fileHelpers';
import { getDisplayFolderName } from '../utils/path';
import { formatFileSize } from '../utils/groupFiles';

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

// Phase 17-3: ランダムジャンプ再生の定数
const SAFE_MARGIN_RATIO = 0.1; // 先頭・末尾10%除外
const SEQUENTIAL_SEGMENTS = 5; // sequential モードのセグメント数
const SEQUENTIAL_MIN_DURATION = 8; // sequential モード最小動画長（秒）

// Phase 17-3: 安全なランダム位置計算
const getRandomSafeTime = (duration: number, currentTime?: number): number => {
    const safeStart = duration * SAFE_MARGIN_RATIO;
    const safeEnd = duration * (1 - SAFE_MARGIN_RATIO);
    let nextTime = safeStart + Math.random() * (safeEnd - safeStart);

    // 直前位置と近すぎる場合は再抽選（10%以上離す）
    if (currentTime !== undefined) {
        const minGap = duration * 0.1;
        if (Math.abs(nextTime - currentTime) < minGap) {
            nextTime = safeStart + Math.random() * (safeEnd - safeStart);
        }
    }

    return nextTime;
};



interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    isFocused?: boolean;
    onSelect: (id: string, mode: 'single' | 'toggle' | 'range') => void;
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
    // Phase 14-8: タグポップオーバートリガー設定
    const tagPopoverTrigger = useSettingsStore((s) => s.tagPopoverTrigger);
    // タグ表示スタイル設定
    const tagDisplayStyle = useSettingsStore((s) => s.tagDisplayStyle);
    const isTagBorderMode = tagDisplayStyle === 'border';


    // Phase 15-2: サムネイルバッジの計算（メモ化）
    const thumbnailBadges = useMemo(() => {
        const badges = { attributes: [] as Array<{ label: string; color: string }>, extension: '' };

        // Compactモード時はバッジ非表示
        if (displayMode === 'compact') return badges;

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
    }, [file.name, file.isAnimated, file.metadata, displayMode]);

    // 拡張子の色分け（半透明ダーク系で洗練された印象に）
    const extensionColor = useMemo(() => {
        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        if (['MP4', 'MOV', 'WEBM', 'AVI', 'MKV'].includes(ext)) return 'bg-blue-800/80';
        if (['ZIP', 'RAR', 'CBZ', '7Z', 'TAR', 'GZ'].includes(ext)) return 'bg-orange-800/80';
        if (['MP3', 'WAV', 'FLAC', 'AAC', 'OGG'].includes(ext)) return 'bg-purple-800/80';
        return 'bg-emerald-800/80'; // Default: images
    }, [file.name]);



    // File tags state
    const [fileTags, setFileTags] = useState<Tag[]>([]);
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

    // Play mode state
    const videoRef = useRef<HTMLVideoElement>(null);
    const playDelayRef = useRef<number | null>(null);
    const jumpIntervalRef = useRef<NodeJS.Timeout | null>(null); // Phase 17-3: interval 管理

    // Phase 17-3: 同時再生制御
    const hoveredPreviewId = useUIStore((s) => s.hoveredPreviewId);
    const setHoveredPreview = useUIStore((s) => s.setHoveredPreview);

    // Phase 17-3: playMode 設定を取得
    const playMode = useSettingsStore((s) => s.playMode);

    // Phase 17-3: shouldPlayVideo を計算
    const shouldPlayVideo = useMemo(() => {
        return hoveredPreviewId === file.id && thumbnailAction === 'play' && file.type === 'video';
    }, [hoveredPreviewId, file.id, file.type, thumbnailAction]);

    // Phase 17-3: interval クリーンアップヘルパー
    const clearJumpInterval = useCallback(() => {
        if (jumpIntervalRef.current) {
            clearInterval(jumpIntervalRef.current);
            jumpIntervalRef.current = null;
        }
    }, []);

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


    // ★ onMouseEnter でプリロード開始
    const handleMouseEnter = useCallback(() => {
        // Phase 17-3: 同時再生制御
        setHoveredPreview(file.id);

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
    }, [thumbnailAction, file.type, file.id, previewFrames, preloadState, performanceMode, setHoveredPreview]);

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

        // Phase 17-3: 同時再生制御
        setHoveredPreview(null);
    }, [setHoveredPreview]);

    // Scrub: マウス位置からフレームインデックスを計算
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (thumbnailAction !== 'scrub' || preloadState !== 'ready' || previewFrames.length === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const index = Math.floor(percentage * previewFrames.length);
        setScrubIndex(Math.max(0, Math.min(index, previewFrames.length - 1)));
    }, [thumbnailAction, preloadState, previewFrames.length]);

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
                    playMode.jumpType === 'sequential' && duration < SEQUENTIAL_MIN_DURATION
                        ? 'light'
                        : playMode.jumpType;

                if (effectiveJumpType === 'random') {
                    video.currentTime = getRandomSafeTime(duration);
                } else if (effectiveJumpType === 'sequential') {
                    const safeStart = duration * SAFE_MARGIN_RATIO;
                    video.currentTime = safeStart;
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
                playMode.jumpType === 'sequential' && video.duration < SEQUENTIAL_MIN_DURATION
                    ? 'light'
                    : playMode.jumpType;

            if (effectiveJumpType !== 'light') {
                jumpIntervalRef.current = setInterval(() => {
                    if (!video.duration || isNaN(video.duration)) return;

                    if (effectiveJumpType === 'random') {
                        video.currentTime = getRandomSafeTime(video.duration, video.currentTime);
                    } else if (effectiveJumpType === 'sequential') {
                        const safeStart = video.duration * SAFE_MARGIN_RATIO;
                        const safeEnd = video.duration * (1 - SAFE_MARGIN_RATIO);
                        const segmentDuration = (safeEnd - safeStart) / SEQUENTIAL_SEGMENTS;

                        currentSegment = (currentSegment + 1) % SEQUENTIAL_SEGMENTS;
                        video.currentTime = safeStart + (currentSegment * segmentDuration);
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

    // 表示する画像を決定
    const displayImage = useMemo(() => {
        if (isHovered && preloadState === 'ready' && previewFrames.length > 0 && thumbnailAction === 'scrub') {
            return previewFrames[scrubIndex];
        }
        return file.thumbnailPath;
    }, [isHovered, preloadState, previewFrames, scrubIndex, file.thumbnailPath, thumbnailAction]);

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
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        window.electronAPI.showFileContextMenu(file.id, file.path);
    };

    return (
        <div
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
                onClick={handleThumbnailClick}
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
                    {/* 拡張子バッジ */}
                    {thumbnailBadges.extension && (
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm opacity-90 text-white uppercase ${extensionColor}`}>
                            {thumbnailBadges.extension}
                        </div>
                    )}
                </div>


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
                        <div className="text-xs text-white truncate leading-tight font-semibold mb-0.5" title={file.name}>
                            {file.name}
                        </div>
                        {/* サイズ＆タグ */}
                        <div className="flex items-start justify-between gap-1">
                            {showFileSize && file.size && (
                                <span className="text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded">
                                    {formatFileSize(file.size)}
                                </span>
                            )}
                            {showTags && sortedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {sortedTags.slice(0, 2).map(tag => (
                                        <span
                                            key={tag.id}
                                            className={`px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap rounded ${isTagBorderMode ? 'border-l-2' : ''}`}
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
                                            #{tag.name}
                                        </span>
                                    ))}
                                    {sortedTags.length > 2 && (
                                        <button
                                            ref={triggerRef}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (tagPopoverTrigger === 'click') setShowTagPopover(!showTagPopover);
                                            }}
                                            onMouseEnter={() => {
                                                if (tagPopoverTrigger === 'hover') openPopover();
                                            }}
                                            onMouseLeave={() => {
                                                if (tagPopoverTrigger === 'hover') closePopoverWithDelay();
                                            }}
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
                        <h3 className="text-sm font-semibold truncate text-white hover:text-primary-400 transition-colors mb-0.5" title={file.name}>
                            {file.name}
                        </h3>
                        {/* 2行目: フォルダ名 · 作成日時 · アクセス回数（控えめ） */}
                        <div className="text-[10px] text-surface-500 truncate leading-tight mb-1">
                            {getDisplayFolderName(file.path)}
                            {file.createdAt && (
                                <>
                                    {' · '}
                                    {new Date(file.createdAt).toLocaleDateString('ja-JP', {
                                        year: '2-digit',
                                        month: '2-digit',
                                        day: '2-digit'
                                    }).replace(/\//g, '/')}
                                </>
                            )}
                            {/* Phase 17: アクセス回数（1回以上） */}
                            {file.accessCount > 0 && (
                                <>
                                    {' · '}
                                    <Eye size={9} className="inline-block" style={{ verticalAlign: 'text-top' }} />
                                    {' '}{file.accessCount}回
                                </>
                            )}
                            {/* Phase 18-A: 外部アプリ起動回数（1回以上） */}
                            {file.externalOpenCount > 0 && (
                                <>
                                    {' · '}
                                    <span title="外部アプリで開いた回数">↗{file.externalOpenCount}回</span>
                                </>
                            )}
                        </div>
                        {/* 3行目: サイズ（左）＆タグ（右） */}
                        <div className="flex items-start justify-between gap-1">
                            {showFileSize && file.size && (
                                <span className="text-[11px] text-surface-200 font-semibold tracking-tight flex-shrink-0 bg-surface-700/60 px-1.5 py-0.5 rounded">
                                    {formatFileSize(file.size)}
                                </span>
                            )}
                            {showTags && sortedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {sortedTags.slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className={`px-1.5 py-0.5 text-[8px] font-bold whitespace-nowrap rounded ${isTagBorderMode ? 'border-l-2' : ''}`}
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
                                            #{tag.name}
                                        </span>
                                    ))}
                                    {sortedTags.length > 3 && (
                                        <button
                                            ref={triggerRef}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (tagPopoverTrigger === 'click') setShowTagPopover(!showTagPopover);
                                            }}
                                            onMouseEnter={() => {
                                                if (tagPopoverTrigger === 'hover') openPopover();
                                            }}
                                            onMouseLeave={() => {
                                                if (tagPopoverTrigger === 'hover') closePopoverWithDelay();
                                            }}
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
        </div>
    );
});

FileCard.displayName = 'FileCard';
