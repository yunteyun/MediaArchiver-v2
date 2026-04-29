import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { toMediaUrl } from '../../../utils/mediaPath';
import { useFileStore } from '../../../stores/useFileStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useViewerContext } from '../viewerContexts';
import { useViewerKeyboard } from '../hooks/useViewerKeyboard';
import { useViewerSlots } from '../hooks/useViewerSlots';
import { useElectronViewerApi } from '../hooks/useElectronViewerApi';
import { ControlBar } from '../controls/ControlBar';

// ── 再生位置の正規化 ─────────────────────────────────────────────────────────

function normalizePos(t: number, dur?: number | null): number | null {
    if (!Number.isFinite(t) || t < 5) return null;
    if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
        if (dur - t <= 15) return null;
        return Math.max(0, Math.min(dur, t));
    }
    return Math.max(0, t);
}

// ── HTML5 フォールバック ────────────────────────────────────────────────────

const VideoFallback: React.FC<{
    startTimeSeconds: number | null;
}> = ({ startTimeSeconds }) => {
    const { file, videoVolume } = useViewerContext();
    const api = useElectronViewerApi();
    const updatePlaybackPosition = useFileStore(s => s.updatePlaybackPosition);
    const setLightboxCurrentTime = useUIStore(s => s.setLightboxCurrentTime);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastPersistedRef = useRef<number | null>(
        typeof file.playbackPositionSeconds === 'number' ? file.playbackPositionSeconds : null,
    );
    const lastTimeRef = useRef<number>(0);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [volume, setVolume] = useState(videoVolume);
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(false);
    const [hasError, setHasError] = useState(false);

    const persistPos = useCallback(async (t: number, dur?: number | null, force = false) => {
        const pos = normalizePos(t, dur);
        const last = lastPersistedRef.current;
        if (!force && pos === null && last === null) return;
        if (!force && pos !== null && last !== null && Math.abs(pos - last) < 10) return;
        try {
            const result = await api.updatePlaybackPosition(file.id, pos);
            if (!result.success) return;
            lastPersistedRef.current = result.playbackPositionSeconds ?? null;
            updatePlaybackPosition(file.id, result.playbackPositionSeconds ?? null, result.playbackPositionUpdatedAt ?? null);
        } catch { /* ignore */ }
    }, [api, file.id, updatePlaybackPosition]);

    useEffect(() => { setHasError(false); }, [file.id, file.path]);
    useEffect(() => () => { setLightboxCurrentTime(null); }, [file.id, setLightboxCurrentTime]);

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

    // キーボード（HTML5 video の再生制御）
    const keyboardHandler = useCallback((e: KeyboardEvent): boolean => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
        const video = videoRef.current;
        if (!video) return false;
        switch (e.key) {
            case ' ':
                e.preventDefault();
                if (video.paused) void video.play(); else video.pause();
                return true;
            case 'ArrowLeft':
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 10);
                return true;
            case 'ArrowRight':
                e.preventDefault();
                video.currentTime = video.currentTime + 10;
                return true;
            case 'ArrowUp':
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.05);
                setVolume(video.volume);
                return true;
            case 'ArrowDown':
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.05);
                setVolume(video.volume);
                return true;
            case 'm': case 'M':
                video.muted = !video.muted;
                setIsMuted(video.muted);
                isMutedRef.current = video.muted;
                return true;
        }
        return false;
    }, []);
    useViewerKeyboard(keyboardHandler);

    if (hasError) {
        return (
            <div className="pointer-events-auto px-6 py-8 text-center">
                <p className="text-sm font-semibold text-surface-200">メディアを読み込めませんでした</p>
            </div>
        );
    }

    return (
        <div className="pointer-events-auto flex h-full w-full flex-col">
            <div className="min-h-0 flex-1">
                <video
                    ref={videoRef}
                    src={toMediaUrl(file.path)}
                    style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: 'auto' }}
                    className="h-full w-full"
                    autoPlay
                    preload="metadata"
                    onPlay={() => setIsPaused(false)}
                    onPause={() => setIsPaused(true)}
                    onTimeUpdate={(e) => {
                        const now = Date.now();
                        if (now - lastTimeRef.current >= 500) {
                            lastTimeRef.current = now;
                            const t = e.currentTarget.currentTime;
                            setCurrentTime(t);
                            setLightboxCurrentTime(t);
                            void persistPos(t, e.currentTarget.duration);
                        }
                    }}
                    onLoadedMetadata={(e) => {
                        setDuration(e.currentTarget.duration);
                        setCurrentTime(e.currentTarget.currentTime);
                        setLightboxCurrentTime(e.currentTarget.currentTime);
                    }}
                    onPause={(e) => {
                        setLightboxCurrentTime(e.currentTarget.currentTime);
                        void persistPos(e.currentTarget.currentTime, e.currentTarget.duration, true);
                    }}
                    onEnded={(e) => {
                        setLightboxCurrentTime(e.currentTarget.currentTime);
                        void persistPos(e.currentTarget.currentTime, e.currentTarget.duration, true);
                    }}
                    onError={() => setHasError(true)}
                />
            </div>
            <ControlBar
                currentTime={currentTime}
                duration={duration}
                isPaused={isPaused}
                volume={volume}
                isMuted={isMuted}
                playbackRate={1}
                isFullscreen={false}
                onTogglePause={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.paused) void v.play(); else v.pause();
                }}
                onSeek={(sec) => { if (videoRef.current) videoRef.current.currentTime = sec; }}
                onVolumeChange={(v) => {
                    if (videoRef.current) videoRef.current.volume = v;
                    setVolume(v);
                }}
                onToggleMute={() => {
                    if (!videoRef.current) return;
                    videoRef.current.muted = !isMutedRef.current;
                    setIsMuted(!isMutedRef.current);
                    isMutedRef.current = !isMutedRef.current;
                }}
                onSpeedChange={(speed) => { if (videoRef.current) videoRef.current.playbackRate = speed; }}
                onToggleFullscreen={() => {
                    if (videoRef.current?.requestFullscreen) void videoRef.current.requestFullscreen();
                }}
            />
        </div>
    );
};

// ── mpv 埋め込みモード ────────────────────────────────────────────────────────

const EmbeddedMpv: React.FC<{
    startTimeSeconds: number | null;
    videoAreaRef: React.RefObject<HTMLDivElement | null>;
}> = ({ startTimeSeconds: _start, videoAreaRef }) => {
    const { file } = useViewerContext();
    const api = useElectronViewerApi();
    const updatePlaybackPosition = useFileStore(s => s.updatePlaybackPosition);
    const closeLightbox = useUIStore(s => s.closeLightbox);
    const setVideoVolume = useSettingsStore(s => s.setVideoVolume);
    const initialVolume = useSettingsStore(s => s.videoVolume);
    const renameOpen = useUIStore(s => s.renameDialogFileId !== null);
    const moveOpen = useUIStore(s => s.moveDialogOpen);

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
    useEffect(() => api.onMpvTimeUpdate(({ currentTime: t }) => {
        setCurrentTime(t);
        const now = Date.now();
        if (now - lastPersistRef.current < 500) return;
        lastPersistRef.current = now;
        const normalized = t < 5 ? null : t;
        const last = lastPersistedPosRef.current;
        if (normalized === null && last === null) return;
        if (normalized !== null && last !== null && Math.abs(normalized - last) < 10) return;
        lastPersistedPosRef.current = normalized;
        void api.updatePlaybackPosition(file.id, normalized).then((result) => {
            if (result.success) updatePlaybackPosition(file.id, result.playbackPositionSeconds ?? null, result.playbackPositionUpdatedAt ?? null);
        });
    }), [api, file.id, updatePlaybackPosition]);

    useEffect(() => api.onMpvDurationUpdate(({ duration: d }) => setDuration(d)), [api]);
    useEffect(() => api.onMpvPauseChange(({ paused }) => setIsPaused(paused)), [api]);
    useEffect(() => api.onMpvMuteChange(({ muted }) => { setIsMuted(muted); isMutedRef.current = muted; }), [api]);
    useEffect(() => api.onMpvSpeedChange(({ speed }) => setPlaybackRate(speed)), [api]);
    useEffect(() => api.onMpvFullscreenChange(({ fullscreen }) => setIsFullscreen(fullscreen)), [api]);
    useEffect(() => api.onMpvEnded(() => closeLightbox()), [api, closeLightbox]);

    // リネーム・移動ダイアログが開いている間は mpv 子ウィンドウを非表示
    useEffect(() => {
        void api.mpvSetVisible(!(renameOpen || moveOpen));
    }, [api, renameOpen, moveOpen]);

    // 映像エリアのリサイズを main process に通知
    useEffect(() => {
        const el = videoAreaRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            void api.mpvResize({ x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [api, videoAreaRef]);

    const handleVolumeChange = useCallback((v: number) => {
        setVolumeLocal(v);
        void api.mpvSetVolume(v);
        setVideoVolume(v);
    }, [api, setVideoVolume]);

    // キーボード（mpv 用）
    const keyboardHandler = useCallback((e: KeyboardEvent): boolean => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
        switch (e.key) {
            case ' ': e.preventDefault(); void api.mpvPause(); return true;
            case 'ArrowLeft': e.preventDefault(); void api.mpvSeek(Math.max(0, currentTime - 10)); return true;
            case 'ArrowRight': e.preventDefault(); void api.mpvSeek(currentTime + 10); return true;
            case 'ArrowUp': e.preventDefault(); handleVolumeChange(Math.min(1, volume + 0.05)); return true;
            case 'ArrowDown': e.preventDefault(); handleVolumeChange(Math.max(0, volume - 0.05)); return true;
            case 'm': case 'M': void api.mpvSetMuted(!isMutedRef.current); return true;
            case 'f': case 'F': void api.mpvSetFullscreen(!isFullscreen); return true;
        }
        return false;
    }, [api, currentTime, volume, handleVolumeChange, isFullscreen]);
    useViewerKeyboard(keyboardHandler);

    return (
        <div className="pointer-events-auto flex h-full w-full flex-col">
            {/* 映像エリア: mpv 子ウィンドウがここに重なる */}
            <div ref={videoAreaRef} className="min-h-0 flex-1 bg-black" />
            <ControlBar
                currentTime={currentTime}
                duration={duration}
                isPaused={isPaused}
                volume={volume}
                isMuted={isMuted}
                playbackRate={playbackRate}
                isFullscreen={isFullscreen}
                onTogglePause={() => void api.mpvPause()}
                onSeek={sec => void api.mpvSeek(sec)}
                onVolumeChange={handleVolumeChange}
                onToggleMute={() => void api.mpvSetMuted(!isMutedRef.current)}
                onSpeedChange={speed => void api.mpvSetSpeed(speed)}
                onToggleFullscreen={() => void api.mpvSetFullscreen(!isFullscreen)}
            />
        </div>
    );
};

// ── VideoContent（ランチャー） ────────────────────────────────────────────────

export const VideoContent = React.memo(() => {
    const { file, lightboxStartTime } = useViewerContext();
    const api = useElectronViewerApi();
    const setLightboxCurrentTime = useUIStore(s => s.setLightboxCurrentTime);
    const videoVolumeSetting = useSettingsStore(s => s.videoVolume);
    const mpvEmbedded = useSettingsStore(s => s.mpvEmbedded);
    const closeLightbox = useUIStore(s => s.closeLightbox);

    const [useFallback, setUseFallback] = useState(false);
    const [launching, setLaunching] = useState(true);
    const [embeddedActive, setEmbeddedActive] = useState(false);
    const videoAreaRef = useRef<HTMLDivElement | null>(null);

    // ── 見どころボタン（BottomBar のスロットに常時表示） ────────────────────
    const [bookmarkOpen, setBookmarkOpen] = useState(false);
    const toggleBookmark = useCallback(() => setBookmarkOpen(v => !v), []);
    const closeBookmark = useCallback(() => setBookmarkOpen(false), []);

    const bookmarkButtonRender = useCallback(() => (
        <button
            type="button"
            onClick={toggleBookmark}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-lg transition ${
                bookmarkOpen
                    ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                    : 'border-surface-600 bg-viewer-surface-soft text-surface-200 hover:bg-surface-900 hover:text-surface-50'
            }`}
            title="再開 / 見どころ"
        >
            <Bookmark size={14} />
            <span>見どころ</span>
        </button>
    ), [bookmarkOpen, toggleBookmark]);
    useViewerSlots('bottom-action', bookmarkButtonRender);

    // 見どころポップオーバー（開いているときだけ登録）
    const bookmarkPopoverRender = useCallback(() => {
        // Phase 2-6 で PlaybackBookmarksPopover に差し替え
        const BookmarksPopover = React.lazy(() =>
            import('./video/PlaybackBookmarksPopover').then(m => ({ default: m.PlaybackBookmarksPopover })),
        );
        return (
            <React.Suspense fallback={null}>
                <BookmarksPopover file={file} onClose={closeBookmark} />
            </React.Suspense>
        );
    }, [file, closeBookmark]);
    useViewerSlots('popover', bookmarkOpen ? bookmarkPopoverRender : null);

    // mpv 起動
    useEffect(() => {
        let mounted = true;
        let closedByMpvSuccess = false;

        const launch = async () => {
            const available = await api.isMpvAvailable();
            if (!mounted) return;

            if (!available) {
                setUseFallback(true);
                setLaunching(false);
                return;
            }

            let videoRect: { x: number; y: number; width: number; height: number } | null = null;
            if (mpvEmbedded && videoAreaRef.current) {
                const r = videoAreaRef.current.getBoundingClientRect();
                videoRect = { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
            }

            const result = await api.openMpv({
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                startTime: lightboxStartTime,
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
            if (!closedByMpvSuccess && !useUIStore.getState().lightboxFile) {
                void api.closeMpv();
            }
        };
    }, [api, file.id, file.path, file.name, lightboxStartTime, videoVolumeSetting, mpvEmbedded, closeLightbox]);

    // ファイル切替時に見どころパネルを閉じる
    useEffect(() => {
        setBookmarkOpen(false);
        setLightboxCurrentTime(null);
    }, [file.id, setLightboxCurrentTime]);

    if (useFallback) {
        return <VideoFallback startTimeSeconds={lightboxStartTime} />;
    }

    if (embeddedActive) {
        return <EmbeddedMpv startTimeSeconds={lightboxStartTime} videoAreaRef={videoAreaRef} />;
    }

    // 起動中のプレースホルダー
    return (
        <div className="pointer-events-auto flex h-full w-full flex-col">
            <div ref={videoAreaRef} className="flex min-h-0 flex-1 items-center justify-center bg-black">
                {launching && <p className="text-sm text-surface-400">動画プレーヤーを起動中...</p>}
            </div>
            <div className="flex-shrink-0 bg-surface-900/95 py-4" />
        </div>
    );
});

VideoContent.displayName = 'VideoContent';
