import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, HardDrive, Pin, Settings2 } from 'lucide-react';
import type { MediaFolder } from '../types/file';
import { buildFolderTreeByDrive, type FolderTreeNode } from '../utils/buildFolderTree';
import { DRIVE_PREFIX, buildFolderSelectionValue, FOLDER_PREFIX, VIRTUAL_FOLDER_PREFIX, VIRTUAL_FOLDER_RECURSIVE_PREFIX } from './sidebar/sidebarShared';

interface FolderTreeProps {
    folders: MediaFolder[];
    folderRecursiveCountsByPath?: Record<string, number>;
    currentFolderId: string | null;
    onSelectFolder: (folderId: string) => void;
    collapsed: boolean;  // サイドバー折りたたみ状態
    onOpenFolderSettings?: (folder: MediaFolder) => void;
    isPinnedSelection?: (selection: string) => boolean;
    onTogglePinnedSelection?: (selection: string) => void;
}

function collectInitialCollapsedFolderIds(treeByDrive: Map<string, FolderTreeNode[]>): Set<string> {
    const result = new Set<string>();

    const visit = (node: FolderTreeNode) => {
        if (node.children.length > 0 && node.depth >= 1) {
            result.add(node.id);
        }
        node.children.forEach(visit);
    };

    for (const nodes of treeByDrive.values()) {
        nodes.forEach(visit);
    }

    return result;
}

function findSelectedNodeLineage(
    treeByDrive: Map<string, FolderTreeNode[]>,
    currentFolderId: string | null
): { drive: string; nodeIdsToExpand: string[] } | null {
    if (!currentFolderId) return null;

    const isVirtualDirect = currentFolderId.startsWith(VIRTUAL_FOLDER_PREFIX);
    const isVirtualRecursive = currentFolderId.startsWith(VIRTUAL_FOLDER_RECURSIVE_PREFIX);
    const virtualPath = isVirtualDirect
        ? currentFolderId.slice(VIRTUAL_FOLDER_PREFIX.length)
        : isVirtualRecursive
            ? currentFolderId.slice(VIRTUAL_FOLDER_RECURSIVE_PREFIX.length)
            : null;
    const regularId = currentFolderId.startsWith(FOLDER_PREFIX)
        ? currentFolderId.slice(FOLDER_PREFIX.length)
        : currentFolderId;

    for (const [drive, nodes] of treeByDrive.entries()) {
        const stack: Array<{ node: FolderTreeNode; ancestors: string[] }> = nodes.map((n) => ({ node: n, ancestors: [] }));
        while (stack.length > 0) {
            const current = stack.pop()!;
            const matches = virtualPath
                ? current.node.path === virtualPath
                : current.node.id === regularId;
            if (matches) {
                return {
                    drive,
                    nodeIdsToExpand: current.ancestors
                };
            }
            current.node.children.forEach((child) => {
                stack.push({
                    node: child,
                    ancestors: [...current.ancestors, current.node.id]
                });
            });
        }
    }

    return null;
}

export const FolderTree = React.memo(({
    folders,
    folderRecursiveCountsByPath = {},
    currentFolderId,
    onSelectFolder,
    collapsed,
    onOpenFolderSettings,
    isPinnedSelection,
    onTogglePinnedSelection,
}: FolderTreeProps) => {
    // ツリー構築（メモ化）- Phase 22-B: ドライブ別グループ化
    const treeByDrive = useMemo(() => buildFolderTreeByDrive(folders), [folders]);

    const buildInitialCollapsedDrives = useCallback(
        () => new Set(Array.from(treeByDrive.keys())),
        [treeByDrive]
    );

    // 折りたたみ状態（起動時は毎回閉じた状態から始める）
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => collectInitialCollapsedFolderIds(treeByDrive));
    const [collapsedDrives, setCollapsedDrives] = useState<Set<string>>(() => buildInitialCollapsedDrives());
    const initializedCollapseRef = useRef(false);
    const skippedInitialSelectionExpandRef = useRef(false);

    useEffect(() => {
        if (initializedCollapseRef.current) return;
        if (treeByDrive.size === 0) return;

        // 起動時は毎回ドライブ配下と深い階層を閉じて、情報量を抑える
        setCollapsedDrives(buildInitialCollapsedDrives());
        setCollapsedFolders(collectInitialCollapsedFolderIds(treeByDrive));
        initializedCollapseRef.current = true;
    }, [buildInitialCollapsedDrives, treeByDrive]);

    useEffect(() => {
        if (!skippedInitialSelectionExpandRef.current) {
            skippedInitialSelectionExpandRef.current = true;
            return;
        }

        const lineage = findSelectedNodeLineage(treeByDrive, currentFolderId);
        if (!lineage) return;

        setCollapsedDrives((prev) => {
            if (!prev.has(lineage.drive)) return prev;
            const next = new Set(prev);
            next.delete(lineage.drive);
            return next;
        });

        if (lineage.nodeIdsToExpand.length > 0) {
            setCollapsedFolders((prev) => {
                const next = new Set(prev);
                let changed = false;
                lineage.nodeIdsToExpand.forEach((id) => {
                    if (next.has(id)) {
                        next.delete(id);
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [treeByDrive, currentFolderId]);

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
    const renderNode = useCallback((node: FolderTreeNode, baseDepthOffset: number = 0) => {
        const isCollapsed = collapsedFolders.has(node.id);
        const hasChildren = node.children.length > 0;
        const isVirtual = !!node.sourceFolder.isVirtualFolder;
        const selectionValue = buildFolderSelectionValue(node.sourceFolder, hasChildren);
        const isSelected = isVirtual
            ? currentFolderId === `${VIRTUAL_FOLDER_PREFIX}${node.path}` || currentFolderId === `${VIRTUAL_FOLDER_RECURSIVE_PREFIX}${node.path}`
            : currentFolderId === node.id || currentFolderId === `${FOLDER_PREFIX}${node.id}`;
        const visualDepth = node.depth + baseDepthOffset;
        const recursiveCount = folderRecursiveCountsByPath[node.path.toLowerCase()] || 0;

        return (
            <div key={node.id}>
                <div
                    className={`
                        flex items-center gap-1 p-2 rounded cursor-pointer mb-1 transition-colors
                        ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-surface-800 text-surface-300'}
                    `}
                    style={{ paddingLeft: `${visualDepth * 16 + 8}px` }}
                    onClick={() => {
                        // Phase 22-C: 子フォルダがある場合は配下全体を選択
                        onSelectFolder(selectionValue);
                    }}
                    onContextMenu={(e) => {
                        if (node.sourceFolder.isVirtualFolder) {
                            return;
                        }
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
                    {!collapsed && (
                        <span
                            className={`ml-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none ${isSelected ? 'bg-blue-500/40 text-blue-100' : 'bg-surface-800 text-surface-400'}`}
                            title={`配下ファイル数: ${recursiveCount}`}
                        >
                            {recursiveCount}
                        </span>
                    )}
                    {!collapsed && onTogglePinnedSelection && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinnedSelection(selectionValue);
                            }}
                            className={`rounded p-1 transition-colors ${isSelected ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                            title={isPinnedSelection?.(selectionValue) ? 'ピン留め解除' : 'ピン留め'}
                            aria-label={isPinnedSelection?.(selectionValue) ? 'ピン留め解除' : 'ピン留め'}
                        >
                            <Pin
                                size={13}
                                className={isPinnedSelection?.(selectionValue)
                                    ? (isSelected ? 'text-blue-100' : 'text-amber-400')
                                    : (isSelected ? 'text-blue-100/80' : 'text-surface-500')}
                            />
                        </button>
                    )}
                    {!collapsed && onOpenFolderSettings && !node.sourceFolder.isVirtualFolder && (
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
                        {node.children.map(child => renderNode(child, baseDepthOffset))}
                    </div>
                )}
            </div>
        );
    }, [
        currentFolderId,
        collapsedFolders,
        toggleFolder,
        onSelectFolder,
        collapsed,
        onOpenFolderSettings,
        folderRecursiveCountsByPath,
        isPinnedSelection,
        onTogglePinnedSelection,
    ]);

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
                const driveCount = nodes.reduce((sum, node) => sum + (folderRecursiveCountsByPath[node.path.toLowerCase()] || 0), 0);

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
                            {!collapsed && (
                                <span
                                    className={`ml-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none ${isDriveSelected ? 'bg-blue-500/40 text-blue-100' : 'bg-surface-800 text-surface-400'}`}
                                    title={`配下ファイル数: ${driveCount}`}
                                >
                                    {driveCount}
                                </span>
                            )}
                            {!collapsed && onTogglePinnedSelection && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePinnedSelection(`${DRIVE_PREFIX}${drive}`);
                                    }}
                                    className={`rounded p-1 transition-colors ${isDriveSelected ? 'hover:bg-blue-500/40' : 'hover:bg-surface-700'}`}
                                    title={isPinnedSelection?.(`${DRIVE_PREFIX}${drive}`) ? 'ピン留め解除' : 'ピン留め'}
                                    aria-label={isPinnedSelection?.(`${DRIVE_PREFIX}${drive}`) ? 'ピン留め解除' : 'ピン留め'}
                                >
                                    <Pin
                                        size={13}
                                        className={isPinnedSelection?.(`${DRIVE_PREFIX}${drive}`)
                                            ? (isDriveSelected ? 'text-blue-100' : 'text-amber-400')
                                            : (isDriveSelected ? 'text-blue-100/80' : 'text-surface-500')}
                                    />
                                </button>
                            )}
                        </div>

                        {/* フォルダツリー */}
                        {!isDriveCollapsed && (
                            <div className="mt-1">
                                {nodes.map(node => renderNode(node, 1))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

FolderTree.displayName = 'FolderTree';
