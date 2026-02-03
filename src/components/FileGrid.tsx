import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTagStore } from '../stores/useTagStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { FileCard } from './FileCard';
import { Header } from './SortMenu';

const CARD_GAP = 8;

export const FileGrid = React.memo(() => {
    const rawFiles = useFileStore((s) => s.files);
    const selectedIds = useFileStore((s) => s.selectedIds);
    const focusedId = useFileStore((s) => s.focusedId);
    const selectFile = useFileStore((s) => s.selectFile);
    const selectAll = useFileStore((s) => s.selectAll);
    const clearSelection = useFileStore((s) => s.clearSelection);
    const removeFile = useFileStore((s) => s.removeFile);
    const fileTagsCache = useFileStore((s) => s.fileTagsCache);
    const thumbnailSize = useUIStore((s) => s.thumbnailSize);
    const sortBy = useSettingsStore((s) => s.sortBy);
    const sortOrder = useSettingsStore((s) => s.sortOrder);
    const searchQuery = useUIStore((s) => s.searchQuery);
    const openLightbox = useUIStore((s) => s.openLightbox);
    const openSettingsModal = useUIStore((s) => s.openSettingsModal);

    // Tag filter state
    const selectedTagIds = useTagStore((s) => s.selectedTagIds);
    const filterMode = useTagStore((s) => s.filterMode);

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

    const cardWidth = thumbnailSize + CARD_GAP * 2;
    const cardHeight = thumbnailSize + 40 + CARD_GAP * 2; // 40 = info area height
    const columns = Math.max(1, Math.floor(containerWidth / cardWidth));
    const rows = Math.ceil(files.length / columns);

    const rowVirtualizer = useVirtualizer({
        count: rows,
        getScrollElement: () => parentRef.current,
        estimateSize: () => cardHeight,
        overscan: 3,
    });

    // 現在のフォーカスインデックスを計算
    const focusedIndex = useMemo(() => {
        if (!focusedId) return -1;
        return files.findIndex((f) => f.id === focusedId);
    }, [focusedId, files]);

    // フォーカス変更時にスクロール追従
    useEffect(() => {
        if (focusedIndex >= 0 && rowVirtualizer) {
            const rowIndex = Math.floor(focusedIndex / columns);
            rowVirtualizer.scrollToIndex(rowIndex, { align: 'auto' });
        }
    }, [focusedIndex, columns, rowVirtualizer]);

    // キーボードショートカットハンドラ
    const moveSelection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (files.length === 0) return;

        let currentIndex = focusedIndex >= 0 ? focusedIndex : -1;
        let newIndex = currentIndex;

        switch (direction) {
            case 'up':
                newIndex = Math.max(0, currentIndex - columns);
                break;
            case 'down':
                newIndex = Math.min(files.length - 1, currentIndex + columns);
                break;
            case 'left':
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'right':
                newIndex = Math.min(files.length - 1, currentIndex + 1);
                break;
        }

        // 初回は最初のファイルを選択
        if (currentIndex === -1) {
            newIndex = 0;
        }

        const targetFile = files[newIndex];
        if (targetFile) {
            selectFile(targetFile.id); // 選択 & フォーカス
        }
    }, [files, focusedIndex, columns, selectFile]);

    const openFocusedFile = useCallback(() => {
        const file = focusedIndex >= 0 ? files[focusedIndex] : null;
        if (file) {
            openLightbox(file);
        }
    }, [focusedIndex, files, openLightbox]);

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

    if (files.length === 0) {
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
                        const rowFiles = files.slice(startIndex, startIndex + columns);

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
                                {rowFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        style={{
                                            width: `${thumbnailSize}px`,
                                            height: `${thumbnailSize + 40}px`,
                                        }}
                                    >
                                        <FileCard
                                            file={file}
                                            isSelected={selectedIds.has(file.id)}
                                            isFocused={focusedId === file.id && !selectedIds.has(file.id)}
                                            onSelect={handleSelect}
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

FileGrid.displayName = 'FileGrid';
