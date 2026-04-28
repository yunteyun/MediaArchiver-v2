import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { getArchiveImageCount } from '../../../utils/fileHelpers';
import { toMediaUrl } from '../../../utils/mediaPath';
import { useMangaViewerSettingsStore } from '../../../stores/useMangaViewerSettingsStore';
import { resolvePagePair, stepPage } from './manga/pagePairing';
import { useArchivePagePreload } from './manga/useArchivePagePreload';
import { MangaPageSlider } from './manga/MangaPageSlider';
import { useViewerContext } from '../ViewerContext';
import { useViewerKeyboard } from '../hooks/useViewerKeyboard';
import { useViewerSlots } from '../hooks/useViewerSlots';
import { MangaSettingsPopover } from './manga/MangaSettingsPopover';

export const MangaContent = React.memo(() => {
    const { file } = useViewerContext();
    const pageMode = useMangaViewerSettingsStore(s => s.pageMode);
    const bindingDirection = useMangaViewerSettingsStore(s => s.bindingDirection);
    const firstPageSingle = useMangaViewerSettingsStore(s => s.firstPageSingle);
    const settings = { pageMode, bindingDirection, firstPageSingle };

    const [totalCount, setTotalCount] = useState<number>(() => getArchiveImageCount(file) ?? 0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [primaryPath, setPrimaryPath] = useState<string | null>(null);
    const [secondaryPath, setSecondaryPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const toggleSettings = useCallback(() => setSettingsOpen(v => !v), []);
    const closeSettings = useCallback(() => setSettingsOpen(false), []);

    // ── スロット登録 ────────────────────────────────────────────────────────
    // 設定ボタン（BottomBar に常時表示）
    const settingsButtonRender = useCallback(() => (
        <button
            type="button"
            onClick={toggleSettings}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-lg transition ${
                settingsOpen
                    ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                    : 'border-surface-600 bg-viewer-surface-soft text-surface-200 hover:bg-surface-900 hover:text-surface-50'
            }`}
            title="ページ設定"
        >
            <Settings size={14} />
            <span>設定</span>
        </button>
    ), [settingsOpen, toggleSettings]);
    useViewerSlots('bottom-action', settingsButtonRender);

    // 設定ポップオーバー（開いているときだけ登録）
    const popoverRender = useCallback(
        () => <MangaSettingsPopover onClose={closeSettings} />,
        [closeSettings],
    );
    useViewerSlots('popover', settingsOpen ? popoverRender : null);

    // ── クリックゾーン ──────────────────────────────────────────────────────
    const handleZoneClick = useCallback((zone: 'left' | 'right') => {
        const direction: 'next' | 'prev' =
            bindingDirection === 'rtl'
                ? (zone === 'left' ? 'next' : 'prev')
                : (zone === 'left' ? 'prev' : 'next');
        setCurrentIndex(i => stepPage(i, direction, totalCount, settings));
    }, [bindingDirection, totalCount, settings]);

    const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if ((e.target as HTMLElement).closest('[data-viewer-control]')) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        if (relX < 1 / 3) handleZoneClick('left');
        else if (relX > 2 / 3) handleZoneClick('right');
    }, [handleZoneClick]);

    // ホイールでページ送り
    const wheelLastRef = useRef(0);
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY === 0) return;
        const now = Date.now();
        if (now - wheelLastRef.current < 180) return;
        wheelLastRef.current = now;
        const direction: 'next' | 'prev' = e.deltaY > 0 ? 'next' : 'prev';
        setCurrentIndex(i => stepPage(i, direction, totalCount, settings));
    }, [totalCount, settings]);

    const handleSeek = useCallback((index: number) => {
        setCurrentIndex(resolvePagePair(index, totalCount, { pageMode, firstPageSingle }).primary);
    }, [totalCount, pageMode, firstPageSingle]);

    // ── キーボード（capture phase で Shell より先に処理） ────────────────────
    const totalCountRef = useRef(totalCount);
    totalCountRef.current = totalCount;
    const bindingRef = useRef(bindingDirection);
    bindingRef.current = bindingDirection;
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    const keyboardHandler = useCallback((e: KeyboardEvent): boolean => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
        let direction: 'next' | 'prev' | null = null;

        if (e.key === 'PageDown') direction = 'next';
        else if (e.key === 'PageUp') direction = 'prev';
        else if (e.key === 'ArrowRight') direction = bindingRef.current === 'rtl' ? 'prev' : 'next';
        else if (e.key === 'ArrowLeft') direction = bindingRef.current === 'rtl' ? 'next' : 'prev';

        if (direction !== null) {
            e.preventDefault();
            e.stopPropagation();
            setCurrentIndex(i => stepPage(i, direction!, totalCountRef.current, settingsRef.current));
            return true;
        }
        return false;
    }, []);

    useViewerKeyboard(keyboardHandler);

    // ── ファイル切替でリセット ────────────────────────────────────────────
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

    // ── ページ読み込み ────────────────────────────────────────────────────
    useEffect(() => {
        if (!file.path || totalCount === 0) return;
        const pair = resolvePagePair(currentIndex, totalCount, settings);
        if (pair.primary !== currentIndex) {
            setCurrentIndex(pair.primary);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setPrimaryPath(null);
        setSecondaryPath(null);

        void window.electronAPI.getArchiveImageByIndex(file.path, pair.primary).then(p => {
            if (!cancelled) { setPrimaryPath(p); setLoading(false); }
        });
        if (pair.secondary !== null) {
            void window.electronAPI.getArchiveImageByIndex(file.path, pair.secondary).then(p => {
                if (!cancelled) setSecondaryPath(p);
            });
        }

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file.path, currentIndex, totalCount, pageMode, firstPageSingle]);

    useArchivePagePreload(file.path, currentIndex, totalCount, settings);

    // ── レンダー ──────────────────────────────────────────────────────────
    if (totalCount === 0 && !loading) {
        return (
            <div className="pointer-events-auto flex h-full w-full items-center justify-center">
                <p className="text-sm text-surface-400">画像エントリが見つかりません</p>
            </div>
        );
    }

    const pair = resolvePagePair(currentIndex, totalCount, settings);
    const isSpread = pageMode === 'spread' && pair.secondary !== null;

    const leftImg = isSpread
        ? (bindingDirection === 'rtl' ? secondaryPath : primaryPath)
        : primaryPath;
    const rightImg = isSpread
        ? (bindingDirection === 'rtl' ? primaryPath : secondaryPath)
        : null;

    const pageLabel = isSpread
        ? `${pair.primary + 1} - ${pair.secondary! + 1} / ${totalCount}`
        : `${pair.primary + 1} / ${totalCount}`;

    return (
        <div
            className="pointer-events-auto relative flex h-full w-full select-none items-center justify-center"
            onClick={handleContainerClick}
            onWheel={handleWheel}
        >
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

MangaContent.displayName = 'MangaContent';

// ── 見開き用ページ画像 ─────────────────────────────────────────────────────

const PageImage = React.memo<{ src: string | null; alt: string; side: 'left' | 'right' }>(
    ({ src, alt, side }) => {
        if (!src) {
            return <div className={`flex h-full flex-1 items-center justify-center ${side === 'left' ? 'border-r border-surface-800' : ''}`} />;
        }
        return (
            <img
                src={toMediaUrl(src)}
                alt={alt}
                style={{ maxWidth: '50%', maxHeight: '100%', objectFit: 'contain', display: 'block', flex: '0 1 auto' }}
                draggable={false}
            />
        );
    },
);
PageImage.displayName = 'PageImage';
