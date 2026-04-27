import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { MpvControlBar } from '../mpv-window/MpvControlBar';
import { useMpvKeyboard } from '../mpv-window/useMpvKeyboard';

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

/** 埋め込みモード: 映像エリア（子ウィンドウが重なる）＋共通コントロールバー */
const EmbeddedMpvPlaceholder = React.memo<{
    file: MediaFile;
    videoRef: React.RefObject<HTMLDivElement | null>;
}>(({ file, videoRef }) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const closeLightbox = useUIStore((state) => state.closeLightbox);
    const setVideoVolume = useSettingsStore((state) => state.setVideoVolume);
    const initialVolume = useSettingsStore((state) => state.videoVolume);
    const renameOpen = useUIStore((s) => s.renameDialogFileId !== null);
    const moveOpen = useUIStore((s) => s.moveDialogOpen);
    const lastPersistRef = useRef(0);
    const lastPersistedPosRef = useRef<number | null>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [volume, setVolumeLocal] = useState(initialVolume);

    // mpv イベント購読
    useEffect(() => window.electronAPI.onMpvTimeUpdate(({ currentTime: t }) => {
        setCurrentTime(t);
        const now = Date.now();
        if (now - lastPersistRef.current < 500) return;
        lastPersistRef.current = now;
        const normalized = t < 5 ? null : t;
        const last = lastPersistedPosRef.current;
        if (normalized === null && last === null) return;
        if (normalized !== null && last !== null && Math.abs(normalized - last) < 10) return;
        lastPersistedPosRef.current = normalized;
        void window.electronAPI.updateFilePlaybackPosition(file.id, normalized).then((result) => {
            if (result.success) updatePlaybackPosition(file.id, result.playbackPositionSeconds ?? null, result.playbackPositionUpdatedAt ?? null);
        });
    }), [file.id, updatePlaybackPosition]);

    useEffect(() => window.electronAPI.onMpvDurationUpdate(({ duration: d }) => setDuration(d)), []);
    useEffect(() => window.electronAPI.onMpvPauseChange(({ paused }) => setIsPaused(paused)), []);
    useEffect(() => window.electronAPI.onMpvMuteChange(({ muted }) => {
        setIsMuted(muted);
        isMutedRef.current = muted;
    }), []);
    useEffect(() => window.electronAPI.onMpvSpeedChange(({ speed }) => setPlaybackRate(speed)), []);
    useEffect(() => window.electronAPI.onMpvFullscreenChange(({ fullscreen }) => setIsFullscreen(fullscreen)), []);
    useEffect(() => window.electronAPI.onMpvEnded(() => closeLightbox()), [closeLightbox]);

    // リネーム・移動ダイアログが開いている間は mpv 子ウィンドウを非表示にする
    useEffect(() => {
        void window.electronAPI.mpvSetVisible(!(renameOpen || moveOpen));
    }, [renameOpen, moveOpen]);

    // 映像エリアのリサイズを main process に通知
    useEffect(() => {
        const el = videoRef.current;
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
    }, [videoRef]);

    const handleVolumeChange = useCallback((v: number) => {
        setVolumeLocal(v);
        void window.electronAPI.mpvSetVolume(v);
        setVideoVolume(v);
    }, [setVideoVolume]);

    const handleTogglePause = useCallback(() => {
        void window.electronAPI.mpvPause();
    }, []);

    const handleSeek = useCallback((sec: number) => {
        void window.electronAPI.mpvSeek(sec);
    }, []);

    const handleToggleMute = useCallback(() => {
        void window.electronAPI.mpvSetMuted(!isMutedRef.current);
    }, []);

    const handleSpeedChange = useCallback((speed: number) => {
        void window.electronAPI.mpvSetSpeed(speed);
    }, []);

    const handleToggleFullscreen = useCallback(() => {
        void window.electronAPI.mpvSetFullscreen(!isFullscreen);
    }, [isFullscreen]);

    useMpvKeyboard({
        togglePause: handleTogglePause,
        seek: handleSeek,
        currentTime,
        volume,
        onVolumeChange: handleVolumeChange,
        onToggleMute: handleToggleMute,
        onToggleFullscreen: handleToggleFullscreen,
    });

    return (
        <div className="pointer-events-auto flex h-full w-full flex-col">
            {/* 映像エリア: 子ウィンドウ（mpv）がここに重なる */}
            <div ref={videoRef} className="min-h-0 flex-1 bg-black" />

            {/* 共通コントロールバー */}
            <MpvControlBar
                currentTime={currentTime}
                duration={duration}
                isPaused={isPaused}
                volume={volume}
                isMuted={isMuted}
                playbackRate={playbackRate}
                isFullscreen={isFullscreen}
                file={file}
                onTogglePause={handleTogglePause}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
                onSpeedChange={handleSpeedChange}
                onToggleFullscreen={handleToggleFullscreen}
            />
        </div>
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
    // 映像エリアの ref（起動中 div と EmbeddedMpvPlaceholder の両方で共用）
    const videoAreaRef = useRef<HTMLDivElement | null>(null);

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

            // 映像エリアの screen 座標を取得
            let videoRect: { x: number; y: number; width: number; height: number } | null = null;
            if (mpvEmbedded && videoAreaRef.current) {
                const r = videoAreaRef.current.getBoundingClientRect();
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
                    setLaunching(false);
                    setEmbeddedActive(true);
                } else {
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
        return <EmbeddedMpvPlaceholder file={file} videoRef={videoAreaRef} />;
    }

    // 起動中: 映像エリアと同じレイアウト（コントロール分を確保）で rect を取得できるようにする
    return (
        <div className="pointer-events-auto flex h-full w-full flex-col">
            <div ref={videoAreaRef} className="flex min-h-0 flex-1 items-center justify-center bg-black">
                {launching && <p className="text-sm text-surface-400">動画プレーヤーを起動中...</p>}
            </div>
            {/* コントロール分のプレースホルダー（高さを合わせるため） */}
            <div className="flex-shrink-0 bg-surface-900/95 py-4" />
        </div>
    );
});

CenterViewerVideo.displayName = 'CenterViewerVideo';
