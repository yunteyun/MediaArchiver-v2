import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { completeUiPerfTrace } from '../../utils/perfDebug';
import type { ModeKeyHandler, ViewerSlot } from './types';
import { ViewerProvider } from './viewerContexts';
import { ViewerBackdrop } from './shell/ViewerBackdrop';
import { ViewerTopBar } from './shell/ViewerTopBar';
import { ViewerNavButtons } from './shell/ViewerNavButtons';
import { ViewerBottomBar } from './shell/ViewerBottomBar';
import { ViewerStage } from './ViewerStage';

function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || typeof target !== 'object') return false;
    const el = target as { tagName?: string; isContentEditable?: boolean };
    const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

export const ViewerShell = React.memo(() => {
    // ── ストア購読 ──────────────────────────────────────────────────────────
    const rawLightboxFile = useUIStore(s => s.lightboxFile);
    const lightboxOpenMode = useUIStore(s => s.lightboxOpenMode);
    const lightboxStartTime = useUIStore(s => s.lightboxStartTime);
    const closeLightbox = useUIStore(s => s.closeLightbox);
    const openRenameDialog = useUIStore(s => s.openRenameDialog);
    const openMoveDialog = useUIStore(s => s.openMoveDialog);
    const openDeleteDialog = useUIStore(s => s.openDeleteDialog);
    const mpvEmbedded = useSettingsStore(s => s.mpvEmbedded);
    const videoVolume = useSettingsStore(s => s.videoVolume);
    const audioVolume = useSettingsStore(s => s.audioVolume);

    const files = useFileStore(s => s.files);
    const fileMap = useFileStore(s => s.fileMap);
    const incrementAccessCount = useFileStore(s => s.incrementAccessCount);
    const setFocusedId = useFileStore(s => s.setFocusedId);

    // fileMap から最新情報を取得
    const lightboxFile = rawLightboxFile
        ? (fileMap.get(rawLightboxFile.id) ?? rawLightboxFile)
        : null;

    // ── スロット管理 ────────────────────────────────────────────────────────
    const [slots, setSlots] = useState<ViewerSlot[]>([]);
    const handleSlotsChange = useCallback((next: ViewerSlot[]) => setSlots(next), []);
    const actionSlots = useMemo(() => slots.filter(s => s.kind === 'bottom-action'), [slots]);
    const popoverSlots = useMemo(() => slots.filter(s => s.kind === 'popover'), [slots]);

    // ── キーボード ──────────────────────────────────────────────────────────
    const modeHandlerRef = useRef<ModeKeyHandler | null>(null);

    // ── ナビゲーション ──────────────────────────────────────────────────────
    const currentIndex = useMemo(() => {
        if (!lightboxFile) return -1;
        return files.findIndex(f => f.id === lightboxFile.id);
    }, [files, lightboxFile]);

    const goToPrevious = useCallback(() => {
        if (currentIndex <= 0) return;
        const prev = files[currentIndex - 1];
        if (!prev) return;
        setFocusedId(prev.id);
        useUIStore.getState().openLightbox(prev);
    }, [currentIndex, files, setFocusedId]);

    const goToNext = useCallback(() => {
        if (currentIndex < 0 || currentIndex >= files.length - 1) return;
        const next = files[currentIndex + 1];
        if (!next) return;
        setFocusedId(next.id);
        useUIStore.getState().openLightbox(next);
    }, [currentIndex, files, setFocusedId]);

    // ── ダイアログ連携 ──────────────────────────────────────────────────────
    const handleRename = useCallback(() => {
        if (!lightboxFile) return;
        openRenameDialog(lightboxFile.id, lightboxFile.name, lightboxFile.path);
    }, [lightboxFile, openRenameDialog]);

    const handleMove = useCallback(() => {
        if (!lightboxFile) return;
        openMoveDialog([lightboxFile.id], lightboxFile.rootFolderId ?? null);
    }, [lightboxFile, openMoveDialog]);

    const handleDelete = useCallback(() => {
        if (!lightboxFile) return;
        openDeleteDialog([lightboxFile.id], [lightboxFile.path]);
    }, [lightboxFile, openDeleteDialog]);

    // ── mpv 埋め込みモード: ポップオーバー表示時に映像を隠す ────────────────
    // popoverSlots が開いているかどうかは各 slot の render 内で管理されるため、
    // スロット数の変化（登録/解除）を mpv 可視性に反映する
    useEffect(() => {
        if (!mpvEmbedded) return;
        // ポップオーバースロットが 1 つ以上ある = 何かが開いている
        void window.electronAPI.mpvSetVisible(popoverSlots.length === 0);
    }, [mpvEmbedded, popoverSlots.length]);

    // ── キーボードハンドラ（capture phase） ─────────────────────────────────
    useEffect(() => {
        if (!lightboxFile) return;

        setFocusedId(lightboxFile.id);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target)) return;

            // モード固有ハンドラが処理したら終了
            if (modeHandlerRef.current?.(e)) return;

            if (e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.defaultPrevented) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                closeLightbox();
            } else if (!e.shiftKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevious();
            } else if (!e.shiftKey && e.key === 'ArrowRight') {
                e.preventDefault();
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [closeLightbox, goToNext, goToPrevious, lightboxFile, setFocusedId]);

    // ── アクセスカウント（アイドル遅延） ────────────────────────────────────
    useEffect(() => {
        if (!lightboxFile) return;
        const fileId = lightboxFile.id;

        const countAccess = async () => {
            const result = await window.electronAPI.incrementAccessCount(fileId);
            if (result.success && result.lastAccessedAt) {
                incrementAccessCount(fileId, result.lastAccessedAt);
            }
        };

        if (typeof window.requestIdleCallback === 'function') {
            const handle = window.requestIdleCallback(() => { void countAccess(); });
            return () => window.cancelIdleCallback(handle);
        }
        const timer = setTimeout(() => { void countAccess(); }, 200);
        return () => clearTimeout(timer);
    }, [incrementAccessCount, lightboxFile]);

    // ── パフォーマンストレース ──────────────────────────────────────────────
    useEffect(() => {
        if (!lightboxFile) return;
        completeUiPerfTrace('center-viewer-open', {
            fileId: lightboxFile.id,
            fileType: lightboxFile.type,
            openMode: lightboxOpenMode,
        });
    }, [lightboxFile, lightboxOpenMode]);

    if (!lightboxFile) return null;

    // ── Context 値 ─────────────────────────────────────────────────────────
    const contextValue = {
        file: lightboxFile,
        files,
        currentIndex,
        closeLightbox,
        goToPrevious,
        goToNext,
        openRenameDialog,
        openMoveDialog,
        openDeleteDialog,
        videoVolume,
        audioVolume,
        lightboxStartTime,
    };

    return (
        <ViewerProvider
            value={contextValue}
            onSlotsChange={handleSlotsChange}
            modeHandlerRef={modeHandlerRef}
        >
            <div className="absolute inset-0 z-viewer-base">
                {/* 半透明背景 */}
                <ViewerBackdrop onClick={closeLightbox} />

                <div className="pointer-events-none absolute inset-0 flex flex-col">
                    {/* 上部バー */}
                    <ViewerTopBar fileName={lightboxFile.name} onClose={closeLightbox} />

                    {/* メディアエリア */}
                    <div className="relative min-h-0 flex-1">
                        <div className="absolute inset-0 flex items-center justify-center px-16 py-4">
                            <ViewerStage
                                openMode={lightboxOpenMode}
                                videoVolume={videoVolume}
                                audioVolume={audioVolume}
                                startTimeSeconds={lightboxStartTime}
                            />
                        </div>

                        {/* 前後ナビゲーション */}
                        <ViewerNavButtons
                            onPrevious={goToPrevious}
                            onNext={goToNext}
                            hasPrevious={currentIndex > 0}
                            hasNext={currentIndex >= 0 && currentIndex < files.length - 1}
                        />
                    </div>

                    {/* 下部アクションバー */}
                    <ViewerBottomBar
                        onRename={handleRename}
                        onMove={handleMove}
                        onDelete={handleDelete}
                        actionSlots={actionSlots}
                        popoverSlots={popoverSlots}
                    />
                </div>
            </div>
        </ViewerProvider>
    );
});

ViewerShell.displayName = 'ViewerShell';
