import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useMpvPlayer } from './useMpvPlayer';
import { useMpvKeyboard } from './useMpvKeyboard';
import { MpvControlBar } from './MpvControlBar';
import { useSettingsStore } from '../../stores/useSettingsStore';

export function MpvWindow(): React.ReactElement {
    const player = useMpvPlayer();
    const initialVolume = useSettingsStore((s) => s.videoVolume);
    const [volume, setVolumeLocal] = useState(initialVolume);

    // 再生終了時に閉じる
    useEffect(() => {
        return window.electronAPI.onMpvEnded(() => {
            player.close();
        });
    }, [player]);

    const handleVolumeChange = (v: number) => {
        setVolumeLocal(v);
        player.setVolume(v);
    };

    useMpvKeyboard({
        togglePause: player.togglePause,
        seek: player.seek,
        currentTime: player.currentTime,
        volume,
        onVolumeChange: handleVolumeChange,
        onToggleMute: player.toggleMute,
        onToggleFullscreen: player.toggleFullscreen,
        onClose: player.close,
    });

    return (
        <div
            className="flex h-screen flex-col select-none"
            style={{ background: 'transparent' }}
        >
            {/* 上部バー */}
            <div
                className="flex h-12 flex-shrink-0 items-center justify-between bg-surface-900 px-4"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <span
                    className="truncate text-sm text-surface-200"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    {player.fileName || '動画'}
                </span>
                <button
                    type="button"
                    onClick={player.close}
                    className="flex-shrink-0 rounded p-1.5 text-surface-400 transition hover:bg-surface-800 hover:text-surface-100"
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

            {/* 共通コントロールバー */}
            <MpvControlBar
                currentTime={player.currentTime}
                duration={player.duration}
                isPaused={player.isPaused}
                volume={volume}
                isMuted={player.isMuted}
                playbackRate={player.playbackRate}
                isFullscreen={player.isFullscreen}
                file={player.file}
                onTogglePause={player.togglePause}
                onSeek={player.seek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={player.toggleMute}
                onSpeedChange={player.setSpeed}
                onToggleFullscreen={player.toggleFullscreen}
            />
        </div>
    );
}
