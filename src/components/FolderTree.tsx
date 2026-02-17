import React, { useMemo, useState, useCallback } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, HardDrive } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { buildFolderTreeByDrive, type FolderTreeNode } from '../utils/buildFolderTree';

interface FolderTreeProps {
    folders: MediaFolder[];
    currentFolderId: string | null;
    onSelectFolder: (folderId: string) => void;
    collapsed: boolean;  // サイドバー折りたたみ状態
}

export const FolderTree = React.memo(({ folders, currentFolderId, onSelectFolder, collapsed }: FolderTreeProps) => {
    // ツリー構築（メモ化）- Phase 22-B: ドライブ別グループ化
    const treeByDrive = useMemo(() => buildFolderTreeByDrive(folders), [folders]);

    // 折りたたみ状態（フォルダID の Set）
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    // ドライブ単位の折りたたみ（Phase 22-B）
    const [collapsedDrives, setCollapsedDrives] = useState<Set<string>>(new Set());

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
                    onClick={() => onSelectFolder(node.id)}
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
                    {!collapsed && <span className="truncate text-sm">{node.name}</span>}
                </div>

                {hasChildren && !isCollapsed && (
                    <div>
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    }, [currentFolderId, collapsedFolders, toggleFolder, onSelectFolder, collapsed]);

    // ドライブがない場合（空）
    if (treeByDrive.size === 0) {
        return null;
    }

    // Phase 22-B: ドライブ別表示
    return (
        <div>
            {Array.from(treeByDrive.entries()).map(([drive, nodes]) => {
                const isDriveCollapsed = collapsedDrives.has(drive);

                return (
                    <div key={drive} className="mb-2">
                        {/* ドライブヘッダー */}
                        <div
                            className="flex items-center gap-2 p-2 font-semibold text-surface-400 cursor-pointer hover:bg-surface-800 rounded transition-colors"
                            onClick={() => toggleDrive(drive)}
                        >
                            {isDriveCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            <HardDrive size={16} className="flex-shrink-0" />
                            {!collapsed && <span className="text-sm">{drive}</span>}
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
