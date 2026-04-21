import React, { useEffect, useState } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { getArchiveImageCount } from '../../utils/fileHelpers';
import { useArchivePagePreload } from './useArchivePagePreload';

interface CenterViewerMangaProps {
    file: MediaFile;
}

export const CenterViewerManga = React.memo<CenterViewerMangaProps>(({ file }) => {
    const [totalCount, setTotalCount] = useState<number>(() => getArchiveImageCount(file) ?? 0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPagePath, setCurrentPagePath] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // ファイルが変わったらページをリセット
    useEffect(() => {
        setCurrentIndex(0);
        setCurrentPagePath(null);
        setLoading(true);
        const count = getArchiveImageCount({ type: file.type, metadata: file.metadata });
        if (count != null) {
            setTotalCount(count);
        } else {
            // メタデータが未キャッシュの場合は IPC から取得
            void window.electronAPI.getArchiveMetadata(file.path).then(meta => {
                if (meta?.imageEntries?.length) setTotalCount(meta.imageEntries.length);
            });
        }
    }, [file.id, file.path, file.type, file.metadata]);

    // 現在ページを読み込む
    useEffect(() => {
        if (!file.path || totalCount === 0) return;
        let cancelled = false;
        setLoading(true);
        setCurrentPagePath(null);
        void window.electronAPI.getArchiveImageByIndex(file.path, currentIndex).then(p => {
            if (!cancelled) {
                setCurrentPagePath(p);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [file.path, currentIndex, totalCount]);

    // ±2 ページ先読み
    useArchivePagePreload(file.path, currentIndex, totalCount);

    // キーボードナビゲーション（capture phase で CenterViewerRoot より先に処理）
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (event.key === 'ArrowRight' || event.key === 'PageDown') {
                event.preventDefault();
                event.stopPropagation();
                setCurrentIndex(i => Math.min(i + 1, Math.max(0, totalCount - 1)));
            } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
                event.preventDefault();
                event.stopPropagation();
                setCurrentIndex(i => Math.max(i - 1, 0));
            }
            // Escape は CenterViewerRoot に委ねる
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [totalCount]);

    if (totalCount === 0 && !loading) {
        return (
            <div className="pointer-events-auto flex h-full w-full items-center justify-center">
                <p className="text-sm text-surface-400">画像エントリが見つかりません</p>
            </div>
        );
    }

    return (
        <div className="relative flex h-full w-full select-none items-center justify-center">
            {loading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-500 border-t-white" />
            ) : currentPagePath ? (
                <img
                    src={toMediaUrl(currentPagePath)}
                    alt={`ページ ${currentIndex + 1}`}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                    draggable={false}
                />
            ) : (
                <p className="text-sm text-surface-400">ページを読み込めませんでした</p>
            )}
            {totalCount > 0 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs tabular-nums text-white">
                    {currentIndex + 1} / {totalCount}
                </div>
            )}
        </div>
    );
});
CenterViewerManga.displayName = 'CenterViewerManga';
