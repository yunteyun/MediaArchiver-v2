import React, { useCallback, useEffect, useState } from 'react';
import { BookmarkPlus, Pause, Play, Volume2, X } from 'lucide-react';
import { useMpvPlayer } from './useMpvPlayer';
import { CenterViewerPlaybackOverlay } from '../center-viewer/CenterViewerPlaybackOverlay';

function formatTime(sec: number): string {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function MpvWindow(): React.ReactElement {
    const player = useMpvPlayer();
    const [volume, setVolumeLocal] = useState(0.7);
    const [seeking, setSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const [overlayOpen, setOverlayOpen] = useState(false);

    // Esc で閉じる
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') player.close();
            if (e.key === ' ') { e.preventDefault(); player.togglePause(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [player]);

    // 再生終了時に閉じる
    useEffect(() => {
        return window.electronAPI.onMpvEnded(() => {
            player.close();
        });
    }, [player]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        setVolumeLocal(v);
        player.setVolume(v);
    }, [player]);

    // onPointerDown でシーク開始、onChange で表示値更新、onPointerUp でシーク確定
    // onChange 内で seeking フラグを操作しないことで、イベント順序による誤動作を防ぐ
    const handleSeekPointerDown = useCallback(() => {
        setSeeking(true);
        setSeekValue(player.currentTime);
    }, [player.currentTime]);

    const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSeekValue(Number(e.target.value));
    }, []);

    const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
        const val = Number(e.currentTarget.value);
        player.seek(val);
        setSeeking(false);
    }, [player]);

    const displayTime = seeking ? seekValue : player.currentTime;

    return (
        <div
            className="flex h-screen flex-col select-none"
            style={{ background: 'transparent' }}
        >
            {/* 上部バー */}
            <div
                className="flex h-12 flex-shrink-0 items-center justify-between px-4"
                style={{ background: '#0f172a', WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <span
                    className="truncate text-sm text-slate-300"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    {player.fileName || '動画'}
                </span>
                <button
                    type="button"
                    onClick={player.close}
                    className="flex-shrink-0 rounded p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    aria-label="閉じる"
                >
                    <X size={18} />
                </button>
            </div>

            {/* 中央エリア — mpv が描画する透過領域 */}
            <div
                className="min-h-0 flex-1"
                style={{ background: 'transparent' }}
                onDoubleClick={player.togglePause}
            />

            {/* 下部コントロールバー（relative: 見どころオーバーレイの基準） */}
            <div className="relative flex-shrink-0">
                {/* 見どころオーバーレイ */}
                {player.file && overlayOpen && (
                    <div className="absolute bottom-full right-4 z-50 mb-2">
                        <CenterViewerPlaybackOverlay
                            file={player.file}
                            currentTime={player.currentTime}
                            onSeek={player.seek}
                        />
                    </div>
                )}
            <div
                className="px-4 pb-3 pt-2"
                style={{ background: '#0f172a' }}
            >
                {/* シークバー */}
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-12 text-right tabular-nums">{formatTime(displayTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={player.duration || 100}
                        step={0.5}
                        value={seeking ? seekValue : player.currentTime}
                        onPointerDown={handleSeekPointerDown}
                        onChange={handleSeekChange}
                        onPointerUp={handleSeekPointerUp}
                        className="h-1.5 flex-1 cursor-pointer accent-blue-500"
                    />
                    <span className="w-12 tabular-nums">{formatTime(player.duration)}</span>
                </div>

                {/* ボタン列 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={player.togglePause}
                            className="flex items-center justify-center rounded-full p-2 text-white transition hover:bg-slate-700"
                            aria-label={player.isPaused ? '再生' : '一時停止'}
                        >
                            {player.isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
                        </button>

                        <div className="flex items-center gap-2 text-slate-400">
                            <Volume2 size={16} />
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={volume}
                                onChange={handleVolumeChange}
                                className="h-1.5 w-24 cursor-pointer accent-blue-500"
                                aria-label="音量"
                            />
                        </div>
                    </div>

                    {/* 見どころボタン */}
                    {player.file && (
                        <button
                            type="button"
                            onClick={() => setOverlayOpen((v) => !v)}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${overlayOpen ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            aria-label="見どころ"
                        >
                            <BookmarkPlus size={15} />
                            <span>見どころ</span>
                        </button>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
