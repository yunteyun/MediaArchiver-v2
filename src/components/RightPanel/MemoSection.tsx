import React from 'react';
import type { MediaFile, PlaybackBookmark } from '../../types/file';
import { useFileStore } from '../../stores/useFileStore';
import { SectionTitle } from './SectionTitle';

interface MemoSectionProps {
    file: MediaFile;
}

export const MemoSection = React.memo<MemoSectionProps>(({ file }) => {
    const refreshFile = useFileStore((state) => state.refreshFile);
    const [notes, setNotes] = React.useState(file.notes || '');
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
    const [isOpen, setIsOpen] = React.useState(false);
    const [playbackBookmarks, setPlaybackBookmarks] = React.useState<PlaybackBookmark[]>([]);
    const [isBookmarksLoading, setIsBookmarksLoading] = React.useState(false);
    const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setNotes(file.notes || '');
        setSaveStatus('idle');
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
    }, [file.id, file.notes]);

    React.useEffect(() => {
        setIsOpen(false);
    }, [file.id]);

    React.useEffect(() => {
        let disposed = false;

        if (file.type !== 'video') {
            setPlaybackBookmarks([]);
            setIsBookmarksLoading(false);
            return () => {
                disposed = true;
            };
        }

        const loadPlaybackBookmarks = async () => {
            setIsBookmarksLoading(true);
            try {
                const result = await window.electronAPI.getPlaybackBookmarks(file.id);
                if (!disposed) {
                    setPlaybackBookmarks(result);
                }
            } catch (error) {
                console.error('Failed to load playback bookmarks in RightPanel MemoSection:', error);
                if (!disposed) {
                    setPlaybackBookmarks([]);
                }
            } finally {
                if (!disposed) {
                    setIsBookmarksLoading(false);
                }
            }
        };

        void loadPlaybackBookmarks();

        return () => {
            disposed = true;
        };
    }, [file.id, file.type]);

    React.useEffect(() => () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
    }, []);

    const saveNotes = React.useCallback(async (value: string) => {
        setSaveStatus('saving');
        try {
            await window.electronAPI.updateFileNotes(file.id, value);
            await refreshFile(file.id);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1500);
        } catch (error) {
            console.error('Failed to save notes in RightPanel:', error);
            setSaveStatus('idle');
        }
    }, [file.id, refreshFile]);

    const handleChange = React.useCallback((value: string) => {
        setNotes(value);
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            void saveNotes(value);
        }, 800);
    }, [saveNotes]);

    const handleBlur = React.useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        void saveNotes(notes);
    }, [notes, saveNotes]);

    const notedBookmarks = React.useMemo(() => playbackBookmarks
        .filter((bookmark) => typeof bookmark.note === 'string' && bookmark.note.trim().length > 0)
        .sort((a, b) => a.timeSeconds - b.timeSeconds || a.createdAt - b.createdAt), [playbackBookmarks]);
    const formatBookmarkTime = React.useCallback((seconds: number) => (
        `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
    ), []);
    const previewText = notes.trim()
        || (notedBookmarks.length > 0
            ? notedBookmarks
                .slice(0, 2)
                .map((bookmark) => `${formatBookmarkTime(bookmark.timeSeconds)} ${bookmark.note?.trim()}`)
                .join(' / ')
            : playbackBookmarks.length > 0
                ? `見どころ ${playbackBookmarks.length} 件`
                : 'メモなし');

    return (
        <section className="px-4 py-3 border-b border-surface-700">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex w-full items-start justify-between gap-3 text-left"
            >
                <div className="min-w-0 space-y-1">
                    <SectionTitle>メモ</SectionTitle>
                    <p
                        className="overflow-hidden whitespace-pre-wrap break-words text-xs leading-5 text-surface-500"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {previewText}
                    </p>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-surface-500">
                        {saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '保存済み' : ''}
                    </span>
                    <span className="text-surface-500">{isOpen ? '−' : '+'}</span>
                </div>
            </button>
            {isOpen && (
                <div className="space-y-3 pt-3">
                    <textarea
                        value={notes}
                        onChange={(event) => handleChange(event.target.value)}
                        onBlur={handleBlur}
                        rows={5}
                        placeholder="メモを入力..."
                        className="w-full resize-y rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                    />
                    {file.type === 'video' && (
                        <div className="space-y-2 rounded-lg border border-surface-700 bg-surface-950/70 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-surface-300">見どころメモ</p>
                                <span className="text-[11px] text-surface-500">
                                    {isBookmarksLoading
                                        ? '読み込み中...'
                                        : notedBookmarks.length > 0
                                            ? `${notedBookmarks.length} 件`
                                            : playbackBookmarks.length > 0
                                                ? `見どころ ${playbackBookmarks.length} 件`
                                                : 'なし'}
                                </span>
                            </div>
                            {notedBookmarks.length > 0 ? (
                                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                                    {notedBookmarks.map((bookmark) => (
                                        <div
                                            key={bookmark.id}
                                            className="rounded-md border border-surface-700 bg-surface-900/70 px-2.5 py-2"
                                        >
                                            <div className="text-[11px] font-semibold text-surface-300">
                                                {formatBookmarkTime(bookmark.timeSeconds)}
                                            </div>
                                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-surface-400">
                                                {bookmark.note}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs leading-5 text-surface-500">
                                    {playbackBookmarks.length > 0
                                        ? '見どころはありますが、メモはまだありません。'
                                        : '見どころメモはまだありません。'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
});

MemoSection.displayName = 'MemoSection';
