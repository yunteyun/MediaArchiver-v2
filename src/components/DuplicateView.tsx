/**
 * DuplicateView - 重複ファイルビュー
 */

import React, { useEffect, useCallback, useMemo, useState, startTransition } from 'react';
import { Copy, Trash2, Clock, FolderOpen, CheckSquare, Square, X, Loader, ShieldCheck, AlertTriangle, HardDrive, ChevronDown } from 'lucide-react';
import {
    DUPLICATE_BULK_ACTION_GROUP_LIMIT,
    useDuplicateStore,
    type DuplicateSelectionStrategy
} from '../stores/useDuplicateStore';
import { useUIStore } from '../stores/useUIStore';
import { toMediaUrl } from '../utils/mediaPath';
import type { DuplicateSearchMode } from '../shared/duplicateNameCandidates';

// ファイルサイズを人間が読める形式に変換
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSizeRange(minBytes: number, maxBytes: number): string {
    if (minBytes === maxBytes) {
        return formatFileSize(minBytes);
    }

    return `${formatFileSize(minBytes)} - ${formatFileSize(maxBytes)}`;
}

// 日付を人間が読める形式に変換
function formatDate(timestamp: number): string {
    if (!timestamp) return '不明';
    return new Date(timestamp).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(timestamp: number): string {
    if (!timestamp) return '不明';
    return new Date(timestamp).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getFileTimestamp(file: { mtime_ms?: number; created_at: number }): number {
    return file.mtime_ms || file.created_at || 0;
}

function formatDayGap(startTimestamp: number, endTimestamp: number): string {
    if (!startTimestamp || !endTimestamp) {
        return '不明';
    }

    const diffMs = Math.abs(endTimestamp - startTimestamp);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
        return '同日';
    }

    return `${diffDays}日差`;
}

function normalizeFilePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

function getFolderPath(filePath: string): string {
    const normalizedPath = normalizeFilePath(filePath);
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    if (lastSlashIndex <= 0) return normalizedPath;
    return normalizedPath.slice(0, lastSlashIndex);
}

function getFolderName(filePath: string): string {
    const folderPath = getFolderPath(filePath);
    const segments = folderPath.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? folderPath;
}

const folderTonePalette = [
    {
        row: 'border-l-sky-400',
        badge: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30',
        text: 'text-sky-200/95',
    },
    {
        row: 'border-l-amber-400',
        badge: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30',
        text: 'text-amber-200/95',
    },
    {
        row: 'border-l-emerald-400',
        badge: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30',
        text: 'text-emerald-200/95',
    },
    {
        row: 'border-l-fuchsia-400',
        badge: 'bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-500/30',
        text: 'text-fuchsia-200/95',
    },
];

function getFolderTone(index: number) {
    return folderTonePalette[index % folderTonePalette.length];
}

// --- 検索モードボタン（初期画面用） ---

const SearchModeButton: React.FC<{
    mode: DuplicateSearchMode;
    label: string;
    description: string;
    startSearch: (mode: DuplicateSearchMode) => Promise<void>;
}> = ({ mode, label, description, startSearch }) => (
    <button
        onClick={() => void startSearch(mode)}
        className="px-5 py-3 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 min-w-[140px]"
    >
        <span className="text-sm">{label}</span>
        <span className="text-xs text-surface-400 font-normal">{description}</span>
    </button>
);

// --- ヘッダー用モードボタン ---

const HeaderModeButton: React.FC<{
    label: string;
    mode: DuplicateSearchMode;
    currentMode: DuplicateSearchMode;
    isSearching: boolean;
    startSearch: (mode: DuplicateSearchMode) => Promise<void>;
}> = ({ label, mode, currentMode, isSearching, startSearch }) => {
    const isActive = currentMode === mode;
    return (
        <button
            onClick={() => void startSearch(mode)}
            disabled={isSearching}
            className={`px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 ${
                isActive
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-700 hover:bg-surface-600 text-surface-200'
            }`}
        >
            {label}
        </button>
    );
};

// --- フォルダ選択ドロップダウン ---

interface FolderSelectorProps {
    folders: { id: string; name: string; path: string }[];
    targetFolderIds: string[];
    isOpen: boolean;
    onToggleOpen: () => void;
    onToggleFolder: (folderId: string) => void;
    onClear: () => void;
    label: string;
    compact?: boolean;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({
    folders, targetFolderIds, isOpen, onToggleOpen, onToggleFolder, onClear, label, compact,
}) => {
    const ref = React.useRef<HTMLDivElement>(null);

    // 外側クリックで閉じる
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onToggleOpen();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onToggleOpen]);

    return (
        <div ref={ref} className={`relative ${compact ? '' : 'mb-4'}`}>
            <button
                type="button"
                onClick={onToggleOpen}
                className={`flex items-center gap-1.5 ${
                    compact
                        ? 'px-3 py-1.5 text-sm rounded'
                        : 'px-4 py-2 text-sm rounded-lg'
                } bg-surface-700 hover:bg-surface-600 text-surface-200 transition-colors`}
            >
                <FolderOpen className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-1 left-0 w-72 bg-surface-800 border border-surface-600 rounded-lg shadow-xl py-1 max-h-64 overflow-y-auto">
                    {targetFolderIds.length > 0 && (
                        <button
                            onClick={onClear}
                            className="w-full text-left px-3 py-1.5 text-xs text-surface-400 hover:bg-surface-700 transition-colors"
                        >
                            選択をクリア（全フォルダ対象）
                        </button>
                    )}
                    {folders.map((folder) => {
                        const isSelected = targetFolderIds.includes(folder.id);
                        return (
                            <button
                                key={folder.id}
                                onClick={() => onToggleFolder(folder.id)}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-700 transition-colors"
                            >
                                {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-primary-400 flex-shrink-0" />
                                ) : (
                                    <Square className="w-4 h-4 text-surface-500 flex-shrink-0" />
                                )}
                                <span className={`text-sm truncate ${isSelected ? 'text-surface-100' : 'text-surface-300'}`}>
                                    {folder.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const DuplicateView: React.FC = () => {
    const {
        groups,
        stats,
        isSearching,
        progress,
        selectedFileIds,
        isDeleting,
        hasSearched,
        searchMode,
        targetFolderIds,
        startSearch,
        cancelSearch,
        setProgress,
        setTargetFolderIds,
        selectFile,
        deselectFile,
        selectAcrossGroupsByStrategy,
        selectFilesInGroup,
        selectByStrategy,
        keepOnlyFileInGroup,
        clearSelection,
        deleteSelectedFiles,
        reset
    } = useDuplicateStore();

    const closeDuplicateView = useUIStore((s) => s.closeDuplicateView);
    const isSimilarMode = searchMode === 'similar_name';
    const isQuickMode = searchMode === 'quick';

    // フォルダ一覧を取得
    const [folders, setFolders] = useState<{ id: string; name: string; path: string }[]>([]);
    const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
    useEffect(() => {
        window.electronAPI.getFolders().then((list) => {
            setFolders(list.map((f) => ({ id: f.id, name: f.name, path: f.path })));
        });
    }, []);

    const toggleFolderSelection = useCallback((folderId: string) => {
        setTargetFolderIds(
            targetFolderIds.includes(folderId)
                ? targetFolderIds.filter((id) => id !== folderId)
                : [...targetFolderIds, folderId]
        );
    }, [targetFolderIds, setTargetFolderIds]);

    const folderFilterLabel = useMemo(() => {
        if (targetFolderIds.length === 0) return 'すべてのフォルダ';
        if (targetFolderIds.length === 1) {
            const folder = folders.find((f) => f.id === targetFolderIds[0]);
            return folder?.name ?? '1フォルダ';
        }
        return `${targetFolderIds.length}フォルダ`;
    }, [targetFolderIds, folders]);

    const folderSelectorProps = useMemo(() => ({
        folders,
        targetFolderIds,
        isOpen: isFolderDropdownOpen,
        onToggleOpen: () => setIsFolderDropdownOpen((v) => !v),
        onToggleFolder: toggleFolderSelection,
        onClear: () => setTargetFolderIds([]),
        label: folderFilterLabel,
    }), [folders, targetFolderIds, isFolderDropdownOpen, toggleFolderSelection, folderFilterLabel, setTargetFolderIds]);

    const showFolderSelector = folders.length >= 2;

    const viewCopy = useMemo(() => {
        if (isSimilarMode) {
            return {
                title: '類似ファイル名候補',
                emptyTitle: '類似ファイル名候補は見つかりませんでした',
                searchingTitle: '類似ファイル名候補を検索中...',
            };
        }
        if (isQuickMode) {
            return {
                title: 'サイズ一致候補',
                emptyTitle: 'サイズが一致するファイルは見つかりませんでした',
                searchingTitle: 'サイズ一致候補を検索中...',
            };
        }
        return {
            title: '重複ファイル',
            emptyTitle: '重複ファイルは見つかりませんでした',
            searchingTitle: '重複ファイルを検索中...',
        };
    }, [isSimilarMode, isQuickMode]);

    const selectionSummary = useMemo(() => {
        const selectedGroupCount = groups.filter((group) =>
            group.files.some((file) => selectedFileIds.has(file.id))
        ).length;
        const bulkActionGroupCount = Math.min(groups.length, DUPLICATE_BULK_ACTION_GROUP_LIMIT);
        return {
            selectedFileCount: selectedFileIds.size,
            selectedGroupCount,
            bulkActionGroupCount,
        };
    }, [groups, selectedFileIds]);

    // 進捗イベントをリッスン
    useEffect(() => {
        const unsubscribe = window.electronAPI.onDuplicateProgress((progress) => {
            setProgress(progress);
        });
        return unsubscribe;
    }, [setProgress]);

    // ファイルの選択/解除
    const toggleFileSelection = useCallback((fileId: string) => {
        if (selectedFileIds.has(fileId)) {
            deselectFile(fileId);
        } else {
            selectFile(fileId);
        }
    }, [selectedFileIds, selectFile, deselectFile]);

    // 削除確認
    const handleDelete = useCallback(async () => {
        if (selectedFileIds.size === 0) return;

        const confirmed = window.confirm(
            `${selectedFileIds.size}個のファイルを削除しますか？\nこの操作は取り消せません。`
        );

        if (confirmed) {
            await deleteSelectedFiles();
        }
    }, [selectedFileIds, deleteSelectedFiles]);

    const handleRevealInExplorer = useCallback(async (filePath: string) => {
        try {
            await window.electronAPI.showInExplorer(filePath);
        } catch (error) {
            console.error('Failed to reveal duplicate file:', error);
        }
    }, []);

    const handleBulkStrategy = useCallback((strategy: DuplicateSelectionStrategy) => {
        startTransition(() => {
            selectAcrossGroupsByStrategy(strategy, DUPLICATE_BULK_ACTION_GROUP_LIMIT);
        });
    }, [selectAcrossGroupsByStrategy]);

    // 検索中の表示
    if (isSearching) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-900">
                <Loader className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                <h2 className="text-xl font-medium text-surface-100 mb-2">
                    {viewCopy.searchingTitle}
                </h2>
                <p className="text-surface-400 mb-4">
                    {!progress && '準備中...'}
                    {progress?.phase === 'analyzing' && (
                        isSimilarMode
                            ? `ファイル名候補を分析中...${progress.total ? ` ${progress.current}/${progress.total}` : ''}`
                            : isQuickMode
                                ? `サイズ一致グループを分析中...${progress.total ? ` ${progress.current}/${progress.total}` : ''}`
                                : '同じサイズのファイルを分析中...'
                    )}
                    {progress?.phase === 'hashing' && (
                        <>
                            ハッシュ計算中: {progress.current}/{progress.total}
                            {progress.currentFile && (
                                <span className="block text-sm truncate max-w-md mt-1">
                                    {progress.currentFile}
                                </span>
                            )}
                        </>
                    )}
                </p>
                {progress?.phase === 'hashing' && (
                    <div className="w-64 h-2 bg-surface-700 rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-primary-500 transition-all duration-200"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                )}
                <button
                    onClick={cancelSearch}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg transition-colors"
                >
                    キャンセル
                </button>
            </div>
        );
    }

    // 検索済みだが重複なし
    if (hasSearched && !isSearching && groups.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-900">
                <Copy className="w-16 h-16 text-surface-600 mb-4" />
                <h2 className="text-xl font-medium text-surface-100 mb-2">
                    {viewCopy.emptyTitle}
                </h2>
                <p className="text-surface-400 mb-6 text-center max-w-md">
                    別のモードやフォルダ指定で再検索できます。
                </p>
                {showFolderSelector && <FolderSelector {...folderSelectorProps} />}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <SearchModeButton mode="quick" label="簡易検索" description="サイズ一致のみ（高速）" startSearch={startSearch} />
                    <SearchModeButton mode="exact" label="完全一致" description="ハッシュ比較（正確）" startSearch={startSearch} />
                    <SearchModeButton mode="similar_name" label="類似候補" description="ファイル名の類似判定" startSearch={startSearch} />
                </div>
            </div>
        );
    }

    // 未検索の初期画面
    if (!hasSearched && !isSearching && groups.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-900">
                <Copy className="w-16 h-16 text-surface-600 mb-4" />
                <h2 className="text-xl font-medium text-surface-100 mb-2">
                    重複ファイル検出
                </h2>
                <p className="text-surface-400 mb-6 text-center max-w-md">
                    同じ内容や類似ファイルを検出します。<br />
                    検索モードを選んで開始してください。
                </p>
                {showFolderSelector && <FolderSelector {...folderSelectorProps} />}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <SearchModeButton mode="quick" label="簡易検索" description="サイズ一致のみ（高速）" startSearch={startSearch} />
                    <SearchModeButton mode="exact" label="完全一致" description="ハッシュ比較（正確）" startSearch={startSearch} />
                    <SearchModeButton mode="similar_name" label="類似候補" description="ファイル名の類似判定" startSearch={startSearch} />
                </div>
            </div>
        );
    }

    // 重複グループ一覧
    return (
        <div className="h-full min-h-0 flex flex-col bg-surface-900 overflow-hidden">
            {/* ヘッダー */}
            <div className="flex flex-shrink-0 items-center justify-between p-4 border-b border-surface-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-medium text-surface-100 flex items-center gap-2">
                        <Copy className="w-5 h-5 text-primary-400" />
                        {viewCopy.title}
                    </h2>
                    {stats && (
                        <span className="text-sm text-surface-400">
                            {isSimilarMode
                                ? `${stats.totalGroups}グループ, ${stats.totalFiles}候補`
                                : `${stats.totalGroups}グループ, ${stats.totalFiles}ファイル, ${formatFileSize(stats.wastedSpace)}の無駄`}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {showFolderSelector && <FolderSelector {...folderSelectorProps} compact />}
                    <HeaderModeButton label="簡易" mode="quick" currentMode={searchMode} isSearching={isSearching} startSearch={startSearch} />
                    <HeaderModeButton label="完全一致" mode="exact" currentMode={searchMode} isSearching={isSearching} startSearch={startSearch} />
                    <HeaderModeButton label="類似候補" mode="similar_name" currentMode={searchMode} isSearching={isSearching} startSearch={startSearch} />
                    {groups.length > 0 && (
                        <>
                            <button
                                onClick={() => handleBulkStrategy('newest')}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                古い方を削除候補
                            </button>
                            <button
                                onClick={() => handleBulkStrategy('oldest')}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                新しい方を削除候補
                            </button>
                            <button
                                onClick={() => handleBulkStrategy('shortest_path')}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                パス長優先で削除候補
                            </button>
                        </>
                    )}
                    {selectedFileIds.size > 0 && (
                        <>
                            <button
                                onClick={clearSelection}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                選択解除
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                {selectedFileIds.size}件を削除
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => {
                            reset();
                            closeDuplicateView();
                        }}
                        className="p-1.5 text-surface-400 hover:text-surface-200 transition-colors"
                        title="閉じる"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {groups.length > DUPLICATE_BULK_ACTION_GROUP_LIMIT && (
                <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
                    <span>
                        一括操作は負荷対策のため先頭 {selectionSummary.bulkActionGroupCount} グループまで適用します。
                    </span>
                    <span className="text-amber-200/80">
                        対象外のグループは個別ボタンか手動選択を使ってください。
                    </span>
                </div>
            )}

            {selectionSummary.selectedFileCount > 0 && (
                <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-surface-800 bg-surface-950/80 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 text-surface-200">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span>
                            {selectionSummary.selectedGroupCount} グループ / {selectionSummary.selectedFileCount} 件を削除候補として選択中
                        </span>
                    </div>
                    <div className="text-xs text-surface-500">
                        各行の「これ以外を削除候補にする」で、残したい 1 件へすぐ絞り込めます。
                    </div>
                </div>
            )}

            {/* グループ一覧 */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                {groups.map((group) => {
                    const selectedCount = group.files.filter((file) => selectedFileIds.has(file.id)).length;
                    const keepCount = group.count - selectedCount;
                    const allSelected = selectedCount === group.count;
                    const hasSizeMismatch = group.sizeMin !== group.sizeMax;
                    const isNearSize = hasSizeMismatch && group.sizeMax > 0 && (group.sizeMax - group.sizeMin) / group.sizeMax <= 0.05;
                    const timestamps = group.files.map((file) => getFileTimestamp(file)).filter((timestamp) => timestamp > 0);
                    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : 0;
                    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : 0;
                    const hasDateSpread = oldestTimestamp > 0 && newestTimestamp > 0 && oldestTimestamp !== newestTimestamp;
                    const folderPaths = [...new Set(group.files.map((file) => getFolderPath(file.path)))];
                    const hasMultipleFolders = folderPaths.length > 1;
                    const folderToneMap = new Map(folderPaths.map((folderPath, index) => [folderPath, getFolderTone(index)]));

                    return (
                    <div key={group.hash} className="bg-surface-800 rounded-lg overflow-hidden ring-1 ring-surface-700/80">
                        {/* グループヘッダー */}
                        <div className="border-b border-surface-700 bg-surface-750 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-surface-100 font-medium">
                                        {isSimilarMode
                                            ? `${group.count}候補`
                                            : `${group.count}ファイル, ${formatFileSize(group.size)}`}
                                    </span>
                                    {isSimilarMode ? (
                                        <span className={`rounded px-2 py-0.5 text-xs ${isNearSize ? 'bg-green-500/15 text-green-200 ring-1 ring-green-500/30' : 'bg-surface-700 text-surface-300'}`}>
                                            サイズ帯 {formatSizeRange(group.sizeMin, group.sizeMax)}
                                        </span>
                                    ) : (
                                        <span className="rounded bg-surface-700 px-2 py-0.5 text-xs text-surface-300">
                                            重複ぶん {formatFileSize(group.size * Math.max(group.count - 1, 0))}
                                        </span>
                                    )}
                                    <span className={`rounded px-2 py-0.5 text-xs ${isSimilarMode ? 'bg-primary-500/15 text-primary-200' : 'bg-surface-700 text-surface-300'}`}>
                                        {group.matchLabel}
                                    </span>
                                    <span className={`rounded px-2 py-0.5 text-xs ${hasDateSpread ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30' : 'bg-surface-700 text-surface-300'}`}>
                                        日時幅 {formatDayGap(oldestTimestamp, newestTimestamp)}
                                    </span>
                                    <span className={`rounded px-2 py-0.5 text-xs ${hasMultipleFolders ? 'bg-amber-500/15 text-amber-200' : 'bg-surface-700 text-surface-300'}`}>
                                        保存先 {folderPaths.length} フォルダ
                                    </span>
                                    {selectedCount > 0 && (
                                        <span className={`rounded px-2 py-0.5 text-xs ${allSelected ? 'bg-red-500/20 text-red-200' : 'bg-amber-500/15 text-amber-200'}`}>
                                            削除候補 {selectedCount} 件 / 保持 {Math.max(keepCount, 0)} 件
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => selectByStrategy(group.hash, 'newest')}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="古いファイルを削除候補にする"
                                    >
                                        古い方を削除候補
                                    </button>
                                    <button
                                        onClick={() => selectByStrategy(group.hash, 'oldest')}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="新しいファイルを削除候補にする"
                                    >
                                        新しい方を削除候補
                                    </button>
                                    <button
                                        onClick={() => selectByStrategy(group.hash, 'shortest_path')}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="パスが長いファイルを削除候補にする"
                                    >
                                        パス長優先で削除候補
                                    </button>
                                    <button
                                        onClick={() => selectFilesInGroup(group.hash, [])}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="このグループの選択を解除"
                                    >
                                        選択解除
                                    </button>
                                </div>
                            </div>
                            {allSelected && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-red-200">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-300" />
                                    <span>このグループは全件削除候補です。残したいファイルがある場合は各行の「これ以外を削除候補にする」を使ってください。</span>
                                </div>
                            )}
                            {hasMultipleFolders && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-amber-200">
                                    <FolderOpen className="h-3.5 w-3.5 text-amber-300" />
                                    <span>このグループは別フォルダに分散しています。削除前に保存先の違いを確認してください。</span>
                                </div>
                            )}
                            {isSimilarMode && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-primary-200">
                                    <Copy className="h-3.5 w-3.5 text-primary-300" />
                                    <span>この一覧は内容一致ではなく、ファイル名が近い候補です。削除前にサイズや日時を確認してください。</span>
                                </div>
                            )}
                            {hasSizeMismatch && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-amber-200">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                                    <span>このグループにはサイズ差があります。異なる版や変換後ファイルの可能性があります。</span>
                                </div>
                            )}
                            {hasDateSpread && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-cyan-200">
                                    <Clock className="h-3.5 w-3.5 text-cyan-300" />
                                    <span>このグループは {formatDate(oldestTimestamp)} から {formatDate(newestTimestamp)} まで差があります。新旧を見比べて残す側を判断してください。</span>
                                </div>
                            )}
                        </div>

                        {/* ファイル一覧 */}
                        <div className="divide-y divide-surface-700">
                            {group.files.map((file) => {
                                const isSelected = selectedFileIds.has(file.id);
                                const isPrimaryKeepTarget = !isSelected && keepCount === 1;
                                const isUnexpectedSize = file.size !== group.size;
                                const fileTimestamp = getFileTimestamp(file);
                                const isNewestDate = hasDateSpread && fileTimestamp === newestTimestamp;
                                const isOldestDate = hasDateSpread && fileTimestamp === oldestTimestamp;
                                const folderName = getFolderName(file.path);
                                const folderPath = getFolderPath(file.path);
                                const folderTone = folderToneMap.get(folderPath) ?? getFolderTone(0);
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => toggleFileSelection(file.id)}
                                        className={`flex items-center gap-3 border-l-2 px-4 py-3 cursor-pointer ${hasMultipleFolders ? folderTone.row : 'border-l-transparent'} ${isSelected
                                            ? 'bg-red-900/20 hover:bg-red-900/30'
                                            : isPrimaryKeepTarget
                                                ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                                                : 'hover:bg-surface-750'
                                            }`}
                                    >
                                        {/* チェックボックス */}
                                        <div className={`flex-shrink-0 ${isSelected ? 'text-red-400' : 'text-surface-500'}`}>
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </div>

                                        {/* サムネイル */}
                                        {file.thumbnail_path ? (
                                            <img
                                                src={toMediaUrl(file.thumbnail_path)}
                                                alt=""
                                                className="w-12 h-12 object-cover rounded flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-surface-700 rounded flex-shrink-0" />
                                        )}

                                        {/* ファイル情報 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className={`min-w-0 flex-1 truncate font-medium ${isSelected ? 'text-red-300' : 'text-surface-200'}`}>
                                                    {file.name}
                                                </p>
                                                <span className={`rounded px-2 py-0.5 text-[11px] ${hasMultipleFolders ? folderTone.badge : 'bg-surface-700 text-surface-300'}`}>
                                                    フォルダ: {folderName}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${
                                                        isUnexpectedSize
                                                            ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30'
                                                            : 'bg-surface-700 text-surface-300'
                                                    }`}
                                                    title={isUnexpectedSize ? `基準サイズ ${formatFileSize(group.size)} と一致しません` : undefined}
                                                >
                                                    <HardDrive className="h-3 w-3" />
                                                    {formatFileSize(file.size)}
                                                </span>
                                                <span className={`rounded px-2 py-0.5 text-[11px] ${isSelected
                                                    ? 'bg-red-500/15 text-red-200'
                                                    : isPrimaryKeepTarget
                                                        ? 'bg-emerald-500/15 text-emerald-200'
                                                        : 'bg-surface-700 text-surface-300'
                                                    }`}>
                                                    {isSelected ? '削除候補' : isPrimaryKeepTarget ? '保持対象' : '未選択'}
                                                </span>
                                            </div>
                                            <p className={`text-xs truncate flex items-center gap-2 ${hasMultipleFolders ? folderTone.text : 'text-surface-400'}`}>
                                                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                保存先フォルダ: {folderPath}
                                            </p>
                                        </div>

                                        {/* 日付 */}
                                        <div className="flex items-center gap-2 self-stretch">
                                            <div className="flex flex-col items-end gap-1 text-right">
                                                <span className={`rounded px-2 py-0.5 text-[11px] ${
                                                    isNewestDate
                                                        ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30'
                                                        : isOldestDate
                                                            ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30'
                                                            : 'bg-surface-700 text-surface-300'
                                                }`}>
                                                    {isNewestDate ? '最新候補' : isOldestDate ? '最古候補' : hasDateSpread ? '中間日時' : '同日候補'}
                                                </span>
                                                <div className={`text-sm flex items-center gap-1 flex-shrink-0 ${
                                                    isNewestDate
                                                        ? 'text-cyan-200'
                                                        : isOldestDate
                                                            ? 'text-amber-200'
                                                            : 'text-surface-400'
                                                }`}>
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateTime(fileTimestamp)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        keepOnlyFileInGroup(group.hash, file.id);
                                                    }}
                                                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${isSelected
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                        : 'bg-surface-700 hover:bg-surface-600 text-surface-200'
                                                        }`}
                                                    title="このファイル以外を削除候補にする"
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    これ以外を削除候補にする
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleRevealInExplorer(file.path);
                                                    }}
                                                    className="rounded px-2 py-0.5 text-[11px] text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
                                                    title="エクスプローラーで表示"
                                                >
                                                    場所を開く
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};
