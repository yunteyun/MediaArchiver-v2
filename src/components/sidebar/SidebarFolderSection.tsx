import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, History, Library, Pin, Search, SlidersHorizontal, X } from 'lucide-react';
import { FolderTree } from '../FolderTree';
import type { MediaFolder } from '../../types/file';
import { ALL_FILES_ID, normalizeSidebarSelection, resolveSidebarSelectionLabel } from './sidebarShared';

const FOLDER_HELPERS_STATE_STORAGE_KEY = 'sidebar.folderHelpersOpen.v1';

function readFolderHelpersOpenState(): boolean {
    try {
        return window.localStorage.getItem(FOLDER_HELPERS_STATE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeFolderHelpersOpenState(isOpen: boolean) {
    try {
        window.localStorage.setItem(FOLDER_HELPERS_STATE_STORAGE_KEY, isOpen ? '1' : '0');
    } catch {
        // ignore localStorage failures
    }
}

interface SidebarFolderSectionProps {
    sidebarCollapsed: boolean;
    currentFolderId: string | null;
    folders: MediaFolder[];
    folderTreeSearch: string;
    onFolderTreeSearchChange: (value: string) => void;
    filteredFoldersForTree: MediaFolder[];
    folderTreeRecursiveCountsByPath: Record<string, number>;
    pinnedSelections: string[];
    recentSelections: string[];
    onSelectAllFiles: () => void;
    onOpenFolderScanSettingsManager: () => void;
    onSelectFolder: (folderId: string | null) => void;
    onOpenFolderSettings: (folder: MediaFolder) => void;
    onTogglePinnedSelection: (selection: string) => void;
}

export const SidebarFolderSection = React.memo(({
    sidebarCollapsed,
    currentFolderId,
    folders,
    folderTreeSearch,
    onFolderTreeSearchChange,
    filteredFoldersForTree,
    folderTreeRecursiveCountsByPath,
    pinnedSelections,
    recentSelections,
    onSelectAllFiles,
    onOpenFolderScanSettingsManager,
    onSelectFolder,
    onOpenFolderSettings,
    onTogglePinnedSelection,
}: SidebarFolderSectionProps) => {
    const [helpersOpen, setHelpersOpen] = useState(() => readFolderHelpersOpenState());
    const previousSearchActiveRef = useRef(false);
    const normalizedCurrentSelection = normalizeSidebarSelection(currentFolderId);
    const hasHelperContent = folders.length > 0 && (!sidebarCollapsed || false);
    const helperBadge = useMemo(() => {
        if (folderTreeSearch.trim()) return '検索中';
        if (recentSelections.length > 0) return `最近 ${recentSelections.length}`;
        if (pinnedSelections.length > 0) return `ピン ${pinnedSelections.length}`;
        return null;
    }, [folderTreeSearch, pinnedSelections.length, recentSelections.length]);

    useEffect(() => {
        writeFolderHelpersOpenState(helpersOpen);
    }, [helpersOpen]);

    useEffect(() => {
        const hasActiveSearch = folderTreeSearch.trim().length > 0;
        if (hasActiveSearch && !previousSearchActiveRef.current) {
            setHelpersOpen(true);
        }
        previousSearchActiveRef.current = hasActiveSearch;
    }, [folderTreeSearch]);

    return (
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
                            onTogglePinnedSelection(ALL_FILES_ID);
                        }}
                        className={`ml-auto rounded p-1 transition-colors ${(currentFolderId === ALL_FILES_ID || currentFolderId === null)
                            ? 'hover:bg-blue-500/40'
                            : 'hover:bg-surface-700'}`}
                        title={pinnedSelections.includes(ALL_FILES_ID) ? 'ピン留め解除' : 'ピン留め'}
                        aria-label={pinnedSelections.includes(ALL_FILES_ID) ? 'ピン留め解除' : 'ピン留め'}
                    >
                        <Pin
                            size={14}
                            className={pinnedSelections.includes(ALL_FILES_ID)
                                ? ((currentFolderId === ALL_FILES_ID || currentFolderId === null) ? 'text-blue-100' : 'text-amber-400')
                                : ((currentFolderId === ALL_FILES_ID || currentFolderId === null) ? 'text-blue-100' : 'text-surface-400')}
                        />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpenFolderScanSettingsManager();
                        }}
                        className={`rounded p-1 transition-colors ${(currentFolderId === ALL_FILES_ID || currentFolderId === null)
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

        {!sidebarCollapsed && hasHelperContent && (
            <section className="mb-2 border-b border-surface-800/70 pb-2">
                <button
                    type="button"
                    onClick={() => setHelpersOpen((prev) => !prev)}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-surface-300 transition-colors hover:bg-surface-800"
                    aria-expanded={helpersOpen}
                >
                    <Search size={16} className="flex-shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">フォルダ補助</span>
                    {helperBadge && (
                        <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-medium text-primary-300">
                            {helperBadge}
                        </span>
                    )}
                    <ChevronDown
                        size={16}
                        className={`flex-shrink-0 text-surface-500 transition-transform ${helpersOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                </button>

                {helpersOpen && (
                    <div className="space-y-2 px-1 pt-1">
                        <div>
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

                        {pinnedSelections.length > 0 && (
                            <div>
                                <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-surface-400">
                                    <Pin size={12} />
                                    ピン留め
                                </div>
                                <div className="space-y-1">
                                    {pinnedSelections.map((selection) => {
                                        const isSelected = normalizedCurrentSelection === selection;
                                        return (
                                            <div
                                                key={selection}
                                                onClick={() => onSelectFolder(selection)}
                                                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'cursor-pointer text-surface-300 hover:bg-surface-800'
                                                }`}
                                            >
                                                <Pin size={12} className="flex-shrink-0" />
                                                <span className="min-w-0 flex-1 truncate">{resolveSidebarSelectionLabel(selection, folders)}</span>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onTogglePinnedSelection(selection);
                                                    }}
                                                    className={`rounded p-1 transition-colors ${isSelected ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                                    title="ピン留め解除"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {recentSelections.length > 0 && (
                            <div>
                                <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-surface-400">
                                    <History size={12} />
                                    最近開いた場所
                                </div>
                                <div className="space-y-1">
                                    {recentSelections.map((selection) => {
                                        const isSelected = normalizedCurrentSelection === selection;
                                        return (
                                            <div
                                                key={selection}
                                                onClick={() => onSelectFolder(selection)}
                                                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'cursor-pointer text-surface-300 hover:bg-surface-800'
                                                }`}
                                            >
                                                <History size={12} className="flex-shrink-0" />
                                                <span className="truncate">{resolveSidebarSelectionLabel(selection, folders)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
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
                isPinnedSelection={(selection) => pinnedSelections.includes(selection)}
                onTogglePinnedSelection={onTogglePinnedSelection}
            />
        )}
    </>
    );
});

SidebarFolderSection.displayName = 'SidebarFolderSection';
