import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFileStore } from '../stores/useFileStore';
import { useUIStore } from '../stores/useUIStore';
import { FileCard } from './FileCard';
import { SortMenu } from './SortMenu';

const CARD_GAP = 8;

export const FileGrid = React.memo(() => {
    const getSortedFiles = useFileStore((s) => s.getSortedFiles);
    const files = getSortedFiles();
    const selectedIds = useFileStore((s) => s.selectedIds);
    const selectFile = useFileStore((s) => s.selectFile);
    const thumbnailSize = useUIStore((s) => s.thumbnailSize);

    const parentRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState(1000);

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

    const handleSelect = useCallback((id: string, multi: boolean) => {
        selectFile(id, multi);
    }, [selectFile]);

    if (files.length === 0) {
        return (
            <div className="flex-1 flex flex-col h-full">
                <SortMenu />
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
            <SortMenu />
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
