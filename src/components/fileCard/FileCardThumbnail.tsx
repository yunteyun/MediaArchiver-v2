import React from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Archive, Loader, Music, FileMusic, Maximize2, Clapperboard } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { getArchiveImageCount } from '../../utils/fileHelpers';
import { FileCardRatingBadge } from './FileCardRatingBadge';

type FileCardThumbnailProps = {
    file: MediaFile;
    isSelected: boolean;
    isAudioArchiveFile: boolean;
    isDetailedHorizontalMode: boolean;
    detailedThumbnailAspectRatio: string;
    aspectRatio: string;
    displayImagePath: string | null | undefined;
    displayImageSrc: string;
    hoverZoomImageSrc: string;
    thumbnailObjectFitClass: string;
    shouldPlayVideo: boolean;
    isHovered: boolean;
    preloadState: 'idle' | 'loading' | 'ready';
    canHoverFramePreview: boolean;
    canFlipbookArchive: boolean;
    activePreviewFrames: string[];
    scrubIndex: number;
    showDuration: boolean;
    hideThumbnailBadges: boolean;
    thumbnailBadges: {
        attributes: Array<{ label: string; color: string }>;
        extension: string;
    };
    extensionColor: string;
    overallRating?: number;
    overallRatingAxis?: { name: string; minValue: number; maxValue: number } | null;
    shouldShowHoverZoomPreview: boolean;
    hoverZoomLayout: { top: number; left: number; width: number; height: number } | null;
    thumbnailAreaRef: React.RefObject<HTMLDivElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    zoomButtonRef: React.RefObject<HTMLButtonElement | null>;
    onZoomClick: (e: React.MouseEvent) => void;
    onZoomButtonMouseEnter: () => void;
    onZoomButtonMouseLeave: () => void;
    onVideoError: () => void;
};

export const FileCardThumbnail = React.memo(({
    file,
    isSelected,
    isAudioArchiveFile,
    isDetailedHorizontalMode,
    detailedThumbnailAspectRatio,
    aspectRatio,
    displayImagePath,
    displayImageSrc,
    hoverZoomImageSrc,
    thumbnailObjectFitClass,
    shouldPlayVideo,
    isHovered,
    preloadState,
    canHoverFramePreview,
    canFlipbookArchive,
    activePreviewFrames,
    scrubIndex,
    showDuration,
    hideThumbnailBadges,
    thumbnailBadges,
    extensionColor,
    overallRating,
    overallRatingAxis,
    shouldShowHoverZoomPreview,
    hoverZoomLayout,
    thumbnailAreaRef,
    videoRef,
    zoomButtonRef,
    onZoomClick,
    onZoomButtonMouseEnter,
    onZoomButtonMouseLeave,
    onVideoError,
}: FileCardThumbnailProps) => {
    const archiveImageCount = getArchiveImageCount(file);

    const Icon = (() => {
        if (file.type === 'image') return ImageIcon;
        if (file.type === 'audio') return Music;
        if (file.type === 'archive') return isAudioArchiveFile ? FileMusic : Archive;
        return null;
    })();

    return (
        <>
            <div
                ref={thumbnailAreaRef}
                className={`relative bg-surface-900 flex items-center justify-center overflow-hidden group flex-shrink-0 ${isDetailedHorizontalMode ? 'h-full' : 'w-full'}`}
                style={isDetailedHorizontalMode
                    ? { height: '100%', aspectRatio: detailedThumbnailAspectRatio }
                    : { aspectRatio }
                }
            >
                {/* サムネイル画像 */}
                {displayImagePath ? (
                    <img
                        src={displayImageSrc}
                        alt={file.name}
                        className={`w-full h-full ${thumbnailObjectFitClass} transition-transform duration-300 ${!shouldPlayVideo ? 'group-hover:scale-105' : ''} ${shouldPlayVideo ? 'opacity-0' : 'opacity-100'}`}
                        loading="lazy"
                        onError={(e) => {
                            e.currentTarget.style.opacity = '0.3';
                        }}
                    />
                ) : (
                    Icon && <Icon size={40} className="text-surface-600" />
                )}

                {/* Video オーバーレイ（Playモード時のみ） */}
                {shouldPlayVideo && file.type === 'video' && (
                    <video
                        ref={videoRef}
                        src={toMediaUrl(file.path)}
                        className={`absolute inset-0 w-full h-full ${thumbnailObjectFitClass}`}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onError={onVideoError}
                    />
                )}

                {/* ローディングインジケーター */}
                {isHovered && preloadState === 'loading' && canHoverFramePreview && (
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Loader size={10} className="animate-spin" />
                        <span>Loading...</span>
                    </div>
                )}

                {/* スクラブ / コマ送り 進捗バー */}
                {isHovered && canHoverFramePreview && preloadState === 'ready' && activePreviewFrames.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div
                            className="h-full bg-cyan-400 transition-all duration-100"
                            style={{
                                width: `${activePreviewFrames.length > 1
                                    ? (scrubIndex / (activePreviewFrames.length - 1)) * 100
                                    : 0}%`
                            }}
                        />
                    </div>
                )}

                {/* 右下バッジ群 */}
                {((showDuration && file.duration) || (file.type === 'archive' && archiveImageCount != null && archiveImageCount > 1)) && (
                    <div className="absolute bottom-1 right-1 flex items-center gap-1">
                        {file.type === 'archive' && archiveImageCount != null && archiveImageCount > 1 && (
                            <>
                                {isHovered && canFlipbookArchive && preloadState === 'ready' && activePreviewFrames.length > 0 && (
                                    <div className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                        {`${scrubIndex + 1}/${activePreviewFrames.length}`}
                                    </div>
                                )}
                                <div className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                    {archiveImageCount}p
                                </div>
                            </>
                        )}
                        {showDuration && file.duration && (
                            <div className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                {file.duration}
                            </div>
                        )}
                    </div>
                )}

                {/* バッジ（右上） */}
                {!hideThumbnailBadges && (
                    <div className="absolute top-1 right-1 flex gap-1 z-10">
                        {!isSelected && file.type === 'archive' && !isAudioArchiveFile && (archiveImageCount ?? 0) > 0 && (
                            <div className="bg-emerald-700/85 rounded-sm p-0.5 opacity-90" title="画像書庫">
                                <ImageIcon size={12} className="text-white" strokeWidth={2.4} />
                            </div>
                        )}
                        {file.isAnimated && !isSelected && (
                            <div className="bg-pink-800/80 rounded-sm p-0.5 opacity-90">
                                <Clapperboard size={12} className="text-white" strokeWidth={2.5} />
                            </div>
                        )}
                        {!isSelected && thumbnailBadges.attributes.filter(b => b.label !== 'ANIM').map((badge, i) => (
                            <span key={i} className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-sm opacity-90 ${badge.color}`}>
                                {badge.label}
                            </span>
                        ))}
                        {!isSelected && file.type === 'archive' && isAudioArchiveFile && (
                            <div className="bg-purple-800/80 rounded-sm p-0.5 opacity-90">
                                <Music size={12} className="text-white" strokeWidth={2.5} />
                            </div>
                        )}
                        {thumbnailBadges.extension && (
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm opacity-90 text-white uppercase ${extensionColor}`}>
                                {thumbnailBadges.extension}
                            </div>
                        )}
                    </div>
                )}

                {/* 評価バッジ（左上） */}
                {overallRating !== undefined && overallRatingAxis && (
                    <div className="pointer-events-none absolute left-1.5 top-1.5 z-10">
                        <FileCardRatingBadge
                            value={overallRating}
                            minValue={overallRatingAxis.minValue}
                            maxValue={overallRatingAxis.maxValue}
                            axisName={overallRatingAxis.name}
                        />
                    </div>
                )}

                {/* ズームボタン */}
                <button
                    ref={zoomButtonRef}
                    type="button"
                    onClick={onZoomClick}
                    onMouseEnter={onZoomButtonMouseEnter}
                    onMouseLeave={onZoomButtonMouseLeave}
                    className={`absolute bottom-2 left-2 z-10 rounded-md border border-surface-500/80 bg-black/65 p-2 text-surface-100 shadow-lg transition-all ${isHovered ? 'opacity-100' : 'pointer-events-none opacity-0'} hover:scale-105 hover:bg-black/85 hover:text-white`}
                    title="中央ビューアで開く"
                    aria-label="中央ビューアで開く"
                >
                    <Maximize2 size={18} />
                </button>
            </div>

            {/* ズームプレビュー（Portal） */}
            {shouldShowHoverZoomPreview && hoverZoomLayout && hoverZoomImageSrc && createPortal(
                <div
                    className="pointer-events-none fixed overflow-hidden rounded-xl border border-surface-500/80 bg-surface-800/95 shadow-2xl shadow-black/50 backdrop-blur-sm"
                    style={{
                        top: hoverZoomLayout.top,
                        left: hoverZoomLayout.left,
                        width: hoverZoomLayout.width,
                        height: hoverZoomLayout.height,
                        zIndex: 9998,
                    }}
                >
                    <img
                        src={hoverZoomImageSrc}
                        alt={`${file.name} enlarged preview`}
                        className="h-full w-full object-contain bg-surface-900/90"
                    />
                </div>,
                document.body
            )}
        </>
    );
});

FileCardThumbnail.displayName = 'FileCardThumbnail';
