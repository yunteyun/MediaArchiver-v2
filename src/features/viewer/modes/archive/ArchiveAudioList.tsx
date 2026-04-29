import React from 'react';
import { Music } from 'lucide-react';
import { toMediaUrl } from '../../../../utils/mediaPath';
import type { useArchiveAudioPlayer } from './useArchiveAudioPlayer';

type AudioPlayerHandle = ReturnType<typeof useArchiveAudioPlayer>;

interface ArchiveAudioListProps {
    entries: string[];
    audioVolume: number;
    player: AudioPlayerHandle;
    wide: boolean;
}

export const ArchiveAudioList: React.FC<ArchiveAudioListProps> = ({
    entries,
    audioVolume,
    player,
    wide,
}) => (
    <div className={`${wide ? 'w-[560px]' : 'w-full max-w-[920px]'} min-w-0 max-h-full flex-shrink-0`}>
        <div className="flex h-full max-h-full flex-col rounded-xl border border-surface-500/90 bg-black p-5 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-lg font-medium text-surface-100">
                <Music size={22} />
                <span>音声ファイル ({entries.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {entries.map((entry, index) => {
                    const isPlaying = player.currentAudioIndex === index;
                    return (
                        <button
                            type="button"
                            key={`${entry}-${index}`}
                            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                                isPlaying
                                    ? 'bg-primary-600 text-white shadow-lg'
                                    : 'text-surface-200 hover:bg-surface-700/90'
                            }`}
                            onClick={() => { void player.handleSelect(entry, index); }}
                        >
                            <Music
                                size={18}
                                className={`flex-shrink-0 ${isPlaying ? 'animate-pulse text-white' : 'text-primary-400'}`}
                            />
                            <span className="truncate">{entry.split('/').pop() ?? entry}</span>
                        </button>
                    );
                })}
            </div>

            {player.currentAudioPath && (
                <div className="mt-4 flex-shrink-0 border-t border-surface-500/80 pt-4">
                    <audio
                        ref={player.audioRef}
                        src={toMediaUrl(player.currentAudioPath)}
                        controls
                        autoPlay={player.isPlaying}
                        className="block w-full min-w-0"
                        onLoadedMetadata={(e) => {
                            e.currentTarget.volume = audioVolume;
                            const duration = Number.isFinite(e.currentTarget.duration)
                                ? e.currentTarget.duration
                                : 0;
                            const safeTime = Math.max(
                                0,
                                Math.min(player.audioCurrentTime, duration || player.audioCurrentTime),
                            );
                            if (safeTime > 0) e.currentTarget.currentTime = safeTime;
                            if (player.isPlaying) {
                                void e.currentTarget.play().catch(() => undefined);
                            }
                        }}
                        onTimeUpdate={(e) => player.handleTimeUpdate(e.currentTarget.currentTime)}
                        onPlay={player.handlePlay}
                        onPause={player.handlePause}
                        onEnded={() => { void player.handleEnded(); }}
                    />
                    <label className="mt-3 flex items-center gap-2 text-sm text-surface-300">
                        <input
                            type="checkbox"
                            checked={player.autoPlay}
                            onChange={(e) => player.setAutoPlay(e.target.checked)}
                            className="h-4 w-4 accent-primary-500"
                        />
                        連続再生
                    </label>
                </div>
            )}
        </div>
    </div>
);
