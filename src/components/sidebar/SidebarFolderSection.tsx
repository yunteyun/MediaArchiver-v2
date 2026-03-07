import React from 'react';
import { Library, Search, SlidersHorizontal, X } from 'lucide-react';
import { FolderTree } from '../FolderTree';
import type { MediaFolder } from '../../types/file';
import { ALL_FILES_ID } from './sidebarShared';

interface SidebarFolderSectionProps {
    sidebarCollapsed: boolean;
    currentFolderId: string | null;
    folders: MediaFolder[];
    folderTreeSearch: string;
    onFolderTreeSearchChange: (value: string) => void;
    filteredFoldersForTree: MediaFolder[];
    folderTreeRecursiveCountsByPath: Record<string, number>;
    onSelectAllFiles: () => void;
    onOpenFolderScanSettingsManager: () => void;
    onSelectFolder: (folderId: string | null) => void;
    onOpenFolderSettings: (folder: MediaFolder) => void;
}

export const SidebarFolderSection = React.memo(({
    sidebarCollapsed,
    currentFolderId,
    folders,
    folderTreeSearch,
    onFolderTreeSearchChange,
    filteredFoldersForTree,
    folderTreeRecursiveCountsByPath,
    onSelectAllFiles,
    onOpenFolderScanSettingsManager,
    onSelectFolder,
    onOpenFolderSettings,
}: SidebarFolderSectionProps) => (
    <>
        <div
            onClick={onSelectAllFiles}
            className={`
                flex items-center gap-2 p-2 rounded cursor-pointer mb-2 transition-colors
                ${(currentFolderId === ALL_FILES_ID || currentFolderId === null)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-surface-800 text-surface-300'}
                ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="すべてのファイル"
        >
            <Library size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && (
                <>
                    <span className="truncate text-sm font-medium">
                        すべてのファイル
                    </span>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpenFolderScanSettingsManager();
                        }}
                        className={`ml-auto rounded p-1 transition-colors ${(currentFolderId === ALL_FILES_ID || currentFolderId === null)
                            ? 'hover:bg-blue-500/40'
                            : 'hover:bg-surface-700'}`}
                        title="フォルダ別スキャン設定（一覧管理）"
                        aria-label="フォルダ別スキャン設定（一覧管理）"
                    >
                        <SlidersHorizontal
                            size={14}
                            className={(currentFolderId === ALL_FILES_ID || currentFolderId === null) ? 'text-blue-100' : 'text-surface-400'}
                        />
                    </button>
                </>
            )}
        </div>

        {folders.length > 0 && (
            <div className="border-t border-surface-700 my-2" />
        )}

        {!sidebarCollapsed && folders.length > 0 && (
            <div className="mb-2 px-1">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-500" />
                    <input
                        type="text"
                        value={folderTreeSearch}
                        onChange={(event) => onFolderTreeSearchChange(event.target.value)}
                        placeholder="フォルダツリー検索"
                        className="w-full rounded border border-surface-700 bg-surface-900/50 py-1.5 pl-7 pr-7 text-xs text-surface-200 placeholder:text-surface-500 focus:outline-none focus:border-primary-500"
                    />
                    {folderTreeSearch && (
                        <button
                            type="button"
                            onClick={() => onFolderTreeSearchChange('')}
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                            aria-label="フォルダツリー検索をクリア"
                            title="クリア"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                <div className="mt-1 text-[11px] text-surface-500">
                    {folderTreeSearch.trim() ? `検索結果 ${filteredFoldersForTree.length} 件` : `登録/仮想フォルダ ${folders.length} 件`}
                </div>
            </div>
        )}

        {folders.length === 0 ? (
            !sidebarCollapsed && (
                <p className="text-surface-500 text-sm text-center py-4">
                    フォルダがありません
                </p>
            )
        ) : folderTreeSearch.trim() && filteredFoldersForTree.length === 0 ? (
            !sidebarCollapsed && (
                <p className="text-surface-500 text-sm text-center py-4">
                    検索結果がありません
                </p>
            )
        ) : (
            <FolderTree
                folders={filteredFoldersForTree}
                folderRecursiveCountsByPath={folderTreeRecursiveCountsByPath}
                currentFolderId={currentFolderId}
                onSelectFolder={onSelectFolder}
                collapsed={sidebarCollapsed}
                onOpenFolderSettings={onOpenFolderSettings}
            />
        )}
    </>
));

SidebarFolderSection.displayName = 'SidebarFolderSection';
