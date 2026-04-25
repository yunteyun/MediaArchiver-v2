import React, { useEffect, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

// lightboxFile を同期読み取りするためのストアアクセサ（フックではない）
const getLightboxFile = () => useUIStore.getState().lightboxFile;

interface CenterViewerVideoProps {
    file: MediaFile;
    videoVolume: number;
    startTimeSeconds: number | null;
}

const mediaStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
};

/** mpv が使用できない場合のフォールバック: HTML5 video 要素 */
const VideoFallback = React.memo<CenterViewerVideoProps>(({ file, videoVolume, startTimeSeconds }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const setLightboxCurrentTime = useUIStore((state) => state.setLightboxCurrentTime);
    const [hasError, setHasError] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const lastPersistedRef = React.useRef<number | null>(
        typeof file.playbackPositionSeconds === 'number' ? file.playbackPositionSeconds : null
    );
    const lastTimeRef = React.useRef<number>(0);

    const normalizePos = React.useCallback((t: number, dur?: number | null): number | null => {
        if (!Number.isFinite(t) || t < 5) return null;
        if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
            if (dur - t <= 15) return null;
            return Math.max(0, Math.min(dur, t));
        }
        return Math.max(0, t);
    }, []);

    const persistPos = React.useCallback(async (t: number, dur?: number | null, force = false) => {
        const pos = normalizePos(t, dur);
        const last = lastPersistedRef.current;
        if (!force && pos === null && last === null) return;
        if (!force && pos !== null && last !== null && Math.abs(pos - last) < 10) return;
        try {
            const result = await window.electronAPI.updateFilePlaybackPosition(file.id, pos);
            if (!result.success) return;
            lastPersistedRef.current = result.playbackPositionSeconds ?? null;
            updatePlaybackPosition(file.id, result.playbackPositionSeconds ?? null, result.playbackPositionUpdatedAt ?? null);
        } catch { /* ignore */ }
    }, [file.id, normalizePos, updatePlaybackPosition]);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    useEffect(() => {
        return () => { setLightboxCurrentTime(null); };
    }, [file.id, setLightboxCurrentTime]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = Math.max(0, Math.min(1, videoVolume));
        }
    }, [file.id, videoVolume]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || startTimeSeconds == null || !Number.isFinite(startTimeSeconds)) return;
        const seek = () => {
            if (!video.duration || Number.isNaN(video.duration)) return;
            video.currentTime = Math.max(0, Math.min(video.duration, startTimeSeconds));
            setLightboxCurrentTime(video.currentTime);
        };
        if (video.readyState >= 1) { seek(); return; }
        video.addEventListener('loadedmetadata', seek, { once: true });
        return () => video.removeEventListener('loadedmetadata', seek);
    }, [file.id, setLightboxCurrentTime, startTimeSeconds]);

    useEffect(() => {
        const video = videoRef.current;
        return () => { if (video) void persistPos(video.currentTime, video.duration, true); };
    }, [file.id, persistPos]);

    if (hasError) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            src={toMediaUrl(file.path)}
            style={mediaStyle}
            className="pointer-events-auto max-h-full max-w-full"
            controls
            autoPlay
            preload="metadata"
            onTimeUpdate={(e) => {
                const now = Date.now();
                if (now - lastTimeRef.current >= 500) {
                    lastTimeRef.current = now;
                    setLightboxCurrentTime(e.currentTarget.currentTime);
                    void persistPos(e.currentTarget.currentTime, e.currentTarget.duration);
                }
            }}
            onLoadedMetadata={(e) => setLightboxCurrentTime(e.currentTarget.currentTime)}
            onPause={(e) => { setLightboxCurrentTime(e.currentTarget.currentTime); void persistPos(e.currentTarget.currentTime, e.currentTarget.duration, true); }}
            onEnded={(e) => { setLightboxCurrentTime(e.currentTarget.currentTime); void persistPos(e.currentTarget.currentTime, e.currentTarget.duration, true); }}
            onError={() => setHasError(true)}
        />
    );
});

VideoFallback.displayName = 'VideoFallback';

/** mpv ランチャー: mpv 専用ウィンドウで動画を開き、成功したらライトボックスを閉じる */
export const CenterViewerVideo = React.memo<CenterViewerVideoProps>(({
    file,
    videoVolume,
    startTimeSeconds,
}) => {
    const closeLightbox = useUIStore((state) => state.closeLightbox);
    const videoVolumeSetting = useSettingsStore((state) => state.videoVolume);
    const [useFallback, setUseFallback] = useState(false);
    const [launching, setLaunching] = useState(true);

    useEffect(() => {
        let mounted = true;

        const launch = async () => {
            const available = await window.electronAPI.isMpvAvailable();
            if (!mounted) return;

            if (!available) {
                setUseFallback(true);
                setLaunching(false);
                return;
            }

            const result = await window.electronAPI.openMpv({
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                startTime: startTimeSeconds,
                volume: videoVolumeSetting,
            });

            if (!mounted) return;

            if (result.success) {
                closeLightbox();
            } else {
                setUseFallback(true);
                setLaunching(false);
            }
        };

        void launch();
        return () => {
            mounted = false;
            // ライトボックスが完全に閉じた場合（別の動画への切り替えではない）は mpv も閉じる。
            // これにより「背景クリックで戻る→音が流れ続ける」問題を防ぐ。
            if (!getLightboxFile()) {
                void window.electronAPI.closeMpv();
            }
        };
    }, [file.id, file.path, file.name, startTimeSeconds, videoVolumeSetting, closeLightbox]);

    if (useFallback) {
        return <VideoFallback file={file} videoVolume={videoVolume} startTimeSeconds={startTimeSeconds} />;
    }

    if (launching) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm text-surface-400">動画プレーヤーを起動中...</p>
            </div>
        );
    }

    return null;
});

CenterViewerVideo.displayName = 'CenterViewerVideo';
