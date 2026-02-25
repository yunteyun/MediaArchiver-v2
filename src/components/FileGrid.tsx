import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTagStore } from '../stores/useTagStore';
import { useRatingStore } from '../stores/useRatingStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { FileCard } from './FileCard';
import { DISPLAY_MODE_LAYOUT_CONFIGS } from './fileCard/displayModes';
import { FolderCard } from './FolderCard';
import { Header } from './SortMenu';
import { GroupHeader } from './GroupHeader';
import type { GridItem } from '../types/grid';
import { groupFiles } from '../utils/groupFiles';

const CARD_GAP = 8;



export const FileGrid = React.memo(() => {
    const isDev = import.meta.env.DEV;
    const groupPerfDebugEnabled = isDev && (globalThis as { __MA_DEBUG_GROUP_PERF?: boolean }).__MA_DEBUG_GROUP_PERF === true;
    const rawFiles = useFileStore((s) => s.files);
    const selectedIds = useFileStore((s) => s.selectedIds);
    const focusedId = useFileStore((s) => s.focusedId);
    const anchorId = useFileStore((s) => s.anchorId);
    const selectFile = useFileStore((s) => s.selectFile);
    const toggleSelection = useFileStore((s) => s.toggleSelection);
    const selectRange = useFileStore((s) => s.selectRange);
    const selectAll = useFileStore((s) => s.selectAll);
    const clearSelection = useFileStore((s) => s.clearSelection);
    const removeFile = useFileStore((s) => s.removeFile);
    const refreshFile = useFileStore((s) => s.refreshFile);
    const updateFileExternalOpenCount = useFileStore((s) => s.updateFileExternalOpenCount);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const setFolderMetadata = useFileStore((s) => s.setFolderMetadata);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);
    const sortBy = useSettingsStore((s) => s.sortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    // Phase 14: 表示モード取得
    const displayMode = useSettingsStore((s) => s.displayMode);
    const config = DISPLAY_MODE_LAYOUT_CONFIGS[displayMode];
    const groupBy = useSettingsStore((s) => s.groupBy);
    const searchQuery = useUIStore((s) => s.searchQuery);
    const openLightbox = useUIStore((s) => s.openLightbox);
    const openSettingsModal = useUIStore((s) => s.openSettingsModal);
    const showToast = useUIStore((s) => s.showToast);

    // Tag filter state
    const selectedTagIds = useTagStore((s) => s.selectedTagIds);
    const filterMode = useTagStore((s) => s.filterMode);

    // Folders state (Phase 12-4)
    const [folders, setFolders] = React.useState<import('../types/file').MediaFolder[]>([]);

    // Load folders and folder metadata (Phase 12-4)
    useEffect(() => {
        const loadFoldersAndMetadata = async () => {
            try {
                const [folderList, metadata] = await Promise.all([
                    window.electronAPI.getFolders(),
                    window.electronAPI.getFolderMetadata()
                ]);
                setFolders(folderList);
                setFolderMetadata(metadata);
            } catch (e) {
                console.error('Failed to load folders/metadata:', e);
            }
        };
        loadFoldersAndMetadata();
    }, [setFolderMetadata]);

    // Rating filter state
    const ratingFilter = useRatingStore((s) => s.ratingFilter);
    const allFileRatings = useRatingStore((s) => s.fileRatings);

    // Sort and filter files in component using useMemo
    const files = useMemo(() => {
        // First sort
        const sorted = [...rawFiles].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = a.createdAt - b.createdAt;
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'accessCount': // Phase 17: アクセス回数ソート
                    comparison = (a.accessCount || 0) - (b.accessCount || 0);
                    break;
                case 'lastAccessed': // Phase 17: 直近アクセスソート
                    // null は常に最後に（降順・昇順どちらでも）
                    if (a.lastAccessedAt === null && b.lastAccessedAt === null) {
                        comparison = 0;
                    } else if (a.lastAccessedAt === null) {
                        // a が null の場合、常に a を後ろに（sortOrder の反転を後で無効化）
                        return 1;
                    } else if (b.lastAccessedAt === null) {
                        // b が null の場合、常に b を後ろに（sortOrder の反転を後で無効化）
                        return -1;
                    } else {
                        comparison = a.lastAccessedAt - b.lastAccessedAt;
                    }
                    break;
            }
            const result = sortOrder === 'asc' ? comparison : -comparison;

            return result;
        });

        // Filter by tags
        let filtered = sorted;
        if (selectedTagIds.length > 0) {
            filtered = filtered.filter((file) => {
                const fileTags = fileTagsCache.get(file.id) || [];
                if (filterMode === 'OR') {
                    return selectedTagIds.some((tagId) => fileTags.includes(tagId));
                } else {
                    return selectedTagIds.every((tagId) => fileTags.includes(tagId));
                }
            });
        }

        // Filter by rating（未評価は除外）
        const activeRatingAxes = (Object.entries(ratingFilter) as [string, { min?: number; max?: number }][]).filter(
            ([, r]) => r.min !== undefined || r.max !== undefined
        );
        if (activeRatingAxes.length > 0) {
            filtered = filtered.filter((file) => {
                const ratings = allFileRatings[file.id] ?? {};
                for (const [axisId, { min, max }] of activeRatingAxes) {
                    const rating = ratings[axisId];
                    if (rating == null) return false;
                    if (min !== undefined && rating < min) return false;
                    if (max !== undefined && rating > max) return false;
                }
                return true;
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((file) =>
                file.name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [rawFiles, sortBy, sortOrder, selectedTagIds, filterMode, fileTagsCache, searchQuery, ratingFilter, allFileRatings]);


    // グループ化されたファイル（Phase 12-10）
    const groupedFiles = useMemo(() => {
        if (!groupPerfDebugEnabled || groupBy === 'none') {
            return groupFiles(files, groupBy, sortBy, sortOrder);
        }

        const start = performance.now();
        const result = groupFiles(files, groupBy, sortBy, sortOrder);
        const elapsedMs = performance.now() - start;
        const totalGroupedFiles = result.reduce((sum, group) => sum + group.files.length, 0);

        console.debug('[perf][FileGrid][grouping]', {
            groupBy,
            files: files.length,
            groups: result.length,
            groupedFiles: totalGroupedFiles,
            elapsedMs: Number(elapsedMs.toFixed(2)),
        });

        return result;
    }, [files, groupBy, sortBy, sortOrder, groupPerfDebugEnabled]);

    // GridItem統合リスト生成（Phase 12-4）
    const gridItems = useMemo((): GridItem[] => {
        const items: GridItem[] = [];
        const folderFileCounts = useFileStore.getState().folderFileCounts;
        const folderThumbnails = useFileStore.getState().folderThumbnails;

        // 「すべてのファイル」表示時はフォルダカードを先頭に表示
        if (currentFolderId === '__all__' || currentFolderId === null) {
            folders.forEach(folder => {
                items.push({
                    type: 'folder',
                    folder,
                    fileCount: folderFileCounts[folder.id] || 0,
                    thumbnailPath: folderThumbnails[folder.id]
                });
            });
        }

        // ファイルをGridItemに変換
        files.forEach(file => items.push({ type: 'file', file }));

        return items;
    }, [files, folders, currentFolderId]);

    const parentRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = React.useState(0);

    // Callback ref: DOMノードが条件分岐で切り替わってもResizeObserverを再設定
    const [observedElement, setObservedElement] = React.useState<HTMLDivElement | null>(null);
    const scrollContainerRef = React.useCallback((node: HTMLDivElement | null) => {
        parentRef.current = node;
        setObservedElement(node);
    }, []);

    // File deletion listener
    useEffect(() => {
        const cleanup = window.electronAPI.onFileDeleted((fileId) => {
            console.log('File deleted:', fileId);
            // 削除されるファイルがプレビュー中なら解除
            if (useUIStore.getState().hoveredPreviewId === fileId) {
                useUIStore.getState().setHoveredPreview(null);
            }
            removeFile(fileId);
        });

        return cleanup;
    }, [removeFile]);

    // ResizeObserver for responsive columns
    React.useEffect(() => {
        if (!observedElement) return;
        // 初回接続時にすぐにサイズを取得
        setContainerWidth(observedElement.clientWidth);
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(observedElement);
        return () => resizeObserver.disconnect();
    }, [observedElement]);

    // サムネイル再作成イベントをリッスン
    useEffect(() => {
        const unsubscribe = window.electronAPI.onThumbnailRegenerated((fileId: string) => {
            refreshFile(fileId);
            showToast('サムネイルを再作成しました', 'success');
        });
        return unsubscribe;
    }, [refreshFile, showToast]);

    // 外部アプリ起動カウント更新イベント
    useEffect(() => {
        const unsubscribe = window.electronAPI.onExternalOpenCountUpdated(({ fileId, externalOpenCount, lastExternalOpenedAt }) => {
            updateFileExternalOpenCount(fileId, externalOpenCount, lastExternalOpenedAt);
        });
        return unsubscribe;
    }, [updateFileExternalOpenCount]);

    // Phase 19.5 Bug 6: ファイル移動イベント（一元管理）
    // Phase 19.5 Bug 3: ファイル移動後の即時UI更新
    useEffect(() => {
        const handleRequestMove = async (data: { fileId: string; targetFolderId: string }) => {
            const result = await window.electronAPI.moveFileToFolder(data.fileId, data.targetFolderId);

            if (result.success) {
                // 移動したファイルがプレビュー中なら解除
                if (useUIStore.getState().hoveredPreviewId === data.fileId) {
                    useUIStore.getState().setHoveredPreview(null);
                }

                // Bug 3修正: 移動したファイルを即座にstoreから削除
                removeFile(data.fileId);

                const { useToastStore } = await import('../stores/useToastStore');
                useToastStore.getState().success('ファイルを移動しました');
            } else {
                const { useToastStore } = await import('../stores/useToastStore');
                useToastStore.getState().error(result.error || 'ファイル移動に失敗しました');
            }
        };

        const unsubscribe = window.electronAPI.onRequestMove(handleRequestMove);
        return unsubscribe;
    }, [removeFile]);

    // Phase 14-6: レスポンシブカードサイズ計算
    const { cardHeight, columns, rows, effectiveCardWidth, effectiveThumbnailHeight } = useMemo(() => {
        // ⚠️ containerWidth は ResizeObserver.contentRect.width で取得済み（p-4 パディング除外済み）
        // ここでは仮想行の padding（CARD_GAP/2 * 左右 = CARD_GAP）のみ差し引く
        const rowPadding = CARD_GAP; // 各行の左右パディング合計
        const availableWidth = containerWidth - rowPadding;

        // 最小カード幅として config.cardWidth を使用
        const minCardWidth = config.cardWidth;
        const cols = Math.max(1, Math.floor((availableWidth + CARD_GAP) / (minCardWidth + CARD_GAP)));

        // コンテナ幅を均等分配（ギャップを考慮）
        const totalGapWidth = (cols - 1) * CARD_GAP;
        const effectiveCardW = Math.floor((availableWidth - totalGapWidth) / cols);

        // アスペクト比を維持してサムネイル高さを再計算
        const aspectRatio = config.thumbnailHeight / config.cardWidth;
        const effectiveThumbnailH = Math.floor(effectiveCardW * aspectRatio);

        // totalHeight を再計算
        const totalH = effectiveThumbnailH + config.infoAreaHeight;
        const h = totalH + CARD_GAP * 2;
        const r = Math.ceil(gridItems.length / cols);

        return {
            cardHeight: h,
            columns: cols,
            rows: r,
            effectiveCardWidth: effectiveCardW,
            effectiveThumbnailHeight: effectiveThumbnailH
        };
    }, [config, containerWidth, gridItems.length]);

    useEffect(() => {
        if (!groupPerfDebugEnabled || groupBy === 'none') return;

        const totalGroupedFiles = groupedFiles.reduce((sum, group) => sum + group.files.length, 0);
        const largestGroupSize = groupedFiles.reduce((max, group) => Math.max(max, group.files.length), 0);

        console.debug('[perf][FileGrid][grouped-render-input]', {
            groupBy,
            groups: groupedFiles.length,
            totalGroupedFiles,
            largestGroupSize,
            columns,
            cardWidth: effectiveCardWidth,
            cardHeight,
        });
    }, [groupPerfDebugEnabled, groupBy, groupedFiles, columns, effectiveCardWidth, cardHeight]);

    const rowVirtualizer = useVirtualizer({
        count: rows,
        getScrollElement: () => parentRef.current,
        estimateSize: () => cardHeight,
        overscan: 3,
    });

    // 表示モード切替直後は仮想行サイズのキャッシュが一瞬古いまま残ることがあるため再計測する
    useEffect(() => {
        const rafId = window.requestAnimationFrame(() => {
            rowVirtualizer.measure();
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [rowVirtualizer, cardHeight, columns, rows, displayMode]);

    // 現在のフォーカスインデックスを計算（Phase 12-4: gridItems対応）
    const focusedIndex = useMemo(() => {
        if (!focusedId) return -1;
        return gridItems.findIndex((item) =>
            item.type === 'file' && item.file.id === focusedId
        );
    }, [focusedId, gridItems]);

    // フォーカス変更時にスクロール追従
    useEffect(() => {
        if (focusedIndex >= 0 && rowVirtualizer) {
            const rowIndex = Math.floor(focusedIndex / columns);
            rowVirtualizer.scrollToIndex(rowIndex, { align: 'auto' });
        }
    }, [focusedIndex, columns, rowVirtualizer]);

    // キーボードショートカットハンドラ（Phase 12-4: gridItems対応）
    const moveSelection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (gridItems.length === 0) return;

        let currentIndex = focusedIndex >= 0 ? focusedIndex : -1;
        let newIndex = currentIndex;

        switch (direction) {
            case 'up':
                newIndex = Math.max(0, currentIndex - columns);
                break;
            case 'down':
                newIndex = Math.min(gridItems.length - 1, currentIndex + columns);
                break;
            case 'left':
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'right':
                newIndex = Math.min(gridItems.length - 1, currentIndex + 1);
                break;
        }

        // 初回は最初のアイテムを選択
        if (currentIndex === -1) {
            newIndex = 0;
        }

        const targetItem = gridItems[newIndex];
        if (targetItem && targetItem.type === 'file') {
            selectFile(targetItem.file.id); // 選択 & フォーカス
        }
    }, [gridItems, focusedIndex, columns, selectFile]);

    const openFocusedFile = useCallback(() => {
        const item = focusedIndex >= 0 ? gridItems[focusedIndex] : null;
        if (item && item.type === 'file') {
            openLightbox(item.file);
        }
    }, [focusedIndex, gridItems, openLightbox]);

    // フォルダナビゲーションハンドラー（Phase 12-4）
    const handleFolderNavigate = useCallback(async (folderId: string) => {
        setCurrentFolderId(folderId);
        try {
            const files = await window.electronAPI.getFiles(folderId);
            useFileStore.getState().setFiles(files);
        } catch (e) {
            console.error('Failed to navigate to folder:', e);
        }
    }, [setCurrentFolderId]);

    // キーボードショートカット登録
    useKeyboardShortcuts({
        onArrowUp: () => moveSelection('up'),
        onArrowDown: () => moveSelection('down'),
        onArrowLeft: () => moveSelection('left'),
        onArrowRight: () => moveSelection('right'),
        onEnter: openFocusedFile,
        onSpace: openFocusedFile,
        onEscape: clearSelection,
        onCtrlA: selectAll,
        onCtrlF: () => {
            // Header内の検索フィールドにフォーカス（後で実装）
            const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
            searchInput?.focus();
        },
        onCtrlComma: openSettingsModal,
    });

    // Phase 16: パフォーマンス最適化 - 表示順のファイルIDリストを事前計算
    const orderedFileIds = useMemo(() => {
        return gridItems
            .filter(item => item.type === 'file')
            .map(item => item.file.id);
    }, [gridItems]);

    const handleSelect = useCallback((id: string, mode: 'single' | 'toggle' | 'range') => {
        if (mode === 'single') {
            selectFile(id);
        } else if (mode === 'toggle') {
            toggleSelection(id);
        } else if (mode === 'range') {
            // anchorId から指定位置までの範囲を計算
            const anchorIndex = orderedFileIds.indexOf(anchorId || '');
            const targetIndex = orderedFileIds.indexOf(id);

            if (anchorIndex >= 0 && targetIndex >= 0) {
                const start = Math.min(anchorIndex, targetIndex);
                const end = Math.max(anchorIndex, targetIndex);
                const rangeIds = orderedFileIds.slice(start, end + 1);
                selectRange(rangeIds);
            } else if (targetIndex >= 0) {
                // anchor が見つからない場合は単一選択にフォールバック
                selectFile(id);
            }
        }
    }, [selectFile, toggleSelection, selectRange, orderedFileIds, anchorId]);

    if (gridItems.length === 0) {
        return (
            <div className="flex-1 flex flex-col h-full">
                <Header />
                <div ref={scrollContainerRef} className="flex-1 flex items-center justify-center text-surface-500">
                    <div className="text-center">
                        <p className="text-lg">ファイルがありません</p>
                        <p className="text-sm mt-2">サイドバーからフォルダを選択してください</p>
                    </div>
                </div>
            </div>
        );
    }

    // グループ化モード（Phase 12-10）
    if (groupBy !== 'none') {
        return (
            <div className="flex flex-col h-full">
                <Header />
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto bg-surface-950"
                >
                    {groupedFiles.map((group) => (
                        <div key={group.key}>
                            {/* グループヘッダー */}
                            {group.label && <GroupHeader group={group} />}

                            {/* グループ内のファイルグリッド */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${columns}, ${effectiveCardWidth}px)`,
                                    gap: `${CARD_GAP}px`,
                                    padding: `${CARD_GAP}px`,
                                }}
                            >
                                {group.files.map((file) => {
                                    const cardW = effectiveCardWidth;
                                    const cardH = effectiveThumbnailHeight + config.infoAreaHeight;

                                    return (
                                        <div
                                            key={file.id}
                                            style={{
                                                width: `${cardW}px`,
                                                height: `${cardH}px`,
                                            }}
                                        >
                                            <FileCard
                                                file={file}
                                                isSelected={selectedIds.has(file.id)}
                                                isFocused={focusedId === file.id && !selectedIds.has(file.id)}
                                                onSelect={handleSelect}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 通常モード（グループ化なし）
    return (
        <div className="flex flex-col h-full">
            <Header />
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto bg-surface-950 p-4"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const startIndex = virtualRow.index * columns;
                        const rowItems = gridItems.slice(startIndex, startIndex + columns);

                        return (
                            <div
                                key={virtualRow.index}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    display: 'flex',
                                    gap: `${CARD_GAP}px`,
                                    padding: `${CARD_GAP / 2}px`,
                                }}
                            >
                                {rowItems.map((item) => {
                                    const cardW = effectiveCardWidth;
                                    const cardH = effectiveThumbnailHeight + config.infoAreaHeight;

                                    return item.type === 'folder' ? (
                                        <div
                                            key={item.folder.id}
                                            style={{
                                                width: `${cardW}px`,
                                                height: `${cardH}px`,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <FolderCard
                                                folder={item.folder}
                                                thumbnailPath={item.thumbnailPath}
                                                fileCount={item.fileCount}
                                                onNavigate={handleFolderNavigate}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            key={item.file.id}
                                            style={{
                                                width: `${cardW}px`,
                                                height: `${cardH}px`,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <FileCard
                                                file={item.file}
                                                isSelected={selectedIds.has(item.file.id)}
                                                isFocused={focusedId === item.file.id && !selectedIds.has(item.file.id)}
                                                onSelect={handleSelect}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

FileGrid.displayName = 'FileGrid';
