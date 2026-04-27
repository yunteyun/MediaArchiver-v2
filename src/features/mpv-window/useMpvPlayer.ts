import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { useSettingsStore } from '../../stores/useSettingsStore';

export interface MpvPlayerState {
    currentTime: number;
    duration: number;
    isPaused: boolean;
    isMuted: boolean;
    playbackRate: number;
    isFullscreen: boolean;
    fileId: string | null;
    fileName: string;
    file: MediaFile | null;
}

export interface MpvPlayerActions {
    togglePause: () => void;
    seek: (sec: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setSpeed: (speed: number) => void;
    toggleFullscreen: () => void;
    close: () => void;
}

export function useMpvPlayer(): MpvPlayerState & MpvPlayerActions {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fileId, setFileId] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [file, setFile] = useState<MediaFile | null>(null);

    const lastPersistTimeRef = useRef<number>(0);
    const lastPersistedPosRef = useRef<number | null>(null);
    const isMutedRef = useRef(false);

    // ファイルコンテキスト受信 + MediaFile を IPC で取得
    useEffect(() => {
        return window.electronAPI.onMpvFileContext(({ fileId: id, fileName: name }) => {
            setFileId(id);
            setFileName(name);
            void window.electronAPI.getFileById(id).then((f) => {
                if (f) setFile(f);
            });
        });
    }, []);

    // 再生時間更新 + 再生位置永続化
    useEffect(() => {
        return window.electronAPI.onMpvTimeUpdate(({ currentTime: t }) => {
            setCurrentTime(t);

            const now = Date.now();
            if (!fileId || now - lastPersistTimeRef.current < 500) return;
            lastPersistTimeRef.current = now;

            const normalized = t < 5 ? null : t;
            const last = lastPersistedPosRef.current;
            if (normalized === null && last === null) return;
            if (normalized !== null && last !== null && Math.abs(normalized - last) < 10) return;

            lastPersistedPosRef.current = normalized;
            void window.electronAPI.updateFilePlaybackPosition(fileId, normalized);
        });
    }, [fileId]);

    useEffect(() => {
        return window.electronAPI.onMpvDurationUpdate(({ duration: d }) => {
            setDuration(d);
        });
    }, []);

    useEffect(() => {
        return window.electronAPI.onMpvPauseChange(({ paused }) => {
            setIsPaused(paused);
        });
    }, []);

    useEffect(() => {
        return window.electronAPI.onMpvMuteChange(({ muted }) => {
            setIsMuted(muted);
            isMutedRef.current = muted;
        });
    }, []);

    useEffect(() => {
        return window.electronAPI.onMpvSpeedChange(({ speed }) => {
            setPlaybackRate(speed);
        });
    }, []);

    useEffect(() => {
        return window.electronAPI.onMpvFullscreenChange(({ fullscreen }) => {
            setIsFullscreen(fullscreen);
        });
    }, []);

    // ウィンドウが閉じる前に最終位置を保存
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (fileId && currentTime >= 5) {
                void window.electronAPI.updateFilePlaybackPosition(fileId, currentTime);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [fileId, currentTime]);

    const togglePause = useCallback(() => {
        void window.electronAPI.mpvPause();
    }, []);

    const seek = useCallback((sec: number) => {
        void window.electronAPI.mpvSeek(sec);
    }, []);

    const setVolume = useCallback((volume: number) => {
        void window.electronAPI.mpvSetVolume(volume);
        useSettingsStore.getState().setVideoVolume(volume);
    }, []);

    const toggleMute = useCallback(() => {
        const next = !isMutedRef.current;
        void window.electronAPI.mpvSetMuted(next);
    }, []);

    const setSpeed = useCallback((speed: number) => {
        void window.electronAPI.mpvSetSpeed(speed);
    }, []);

    const toggleFullscreen = useCallback(() => {
        void window.electronAPI.mpvSetFullscreen(!isFullscreen);
    }, [isFullscreen]);

    const close = useCallback(() => {
        void window.electronAPI.closeMpv();
    }, []);

    return {
        currentTime, duration, isPaused, isMuted, playbackRate, isFullscreen,
        fileId, fileName, file,
        togglePause, seek, setVolume, toggleMute, setSpeed, toggleFullscreen, close,
    };
}
