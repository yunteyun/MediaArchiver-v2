import React, { useState, useEffect } from 'react';
import { Play, FileText, Image as ImageIcon, Archive } from 'lucide-react';
import type { MediaFile } from '../types/file';
import { useUIStore } from '../stores/useUIStore';
import type { Tag } from '../stores/useTagStore';
import { TagBadge } from './tags';

interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    onSelect: (id: string, multi: boolean) => void;
}

export const FileCard = React.memo(({ file, isSelected, onSelect }: FileCardProps) => {
    const Icon = file.type === 'video' ? Play
        : file.type === 'image' ? ImageIcon
            : file.type === 'archive' ? Archive
                : FileText;
    const openLightbox = useUIStore((s) => s.openLightbox);

    // File tags state
    const [fileTags, setFileTags] = useState<Tag[]>([]);

    // Load file tags
    useEffect(() => {
        let isMounted = true;
        window.electronAPI.getFileTags(file.id).then((tags) => {
            if (isMounted) {
                // Map to Tag type from store
                const mappedTags = tags.map(t => ({
                    id: t.id,
                    name: t.name,
                    color: t.color,
                    categoryId: t.categoryId,
                    sortOrder: t.sortOrder,
                    createdAt: t.createdAt
                }));
                setFileTags(mappedTags);
            }
        }).catch(console.error);
        return () => { isMounted = false; };
    }, [file.id]);

    const handleClick = (e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey) {
            onSelect(file.id, true);
        } else {
            openLightbox(file);
        }
    };

    const handleDoubleClick = async () => {
        try {
            await window.electronAPI.openExternal(file.path);
        } catch (e) {
            console.error('Failed to open file:', e);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        window.electronAPI.showFileContextMenu(file.id, file.path);
    };

    return (
        <div
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            className={`
                w-full h-full rounded-lg overflow-hidden border-2 flex flex-col bg-surface-800 cursor-pointer
                transition-all duration-150
                ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-transparent hover:border-surface-600'}
            `}
        >
            {/* Thumbnail Area */}
            <div className="flex-1 relative bg-surface-900 flex items-center justify-center overflow-hidden group min-h-0">
                {file.thumbnailPath ? (
                    <img
                        src={`file://${file.thumbnailPath}`}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <Icon size={40} className="text-surface-600" />
                )}

                {/* Duration Badge */}
                {file.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {file.duration}
                    </div>
                )}

                {/* Tags Overlay (on hover) */}
                {fileTags.length > 0 && (
                    <div className="absolute top-1 left-1 flex flex-wrap gap-0.5 max-w-[90%] opacity-0 group-hover:opacity-100 transition-opacity">
                        {fileTags.slice(0, 3).map(tag => (
                            <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                        ))}
                        {fileTags.length > 3 && (
                            <span className="text-xs bg-black/70 text-white px-1 rounded">
                                +{fileTags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="h-10 px-2 flex flex-col justify-center bg-surface-800">
                <div className="text-xs text-surface-200 truncate" title={file.name}>
                    {file.name}
                </div>
            </div>
        </div>
    );
});

FileCard.displayName = 'FileCard';

