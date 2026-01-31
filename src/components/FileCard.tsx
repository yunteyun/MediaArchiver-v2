import React from 'react';
import { Play, FileText, Image as ImageIcon } from 'lucide-react';
import type { MediaFile } from '../types/file';

interface FileCardProps {
    file: MediaFile;
    isSelected: boolean;
    onSelect: (id: string, multi: boolean) => void;
}

export const FileCard = React.memo(({ file, isSelected, onSelect }: FileCardProps) => {
    const Icon = file.type === 'video' ? Play : file.type === 'image' ? ImageIcon : FileText;

    const handleClick = (e: React.MouseEvent) => {
        onSelect(file.id, e.ctrlKey || e.metaKey);
    };

    const handleDoubleClick = async () => {
        try {
            await window.electronAPI.openExternal(file.path);
        } catch (e) {
            console.error('Failed to open file:', e);
        }
    };

    return (
        <div
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
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
