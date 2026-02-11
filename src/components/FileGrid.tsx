import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTagStore } from '../stores/useTagStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { FileCard, DISPLAY_MODE_CONFIGS } from './FileCard';
import { FolderCard } from './FolderCard';
import { Header } from './SortMenu';
import { GroupHeader } from './GroupHeader';
import type { GridItem } from '../types/grid';
import { groupFiles } from '../utils/groupFiles';

const CARD_GAP = 8;



export const FileGrid = React.memo(() => {
    const rawFiles = useFileStore((s) => s.files);
    const selectedIds = useFileStore((s) => s.selectedIds);
    const focusedId = useFileStore((s) => s.focusedId);
    const selectFile = useFileStore((s) => s.selectFile);
    const selectAll = useFileStore((s) => s.selectAll);
    const clearSelection = useFileStore((s) => s.clearSelection);
    const removeFile = useFileStore((s) => s.removeFile);
    const refreshFile = useFileStore((s) => s.refreshFile);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const currentFolderId = useFileStore((s) => s.currentFolderId);
    const setFolderMetadata = useFileStore((s) => s.setFolderMetadata);
    const setCurrentFolderId = useFileStore((s) => s.setCurrentFolderId);
    const sortBy = useSettingsStore((s) => s.sortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    // Phase 14: 表示モード取得
    const displayMode = useSettingsStore((s) => s.displayMode);
    const config = DISPLAY_MODE_CONFIGS[displayMode];
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
            }
            return sortOrder === 'asc' ? comparison : -comparison;
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

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((file) =>
                file.name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [rawFiles, sortBy, sortOrder, selectedTagIds, filterMode, fileTagsCache, searchQuery]);

    // グループ化されたファイル（Phase 12-10）
    const groupedFiles = useMemo(() => {
        return groupFiles(files, groupBy, sortBy, sortOrder);
    }, [files, groupBy, sortBy, sortOrder]);

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

    const rowVirtualizer = useVirtualizer({
        count: rows,
        getScrollElement: () => parentRef.current,
        estimateSize: () => cardHeight,
        overscan: 3,
    });

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

    const handleSelect = useCallback((id: string, multi: boolean) => {
        selectFile(id, multi);
    }, [selectFile]);

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
