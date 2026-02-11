import React from 'react';
import { Folder } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { useSettingsStore } from '../stores/useSettingsStore';
import { toMediaUrl } from '../utils/mediaPath';

interface FolderCardProps {
    folder: MediaFolder;
    thumbnailPath?: string;
    fileCount: number;
    onNavigate: (folderId: string) => void;
}

export const FolderCard = React.memo(({ folder, thumbnailPath, fileCount, onNavigate }: FolderCardProps) => {
    const showFileName = useSettingsStore((s) => s.showFileName);

    const handleClick = () => {
        onNavigate(folder.id);
    };

    return (
        <div
            onClick={handleClick}
            style={{
                width: '100%',
                height: '100%'
            }}
            className="
                bg-surface-800 rounded-lg overflow-hidden cursor-pointer
                transition-all duration-200 hover:ring-2 hover:ring-primary-500
                hover:shadow-lg hover:shadow-primary-500/20
                flex flex-col
            "
        >
            {/* サムネイルエリア */}
            <div className="flex-1 relative bg-surface-900 flex items-center justify-center overflow-hidden group min-h-0">
                {thumbnailPath ? (
                    <img
                        src={toMediaUrl(thumbnailPath)}
                        alt={folder.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <Folder size={48} className="text-primary-400 opacity-50" />
                )}

                {/* ファイル数バッジ */}
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {fileCount} files
                </div>

                {/* フォルダアイコンオーバーレイ（サムネイルがある場合） */}
                {thumbnailPath && (
                    <div className="absolute top-1 left-1 bg-black/50 p-1 rounded">
                        <Folder size={16} className="text-white" />
                    </div>
                )}
            </div>

            {/* フォルダ名エリア */}
            {showFileName && (
                <div className="h-10 px-2 flex flex-col justify-center bg-surface-800">
                    <div className="text-xs text-surface-200 truncate font-medium" title={folder.name}>
                        {folder.name}
                    </div>
                </div>
            )}
        </div>
    );
});

FolderCard.displayName = 'FolderCard';
