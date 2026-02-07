import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore, type CardSize } from '../stores/useSettingsStore';
import { useTagStore } from '../stores/useTagStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';
import { Header } from './SortMenu';
import type { GridItem } from '../types/grid';

const CARD_GAP = 8;

// UIレンダリング専用定数（サムネイル生成・永続化処理には使用しない）
const CARD_SIZES: Record<CardSize, { width: number; height: number }> = {
    small: { width: 150, height: 120 },
    medium: { width: 200, height: 160 },
    large: { width: 280, height: 220 }
};

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
    const cardSize = useSettingsStore((s) => s.cardSize);
    const showFileName = useSettingsStore((s) => s.showFileName);
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

    const parentRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState(1000);

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
        if (!parentRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(parentRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // サムネイル再作成イベントをリッスン
    useEffect(() => {
        const unsubscribe = window.electronAPI.onThumbnailRegenerated((fileId: string) => {
            refreshFile(fileId);
            showToast('サムネイルを再作成しました', 'success');
        });
        return unsubscribe;
    }, [refreshFile, showToast]);

    // カードサイズ計算（useMemoでメモ化、cardSize変更時のみ再計算）
    const { cardHeight, columns, rows } = useMemo(() => {
        const size = CARD_SIZES[cardSize];
        // Info area の高さを showFileName に応じて調整（固定高さで仮想スクロール対応）
        const infoHeight = showFileName ? 40 : 0;
        const cardW = size.width + CARD_GAP * 2;
        const h = size.height + infoHeight + CARD_GAP * 2;
        const cols = Math.max(1, Math.floor(containerWidth / cardW));
        const r = Math.ceil(gridItems.length / cols);
        return { cardHeight: h, columns: cols, rows: r };
    }, [cardSize, showFileName, containerWidth, gridItems.length]);

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
                <div className="flex-1 flex items-center justify-center text-surface-500">
                    <div className="text-center">
                        <p className="text-lg">ファイルがありません</p>
                        <p className="text-sm mt-2">サイドバーからフォルダを選択してください</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Header />
            <div
                ref={parentRef}
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
                                    const size = CARD_SIZES[cardSize];
                                    const cardW = size.width;
                                    const cardH = size.height + (showFileName ? 40 : 0);

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
