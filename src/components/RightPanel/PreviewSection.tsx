import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { toMediaUrl } from '../../utils/mediaPath';
import type { MediaFile } from '../../types/file';
import { SectionTitle } from './SectionTitle';

interface PreviewSectionProps {
    file: MediaFile;
}

export const PreviewSection = React.memo<PreviewSectionProps>(({ file }) => {
    const openLightbox = useUIStore((s) => s.openLightbox);
    const setPreviewContext = useUIStore((s) => s.setPreviewContext);
    const videoRef = useRef<HTMLVideoElement>(null);

    const isVideo = file.type === 'video';
    // GIF/WebP アニメーション: サムネイルではなく元ファイルを直接表示
    const isAnimated = file.isAnimated === true;

    // 動画マウント時に previewContext を right-panel にセット（グリッドホバー排他）
    useEffect(() => {
        if (isVideo) {
            setPreviewContext('right-panel');
            return () => setPreviewContext(null);
        }
    }, [isVideo, setPreviewContext]);

    const handleClick = () => openLightbox(file);

    const animatedSrc = isAnimated ? toMediaUrl(file.path) : null;
    const thumbnailSrc = toMediaUrl(file.thumbnailPath);
    const videoSrc = isVideo ? toMediaUrl(file.path) : null;

    return (
        <section className="px-4 py-3 space-y-2 border-b border-surface-700">
            <SectionTitle>プレビュー</SectionTitle>
            <div
                className="h-[220px] bg-black flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 relative group rounded-md"
                onClick={handleClick}
                title="クリックして拡大表示"
            >
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
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black/50 rounded-full p-2">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    </>
                ) : isAnimated && animatedSrc ? (
                    <img
                        src={animatedSrc}
                        alt={file.name}
                        className="max-w-full max-h-full object-contain"
                    />
                ) : thumbnailSrc ? (
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
            </div>
        </section>
    );
});

PreviewSection.displayName = 'PreviewSection';
