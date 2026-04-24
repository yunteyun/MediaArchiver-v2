import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { useFileStore } from '../../stores/useFileStore';
import { useUIStore } from '../../stores/useUIStore';

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

export const CenterViewerVideo = React.memo<CenterViewerVideoProps>(({
    file,
    videoVolume,
    startTimeSeconds,
}) => {
    const updatePlaybackPosition = useFileStore((state) => state.updatePlaybackPosition);
    const setLightboxCurrentTime = useUIStore((state) => state.setLightboxCurrentTime);
    const [hasError, setHasError] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastPersistedPlaybackPositionRef = useRef<number | null>(
        typeof file.playbackPositionSeconds === 'number' ? file.playbackPositionSeconds : null
    );
    const lastTimeUpdateRef = useRef<number>(0);

    useEffect(() => {
        setHasError(false);
    }, [file.id, file.path]);

    useEffect(() => {
        return () => {
            setLightboxCurrentTime(null);
        };
    }, [file.id, setLightboxCurrentTime]);

    useEffect(() => {
        lastPersistedPlaybackPositionRef.current = typeof file.playbackPositionSeconds === 'number'
            ? file.playbackPositionSeconds
            : null;
    }, [file.id, file.playbackPositionSeconds]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = Math.max(0, Math.min(1, videoVolume));
        }
    }, [file.id, videoVolume]);

    const normalizePlaybackPosition = useCallback((currentTime: number, duration?: number | null): number | null => {
        if (!Number.isFinite(currentTime) || currentTime < 5) return null;
        if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
            if (duration - currentTime <= 15) return null;
            return Math.max(0, Math.min(duration, currentTime));
        }
        return Math.max(0, currentTime);
    }, []);

    const persistPlaybackPosition = useCallback(async (
        currentTime: number,
        duration?: number | null,
        force: boolean = false,
    ) => {
        const normalizedPosition = normalizePlaybackPosition(currentTime, duration);
        const lastPosition = lastPersistedPlaybackPositionRef.current;

        if (!force) {
            if (normalizedPosition === null && lastPosition === null) return;
            if (
                normalizedPosition !== null
                && lastPosition !== null
                && Math.abs(normalizedPosition - lastPosition) < 10
            ) return;
        }

        try {
            const result = await window.electronAPI.updateFilePlaybackPosition(file.id, normalizedPosition);
            if (!result.success) return;
            lastPersistedPlaybackPositionRef.current = result.playbackPositionSeconds ?? null;
            updatePlaybackPosition(
                file.id,
                result.playbackPositionSeconds ?? null,
                result.playbackPositionUpdatedAt ?? null,
            );
        } catch (error) {
            console.error('Failed to persist playback position:', error);
        }
    }, [file.id, normalizePlaybackPosition, updatePlaybackPosition]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || startTimeSeconds == null || !Number.isFinite(startTimeSeconds)) return;

        const seekToStartTime = () => {
            if (!video.duration || Number.isNaN(video.duration)) return;
            video.currentTime = Math.max(0, Math.min(video.duration, startTimeSeconds));
            setLightboxCurrentTime(video.currentTime);
        };

        if (video.readyState >= 1) {
            seekToStartTime();
            return;
        }

        video.addEventListener('loadedmetadata', seekToStartTime, { once: true });
        return () => {
            video.removeEventListener('loadedmetadata', seekToStartTime);
        };
    }, [file.id, setLightboxCurrentTime, startTimeSeconds]);

    useEffect(() => {
        const video = videoRef.current;
        return () => {
            if (!video) return;
            void persistPlaybackPosition(video.currentTime, video.duration, true);
        };
    }, [file.id, persistPlaybackPosition]);

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
            onTimeUpdate={(event) => {
                const now = Date.now();
                if (now - lastTimeUpdateRef.current >= 500) {
                    lastTimeUpdateRef.current = now;
                    setLightboxCurrentTime(event.currentTarget.currentTime);
                    void persistPlaybackPosition(event.currentTarget.currentTime, event.currentTarget.duration);
                }
            }}
            onLoadedMetadata={(event) => {
                setLightboxCurrentTime(event.currentTarget.currentTime);
            }}
            onPause={(event) => {
                setLightboxCurrentTime(event.currentTarget.currentTime);
                void persistPlaybackPosition(event.currentTarget.currentTime, event.currentTarget.duration, true);
            }}
            onEnded={(event) => {
                setLightboxCurrentTime(event.currentTarget.currentTime);
                void persistPlaybackPosition(event.currentTarget.currentTime, event.currentTarget.duration, true);
            }}
            onError={() => setHasError(true)}
        />
    );
});

CenterViewerVideo.displayName = 'CenterViewerVideo';
