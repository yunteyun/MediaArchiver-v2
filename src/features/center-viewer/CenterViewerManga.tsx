import React, { useEffect, useState, useCallback } from 'react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { getArchiveImageCount } from '../../utils/fileHelpers';
import { useMangaViewerSettingsStore } from '../../stores/useMangaViewerSettingsStore';
import { resolvePagePair, stepPage } from './mangaPagePairing';
import { useArchivePagePreload } from './useArchivePagePreload';
import { MangaViewerSettingsPanel } from './MangaViewerSettingsPanel';

interface CenterViewerMangaProps {
    file: MediaFile;
}

export const CenterViewerManga = React.memo<CenterViewerMangaProps>(({ file }) => {
    const pageMode = useMangaViewerSettingsStore((s) => s.pageMode);
    const bindingDirection = useMangaViewerSettingsStore((s) => s.bindingDirection);
    const firstPageSingle = useMangaViewerSettingsStore((s) => s.firstPageSingle);
    const settings = { pageMode, bindingDirection, firstPageSingle };

    const [totalCount, setTotalCount] = useState<number>(() => getArchiveImageCount(file) ?? 0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [primaryPath, setPrimaryPath] = useState<string | null>(null);
    const [secondaryPath, setSecondaryPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const togglePanel = useCallback(() => setIsPanelOpen((v) => !v), []);

    // ファイルが変わったらリセット
    useEffect(() => {
        setCurrentIndex(0);
        setPrimaryPath(null);
        setSecondaryPath(null);
        setLoading(true);
        const count = getArchiveImageCount({ type: file.type, metadata: file.metadata });
        if (count != null) {
            setTotalCount(count);
        } else {
            void window.electronAPI.getArchiveMetadata(file.path).then(meta => {
                if (meta?.imageEntries?.length) setTotalCount(meta.imageEntries.length);
            });
        }
    }, [file.id, file.path, file.type, file.metadata]);

    // 現在インデックスをペア先頭に正規化し、表示ページを読み込む
    useEffect(() => {
        if (!file.path || totalCount === 0) return;
        const pair = resolvePagePair(currentIndex, totalCount, settings);
        const normalizedIndex = pair.primary;

        // 正規化が必要な場合は index を修正して再 effect に委ねる
        if (normalizedIndex !== currentIndex) {
            setCurrentIndex(normalizedIndex);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setPrimaryPath(null);
        setSecondaryPath(null);

        // primary を取得（ローディング解除はこちらで行う）
        void window.electronAPI.getArchiveImageByIndex(file.path, pair.primary).then(p => {
            if (!cancelled) {
                setPrimaryPath(p);
                setLoading(false);
            }
        });

        // secondary を並行取得（存在する場合のみ）
        if (pair.secondary !== null) {
            void window.electronAPI.getArchiveImageByIndex(file.path, pair.secondary).then(p => {
                if (!cancelled) setSecondaryPath(p);
            });
        }

        return () => { cancelled = true; };
    // settings の変化もトリガーに含める（ページモード切替で再計算）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file.path, currentIndex, totalCount, pageMode, firstPageSingle]);

    // 先読み
    useArchivePagePreload(file.path, currentIndex, totalCount, settings);

    // キーボードナビゲーション（capture phase で CenterViewerRoot より先に処理）
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

            let direction: 'next' | 'prev' | null = null;

            if (event.key === 'PageDown') {
                // PageDown は綴じ方向に関係なく常に「次」（NeeView 流）
                direction = 'next';
            } else if (event.key === 'PageUp') {
                direction = 'prev';
            } else if (event.key === 'ArrowRight') {
                // 右綴じ(rtl)は右キーで「前」に戻る（視覚的に右へめくる = 前のページ）
                direction = bindingDirection === 'rtl' ? 'prev' : 'next';
            } else if (event.key === 'ArrowLeft') {
                direction = bindingDirection === 'rtl' ? 'next' : 'prev';
            }

            if (direction !== null) {
                event.preventDefault();
                event.stopPropagation();
                setCurrentIndex(i => stepPage(i, direction!, totalCount, settings));
            }
            // Escape は CenterViewerRoot に委ねる
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalCount, bindingDirection, pageMode, firstPageSingle]);

    if (totalCount === 0 && !loading) {
        return (
            <div className="pointer-events-auto flex h-full w-full items-center justify-center">
                <p className="text-sm text-surface-400">画像エントリが見つかりません</p>
            </div>
        );
    }

    const pair = resolvePagePair(currentIndex, totalCount, settings);
    const isSpread = pageMode === 'spread' && pair.secondary !== null;

    // 右綴じ(rtl)時: 右ページ(primary) を右側、左ページ(secondary) を左側に配置
    // つまり表示順は [secondary, primary]
    const leftImg = isSpread
        ? (bindingDirection === 'rtl' ? secondaryPath : primaryPath)
        : primaryPath;
    const rightImg = isSpread
        ? (bindingDirection === 'rtl' ? primaryPath : secondaryPath)
        : null;

    const pageLabel = isSpread
        ? `${pair.primary + 1} - ${pair.secondary! + 1} / ${totalCount}`
        : `${(pair.primary) + 1} / ${totalCount}`;

    return (
        <div className="relative flex h-full w-full select-none items-center justify-center">
            <MangaViewerSettingsPanel isOpen={isPanelOpen} onToggle={togglePanel} />

            {loading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-500 border-t-white" />
            ) : isSpread ? (
                <div className="flex h-full w-full items-center justify-center">
                    <PageImage src={leftImg} alt={`ページ ${pair.primary + 1}`} side="left" />
                    <PageImage src={rightImg} alt={`ページ ${pair.secondary! + 1}`} side="right" />
                </div>
            ) : primaryPath ? (
                <img
                    src={toMediaUrl(primaryPath)}
                    alt={`ページ ${pair.primary + 1}`}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                    draggable={false}
                />
            ) : (
                <p className="text-sm text-surface-400">ページを読み込めませんでした</p>
            )}

            {totalCount > 0 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs tabular-nums text-white">
                    {pageLabel}
                </div>
            )}
        </div>
    );
});
CenterViewerManga.displayName = 'CenterViewerManga';

// ─── 見開き用ページ画像 ────────────────────────────────────────────────────────

const PageImage = React.memo<{ src: string | null; alt: string; side: 'left' | 'right' }>(
    ({ src, alt, side }) => {
        if (!src) {
            // secondaryがまだ読み込み中または存在しない場合のプレースホルダー
            return <div className={`flex h-full flex-1 items-center justify-center ${side === 'left' ? 'border-r border-surface-800' : ''}`} />;
        }
        return (
            <img
                src={toMediaUrl(src)}
                alt={alt}
                style={{
                    maxWidth: '50%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    flex: '0 1 auto',
                }}
                draggable={false}
            />
        );
    },
);
PageImage.displayName = 'PageImage';
