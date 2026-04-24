import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';

export interface UseArchiveAudioPlayerResult {
    currentAudioPath: string | null;
    currentAudioIndex: number;
    audioCurrentTime: number;
    isPlaying: boolean;
    autoPlay: boolean;
    audioRef: RefObject<HTMLAudioElement | null>;
    setAutoPlay: (value: boolean) => void;
    handleSelect: (entry: string, index: number) => Promise<void>;
    handleEnded: () => Promise<void>;
    handleTimeUpdate: (time: number) => void;
    handlePlay: () => void;
    handlePause: () => void;
}

export function useArchiveAudioPlayer(
    filePath: string,
    audioEntries: string[],
): UseArchiveAudioPlayerResult {
    const showToast = useUIStore((state) => state.showToast);
    const showToastRef = useRef(showToast);
    showToastRef.current = showToast;

    const [currentAudioPath, setCurrentAudioPath] = useState<string | null>(null);
    const [currentAudioIndex, setCurrentAudioIndex] = useState(-1);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoPlay, setAutoPlay] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setCurrentAudioPath(null);
        setCurrentAudioIndex(-1);
        setAudioCurrentTime(0);
        setIsPlaying(false);
    }, [filePath]);

    const handleSelect = useCallback(async (entry: string, index: number) => {
        try {
            const extractedPath = await window.electronAPI.extractArchiveAudioFile(filePath, entry);
            if (!extractedPath) {
                showToastRef.current('書庫内音声の読み込みに失敗しました', 'error');
                return;
            }
            setCurrentAudioPath(extractedPath);
            setCurrentAudioIndex(index);
            setAudioCurrentTime(0);
            setIsPlaying(true);
        } catch (error) {
            console.error('Failed to extract archive audio file:', error);
            showToastRef.current('書庫内音声の読み込みに失敗しました', 'error');
        }
    }, [filePath]);

    const handleEnded = useCallback(async () => {
        setIsPlaying(false);
        setAudioCurrentTime(0);
        if (!autoPlay || currentAudioIndex < 0 || currentAudioIndex >= audioEntries.length - 1) {
            return;
        }
        const nextIndex = currentAudioIndex + 1;
        const nextEntry = audioEntries[nextIndex];
        if (!nextEntry) return;
        await handleSelect(nextEntry, nextIndex);
    }, [autoPlay, currentAudioIndex, audioEntries, handleSelect]);

    const handleTimeUpdate = useCallback((time: number) => {
        setAudioCurrentTime(time);
    }, []);

    const handlePlay = useCallback(() => setIsPlaying(true), []);
    const handlePause = useCallback(() => setIsPlaying(false), []);

    return {
        currentAudioPath,
        currentAudioIndex,
        audioCurrentTime,
        isPlaying,
        autoPlay,
        audioRef,
        setAutoPlay,
        handleSelect,
        handleEnded,
        handleTimeUpdate,
        handlePlay,
        handlePause,
    };
}
