import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaFile } from '../../types/file';
import { toMediaUrl } from '../../utils/mediaPath';
import { getArchiveImageCount } from '../../utils/fileHelpers';
import { useMangaViewerSettingsStore } from '../../stores/useMangaViewerSettingsStore';
import { resolvePagePair, stepPage } from './mangaPagePairing';
import { useArchivePagePreload } from './useArchivePagePreload';
import { MangaViewerSettingsPanel } from './MangaViewerSettingsPanel';
import { MangaPageSlider } from './MangaPageSlider';

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

    const handleZoneClick = useCallback((zone: 'left' | 'right') => {
        const direction: 'next' | 'prev' =
            bindingDirection === 'rtl'
                ? (zone === 'left' ? 'next' : 'prev')
                : (zone === 'left' ? 'prev' : 'next');
        setCurrentIndex(i => stepPage(i, direction, totalCount, { pageMode, bindingDirection, firstPageSingle }));
    }, [bindingDirection, totalCount, pageMode, firstPageSingle]);

    const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if ((e.target as HTMLElement).closest('[data-manga-control]')) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        if (relX < 1 / 3) handleZoneClick('left');
        else if (relX > 2 / 3) handleZoneClick('right');
    }, [handleZoneClick]);

    const handleSeek = useCallback((index: number) => {
        setCurrentIndex(resolvePagePair(index, totalCount, { pageMode, firstPageSingle }).primary);
    }, [totalCount, pageMode, firstPageSingle]);

    // ホイールでページ送り（連続発火を抑える簡易スロットル）
    const wheelLastRef = useRef(0);
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY === 0) return;
        const now = Date.now();
        if (now - wheelLastRef.current < 180) return;
        wheelLastRef.current = now;
        const direction: 'next' | 'prev' = e.deltaY > 0 ? 'next' : 'prev';
        setCurrentIndex(i => stepPage(i, direction, totalCount, { pageMode, bindingDirection, firstPageSingle }));
    }, [totalCount, pageMode, bindingDirection, firstPageSingle]);

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

    const isAtStart = currentIndex === 0;
    const isAtEnd = stepPage(currentIndex, 'next', totalCount, settings) === currentIndex;

    // 綴じ方向ごとのナビボタン役割
    const leftBtnDirection: 'prev' | 'next' = bindingDirection === 'rtl' ? 'next' : 'prev';
    const rightBtnDirection: 'prev' | 'next' = bindingDirection === 'rtl' ? 'prev' : 'next';
    const leftBtnDisabled = leftBtnDirection === 'prev' ? isAtStart : isAtEnd;
    const rightBtnDisabled = rightBtnDirection === 'prev' ? isAtStart : isAtEnd;

    return (
        <div
            className="pointer-events-auto group relative flex h-full w-full select-none items-center justify-center"
            onClick={handleContainerClick}
            onWheel={handleWheel}
        >
            <div data-manga-control>
                <MangaViewerSettingsPanel isOpen={isPanelOpen} onToggle={togglePanel} />
            </div>

            {/* 左ナビボタン */}
            <button
                data-manga-control
                type="button"
                disabled={leftBtnDisabled}
                onClick={() => setCurrentIndex(i => stepPage(i, leftBtnDirection, totalCount, settings))}
                className="pointer-events-auto absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 disabled:cursor-default disabled:!opacity-20"
                aria-label={leftBtnDirection === 'next' ? '次のページ' : '前のページ'}
            >
                <ChevronLeft size={24} />
            </button>

            {/* 右ナビボタン */}
            <button
                data-manga-control
                type="button"
                disabled={rightBtnDisabled}
                onClick={() => setCurrentIndex(i => stepPage(i, rightBtnDirection, totalCount, settings))}
                className="pointer-events-auto absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 disabled:cursor-default disabled:!opacity-20"
                aria-label={rightBtnDirection === 'next' ? '次のページ' : '前のページ'}
            >
                <ChevronRight size={24} />
            </button>

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
                <MangaPageSlider
                    currentIndex={pair.secondary ?? pair.primary}
                    totalCount={totalCount}
                    bindingDirection={bindingDirection}
                    pageLabel={pageLabel}
                    onSeek={handleSeek}
                />
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
