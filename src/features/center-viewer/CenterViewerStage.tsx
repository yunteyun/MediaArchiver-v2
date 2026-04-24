import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Music } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import type { LightboxOpenMode } from '../../stores/useUIStore';
import { toMediaUrl } from '../../utils/mediaPath';
import { resolveLightboxMediaKind } from '../../components/lightbox/shared/lightboxShared';
import { CenterViewerVideo } from './CenterViewerVideo';
import { CenterViewerArchive } from './CenterViewerArchive';
import { CenterViewerManga } from './CenterViewerManga';

interface CenterViewerStageProps {
    file: MediaFile;
    openMode: LightboxOpenMode;
    videoVolume: number;
    audioVolume: number;
    startTimeSeconds: number | null;
}

const mediaStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
};

export const CenterViewerStage = React.memo<CenterViewerStageProps>(({
    file,
    openMode,
    videoVolume,
    audioVolume,
    startTimeSeconds,
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const kind = useMemo(() => resolveLightboxMediaKind(file), [file]);

    // 画像は decode() 完了後に表示して段階描写（top から順に塗られる挙動）を防ぐ
    const [displayedImageSrc, setDisplayedImageSrc] = useState<string>('');
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    useEffect(() => {
        if (kind !== 'image') {
            setDisplayedImageSrc('');
            return;
        }
        setDisplayedImageSrc('');
        const src = toMediaUrl(file.path);
        let cancelled = false;
        const img = new Image();
        img.src = src;
        img.decode()
            .then(() => { if (!cancelled) setDisplayedImageSrc(src); })
            .catch(() => { if (!cancelled) setDisplayedImageSrc(src); });
        return () => { cancelled = true; };
    }, [file.path, kind]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, audioVolume));
        }
    }, [audioVolume, file.id]);

    if (kind === 'video') {
        return <CenterViewerVideo file={file} videoVolume={videoVolume} startTimeSeconds={startTimeSeconds} />;
    }

    if (kind === 'archive' && openMode === 'archive-manga') {
        return <CenterViewerManga file={file} />;
    }

    if (kind === 'archive') {
        return <CenterViewerArchive file={file} openMode={openMode} audioVolume={audioVolume} />;
    }

    if (hasError) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
            </div>
        );
    }

    if (kind === 'audio') {
        return (
            <div className="pointer-events-auto flex w-full max-w-[780px] flex-col items-center gap-6 px-6 text-surface-100">
                {file.thumbnailPath ? (
                    <img
                        src={toMediaUrl(file.thumbnailPath)}
                        alt={file.name}
                        className="h-72 w-72 rounded-xl object-cover shadow-2xl"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <div className="flex h-72 w-72 items-center justify-center rounded-xl bg-surface-800 shadow-2xl">
                        <Music size={72} className="text-surface-500" />
                    </div>
                )}
                <audio
                    ref={audioRef}
                    src={toMediaUrl(file.path)}
                    controls
                    autoPlay
                    className="w-full"
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    if (kind === 'unsupported') {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <Archive size={56} className="mx-auto mb-4 text-surface-500" />
                <p className="text-sm font-semibold text-surface-200">この形式は中央ビューアでは表示できません</p>
            </div>
        );
    }

    if (!displayedImageSrc) return null;

    return (
        <img
            key={displayedImageSrc}
            src={displayedImageSrc}
            alt={file.name}
            style={mediaStyle}
            className="pointer-events-auto max-h-full max-w-full"
            onError={() => setHasError(true)}
        />
    );
});

CenterViewerStage.displayName = 'CenterViewerStage';
