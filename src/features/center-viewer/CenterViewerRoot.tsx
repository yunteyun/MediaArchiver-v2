import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, FolderInput, Pencil, Trash2, X } from 'lucide-react';
import { useFileStore } from '../../stores/useFileStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { CenterViewerStage } from './CenterViewerStage';
import { CenterViewerPlaybackOverlay } from './CenterViewerPlaybackOverlay';
import { completeUiPerfTrace } from '../../utils/perfDebug';
import { resolveViewerKeyboardAction } from '../../components/lightbox/shared/viewerKeyboard';

export const CenterViewerRoot = React.memo(() => {
    const rawLightboxFile = useUIStore((state) => state.lightboxFile);
    const lightboxOpenMode = useUIStore((state) => state.lightboxOpenMode);
    const lightboxStartTime = useUIStore((state) => state.lightboxStartTime);
    const closeLightbox = useUIStore((state) => state.closeLightbox);
    const openRenameDialog = useUIStore((state) => state.openRenameDialog);
    const openMoveDialog = useUIStore((state) => state.openMoveDialog);
    const openDeleteDialog = useUIStore((state) => state.openDeleteDialog);
    const files = useFileStore((state) => state.files);
    const fileMap = useFileStore((state) => state.fileMap);
    const incrementAccessCount = useFileStore((state) => state.incrementAccessCount);
    const setFocusedId = useFileStore((state) => state.setFocusedId);
    const videoVolume = useSettingsStore((state) => state.videoVolume);
    const audioVolume = useSettingsStore((state) => state.audioVolume);
    const lightboxFile = rawLightboxFile
        ? (fileMap.get(rawLightboxFile.id) ?? rawLightboxFile)
        : null;

    const [playbackOverlayOpen, setPlaybackOverlayOpen] = useState(false);

    const currentIndex = useMemo(() => {
        if (!lightboxFile) return -1;
        return files.findIndex((file) => file.id === lightboxFile.id);
    }, [files, lightboxFile]);

    // ファイル切替時にポップオーバーを閉じる
    useEffect(() => {
        setPlaybackOverlayOpen(false);
    }, [lightboxFile?.id]);

    const goToPrevious = useCallback(() => {
        if (currentIndex <= 0) return;
        const previousFile = files[currentIndex - 1];
        if (!previousFile) return;
        setFocusedId(previousFile.id);
        useUIStore.getState().openLightbox(previousFile);
    }, [currentIndex, files, setFocusedId]);

    const goToNext = useCallback(() => {
        if (currentIndex < 0 || currentIndex >= files.length - 1) return;
        const nextFile = files[currentIndex + 1];
        if (!nextFile) return;
        setFocusedId(nextFile.id);
        useUIStore.getState().openLightbox(nextFile);
    }, [currentIndex, files, setFocusedId]);

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

    useEffect(() => {
        if (!lightboxFile) return;

        setFocusedId(lightboxFile.id);

        const handleKeyDown = (event: KeyboardEvent) => {
            const action = resolveViewerKeyboardAction(event, lightboxFile.type);
            if (action === 'close') {
                closeLightbox();
                return;
            }
            if (action === 'previous') {
                goToPrevious();
                return;
            }
            if (action === 'next') {
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeLightbox, goToNext, goToPrevious, lightboxFile, setFocusedId]);

    useEffect(() => {
        if (!lightboxFile) return;

        const countAccess = async () => {
            const result = await window.electronAPI.incrementAccessCount(lightboxFile.id);
            if (result.success && result.lastAccessedAt) {
                incrementAccessCount(lightboxFile.id, result.lastAccessedAt);
            }
        };

        void countAccess();
    }, [incrementAccessCount, lightboxFile]);

    useEffect(() => {
        if (!lightboxFile) return;

        completeUiPerfTrace('center-viewer-open', {
            fileId: lightboxFile.id,
            fileType: lightboxFile.type,
            openMode: lightboxOpenMode,
        });
    }, [lightboxFile, lightboxOpenMode]);

    if (!lightboxFile) {
        return null;
    }

    const isVideo = lightboxFile.type === 'video';

    return (
        <div className="absolute inset-0 z-20">
            <div className="absolute inset-0 bg-black/55" onClick={closeLightbox} />

            <div className="pointer-events-none absolute inset-0 flex flex-col">
                {/* 上部バー: ファイル名 + 閉じるボタン */}
                <div className="pointer-events-auto flex h-12 flex-shrink-0 items-center justify-between px-5">
                    <div className="min-w-0 flex-1 pr-4">
                        <p className="truncate text-sm font-medium text-surface-200" title={lightboxFile.name}>
                            {lightboxFile.name}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={closeLightbox}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900"
                        title="閉じる (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 中央メディアエリア */}
                <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-0 flex items-center justify-center px-16 py-4">
                        <CenterViewerStage
                            file={lightboxFile}
                            openMode={lightboxOpenMode}
                            videoVolume={videoVolume}
                            audioVolume={audioVolume}
                            startTimeSeconds={lightboxStartTime}
                        />
                    </div>

                    {/* ナビゲーションボタン */}
                    <div className="pointer-events-none absolute inset-0">
                        <button
                            type="button"
                            onClick={goToPrevious}
                            disabled={currentIndex <= 0}
                            className="pointer-events-auto absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600"
                            title="前へ (←)"
                        >
                            <ChevronLeft size={22} />
                        </button>

                        <button
                            type="button"
                            onClick={goToNext}
                            disabled={currentIndex < 0 || currentIndex >= files.length - 1}
                            className="pointer-events-auto absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-surface-600 bg-black text-surface-100 shadow-lg transition hover:bg-surface-900 disabled:cursor-not-allowed disabled:border-surface-800 disabled:text-surface-600"
                            title="次へ (→)"
                        >
                            <ChevronRight size={22} />
                        </button>
                    </div>
                </div>

                {/* 下部コントロールバー */}
                <div className="pointer-events-auto relative flex h-12 flex-shrink-0 items-center justify-center gap-3 px-5">
                    <button
                        type="button"
                        onClick={handleRename}
                        className="flex items-center gap-1.5 rounded-lg border border-surface-600 bg-black/80 px-3 py-1.5 text-xs font-medium text-surface-200 shadow-lg transition hover:bg-surface-900 hover:text-surface-50"
                        title="名前を変更"
                    >
                        <Pencil size={14} />
                        <span>リネーム</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleMove}
                        className="flex items-center gap-1.5 rounded-lg border border-surface-600 bg-black/80 px-3 py-1.5 text-xs font-medium text-surface-200 shadow-lg transition hover:bg-surface-900 hover:text-surface-50"
                        title="別のフォルダへ移動"
                    >
                        <FolderInput size={14} />
                        <span>移動</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 rounded-lg border border-surface-600 bg-black/80 px-3 py-1.5 text-xs font-medium text-surface-200 shadow-lg transition hover:bg-surface-900 hover:text-surface-50"
                        title="ゴミ箱へ移動"
                    >
                        <Trash2 size={14} />
                        <span>ゴミ箱へ</span>
                    </button>

                    {/* 見どころボタン（動画のみ） */}
                    {isVideo && (
                        <>
                            <div className="mx-1 h-5 w-px bg-surface-600" />
                            <button
                                type="button"
                                onClick={() => setPlaybackOverlayOpen((prev) => !prev)}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-lg transition ${
                                    playbackOverlayOpen
                                        ? 'border-primary-700 bg-primary-900/30 text-primary-100'
                                        : 'border-surface-600 bg-black/80 text-surface-200 hover:bg-surface-900 hover:text-surface-50'
                                }`}
                                title="再開 / 見どころ"
                            >
                                <Bookmark size={14} />
                                <span>見どころ</span>
                            </button>
                        </>
                    )}

                    {/* 見どころポップオーバー */}
                    {isVideo && playbackOverlayOpen && (
                        <div className="absolute bottom-full right-1/2 mb-2 translate-x-1/2">
                            <CenterViewerPlaybackOverlay file={lightboxFile} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

CenterViewerRoot.displayName = 'CenterViewerRoot';
