import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, HardDrive, Settings2 } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { buildFolderTreeByDrive, type FolderTreeNode } from '../utils/buildFolderTree';
import { DRIVE_PREFIX, FOLDER_PREFIX } from './Sidebar';

interface FolderTreeProps {
    folders: MediaFolder[];
    currentFolderId: string | null;
    onSelectFolder: (folderId: string) => void;
    collapsed: boolean;  // サイドバー折りたたみ状態
    onOpenFolderSettings?: (folder: MediaFolder) => void;
}

export const FolderTree = React.memo(({ folders, currentFolderId, onSelectFolder, collapsed, onOpenFolderSettings }: FolderTreeProps) => {
    // ツリー構築（メモ化）- Phase 22-B: ドライブ別グループ化
    const treeByDrive = useMemo(() => buildFolderTreeByDrive(folders), [folders]);

    // 折りたたみ状態（フォルダID の Set）
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    // ドライブ単位の折りたたみ（Phase 22-B）
    const [collapsedDrives, setCollapsedDrives] = useState<Set<string>>(new Set());
    const initializedDriveCollapseRef = useRef(false);

    useEffect(() => {
        if (initializedDriveCollapseRef.current) return;
        if (treeByDrive.size === 0) return;

        // 初回表示はドライブ配下を閉じて、情報量を抑える
        setCollapsedDrives(new Set(Array.from(treeByDrive.keys())));
        initializedDriveCollapseRef.current = true;
    }, [treeByDrive]);

    // フォルダトグル
    const toggleFolder = useCallback((folderId: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    // ドライブトグル（Phase 22-B）
    const toggleDrive = useCallback((drive: string) => {
        setCollapsedDrives(prev => {
            const next = new Set(prev);
            if (next.has(drive)) {
                next.delete(drive);
            } else {
                next.add(drive);
            }
            return next;
        });
    }, []);

    // 再帰レンダリング
    const renderNode = useCallback((node: FolderTreeNode) => {
        const isCollapsed = collapsedFolders.has(node.id);
        const hasChildren = node.children.length > 0;
        const isSelected = currentFolderId === node.id;

        return (
            <div key={node.id}>
                <div
                    className={`
                        flex items-center gap-1 p-2 rounded cursor-pointer mb-1 transition-colors
                        ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-surface-800 text-surface-300'}
                    `}
                    style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
                    onClick={() => {
                        // Phase 22-C: 子フォルダがある場合は配下全体を選択
                        const folderId = hasChildren ? `${FOLDER_PREFIX}${node.id}` : node.id;
                        onSelectFolder(folderId);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        window.electronAPI.showFolderContextMenu(node.id, node.path);
                    }}
                    title={node.path}
                >
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFolder(node.id);
                            }}
                            className="p-0.5 hover:bg-surface-700 rounded flex-shrink-0"
                        >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    {!hasChildren && <div className="w-5 flex-shrink-0" />}
                    {isSelected ? <FolderOpen size={16} className="flex-shrink-0" /> : <Folder size={16} className="flex-shrink-0" />}
                    {!collapsed && <span className="truncate text-sm font-medium">{node.name}</span>}
                    {!collapsed && onOpenFolderSettings && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenFolderSettings(node.sourceFolder);
                            }}
                            className={`ml-auto rounded p-1 transition-colors ${isSelected ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                            title="フォルダ別自動スキャン設定"
                            aria-label="フォルダ別自動スキャン設定"
                        >
                            <Settings2 size={13} className={isSelected ? 'text-blue-100' : 'text-surface-400'} />
                        </button>
                    )}
                </div>

                {hasChildren && !isCollapsed && (
                    <div>
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    }, [currentFolderId, collapsedFolders, toggleFolder, onSelectFolder, collapsed, onOpenFolderSettings]);

    // ドライブがない場合（空）
    if (treeByDrive.size === 0) {
        return null;
    }

    // Phase 22-B: ドライブ別表示
    return (
        <div>
            {Array.from(treeByDrive.entries()).map(([drive, nodes]) => {
                const isDriveCollapsed = collapsedDrives.has(drive);
                const isDriveSelected = currentFolderId === `${DRIVE_PREFIX}${drive}`;

                return (
                    <div key={drive} className="mb-2">
                        {/* ドライブヘッダー */}
                        <div
                            className={`
                                flex items-center gap-2 p-2 rounded transition-colors
                                ${isDriveSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'text-surface-300 hover:bg-surface-800 cursor-pointer'}
                            `}
                            onClick={() => {
                                // Phase 22-C: ドライブクリックで配下全ファイル表示
                                onSelectFolder(`${DRIVE_PREFIX}${drive}`);
                            }}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDrive(drive);
                                }}
                                className={`p-0.5 rounded transition-colors ${isDriveSelected ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                aria-label={`${drive} を${isDriveCollapsed ? '展開' : '折りたたみ'}`}
                                title={`${isDriveCollapsed ? '展開' : '折りたたみ'}`}
                            >
                                {isDriveCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <HardDrive size={18} className={`flex-shrink-0 ${isDriveSelected ? 'text-white' : ''}`} />
                            {!collapsed && <span className="text-sm font-medium">{drive}</span>}
                        </div>

                        {/* フォルダツリー */}
                        {!isDriveCollapsed && (
                            <div className="mt-1">
                                {nodes.map(node => renderNode(node))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

FolderTree.displayName = 'FolderTree';
