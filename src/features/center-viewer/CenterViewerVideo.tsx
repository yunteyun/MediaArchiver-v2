import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

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

const getLightboxFile = () => useUIStore.getState().lightboxFile;

/** mpv が使用できない場合のフォールバック: HTML5 video 要素 */
const VideoFallback = React.memo<CenterViewerVideoProps>(({ file, videoVolume, startTimeSeconds }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const setLightboxCurrentTime = useUIStore((state) => state.setLightboxCurrentTime);
    const [hasError, setHasError] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastPersistedRef = useRef<number | null>(
        typeof file.playbackPositionSeconds === 'number' ? file.playbackPositionSeconds : null
    );
    const lastTimeRef = useRef<number>(0);

    const normalizePos = useCallback((t: number, dur?: number | null): number | null => {
        if (!Number.isFinite(t) || t < 5) return null;
        if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
            if (dur - t <= 15) return null;
            return Math.max(0, Math.min(dur, t));
        }
        return Math.max(0, t);
    }, []);

    const persistPos = useCallback(async (t: number, dur?: number | null, force = false) => {
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

    useEffect(() => { setHasError(false); }, [file.id, file.path]);
    useEffect(() => { return () => { setLightboxCurrentTime(null); }; }, [file.id, setLightboxCurrentTime]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, videoVolume));
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
            controls autoPlay preload="metadata"
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

/** 埋め込みモード: 映像エリアを黒背景で占有し mpv の再生制御・位置保存を担う */
const EmbeddedMpvPlaceholder = React.memo<{ file: MediaFile; placeholderRef: React.RefObject<HTMLDivElement | null> }>(({ file, placeholderRef }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const closeLightbox = useUIStore((state) => state.closeLightbox);
    const lastPersistRef = useRef(0);
    const lastPersistedPosRef = useRef<number | null>(null);

    // 再生時間を受け取って再生位置を永続化
    useEffect(() => {
        return window.electronAPI.onMpvTimeUpdate(({ currentTime: t }) => {
            const now = Date.now();
            if (now - lastPersistRef.current < 500) return;
            lastPersistRef.current = now;
            const normalized = t < 5 ? null : t;
            const last = lastPersistedPosRef.current;
            if (normalized === null && last === null) return;
            if (normalized !== null && last !== null && Math.abs(normalized - last) < 10) return;
            lastPersistedPosRef.current = normalized;
            void window.electronAPI.updateFilePlaybackPosition(file.id, normalized).then((result) => {
                if (result.success) {
                    updatePlaybackPosition(file.id, result.playbackPositionSeconds ?? null, result.playbackPositionUpdatedAt ?? null);
                }
            });
        });
    }, [file.id, updatePlaybackPosition]);

    // 再生終了でライトボックスを閉じる
    useEffect(() => {
        return window.electronAPI.onMpvEnded(() => {
            closeLightbox();
        });
    }, [closeLightbox]);

    // リサイズ監視: 映像エリアのサイズ変化を main process に通知
    useEffect(() => {
        const el = placeholderRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            void window.electronAPI.mpvResize({
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [placeholderRef]);

    return (
        <div
            ref={placeholderRef}
            className="pointer-events-auto w-full h-full"
            style={{ background: '#000' }}
        />
    );
});

EmbeddedMpvPlaceholder.displayName = 'EmbeddedMpvPlaceholder';

/** mpv ランチャー */
export const CenterViewerVideo = React.memo<CenterViewerVideoProps>(({
    file,
    videoVolume,
    startTimeSeconds,
}) => {
    const closeLightbox = useUIStore((state) => state.closeLightbox);
    const videoVolumeSetting = useSettingsStore((state) => state.videoVolume);
    const mpvEmbedded = useSettingsStore((state) => state.mpvEmbedded);
    const [useFallback, setUseFallback] = useState(false);
    const [launching, setLaunching] = useState(true);
    const [embeddedActive, setEmbeddedActive] = useState(false);
    const placeholderRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let mounted = true;
        let closedByMpvSuccess = false;

        const launch = async () => {
            const available = await window.electronAPI.isMpvAvailable();
            if (!mounted) return;

            if (!available) {
                setUseFallback(true);
                setLaunching(false);
                return;
            }

            // 埋め込みモードでは映像エリアの screen 座標を取得して渡す
            let videoRect: { x: number; y: number; width: number; height: number } | null = null;
            if (mpvEmbedded && placeholderRef.current) {
                const r = placeholderRef.current.getBoundingClientRect();
                videoRect = {
                    x: Math.round(r.left),
                    y: Math.round(r.top),
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                };
            }

            const result = await window.electronAPI.openMpv({
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                startTime: startTimeSeconds,
                volume: videoVolumeSetting,
                embedded: mpvEmbedded,
                videoRect,
            });

            if (!mounted) return;

            if (result.success) {
                if (result.embedded) {
                    // 埋め込みモード成功: ライトボックスを維持してプレースホルダーを表示
                    setLaunching(false);
                    setEmbeddedActive(true);
                } else {
                    // 別ウィンドウモード成功: ライトボックスを閉じる
                    closedByMpvSuccess = true;
                    closeLightbox();
                }
            } else {
                setUseFallback(true);
                setLaunching(false);
            }
        };

        void launch();
        return () => {
            mounted = false;
            if (!closedByMpvSuccess && !getLightboxFile()) {
                void window.electronAPI.closeMpv();
            }
        };
    }, [file.id, file.path, file.name, startTimeSeconds, videoVolumeSetting, mpvEmbedded, closeLightbox]);

    if (useFallback) {
        return <VideoFallback file={file} videoVolume={videoVolume} startTimeSeconds={startTimeSeconds} />;
    }

    if (embeddedActive) {
        return <EmbeddedMpvPlaceholder file={file} placeholderRef={placeholderRef} />;
    }

    // 起動中: プレースホルダー div を表示（埋め込みモードでは rect 取得のために必要）
    return (
        <div
            ref={placeholderRef}
            className="pointer-events-auto flex w-full h-full items-center justify-center"
            style={{ background: '#000' }}
        >
            {launching && (
                <p className="text-sm text-surface-400">動画プレーヤーを起動中...</p>
            )}
        </div>
    );
});

CenterViewerVideo.displayName = 'CenterViewerVideo';
