import React, { useCallback, useState } from 'react';
import { Bookmark, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { CenterViewerPlaybackOverlay } from '../center-viewer/CenterViewerPlaybackOverlay';

export function formatTime(sec: number): string {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const SPEED_STEPS = [0.5, 1.0, 1.25, 1.5, 2.0] as const;

export interface MpvControlBarProps {
    currentTime: number;
    duration: number;
    isPaused: boolean;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    isFullscreen: boolean;
    file: MediaFile | null;
    onTogglePause: () => void;
    onSeek: (sec: number) => void;
    onVolumeChange: (v: number) => void;
    onToggleMute: () => void;
    onSpeedChange: (speed: number) => void;
    onToggleFullscreen: () => void;
}

export const MpvControlBar = React.memo<MpvControlBarProps>(({
    currentTime,
    duration,
    isPaused,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    file,
    onTogglePause,
    onSeek,
    onVolumeChange,
    onToggleMute,
    onSpeedChange,
    onToggleFullscreen,
}) => {
    const [seeking, setSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const [overlayOpen, setOverlayOpen] = useState(false);

    const handleSeekPointerDown = useCallback(() => {
        setSeeking(true);
        setSeekValue(currentTime);
    }, [currentTime]);

    const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSeekValue(Number(e.target.value));
    }, []);

    const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
        onSeek(Number(e.currentTarget.value));
        setSeeking(false);
    }, [onSeek]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onVolumeChange(Number(e.target.value));
    }, [onVolumeChange]);

    const cycleSpeed = useCallback(() => {
        const idx = SPEED_STEPS.indexOf(playbackRate as typeof SPEED_STEPS[number]);
        const next = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length] ?? 1.0;
        onSpeedChange(next);
    }, [playbackRate, onSpeedChange]);

    const displayTime = seeking ? seekValue : currentTime;

    return (
        <div className="relative flex-shrink-0 select-none bg-surface-900/95 px-4 pb-3 pt-2">
            {/* 見どころオーバーレイ */}
            {file && overlayOpen && (
                <div className="absolute bottom-full right-4 z-50 mb-2">
                    <CenterViewerPlaybackOverlay
                        file={file}
                        currentTime={currentTime}
                        onSeek={onSeek}
                    />
                </div>
            )}

            {/* シークバー */}
            <div className="mb-2 flex items-center gap-2 text-xs text-surface-400">
                <span className="w-12 text-right tabular-nums">{formatTime(displayTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={seeking ? seekValue : currentTime}
                    onPointerDown={handleSeekPointerDown}
                    onChange={handleSeekChange}
                    onPointerUp={handleSeekPointerUp}
                    className="h-1.5 flex-1 cursor-pointer accent-primary-500"
                />
                <span className="w-12 tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* ボタン列 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* 再生 / 一時停止 */}
                    <button
                        type="button"
                        onClick={onTogglePause}
                        className="flex items-center justify-center rounded-full p-2 text-surface-100 transition hover:bg-surface-800"
                        aria-label={isPaused ? '再生' : '一時停止'}
                    >
                        {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                    </button>

                    {/* ミュート */}
                    <button
                        type="button"
                        onClick={onToggleMute}
                        className="flex items-center justify-center rounded-full p-1.5 text-surface-400 transition hover:bg-surface-800 hover:text-surface-100"
                        aria-label={isMuted ? 'ミュート解除' : 'ミュート'}
                    >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>

                    {/* 音量スライダー */}
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="h-1.5 w-20 cursor-pointer accent-primary-500"
                        aria-label="音量"
                    />

                    {/* 再生速度 */}
                    <button
                        type="button"
                        onClick={cycleSpeed}
                        className="rounded-md border border-surface-600 bg-surface-900 px-2 py-1 text-xs tabular-nums text-surface-300 transition hover:bg-surface-800 hover:text-surface-100"
                        aria-label={`再生速度 ${playbackRate}x`}
                        title="クリックで速度切替"
                    >
                        {playbackRate === 1 ? '1x' : `${playbackRate}x`}
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* 見どころボタン */}
                    {file && (
                        <button
                            type="button"
                            onClick={() => setOverlayOpen((v) => !v)}
                            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
                                overlayOpen
                                    ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                                    : 'border-surface-600 bg-surface-900 text-surface-300 hover:bg-surface-800 hover:text-surface-100'
                            }`}
                            aria-label="見どころ"
                        >
                            <Bookmark size={14} />
                            <span>見どころ</span>
                        </button>
                    )}

                    {/* フルスクリーン */}
                    <button
                        type="button"
                        onClick={onToggleFullscreen}
                        className="flex items-center justify-center rounded-full p-1.5 text-surface-400 transition hover:bg-surface-800 hover:text-surface-100"
                        aria-label={isFullscreen ? 'フルスクリーン解除' : 'フルスクリーン'}
                    >
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
});

MpvControlBar.displayName = 'MpvControlBar';
