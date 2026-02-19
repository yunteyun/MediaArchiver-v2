import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { toMediaUrl } from '../../utils/mediaPath';
import type { MediaFile } from '../../types/file';
import { isAudioArchive } from '../../utils/fileHelpers';

interface PreviewSectionProps {
    file: MediaFile;
}

export const PreviewSection = React.memo<PreviewSectionProps>(({ file }) => {
    const openLightbox = useUIStore((s) => s.openLightbox);
    const setPreviewContext = useUIStore((s) => s.setPreviewContext);
    const videoRef = useRef<HTMLVideoElement>(null);

    const isVideo = file.type === 'video';
    const isArchive = file.type === 'archive';
    // GIF/WebP アニメーション: サムネイルではなく元ファイルを直接表示
    const isAnimated = file.isAnimated === true;

    // Phase 26: 書庫プレビューフレーム
    const [archiveFrames, setArchiveFrames] = useState<string[]>([]);
    const [archiveLoading, setArchiveLoading] = useState(false);

    // 動画マウント時に previewContext を right-panel にセット（グリッドホバー排他）
    useEffect(() => {
        if (isVideo) {
            setPreviewContext('right-panel');
            return () => setPreviewContext(null);
        }
    }, [isVideo, setPreviewContext]);

    // Phase 26: 書庫のプレビューフレームを取得
    useEffect(() => {
        if (!isArchive || isAudioArchive(file)) {
            setArchiveFrames([]);
            return;
        }
        setArchiveFrames([]);
        setArchiveLoading(true);
        window.electronAPI.getArchivePreviewFrames(file.path, 4)
            .then((frames: string[]) => {
                setArchiveFrames(frames);
            })
            .catch(() => {
                setArchiveFrames([]);
            })
            .finally(() => {
                setArchiveLoading(false);
            });
    }, [file.path, isArchive, file]);

    const handleClick = () => openLightbox(file);

    // アニメーション画像は元ファイルを使う（サムネイルは静止画）
    const animatedSrc = isAnimated ? toMediaUrl(file.path) : null;
    const thumbnailSrc = toMediaUrl(file.thumbnailPath);
    const videoSrc = isVideo ? toMediaUrl(file.path) : null;

    // Phase 26: 書庫プレビューグリッド（画像書庫のみ）
    if (isArchive && !isAudioArchive(file)) {
        return (
            <div
                className="h-[240px] bg-black flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 relative group"
                onClick={handleClick}
                title="クリックして拡大表示"
            >
                {archiveLoading ? (
                    <div className="flex flex-col items-center gap-2 text-surface-500">
                        <div className="w-5 h-5 border-2 border-surface-500 border-t-white rounded-full animate-spin" />
                        <span className="text-xs">読み込み中...</span>
                    </div>
                ) : archiveFrames.length >= 2 ? (
                    /* 2×2 グリッドで表示 */
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-black">
                        {archiveFrames.slice(0, 4).map((framePath, i) => (
                            <div key={i} className="overflow-hidden bg-surface-900 flex items-center justify-center">
                                <img
                                    src={toMediaUrl(framePath)}
                                    alt={`preview ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        ))}
                        {/* 空きセル（3枚以下の場合）を埋める */}
                        {archiveFrames.length < 4 && Array.from({ length: 4 - archiveFrames.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-surface-900" />
                        ))}
                    </div>
                ) : thumbnailSrc ? (
                    /* 1枚のみの場合はサムネイルを全体表示 */
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
                {/* ホバー時の拡大ヒント */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/50 rounded-full px-3 py-1 text-white text-xs">
                        クリックして拡大
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-[240px] bg-black flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 relative group"
            onClick={handleClick}
            title="クリックして拡大表示"
        >
            {/* 動画: autoplay + muted + loop */}
            {isVideo && videoSrc ? (
                <>
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        className="max-w-full max-h-full object-contain"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                    />
                    {/* 再生アイコン（ホバー時） */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/50 rounded-full p-2">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                </>
            ) : isAnimated && animatedSrc ? (
                /* アニメーション GIF/WebP: 元ファイルをそのまま表示 */
                <img
                    src={animatedSrc}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                />
            ) : thumbnailSrc ? (
                /* 静止画・音声書庫: サムネイル */
                <img
                    src={thumbnailSrc}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            ) : (
                /* プレビューなし */
                <div className="flex flex-col items-center gap-2 text-surface-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">プレビューなし</span>
                </div>
            )}
        </div>
    );
});

PreviewSection.displayName = 'PreviewSection';
