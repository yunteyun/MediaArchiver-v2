/**
 * DuplicateView - 重複ファイルビュー
 */

import React, { useEffect, useCallback, useMemo, startTransition } from 'react';
import { Copy, Trash2, Clock, FolderOpen, CheckSquare, Square, X, Loader, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
    DUPLICATE_BULK_ACTION_GROUP_LIMIT,
    useDuplicateStore,
    type DuplicateSelectionStrategy
} from '../stores/useDuplicateStore';
import { useUIStore } from '../stores/useUIStore';
import { toMediaUrl } from '../utils/mediaPath';

// ファイルサイズを人間が読める形式に変換
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

export const DuplicateView: React.FC = () => {
    const {
        groups,
        stats,
        isSearching,
        progress,
        selectedFileIds,
        isDeleting,
        hasSearched,
        startSearch,
        cancelSearch,
        setProgress,
        selectFile,
        deselectFile,
        selectAllFiles,
        selectAcrossGroupsByStrategy,
        selectFilesInGroup,
        selectByStrategy,
        keepOnlyFileInGroup,
        clearSelection,
        deleteSelectedFiles,
        reset
    } = useDuplicateStore();

    const closeDuplicateView = useUIStore((s) => s.closeDuplicateView);

    const selectionSummary = useMemo(() => {
        const selectedGroupCount = groups.filter((group) =>
            group.files.some((file) => selectedFileIds.has(file.id))
        ).length;
        const bulkActionGroupCount = Math.min(groups.length, DUPLICATE_BULK_ACTION_GROUP_LIMIT);
        const bulkActionFileCount = groups
            .slice(0, DUPLICATE_BULK_ACTION_GROUP_LIMIT)
            .reduce((sum, group) => sum + group.files.length, 0);
        return {
            selectedFileCount: selectedFileIds.size,
            selectedGroupCount,
            bulkActionGroupCount,
            bulkActionFileCount,
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

    const handleSelectAll = useCallback(() => {
        startTransition(() => {
            selectAllFiles(DUPLICATE_BULK_ACTION_GROUP_LIMIT);
        });
    }, [selectAllFiles]);

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
                    重複ファイルを検索中...
                </h2>
                <p className="text-surface-400 mb-4">
                    {!progress && '準備中...'}
                    {progress?.phase === 'analyzing' && '同じサイズのファイルを分析中...'}
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
                    重複ファイルは見つかりませんでした
                </h2>
                <p className="text-surface-400 mb-6 text-center max-w-md">
                    このプロファイルには重複するファイルがありません。
                </p>
                <button
                    onClick={startSearch}
                    className="px-6 py-3 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Copy className="w-5 h-5" />
                    再検索
                </button>
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
                    同じ内容を持つファイルを検出します。<br />
                    サイズが同じファイルのみハッシュ値を計算するため、高速に動作します。
                </p>
                <button
                    onClick={startSearch}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Copy className="w-5 h-5" />
                    重複チェック開始
                </button>
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
                        重複ファイル
                    </h2>
                    {stats && (
                        <span className="text-sm text-surface-400">
                            {stats.totalGroups}グループ, {stats.totalFiles}ファイル,
                            {formatFileSize(stats.wastedSpace)}の無駄
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={startSearch}
                        disabled={isSearching}
                        className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                    >
                        再検索
                    </button>
                    {groups.length > 0 && (
                        <>
                            <button
                                onClick={() => handleBulkStrategy('newest')}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                新しい方を残す
                            </button>
                            <button
                                onClick={() => handleBulkStrategy('oldest')}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                古い方を残す
                            </button>
                            <button
                                onClick={() => handleBulkStrategy('shortest_path')}
                                disabled={isDeleting}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                パス短優先
                            </button>
                            <button
                                onClick={handleSelectAll}
                                disabled={isDeleting || (
                                    selectionSummary.bulkActionFileCount > 0 &&
                                    selectedFileIds.size === selectionSummary.bulkActionFileCount
                                )}
                                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded text-sm transition-colors disabled:opacity-50"
                            >
                                全件選択
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
                        各行の「このファイルを残す」で残したい側へすぐ切り替えできます。
                    </div>
                </div>
            )}

            {/* グループ一覧 */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                {groups.map((group) => {
                    const selectedCount = group.files.filter((file) => selectedFileIds.has(file.id)).length;
                    const keepCount = group.count - selectedCount;
                    const allSelected = selectedCount === group.count;

                    return (
                    <div key={group.hash} className="bg-surface-800 rounded-lg overflow-hidden ring-1 ring-surface-700/80">
                        {/* グループヘッダー */}
                        <div className="border-b border-surface-700 bg-surface-750 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-surface-100 font-medium">
                                        {group.count}ファイル, {formatFileSize(group.size)}
                                    </span>
                                    <span className="rounded bg-surface-700 px-2 py-0.5 text-xs text-surface-300">
                                        重複ぶん {formatFileSize(group.size * Math.max(group.count - 1, 0))}
                                    </span>
                                    {selectedCount > 0 && (
                                        <span className={`rounded px-2 py-0.5 text-xs ${allSelected ? 'bg-red-500/20 text-red-200' : 'bg-amber-500/15 text-amber-200'}`}>
                                            削除候補 {selectedCount} 件 / 残す予定 {Math.max(keepCount, 0)} 件
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => selectByStrategy(group.hash, 'newest')}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="最も新しいファイルを残す"
                                    >
                                        新しい方を残す
                                    </button>
                                    <button
                                        onClick={() => selectByStrategy(group.hash, 'oldest')}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="最も古いファイルを残す"
                                    >
                                        古い方を残す
                                    </button>
                                    <button
                                        onClick={() => selectByStrategy(group.hash, 'shortest_path')}
                                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                                        title="パスが短い方を残す"
                                    >
                                        パス短優先
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
                                    <span>このグループは全件削除候補です。残したいファイルがある場合は各行の「このファイルを残す」を使ってください。</span>
                                </div>
                            )}
                        </div>

                        {/* ファイル一覧 */}
                        <div className="divide-y divide-surface-700">
                            {group.files.map((file) => {
                                const isSelected = selectedFileIds.has(file.id);
                                const isPrimaryKeepTarget = !isSelected && keepCount === 1;
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => toggleFileSelection(file.id)}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${isSelected
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
                                                <span className={`rounded px-2 py-0.5 text-[11px] ${isSelected
                                                    ? 'bg-red-500/15 text-red-200'
                                                    : isPrimaryKeepTarget
                                                        ? 'bg-emerald-500/15 text-emerald-200'
                                                        : 'bg-surface-700 text-surface-300'
                                                    }`}>
                                                    {isSelected ? '削除候補' : isPrimaryKeepTarget ? '残す対象' : '未選択'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-surface-500 truncate flex items-center gap-2">
                                                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                {file.path}
                                            </p>
                                        </div>

                                        {/* 日付 */}
                                        <div className="flex items-center gap-2 self-stretch">
                                            <div className="text-sm text-surface-400 flex items-center gap-1 flex-shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(file.mtime_ms || file.created_at)}
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
                                                    このファイルを残す
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
